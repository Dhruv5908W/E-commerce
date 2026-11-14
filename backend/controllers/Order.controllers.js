import mongoose from "mongoose";
import asyncHandler from "../src/utils/AsyncHandler.js";
import { apierrors } from "../src/utils/apierrors.js";
import { apiresponse } from "../src/utils/apiresponse.js";
import { Order } from "../src/models/order.models.js";
import { Cart } from "../src/models/cart.models.js";
import { Address } from "../src/models/adress.models.js";
import { Product } from "../src/models/product.models.js";
import getRazorpayClient from "../src/utils/razorpay.js";
import crypto from "crypto";

// shared: confirms every cart line still exists, has enough stock, and recomputes TotalPrice from live products
const syncAndAssertCart = async (cart) => {
  const products = await Product.find({ _id: { $in: cart.products.map((item) => item.productId) } });
  const productMap = new Map(products.map((product) => [product._id.toString(), product]));

  let liveTotal = 0;
  for (const item of cart.products) {
    const product = productMap.get(item.productId.toString());
    if (!product) {
      throw new apierrors(404, "One of the products in your cart no longer exists");
    }
    const variant = product.variants.id(item.variantId);
    if (!variant) {
      throw new apierrors(404, `${product.name} (${item.color}/${item.size}) is no longer available`);
    }
    if (variant.stock < item.quantity) {
      throw new apierrors(400, `${product.name} (${item.color}/${item.size}) only has ${variant.stock} left`);
    }
    const unitPrice = product.discount > 0
      ? Math.round(product.price - (product.price * product.discount) / 100)
      : product.price;
    liveTotal += unitPrice * item.quantity;
  }

  if (cart.TotalPrice !== liveTotal) {
    cart.TotalPrice = liveTotal;
    await cart.save();
  }

  return productMap;
};

// atomic per-variant decrement so concurrent orders or multiple variants of the same product
// never overwrite each other or drive stock negative; rolls back any prior lines on failure
const decrementCartStock = async (cart) => {
  const decremented = [];
  try {
    for (const item of cart.products) {
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          variants: { $elemMatch: { _id: item.variantId, stock: { $gte: item.quantity } } },
        },
        { $inc: { "variants.$.stock": -item.quantity } },
        { new: true }
      );
      if (!updated) {
        throw new apierrors(400, `Insufficient stock for ${item.color}/${item.size}`);
      }
      decremented.push(item);
    }
  } catch (err) {
    for (const item of decremented) {
      await Product.updateOne(
        { _id: item.productId, "variants._id": item.variantId },
        { $inc: { "variants.$.stock": item.quantity } }
      );
    }
    throw err;
  }
  return decremented;
};

const rollbackDecrementedStock = async (items) => {
  for (const item of items) {
    await Product.updateOne(
      { _id: item.productId, "variants._id": item.variantId },
      { $inc: { "variants.$.stock": item.quantity } }
    );
  }
};

const restockOrderItems = async (order) => {
  for (const item of order.orderitems) {
    await Product.updateOne(
      { _id: item.porductId, "variants._id": item.variantId },
      { $inc: { "variants.$.stock": item.quantity } }
    );
  }
};

// shared: decrements stock, creates the Order document, and empties the cart.
// `extraFields` carries whatever differs between COD and ONLINE (paymentMethod,
// razorpay ids, isPaid/paidAt).
const commitCartToOrder = async ({ cart, address, userId, extraFields }) => {
  const decremented = await decrementCartStock(cart);

  let order;
  try {
    order = await Order.create({
      orderprice: cart.TotalPrice,
      orderitems: cart.products.map((item) => ({
        porductId: item.productId,
        variantId: item.variantId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      })),
      userId,
      address: address._id,
      ...extraFields,
    });
  } catch (err) {
    await rollbackDecrementedStock(decremented);
    throw err;
  }

  cart.products = [];
  cart.TotalPrice = 0;
  await cart.save();

  return order;
};

// step 1: create a Razorpay order for the current cart total
const createRazorpayOrder = asyncHandler(async (req, res) => {
  const { addressId } = req.body;
  if (!addressId || !mongoose.isValidObjectId(addressId)) {
    throw new apierrors(400, "Valid address is required to place an order");
  }

  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  if (!address) {
    throw new apierrors(404, "Address not found");
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart || cart.products.length === 0) {
    throw new apierrors(400, "Cart is empty");
  }

  await syncAndAssertCart(cart);

  if (cart.TotalPrice <= 0) {
    throw new apierrors(400, "Order total must be greater than zero for online payment");
  }

  const razorpay = getRazorpayClient();
  const razorpayOrder = await razorpay.orders.create({
    amount: Math.round(cart.TotalPrice * 100), // razorpay expects paise
    currency: "INR",
    receipt: `rcpt_${req.user._id.toString().slice(-8)}_${Date.now()}`,
  });

  return res.status(200).json(
    new apiresponse(200, {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    }, "Razorpay order created")
  );
});

// step 2: verify the payment signature, then actually create the order and decrement stock
const verifyPaymentAndPlaceOrder = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, addressId } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !addressId) {
    throw new apierrors(400, "Missing payment verification details");
  }
  if (!mongoose.isValidObjectId(addressId)) {
    throw new apierrors(400, "Invalid address ID");
  }
  if (!process.env.RAZORPAY_KEY_SECRET) {
    throw new apierrors(500, "Razorpay credentials are not configured");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    throw new apierrors(400, "Payment verification failed");
  }

  // prevent duplicate orders if verify-payment is retried for the same Razorpay order
  const existingOrder = await Order.findOne({ razorpayOrderId: razorpay_order_id });
  if (existingOrder) {
    if (existingOrder.userId.toString() !== req.user._id.toString()) {
      throw new apierrors(400, "Invalid Razorpay order reference");
    }
    return res.status(200).json(
      new apiresponse(200, existingOrder, "Order already confirmed")
    );
  }

  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  if (!address) {
    throw new apierrors(404, "Address not found");
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart || cart.products.length === 0) {
    throw new apierrors(400, "Cart is empty");
  }

  // re-check stock and recompute total right before committing - it may have changed since checkout started
  await syncAndAssertCart(cart);

  const order = await commitCartToOrder({
    cart,
    address,
    userId: req.user._id,
    extraFields: {
      paymentMethod: "ONLINE",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      isPaid: true,
      paidAt: Date.now(),
    },
  });

  return res.status(201).json(
    new apiresponse(201, order, "Payment verified, order placed successfully")
  );
});

// COD path: no Razorpay involved at all - just re-check stock and commit the order.
// isPaid stays false (the customer pays the delivery agent, not us, not yet).
const placeCODOrder = asyncHandler(async (req, res) => {
  const { addressId } = req.body;
  if (!addressId || !mongoose.isValidObjectId(addressId)) {
    throw new apierrors(400, "Valid address is required to place an order");
  }

  const address = await Address.findOne({ _id: addressId, userId: req.user._id });
  if (!address) {
    throw new apierrors(404, "Address not found");
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart || cart.products.length === 0) {
    throw new apierrors(400, "Cart is empty");
  }

  await syncAndAssertCart(cart);

  const order = await commitCartToOrder({
    cart,
    address,
    userId: req.user._id,
    extraFields: {
      paymentMethod: "COD",
    },
  });

  return res.status(201).json(
    new apiresponse(201, order, "Order placed successfully (Cash on Delivery)")
  );
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ userId: req.user._id })
    .populate("orderitems.porductId", "name price imageUrl")
    .populate("address")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new apiresponse(200, orders, "Orders fetched successfully")
  );
});

const getOrderById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) {
    throw new apierrors(400, "Invalid order ID");
  }

  const order = await Order.findOne({ _id: req.params.orderId, userId: req.user._id })
    .populate("orderitems.porductId", "name price imageUrl")
    .populate("address");

  if (!order) {
    throw new apierrors(404, "Order not found");
  }

  return res.status(200).json(
    new apiresponse(200, order, "Order fetched successfully")
  );
});

const cancelOrder = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) {
    throw new apierrors(400, "Invalid order ID");
  }

  const order = await Order.findOne({ _id: req.params.orderId, userId: req.user._id });
  if (!order) {
    throw new apierrors(404, "Order not found");
  }
  if (order.status !== "PENDING") {
    throw new apierrors(400, `Order already ${order.status.toLowerCase()}, cannot cancel`);
  }

  await restockOrderItems(order);

  order.status = "CANCELLED";
  await order.save();
  await order.populate([
    { path: "orderitems.porductId", select: "name price imageUrl" },
    { path: "address" },
  ]);

  return res.status(200).json(
    new apiresponse(200, order, "Order cancelled successfully")
  );
});

// admin: every order across every user, newest first
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({})
    .populate("userId", "name email phonenumber")
    .populate("orderitems.porductId", "name price imageUrl")
    .populate("address")
    .sort({ createdAt: -1 });

  return res.status(200).json(
    new apiresponse(200, orders, "All orders fetched successfully")
  );
});

// admin: move an order to PENDING / CANCELLED / DELIVERED.
// - cancelling restocks the variants, same as a user-initiated cancel
// - a cancelled order can't be reactivated (stock's already back in the pool,
//   re-decrementing it here would need its own re-check-and-commit path)
// - marking a COD order DELIVERED also flips isPaid, since cash changes hands at the door
const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.orderId)) {
    throw new apierrors(400, "Invalid order ID");
  }

  const { status } = req.body;
  const allowedStatuses = ["PENDING", "CANCELLED", "DELIVERED"];
  if (!allowedStatuses.includes(status)) {
    throw new apierrors(400, "status must be one of PENDING, CANCELLED, DELIVERED");
  }

  const order = await Order.findById(req.params.orderId);
  if (!order) {
    throw new apierrors(404, "Order not found");
  }

  if (order.status === "CANCELLED" && status !== "CANCELLED") {
    throw new apierrors(400, "Cannot reactivate a cancelled order");
  }

  if (status === "CANCELLED" && order.status !== "CANCELLED") {
    await restockOrderItems(order);
  }

  order.status = status;

  if (status === "DELIVERED" && order.paymentMethod === "COD" && !order.isPaid) {
    order.isPaid = true;
    order.paidAt = Date.now();
  }

  await order.save();
  await order.populate([
    { path: "userId", select: "name email phonenumber" },
    { path: "orderitems.porductId", select: "name price imageUrl" },
    { path: "address" },
  ]);

  return res.status(200).json(
    new apiresponse(200, order, "Order status updated successfully")
  );
});

export { createRazorpayOrder, verifyPaymentAndPlaceOrder, placeCODOrder, getMyOrders, getOrderById, cancelOrder, getAllOrders, updateOrderStatus };

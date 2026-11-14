import mongoose from "mongoose";
import { Cart } from "../src/models/cart.models.js";
import asyncHandler from "../src/utils/AsyncHandler.js";
import { apierrors } from "../src/utils/apierrors.js";
import { Product } from "../src/models/product.models.js";
import { apiresponse } from "../src/utils/apiresponse.js";

// recompute the cart total using each line item's live product price/discount
// productId may be a raw ObjectId or an already-populated product object, depending on the caller
const recalculateTotal = async (cart) => {
  const productIds = cart.products.map((item) => item.productId?._id || item.productId);
  const products = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  let total = 0;
  for (const item of cart.products) {
    const idStr = (item.productId?._id || item.productId).toString();
    const product = productMap.get(idStr);
    if (!product) continue;
    const unitPrice = product.discount > 0
      ? Math.round(product.price - (product.price * product.discount) / 100)
      : product.price;
    total += unitPrice * item.quantity;
  }
  cart.TotalPrice = total;
  return productMap;
};

const addToCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { variantId, quantity = 1 } = req.body;

  if (!mongoose.isValidObjectId(productId)) {
    throw new apierrors(400, "Invalid product ID");
  }
  if (!variantId || !mongoose.isValidObjectId(variantId)) {
    throw new apierrors(400, "Valid variantId is required (pick a color/size)");
  }

  const parsedQty = Number(quantity);
  if (!Number.isInteger(parsedQty) || parsedQty < 1) {
    throw new apierrors(400, "Quantity must be a positive whole number");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new apierrors(404, "Product Not Found");
  }

  const variant = product.variants.id(variantId);
  if (!variant) {
    throw new apierrors(404, "Selected color/size is not available for this product");
  }

  let cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    cart = await Cart.create({ userId: req.user._id, products: [] });
  }

  const existingLine = cart.products.find(
    (p) => p.productId.toString() === product._id.toString() && p.variantId.toString() === variantId.toString()
  );

  const currentQtyInCart = existingLine ? existingLine.quantity : 0;
  if (currentQtyInCart + parsedQty > variant.stock) {
    throw new apierrors(400, `Only ${variant.stock} left in stock for this color/size`);
  }

  if (existingLine) {
    existingLine.quantity += parsedQty;
  } else {
    cart.products.push({
      productId: product._id,
      variantId: variant._id,
      color: variant.color,
      size: variant.size,
      quantity: parsedQty,
    });
  }

  await recalculateTotal(cart);
  await cart.save();
  await cart.populate("products.productId", "name price imageUrl discount");

  return res.status(200).json(
    new apiresponse(200, cart, "Product added to cart successfully")
  );
});

const deleteFromCart = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.params;
  if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(variantId)) {
    throw new apierrors(400, "Invalid product or variant ID");
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    throw new apierrors(404, "Cart not found");
  }

  const lineIndex = cart.products.findIndex(
    (p) => p.productId.toString() === productId && p.variantId.toString() === variantId
  );
  if (lineIndex === -1) {
    throw new apierrors(404, "Item not found in cart");
  }

  cart.products.splice(lineIndex, 1);
  await recalculateTotal(cart);
  await cart.save();
  await cart.populate("products.productId", "name price imageUrl discount");

  return res.status(200).json(
    new apiresponse(200, cart, "Item removed from cart successfully")
  );
});

const getCart = asyncHandler(async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user._id }).populate(
    "products.productId",
    "name price imageUrl discount"
  );
  if (!cart) {
    cart = await Cart.create({ userId: req.user._id, products: [] });
  }

  const previousTotal = cart.TotalPrice;
  const productIds = cart.products
    .filter((item) => item.productId !== null)
    .map((item) => item.productId._id);
  const fullProducts = await Product.find({ _id: { $in: productIds } });
  const productMap = new Map(fullProducts.map((p) => [p._id.toString(), p]));

  // strip lines whose product or variant was removed after being added to cart
  const validProducts = cart.products.filter((item) => {
    if (!item.productId) return false;
    const fullProd = productMap.get(item.productId._id.toString());
    return Boolean(fullProd && fullProd.variants.id(item.variantId));
  });

  const listChanged = validProducts.length !== cart.products.length;
  if (listChanged) {
    cart.products = validProducts;
  }

  await recalculateTotal(cart);
  if (listChanged || cart.TotalPrice !== previousTotal) {
    await cart.save();
    await cart.populate("products.productId", "name price imageUrl discount");
  }

  return res.status(200).json(
    new apiresponse(200, cart, "Cart fetched successfully")
  );
});

const decreaseQuantity = asyncHandler(async (req, res) => {
  const { productId, variantId } = req.params;
  if (!mongoose.isValidObjectId(productId) || !mongoose.isValidObjectId(variantId)) {
    throw new apierrors(400, "Invalid product or variant ID");
  }

  const cart = await Cart.findOne({ userId: req.user._id });
  if (!cart) {
    throw new apierrors(404, "Cart not found");
  }

  const lineIndex = cart.products.findIndex(
    (p) => p.productId.toString() === productId && p.variantId.toString() === variantId
  );
  if (lineIndex === -1) {
    throw new apierrors(404, "Item not found in cart");
  }

  if (cart.products[lineIndex].quantity > 1) {
    cart.products[lineIndex].quantity -= 1;
  } else {
    cart.products.splice(lineIndex, 1);
  }

  await recalculateTotal(cart);
  await cart.save();
  await cart.populate("products.productId", "name price imageUrl discount");

  return res.status(200).json(
    new apiresponse(200, cart, "Quantity updated successfully")
  );
});

export { addToCart, deleteFromCart, getCart, decreaseQuantity };

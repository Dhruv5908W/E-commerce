import fs from "fs";
import mongoose from "mongoose";
import asyncHandler from "../src/utils/AsyncHandler.js";
import { apierrors } from "../src/utils/apierrors.js";
import { apiresponse } from "../src/utils/apiresponse.js";
import uploadToImageKit, { deleteFromImageKit } from "../src/utils/imagekit.js";
import { Product } from "../src/models/product.models.js";
import { Category } from "../src/models/category.models.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const removeLocalFile = (filePath) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore cleanup errors
    }
  }
};

// variants arrives from multipart form-data as a JSON string, e.g.
// '[{"color":"black","size":"M","stock":10},{"color":"black","size":"L","stock":5}]'
const parseVariants = (raw) => {
  let variants;
  try {
    variants = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    throw new apierrors(400, "variants must be valid JSON");
  }
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new apierrors(400, "At least one color/size variant is required");
  }

  const seen = new Set();
  const normalized = [];

  for (const v of variants) {
    const color = v.color?.toString().trim();
    const size = v.size?.toString().trim();
    const stockRaw = v.stock;
    const stockNum = Number(stockRaw);

    if (
      !color ||
      !size ||
      stockRaw === undefined ||
      stockRaw === null ||
      stockRaw === "" ||
      !Number.isFinite(stockNum) ||
      stockNum < 0
    ) {
      throw new apierrors(400, "Each variant needs a color, size, and non-negative stock");
    }

    const key = `${color.toLowerCase()}::${size.toLowerCase()}`;
    if (seen.has(key)) {
      throw new apierrors(400, `Duplicate variant for ${color} / ${size}`);
    }
    seen.add(key);

    normalized.push({ color, size, stock: Math.floor(stockNum) });
  }

  return normalized;
};

const validateNumberField = (val, name, { min = 0, max = Infinity } = {}) => {
  const num = Number(val);
  if (val === undefined || val === null || val === "" || !Number.isFinite(num) || num < min || num > max) {
    throw new apierrors(
      400,
      max === Infinity ? `${name} must be a number >= ${min}` : `${name} must be between ${min} and ${max}`
    );
  }
  return num;
};

const UploadProduct = asyncHandler(async (req, res) => {
  const { name, price, description, fabric, gsm, discount, category, variants } = req.body;
  const ProductLocalPath = req.file?.path;

  try {
    if ([name, price, description, fabric, gsm, category, variants].some(
      (field) => field === undefined || field === null || field.toString().trim() === ""
    )) {
      throw new apierrors(400, "All fields must be filled");
    }

    if (!mongoose.isValidObjectId(category)) {
      throw new apierrors(400, "Invalid category ID");
    }

    const parsedPrice = validateNumberField(price, "price", { min: 0 });
    const parsedGsm = validateNumberField(gsm, "gsm", { min: 0 });
    const parsedDiscount =
      discount !== undefined && discount !== null && discount !== ""
        ? validateNumberField(discount, "discount", { min: 0, max: 100 })
        : 0;
    const parsedVariants = parseVariants(variants);

    if (!ProductLocalPath) {
      throw new apierrors(400, "Product image is required");
    }

    const ProductImage = await uploadToImageKit(ProductLocalPath);
    if (!ProductImage.success) {
      throw new apierrors(500, ProductImage.message || "Image upload failed");
    }

    try {
      const product = await Product.create({
        name: name.toString().trim(),
        price: parsedPrice,
        description: description.toString().trim(),
        fabric: fabric.toString().trim(),
        gsm: parsedGsm,
        discount: parsedDiscount,
        category,
        variants: parsedVariants,
        imageUrl: ProductImage.url,
        imageFileId: ProductImage.fileId,
      });

      return res.status(201).json(
        new apiresponse(201, product, "Product Uploaded Successfully")
      );
    } catch (dbErr) {
      await deleteFromImageKit(ProductImage.fileId);
      throw dbErr;
    }
  } catch (err) {
    removeLocalFile(ProductLocalPath);
    throw err;
  }
});

const getProducts = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 12));
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.keyword?.toString().trim()) {
    filter.name = { $regex: escapeRegex(req.query.keyword.toString().trim()), $options: "i" };
  }
  if (req.query.category) {
    if (!mongoose.isValidObjectId(req.query.category)) {
      throw new apierrors(400, "Invalid category ID");
    }
    filter.category = req.query.category;
  }
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {};
    if (req.query.minPrice !== undefined && req.query.minPrice !== "") {
      const minP = Number(req.query.minPrice);
      if (Number.isFinite(minP) && minP >= 0) filter.price.$gte = minP;
    }
    if (req.query.maxPrice !== undefined && req.query.maxPrice !== "") {
      const maxP = Number(req.query.maxPrice);
      if (Number.isFinite(maxP) && maxP >= 0) filter.price.$lte = maxP;
    }
    if (Object.keys(filter.price).length === 0) {
      delete filter.price;
    }
  }

  let sortOption = { createdAt: -1 };
  if (req.query.sort === "priceLow") sortOption = { price: 1 };
  if (req.query.sort === "priceHigh") sortOption = { price: -1 };

  const totalProducts = await Product.countDocuments(filter);
  const totalPages = Math.ceil(totalProducts / limit);
  const products = await Product.find(filter).sort(sortOption).skip(skip).limit(limit);

  res.status(200).json(
    new apiresponse(200, {
      products,
      currentPage: page,
      totalPages,
      totalProducts,
      hasMore: page < totalPages,
    })
  );
});

const getProductById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) {
    throw new apierrors(400, "Invalid product ID");
  }
  const product = await Product.findById(req.params.productId).populate("category", "name");
  if (!product) {
    throw new apierrors(404, "Product not found");
  }
  return res.status(200).json(
    new apiresponse(200, product, "Product fetched successfully")
  );
});

const UpdateProduct = asyncHandler(async (req, res) => {
  const newLocalPath = req.file?.path;
  try {
    if (!mongoose.isValidObjectId(req.params.productId)) {
      throw new apierrors(400, "Invalid product ID");
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      throw new apierrors(404, "Product not found");
    }

    if (req.body.name !== undefined) {
      const trimmed = req.body.name.toString().trim();
      if (!trimmed) throw new apierrors(400, "Product name cannot be empty");
      product.name = trimmed;
    }
    if (req.body.description !== undefined) {
      const trimmed = req.body.description.toString().trim();
      if (!trimmed) throw new apierrors(400, "Description cannot be empty");
      product.description = trimmed;
    }
    if (req.body.fabric !== undefined) {
      const trimmed = req.body.fabric.toString().trim();
      if (!trimmed) throw new apierrors(400, "Fabric cannot be empty");
      product.fabric = trimmed;
    }
    if (req.body.price !== undefined) {
      product.price = validateNumberField(req.body.price, "price", { min: 0 });
    }
    if (req.body.gsm !== undefined) {
      product.gsm = validateNumberField(req.body.gsm, "gsm", { min: 0 });
    }
    if (req.body.discount !== undefined) {
      product.discount = req.body.discount === "" ? 0 : validateNumberField(req.body.discount, "discount", { min: 0, max: 100 });
    }
    if (req.body.category !== undefined) {
      if (!mongoose.isValidObjectId(req.body.category)) {
        throw new apierrors(400, "Invalid category ID");
      }
      product.category = req.body.category;
    }

    if (req.body.variants !== undefined) {
      product.variants = parseVariants(req.body.variants);
    }

    if (newLocalPath) {
      const newImage = await uploadToImageKit(newLocalPath);
      if (!newImage.success) {
        throw new apierrors(500, newImage.message || "Image upload failed");
      }
      await deleteFromImageKit(product.imageFileId);
      product.imageUrl = newImage.url;
      product.imageFileId = newImage.fileId;
    }

    await product.save();

    return res.status(200).json(
      new apiresponse(200, product, "Product updated successfully")
    );
  } catch (err) {
    removeLocalFile(newLocalPath);
    throw err;
  }
});

// admin restock: set the absolute stock value for one specific color/size variant
const restockVariant = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId) || !mongoose.isValidObjectId(req.params.variantId)) {
    throw new apierrors(400, "Invalid product or variant ID");
  }

  const { stock } = req.body;
  const parsedStock = Number(stock);
  if (stock === undefined || stock === null || stock === "" || !Number.isFinite(parsedStock) || parsedStock < 0) {
    throw new apierrors(400, "A non-negative stock value is required");
  }

  const product = await Product.findById(req.params.productId);
  if (!product) {
    throw new apierrors(404, "Product not found");
  }

  const variant = product.variants.id(req.params.variantId);
  if (!variant) {
    throw new apierrors(404, "Variant not found");
  }

  variant.stock = Math.floor(parsedStock);
  await product.save();

  return res.status(200).json(
    new apiresponse(200, product, "Stock updated successfully")
  );
});

const DeleteProduct = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.productId)) {
    throw new apierrors(400, "Invalid product ID");
  }

  const product = await Product.findById(req.params.productId);
  if (!product) {
    throw new apierrors(404, "Product not found");
  }

  await deleteFromImageKit(product.imageFileId);
  await product.deleteOne();

  return res.status(200).json(
    new apiresponse(200, {}, "Product deleted successfully")
  );
});

export { UploadProduct, getProducts, getProductById, UpdateProduct, DeleteProduct, restockVariant };

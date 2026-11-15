/**
 * ==============================================================================
 * Urban Loom — Bulk Product Seeding Script (seed.ts)
 * ==============================================================================
 *
 * This script automates bulk product uploads to the Urban Loom store:
 * 1. Reads product definitions from `script/products.json` (or uses built-in catalog if none provided).
 * 2. Uploads images to ImageKit CDN (from local `product-images/` folder OR remote web URLs).
 * 3. Auto-creates apparel categories if they don't already exist.
 * 4. Inserts product documents into MongoDB with full variant and inventory tracking.
 *
 * SAFETY:
 * - Original photos in `product-images/` are never deleted or modified.
 * - Checks for duplicate products by name; skips existing unless --force is passed.
 * - Handles errors per product without aborting the entire batch.
 *
 * USAGE:
 * - Run default:          npm run seed
 * - Or using tsx:         npx tsx script/seed.ts
 * - Overwrite existing:   npx tsx script/seed.ts --force
 * ==============================================================================
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";
import ConnectionDB from "../src/db/index.js";
import { Product } from "../src/models/product.models.js";
import { Category } from "../src/models/category.models.js";
import uploadToImageKit from "../src/utils/imagekit.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, "product-images");
const PRODUCTS_JSON = path.join(__dirname, "products.json");
const TEMP_DIR = path.join(__dirname, ".tmp-upload");

// CLI arguments
const isForceMode = process.argv.includes("--force") || process.argv.includes("-f");

// Interfaces
export interface VariantInput {
  color: string;
  size: string;
  stock: number;
}

export interface ProductInput {
  name: string;
  price: number;
  description: string;
  fabric: string;
  gsm: number;
  discount?: number;
  category: string;
  image: string; // filename in product-images/ OR local path OR remote URL
  variants?: VariantInput[];
}

export interface SeedReport {
  total: number;
  succeeded: number;
  skipped: number;
  failed: number;
  items: Array<{
    name: string;
    status: "CREATED" | "UPDATED" | "SKIPPED" | "FAILED";
    message?: string;
    productId?: string;
  }>;
}

// Fallback default variants if none provided
const DEFAULT_VARIANTS: VariantInput[] = [
  { color: "Black", size: "S", stock: 10 },
  { color: "Black", size: "M", stock: 15 },
  { color: "Black", size: "L", stock: 15 },
  { color: "Black", size: "XL", stock: 10 },
  { color: "Off-White", size: "M", stock: 12 },
  { color: "Off-White", size: "L", stock: 12 },
];

// Helper: Escape regex special characters
const escapeRegex = (str: string): string => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// In-memory category cache to prevent redundant database lookups
const categoryCache = new Map<string, mongoose.Types.ObjectId>();

const getOrCreateCategoryId = async (name: string): Promise<mongoose.Types.ObjectId> => {
  const cleanName = name.trim();
  const cacheKey = cleanName.toLowerCase();

  if (categoryCache.has(cacheKey)) {
    return categoryCache.get(cacheKey)!;
  }

  let category = await Category.findOne({
    name: new RegExp(`^${escapeRegex(cleanName)}$`, "i"),
  });

  if (!category) {
    category = await Category.create({ name: cleanName });
    console.log(`  📁 Created new category: "${cleanName}"`);
  }

  categoryCache.set(cacheKey, category._id as mongoose.Types.ObjectId);
  return category._id as mongoose.Types.ObjectId;
};

// Helper: Fetch remote image URL or copy local file to temp directory
const stageImageForUpload = async (imageInput: string): Promise<string> => {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

  // Case 1: Remote HTTP/HTTPS URL
  if (imageInput.startsWith("http://") || imageInput.startsWith("https://")) {
    console.log(`    ⬇️  Downloading image from remote URL...`);
    const response = await fetch(imageInput);
    if (!response.ok) {
      throw new Error(`Failed to download remote image: HTTP ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // derive extension from url or fallback to .jpg
    const parsedUrl = new URL(imageInput);
    const ext = path.extname(parsedUrl.pathname) || ".jpg";
    const tempFile = path.join(TEMP_DIR, `${uniquePrefix}${ext}`);
    fs.writeFileSync(tempFile, buffer);
    return tempFile;
  }

  // Case 2: Local file in script/product-images/ or relative path
  let localCandidate = path.isAbsolute(imageInput)
    ? imageInput
    : path.join(IMAGES_DIR, imageInput);

  if (!fs.existsSync(localCandidate)) {
    // Also try resolving relative to project root
    const rootCandidate = path.resolve(__dirname, "..", imageInput);
    if (fs.existsSync(rootCandidate)) {
      localCandidate = rootCandidate;
    } else {
      throw new Error(`Local image not found at "${imageInput}" or "${path.join("product-images", imageInput)}"`);
    }
  }

  // Copy to throwaway temp file so original user file is never deleted by uploadToImageKit
  const ext = path.extname(localCandidate) || ".jpg";
  const tempFile = path.join(TEMP_DIR, `${uniquePrefix}-${path.basename(localCandidate)}`);
  fs.copyFileSync(localCandidate, tempFile);
  return tempFile;
};

// Main Seeding Engine
export const runSeed = async (customProducts?: ProductInput[]): Promise<SeedReport> => {
  console.log("\n=======================================================");
  console.log("  🌿 Urban Loom — Bulk Product Seeding");
  console.log("=======================================================\n");

  let productsToSeed: ProductInput[] = [];

  if (customProducts && customProducts.length > 0) {
    productsToSeed = customProducts;
    console.log(`📦 Seeding ${productsToSeed.length} products passed from program...`);
  } else if (fs.existsSync(PRODUCTS_JSON)) {
    try {
      const raw = fs.readFileSync(PRODUCTS_JSON, "utf-8");
      productsToSeed = JSON.parse(raw);
      console.log(`📄 Loaded ${productsToSeed.length} products from products.json`);
    } catch (e: any) {
      console.error(`❌ Failed to parse ${PRODUCTS_JSON}: ${e.message}`);
      process.exit(1);
    }
  } else {
    console.warn(`⚠️  No products.json found at ${PRODUCTS_JSON}.`);
    console.warn(`    Please create products.json or place photos in script/product-images/`);
    console.warn(`    See script/product.example.json for reference format.`);
    process.exit(1);
  }

  if (!Array.isArray(productsToSeed) || productsToSeed.length === 0) {
    console.error("❌ Product list is empty.");
    process.exit(1);
  }

  // Connect to Database
  await ConnectionDB();

  const report: SeedReport = {
    total: productsToSeed.length,
    succeeded: 0,
    skipped: 0,
    failed: 0,
    items: [],
  };

  for (let i = 0; i < productsToSeed.length; i++) {
    const item = productsToSeed[i];
    const itemIndex = `[${i + 1}/${productsToSeed.length}]`;
    const name = item.name?.trim();

    console.log(`\n${itemIndex} Processing: "${name || 'Unnamed Product'}"`);

    try {
      // Validate required fields
      if (!name) throw new Error("Product 'name' is required");
      if (item.price === undefined || item.price === null || item.price < 0) {
        throw new Error("Product 'price' must be a valid non-negative number");
      }
      if (!item.category) throw new Error("Product 'category' is required");
      if (!item.description) throw new Error("Product 'description' is required");
      if (!item.image) throw new Error("Product 'image' path/URL is required");
      if (!item.fabric) throw new Error("Product 'fabric' is required");
      if (item.gsm === undefined || item.gsm === null || item.gsm < 0) {
        throw new Error("Product 'gsm' must be a valid non-negative number");
      }

      // Check if product already exists
      const existingProduct = await Product.findOne({
        name: new RegExp(`^${escapeRegex(name)}$`, "i"),
      });

      if (existingProduct && !isForceMode) {
        console.log(`  ⏭️  Skipped: "${name}" already exists in DB (use --force to overwrite)`);
        report.skipped++;
        report.items.push({
          name,
          status: "SKIPPED",
          message: "Already exists (use --force to overwrite)",
          productId: existingProduct._id.toString(),
        });
        continue;
      }

      // 1. Stage image & upload to ImageKit
      console.log(`  🖼️  Staging image: ${item.image}`);
      const stagedPath = await stageImageForUpload(item.image);

      console.log(`  ☁️  Uploading to ImageKit...`);
      const uploadResult = await uploadToImageKit(stagedPath);
      if (!uploadResult.success) {
        throw new Error(`ImageKit upload failed: ${uploadResult.message}`);
      }
      console.log(`  ✅ Uploaded to CDN: ${uploadResult.url}`);

      // 2. Resolve Category ID
      const categoryId = await getOrCreateCategoryId(item.category);

      // 3. Normalize Variants
      const rawVariants = Array.isArray(item.variants) && item.variants.length > 0
        ? item.variants
        : DEFAULT_VARIANTS;

      const variants = rawVariants.map((v) => ({
        color: (v.color || "Standard").trim(),
        size: (v.size || "Free Size").trim(),
        stock: Math.max(0, Number(v.stock) || 0),
      }));

      // 4. Save or Update in MongoDB
      if (existingProduct && isForceMode) {
        existingProduct.price = item.price;
        existingProduct.description = item.description;
        existingProduct.fabric = item.fabric;
        existingProduct.gsm = item.gsm;
        existingProduct.discount = item.discount || 0;
        existingProduct.category = categoryId;
        existingProduct.variants = variants as any;
        existingProduct.imageUrl = uploadResult.url;
        existingProduct.imageFileId = uploadResult.fileId;
        await existingProduct.save();

        console.log(`  🔄 Updated product: ${existingProduct._id}`);
        report.succeeded++;
        report.items.push({
          name,
          status: "UPDATED",
          productId: existingProduct._id.toString(),
        });
      } else {
        const created = await Product.create({
          name,
          price: item.price,
          description: item.description,
          fabric: item.fabric,
          gsm: item.gsm,
          discount: item.discount || 0,
          category: categoryId,
          variants,
          imageUrl: uploadResult.url,
          imageFileId: uploadResult.fileId,
        });

        console.log(`  🎉 Created product: ${created._id}`);
        report.succeeded++;
        report.items.push({
          name,
          status: "CREATED",
          productId: created._id.toString(),
        });
      }
    } catch (err: any) {
      console.error(`  ❌ Failed: ${err.message}`);
      report.failed++;
      report.items.push({
        name: name || "Unknown",
        status: "FAILED",
        message: err.message,
      });
    }
  }

  // Cleanup temporary folder
  if (fs.existsSync(TEMP_DIR)) {
    fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  }

  // Final Summary
  console.log("\n=======================================================");
  console.log("  📊 Seeding Summary");
  console.log("=======================================================");
  console.log(`  Total Processed: ${report.total}`);
  console.log(`  ✨ Succeeded:    ${report.succeeded}`);
  console.log(`  ⏭️  Skipped:      ${report.skipped}`);
  console.log(`  ❌ Failed:       ${report.failed}`);
  console.log("=======================================================\n");

  await mongoose.disconnect();
  return report;
};

// Execute if run directly from CLI
if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  runSeed()
    .then((report) => {
      process.exit(report.failed > 0 && report.succeeded === 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error("Fatal Seeding Error:", err);
      process.exit(1);
    });
}

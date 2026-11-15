import express from "express"
import cors from "cors"
import cookieparser from "cookie-parser"
import helmet from "helmet"
import morgan from "morgan"
import rateLimit from "express-rate-limit"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim().replace(/\/+$/, "")).filter(Boolean)
  : ["http://localhost:5173"];

const app = express();

// Required behind Render / Cloudflare / reverse proxy so secure cookies and client IPs work correctly
app.set("trust proxy", 1);

// Security HTTP headers - permit cross-origin media so ImageKit images load smoothly
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"))

app.use(cors({
    origin: (origin, callback) => {
      // allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes("*") || allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true
}))

app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("public"))
app.use(cookieparser())

// Global API rate limiting to safeguard against scraping, brute force, and DoS attacks
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statuscode: 429, message: "Too many requests from this IP, please try again later" }
});

// Stricter limiter for sensitive authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, statuscode: 429, message: "Too many authentication attempts, please try again later" }
});

import productrouter from "../routes/Product.routes.js"
import userrouter from "../routes/User.routes.js"
import categoryrouter from "../routes/Category.routes.js"
import addressrouter from "../routes/Address.routes.js"
import orderrouter from "../routes/Order.routes.js"
import errorHandler from "../middleware/Errorhandler.middleware.js"

// Health check endpoint for Render / monitoring services
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.status(200).send("Urban Loom API server is running");
});

// Rate limit sensitive endpoints
app.use("/api/v2/users/register", authLimiter)
app.use("/api/v2/users/login", authLimiter)
app.use("/api/v2/users/forgot-password", authLimiter)

// Apply global rate limiting to all /api routes
app.use("/api", apiLimiter)

// Route mounts
app.use("/api/v2/products", productrouter)
app.use("/api/v2/users", userrouter)
app.use("/api/v2/categories", categoryrouter)
app.use("/api/v2/addresses", addressrouter)
app.use("/api/v2/orders", orderrouter)

// Unified deployment support: If frontend/dist exists, serve it as a single web service
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.use((req, res, next) => {
    if (req.method === "GET" && !req.path.startsWith("/api") && req.path !== "/health") {
      return res.sendFile(path.join(frontendDist, "index.html"));
    }
    next();
  });
}

// Unmatched API routes handler
app.use((req, res) => {
  res.status(404).json({ success: false, statuscode: 404, message: "Route not found" })
})

// Must be registered last - catches every error thrown/passed via next() above
app.use(errorHandler)

export { app }

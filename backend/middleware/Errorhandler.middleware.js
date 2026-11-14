import { apierrors } from "../src/utils/apierrors.js";
import multer from "multer";

// centralized error handler - must be registered last, after all routes
const errorHandler = (err, req, res, next) => {
  if (err instanceof apierrors) {
    return res.status(err.statuscode).json({
      success: false,
      statuscode: err.statuscode,
      message: err.message,
      errors: err.errors,
    });
  }

  if (err instanceof multer.MulterError || err.message?.includes("Only JPEG")) {
    return res.status(400).json({
      success: false,
      statuscode: 400,
      message: err.message,
    });
  }

  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      statuscode: 400,
      message: `Invalid ${err.path || "resource ID"}`,
    });
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join(", ");
    return res.status(400).json({
      success: false,
      statuscode: 400,
      message: message || "Validation failed",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || "value";
    return res.status(409).json({
      success: false,
      statuscode: 409,
      message: `Duplicate ${field} already exists`,
    });
  }

  // fallback for unexpected errors (e.g. malformed JSON body, programming bugs)
  console.error(err);
  const statuscode = err.statuscode || err.statusCode || err.status || 500;
  return res.status(statuscode).json({
    success: false,
    statuscode,
    message: statuscode === 500 ? "Internal server error" : err.message,
  });
};

export default errorHandler;

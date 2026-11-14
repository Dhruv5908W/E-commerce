import { User } from "../src/models/user.models.js";
import asyncHandler from "../src/utils/AsyncHandler.js";
import { apierrors } from "../src/utils/apierrors.js";
import jwt from "jsonwebtoken";

export const VerifyJwt = asyncHandler(async (req, _, next) => {
  const token = req.cookies?.accesstoken || req.header("Authorization")?.replace("Bearer ", "");
  try {
    if (!token) {
      throw new apierrors(401, "Unauthorized request");
    }
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken._id).select(
      "-password -RefreshToken -AccessToken -resetPasswordToken -resetPasswordExpiry"
    );
    if (!user) {
      throw new apierrors(401, "Invalid access token");
    }
    req.user = user;
  } catch (error) {
    throw new apierrors(401, error?.message || "Invalid access token");
  }
  next();
});

export const isAdmin = (req, _, next) => {
  if (req.user?.role !== "admin") {
    throw new apierrors(403, "Access denied: admin only");
  }
  next();
};

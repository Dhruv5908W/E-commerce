import { User } from "../src/models/user.models.js";
import asyncHandler from "../src/utils/AsyncHandler.js";
import { apierrors } from "../src/utils/apierrors.js";
import { apiresponse } from "../src/utils/apiresponse.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import sendMail from "../src/utils/mailer.js";

const getCookieOptions = () => {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax", // frontend and backend live on different domains in production - without this the browser silently drops the cookie on cross-site requests
  };
};

const GenerateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const AccessToken = user.GenerateAccessToken();
    const RefreshToken = user.GenerateRefreshToken();
    user.RefreshToken = RefreshToken;
    await user.save({ validateBeforeSave: false });
    return { AccessToken, RefreshToken };
  } catch (error) {
    throw new apierrors(500, "Something went wrong while generating access and refresh tokens");
  }
};

const RegisterUser = asyncHandler(async (req, res) => {
  const { name, email, password, phonenumber } = req.body;

  if ([name, email, password, phonenumber].some((field) => !field || field.toString().trim() === "")) {
    throw new apierrors(400, "All fields must be filled");
  }

  const normalizedName = name.toString().trim().toLowerCase();
  const normalizedEmail = email.toString().trim().toLowerCase();
  const normalizedPhone = phonenumber.toString().replace(/[\s\-+()]/g, "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new apierrors(400, "Please provide a valid email address");
  }

  if (!/^\d{7,15}$/.test(normalizedPhone)) {
    throw new apierrors(400, "Please provide a valid phone number (7-15 digits)");
  }

  if (password.toString().length < 6) {
    throw new apierrors(400, "Password must be at least 6 characters");
  }

  const userExists = await User.findOne({ $or: [{ email: normalizedEmail }, { name: normalizedName }] });
  if (userExists) {
    throw new apierrors(409, "User already exists");
  }

  const user = await User.create({
    name: normalizedName,
    email: normalizedEmail,
    phonenumber: Number(normalizedPhone),
    password: password.toString(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -RefreshToken -AccessToken -resetPasswordToken -resetPasswordExpiry"
  );
  if (!createdUser) {
    throw new apierrors(500, "Something went wrong, user not created");
  }

  return res.status(201).json(
    new apiresponse(201, createdUser, "User registered successfully")
  );
});

const LoginUser = asyncHandler(async (req, res) => {
  const { name, password, email } = req.body;
  const normalizedName = name?.toString().trim().toLowerCase();
  const normalizedEmail = email?.toString().trim().toLowerCase();

  if (!normalizedEmail && !normalizedName) {
    throw new apierrors(400, "Email or username is required");
  }
  if (!password) {
    throw new apierrors(400, "Password is required");
  }

  const queryConditions = [];
  if (normalizedName) queryConditions.push({ name: normalizedName });
  if (normalizedEmail) queryConditions.push({ email: normalizedEmail });

  const user = await User.findOne({ $or: queryConditions });
  if (!user) {
    throw new apierrors(401, "Invalid user credentials");
  }

  const isPasswordCorrect = await user.isPasswordCorrect(password.toString());
  if (!isPasswordCorrect) {
    throw new apierrors(401, "Invalid user credentials");
  }

  const { AccessToken, RefreshToken } = await GenerateAccessAndRefreshToken(user._id);
  if (!AccessToken || !RefreshToken) {
    throw new apierrors(500, "Access and refresh tokens could not be generated");
  }

  const loggedUser = await User.findById(user._id).select(
    "-password -RefreshToken -AccessToken -resetPasswordToken -resetPasswordExpiry"
  );
  if (!loggedUser) {
    throw new apierrors(500, "User login failed");
  }

  const option = getCookieOptions();
  return res.status(200)
    .cookie("accesstoken", AccessToken, option)
    .cookie("refreshtoken", RefreshToken, option)
    .json(new apiresponse(200, {
      user: loggedUser, AccessToken, RefreshToken
    }, "User logged in successfully"));
});

const LogoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { RefreshToken: 1 } },
    { new: true }
  );
  const option = getCookieOptions();
  return res.status(200)
    .clearCookie("accesstoken", option)
    .clearCookie("refreshtoken", option)
    .json(new apiresponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies?.refreshtoken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new apierrors(401, "Session expired, please log in again");
  }
  try {
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded._id);
    if (!user) {
      throw new apierrors(401, "User not found");
    }
    if (incomingRefreshToken !== user.RefreshToken) {
      throw new apierrors(401, "Refresh token is expired or used");
    }
    const { AccessToken, RefreshToken } = await GenerateAccessAndRefreshToken(user._id);
    const option = getCookieOptions();
    return res.status(200)
      .cookie("accesstoken", AccessToken, option)
      .cookie("refreshtoken", RefreshToken, option)
      .json(new apiresponse(200, { AccessToken, RefreshToken }, "Access token refreshed"));
  } catch (error) {
    throw new apierrors(401, error?.message || "Invalid refresh token");
  }
});

const ChangePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confPassword } = req.body;
  if (!oldPassword || !newPassword || !confPassword) {
    throw new apierrors(400, "All password fields are required");
  }
  if (newPassword !== confPassword) {
    throw new apierrors(400, "New password must be same as confirm password");
  }
  if (newPassword.toString().length < 6) {
    throw new apierrors(400, "New password must be at least 6 characters");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new apierrors(404, "User not found");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword.toString());
  if (!isPasswordCorrect) {
    throw new apierrors(401, "Old password is incorrect");
  }
  user.password = newPassword.toString();
  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new apiresponse(200, {}, "Password changed successfully"));
});

const GetUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new apiresponse(200, { user: req.user }, "User details fetched successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email?.trim()) {
    throw new apierrors(400, "Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // respond the same way whether or not the user exists, so attackers can't use this to find valid emails
  if (!user) {
    return res.status(200).json(new apiresponse(200, {}, "If that email exists, a reset link has been sent"));
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.resetPasswordExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  try {
    await sendMail({
      to: user.email,
      subject: "Reset your password - Urban Loom",
      html: `<p>Click the link below to reset your password. This link expires in 15 minutes.</p><a href="${resetUrl}">${resetUrl}</a>`
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    throw new apierrors(500, "Failed to send reset email, please try again later");
  }

  return res.status(200).json(new apiresponse(200, {}, "If that email exists, a reset link has been sent"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { newPassword, confPassword } = req.body;

  if (!newPassword || !confPassword) {
    throw new apierrors(400, "New password and confirm password are required");
  }
  if (newPassword !== confPassword) {
    throw new apierrors(400, "New password must be same as confirm password");
  }
  if (newPassword.toString().length < 6) {
    throw new apierrors(400, "New password must be at least 6 characters");
  }

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpiry: { $gt: Date.now() }
  });

  if (!user) {
    throw new apierrors(400, "Reset link is invalid or has expired");
  }

  user.password = newPassword.toString();
  user.resetPasswordToken = undefined;
  user.resetPasswordExpiry = undefined;
  await user.save();

  return res.status(200).json(new apiresponse(200, {}, "Password reset successfully"));
});

export { RegisterUser, LoginUser, refreshAccessToken, LogoutUser, ChangePassword, GetUser, forgotPassword, resetPassword };

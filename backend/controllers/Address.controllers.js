import mongoose from "mongoose";
import asyncHandler from "../src/utils/AsyncHandler.js";
import { apierrors } from "../src/utils/apierrors.js";
import { apiresponse } from "../src/utils/apiresponse.js";
import { Address } from "../src/models/adress.models.js";

const REQUIRED_FIELDS = ["phoneNumber", "addressLine1", "city", "state", "pincode", "country", "district"];
const ALLOWED_FIELDS = ["phoneNumber", "addressLine1", "addressLine2", "city", "state", "pincode", "country", "district"];

const pickAddressPayload = (body) => {
  const payload = {};
  for (const field of ALLOWED_FIELDS) {
    if (body[field] !== undefined) {
      payload[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  }
  if (payload.phoneNumber !== undefined) {
    const cleanedPhone = payload.phoneNumber.toString().replace(/[\s\-+()]/g, "");
    if (!/^\d{7,15}$/.test(cleanedPhone)) {
      throw new apierrors(400, "Please provide a valid phone number (7-15 digits)");
    }
    payload.phoneNumber = Number(cleanedPhone);
  }
  if (payload.pincode !== undefined) {
    const cleanedPin = payload.pincode.toString().replace(/\s+/g, "");
    if (!/^\d{4,10}$/.test(cleanedPin)) {
      throw new apierrors(400, "Please provide a valid numeric pincode");
    }
    payload.pincode = Number(cleanedPin);
  }
  return payload;
};

const addAddress = asyncHandler(async (req, res) => {
  const missingField = REQUIRED_FIELDS.find((field) => !req.body[field]?.toString().trim());
  if (missingField) {
    throw new apierrors(400, `${missingField} is required`);
  }

  const payload = pickAddressPayload(req.body);

  // first address for a user is automatically the default
  const isFirstAddress = (await Address.countDocuments({ userId: req.user._id })) === 0;

  const address = await Address.create({
    ...payload,
    userId: req.user._id,
    isDefault: isFirstAddress,
  });

  return res.status(201).json(
    new apiresponse(201, address, "Address added successfully")
  );
});

const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.find({ userId: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
  return res.status(200).json(
    new apiresponse(200, addresses, "Addresses fetched successfully")
  );
});

const updateAddress = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.addressId)) {
    throw new apierrors(400, "Invalid address ID");
  }

  const payload = pickAddressPayload(req.body);
  if (Object.keys(payload).length === 0) {
    throw new apierrors(400, "No valid address fields provided");
  }

  const address = await Address.findOneAndUpdate(
    { _id: req.params.addressId, userId: req.user._id },
    { $set: payload },
    { new: true, runValidators: true }
  );

  if (!address) {
    throw new apierrors(404, "Address not found");
  }

  return res.status(200).json(
    new apiresponse(200, address, "Address updated successfully")
  );
});

const deleteAddress = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.addressId)) {
    throw new apierrors(400, "Invalid address ID");
  }

  const address = await Address.findOneAndDelete({ _id: req.params.addressId, userId: req.user._id });
  if (!address) {
    throw new apierrors(404, "Address not found");
  }

  if (address.isDefault) {
    const nextAddress = await Address.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    if (nextAddress) {
      nextAddress.isDefault = true;
      await nextAddress.save();
    }
  }

  return res.status(200).json(
    new apiresponse(200, {}, "Address deleted successfully")
  );
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.addressId)) {
    throw new apierrors(400, "Invalid address ID");
  }

  const address = await Address.findOne({ _id: req.params.addressId, userId: req.user._id });
  if (!address) {
    throw new apierrors(404, "Address not found");
  }

  await Address.updateMany({ userId: req.user._id }, { $set: { isDefault: false } });
  address.isDefault = true;
  await address.save();

  return res.status(200).json(
    new apiresponse(200, address, "Default address updated")
  );
});

export { addAddress, getAddresses, updateAddress, deleteAddress, setDefaultAddress };

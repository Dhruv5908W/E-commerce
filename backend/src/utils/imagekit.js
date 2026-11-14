import ImageKit from "imagekit";
import fs from "fs";
import path from "path";

let imagekitClient = null;

const getImageKitClient = () => {
  if (imagekitClient) return imagekitClient;

  const { IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT } = process.env;
  if (!IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_URL_ENDPOINT) {
    throw new Error("ImageKit credentials are not configured in environment variables");
  }

  imagekitClient = new ImageKit({
    publicKey: IMAGEKIT_PUBLIC_KEY,
    privateKey: IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  });
  return imagekitClient;
};

const uploadToImageKit = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return { success: false, message: "No local file path provided" };
    }

    if (!fs.existsSync(localFilePath)) {
      return { success: false, message: "File does not exist" };
    }

    const imagekit = getImageKitClient();
    const fileBuffer = fs.readFileSync(localFilePath);

    const response = await imagekit.upload({
      file: fileBuffer.toString("base64"),
      fileName: path.basename(localFilePath),
      folder: "products",
    });

    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return {
      success: true,
      url: response.url,
      fileId: response.fileId,
    };

  } catch (error) {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    console.error("ImageKit Upload Error:", error);

    return {
      success: false,
      message: error.message || "Image upload failed",
    };
  }
};

const deleteFromImageKit = async (fileId) => {
  if (!fileId) return;
  try {
    const imagekit = getImageKitClient();
    await imagekit.deleteFile(fileId);
  } catch (error) {
    console.error("ImageKit Delete Error:", error);
  }
};

export default uploadToImageKit;
export { deleteFromImageKit };

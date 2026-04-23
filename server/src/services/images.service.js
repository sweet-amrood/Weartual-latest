import AppError from "../utils/AppError.js";
import UploadedImage from "../models/UploadedImage.js";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

const toClientImage = (doc) => ({
  id: doc._id,
  filename: doc.filename,
  contentType: doc.contentType,
  size: doc.size,
  createdAt: doc.createdAt,
  dataUrl: `data:${doc.contentType};base64,${doc.data.toString("base64")}`
});

export const uploadImageService = async ({ userId, file }) => {
  if (!file) throw new AppError("Image file is required", 400);
  if (!ALLOWED_CONTENT_TYPES.has(file.mimetype)) throw new AppError("Only JPEG/PNG/WebP images are allowed", 400);
  if (file.size > MAX_BYTES) throw new AppError("Max image size is 5MB", 400);

  const doc = await UploadedImage.create({
    userId,
    filename: file.originalname,
    contentType: file.mimetype,
    size: file.size,
    data: file.buffer
  });

  return toClientImage(doc);
};

export const listMyImagesService = async (userId) => {
  const docs = await UploadedImage.find({ userId }).sort({ createdAt: -1 }).limit(50);
  return docs.map(toClientImage);
};


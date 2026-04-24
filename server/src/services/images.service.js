import AppError from "../utils/AppError.js";
import UploadedImage from "../models/UploadedImage.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const RESULT_DIR = path.resolve(__dirname, "../../result");

const toClientImage = (doc) => ({
  id: doc._id,
  userId: doc.userId,
  imageUrl: doc.imageUrl,
  garmentUrl: doc.garmentUrl,
  resultUrl: doc.resultUrl,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const validateFile = (file, label) => {
  if (!file) throw new AppError(`${label} file is required`, 400);
  if (!ALLOWED_CONTENT_TYPES.has(file.mimetype)) throw new AppError("Only JPEG/PNG/WebP images are allowed", 400);
  if (file.size > MAX_BYTES) throw new AppError("Max image size is 5MB", 400);
};

const uploadBufferToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    stream.end(buffer);
  });

const saveCloudinaryFileLocally = async (url, subFolder) => {
  const response = await fetch(url);
  if (!response.ok) throw new AppError(`Failed to download uploaded image from Cloudinary (${subFolder})`, 500);

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const targetDir = path.join(UPLOADS_DIR, subFolder);
  await fs.mkdir(targetDir, { recursive: true });

  const extension = path.extname(new URL(url).pathname) || ".jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${extension}`;
  const fullPath = path.join(targetDir, fileName);

  await fs.writeFile(fullPath, buffer);
};

const createMockResultAndUpload = async ({ imageUpload, garmentUpload }) => {
  await fs.mkdir(RESULT_DIR, { recursive: true });

  const composedResultUrl = cloudinary.url(imageUpload.public_id, {
    secure: true,
    transformation: [
      { width: 900, height: 1200, crop: "fill" },
      {
        overlay: garmentUpload.public_id,
        gravity: "south",
        y: 20,
        width: 500,
        crop: "fit",
        opacity: 85
      }
    ]
  });

  const composeResponse = await fetch(composedResultUrl);
  if (!composeResponse.ok) {
    throw new AppError("Failed to generate result image from Cloudinary transformation", 500);
  }

  const resultBuffer = Buffer.from(await composeResponse.arrayBuffer());
  const resultFileName = `result-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const resultFilePath = path.join(RESULT_DIR, resultFileName);
  await fs.writeFile(resultFilePath, resultBuffer);

  const resultUpload = await cloudinary.uploader.upload(resultFilePath, {
    folder: "uploads/result",
    resource_type: "image"
  });

  if (!resultUpload?.secure_url) {
    throw new AppError("Cloudinary result upload failed to return secure URL", 500);
  }

  return resultUpload.secure_url;
};

export const uploadImageService = async ({ userId, imageFile, garmentFile }) => {
  validateFile(imageFile, "Image");
  validateFile(garmentFile, "Garment");

  const [imageUpload, garmentUpload] = await Promise.all([
    uploadBufferToCloudinary(imageFile.buffer, "uploads/image"),
    uploadBufferToCloudinary(garmentFile.buffer, "uploads/garment")
  ]);

  const imageUrl = imageUpload?.secure_url;
  const garmentUrl = garmentUpload?.secure_url;

  if (!imageUrl || !garmentUrl) {
    throw new AppError("Cloudinary upload failed to return secure URLs", 500);
  }

  await Promise.all([
    saveCloudinaryFileLocally(imageUrl, "image"),
    saveCloudinaryFileLocally(garmentUrl, "garment")
  ]);

  const resultUrl = await createMockResultAndUpload({ imageUpload, garmentUpload });

  const job = await UploadedImage.create({
    userId,
    imageUrl,
    garmentUrl,
    resultUrl
  });

  return toClientImage(job);
};

export const listMyImagesService = async (userId) => {
  const docs = await UploadedImage.find({ userId }).sort({ createdAt: -1 }).limit(50);
  return docs.map(toClientImage);
};


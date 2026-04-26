import AppError from "../utils/AppError.js";
import UploadedImage from "../models/UploadedImage.js";
import cloudinary from "../config/cloudinary.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const DATASET_ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".json"]);
const MAX_BYTES = 10 * 1024 * 1024;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RESULT_DIR = path.resolve(__dirname, "../../result");
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");
const DATASET_ROOT_CANDIDATES = [
  process.env.STABLE_VITON_DATASET_DIR ? path.resolve(__dirname, process.env.STABLE_VITON_DATASET_DIR) : null,
  path.resolve(__dirname, "../../dataset small"),
  path.resolve(__dirname, "../../dataset")
].filter(Boolean);
const STABLE_VITON_DATASET_FOLDERS = [
  { bundleFolder: "image", sourceFolders: ["image"], prefixType: "person" },
  { bundleFolder: "agnostic-v3.2", sourceFolders: ["agnostic-v3.2"], prefixType: "person" },
  { bundleFolder: "agnostic-mask", sourceFolders: ["agnostic-mask"], prefixType: "person" },
  { bundleFolder: "densepose", sourceFolders: ["densepose", "image-densepose"], prefixType: "person" },
  { bundleFolder: "cloth", sourceFolders: ["cloth"], prefixType: "cloth" },
  { bundleFolder: "cloth-mask", sourceFolders: ["cloth-mask", "cloth_mask"], prefixType: "cloth" }
];
const SAMPLE_DATASET_FOLDERS = {
  image: ["image"],
  cloth: ["cloth"]
};
const SAMPLE_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const toClientImage = (doc) => ({
  id: doc._id,
  userId: doc.userId,
  imageFilename: doc.imageFilename,
  garmentFilename: doc.garmentFilename,
  imageUrl: doc.imageUrl,
  garmentUrl: doc.garmentUrl,
  resultUrl: doc.resultUrl,
  resultFilename: doc.resultFilename,
  stableVitonBundle: doc.stableVitonBundle,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt
});

const validateFile = (file, label) => {
  if (!file) throw new AppError(`${label} file is required`, 400);
  if (!ALLOWED_CONTENT_TYPES.has(file.mimetype)) throw new AppError("Only JPEG/PNG/WebP images are allowed", 400);
  if (file.size > MAX_BYTES) throw new AppError("Max image size is 10MB", 400);
};

const parseFileIdentity = (fileName) => {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext);
  return { ext, baseName };
};

const deriveDatasetPrefix = (fileName) => parseFileIdentity(fileName).baseName.trim();

const getOriginalFileName = (fileName, fallbackName) => path.basename(fileName || fallbackName);

const writeBufferWithOriginalName = async (subFolder, fileName, buffer) => {
  const dir = path.join(UPLOADS_DIR, subFolder);
  await fs.mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, fileName);
  await fs.writeFile(fullPath, buffer);
  return { fullPath, fileName };
};

const buildPublicId = (fileName) => {
  const ext = path.extname(fileName);
  const nameWithoutExt = path.basename(fileName, ext);
  return nameWithoutExt;
};

const uploadBufferToCloudinary = (buffer, folder, fileName) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        public_id: buildPublicId(fileName),
        use_filename: true,
        unique_filename: false,
        overwrite: true,
        filename_override: fileName
      },
      (error, result) => {
        if (error) return reject(error);
        return resolve(result);
      }
    );
    stream.end(buffer);
  });

const uploadPathToCloudinary = async (filePath, folder, fileName) => {
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: "auto",
    public_id: buildPublicId(fileName),
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    filename_override: fileName
  });
  return result;
};

const collectDatasetFilesByPrefix = async (datasetSubfolder, prefix) => {
  for (const datasetRoot of DATASET_ROOT_CANDIDATES) {
    const folderPath = path.join(datasetRoot, datasetSubfolder);
    try {
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      const files = entries
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
        .filter((name) => parseFileIdentity(name).baseName === prefix)
        .filter((name) => DATASET_ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
        .map((name) => path.join(folderPath, name));

      if (files.length > 0) return files;
    } catch {
      // Try next dataset root candidate
    }
  }
  return [];
};

const resolveDatasetStableVitonInputs = async ({ personPrefix, clothPrefix }) => {
  const assets = {};
  for (const datasetConfig of STABLE_VITON_DATASET_FOLDERS) {
    const prefix = datasetConfig.prefixType === "person" ? personPrefix : clothPrefix;
    let files = [];
    for (const sourceFolder of datasetConfig.sourceFolders) {
      files = await collectDatasetFilesByPrefix(sourceFolder, prefix);
      if (files.length > 0) break;
    }

    assets[datasetConfig.bundleFolder] = files.map((filePath) => ({
      fileName: path.basename(filePath),
      localPath: filePath,
      datasetRelativePath: `${datasetConfig.bundleFolder}/${path.basename(filePath)}`
    }));
  }
  return assets;
};

const uploadStableVitonAssets = async ({ assets, cloudRootFolder }) => {
  const cloudUploads = [];
  for (const [datasetFolder, files] of Object.entries(assets)) {
    for (const file of files) {
      const cloudFolder = `${cloudRootFolder}/${datasetFolder}`;
      cloudUploads.push(
        uploadPathToCloudinary(file.localPath, cloudFolder, file.fileName).then((upload) => ({
          ...file,
          cloudUrl: upload.secure_url
        }))
      );
    }
  }

  const uploadedFiles = await Promise.all(cloudUploads);
  const filesByRelativePath = new Map(uploadedFiles.map((file) => [file.datasetRelativePath, file]));
  const uploadedAssets = {};

  for (const [datasetFolder, files] of Object.entries(assets)) {
    uploadedAssets[datasetFolder] = files.map((file) => filesByRelativePath.get(file.datasetRelativePath));
  }

  return uploadedAssets;
};

const buildStableVitonInputBundle = async ({ personPrefix, clothPrefix, cloudRootFolder }) => {
  const resolvedAssets = await resolveDatasetStableVitonInputs({ personPrefix, clothPrefix });
  const uploadedAssets = await uploadStableVitonAssets({
    assets: resolvedAssets,
    cloudRootFolder
  });

  return {
    personPrefix,
    clothPrefix,
    cloudRoot: cloudRootFolder,
    assets: uploadedAssets
  };
};

const createMockResultAndUpload = async (imageFile) => {
  await fs.mkdir(RESULT_DIR, { recursive: true });
  const originalName = getOriginalFileName(imageFile.originalname, "result.jpg");
  const extension = path.extname(originalName) || ".jpg";
  const resultBuffer = imageFile.buffer;
  const resultFileName = originalName.endsWith(extension) ? originalName : `${originalName}${extension}`;
  const resultFilePath = path.join(RESULT_DIR, resultFileName);
  await fs.writeFile(resultFilePath, resultBuffer);

  const resultUpload = await uploadBufferToCloudinary(resultBuffer, "uploads/result", resultFileName);

  if (!resultUpload?.secure_url) {
    throw new AppError("Cloudinary result upload failed to return secure URL", 500);
  }

  return {
    resultUrl: resultUpload.secure_url,
    resultFilename: resultFileName
  };
};

export const uploadImageService = async ({ userId, imageFile, garmentFile }) => {
  validateFile(imageFile, "Image");
  validateFile(garmentFile, "Garment");

  const imageName = getOriginalFileName(imageFile.originalname, "image.jpg");
  const garmentName = getOriginalFileName(garmentFile.originalname, "garment.jpg");
  const personPrefix = deriveDatasetPrefix(imageName);
  const clothPrefix = deriveDatasetPrefix(garmentName);

  await Promise.all([
    writeBufferWithOriginalName("image", imageName, imageFile.buffer),
    writeBufferWithOriginalName("garment", garmentName, garmentFile.buffer)
  ]);

  const [imageUpload, garmentUpload] = await Promise.all([
    uploadBufferToCloudinary(imageFile.buffer, "uploads/image", imageName),
    uploadBufferToCloudinary(garmentFile.buffer, "uploads/garment", garmentName)
  ]);

  const imageUrl = imageUpload?.secure_url;
  const garmentUrl = garmentUpload?.secure_url;

  if (!imageUrl || !garmentUrl) {
    throw new AppError("Cloudinary upload failed to return secure URLs", 500);
  }

  const stableVitonBundle = await buildStableVitonInputBundle({
    personPrefix,
    clothPrefix,
    cloudRootFolder: `uploads/stableviton/${userId}/${Date.now()}`
  });

  const hasPersonDatasetAssets = (stableVitonBundle.assets?.image || []).length > 0;
  const hasClothDatasetAssets = (stableVitonBundle.assets?.cloth || []).length > 0;
  if (!hasPersonDatasetAssets || !hasClothDatasetAssets) {
    throw new AppError(
      "Could not find matching dataset assets for the uploaded file names. Use dataset-style names (e.g. 00011_00) or choose sample images.",
      400
    );
  }

  const { resultUrl, resultFilename } = await createMockResultAndUpload(imageFile);

  const job = await UploadedImage.create({
    userId,
    imageFilename: imageName,
    garmentFilename: garmentName,
    imageUrl,
    garmentUrl,
    resultUrl,
    resultFilename,
    stableVitonBundle
  });

  return toClientImage(job);
};

export const listMyImagesService = async (userId) => {
  const docs = await UploadedImage.find({ userId }).sort({ createdAt: -1 }).limit(50);
  return docs.map(toClientImage);
};

export const listDatasetSamplesService = async (type, offset = 0) => {
  const folderCandidates = SAMPLE_DATASET_FOLDERS[type];
  if (!folderCandidates) throw new AppError("Invalid sample type", 400);
  const safeOffset = Math.max(0, offset);

  for (const datasetRoot of DATASET_ROOT_CANDIDATES) {
    for (const folderName of folderCandidates) {
      const folderPath = path.join(datasetRoot, folderName);
      try {
        const entries = await fs.readdir(folderPath, { withFileTypes: true });
        const files = entries
          .filter((entry) => entry.isFile())
          .map((entry) => entry.name)
          .filter((name) => SAMPLE_FILE_EXTENSIONS.has(path.extname(name).toLowerCase()))
          .sort((a, b) => a.localeCompare(b))
          .slice(safeOffset, safeOffset + 8)
          .map((name) => ({
            fileName: name,
            url: `/api/images/samples/file?type=${encodeURIComponent(type)}&name=${encodeURIComponent(name)}`
          }));

        if (files.length > 0) return files;
      } catch {
        // Try next candidate path
      }
    }
  }

  return [];
};

export const getDatasetSampleFileService = async ({ type, name }) => {
  const folderCandidates = SAMPLE_DATASET_FOLDERS[type];
  if (!folderCandidates) throw new AppError("Invalid sample type", 400);

  const fileName = path.basename(name || "");
  if (!fileName) throw new AppError("File name is required", 400);

  const ext = path.extname(fileName).toLowerCase();
  if (!SAMPLE_FILE_EXTENSIONS.has(ext)) throw new AppError("Unsupported file type", 400);

  for (const datasetRoot of DATASET_ROOT_CANDIDATES) {
    for (const folderName of folderCandidates) {
      const filePath = path.join(datasetRoot, folderName, fileName);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // Try next candidate path
      }
    }
  }

  throw new AppError("Sample file not found", 404);
};


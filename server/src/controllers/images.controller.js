import path from "path";
import asyncHandler from "../utils/asyncHandler.js";
import {
  deleteMyImageByResultUrlService,
  deleteMyImageService,
  getAccountLookCountService,
  getDatasetSampleFileService,
  getDecartResultFileForStreaming,
  listDatasetSamplesService,
  listMyImagesService,
  uploadImageService
} from "../services/images.service.js";

export const uploadMyImage = asyncHandler(async (req, res) => {
  const { job, lookCount } = await uploadImageService({
    userId: req.user.userId,
    imageFile: req.files?.image?.[0],
    garmentFile: req.files?.garment?.[0],
    isAborted: () => req.socket?.destroyed || false
  });

  res.status(201).json({ success: true, job, lookCount: Number(lookCount) });
});

export const listMyImages = asyncHandler(async (req, res) => {
  const images = await listMyImagesService(req.user.userId);
  res.status(200).json({ success: true, images });
});

export const getMyLookCount = asyncHandler(async (req, res) => {
  const lookCount = await getAccountLookCountService(req.user.userId);
  res.status(200).json({ success: true, lookCount: Number(lookCount) });
});

export const deleteMyImage = asyncHandler(async (req, res) => {
  const { lookCount } = await deleteMyImageService(req.user.userId, req.params.jobId);
  res.status(200).json({ success: true, message: "Result deleted", lookCount: Number(lookCount) });
});

export const deleteMyImageByResultUrl = asyncHandler(async (req, res) => {
  const resultUrl = req.body?.resultUrl;
  const { lookCount } = await deleteMyImageByResultUrlService(req.user.userId, resultUrl);
  res.status(200).json({ success: true, message: "Result deleted", lookCount: Number(lookCount) });
});

export const listDatasetSamples = asyncHandler(async (req, res) => {
  const type = String(req.query.type || "").toLowerCase();
  const offset = Number.parseInt(String(req.query.offset || "0"), 10);
  const samples = await listDatasetSamplesService(type, Number.isNaN(offset) ? 0 : offset);
  res.status(200).json({ success: true, samples });
});

export const getDatasetSampleFile = asyncHandler(async (req, res) => {
  const type = String(req.query.type || "").toLowerCase();
  const name = String(req.query.name || "");
  const filePath = await getDatasetSampleFileService({ type, name });
  res.sendFile(filePath);
});

export const streamDecartJobVideo = asyncHandler(async (req, res) => {
  const { filePath } = await getDecartResultFileForStreaming(req.params.jobId, req.user.userId);
  res.setHeader("Content-Type", "video/mp4");
  res.setHeader("Accept-Ranges", "bytes");
  res.sendFile(path.resolve(filePath));
});


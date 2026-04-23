import asyncHandler from "../utils/asyncHandler.js";
import { listMyImagesService, uploadImageService } from "../services/images.service.js";

export const uploadMyImage = asyncHandler(async (req, res) => {
  const image = await uploadImageService({
    userId: req.user.userId,
    file: req.file
  });

  res.status(201).json({ success: true, image });
});

export const listMyImages = asyncHandler(async (req, res) => {
  const images = await listMyImagesService(req.user.userId);
  res.status(200).json({ success: true, images });
});


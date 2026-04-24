import asyncHandler from "../utils/asyncHandler.js";
import { listMyImagesService, uploadImageService } from "../services/images.service.js";

export const uploadMyImage = asyncHandler(async (req, res) => {
  const job = await uploadImageService({
    userId: req.user.userId,
    imageFile: req.files?.image?.[0],
    garmentFile: req.files?.garment?.[0]
  });

  res.status(201).json({ success: true, job });
});

export const listMyImages = asyncHandler(async (req, res) => {
  const images = await listMyImagesService(req.user.userId);
  res.status(200).json({ success: true, images });
});


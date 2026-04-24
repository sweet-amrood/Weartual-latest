import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { listMyImages, uploadMyImage } from "../controllers/images.controller.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/me", requireAuth, listMyImages);
router.post(
  "/me",
  requireAuth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "garment", maxCount: 1 }
  ]),
  uploadMyImage
);

export default router;


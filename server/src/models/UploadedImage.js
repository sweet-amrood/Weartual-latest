import mongoose from "mongoose";

const IMAGE_JOB_STATUSES = ["pending", "processing", "done", "failed"];

const uploadedImageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    imageFilename: { type: String, required: true },
    garmentFilename: { type: String, required: true },
    imageUrl: { type: String, required: true },
    garmentUrl: { type: String, required: true },
    status: {
      type: String,
      enum: IMAGE_JOB_STATUSES,
      default: "pending",
      index: true
    },
    processedAt: { type: Date, default: null },
    error: { type: String, default: null },
    resultUrl: { type: String, default: null },
    resultFilename: { type: String, default: null },
    stableVitonBundle: {
      personPrefix: { type: String, default: null },
      clothPrefix: { type: String, default: null },
      cloudRoot: { type: String, default: null },
      assets: { type: mongoose.Schema.Types.Mixed, default: {} }
    }
  },
  { timestamps: true }
);

const UploadedImage = mongoose.model("UploadedImage", uploadedImageSchema);

export default UploadedImage;


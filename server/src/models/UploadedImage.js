import mongoose from "mongoose";

const uploadedImageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    imageFilename: { type: String, required: true },
    garmentFilename: { type: String, required: true },
    imageUrl: { type: String, required: true },
    garmentUrl: { type: String, required: true },
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


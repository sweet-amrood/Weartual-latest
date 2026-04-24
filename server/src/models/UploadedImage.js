import mongoose from "mongoose";

const uploadedImageSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    imageUrl: { type: String, required: true },
    garmentUrl: { type: String, required: true },
    resultUrl: { type: String, default: null }
  },
  { timestamps: true }
);

const UploadedImage = mongoose.model("UploadedImage", uploadedImageSchema);

export default UploadedImage;


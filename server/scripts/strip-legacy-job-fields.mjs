/**
 * One-time cleanup: remove worker-era fields (status, processedAt, error) from UploadedImage docs.
 * Run: node scripts/strip-legacy-job-fields.mjs
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!uri) {
  console.error("Set MONGODB_URI in server/.env");
  process.exit(1);
}

await mongoose.connect(uri);
const collection = mongoose.connection.collection("uploadedimages");
const result = await collection.updateMany({}, { $unset: { status: "", processedAt: "", error: "" } });
console.info("[migrate] Stripped legacy job fields from uploadedimages", {
  matched: result.matchedCount,
  modified: result.modifiedCount
});
await mongoose.disconnect();

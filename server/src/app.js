import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import imageRoutes from "./routes/images.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";

const app = express();

const allowedOrigins = process.env.CLIENT_URL.split(',');

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({ success: true, message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;

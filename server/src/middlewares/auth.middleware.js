import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

export const requireAuth = (req, _res, next) => {
  const bearerToken = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null;

  const token = req.cookies?.token || bearerToken;
  if (!token) return next(new AppError("Authentication required", 401));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return next(new AppError("Invalid or expired token", 401));
  }
};

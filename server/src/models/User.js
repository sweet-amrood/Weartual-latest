import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      unique: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    loginPlatform: {
      type: String,
      enum: ["web", "google"],
      default: "web"
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false
    },
    resetPasswordToken: {
      type: String,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      default: null
    },
    totalLookCount: {
      type: Number,
      default: 0,
      min: 0
    },
    avatarUrl: {
      type: String,
      default: null,
      maxlength: 2048
    },
    avatarPreset: {
      type: String,
      default: null,
      maxlength: 64
    },
    /** Single Expo push token for the mobile app (see POST /api/auth/me/notifications). */
    expoPushToken: {
      type: String,
      default: null,
      maxlength: 512
    },
    notificationsEnabled: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword(next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  this.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
  return rawToken;
};

const User = mongoose.model("User", userSchema);

export default User;

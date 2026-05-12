import { body, param, validationResult } from "express-validator";

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  return res.status(400).json({
    success: false,
    message: "Validation failed",
    errors: errors.array().map((err) => ({
      field: err.path,
      message: err.msg
    }))
  });
};

export const signupValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3-30 characters"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
];

export const loginValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required")
];

export const googleAuthValidation = [
  body().custom((_value, { req }) => {
    const token = req.body?.token || req.body?.idToken;
    if (!token) {
      throw new Error("Google token is required");
    }
    return true;
  })
];

/** Same body rules as Google sign-in (credential JWT in `token` or `idToken`). */
export const linkGoogleValidation = googleAuthValidation;

export const forgotPasswordValidation = [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail()
];

export const resetPasswordValidation = [
  param("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters")
];

export const patchMeValidation = [
  body("username")
    .optional()
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be 3–30 characters"),
  body("email").optional().isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("currentPassword").optional().isString().isLength({ min: 1 }).withMessage("currentPassword cannot be empty when provided"),
  body("avatarPreset")
    .optional({ nullable: true })
    .custom((v) => {
      if (v === null || v === undefined) return true;
      if (typeof v !== "string") throw new Error("avatarPreset must be a string or null");
      if (v.length > 64) throw new Error("avatarPreset must be at most 64 characters");
      return true;
    }),
  body("avatarUrl")
    .optional({ nullable: true })
    .custom((v) => {
      if (v === null || v === undefined) return true;
      if (typeof v !== "string") throw new Error("avatarUrl must be a string or null");
      if (v.length > 2048) throw new Error("avatarUrl must be at most 2048 characters");
      return true;
    })
];

export const postMeNotificationsValidation = [
  body("enabled")
    .exists()
    .withMessage("enabled is required")
    .custom((v) => {
      if (v !== true && v !== false) {
        throw new Error("enabled must be a boolean");
      }
      return true;
    }),
  body("expoPushToken")
    .optional({ nullable: true })
    .custom((v) => {
      if (v === null || v === undefined || v === "") return true;
      if (typeof v !== "string") throw new Error("expoPushToken must be a string or null");
      const t = v.trim();
      if (!/^ExponentPushToken\[[^\]]+]$/.test(t)) {
        throw new Error("Invalid Expo push token (expected ExponentPushToken[...])");
      }
      return true;
    })
];

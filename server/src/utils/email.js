export const sendPasswordResetEmail = async (email, resetUrl) => {
  // Replace this with nodemailer/provider integration in production.
  console.log(`Password reset for ${email}: ${resetUrl}`);
  return true;
};

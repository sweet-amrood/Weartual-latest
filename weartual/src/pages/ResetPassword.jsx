import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { resetPassword as resetPasswordRequest } from "../services/authApi";
import { Lock, ArrowRight, CheckCircle } from "lucide-react";
import SiteLogo from "../components/SiteLogo";
import { easeOut } from "../lib/motionPresets";

const ResetPassword = () => {
  const reduceMotion = useReducedMotion();
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token?.trim()) {
      setError("Invalid or missing reset link. Request a new reset from the forgot password page.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordRequest({ token: token.trim(), password: formData.password });
      setMessage("Your password was updated. You can sign in with your new password.");
      setTimeout(() => navigate("/login"), 2500);
    } catch (requestError) {
      setError(requestError.message || "Could not reset password. The link may have expired.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans bg-white dark:bg-slate-950 dark:text-slate-100">
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 xl:px-24">
        <motion.div
          className="mx-auto w-full max-w-sm lg:max-w-md"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: easeOut }}
        >
          <div className="mb-10 text-center sm:text-left">
            <SiteLogo
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-contain shadow-lg shadow-brand-500/30 mb-6"
            />
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-2">Set new password</h1>
            <p className="text-sm text-slate-500">Choose a new password for your Weartual account.</p>
          </div>

          <AnimatePresence>
            {error ? (
              <motion.div
                key="reset-error"
                role="alert"
                layout
                initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: easeOut }}
                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm"
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {message ? (
              <motion.div
                key="reset-success"
                layout
                initial={reduceMotion ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.25, ease: easeOut }}
                className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm flex items-center gap-3"
              >
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                {message}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">
                New password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="confirmPassword">
                Confirm password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              whileHover={reduceMotion || isSubmitting ? undefined : { scale: 1.01 }}
              whileTap={reduceMotion || isSubmitting ? undefined : { scale: 0.99 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className="flex w-full mt-2 items-center justify-center rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-white" />
              ) : (
                <>
                  Update password
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-10 text-center text-sm text-slate-600">
            <Link to="/forgot-password" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Request a new link
            </Link>
            {" · "}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Back to log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ResetPassword;

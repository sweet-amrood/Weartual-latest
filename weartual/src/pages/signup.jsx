import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { googleAuth, signup as signupRequest } from '../services/authApi';
import { Mail, Lock, EyeOff, Eye, ArrowRight, User } from 'lucide-react';
import { SITE_LOGO_SRC } from '../config/branding';
import { easeOut, staggerChildren, fadeUpItem } from '../lib/motionPresets';

const Signup = ({ onSignup }) => {
  const reduceMotion = useReducedMotion();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (formData.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await signupRequest({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      onSignup(response.user);
    } catch (error) {
      setError(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async (credentialResponse) => {
    const token = credentialResponse?.credential;
    if (!token) {
      setError('Google authentication failed. Please try again.');
      return;
    }

    if (import.meta.env.DEV) {
      console.info('[Google OAuth][signup] received credential length:', token.length);
      console.info('[Google OAuth][signup] credential prefix:', token.slice(0, 16));
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await googleAuth({ token });
      onSignup(response.user);
    } catch (error) {
      setError(error.message || 'Google signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans bg-white dark:bg-slate-950 dark:text-slate-100">
      {/* Left Form Section */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24">
        <motion.div
          className="mx-auto w-full max-w-sm lg:max-w-md"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.42, ease: easeOut }
          }
        >
          
          <motion.div
            className="mb-8 text-center sm:text-left"
            variants={staggerChildren(reduceMotion, 0.07)}
            initial="hidden"
            animate="show"
          >
            <motion.img
              variants={fadeUpItem(reduceMotion)}
              src={SITE_LOGO_SRC}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-xl object-contain shadow-lg shadow-brand-500/30 mb-6"
            />
            <motion.h1
              variants={fadeUpItem(reduceMotion)}
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 mb-2"
            >
              Create an account
            </motion.h1>
            <motion.p
              variants={fadeUpItem(reduceMotion)}
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              Join Weartual and experience the future of digital fashion.
            </motion.p>
          </motion.div>

          <AnimatePresence>
            {error ? (
              <motion.div
                key="signup-error"
                role="alert"
                layout
                initial={reduceMotion ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: easeOut }}
                className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.form
            onSubmit={handleSignup}
            className="space-y-4"
            variants={staggerChildren(reduceMotion, 0.05)}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={fadeUpItem(reduceMotion)}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUpItem(reduceMotion)}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="hello@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </motion.div>

            <motion.div variants={fadeUpItem(reduceMotion)}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 hover:text-slate-700 text-slate-400 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={fadeUpItem(reduceMotion)}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 hover:text-slate-700 text-slate-400 transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              disabled={isSubmitting}
              variants={fadeUpItem(reduceMotion)}
              whileHover={reduceMotion || isSubmitting ? undefined : { scale: 1.01 }}
              whileTap={reduceMotion || isSubmitting ? undefined : { scale: 0.99 }}
              transition={{ type: 'spring', stiffness: 500, damping: 28 }}
              className="flex w-full mt-4 items-center justify-center rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white dark:shadow-none focus:outline-none focus:ring-4 focus:ring-slate-900/10 dark:focus:ring-white/20 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-white"></div>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </motion.button>
          </motion.form>

          <motion.div
            className="mt-8 mb-6"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.35, ease: easeOut, delay: 0.32 }
            }
          >
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white dark:bg-slate-950 px-4 text-slate-500 dark:text-slate-400 font-medium">Or continue with</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="flex justify-center"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.35, ease: easeOut, delay: 0.38 }
            }
          >
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError('Google authentication failed. Please try again.')}
              text="continue_with"
              shape="pill"
              size="large"
              width="360"
            />
          </motion.div>

          <motion.p
            className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.35, ease: easeOut, delay: 0.44 }
            }
          >
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Sign In
            </Link>
          </motion.p>
        </motion.div>
      </div>

      {/* Right Image Section */}
      <div className="hidden lg:block relative w-0 flex-1 overflow-hidden">
        <div className="absolute inset-0 bg-brand-900 mix-blend-multiply opacity-20 z-10"></div>
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src="/fashion-bg.png"
          alt="Virtual Try On Experience"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-10"></div>
        
        {/* Overlaid Content */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-12 z-20 text-white"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 0.55, ease: easeOut, delay: 0.08 }
          }
        >
          <motion.div
            className="glass-dark inline-block px-4 py-2 rounded-lg mb-4 text-xs font-bold tracking-wider uppercase text-brand-100"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.4, ease: easeOut, delay: 0.14 }
            }
          >
            Premium Experience
          </motion.div>
          <motion.h2
            className="text-4xl font-serif font-medium leading-tight mb-4"
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.45, ease: easeOut, delay: 0.2 }
            }
          >
            See it on you.<br />Before you buy.
          </motion.h2>
          <motion.p
            className="text-lg text-slate-300 max-w-md"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.45, ease: easeOut, delay: 0.26 }
            }
          >
            Our advanced AI matching technology creates a flawless virtual reflection, enabling the perfect fit every time.
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;

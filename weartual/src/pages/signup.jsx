import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { googleAuth, signup as signupRequest } from '../services/authApi';
import { Mail, Lock, EyeOff, Eye, ArrowRight, User } from 'lucide-react';

const Signup = ({ onSignup }) => {
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
  const navigate = useNavigate();

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
    <div className="min-h-screen flex w-full font-sans bg-white">
      {/* Left Form Section */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md animate-fade-in-up">
          
          <div className="mb-8 text-center sm:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-900 text-white shadow-lg shadow-brand-500/30 mb-6">
              <span className="font-serif text-2xl font-bold italic">W</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-2">
              Create an account
            </h1>
            <p className="text-sm text-slate-500">
              Join Weartual and experience the future of digital fashion.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm animate-fade-in-up">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="username">
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
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="email">
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
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">
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
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 hover:text-slate-700 text-slate-400 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="confirmPassword">
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
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-slate-900 transition-all placeholder:text-slate-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 hover:text-slate-700 text-slate-400 transition-colors focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full mt-4 items-center justify-center rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-white"></div>
              ) : (
                <>
                  Create Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-slate-500 font-medium">Or continue with</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError('Google authentication failed. Please try again.')}
              text="continue_with"
              shape="pill"
              size="large"
              width="360"
            />
          </div>

          <p className="mt-8 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
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
        <div className="absolute bottom-0 left-0 right-0 p-12 z-20 text-white animate-fade-in-up">
          <div className="glass-dark inline-block px-4 py-2 rounded-lg mb-4 text-xs font-bold tracking-wider uppercase text-brand-100">
            Premium Experience
          </div>
          <h2 className="text-4xl font-serif font-medium leading-tight mb-4">
            See it on you.<br/>Before you buy.
          </h2>
          <p className="text-lg text-slate-300 max-w-md">
            Our advanced AI matching technology creates a flawless virtual reflection, enabling the perfect fit every time.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;

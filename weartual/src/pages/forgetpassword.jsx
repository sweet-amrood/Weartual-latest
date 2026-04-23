import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword as forgotPasswordRequest } from '../services/authApi';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';

const ForgetPassword = () => {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: ''
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await forgotPasswordRequest({ email: formData.email });
      setMessage(response.message || "Check your email for password reset instructions");
      setTimeout(() => navigate('/login'), 3000);
    } catch (requestError) {
      setError(requestError.message || "Password reset request failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex w-full font-sans bg-white">
      {/* Left Form Section */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:max-w-md animate-fade-in-up">
          
          <div className="mb-10 text-center sm:text-left">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-900 text-white shadow-lg shadow-brand-500/30 mb-6">
              <span className="font-serif text-2xl font-bold italic">W</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-2">
              Forgot password?
            </h1>
            <p className="text-sm text-slate-500">
              No worries, we'll send you reset instructions.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 shadow-sm animate-fade-in-up">
              {error}
            </div>
          )}
          
          {message && (
            <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 shadow-sm animate-fade-in-up flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              {message}
            </div>
          )}

          <form onSubmit={handleResetPassword} className="space-y-5">
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full mt-2 items-center justify-center rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/10 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-white"></div>
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-sm text-slate-600">
            Remember your password?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
              Back to log in
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

export default ForgetPassword;
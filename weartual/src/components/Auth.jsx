import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, Loader2, LogOut, CheckCircle2, Shirt } from 'lucide-react';

const Auth = () => {
  const [view, setView] = useState('login'); // 'login', 'signup', 'forgot'
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  // Form States
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

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    setError('');
    // Simulate Google login
    setTimeout(() => {
      setUser({ displayName: formData.username || 'User', email: formData.email });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleSignup = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }
    if (formData.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setIsSubmitting(true);
    setError('');
    // Simulate signup
    setTimeout(() => {
      setUser({ displayName: formData.username, email: formData.email });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    // Simulate login
    setTimeout(() => {
      setUser({ displayName: 'User', email: formData.email });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    // Simulate password reset
    setTimeout(() => {
      setMessage("Check your email for password reset instructions");
      setTimeout(() => setView('login'), 3000);
      setIsSubmitting(false);
    }, 1000);
  };

  const handleLogout = () => {
    setUser(null);
    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-10 text-center">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <Shirt className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-serif font-semibold text-gray-900 mb-1">Welcome to Weartual</h2>
          <p className="text-gray-500 mb-8 text-sm">{user.displayName || user.email}</p>
          <div className="bg-gray-50 rounded-2xl p-5 mb-8 text-left text-xs font-mono text-gray-400 space-y-1">
            <p className="truncate">UID: {Math.random().toString(36).substr(2, 9)}</p>
            <p>Session: Active</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-black text-white font-medium py-3.5 px-4 rounded-xl hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Aesthetic Brand Blobs */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-zinc-100 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] left-[-5%] w-80 h-80 bg-zinc-100 rounded-full blur-3xl opacity-50" />

      <div className="max-w-[440px] w-full z-10">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center mb-4">
            <Shirt className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-black">Weartual</h1>
          <p className="text-gray-400 text-sm mt-1">Virtual Try-On Experience</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900">
              {view === 'login' && 'Sign in to your account'}
              {view === 'signup' && 'Create your account'}
              {view === 'forgot' && 'Reset your password'}
            </h2>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50/50 border border-red-100 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-6 p-4 rounded-xl bg-zinc-50 border border-zinc-100 text-zinc-900 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {message}
            </div>
          )}

          <form onSubmit={view === 'signup' ? handleSignup : view === 'login' ? handleLogin : handleResetPassword} className="space-y-5">
            {view === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    name="username"
                    type="text"
                    required
                    placeholder="Enter your name"
                    className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:ring-1 focus:ring-black focus:bg-white outline-none transition-all text-sm placeholder:text-gray-300"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="hello@example.com"
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:ring-1 focus:ring-black focus:bg-white outline-none transition-all text-sm placeholder:text-gray-300"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {view !== 'forgot' && (
              <>
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">Password</label>
                    {view === 'login' && (
                      <button 
                        type="button"
                        onClick={() => setView('forgot')}
                        className="text-xs font-bold text-black hover:underline"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:ring-1 focus:ring-black focus:bg-white outline-none transition-all text-sm placeholder:text-gray-300"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-black"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {view === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        name="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-transparent rounded-2xl focus:ring-1 focus:ring-black focus:bg-white outline-none transition-all text-sm placeholder:text-gray-300"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black hover:bg-zinc-800 text-white font-medium py-4 px-4 rounded-2xl shadow-xl shadow-zinc-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 mt-4"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span className="tracking-wide">
                    {view === 'login' ? 'Sign In' : view === 'signup' ? 'Create Account' : 'Request Link'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {view !== 'forgot' && (
            <>
              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-[0.2em]">
                  <span className="px-4 bg-white text-gray-300">Social Sign-in</span>
                </div>
              </div>

              <button
                onClick={handleGoogleLogin}
                type="button"
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-100 py-3.5 px-4 rounded-2xl hover:bg-gray-50 transition-all font-medium text-gray-700 shadow-sm"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm">Continue with Google</span>
              </button>
            </>
          )}

          <div className="mt-10 text-center text-sm">
            {view === 'login' ? (
              <p className="text-gray-400">
                New to Weartual?{' '}
                <button onClick={() => setView('signup')} className="font-bold text-black hover:underline underline-offset-4">
                  Create Account
                </button>
              </p>
            ) : (
              <p className="text-gray-400">
                Already have an account?{' '}
                <button onClick={() => setView('login')} className="font-bold text-black hover:underline underline-offset-4">
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Brand Footer */}
        <div className="mt-10 text-center">
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-300">
            &copy; 2024 Weartual Technologies Inc.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;

import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { logout as logoutRequest } from "../services/authApi";
import { LogOut, Home, Info, Mail, Menu, X, Sparkles, History, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext.jsx";

export default function Navbar({ user, onLogout }) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // best-effort
    } finally {
      onLogout?.();
      navigate("/login", { replace: true });
    }
  };

  const isAuthRoute = new Set(["/login", "/signup", "/forgot-password"]).has(location.pathname);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Link styling for a premium feel
  const navLinkClass = ({ isActive }) =>
    `relative text-sm font-medium transition-colors px-1 py-1 group ${
      isActive
        ? "text-brand-600 dark:text-brand-400"
        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
    }`;

  const navLinkIndicator = (isActive) => (
    <span 
      className={`absolute left-0 bottom-0 top-auto w-full h-[2px] bg-brand-600 transition-transform origin-left duration-300 ease-out ${
        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
      }`}
    />
  );

  return (
    <nav className="glass sticky top-0 z-50 transition-all duration-300 border-b border-transparent dark:border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!isAuthRoute && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-nav-menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            {/* Brand */}
            <NavLink to="/" className="flex items-center gap-3 transition-transform hover:scale-[1.02] active:scale-95 duration-200">
              <div className="h-9 w-9 rounded-xl bg-brand-900 shadow-md shadow-brand-900/20 text-white flex items-center justify-center font-serif text-lg font-bold italic">
                W
              </div>
              <div className="leading-tight">
                <div className="text-slate-900 dark:text-slate-100 font-serif font-bold tracking-tight text-lg">
                  Weartual
                </div>
                <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  Virtual Try-On
                </div>
              </div>
            </NavLink>
          </div>

          {/* Links & CTA */}
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white/80 text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800/80 dark:text-amber-200 dark:hover:bg-slate-700"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" strokeWidth={2} /> : <Moon className="h-5 w-5" strokeWidth={2} />}
            </button>
            {!isAuthRoute && (
              <div className="hidden md:flex items-center gap-6 mr-4">
                <NavLink to="/" className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-1.5"><Home className="w-4 h-4" /> Home</span>
                      {navLinkIndicator(isActive)}
                    </>
                  )}
                </NavLink>
                <NavLink to="/about" className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-1.5"><Info className="w-4 h-4" /> About Us</span>
                      {navLinkIndicator(isActive)}
                    </>
                  )}
                </NavLink>
                <NavLink to="/studio" className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Try-On Studio</span>
                      {navLinkIndicator(isActive)}
                    </>
                  )}
                </NavLink>
                <NavLink to="/history" className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-1.5"><History className="w-4 h-4" /> Outfit History</span>
                      {navLinkIndicator(isActive)}
                    </>
                  )}
                </NavLink>
                <NavLink to="/contact" className={navLinkClass}>
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> Contact</span>
                      {navLinkIndicator(isActive)}
                    </>
                  )}
                </NavLink>
              </div>
            )}

            {user ? (
              !isAuthRoute && (
                <div className="hidden md:flex items-center gap-3 border-l border-slate-200 dark:border-slate-600 pl-5 ml-1">
                  <NavLink
                    to="/profile"
                    title="Profile"
                    aria-label="Open profile"
                    className={({ isActive }) =>
                      `flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900 transition-shadow outline-none focus-visible:outline-none ${
                        isActive
                          ? "ring-2 ring-brand-600 ring-offset-2 ring-offset-white dark:ring-offset-slate-950 shadow-sm"
                          : "border-2 border-slate-200 dark:border-slate-600 hover:border-brand-400 hover:shadow-sm"
                      }`
                    }
                  >
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-brand-800 dark:text-brand-300">
                        {(user?.username || user?.email || "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:shadow-slate-900/10 dark:hover:bg-white transition-all hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <NavLink
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors"
                >
                  Log in
                </NavLink>
                <NavLink
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 hover:bg-brand-500 hover:-translate-y-0.5 transition-all active:translate-y-0"
                >
                  Get Started
                </NavLink>
              </div>
            )}
          </div>
        </div>

        {!isAuthRoute && mobileMenuOpen && (
          <div
            id="mobile-nav-menu"
            className="md:hidden mb-4 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur p-4 shadow-lg dark:border-slate-600 dark:bg-slate-900/95"
          >
            <div className="flex flex-col gap-2">
              <NavLink
                to="/"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Home className="w-4 h-4" /> Home
              </NavLink>
              <NavLink
                to="/about"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Info className="w-4 h-4" /> About Us
              </NavLink>
              <NavLink
                to="/studio"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Sparkles className="w-4 h-4" /> Try-On Studio
              </NavLink>
              <NavLink
                to="/contact"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Mail className="w-4 h-4" /> Contact
              </NavLink>
              <NavLink
                to="/history"
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <History className="w-4 h-4" /> Outfit History
              </NavLink>
              {user ? (
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-50 text-brand-800 dark:bg-brand-950/50 dark:text-brand-200"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 dark:border-slate-600 bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-slate-800 dark:to-slate-900">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-brand-800 dark:text-brand-300">
                        {(user.username || user.email || "?").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                  </span>
                  Profile
                </NavLink>
              ) : null}
            </div>

            <div className="mt-4 border-t border-slate-200 dark:border-slate-600 pt-4 space-y-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  <NavLink
                    to="/login"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Log in
                  </NavLink>
                  <NavLink
                    to="/signup"
                    className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500"
                  >
                    Get Started
                  </NavLink>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

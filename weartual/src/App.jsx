import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./pages/login";
import Signup from "./pages/signup";
import ForgetPassword from "./pages/forgetpassword";
import ResetPassword from "./pages/ResetPassword";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import TryOnStudio from "./pages/TryOnStudio";
import AboutUs from "./pages/AboutUs";
import Contact from "./pages/Contact";
import OutfitHistory from "./pages/OutfitHistory";
import Profile from "./pages/Profile";
import { getMe } from "./services/authApi";
import { useWeartualAppTour } from "./hooks/useWeartualAppTour";

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleSignup = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      setAuthLoading(true);
      try {
        const res = await getMe();
        if (!cancelled) setUser(res.user);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useWeartualAppTour({ pathname, navigate, user, authLoading });

  return (
    <>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/studio" element={<TryOnStudio user={user} />} />
        <Route path="/history" element={<OutfitHistory user={user} />} />
        <Route
          path="/profile"
          element={
            authLoading ? (
              <div
                id="tour-profile-root"
                className="min-h-[60vh] flex items-center justify-center text-slate-600 dark:text-slate-400"
              >
                Loading...
              </div>
            ) : user ? (
              <Profile user={user} onUserUpdated={setUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/login"
          element={
            authLoading ? (
              <div className="min-h-[60vh] flex items-center justify-center text-slate-600 dark:text-slate-400">
                Loading...
              </div>
            ) : user ? (
              <Navigate to="/" />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />
        <Route
          path="/signup"
          element={
            authLoading ? (
              <div className="min-h-[60vh] flex items-center justify-center text-slate-600 dark:text-slate-400">
                Loading...
              </div>
            ) : user ? (
              <Navigate to="/" />
            ) : (
              <Signup onSignup={handleSignup} />
            )
          }
        />
        <Route path="/forgot-password" element={<ForgetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

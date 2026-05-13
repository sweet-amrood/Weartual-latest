import { useEffect, useState, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import AnimatedRoutesLayout from "./components/AnimatedRoutesLayout";
import { getMe } from "./services/authApi";
import { getAuthenticatedUserId, tryMigrateAnonymousOutfitHistory } from "./services/outfitHistory";
import { useWeartualAppTour } from "./hooks/useWeartualAppTour";

const LandingPage = lazy(() => import("./pages/LandingPage"));
const TryOnStudio = lazy(() => import("./pages/TryOnStudio"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Contact = lazy(() => import("./pages/Contact"));
const OutfitHistory = lazy(() => import("./pages/OutfitHistory"));
const Profile = lazy(() => import("./pages/Profile"));
const Login = lazy(() => import("./pages/login"));
const Signup = lazy(() => import("./pages/signup"));
const ForgetPassword = lazy(() => import("./pages/forgetpassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

function RouteFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center text-slate-600 dark:text-slate-400">
      Loading...
    </div>
  );
}

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleLogin = (userData) => {
    tryMigrateAnonymousOutfitHistory(getAuthenticatedUserId(userData));
    setUser(userData);
  };

  const handleSignup = (userData) => {
    tryMigrateAnonymousOutfitHistory(getAuthenticatedUserId(userData));
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
        if (!cancelled) {
          tryMigrateAnonymousOutfitHistory(getAuthenticatedUserId(res.user));
          setUser(res.user);
        }
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
      <Suspense fallback={<RouteFallback />}>
        <Routes>
        <Route element={<AnimatedRoutesLayout />}>
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
        </Route>
        </Routes>
      </Suspense>
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

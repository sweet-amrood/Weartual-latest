import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login'
import Signup from './pages/signup'
import ForgetPassword from './pages/forgetpassword'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import AboutUs from './pages/AboutUs'
import Contact from './pages/Contact'
import { getMe } from './services/authApi'

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const handleLogin = (userData) => {
    setUser({ ...userData, uid: Math.random().toString(36).substr(2, 9) });
  };

  const handleSignup = (userData) => {
    setUser({ ...userData, uid: Math.random().toString(36).substr(2, 9) });
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
        // Not logged in (or backend down) - ignore.
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

  return (
    <Router>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route
          path="/login"
          element={
            authLoading ? (
              <div className="min-h-[60vh] flex items-center justify-center text-slate-600">
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
              <div className="min-h-[60vh] flex items-center justify-center text-slate-600">
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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/login'
import Signup from './pages/signup'
import ForgetPassword from './pages/forgetpassword'
import UserDashboard from './pages/UserDashboard'

export default function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (userData) => {
    setUser({ ...userData, uid: Math.random().toString(36).substr(2, 9) });
  };

  const handleSignup = (userData) => {
    setUser({ ...userData, uid: Math.random().toString(36).substr(2, 9) });
  };

  const handleLogout = () => {
    setUser(null);
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
        />
        <Route 
          path="/signup" 
          element={user ? <Navigate to="/dashboard" /> : <Signup onSignup={handleSignup} />} 
        />
        <Route 
          path="/forgot-password" 
          element={<ForgetPassword />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <UserDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/" 
          element={<Navigate to="/login" />} 
        />
      </Routes>
    </Router>
  );
}

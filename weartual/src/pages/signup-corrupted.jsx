import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Divider,
  Chip,
  Avatar,
  Fade
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Mail,
  Lock,
  Person,
  ArrowForward,
  Checkroom,
  Google
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import mockupUserService from '../mockupUser';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#ffffff',
    },
    background: {
      default: '#FDFDFD',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h3: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
});

const Signup = ({ onSignup }) => {
  const [showPassword, setShowPassword] = useState(false);
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
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create new user in mockup data
      const newUser = mockupUserService.createUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        displayName: formData.username
      });
      
      onSignup(newUser);
    } catch (error) {
      setError(error.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    setError('');
    
    // Simulate Google signup with mockup data
    setTimeout(() => {
      try {
        const email = formData.email || 'demo@gmail.com';
        const user = mockupUserService.googleAuth(email, formData.username || 'Google User');
        onSignup(user);
      } catch (error) {
        setError('Google signup failed. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }, 1000);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #FDFDFD 0%, #F8F9FA 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(156, 163, 175, 0.3) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(60px)',
            zIndex: 0,
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(156, 163, 175, 0.2) 0%, transparent 70%)',
            borderRadius: '50%',
            filter: 'blur(50px)',
            zIndex: 0,
          }
        }}
      >
        <Container maxWidth="sm" sx={{ zIndex: 1, position: 'relative' }}>
          {/* Logo Section */}
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Avatar
              sx={{
                width: 56,
                height: 56,
                bgcolor: 'primary.main',
                mx: 'auto',
                mb: 2,
                boxShadow: 3,
              }}
            >
              <Checkroom sx={{ fontSize: 28, color: 'white' }} />
            </Avatar>
            <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
              Weartual
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Virtual Try-On Experience
            </Typography>
          </Box>

          {/* Auth Card */}
          <Fade in={true} timeout={800}>
            <Paper
              elevation={0}
              sx={{
                p: 4,
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                borderRadius: 4,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              }}
            >
              <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
                Create your account
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSignup} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  fullWidth
                  label="Username"
                  name="username"
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={formData.username}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person color="action" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="Email Address"
                  name="email"
                  type="email"
                  required
                  placeholder="hello@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Mail color="action" />
                      </InputAdornment>
                    ),
                  }}
                  variant="outlined"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 3,
                    }
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                  size="large"
                  sx={{
                    py: 2,
                    borderRadius: 3,
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '1rem',
                    boxShadow: 2,
                  }}
                  endIcon={isSubmitting ? null : <ArrowForward />}
                >
                  {isSubmitting ? (
                    <CircularProgress size={24} color="inherit" />
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </Box>

              <Box sx={{ my: 4, position: 'relative' }}>
                <Divider>
                  <Chip label="Social Sign-in" size="small" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
                </Divider>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                size="large"
                sx={{
                  py: 2,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  borderColor: 'grey.300',
                  '&:hover': {
                    borderColor: 'grey.400',
                    bgcolor: 'grey.50',
                  }
                }}
                startIcon={<Google />}
              >
                Continue with Google
              </Button>

              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link to="/login" style={{ textDecoration: 'none' }}>
                    <Typography component="span" variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      Sign In
                    </Typography>
                  </Link>
                </Typography>
              </Box>
            </Paper>
          </Fade>

          {/* Brand Footer */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: 2, color: 'text.secondary' }}>
              &copy; 2024 Weartual Technologies Inc.
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default Signup;
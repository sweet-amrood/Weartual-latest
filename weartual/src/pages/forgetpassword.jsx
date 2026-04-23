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
  InputAdornment,
  Avatar,
  Fade
} from '@mui/material';
import {
  Mail,
  ArrowForward,
  CheckCircle,
  Checkroom
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { forgotPassword as forgotPasswordRequest } from '../services/authApi';

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
                Reset your password
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}
              
              {message && (
                <Alert 
                  severity="success" 
                  sx={{ mb: 3 }}
                  icon={<CheckCircle />}
                >
                  {message}
                </Alert>
              )}

              <Box component="form" onSubmit={handleResetPassword} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
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

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  disabled={isSubmitting}
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
                    'Request Link'
                  )}
                </Button>
              </Box>

              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Remember your password?{' '}
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

export default ForgetPassword;
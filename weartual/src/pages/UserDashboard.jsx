import React from 'react';
import {
  Container,
  Paper,
  Box,
  Button,
  Typography,
  Avatar,
  Fade,
  Chip
} from '@mui/material';
import {
  Logout,
  Checkroom
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#000000',
    },
    secondary: {
      main: '#ffffff',
    },
    background: {
      default: '#F9FAFB',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontFamily: '"Playfair Display", serif',
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 16,
  },
});

const UserDashboard = ({ user, onLogout }) => {
  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #F9FAFB 0%, #F3F4F6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 3,
        }}
      >
        <Container maxWidth="sm">
          <Fade in={true} timeout={800}>
            <Paper
              elevation={0}
              sx={{
                p: 5,
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                borderRadius: 4,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              }}
            >
              <Avatar
                sx={{
                  width: 80,
                  height: 80,
                  bgcolor: 'primary.main',
                  mx: 'auto',
                  mb: 3,
                  boxShadow: 4,
                  transform: 'rotate(3deg)',
                }}
              >
                <Checkroom sx={{ fontSize: 40, color: 'white' }} />
              </Avatar>
              
              <Typography variant="h4" sx={{ mb: 1, fontWeight: 600 }}>
                Welcome to Weartual
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                {user.displayName || user.email}
              </Typography>
              
              <Box
                sx={{
                  bgcolor: 'grey.50',
                  borderRadius: 3,
                  p: 3,
                  mb: 4,
                  textAlign: 'left',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                <Typography component="p" sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  UID: {user.uid || Math.random().toString(36).substr(2, 9)}
                </Typography>
                <Typography component="p">
                  Session: Active
                </Typography>
              </Box>
              
              <Button
                fullWidth
                variant="contained"
                onClick={onLogout}
                size="large"
                startIcon={<Logout />}
                sx={{
                  py: 2,
                  borderRadius: 3,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '1rem',
                  boxShadow: 3,
                }}
              >
                Sign Out
              </Button>
              
              <Box sx={{ mt: 4 }}>
                <Chip
                  label="Premium Member"
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            </Paper>
          </Fade>
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default UserDashboard;

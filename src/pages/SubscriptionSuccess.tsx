/**
 * SubscriptionSuccess.jsx - Subscription Success Page
 * 
 * Displayed after successful Stripe subscription checkout
 */

import { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Email as EmailIcon,
  CreditCard as CreditCardIcon,
  CalendarToday as CalendarIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  const { user, refreshUser } = useAuth();
  // const [searchParams] = useSearchParams();

  // const sessionId = searchParams.get('session_id');
  // const [status, setStatus] = useState('loading');
  // const [message, setMessage] = useState('Verifying your payment...');
  const navigate = useNavigate();
  const { showToast } = useToast();
  

  useEffect(() => {
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      setError('No session ID found');
      setLoading(false);
      return;
    }

    verifySession(sessionId);
  }, [searchParams]);

  const verifySession = async (sessionId) => {
    try {
      const API_URL = import.meta.env.VITE_API_SERVER_URL || 'http://localhost:5000';

      // const response = await fetch(`${API_URL}/api/subscription/verify-session?session_id=${sessionId}`);

      // const response = await fetch(`${API_URL}/api/verify-stripe-subscription?session_id=${sessionId}`);

      console.log('Verifying session with ID:', sessionId, 'for user:', user.username);

      const response = await api.post('/api/verify-stripe-subscription', {
        checkoutSessionId: sessionId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });



      // if (!response.ok) {
      //   throw new Error('Failed to verify session');
      // }

      // const data = await response.json();
      const data = response.data;

      console.log('Verification response data:', data);

      // {
      //   "sessionId": "cs_test_a1mgDItepBnIywG5wKXoBCdykCn9TOVyhiZo4dgFPbM4xM5TFjeeCGRT1M",
      //     "status": "paid",
      //       "customerEmail": "rapper@gmail.com",
      //         "amount": 500,
      //           "subscriptionId": "sub_1TuTSg3julCtRIb5zrimYUkv",
      //             "subscriptionStatus": "active"
      // }

      if (data.subscriptionStatus === 'active') {
        setSession(data);
        await refreshUser();

        // Update user's subscription status in localStorage
        const userData = JSON.parse(localStorage.getItem('userdata') || '{}');
        userData.subscription = data.subscriptionId;
        localStorage.setItem('userdata', JSON.stringify(userData));

        showToast('Subscription activated successfully!', 'success');
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError(err.message);
      showToast('Failed to verify subscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 3 }}>
          Verifying your subscription...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/subscription/plans')}
          fullWidth
        >
          Back to Plans
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box
          sx={{
            bgcolor: 'success.main',
            color: 'white',
            width: 100,
            height: 100,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 60 }} />
        </Box>

        <Typography variant="h3" gutterBottom fontWeight="bold">
          Subscription Activated!
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Welcome to premium features
        </Typography>
      </Box>

      {session && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Subscription Details
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Plan"
                  secondary={session.subscription?.planName || 'Premium Plan'}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <CreditCardIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Amount"
                  secondary={`$${(session.amount_total / 100).toFixed(2)} / ${session.subscription?.interval || 'month'}`}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <CalendarIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Next Billing Date"
                  secondary={formatDate(session.subscription?.current_period_end)}
                />
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <EmailIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Confirmation Email"
                  secondary={`Sent to ${session.customer_email}`}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      )}

      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>What's Next?</strong>
          <br />
          • Your subscription is now active
          <br />
          • Premium features are unlocked
          <br />
          • You can manage your subscription anytime in account settings
          <br />
          • A confirmation email has been sent to your email address
        </Typography>
      </Alert>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="contained"
          size="large"
          endIcon={<ArrowForwardIcon />}
          onClick={() => navigate('/')}
        >
          Start Creating
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => navigate('/account')}
        >
          View Account
        </Button>
      </Box>
    </Container>
  );
};

export default SubscriptionSuccess;

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

type SubscriptionDetails = {
  planName?: string;
  interval?: string;
  current_period_start?: number | string;
  current_period_end?: number | string;
};

type SubscriptionSession = {
  amount_total?: number;
  customer_email?: string;
  subscriptionId?: string;
  subscriptionStatus?: string;
  status?: string;
  message?: string;
  subscription?: SubscriptionDetails;
  success?: boolean;
};

type SubscriptionVerifyResponse = {
  success?: boolean;
  message?: string;
  data?: {
    sessionId?: string;
    status?: string;
    customerEmail?: string;
    amount?: number;
    subscriptionId?: string;
    subscriptionStatus?: string;
    current_period_start?: number | string;
    current_period_end?: number | string;
  };
  sessionId?: string;
  status?: string;
  customerEmail?: string;
  amount?: number;
  subscriptionId?: string;
  subscriptionStatus?: string;
  current_period_start?: number | string;
  current_period_end?: number | string;
  currentPeriodStart?: number | string;
  currentPeriodEnd?: number | string;
};

function normalizeSessionPayload(response: SubscriptionVerifyResponse): SubscriptionSession {
  const payload = (response.data || response) as SubscriptionVerifyResponse;
  const periodStart = payload.current_period_start ?? payload.currentPeriodStart;
  const periodEnd = payload.current_period_end ?? payload.currentPeriodEnd;
  return {
    success: response.success,
    message: response.message,
    status: payload.status,
    amount_total: typeof payload.amount === 'number' ? payload.amount : 0,
    customer_email: payload.customerEmail || '',
    subscriptionId: payload.subscriptionId,
    subscriptionStatus: payload.subscriptionStatus,
    subscription: {
      interval: 'month',
      current_period_start: periodStart,
      current_period_end: periodEnd,
    },
  };
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SubscriptionSession | null>(null);
  const [error, setError] = useState<string | null>(null);

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

    void verifySession(sessionId);
  }, [searchParams]);

  const verifySession = async (sessionId: string) => {
    try {
      if (!user?.id || !user?.username || !user?.email) {
        throw new Error('User session is missing. Please sign in and try again.');
      }

      // const response = await fetch(`${API_URL}/api/subscription/verify-session?session_id=${sessionId}`);

      // const response = await fetch(`${API_URL}/api/verify-stripe-subscription?session_id=${sessionId}`);

      console.log('Verifying session with ID:', sessionId, 'for user:', user.username);

      const response = await api.post<SubscriptionVerifyResponse>('/api/verify-stripe-subscription', {
        checkoutSessionId: sessionId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      });

      console.log('Subscription verify raw response:', response);

      const data = normalizeSessionPayload(response);



      // if (!response.ok) {
      //   throw new Error('Failed to verify session');
      // }

      console.log('Verification response data:', data);

      // {
      //   "sessionId": "cs_test_a1mgDItepBnIywG5wKXoBCdykCn9TOVyhiZo4dgFPbM4xM5TFjeeCGRT1M",
      //     "status": "paid",
      //       "customerEmail": "rapper@gmail.com",
      //         "amount": 500,
      //           "subscriptionId": "sub_1TuTSg3julCtRIb5zrimYUkv",
      //             "subscriptionStatus": "active"
      // }

      if (data.subscriptionStatus === 'active' || data.success === true) {
        setSession(data);
        await refreshUser();

        // Update user's subscription status in localStorage
        const userData = JSON.parse(localStorage.getItem('userdata') || '{}');
        userData.subscription = data.subscriptionId;
        localStorage.setItem('userdata', JSON.stringify(userData));

        showToast('Subscription activated successfully!', 'success');
      } else {
        throw new Error(data.message || response.message || 'Verification failed');
      }
    } catch (err: unknown) {
      console.error('Verification error:', err);
      setError(getErrorMessage(err, 'Failed to verify subscription'));
      showToast('Failed to verify subscription', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp?: number | string) => {
    if (!timestamp) return 'N/A';
    const date = typeof timestamp === 'number'
      ? new Date(timestamp * 1000)
      : new Date(timestamp);

    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleDateString('en-US', {
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

        <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
          Subscription Activated!
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Welcome to premium features
        </Typography>
      </Box>

      {session && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
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
                  secondary={`$${((session.amount_total ?? 0) / 100).toFixed(2)} / ${session.subscription?.interval || 'month'}`}
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

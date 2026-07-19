import { useEffect, useMemo, useState } from "react";
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Home,
  Receipt,
  CreditCard
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

type PurchaseVerifyResponse = {
  success?: boolean;
  pending?: boolean;
  status?: string;
  message?: string;
};

function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string'
  ) {
    return (err as { message: string }).message;
  }
  return fallback;
}

export default function PurchaseSuccessful() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();

  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('Verifying your payment...');

  const pendingPack = useMemo(() => {
    const raw = sessionStorage.getItem('stripe_pending_pack');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && Number(parsed.credits) > 0 && Number(parsed.dollars) > 0) {
        return { credits: Number(parsed.credits), dollars: Number(parsed.dollars) };
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setMessage('No checkout session was found in the URL.');
      return;
    }

    if (!user?.id || !user?.username || !user?.email) {
      setStatus('error');
      setMessage('Your account details are unavailable. Please sign in and try again.');
      return;
    }

    let cancelled = false;

    const verify = async () => {
      try {
        setStatus('loading');
        setMessage('Verifying your payment...');

        const response = await api.post<PurchaseVerifyResponse>('/api/verify-stripe-payment', {
          checkoutSessionId: sessionId,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          packageData: pendingPack
            ? {
                credits: pendingPack.credits,
                dollars: pendingPack.dollars,
                amount: pendingPack.dollars * 100,
              }
            : undefined,
        });

        if (cancelled) return;

        if (response?.success) {
          await refreshUser();
          sessionStorage.removeItem('stripe_pending_start');
          sessionStorage.removeItem('stripe_pending_pack');
          setStatus('success');
          setMessage(response?.message || 'Payment verified successfully. Credits have been applied to your account.');
          return;
        }

        if (response?.pending || response?.status === 'pending') {
          setStatus('warning');
          setMessage(response?.message || 'Payment is pending manual review. Credits will be applied once approved.');
          return;
        }

        setStatus('error');
        setMessage(response?.message || 'Payment verification could not be completed.');
      } catch (err: unknown) {
        if (cancelled) return;
        const text = getErrorMessage(err, 'Payment verification failed. Please contact support.');
        setStatus('error');
        setMessage(text);
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [sessionId, user, refreshUser, pendingPack]);

  return (
    <Container maxWidth="sm" sx={{ py: 8, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Paper
        elevation={6}
        sx={{
          p: 6,
          backgroundColor: '#1a1a1a',
          border: '3px solid #2e7d32',
          borderRadius: 4,
          textAlign: 'center'
        }}
      >
        {status === 'loading' && (
          <>
            <CircularProgress sx={{ color: '#ffd700', mb: 3 }} />
            <Typography variant="h5" sx={{ color: '#ffd700', fontWeight: 'bold', mb: 1 }}>
              Confirming Payment
            </Typography>
            <Typography variant="body1" sx={{ color: '#ccc', mb: 1 }}>
              {message}
            </Typography>
          </>
        )}

        {status === 'error' && (
          <>
            <Error sx={{ fontSize: 88, color: '#ef5350', mb: 2 }} />
            <Typography variant="h4" sx={{ color: '#ef5350', fontWeight: 'bold', mb: 2 }}>
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {message}
            </Alert>
          </>
        )}

        {(status === 'success' || status === 'warning') && (
          <>
        {/* Success Icon */}
        <Box sx={{ mb: 3 }}>
          <CheckCircle
            sx={{
              fontSize: 100,
              color: status === 'success' ? '#2e7d32' : '#f9a825',
              animation: 'pulse 2s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.1)' }
              }
            }}
          />
        </Box>

        {/* Success Message */}
        <Typography variant="h3" sx={{ color: status === 'success' ? '#2e7d32' : '#f9a825', fontWeight: 'bold', mb: 2 }}>
          {status === 'success' ? 'Payment Successful!' : 'Payment Pending Review'}
        </Typography>

        <Typography variant="h6" sx={{ color: '#ffd700', mb: 2 }}>
          {status === 'success' ? 'Thank You for Your Purchase! 🎉' : 'Your payment has been received.'}
        </Typography>

        <Typography variant="body1" sx={{ color: '#ccc', mb: 4, lineHeight: 1.8 }}>
          {message}
        </Typography>
          </>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<Home />}
            onClick={() => navigate('/dashboard')}
            sx={{
              backgroundColor: '#ffd700',
              color: '#0a0a0a',
              fontWeight: 'bold',
              py: 1.5,
              '&:hover': {
                backgroundColor: '#e6c200'
              }
            }}
          >
            Go to Dashboard
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<Receipt />}
            onClick={() => navigate('/history')}
            sx={{
              borderColor: '#2e7d32',
              color: '#2e7d32',
              py: 1.5,
              '&:hover': {
                backgroundColor: '#2e7d3220',
                borderColor: '#2e7d32'
              }
            }}
          >
            View Purchase History
          </Button>

          <Button
            variant="outlined"
            size="large"
            startIcon={<CreditCard />}
            onClick={() => navigate('/buy-credits')}
            sx={{
              borderColor: '#ffd700',
              color: '#ffd700',
              py: 1.5,
              '&:hover': {
                backgroundColor: '#ffd70020',
                borderColor: '#ffd700'
              }
            }}
          >
            Buy More Credits
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
       
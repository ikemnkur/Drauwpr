import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Crown } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface VerifyResponse {
  success: boolean;
  message?: string;
  session?: {
    customer_email: string;
    subscription: {
      planName: string;
      planId: string;
      current_period_end: number;
    };
  };
}

type Status = 'loading' | 'success' | 'error';

export default function SubscriptionCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const sessionId = searchParams.get('session_id');

  const [status, setStatus] = useState<Status>('loading');
  const [planName, setPlanName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setErrorMsg('No session ID found in URL.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    api.get<VerifyResponse>(`/api/subscription/verify-session?session_id=${encodeURIComponent(sessionId)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.success) {
          setPlanName(res.session?.subscription?.planName ?? 'Subscription');
          // Refresh auth so user.accountType updates everywhere
          await refreshUser();
          setStatus('success');
          // Auto-redirect after 3s
          setTimeout(() => { if (!cancelled) navigate('/account', { replace: true }); }, 3000);
        } else {
          setErrorMsg(res.message ?? 'Payment could not be verified.');
          setStatus('error');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err?.message ?? 'Something went wrong. Please contact support.');
        setStatus('error');
      });

    return () => { cancelled = true; };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-surface border border-surface-3 rounded-2xl p-10 max-w-md w-full text-center space-y-5 shadow-xl">

        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 text-brand mx-auto animate-spin" />
            <h2 className="text-xl font-bold text-text">Confirming your subscription…</h2>
            <p className="text-text-muted text-sm">Please wait while we verify your payment with Stripe.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-20 h-20 rounded-full bg-brand/15 animate-ping" />
              <div className="relative w-14 h-14 rounded-full bg-brand/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-brand" />
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-text">You're subscribed!</h2>
            <p className="text-text-muted text-sm">
              Welcome to <span className="text-brand font-semibold">{planName}</span>. Your credits and perks are now active.
            </p>
            <div className="flex items-center justify-center gap-2 bg-brand/10 border border-brand/30 rounded-xl px-4 py-2 text-brand text-sm font-medium">
              <Crown className="w-4 h-4" />
              {planName} plan activated
            </div>
            <p className="text-xs text-text-muted">Redirecting you to your account in a moment…</p>
            <Link
              to="/account"
              className="inline-block bg-brand hover:bg-orange-400 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm"
            >
              Go to Account
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h2 className="text-xl font-bold text-text">Verification failed</h2>
            <p className="text-text-muted text-sm">{errorMsg}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to="/plans"
                className="bg-brand hover:bg-orange-400 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
              >
                Back to Plans
              </Link>
              <Link
                to="/account"
                className="border border-surface-3 hover:border-brand/40 text-text font-semibold px-5 py-2.5 rounded-xl transition text-sm"
              >
                My Account
              </Link>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import {
  LogIn, Eye, EyeOff, ShieldCheck, KeyRound, Mail,
  Loader2, RefreshCcw, CheckCircle, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';

type Step = 'credentials' | 'email_verification' | 'totp';

interface ApiResponse {
  success?: boolean;
  message?: string;
}

function validateEmail(value: string) {
  const i = value.indexOf('@');
  return i > 0 && value.lastIndexOf('.') > i && !value.endsWith('.') && !value.endsWith('@');
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, twoFAChallenge, verifyTOTP, useRecoveryCode, isAuthenticated, googleAuth } = useAuth();

  // ── Derived initial state from URL (?email=&code=) ──
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const emailFromUrl = queryParams.get('email') || '';
  const codeFromUrl = queryParams.get('code') || '';

  const [step, setStep] = useState<Step>('credentials');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Credentials ──
  const [email, setEmail] = useState(emailFromUrl);
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // ── Email verification ──
  const [verificationCode, setVerificationCode] = useState(codeFromUrl);
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [emailStatusType, setEmailStatusType] = useState<'' | 'success' | 'error' | 'info'>('');
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);

  // ── TOTP (only if the user has 2FA enabled) ──
  const [totpCode, setTotpCode] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');

  // React to a 2FA challenge raised by the context during login()
  useEffect(() => {
    if (twoFAChallenge?.type === 'needs_totp') setStep('totp');
  }, [twoFAChallenge]);

  // Navigate away once authenticated
  useEffect(() => {
    if (isAuthenticated) navigate('/explore');
  }, [isAuthenticated, navigate]);

  // ── Credentials submit ──
  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      await login(email, password);
      // login() may: authenticate, raise a TOTP challenge (handled by effect),
      // or throw EMAIL_NOT_VERIFIED which we catch below.
    } catch (err) {
      if (err instanceof ApiError && (err.status === 403 || (err.data as { code?: string })?.code === 'EMAIL_NOT_VERIFIED')) {
        // Account exists but email isn't verified — send them to the verify step.
        setStep('email_verification');
        void handleResendCode(email);
      } else {
        setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  
  const handleGoogle = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      await googleAuth(credential);
      navigate('/explore');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  // ── Email verification ──
  const handleVerifyEmail = useCallback(async (overrideEmail?: string, overrideCode?: string) => {
    const emailVal = (overrideEmail ?? email).trim();
    const codeVal = (overrideCode ?? verificationCode).trim();

    if (!emailVal || !validateEmail(emailVal)) { setEmailStatus('Please enter a valid email.'); setEmailStatusType('error'); return; }
    if (!codeVal) { setEmailStatus('Please enter the verification code.'); setEmailStatusType('error'); return; }

    setEmailVerifying(true);
    setEmailStatus('Verifying your email...'); setEmailStatusType('info');
    try {
      const r = await api.post<ApiResponse>('/api/auth/verify-email', { email: emailVal, code: codeVal });
      if (r.success) {
        setEmailStatus('Email verified! Signing you in...'); setEmailStatusType('success');
        // Email is confirmed; complete sign-in with the password they already entered.
        if (password) {
          await login(emailVal, password);
        } else {
          window.setTimeout(() => setStep('credentials'), 800);
        }
      } else {
        setEmailStatus(r.message || 'Verification failed.'); setEmailStatusType('error');
      }
    } catch (e) {
      setEmailStatus(e instanceof ApiError ? e.message : 'Verification failed.'); setEmailStatusType('error');
    } finally {
      setEmailVerifying(false);
    }
  }, [email, verificationCode, password, login]);

  // Auto-verify when arriving from an email link
  useEffect(() => {
    if (autoVerifyAttempted || !emailFromUrl || !codeFromUrl) return;
    setAutoVerifyAttempted(true);
    setStep('email_verification');
    void handleVerifyEmail(emailFromUrl, codeFromUrl);
  }, [autoVerifyAttempted, emailFromUrl, codeFromUrl, handleVerifyEmail]);

  const handleResendCode = async (overrideEmail?: string) => {
    const emailVal = (overrideEmail ?? email).trim();
    if (!emailVal || !validateEmail(emailVal)) { setEmailStatus('Please enter a valid email.'); setEmailStatusType('error'); return; }
    setEmailSending(true);
    setEmailStatus('Sending a new code...'); setEmailStatusType('info');
    try {
      const r = await api.post<ApiResponse>('/api/auth/resend-verification', { email: emailVal });
      setEmailStatus(r.message || 'New code sent!'); setEmailStatusType('success');
    } catch (e) {
      setEmailStatus(e instanceof ApiError ? e.message : 'Failed to resend code.'); setEmailStatusType('error');
    } finally {
      setEmailSending(false);
    }
  };

  // ── TOTP ──
  const handleVerifyTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (totpCode.length !== 6) { setError('Enter the 6-digit code from your authenticator app'); return; }
    setLoading(true);
    try {
      await verifyTOTP(totpCode);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!recoveryInput.trim()) { setError('Enter a recovery code'); return; }
    setLoading(true);
    try {
      await useRecoveryCode(recoveryInput.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid recovery code.');
    } finally {
      setLoading(false);
    }
  };

  const statusStyles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-danger/10 border-danger/30 text-danger',
    info: 'bg-brand/10 border-brand/30 text-brand',
    '': 'hidden',
  } as const;

  // ── Step: credentials ──
  if (step === 'credentials') {
    return (
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center mb-8">
          <LogIn className="w-10 h-10 text-brand mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text">Welcome Back</h1>
          <p className="text-sm text-text-muted">Sign in to your Prolifer8 account</p>
        </div>
        <form onSubmit={handleCredentials} className="bg-surface-2 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-xs text-text-muted mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com"
              className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand pr-10" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-surface-3" />
            <span className="text-xs text-text-muted">or</span>
            <div className="flex-1 h-px bg-surface-3" />
          </div>

          <GoogleSignInButton onCredential={handleGoogle} />

          <div className="text-xs text-text-muted text-center space-y-1">
            <p>Don&apos;t have an account?{' '}<Link to="/register" className="text-brand hover:underline">Register</Link></p>
            <p><Link to="/forgot-password" className="text-brand hover:underline">Forgot password?</Link></p>
          </div>
        </form>
      </div>
    );
  }

  // ── Step: email verification ──
  if (step === 'email_verification') {
    return (
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center mb-8">
          <Mail className="w-10 h-10 text-brand mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text">Verify Your Email</h1>
          <p className="text-sm text-text-muted">Enter the code we sent to {email || 'your email'}</p>
        </div>
        <div className="bg-surface-2 rounded-2xl p-6 space-y-4">
          {emailStatus && (
            <div className={`border rounded-xl px-3 py-2.5 text-sm flex items-start gap-2 ${statusStyles[emailStatusType]}`}>
              {emailStatusType === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                : emailStatusType === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  : <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />}
              <span>{emailStatus}</span>
            </div>
          )}
          <div>
            <label className="block text-xs text-text-muted mb-1">Verification Code</label>
            <input
              type="text" inputMode="numeric" value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.trim())}
              disabled={emailVerifying}
              placeholder="Enter the code from your email"
              className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-70"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleVerifyEmail()}
            disabled={emailVerifying}
            className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {emailVerifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify Email'}
          </button>
          <button
            type="button"
            onClick={() => void handleResendCode()}
            disabled={emailSending || emailVerifying}
            className="w-full py-2.5 rounded-lg bg-surface-3 text-text font-medium text-sm hover:bg-surface transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {emailSending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><RefreshCcw className="w-4 h-4" /> Resend Code</>}
          </button>
          <button type="button" onClick={() => setStep('credentials')} className="w-full text-xs text-text-muted hover:text-brand text-center">
            Back to sign in
          </button>
          <p className="text-xs text-text-muted text-center">Check your inbox and spam folder.</p>
        </div>
      </div>
    );
  }

  // ── Step: TOTP (only reached if the account has 2FA enabled) ──
  if (step === 'totp') {
    return (
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center mb-8">
          <ShieldCheck className="w-10 h-10 text-brand mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text">Two-Factor Auth</h1>
          <p className="text-sm text-text-muted">Enter the code from your authenticator app</p>
        </div>
        <div className="bg-surface-2 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          {!showRecovery ? (
            <form onSubmit={handleVerifyTOTP} className="space-y-4">
              <input type="text" inputMode="numeric" maxLength={6} value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" autoFocus
                className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-3 text-xl text-center tracking-widest text-text font-mono focus:outline-none focus:border-brand" />
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
                {loading ? 'Verifying…' : 'Verify'}
              </button>
              <button type="button" onClick={() => setShowRecovery(true)}
                className="w-full text-xs text-text-muted hover:text-brand text-center">
                Use a recovery code instead
              </button>
            </form>
          ) : (
            <form onSubmit={handleUseRecovery} className="space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1">Recovery Code</label>
                <input type="text" value={recoveryInput} onChange={(e) => setRecoveryInput(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX-XXXX" autoFocus
                  className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm font-mono text-text focus:outline-none focus:border-brand" />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
                {loading ? 'Verifying…' : 'Use Recovery Code'}
              </button>
              <button type="button" onClick={() => setShowRecovery(false)}
                className="w-full text-xs text-text-muted hover:text-brand text-center">
                Back to authenticator code
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return null;
}
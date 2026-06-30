import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { UserPlus, Mail, Loader2, RefreshCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';

type Step = 'form' | 'email_verification';

interface ApiResponse {
  success?: boolean;
  message?: string;
}

export default function Register() {
  const navigate = useNavigate();
  // const { register, login } = useAuth();

  const [step, setStep] = useState<Step>('form');

  // ── Form ──
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Email verification ──
  const [verificationCode, setVerificationCode] = useState('');
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [emailStatusType, setEmailStatusType] = useState<'' | 'success' | 'error' | 'info'>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password);
      // Server creates the account and emails a verification code.
      // Move to the verify step instead of forcing 2FA setup.
      setStep('email_verification');
      setEmailStatus('We sent a verification code to your email.');
      setEmailStatusType('info');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // add googleAuth to the destructure
  const { register, login, googleAuth } = useAuth();

  // add this handler alongside handleSubmit
  const handleGoogle = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      await googleAuth(credential);   // creates-or-signs-in, persists session
      navigate('/explore');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    const codeVal = verificationCode.trim();
    if (!codeVal) { setEmailStatus('Please enter the verification code.'); setEmailStatusType('error'); return; }
    setEmailVerifying(true);
    setEmailStatus('Verifying your email...'); setEmailStatusType('info');
    try {
      const r = await api.post<ApiResponse>('/api/auth/verify-email', { email: email.trim(), code: codeVal });
      if (r.success) {
        setEmailStatus('Email verified! Signing you in...'); setEmailStatusType('success');
        // Complete sign-in with the credentials we already have.
        try {
          await login(email.trim(), password);
          navigate('/explore');
        } catch {
          // If auto-login fails for any reason, fall back to the login page.
          navigate('/login');
        }
      } else {
        setEmailStatus(r.message || 'Verification failed.'); setEmailStatusType('error');
      }
    } catch (e) {
      setEmailStatus(e instanceof ApiError ? e.message : 'Verification failed.'); setEmailStatusType('error');
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setEmailSending(true);
    setEmailStatus('Sending a new code...'); setEmailStatusType('info');
    try {
      const r = await api.post<ApiResponse>('/api/auth/resend-verification', { email: email.trim() });
      setEmailStatus(r.message || 'New code sent!'); setEmailStatusType('success');
      setVerificationCode('');
    } catch (e) {
      setEmailStatus(e instanceof ApiError ? e.message : 'Failed to resend code.'); setEmailStatusType('error');
    } finally {
      setEmailSending(false);
    }
  };

  const statusStyles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-danger/10 border-danger/30 text-danger',
    info: 'bg-brand/10 border-brand/30 text-brand',
    '': 'hidden',
  } as const;

  // ── Step: email verification ──
  if (step === 'email_verification') {
    return (
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center mb-8">
          <Mail className="w-10 h-10 text-brand mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text">Verify Your Email</h1>
          <p className="text-sm text-text-muted">Enter the code we sent to {email}</p>
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
          <p className="text-xs text-text-muted text-center">
            You can set up two-factor authentication later in Account Settings.
          </p>
        </div>
      </div>
    );
  }

  // ── Step: form ──
  return (
    <div className="max-w-sm mx-auto py-12">
      <div className="text-center mb-8">
        <UserPlus className="w-10 h-10 text-brand mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-text">Create Account</h1>
        <p className="text-sm text-text-muted">Join Prolifer8 and start dropping</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-2 rounded-2xl p-6 space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs text-text-muted mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="cooluser42"
            className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-1">Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating Account…' : 'Create Account'}
        </button>

        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-surface-3" />
          <span className="text-xs text-text-muted">or</span>
          <div className="flex-1 h-px bg-surface-3" />
        </div>
        <GoogleSignInButton onCredential={handleGoogle} />

        <p className="text-xs text-text-muted text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:underline">Sign In</Link>
        </p>
      </form>
    </div>
  );
}
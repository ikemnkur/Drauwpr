import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, ShieldCheck, KeyRound, QrCode, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

type Step = 'credentials' | 'totp' | 'setup_qr' | 'setup_confirm' | 'recovery_codes';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('credentials');

  // TOTP verify state
  const [totpCode, setTotpCode] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState('');

  // Setup state
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const { login, twoFAChallenge, setup2FA, enable2FA, verifyTOTP, useRecoveryCode } = useAuth();
  const navigate = useNavigate();

  // React to context challenge state changes
  useEffect(() => {
    if (!twoFAChallenge || step !== 'credentials') return;
    if (twoFAChallenge.type === 'needs_totp') {
      setStep('totp');
    } else if (twoFAChallenge.type === 'needs_setup') {
      setStep('setup_qr');
    }
  }, [twoFAChallenge, step]);

  // When the app becomes authenticated, navigate away
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (isAuthenticated) navigate('/explore');
  }, [isAuthenticated, navigate]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      await login(email, password);
      // navigation handled by the isAuthenticated effect or the twoFAChallenge effect
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadQR = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await setup2FA();
      setQrUrl(result.qrUrl);
      setSecret(result.secret);
      setStep('setup_confirm');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (setupCode.length !== 6) { setError('Enter the 6-digit code from your authenticator app'); return; }
    setLoading(true);
    try {
      const result = await enable2FA(setupCode);
      setRecoveryCodes(result.recoveryCodes);
      setStep('recovery_codes');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Step: credentials ────────────────────────────────────────────────────
  if (step === 'credentials') {
    return (
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center mb-8">
          <LogIn className="w-10 h-10 text-brand mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text">Welcome Back</h1>
          <p className="text-sm text-text-muted">Sign in to your Drauwper account</p>
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
          <div className="text-xs text-text-muted text-center space-y-1">
            <p>Don&apos;t have an account?{' '}<Link to="/register" className="text-brand hover:underline">Register</Link></p>
            <p><Link to="/forgot-password" className="text-brand hover:underline">Forgot password?</Link></p>
          </div>
        </form>
      </div>
    );
  }

  // ── Step: TOTP verify ────────────────────────────────────────────────────
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

  // ── Step: 2FA setup — scan QR ─────────────────────────────────────────────
  if (step === 'setup_qr') {
    return (
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center mb-8">
          <QrCode className="w-10 h-10 text-brand mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text">Set Up 2FA</h1>
          <p className="text-sm text-text-muted">Your account requires two-factor authentication</p>
        </div>
        <div className="bg-surface-2 rounded-2xl p-6 space-y-4 text-center">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          <p className="text-sm text-text-muted">
            Download <strong className="text-text">Google Authenticator</strong> or <strong className="text-text">Authy</strong>, then tap the button below to get your QR code.
          </p>
          <button onClick={handleLoadQR} disabled={loading}
            className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
            {loading ? 'Generating QR…' : 'Generate QR Code'}
          </button>
        </div>
      </div>
    );
  }

  // ── Step: 2FA setup — confirm code ───────────────────────────────────────
  if (step === 'setup_confirm') {
    return (
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center mb-8">
          <QrCode className="w-10 h-10 text-brand mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text">Scan QR Code</h1>
          <p className="text-sm text-text-muted">Scan with your authenticator app, then confirm</p>
        </div>
        <div className="bg-surface-2 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">{error}</div>
          )}
          {qrUrl && (
            <div className="flex justify-center">
              <img src={qrUrl} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
            </div>
          )}
          <details className="text-xs text-text-muted">
            <summary className="cursor-pointer hover:text-brand">Can&apos;t scan? Enter manually</summary>
            <p className="mt-1 font-mono bg-surface-3 rounded px-2 py-1 break-all select-all">{secret}</p>
          </details>
          <form onSubmit={handleEnable} className="space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Confirm — enter 6-digit code</label>
              <input type="text" inputMode="numeric" maxLength={6} value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" autoFocus
                className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-3 text-xl text-center tracking-widest text-text font-mono focus:outline-none focus:border-brand" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50">
              {loading ? 'Activating…' : 'Activate 2FA'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Step: recovery codes ─────────────────────────────────────────────────
  if (step === 'recovery_codes') {
    return (
      <div className="max-w-sm mx-auto py-12">
        <div className="text-center mb-8">
          <KeyRound className="w-10 h-10 text-brand mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-text">Save Recovery Codes</h1>
          <p className="text-sm text-text-muted">Store these somewhere safe — each can only be used once</p>
        </div>
        <div className="bg-surface-2 rounded-2xl p-6 space-y-4">
          <div className="bg-surface-3 rounded-lg p-3 space-y-1">
            {recoveryCodes.map((c) => (
              <p key={c} className="font-mono text-sm text-text tracking-wider">{c}</p>
            ))}
          </div>
          <button onClick={copyRecoveryCodes}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-surface-3 text-sm text-text-muted hover:text-text hover:border-brand transition-colors">
            {copied ? <><Check className="w-4 h-4 text-success" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy All</>}
          </button>
          <p className="text-xs text-text-muted text-center">
            2FA is now active on your account. You will be redirected shortly.
          </p>
        </div>
      </div>
    );
  }

  return null;
}


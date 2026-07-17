import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ShieldCheck, Camera, Upload, CreditCard, ArrowLeft, Smartphone,
  CheckCircle, AlertCircle, Loader2, QrCode, CheckCircle2, Copy, Check,
  Mail,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ─── Types ─────────────────────────────────────────────────────────────────

type TaskId = 'email' | 'phone' | 'docs' | 'payment';
type Chain = 'BTC' | 'ETH' | 'LTC' | 'SOL';

interface CryptoAmounts {
  BTC: { amount1: string; amount2: string };
  ETH: { amount1: string; amount2: string };
  LTC: { amount1: string; amount2: string };
  SOL: { amount1: string; amount2: string };
}

interface VerificationData {
  verification: string;
  amount1: number;
  amount2: number;
  cryptoAmounts: CryptoAmounts | string;
  emailVerified?: boolean;
  phoneNumber?: string;
  phoneVerified?: boolean;
  docsUploaded?: boolean;
  paymentVerified?: boolean;
}

interface ApiResponse {
  success: boolean;
  message?: string;
}

const CHAIN_LABELS: Record<Chain, string> = {
  BTC: 'Bitcoin', ETH: 'Ethereum', LTC: 'Litecoin', SOL: 'Solana',
};

const CURRENCIES = [
  { symbol: 'BTC', name: 'Bitcoin', address: 'bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6' },
  { symbol: 'ETH', name: 'Ethereum', address: '0x9a61f30347258A3D03228F363b07692F3CBb7f27' },
  { symbol: 'LTC', name: 'Litecoin', address: 'ltc1qgg5aggedmvjx0grd2k5shg6jvkdzt9dtcqa4dh' },
  { symbol: 'SOL', name: 'Solana', address: 'qaSpvAumg2L3LLZA8qznFtbrRKYMP1neTGqpNgtCPaU' },
];

const TASKS: { id: TaskId; label: string; icon: typeof Camera }[] = [
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'phone', label: 'Phone', icon: Smartphone },
  { id: 'docs', label: 'Upload ID', icon: Camera },
  { id: 'payment', label: 'Crypto', icon: CreditCard },
];

function validateEmail(value: string) {
  const i = value.indexOf('@');
  return i > 0 && value.lastIndexOf('.') > i && !value.endsWith('.') && !value.endsWith('@');
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function Verification() {
  const { user, refreshUser } = useAuth();
  const location = useLocation();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const taskFromUrl = (queryParams.get('task') as TaskId | null) || null;
  const emailFromUrl = queryParams.get('email') || '';
  const codeFromUrl = queryParams.get('code') || '';

  // ── Shared state ──
  const [active, setActive] = useState<TaskId>(taskFromUrl || 'email');
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Independent completion flags (no forced order) ──
  const [email, setEmail] = useState(emailFromUrl || user?.email || '');
  const [verificationCode, setVerificationCode] = useState(codeFromUrl || '');
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');
  const [emailStatusType, setEmailStatusType] = useState<'' | 'success' | 'error' | 'info'>('');
  const [autoVerifyAttempted, setAutoVerifyAttempted] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [docsUploaded, setDocsUploaded] = useState(false);
  const [paymentVerified, setPaymentVerified] = useState(false);

  // ── Phone/SMS ──
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [smsBusy, setSmsBusy] = useState(false);
  const [smsStatus, setSmsStatus] = useState('');
  const [smsStatusType, setSmsStatusType] = useState<'' | 'success' | 'error' | 'info'>('');

  // ── Doc upload ──
  const [facePic, setFacePic] = useState<File | null>(null);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const facePicRef = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);

  // ── Crypto payment ──
  const [walletAddress, setWalletAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [txHash2, setTxHash2] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [currencyIdx, setCurrencyIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const currency = CURRENCIES[currencyIdx];
  const chain = currency.symbol as Chain;

  const allDone = emailVerified && phoneVerified && docsUploaded && paymentVerified;

  // ── Fetch verification state on mount ──
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      api.post<{ user: VerificationData }>('/api/user', { email: user.email }),
      api.post<{ verified: boolean }>('/api/auth/email-verification-status', { email: user.email }),
      api.post<{ verified: boolean }>('/api/auth/phone-verification-status', { email: user.email, userId: user.id }),
    ])
      .then(([res, emailState, phoneState]) => {
        const u = res.user as unknown as Record<string, unknown>;
        const data: VerificationData = {
          verification: (u.verification as string) || 'none',
          amount1: Number(u.amount1) || 0,
          amount2: Number(u.amount2) || 0,
          cryptoAmounts: (u.cryptoAmounts as CryptoAmounts | string) || '',
          phoneNumber: (u.phoneNumber as string) || '',
          emailVerified: !!emailState.verified,
          phoneVerified: !!phoneState.verified || Boolean(u.phoneVerified),
          docsUploaded: Boolean(u.docsUploaded),
          paymentVerified: Boolean(u.paymentVerified),
        };
        setVerificationData(data);
        if (data.phoneNumber) setPhone(data.phoneNumber);

        // Hydrate independent flags from server
        setEmailVerified(!!data.emailVerified);
        setPhoneVerified(!!data.phoneVerified);
        setDocsUploaded(!!data.docsUploaded);
        setPaymentVerified(!!data.paymentVerified);
      })
      .catch(() => setError('Failed to load verification data'))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (!email && user?.email) setEmail(user.email);
  }, [email, user]);

  const handleVerifyEmail = useCallback(async (overrideEmail?: string, overrideCode?: string) => {
    const emailVal = (overrideEmail ?? email).trim();
    const codeVal = (overrideCode ?? verificationCode).trim();

    if (!emailVal) { setEmailStatus('Please enter your email address.'); setEmailStatusType('error'); return; }
    if (!validateEmail(emailVal)) { setEmailStatus('Please enter a valid email address.'); setEmailStatusType('error'); return; }
    if (!codeVal) { setEmailStatus('Please enter the verification code.'); setEmailStatusType('error'); return; }

    setEmailVerifying(true);
    setEmailStatus('Verifying your email...');
    setEmailStatusType('info');

    try {
      const r = await api.post<ApiResponse>('/api/auth/verify-email', { email: emailVal, code: codeVal });
      if (r.success) {
        setEmailVerified(true);
        setEmailStatus('Email verified!');
        setEmailStatusType('success');
        if (user) await refreshUser();
      } else {
        setEmailStatus(r.message || 'Verification failed.');
        setEmailStatusType('error');
      }
    } catch (e) {
      setEmailStatus(e instanceof ApiError ? e.message : 'Verification failed.');
      setEmailStatusType('error');
    } finally {
      setEmailVerifying(false);
    }
  }, [email, verificationCode, refreshUser, user]);

  useEffect(() => {
    if (autoVerifyAttempted || emailVerified || !emailFromUrl || !codeFromUrl || loading) return;
    setAutoVerifyAttempted(true);
    void handleVerifyEmail(emailFromUrl, codeFromUrl);
  }, [autoVerifyAttempted, codeFromUrl, emailFromUrl, handleVerifyEmail, emailVerified, loading]);

  const handleResendCode = useCallback(async () => {
    const emailVal = email.trim();
    if (!emailVal || !validateEmail(emailVal)) { setEmailStatus('Please enter a valid email.'); setEmailStatusType('error'); return; }
    setEmailSending(true);
    setEmailStatus('Sending a new code...');
    setEmailStatusType('info');
    try {
      const r = await api.post<ApiResponse>('/api/auth/resend-verification', { email: emailVal });
      setEmailStatus(r.message || 'New code sent!');
      setEmailStatusType('success');
      setVerificationCode('');
    } catch (e) {
      setEmailStatus(e instanceof ApiError ? e.message : 'Failed to resend code.');
      setEmailStatusType('error');
    } finally {
      setEmailSending(false);
    }
  }, [email]);

  const parsedCrypto = (() => {
    if (!verificationData) return null;
    const raw = verificationData.cryptoAmounts;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) as CryptoAmounts; } catch { return null; }
    }
    return raw;
  })();

  // ── Phone handlers ──
  const sendOtp = useCallback(async () => {
    if (!phone.trim()) { setSmsStatus('Enter a phone number.'); setSmsStatusType('error'); return; }
    setSmsBusy(true);
    setSmsStatus('Sending code...'); setSmsStatusType('info');
    try {
      await api.post('/api/account/phone/send-otp', { phoneNumber: phone.trim() });
      setOtpSent(true);
      setSmsStatus('Code sent. Check your messages.'); setSmsStatusType('success');
    } catch (e) {
      setSmsStatus(e instanceof ApiError ? e.message : 'Could not send code.'); setSmsStatusType('error');
    } finally {
      setSmsBusy(false);
    }
  }, [phone, user]);

  const verifyOtp = useCallback(async () => {
    if (otp.length !== 6) { setSmsStatus('Enter the 6-digit code.'); setSmsStatusType('error'); return; }
    setSmsBusy(true);
    setSmsStatus('Verifying...'); setSmsStatusType('info');
    try {
      await api.post('/api/account/phone/verify-otp', { phoneNumber: phone.trim(), code: otp });
      setPhoneVerified(true);
      setOtpSent(false);
      setSmsStatus('Phone verified!'); setSmsStatusType('success');
      if (user) await refreshUser();
    } catch (e) {
      setSmsStatus(e instanceof ApiError ? e.message : 'Invalid code.'); setSmsStatusType('error');
    } finally {
      setSmsBusy(false);
    }
  }, [otp, phone, user, refreshUser]);

  // ── Doc handler ──
  const handleUploadDocs = async () => {
    if (!facePic || !idPhoto || !user) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('facePic', facePic);
      form.append('idPhoto', idPhoto);
      await api.upload('/api/auth/verification-docs/' + encodeURIComponent(user.username), form);
      setDocsUploaded(true);
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // ── Payment handlers ──
  const handleCopy = () => {
    navigator.clipboard.writeText(currency.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleVerifyPayment = async () => {
    if (!user || !txHash.trim() || !txHash2.trim() || !walletAddress.trim()) return;
    setVerifying(true);
    setError('');
    try {
      await api.post('/api/auth/verify-account', {
        email: user.email,
        username: user.username,
        chain,
        address: walletAddress.trim(),
        transactionId: txHash.trim(),
        transactionId2: txHash2.trim(),
      });
      setPaymentVerified(true);
      await refreshUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed — amounts may not match');
    } finally {
      setVerifying(false);
    }
  };

  const statusStyles = {
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
    error: 'bg-danger/10 border-danger/30 text-danger',
    info: 'bg-brand/10 border-brand/30 text-brand',
    '': 'hidden',
  } as const;

  const isDone = (id: TaskId) =>
    id === 'email' ? emailVerified : id === 'phone' ? phoneVerified : id === 'docs' ? docsUploaded : paymentVerified;

  const completedCount = [emailVerified, phoneVerified, docsUploaded, paymentVerified].filter(Boolean).length;

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── All complete ──
  if (allDone) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <ShieldCheck className="w-16 h-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold text-text">Account Verified</h1>
        <p className="text-text-muted text-sm">Your identity has been fully confirmed. </p>
        <Link to="/account" className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-colors no-underline">
          Back to Account
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <Link to="/account" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition no-underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Account
      </Link>

      <h1 className="text-2xl font-bold text-text flex items-center gap-2 mb-2">
        <ShieldCheck className="w-6 h-6 text-brand" />
        Account Verification
      </h1>
      <p className="text-sm text-text-muted mb-8">
        Complete the steps below in any order to verify your account and unlock credit redemption.
      </p>

      {/* ── Task switcher (tabs, not a forced sequence) ── */}
      <div className="flex items-center gap-2 mb-8">
        {TASKS.map((t) => {
          const done = isDone(t.id);
          const isActive = active === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                isActive ? 'bg-brand text-white'
                  : done ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                  : 'bg-surface-2 text-text-muted hover:text-text'
              }`}
            >
              {done ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Global error ── */}
      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 mb-6 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      {/* ━━━ TASK — Email verification ━━━ */}
      {active === 'email' && (
        <div className="bg-surface-2 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-text font-semibold mb-1 flex items-center gap-2">
              Verify Your Email
              {emailVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
            </h3>
            <p className="text-xs text-text-muted">
              Enter the verification code sent to your inbox.
            </p>
          </div>

          {emailStatus && (
            <div className={`border rounded-xl px-3 py-2.5 text-sm flex items-start gap-2 ${statusStyles[emailStatusType]}`}>
              {emailStatusType === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                : emailStatusType === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                : <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />}
              <span>{emailStatus}</span>
            </div>
          )}

          <div>
            <label className="text-sm text-text-muted block mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={emailVerified || emailVerifying}
              placeholder="you@example.com"
              className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-70"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted block mb-1">Verification Code</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.trim())}
              disabled={emailVerified || emailVerifying}
              placeholder="Enter the code from your email"
              className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-brand disabled:opacity-70"
            />
          </div>

          {!emailVerified && (
            <button
              type="button"
              onClick={() => void handleVerifyEmail()}
              disabled={emailVerifying}
              className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {emailVerifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : <><Mail className="w-4 h-4" /> Verify Email</>}
            </button>
          )}

          {!emailVerified && (
            <button
              type="button"
              onClick={() => void handleResendCode()}
              disabled={emailSending || emailVerifying}
              className="w-full py-2.5 rounded-xl bg-surface-3 text-text font-medium text-sm hover:bg-surface transition-colors disabled:opacity-50"
            >
              {emailSending ? 'Sending...' : 'Resend Code'}
            </button>
          )}

          {emailVerified && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <Check className="w-4 h-4" /> Email verified.
            </div>
          )}
        </div>
      )}

      {/* ━━━ TASK — Phone / SMS verification ━━━ */}
      {active === 'phone' && (
        <div className="bg-surface-2 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="text-text font-semibold mb-1 flex items-center gap-2">
              Verify Your Phone
              {phoneVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
            </h3>
            <p className="text-xs text-text-muted">
              We'll send a one-time code by SMS to confirm your number.
            </p>
          </div>

          {smsStatus && (
            <div className={`border rounded-xl px-3 py-2.5 text-sm flex items-start gap-2 ${statusStyles[smsStatusType]}`}>
              {smsStatusType === 'success' ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                : smsStatusType === 'error' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                : <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />}
              <span>{smsStatus}</span>
            </div>
          )}

          <div>
            <label className="text-sm text-text-muted block mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={phoneVerified}
              placeholder="+1 555 123 4567"
              className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-70"
            />
          </div>

          {otpSent && !phoneVerified && (
            <div>
              <label className="text-sm text-text-muted block mb-1">Verification Code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-3 text-lg text-center tracking-widest text-text font-mono focus:outline-none focus:border-brand"
              />
            </div>
          )}

          {!phoneVerified && (
            <button
              type="button"
              onClick={() => (otpSent ? void verifyOtp() : void sendOtp())}
              disabled={smsBusy}
              className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {smsBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Working...</>
                : otpSent ? 'Verify Code' : <><Smartphone className="w-4 h-4" /> Send Code</>}
            </button>
          )}

          {otpSent && !phoneVerified && (
            <button type="button" onClick={() => void sendOtp()} disabled={smsBusy}
              className="w-full py-2.5 rounded-xl bg-surface-3 text-text font-medium text-sm hover:bg-surface transition-colors disabled:opacity-50">
              Resend Code
            </button>
          )}

          {phoneVerified && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <Check className="w-4 h-4" /> Phone number verified.
            </div>
          )}
        </div>
      )}

      {/* ━━━ TASK — Document Upload ━━━ */}
      {active === 'docs' && (
        <div className="bg-surface-2 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-text font-semibold mb-1 flex items-center gap-2">
              Upload Identification
              {docsUploaded && <CheckCircle className="w-4 h-4 text-green-500" />}
            </h3>
            <p className="text-xs text-text-muted">
              Upload a clear face photo and a government-issued ID. Files are stored temporarily and
              deleted immediately after manual review.
            </p>
          </div>

          {/* Face pic */}
          <div>
            <label className="text-sm text-text-muted block mb-2">Face Photo</label>
            <input ref={facePicRef} type="file" accept="image/*" className="hidden" onChange={(e) => setFacePic(e.target.files?.[0] || null)} />
            <button
              type="button"
              onClick={() => facePicRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                facePic ? 'border-green-500/50 bg-green-500/5' : 'border-surface-3 hover:border-brand'
              }`}
            >
              {facePic ? (
                <div className="flex items-center justify-center gap-2 text-green-500 text-sm">
                  <CheckCircle className="w-5 h-5" />
                  {facePic.name}
                </div>
              ) : (
                <div className="text-text-muted">
                  <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click to select face photo</p>
                </div>
              )}
            </button>
          </div>

          {/* ID photo */}
          <div>
            <label className="text-sm text-text-muted block mb-2">Government ID</label>
            <input ref={idPhotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => setIdPhoto(e.target.files?.[0] || null)} />
            <button
              type="button"
              onClick={() => idPhotoRef.current?.click()}
              className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                idPhoto ? 'border-green-500/50 bg-green-500/5' : 'border-surface-3 hover:border-brand'
              }`}
            >
              {idPhoto ? (
                <div className="flex items-center justify-center gap-2 text-green-500 text-sm">
                  <CheckCircle className="w-5 h-5" />
                  {idPhoto.name}
                </div>
              ) : (
                <div className="text-text-muted">
                  <Upload className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click to select ID photo</p>
                </div>
              )}
            </button>
          </div>

          <button
            onClick={handleUploadDocs}
            disabled={!facePic || !idPhoto || uploading || docsUploaded}
            className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
              : docsUploaded ? <><CheckCircle className="w-4 h-4" /> Uploaded</>
              : <><Upload className="w-4 h-4" /> Upload Documents</>}
          </button>
        </div>
      )}

      {/* ━━━ TASK — Crypto Micropayment ━━━ */}
      {active === 'payment' && (
        <div className="bg-surface-2 rounded-2xl p-6 space-y-6">
          <div>
            <h3 className="text-text font-semibold mb-1 flex items-center gap-2">
              Micro-Payment Verification
              {paymentVerified && <CheckCircle className="w-4 h-4 text-green-500" />}
            </h3>
            <p className="text-xs text-text-muted">
              Send <strong>two</strong> small transactions (each under $0.20) to the Drauwper address below. The exact amounts
              must match to verify your identity.
            </p>
          </div>

          {/* Amounts */}
          {verificationData && (
            <div className="bg-surface-3 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted">Payment 1</span>
                <span className="font-mono font-bold text-brand">${verificationData.amount1.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-muted">Payment 2</span>
                <span className="font-mono font-bold text-brand">${verificationData.amount2.toFixed(2)} USD</span>
              </div>

              {parsedCrypto && (
                <div className="pt-2 border-t border-surface-2 space-y-1">
                  <p className="text-xs text-text-muted mb-1">Equivalent in {CHAIN_LABELS[chain]}:</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Amount 1</span>
                    <span className="font-mono text-text">{parsedCrypto[chain].amount1} {chain}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-text-muted">Amount 2</span>
                    <span className="font-mono text-text">{parsedCrypto[chain].amount2} {chain}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chain select */}
          <div>
            <p className="text-sm text-text-muted mb-2">Payment Chain</p>
            <div className="grid grid-cols-4 gap-2">
              {CURRENCIES.map((c, i) => (
                <button
                  key={c.symbol}
                  type="button"
                  onClick={() => setCurrencyIdx(i)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                    currencyIdx === i ? 'bg-brand text-white' : 'bg-surface-3 text-text-muted hover:text-text'
                  }`}
                >
                  {c.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet address to send to */}
          <div className="bg-surface-3 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-text-muted">Send to this {currency.symbol} address</p>
              <button
                onClick={() => setShowQr((v) => !v)}
                className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${
                  showQr ? 'bg-brand/20 text-brand' : 'bg-surface-2 text-text-muted hover:text-text'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                QR
              </button>
            </div>

            {showQr && (
              <div className="flex justify-center mb-3">
                <div className="bg-white p-3 rounded-xl">
                  <QRCodeSVG value={currency.address} size={160} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-surface-2 rounded-xl px-3 py-3">
              <p className="flex-1 text-xs font-mono text-text break-all">{currency.address}</p>
              <button
                onClick={handleCopy}
                className="shrink-0 p-1.5 rounded-lg bg-surface-3 hover:bg-brand/20 text-text-muted hover:text-brand transition-colors"
                title="Copy address"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            {copied && <p className="text-xs text-green-400 mt-1">Address copied!</p>}
          </div>

          {/* User's wallet address */}
          <div>
            <label className="text-sm text-text-muted block mb-1">Your {CHAIN_LABELS[chain]} Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={`Enter your ${chain} address`}
              className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-brand"
            />
          </div>

          {/* Transaction hash 1 */}
          <div>
            <label className="text-sm text-text-muted block mb-1">Transaction Hash 1</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="Paste the transaction hash after sending"
              className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-brand"
            />
          </div>

          {/* Transaction hash 2 */}
          <div>
            <label className="text-sm text-text-muted block mb-1">Transaction Hash 2</label>
            <input
              type="text"
              value={txHash2}
              onChange={(e) => setTxHash2(e.target.value)}
              placeholder="Paste the transaction hash after sending"
              className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-brand"
            />
          </div>

          <button
            onClick={handleVerifyPayment}
            disabled={!walletAddress.trim() || !txHash.trim() || !txHash2.trim() || verifying || paymentVerified}
            className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {verifying ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying…</>
              : paymentVerified ? <><CheckCircle className="w-4 h-4" /> Verified</>
              : <><ShieldCheck className="w-4 h-4" /> Submit Payment Proof</>}
          </button>
        </div>
      )}

      {/* Progress footer */}
      <p className="text-xs text-text-muted text-center mt-6">{completedCount} of 4 steps complete</p>
    </div>
  );
}
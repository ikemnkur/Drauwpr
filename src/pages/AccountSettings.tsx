import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, User, ShieldCheck, Smartphone, Bell, KeyRound, Trash2,
  Loader2, Check, AlertCircle, QrCode, Copy, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, ApiError } from '../lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type SectionId = 'profile' | 'security' | 'phone' | 'notifications' | 'password' | 'danger';

type AccountType = 'business' | 'creator' | 'personal' | 'private';

interface SettingsResponse {
  phoneNumber?: string;
  smsAlertsEnabled?: boolean;
  accountType?: AccountType;
  twoFactorEnabled?: boolean;
  emailNotifications?: EmailNotifications;
}

interface EmailNotifications {
  marketing: boolean;
  productUpdates: boolean;
  security: boolean;
  activity: boolean;
}

interface Toast {
  type: 'success' | 'error';
  message: string;
}

const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Account Type', icon: User },
  { id: 'security', label: 'Two-Factor Auth', icon: ShieldCheck },
  { id: 'phone', label: 'Phone & SMS', icon: Smartphone },
  { id: 'notifications', label: 'Email Notifications', icon: Bell },
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: 'danger', label: 'Delete Account', icon: Trash2 },
];

const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string }[] = [
  { value: 'personal', label: 'Personal', desc: 'Standard individual account' },
  { value: 'creator', label: 'Creator', desc: 'For publishing and monetizing content' },
  { value: 'business', label: 'Business', desc: 'For brands and organizations' },
  { value: 'private', label: 'Private', desc: 'Hidden from search and public listings' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function AccountSettings() {
  const { user, logout } = useAuth();
  const [active, setActive] = useState<SectionId>('profile');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);

  // Loaded settings
  const [settings, setSettings] = useState<SettingsResponse | null>(null);

  const showToast = useCallback((t: Toast) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Load current settings ──
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.post<SettingsResponse>('/api/account/settings', { email: user.email })
      .then((res) => setSettings(res))
      .catch(() => showToast({ type: 'error', message: 'Failed to load settings' }))
      .finally(() => setLoading(false));
  }, [user, showToast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <Link to="/account" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition no-underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Account
      </Link>

      <h1 className="text-2xl font-bold text-text mb-1">Settings</h1>
      <p className="text-sm text-text-muted mb-8">Manage your account, security, and preferences.</p>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          toast.type === 'success' ? 'bg-green-500/15 border border-green-500/30 text-green-400' : 'bg-danger/15 border border-danger/30 text-danger'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* ── Left nav ── */}
        <nav className="md:w-56 shrink-0 flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors text-left ${
                active === id
                  ? 'bg-brand text-white'
                  : id === 'danger'
                    ? 'text-danger hover:bg-danger/10'
                    : 'text-text-muted hover:bg-surface-2 hover:text-text'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* ── Content ── */}
        <div className="flex-1 min-w-0">
          {active === 'profile' && <ProfileSection settings={settings} onToast={showToast} />}
          {active === 'security' && <SecuritySection settings={settings} onToast={showToast} />}
          {active === 'phone' && <PhoneSection settings={settings} onToast={showToast} />}
          {active === 'notifications' && <NotificationsSection settings={settings} onToast={showToast} />}
          {active === 'password' && <PasswordSection onToast={showToast} />}
          {active === 'danger' && <DangerSection onToast={showToast} onDeleted={logout} />}
        </div>
      </div>
    </div>
  );
}

// ─── Shared UI ───────────────────────────────────────────────────────────────

function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-2 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-text">{title}</h2>
        {desc && <p className="text-sm text-text-muted mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function SaveButton({ loading, children = 'Save Changes', disabled }: { loading: boolean; children?: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="py-2.5 px-5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center gap-2"
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <p className="text-sm text-text font-medium">{label}</p>
        {desc && <p className="text-xs text-text-muted">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full shrink-0 transition-colors ${checked ? 'bg-brand' : 'bg-surface-3'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

// ─── Section: Account Type ───────────────────────────────────────────────────

function ProfileSection({ settings, onToast }: { settings: SettingsResponse | null; onToast: (t: Toast) => void }) {
  const { user } = useAuth();
  const [accountType, setAccountType] = useState<AccountType>(settings?.accountType || 'personal');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/account/account-type', { email: user?.email, accountType });
      onToast({ type: 'success', message: 'Account type updated' });
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Update failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <Card title="Account Type" desc="Choose how your account is presented across Prolifer8.">
        <div className="grid sm:grid-cols-2 gap-3">
          {ACCOUNT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setAccountType(t.value)}
              className={`text-left p-4 rounded-xl border transition-colors ${
                accountType === t.value ? 'border-brand bg-brand/5' : 'border-surface-3 hover:border-text-muted'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-text">{t.label}</span>
                {accountType === t.value && <Check className="w-4 h-4 text-brand" />}
              </div>
              <p className="text-xs text-text-muted">{t.desc}</p>
            </button>
          ))}
        </div>
        <SaveButton loading={saving} />
      </Card>
    </form>
  );
}

// ─── Section: Two-Factor Auth ────────────────────────────────────────────────

function SecuritySection({ settings, onToast }: { settings: SettingsResponse | null; onToast: (t: Toast) => void }) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(!!settings?.twoFactorEnabled);
  const [mode, setMode] = useState<'idle' | 'setup' | 'confirm' | 'recovery'>('idle');
  const [busy, setBusy] = useState(false);

  // setup state
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  // ── Begin setup: fetch QR ──
  const startSetup = async () => {
    setBusy(true);
    try {
      const res = await api.post<{ qrUrl: string; secret: string }>('/api/account/2fa/setup', { email: user?.email });
      setQrUrl(res.qrUrl);
      setSecret(res.secret);
      setMode('confirm');
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Could not start 2FA setup' });
    } finally {
      setBusy(false);
    }
  };

  // ── Confirm code, enable ──
  const confirmEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { onToast({ type: 'error', message: 'Enter the 6-digit code' }); return; }
    setBusy(true);
    try {
      const res = await api.post<{ recoveryCodes: string[] }>('/api/account/2fa/enable', { email: user?.email, code });
      setRecoveryCodes(res.recoveryCodes || []);
      setEnabled(true);
      setMode('recovery');
      setCode('');
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Invalid code' });
    } finally {
      setBusy(false);
    }
  };

  // ── Disable ──
  const disable = async () => {
    setBusy(true);
    try {
      await api.post('/api/account/2fa/disable', { email: user?.email });
      setEnabled(false);
      setMode('idle');
      onToast({ type: 'success', message: '2FA disabled' });
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Could not disable 2FA' });
    } finally {
      setBusy(false);
    }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Recovery codes view
  if (mode === 'recovery') {
    return (
      <Card title="Save Your Recovery Codes" desc="Store these somewhere safe. Each code works once.">
        <div className="bg-surface-3 rounded-lg p-3 space-y-1">
          {recoveryCodes.map((c) => (
            <p key={c} className="font-mono text-sm text-text tracking-wider">{c}</p>
          ))}
        </div>
        <button
          onClick={copyCodes}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-surface-3 text-sm text-text-muted hover:text-text hover:border-brand transition-colors"
        >
          {copied ? <><Check className="w-4 h-4 text-green-400" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy All</>}
        </button>
        <button
          onClick={() => setMode('idle')}
          className="py-2.5 px-5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors"
        >
          Done
        </button>
      </Card>
    );
  }

  // Setup / confirm view
  if (mode === 'confirm') {
    return (
      <Card title="Set Up Two-Factor Auth" desc="Scan the QR code with Google Authenticator or Authy, then enter the code.">
        {qrUrl && (
          <div className="flex justify-center">
            <img src={qrUrl} alt="2FA QR" className="w-44 h-44 rounded-lg" />
          </div>
        )}
        <details className="text-xs text-text-muted">
          <summary className="cursor-pointer hover:text-brand">Can't scan? Enter manually</summary>
          <p className="mt-1 font-mono bg-surface-3 rounded px-2 py-1 break-all select-all">{secret}</p>
        </details>
        <form onSubmit={confirmEnable} className="space-y-3">
          <input
            type="text" inputMode="numeric" maxLength={6} value={code} autoFocus
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-3 text-xl text-center tracking-widest text-text font-mono focus:outline-none focus:border-brand"
          />
          <div className="flex gap-2">
            <SaveButton loading={busy}>Activate 2FA</SaveButton>
            <button type="button" onClick={() => setMode('idle')} className="py-2.5 px-5 rounded-lg bg-surface-3 text-text-muted text-sm hover:text-text">
              Cancel
            </button>
          </div>
        </form>
      </Card>
    );
  }

  // Idle view
  return (
    <Card title="Two-Factor Authentication" desc="Add an extra layer of security to your account using an authenticator app.">
      <div className="flex items-center justify-between bg-surface-3 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${enabled ? 'bg-green-500/15 text-green-400' : 'bg-surface-2 text-text-muted'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">{enabled ? '2FA is active' : '2FA is off'}</p>
            <p className="text-xs text-text-muted">{enabled ? 'Your account is protected' : 'Recommended for all accounts'}</p>
          </div>
        </div>
      </div>

      {enabled ? (
        <button
          onClick={disable}
          disabled={busy}
          className="py-2.5 px-5 rounded-lg bg-danger/10 border border-danger/30 text-danger font-semibold text-sm hover:bg-danger/20 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Remove 2FA
        </button>
      ) : (
        <button
          onClick={startSetup}
          disabled={busy}
          className="py-2.5 px-5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
          Enable 2FA
        </button>
      )}
    </Card>
  );
}

// ─── Section: Phone & SMS ────────────────────────────────────────────────────

function PhoneSection({ settings, onToast }: { settings: SettingsResponse | null; onToast: (t: Toast) => void }) {
  const { user } = useAuth();
  const [phone, setPhone] = useState(settings?.phoneNumber || '');
  const [smsAlerts, setSmsAlerts] = useState(!!settings?.smsAlertsEnabled);
  const [saving, setSaving] = useState(false);

  // ── SMS verification sub-flow ──
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const sendOtp = async () => {
    if (!phone.trim()) { onToast({ type: 'error', message: 'Enter a phone number' }); return; }
    setVerifying(true);
    try {
      await api.post('/api/account/phone/send-otp', { email: user?.email, phoneNumber: phone.trim() });
      setOtpSent(true);
      onToast({ type: 'success', message: 'Code sent via SMS' });
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Could not send code' });
    } finally {
      setVerifying(false);
    }
  };

  const verifyOtp = async () => {
    if (otp.length !== 6) { onToast({ type: 'error', message: 'Enter the 6-digit code' }); return; }
    setVerifying(true);
    try {
      await api.post('/api/account/phone/verify-otp', { email: user?.email, phoneNumber: phone.trim(), code: otp });
      setVerified(true);
      setOtpSent(false);
      setOtp('');
      onToast({ type: 'success', message: 'Phone number verified' });
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Invalid code' });
    } finally {
      setVerifying(false);
    }
  };

  const saveAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/account/sms-alerts', { email: user?.email, smsAlertsEnabled: smsAlerts });
      onToast({ type: 'success', message: 'SMS preferences saved' });
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Phone Number" desc="Used for SMS alerts and account recovery.">
        <div>
          <label className="block text-xs text-text-muted mb-1">Phone Number</label>
          <div className="flex gap-2">
            <input
              type="tel"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setVerified(false); }}
              placeholder="+1 555 123 4567"
              className="flex-1 bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand"
            />
            <button
              type="button"
              onClick={sendOtp}
              disabled={verifying || verified}
              className="py-2.5 px-4 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-2"
            >
              {verifying && !otpSent ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {verified ? 'Verified' : 'Send Code'}
            </button>
          </div>
          {verified && <p className="text-xs text-green-400 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Phone verified</p>}
        </div>

        {otpSent && !verified && (
          <div className="bg-surface-3 rounded-xl p-4 space-y-3">
            <label className="block text-xs text-text-muted">Enter the code sent to {phone}</label>
            <input
              type="text" inputMode="numeric" maxLength={6} value={otp} autoFocus
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-3 text-lg text-center tracking-widest text-text font-mono focus:outline-none focus:border-brand"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={verifyOtp}
                disabled={verifying}
                className="py-2.5 px-5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {verifying && <Loader2 className="w-4 h-4 animate-spin" />}
                Verify
              </button>
              <button type="button" onClick={sendOtp} disabled={verifying} className="py-2.5 px-4 rounded-lg bg-surface-2 text-text-muted text-sm hover:text-text">
                Resend
              </button>
            </div>
          </div>
        )}
      </Card>

      <form onSubmit={saveAlerts}>
        <Card title="SMS Alerts" desc="Get text messages for important account activity.">
          <Toggle checked={smsAlerts} onChange={setSmsAlerts} label="Enable SMS alerts" desc="Login alerts, transaction confirmations, and security notices." />
          <SaveButton loading={saving} />
        </Card>
      </form>
    </div>
  );
}

// ─── Section: Email Notifications ────────────────────────────────────────────

function NotificationsSection({ settings, onToast }: { settings: SettingsResponse | null; onToast: (t: Toast) => void }) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<EmailNotifications>(settings?.emailNotifications || {
    marketing: false, productUpdates: true, security: true, activity: true,
  });
  const [saving, setSaving] = useState(false);

  const set = (key: keyof EmailNotifications) => (v: boolean) => setPrefs((p) => ({ ...p, [key]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/account/email-notifications', { email: user?.email, emailNotifications: prefs });
      onToast({ type: 'success', message: 'Notification preferences saved' });
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      <Card title="Email Notifications" desc="Choose which emails you'd like to receive.">
        <div className="divide-y divide-surface-3">
          <Toggle checked={prefs.activity} onChange={set('activity')} label="Account activity" desc="Replies, mentions, and updates on your drops." />
          <Toggle checked={prefs.security} onChange={set('security')} label="Security alerts" desc="Login attempts and password changes. Strongly recommended." />
          <Toggle checked={prefs.productUpdates} onChange={set('productUpdates')} label="Product updates" desc="New features and improvements." />
          <Toggle checked={prefs.marketing} onChange={set('marketing')} label="Marketing & promotions" desc="Offers, tips, and news from Prolifer8." />
        </div>
        <SaveButton loading={saving} />
      </Card>
    </form>
  );
}

// ─── Section: Password ───────────────────────────────────────────────────────

function PasswordSection({ onToast }: { onToast: (t: Toast) => void }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 6) { onToast({ type: 'error', message: 'New password must be at least 6 characters' }); return; }
    if (next !== confirm) { onToast({ type: 'error', message: 'Passwords do not match' }); return; }
    setSaving(true);
    try {
      await api.post('/api/account/change-password', { email: user?.email, currentPassword: current, newPassword: next });
      onToast({ type: 'success', message: 'Password updated' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Could not change password' });
    } finally {
      setSaving(false);
    }
  };

  const sendReset = async () => {
    try {
      await api.post('/api/auth/forgot-password', { email: user?.email });
      onToast({ type: 'success', message: 'Reset link sent to your email' });
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Could not send reset link' });
    }
  };

  const field = (label: string, value: string, onChange: (v: string) => void) => (
    <div>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand pr-10"
        />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleChange}>
      <Card title="Password" desc="Change your password or request a reset link by email.">
        <div className="space-y-3">
          {field('Current Password', current, setCurrent)}
          {field('New Password', next, setNext)}
          {field('Confirm New Password', confirm, setConfirm)}
          <button type="button" onClick={() => setShow((s) => !s)} className="text-xs text-text-muted hover:text-brand flex items-center gap-1">
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {show ? 'Hide' : 'Show'} passwords
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SaveButton loading={saving}>Update Password</SaveButton>
          <button type="button" onClick={sendReset} className="text-sm text-brand hover:underline">
            Forgot your current password?
          </button>
        </div>
      </Card>
    </form>
  );
}

// ─── Section: Danger Zone ────────────────────────────────────────────────────

function DangerSection({ onToast, onDeleted }: { onToast: (t: Toast) => void; onDeleted: () => Promise<void> }) {
  const { user } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText === user?.username;

  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    try {
      await api.post('/api/account/delete', { email: user?.email, username: user?.username });
      onToast({ type: 'success', message: 'Account deleted' });
      await onDeleted();
    } catch (err) {
      onToast({ type: 'error', message: err instanceof ApiError ? err.message : 'Could not delete account' });
      setDeleting(false);
    }
  };

  return (
    <Card title="Delete Account" desc="Permanently remove your account and all associated data. This cannot be undone.">
      <div className="bg-danger/5 border border-danger/30 rounded-xl p-4 space-y-3">
        <p className="text-sm text-text">
          Type your username <span className="font-mono font-semibold text-danger">{user?.username}</span> to confirm.
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Your username"
          className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-danger"
        />
        <button
          onClick={handleDelete}
          disabled={!canDelete || deleting}
          className="py-2.5 px-5 rounded-lg bg-danger text-white font-semibold text-sm hover:bg-danger/90 transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          Delete My Account
        </button>
      </div>
    </Card>
  );
}
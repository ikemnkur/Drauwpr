import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface ResetPasswordResponse {
  success: boolean;
  message?: string;
}

function validateEmail(value: string) {
  const atIndex = value.indexOf('@');
  return atIndex > 0 && value.lastIndexOf('.') > atIndex && !value.endsWith('.') && !value.endsWith('@');
}

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as { email?: string } | null;
    if (state?.email) {
      setEmail(state.email);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim();
    const cleanCode = resetCode.trim();

    if (!cleanEmail || !cleanCode || !newPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<ResetPasswordResponse>('/api/auth/reset-password', {
        email: cleanEmail,
        resetCode: cleanCode,
        newPassword,
      });

      if (response.success) {
        setSuccess(response.message || 'Password reset successful. Redirecting to login...');
        window.setTimeout(() => {
          navigate('/login');
        }, 1800);
      } else {
        setError(response.message || 'Failed to reset password.');
      }
    } catch (error) {
      setError(error instanceof ApiError ? error.message : 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-12 px-4">
      <div className="text-center mb-8">
        <KeyRound className="w-10 h-10 text-brand mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-text">Reset Password</h1>
        <p className="text-sm text-text-muted">Enter the code from your email and choose a new password.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-surface-2 rounded-2xl p-6 space-y-4">
        {error && (
          <div className="bg-danger/10 border border-danger/30 text-danger text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg px-3 py-2">
            {success}
          </div>
        )}

        {!success && (
          <>
            <div>
              <label className="block text-xs text-text-muted mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                disabled={loading}
                className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Reset Code</label>
              <input
                type="text"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                placeholder="Enter the code from your email"
                disabled={loading}
                className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-70"
              />
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                  disabled={loading}
                  className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 pr-10 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-muted mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  disabled={loading}
                  className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-2.5 pr-10 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-70"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset Password'}
            </button>
          </>
        )}

        <div className="text-xs text-text-muted text-center space-y-1">
          <p><Link to="/forgot-password" className="text-brand hover:underline">Request a new code</Link></p>
          <p>Back to <Link to="/login" className="text-brand hover:underline">Login</Link></p>
        </div>
      </form>
    </div>
  );
}

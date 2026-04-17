import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Loader2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';

interface ForgotPasswordResponse {
  success: boolean;
  message?: string;
}

function validateEmail(value: string) {
  const atIndex = value.indexOf('@');
  return atIndex > 0 && value.lastIndexOf('.') > atIndex && !value.endsWith('.') && !value.endsWith('@');
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post<ForgotPasswordResponse>('/api/auth/forgot-password', { email: cleanEmail });
      if (response.success) {
        setSuccess(response.message || 'Password reset code sent. Check your email.');
        window.setTimeout(() => {
          navigate('/reset-password', { state: { email: cleanEmail } });
        }, 1800);
      } else {
        setError(response.message || 'Failed to send reset code.');
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
        <h1 className="text-2xl font-bold text-text">Forgot Password</h1>
        <p className="text-sm text-text-muted">Enter your email to receive a reset code.</p>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send Reset Code'}
            </button>
          </>
        )}

        <p className="text-xs text-text-muted text-center">
          Back to <Link to="/login" className="text-brand hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
}

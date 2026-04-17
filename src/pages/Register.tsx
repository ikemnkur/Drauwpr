import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../lib/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username || !email || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(username, email, password);
      navigate('/explore');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto py-12">
      <div className="text-center mb-8">
        <UserPlus className="w-10 h-10 text-brand mx-auto mb-3" />
        <h1 className="text-2xl font-bold text-text">Create Account</h1>
        <p className="text-sm text-text-muted">Join Drauwper and start dropping</p>
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating Account…' : 'Create Account'}
        </button>

        <p className="text-xs text-text-muted text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-brand hover:underline">Sign In</Link>
        </p>
      </form>
    </div>
  );
}

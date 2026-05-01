import { useState } from 'react';
import { Shield } from 'lucide-react';

const ADMIN_URL = import.meta.env.VITE_API_URL || '';

export default function AdminPortal() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) return;
    setLoading(true);

    try {
      const res = await fetch(`${ADMIN_URL}/admin/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setAuthenticated(true);
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Unable to reach admin server');
    } finally {
      setLoading(false);
    }
  };

  if (authenticated) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center p-4">
        <div className="bg-[#1a1d27] rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <Shield className="w-10 h-10 text-[#6c63ff] mx-auto" />
          <h1 className="text-xl font-bold text-white">Admin Access Granted</h1>
          <p className="text-sm text-[#8b90a5]">You can open the full dashboard or jump straight into ID review.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2.5 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#5a52e0] transition-colors"
            >
              Open Admin Dashboard
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/moderation`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2.5 rounded-lg border border-[#ff6b6b]/40 text-white font-semibold text-sm hover:border-[#ff6b6b] hover:text-[#ffb3b3] transition-colors"
            >
              Open Moderation
            </a>
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/admin/review/verifications`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-2.5 rounded-lg border border-[#2e3348] text-white font-semibold text-sm hover:border-[#6c63ff] transition-colors"
            >
              Review IDs
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-[#1a1d27] rounded-2xl p-8 max-w-sm w-full space-y-4">
        <div className="text-center">
          <Shield className="w-8 h-8 text-[#6c63ff] mx-auto mb-2" />
          <p className="text-xs text-[#8b90a5]">Restricted Access</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Access key"
          autoFocus
          className="w-full bg-[#242837] border border-[#2e3348] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#6c63ff]"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-[#6c63ff] text-white font-semibold text-sm hover:bg-[#5a52e0] transition-colors disabled:opacity-50"
        >
          {loading ? 'Verifying…' : 'Authenticate'}
        </button>
      </form>
    </div>
  );
}

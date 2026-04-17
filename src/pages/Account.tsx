import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { User, CreditCard, Settings, LogOut, ShieldCheck, ShieldX, ChevronRight, Star, Crown, Zap, Pencil, Eye } from 'lucide-react';

export default function Account() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  const isVerified = user.verification === 'true';

  const membership = (user.accountType ?? 'free').toLowerCase() as 'free' | 'standard' | 'premium';

  const membershipMeta = {
    free:     { label: 'Free',     Icon: Zap,    color: 'text-text-muted',  desc: 'Upgrade for more credits and premium features' },
    standard: { label: 'Standard', Icon: Star,   color: 'text-blue-400',    desc: 'Your Standard subscription is active' },
    premium:  { label: 'Premium',  Icon: Crown,  color: 'text-brand',       desc: 'Your Premium subscription is active' },
  };
  const tier = membershipMeta[membership] ?? membershipMeta.free;
  const TierIcon = tier.Icon;

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-text flex items-center gap-2 mb-6">
        <User className="w-6 h-6 text-brand" />
        Account
      </h1>

      <div className="bg-surface-2 rounded-2xl p-6 space-y-6">
        {/* Avatar + info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center text-2xl font-bold text-brand">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-text">{user.username}</p>
            <p className="text-sm text-text-muted">{user.email}</p>
            <p className="text-xs text-text-muted">Member since {new Date(user.joined).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Account Details */}
        <div className="bg-surface-3 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-text">Account Details</h3>
            <div className="flex items-center gap-2">
              <Link
                to={`/user/${user.id}`}
                className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-brand transition no-underline"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </Link>
              <Link
                to="/edit-profile"
                className="inline-flex items-center gap-1 text-xs text-brand hover:text-orange-400 transition no-underline"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Username</span>
            <span className="text-sm text-text font-medium">{user.username}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Email</span>
            <span className="text-sm text-text font-medium">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-muted">Member Since</span>
            <span className="text-sm text-text font-medium">{new Date(user.joined).toLocaleDateString()}</span>
          </div>
          
        </div>
        {/* Membership Status */}
        <Link
          to="/plans"
          className="bg-surface-3 rounded-xl p-4 flex items-center justify-between hover:bg-surface transition-colors no-underline"
        >
          <div className="flex items-center gap-3">
            <TierIcon className={`w-5 h-5 ${tier.color}`} />
            <div>
              <p className="text-sm font-medium text-text">
                {tier.label} Plan
              </p>
              <p className="text-xs text-text-muted">{tier.desc}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </Link>

        {/* Verification Status */}
        <Link
          to="/verify"
          className="bg-surface-3 rounded-xl p-4 flex items-center justify-between hover:bg-surface transition-colors no-underline"
        >
          <div className="flex items-center gap-3">
            {isVerified ? (
              <ShieldCheck className="w-5 h-5 text-green-500" />
            ) : (
              <ShieldX className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <p className="text-sm font-medium text-text">
                {isVerified ? 'Account Verified' : 'Account Not Verified'}
              </p>
              <p className="text-xs text-text-muted">
                {isVerified
                  ? 'Your identity has been confirmed'
                  : 'Verify to unlock credit redemption'}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-text-muted" />
        </Link>

        {/* Balance */}
        <div className="bg-surface-3 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-brand" />
            <span className="text-sm text-text-muted">Credit Balance</span>
          </div>
          <span className="text-xl font-bold font-mono text-brand">{user.creditBalance.toLocaleString()}</span>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-3 rounded-xl bg-surface-3 hover:bg-surface text-sm text-text-muted hover:text-text transition-colors flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Account Settings
          </button>
          <button
            onClick={handleSignOut}
            className="w-full text-left px-4 py-3 rounded-xl bg-surface-3 hover:bg-surface text-sm text-danger transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Wallet, ArrowDownToLine, Zap, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BUY_METHODS = [
  {
    id: 'stripe',
    label: 'Card / Stripe',
    sublabel: 'Visa, Mastercard, Apple Pay',
    icon: CreditCard,
    accent: 'text-indigo-400',
    border: 'hover:border-indigo-500/60',
    bg: 'hover:bg-indigo-500/5',
    route: '/buy-credits/stripe',
    description:
      'Pay securely with any debit or credit card via Stripe. Credits are delivered instantly after payment verification.',
  },
  {
    id: 'crypto',
    label: 'Crypto',
    sublabel: 'BTC · ETH · LTC · SOL',
    icon: Wallet,
    accent: 'text-orange-400',
    border: 'hover:border-orange-500/60',
    bg: 'hover:bg-orange-500/5',
    route: '/buy-credits/crypto',
    description:
      'Send crypto to our wallet. Volume discounts kick in at $10+ — the more you spend, the more credits you earn.',
  },
];

const REDEEM_METHOD = {
  id: 'redeem',
  label: 'Redeem Credits',
  sublabel: 'Cash out to your crypto wallet',
  icon: ArrowDownToLine,
  accent: 'text-green-400',
  border: 'hover:border-green-500/60',
  bg: 'hover:bg-green-500/5',
  route: '/redeem',
  description: 'Exchange credits back to crypto. Account verification required before redeeming.',
  state: { mode: 'redeem' },
};

export default function BuyCredits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'buy' | 'redeem'>('buy');

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-text flex items-center gap-2 mb-1">
        <Zap className="w-6 h-6 text-brand" />
        Credits
      </h1>
      <p className="text-sm text-text-muted mb-6">1,000 credits = $1.00 USD</p>

      {/* Balance card */}
      {user && (
        <div className="bg-surface-2 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-0.5">Current Balance</p>
            <p className="text-2xl font-bold font-mono text-brand">
              {(user.creditBalance ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-text-muted">credits</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-text-muted">≈ USD value</p>
            <p className="text-lg font-semibold text-text">
              ${((user.creditBalance ?? 0) / 1000).toFixed(2)}
            </p>
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex bg-surface-2 rounded-xl p-1 mb-6">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            mode === 'buy' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          <Zap className="w-4 h-4" />
          Buy
        </button>
        <button
          onClick={() => setMode('redeem')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            mode === 'redeem' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          <ArrowDownToLine className="w-4 h-4" />
          Redeem
        </button>
      </div>

      {mode === 'buy' ? (
        <>
          {/* Crypto discount info */}
          <div className="bg-brand/5 border border-brand/20 rounded-xl px-4 py-3 mb-4 text-sm text-text-muted">
            <span className="text-brand font-medium">Crypto bonus: </span>
            volume discounts for purchases from 10,000 up to 100,000.
          </div>

          {/* Buy method cards */}
          <div className="space-y-3">
            {BUY_METHODS.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(m.route)}
                  className={`w-full text-left bg-surface-2 border-2 border-transparent ${m.border} ${m.bg} rounded-2xl p-4 transition-all group`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center shrink-0 ${m.accent}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text">{m.label}</p>
                      <p className="text-xs text-text-muted">{m.sublabel}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text transition-colors shrink-0" />
                  </div>
                  <p className="text-xs text-text-muted mt-3 pl-14 leading-relaxed">
                    {m.description}
                  </p>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        /* Redeem card */
        <button
          onClick={() => navigate(REDEEM_METHOD.route, { state: REDEEM_METHOD.state })}
          className={`w-full text-left bg-surface-2 border-2 border-transparent ${REDEEM_METHOD.border} ${REDEEM_METHOD.bg} rounded-2xl p-4 transition-all group`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center shrink-0 ${REDEEM_METHOD.accent}`}
            >
              <ArrowDownToLine className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-text">{REDEEM_METHOD.label}</p>
              <p className="text-xs text-text-muted">{REDEEM_METHOD.sublabel}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-text transition-colors shrink-0" />
          </div>
          <p className="text-xs text-text-muted mt-3 pl-14 leading-relaxed">
            {REDEEM_METHOD.description}
          </p>
        </button>
      )}

      <p className="text-xs text-text-muted text-center mt-6">
        All purchases are final. Credits are non-refundable except in cases of verified platform errors.
      </p>
    </div>
  );
}

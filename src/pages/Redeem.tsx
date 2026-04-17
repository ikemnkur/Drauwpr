import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDownToLine, ArrowLeft, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const REDEEM_AMOUNTS = [5_000, 10_000, 25_000, 50_000, 100_000];
type Chain = 'BTC' | 'ETH' | 'LTC' | 'SOL';

// USD payout per credit: 1,000 credits = $1.00
const usdValue = (credits: number) => (credits / 1000).toFixed(2);

export default function Redeem() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [redeemAmount, setRedeemAmount] = useState(0);
  const [chain, setChain] = useState<Chain>('BTC');
  const [walletAddress, setWalletAddress] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const isVerified = user?.verification === 'true';
  const balance = user?.creditBalance ?? 0;

  const availableAmounts = REDEEM_AMOUNTS.filter((a) => a <= balance);

  const handleSubmit = async () => {
    if (!user || !redeemAmount || !walletAddress.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      await api.post('/api/redeem', {
        username: user.username,
        userId: user.id,
        credits: redeemAmount,
        chain,
        walletAddress: walletAddress.trim(),
      });
      setResult({
        success: true,
        message: `Redemption of ${redeemAmount.toLocaleString()} credits ($${usdValue(redeemAmount)}) submitted. Payout will be processed to your ${chain} wallet within 1–3 business days.`,
      });
      setRedeemAmount(0);
      setWalletAddress('');
    } catch (err: unknown) {
      const e = err as { data?: { error?: string }; message?: string };
      setResult({
        success: false,
        message: e?.data?.error || e?.message || 'Submission failed. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Back nav */}
      <button
        onClick={() => navigate('/buy-credits')}
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-text flex items-center gap-2 mb-1">
        <ArrowDownToLine className="w-6 h-6 text-green-400" />
        Redeem Credits
      </h1>
      <p className="text-sm text-text-muted mb-6">Cash out credits to your crypto wallet. 1,000 credits = $1.00</p>

      {/* Verification gate */}
      {!isVerified ? (
        <div className="bg-surface-2 rounded-2xl p-6 text-center">
          <p className="text-text mb-2 font-medium">Account Verification Required</p>
          <p className="text-sm text-text-muted mb-4">
            You must complete all three verification steps (email, ID upload, and crypto micropayment)
            before redeeming credits.
          </p>
          <a
            href="/verify"
            className="inline-block px-6 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-colors"
          >
            Verify Account
          </a>
        </div>
      ) : (
        <>
          {/* Balance card */}
          <div className="bg-surface-2 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wide mb-0.5">Available Balance</p>
              <p className="text-2xl font-bold font-mono text-brand">{balance.toLocaleString()}</p>
              <p className="text-xs text-text-muted">credits</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">≈ USD value</p>
              <p className="text-lg font-semibold text-text">${(balance / 1000).toFixed(2)}</p>
            </div>
          </div>

          {/* Redeem amounts */}
          <div className="mb-6">
            <p className="text-sm text-text-muted mb-3">Select Amount</p>
            {availableAmounts.length === 0 ? (
              <div className="bg-surface-2 rounded-xl p-4 text-center text-sm text-text-muted">
                You need at least 5,000 credits to redeem.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {availableAmounts.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setRedeemAmount(amt)}
                    className={`rounded-xl p-4 text-left transition-all ${
                      redeemAmount === amt
                        ? 'bg-green-500/15 border-2 border-green-500'
                        : 'bg-surface-2 border-2 border-transparent hover:border-surface-3'
                    }`}
                  >
                    <p className="text-xl font-bold font-mono text-text">{amt.toLocaleString()}</p>
                    <p className="text-sm text-text-muted">credits</p>
                    <p className="text-lg font-semibold text-green-400 mt-1">${usdValue(amt)}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chain + wallet */}
          <div className="bg-surface-2 rounded-2xl p-5 mb-6 space-y-4">
            <div>
              <p className="text-sm text-text-muted mb-2">Payout Chain</p>
              <div className="flex gap-2">
                {(['BTC', 'ETH', 'LTC', 'SOL'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setChain(c)}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                      chain === c ? 'bg-green-600 text-white' : 'bg-surface-3 text-text-muted hover:text-text'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-text-muted mb-1 block">
                Your {chain} Wallet Address
              </label>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={`Enter your ${chain} wallet address`}
                className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-green-500 placeholder:text-text-muted/50"
              />
            </div>

            {/* Payout summary */}
            {redeemAmount > 0 && walletAddress.trim() && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-sm">
                <p className="text-text-muted mb-0.5">You will receive approximately</p>
                <p className="text-xl font-bold text-green-300">${usdValue(redeemAmount)} USD</p>
                <p className="text-xs text-text-muted mt-0.5">
                  in {chain} to <span className="font-mono text-text break-all">{walletAddress}</span>
                </p>
              </div>
            )}
          </div>

          {/* Result feedback */}
          {result && (
            <div
              className={`mb-4 flex items-start gap-3 text-sm rounded-xl p-4 ${
                result.success
                  ? 'bg-green-400/10 border border-green-400/20'
                  : 'bg-red-400/10 border border-red-400/20'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
              )}
              <div>
                <p className={`font-bold ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                  {result.success ? 'Redemption Submitted' : 'Failed'}
                </p>
                <p className={`mt-0.5 ${result.success ? 'text-green-400/80' : 'text-red-400/80'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !redeemAmount || !walletAddress.trim()}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : redeemAmount ? (
              `Redeem ${redeemAmount.toLocaleString()} Credits → $${usdValue(redeemAmount)}`
            ) : (
              'Select an amount to redeem'
            )}
          </button>

          <p className="text-xs text-text-muted text-center mt-4">
            Payouts are processed manually within 1–3 business days. Minimum redemption: 5,000 credits.
          </p>
        </>
      )}
    </div>
  );
}

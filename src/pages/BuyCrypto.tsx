import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bitcoin, Copy, CheckCircle2, ArrowLeft, Upload, Loader2, AlertCircle, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

// ─── Constants ──────────────────────────────────────────────────────────────

const CURRENCIES = [
  { symbol: 'BTC', name: 'Bitcoin',   coinId: 'bitcoin',  address: 'bc1q4j9e7equq4xvlyu7tan4gdmkvze7wc0egvykr6' },
  { symbol: 'ETH', name: 'Ethereum',  coinId: 'ethereum', address: '0x9a61f30347258A3D03228F363b07692F3CBb7f27' },
  { symbol: 'LTC', name: 'Litecoin',  coinId: 'litecoin', address: 'ltc1qgg5aggedmvjx0grd2k5shg6jvkdzt9dtcqa4dh' },
  { symbol: 'SOL', name: 'Solana',    coinId: 'solana',   address: 'qaSpvAumg2L3LLZA8qznFtbrRKYMP1neTGqpNgtCPaU' },
];

const MIN_USD = 2.5;
const MAX_USD = 250;
const STEP = 0.5;

// ─── Credit Scale ────────────────────────────────────────────────────────────
// Key milestones: $2.50 → 2,000 | $10 → 10,000 | $95 → 100,000
// Piecewise linear between anchors, then continues at $95 rate beyond.

function creditsForDollars(dollars: number): number {
  if (dollars < MIN_USD) return 0;
  if (dollars <= 10) {
    // 2,000 at $2.50 → 10,000 at $10  (slope: 8000/7.5 ≈ 1066.67/dollar)
    return Math.round(2000 + (dollars - 2.5) * (8000 / 7.5));
  }
  if (dollars <= 95) {
    // 10,000 at $10 → 100,000 at $95  (slope: 90000/85 ≈ 1058.82/dollar)
    return Math.round(10000 + (dollars - 10) * (90000 / 85));
  }
  // $95+: continue at the $95 marginal rate
  return Math.round(100000 + (dollars - 95) * (90000 / 85));
}

function effectiveRatePerDollar(dollars: number): number {
  if (dollars <= 0) return 800;
  return creditsForDollars(dollars) / dollars;
}

function bonusPercent(dollars: number): number {
  const rate = effectiveRatePerDollar(dollars);
  return Math.round(((rate - 800) / 800) * 100);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BuyCrypto() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [walletAddress, setWalletAddress] = useState('');

  const [amount, setAmount] = useState(10);
  const [currencyIdx, setCurrencyIdx] = useState(0);
  const [cryptoRate, setCryptoRate] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateError, setRateError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const [txHash, setTxHash] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  const currency = CURRENCIES[currencyIdx];
  const credits = creditsForDollars(amount);
  const bonus = bonusPercent(amount);
  const cryptoAmount = cryptoRate && cryptoRate > 0 ? (amount / cryptoRate).toFixed(6) : null;

  // Fetch live rate via server proxy (avoids CoinGecko CORS / rate-limit)
  const fetchRate = useCallback(async () => {
    setRateLoading(true);
    setRateError(false);
    try {
      const data = await api.get<Record<string, { usd: number }>>(
        `/api/crypto-rate?coin=${currency.coinId}`
      );
      const rate = data[currency.coinId]?.usd ?? null;
      setCryptoRate(rate);
    } catch {
      setRateError(true);
    } finally {
      setRateLoading(false);
    }
  }, [currency.coinId]);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currency.address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleAmountInput = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return;
    setAmount(Math.min(MAX_USD, Math.max(MIN_USD, Math.round(n / STEP) * STEP)));
  };

  const handleSubmit = async () => {
    if (!user || !txHash.trim()) return;
    setSubmitting(true);
    setSubmitResult(null);
    try {
      const body: Record<string, unknown> = {
        username: user.username,
        currency: currency.symbol,
        amount: Math.round(amount * 100), // cents
        credits,
        transactionId: txHash.trim(),
        walletAddress: walletAddress.trim(),
      };
      if (screenshot) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(screenshot);
        });
        body.screenshot = base64;
      }
      const result = await api.post<{ success: boolean; verified?: boolean; pending?: boolean; credits?: number; message?: string }>(
        `/api/purchases/${user.username}`, body
      );
      if (result.verified) {
        setSubmitResult({
          success: true,
          message: `✅ Transaction verified! ${result.credits?.toLocaleString()} credits have been added to your account.`,
        });
        // Refresh balance so the navbar updates
        refreshUser?.();
      } else {
        // pending manual review (202)
        setSubmitResult({
          success: true,
          message: result.message || 'Your transaction has been submitted for manual review. Credits will be applied within 24 hours once confirmed.',
        });
      }
      setTxHash('');
      setScreenshot(null);
    } catch (err: unknown) {
      const e = err as { data?: { error?: string }; message?: string };
      setSubmitResult({
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
        Back to payment methods
      </button>

      <h1 className="text-2xl font-bold text-text flex items-center gap-2 mb-1">
        <Bitcoin className="w-6 h-6 text-orange-400" />
        Buy Credits with Crypto
      </h1>
      <p className="text-sm text-text-muted mb-6">Volume discounts apply — the more you spend, the more you get.</p>

      {/* ─── Amount selector ─── */}
      <div className="bg-surface-2 rounded-2xl p-5 mb-4">
        <p className="text-sm text-text-muted mb-3">Amount (USD)</p>

        <div className="flex items-center gap-3 mb-3">
          <span className="text-text-muted font-medium text-lg">$</span>
          <input
            type="number"
            min={MIN_USD}
            max={MAX_USD}
            step={STEP}
            value={amount}
            onChange={(e) => handleAmountInput(e.target.value)}
            className="w-28 bg-surface-3 border border-surface-3 rounded-xl px-3 py-2 text-lg font-bold font-mono text-text focus:outline-none focus:border-brand text-center"
          />
          <span className="text-xs text-text-muted">(${MIN_USD}–${MAX_USD})</span>
        </div>

        <input
          type="range"
          min={MIN_USD}
          max={MAX_USD}
          step={STEP}
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          className="w-full accent-brand mb-4"
        />

        {/* Credits display */}
        <div className={`rounded-xl p-4 flex items-center justify-between ${bonus > 0 ? 'bg-orange-400/10 border border-orange-400/20' : 'bg-surface-3'}`}>
          <div>
            <p className="text-2xl font-bold font-mono text-text">{credits.toLocaleString()}</p>
            <p className="text-xs text-text-muted">credits</p>
          </div>
          {bonus-25 > 0 && (
            <div className="bg-orange-400/20 text-orange-300 text-sm font-bold px-3 py-1 rounded-full">
              {(bonus-25>0 ? `+${bonus-25}% bonus` : '')}
            </div>
          )}
        </div>

        {/* Discount scale info */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-text-muted">
          <div className="bg-surface-3 rounded-lg py-2">
            <p className="font-mono text-text font-semibold">$2.50</p>
            <p>2,000 credits</p>
          </div>
          <div className="bg-surface-3 rounded-lg py-2">
            <p className="font-mono text-text font-semibold">$10</p>
            <p>10,000 credits</p>
          </div>
          <div className="bg-surface-3 rounded-lg py-2">
            <p className="font-mono text-text font-semibold">$95</p>
            <p>100,000 credits</p>
          </div>
        </div>
      </div>

      {/* ─── Currency selector ─── */}
      <div className="bg-surface-2 rounded-2xl p-5 mb-4">
        <p className="text-sm text-text-muted mb-3">Select Currency</p>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {CURRENCIES.map((c, i) => (
            <button
              key={c.symbol}
              onClick={() => setCurrencyIdx(i)}
              className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                currencyIdx === i ? 'bg-brand text-white' : 'bg-surface-3 text-text-muted hover:text-text'
              }`}
            >
              {c.symbol}
            </button>
          ))}
        </div>

        {/* Rate + crypto amount */}
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-text-muted">
            Live rate:{' '}
            {rateLoading ? (
              <Loader2 className="inline w-3.5 h-3.5 animate-spin" />
            ) : rateError ? (
              <span className="text-red-400">unavailable</span>
            ) : (
              <span className="font-mono text-text font-semibold">
                1 {currency.symbol} = ${cryptoRate?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            )}
          </span>
          <button onClick={fetchRate} className="text-xs text-brand hover:underline">
            Refresh
          </button>
        </div>

        {cryptoAmount && !rateError && (
          <div className="bg-surface-3 rounded-xl p-3 text-center">
            <p className="text-sm text-text-muted">Exact amount to send</p>
            <p className="text-xl font-bold font-mono text-text">
              {cryptoAmount} {currency.symbol}
            </p>
            <p className="text-xs text-text-muted mt-0.5">≈ ${amount.toFixed(2)} USD</p>
          </div>
        )}
      </div>

      {/* ─── Wallet address ─── */}
      <div className="bg-surface-2 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-text-muted">Send to this {currency.symbol} address</p>
          <button
            onClick={() => setShowQr((v) => !v)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg transition-colors ${
              showQr ? 'bg-brand/20 text-brand' : 'bg-surface-3 text-text-muted hover:text-text'
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

        <div className="flex items-center gap-2 bg-surface-3 rounded-xl px-3 py-3">
          <p className="flex-1 text-xs font-mono text-text break-all">{currency.address}</p>
          <button
            onClick={handleCopy}
            className="shrink-0 p-1.5 rounded-lg bg-surface-2 hover:bg-brand/20 text-text-muted hover:text-brand transition-colors"
            title="Copy address"
          >
            {copied ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        {copied && <p className="text-xs text-green-400 mt-1">Address copied!</p>}
      </div>

      {/* ─── Transaction details ─── */}
      <div className="bg-surface-2 rounded-2xl p-5 mb-4 space-y-4">
        <p className="text-sm font-medium text-text">After sending, provide your transaction details</p>

        <div>
          <label className="text-xs text-text-muted mb-1 block">Transaction Hash (required)</label>
          <input
            type="text"
            value={txHash}

            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x... or txid..."
            className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm font-mono text-text focus:outline-none focus:border-brand placeholder:text-text-muted/50"
          />
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">Wallet Address (required)</label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="0x....."
            className="w-full bg-surface-3 border border-surface-3 rounded-xl px-4 py-2.5 text-sm font-mono text-text focus:outline-none focus:border-brand placeholder:text-text-muted/50"
          />
        </div>

        <div>
          <label className="text-xs text-text-muted mb-1 block">Screenshot (optional)</label>
          <label className="flex items-center gap-2 cursor-pointer bg-surface-3 rounded-xl px-4 py-3 hover:border-brand border border-transparent transition-colors">
            <Upload className="w-4 h-4 text-text-muted" />
            <span className="text-sm text-text-muted">
              {screenshot ? screenshot.name : 'Upload payment confirmation'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setScreenshot(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {/* Submit result */}
      {submitResult && (
        <div
          className={`mb-4 flex items-start gap-3 text-sm rounded-xl p-4 ${
            submitResult.success
              ? 'bg-green-400/10 border border-green-400/20'
              : 'bg-red-400/10 border border-red-400/20'
          }`}
        >
          {submitResult.success ? (
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-400" />
          )}
          <div>
            <p className={`font-bold ${submitResult.success ? 'text-green-300' : 'text-red-300'}`}>
              {submitResult.success ? 'Order Submitted' : 'Submission Failed'}
            </p>
            <p className={`mt-0.5 ${submitResult.success ? 'text-green-400/80' : 'text-red-400/80'}`}>
              {submitResult.message}
            </p>
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={submitting || !txHash.trim()}
        className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Submitting...
          </>
        ) : (
          `Submit Order — ${credits.toLocaleString()} credits`
        )}
      </button>
    </div>
  );
}

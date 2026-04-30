import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { DEFAULT_ECONOMY_SETTINGS, fetchEconomySettings } from '../lib/economySettings';

const PACK_CONFIG = [
  { credits: 5_000, key: 'creditPack5000' as const, popular: false },
  { credits: 10_000, key: 'creditPack10000' as const, popular: false },
  { credits: 25_000, key: 'creditPack25000' as const, popular: true },
  { credits: 50_000, key: 'creditPack50000' as const, popular: false },
  { credits: 100_000, key: 'creditPack100000' as const, popular: false },
];

// Stripe test checkout payment link IDs
const STRIPE_IDS: Record<number, string> = {
  5_000:   'test_4gM4gs1lVbJMa7rgDD0sU04',
  10_000:  'test_3cIeV6d4DdRU4N7gDD0sU03',
  25_000:  'test_6oUcMY3u3g02frLaff0sU02',
  50_000:  'test_eVq14g8OnbJM7Zjdrr0sU01',
  100_000: 'test_4gM6oA2pZeVYfrLcnn0sU00',
};

export default function BuyStripe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutSessionId = searchParams.get('session_id');

  const [selected, setSelected] = useState(2); // default $25
  const [economy, setEconomy] = useState(DEFAULT_ECONOMY_SETTINGS);

  useEffect(() => {
    fetchEconomySettings().then(setEconomy);
  }, []);

  const PACKS = PACK_CONFIG.map((pack) => {
    const dollars = Number(economy[pack.key] ?? 0);
    return {
      credits: pack.credits,
      dollars,
      price: `$${dollars.toFixed(2)}`,
      popular: pack.popular,
    };
  });

  const [showModal, setShowModal] = useState(false);
  const [pendingPack, setPendingPack] = useState<typeof PACKS[0] | null>(null);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [isWaitingForReturn, setIsWaitingForReturn] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  const SHOW_COMPLETE_PAYMENT_BOX = false;

  const getStripeUrl = (credits: number) => {
    const id = STRIPE_IDS[credits];
    return id ? `https://buy.stripe.com/${id}?client_reference_id=${user?.id}` : null;
  };

  const handleStartPurchase = () => {
    setPendingPack(PACKS[selected]);
    setVerifyResult(null);
    setShowModal(true);
  };

  const handleConfirmPurchase = () => {
    if (!pendingPack) return;
    const url = getStripeUrl(pendingPack.credits);
    if (!url) return;
    const startedAt = Date.now();
    setStartTimestamp(startedAt);
    sessionStorage.setItem('stripe_pending_start', String(startedAt));
    sessionStorage.setItem('stripe_pending_pack', JSON.stringify(pendingPack));
    setShowModal(false);
    window.location.assign(url);
  };

  const submitVerification = async (payload: {
    checkoutSessionId?: string;
    start: number;
    end: number;
    packageData?: { credits: number; amount: number; dollars: number };
  }) => {
    if (!user) return;

    const response = await api.post<{ status?: string; pending?: boolean; message?: string }>('/api/verify-stripe-payment', {
      checkoutSessionId: payload.checkoutSessionId,
      timeRange: { start: payload.start, end: payload.end },
      user: { id: user.id, username: user.username, email: user.email },
      packageData: payload.packageData,
    });

    if (response.status === 'succeeded') {
      const grantedCredits = payload.packageData?.credits;
      setVerifyResult({
        success: true,
        message: grantedCredits
          ? `${grantedCredits.toLocaleString()} credits have been added to your account!`
          : 'Your payment was verified and credits have been added to your account!',
      });
      setIsWaitingForReturn(false);
      setPendingPack(null);
      setStartTimestamp(null);
      sessionStorage.removeItem('stripe_pending_start');
      sessionStorage.removeItem('stripe_pending_pack');
      return;
    }

    if (response.pending || response.status === 'pending') {
      setVerifyResult({
        success: false,
        message:
          response.message ||
          'This payment could not be auto-verified and has been submitted for manual review. Credits will be applied once approved.',
      });
      setIsWaitingForReturn(false);
      setPendingPack(null);
      setStartTimestamp(null);
      sessionStorage.removeItem('stripe_pending_start');
      sessionStorage.removeItem('stripe_pending_pack');
      return;
    }

    setVerifyResult({ success: false, message: 'Payment not yet confirmed. Please wait a moment and try again.' });
  };

  const handleVerifyPayment = async () => {
    if (!pendingPack || !startTimestamp || !user) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      await submitVerification({
        start: startTimestamp,
        end: Date.now(),
        packageData: { credits: pendingPack.credits, amount: pendingPack.dollars * 100, dollars: pendingPack.dollars },
      });
    } catch (err: unknown) {
      const e = err as { data?: { error?: string }; message?: string };
      setVerifyResult({
        success: false,
        message:
          e?.data?.error ||
          e?.message ||
          'This payment could not be auto-verified and has been submitted for manual review. Credits will be applied once approved.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (!checkoutSessionId || !user) return;

    const storedStart = Number(sessionStorage.getItem('stripe_pending_start') || 0);
    const rawPack = sessionStorage.getItem('stripe_pending_pack');
    let storedPack: { credits: number; dollars: number } | null = null;

    if (rawPack) {
      try {
        const parsed = JSON.parse(rawPack);
        if (parsed && Number(parsed.credits) > 0 && Number(parsed.dollars) > 0) {
          storedPack = { credits: Number(parsed.credits), dollars: Number(parsed.dollars) };
        }
      } catch {
        storedPack = null;
      }
    }

    const start = Number.isFinite(storedStart) && storedStart > 0 ? storedStart : Date.now() - (20 * 60 * 1000);

    setIsVerifying(true);
    setVerifyResult(null);

    void submitVerification({
      checkoutSessionId,
      start,
      end: Date.now(),
      packageData: storedPack
        ? { credits: storedPack.credits, dollars: storedPack.dollars, amount: storedPack.dollars * 100 }
        : undefined,
    }).catch((err: unknown) => {
      const e = err as { data?: { error?: string }; message?: string };
      setVerifyResult({
        success: false,
        message:
          e?.data?.error ||
          e?.message ||
          'This payment could not be auto-verified and has been submitted for manual review. Credits will be applied once approved.',
      });
    }).finally(() => {
      setIsVerifying(false);
    });
  }, [checkoutSessionId, user]);

  const handleCancelWaiting = () => {
    setIsWaitingForReturn(false);
    setPendingPack(null);
    setStartTimestamp(null);
    setVerifyResult(null);
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
        <CreditCard className="w-6 h-6 text-indigo-400" />
        Card / Stripe
      </h1>
      <p className="text-sm text-text-muted mb-6">1,000 credits = $1.00 USD</p>

      {/* Confirmation modal */}
      {showModal && pendingPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-text mb-1">Confirm Purchase</h2>
            <p className="text-sm text-text-muted mb-5">
              You are about to purchase{' '}
              <span className="font-bold text-brand">{pendingPack.credits.toLocaleString()} credits</span>{' '}
              for <span className="font-bold text-text">{pendingPack.price}</span>.
            </p>
            <div className="bg-surface-2 rounded-xl p-3 mb-5 text-sm text-text-muted">
              You will be redirected to Stripe checkout. After payment, Stripe should return you here automatically for verification.
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-2 text-text-muted text-sm font-medium hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark transition-colors"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Your Payment banner */}
      {SHOW_COMPLETE_PAYMENT_BOX && isWaitingForReturn && pendingPack && (
        <div className="mb-6 bg-surface-2 border border-brand/30 rounded-2xl p-5">
          <h3 className="text-base font-bold text-text mb-1">Complete Your Payment</h3>
          <p className="text-sm text-text-muted mb-4">
            A payment window was opened for{' '}
            <span className="font-medium text-brand">
              {pendingPack.credits.toLocaleString()} credits ({pendingPack.price})
            </span>
            . Once the payment is done, click below to verify and receive your credits.
          </p>
          {verifyResult && !verifyResult.success && (
            <div className="flex items-start gap-2 mb-3 text-sm text-red-400 bg-red-400/10 rounded-lg p-3">
              <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{verifyResult.message}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleCancelWaiting}
              className="py-2 px-4 rounded-xl bg-surface-3 text-text-muted text-sm hover:text-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleVerifyPayment}
              disabled={isVerifying}
              className="flex-1 py-2.5 rounded-xl bg-brand text-white text-sm font-bold hover:bg-brand-dark disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "I've Completed Payment"
              )}
            </button>
          </div>
        </div>
      )}

      {isVerifying && !verifyResult && (
        <div className="mb-6 flex items-start gap-3 text-sm bg-surface-2 border border-surface-3 rounded-xl p-4">
          <Loader2 className="w-5 h-5 mt-0.5 shrink-0 animate-spin text-brand" />
          <div>
            <p className="font-bold text-text">Verifying Stripe Payment</p>
            <p className="text-text-muted mt-0.5">Please wait while we confirm your checkout session.</p>
          </div>
        </div>
      )}

      {/* Success notification */}
      {verifyResult?.success && (
        <div className="mb-6 flex items-start gap-3 text-sm bg-green-400/10 border border-green-400/20 rounded-xl p-4">
          <CheckCircle className="w-5 h-5 mt-0.5 shrink-0 text-green-400" />
          <div>
            <p className="font-bold text-green-300">Payment Verified!</p>
            <p className="text-green-400/80 mt-0.5">{verifyResult.message}</p>
          </div>
        </div>
      )}

      {/* Mode toggle
      <div className="flex bg-surface-2 rounded-xl p-1 mb-6">
        <button
          onClick={() => setMode('buy')}
          className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            mode === 'buy' ? 'bg-brand text-white shadow-sm' : 'text-text-muted hover:text-text'
          }`}
        >
          <Zap className="w-4 h-4" />
          Buy Credits
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
      </div> */}

      {/* {mode === 'buy' ? ( */}
        <>
          {/* Packs grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {PACKS.map((pack, i) => (
              <button
                key={i}
                onClick={() => setSelected(i)}
                className={`relative rounded-xl p-4 text-left transition-all ${
                  selected === i
                    ? 'bg-brand/15 border-2 border-brand'
                    : 'bg-surface-2 border-2 border-transparent hover:border-surface-3'
                }`}
              >
                {pack.popular && (
                  <span className="absolute -top-2 right-3 bg-brand text-white text-xs px-2 py-0.5 rounded-full font-semibold">
                    Popular
                  </span>
                )}
                <p className="text-xl font-bold font-mono text-text">{pack.credits.toLocaleString()}</p>
                <p className="text-sm text-text-muted">credits</p>
                <p className="text-lg font-semibold text-brand mt-1">{pack.price}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleStartPurchase}
            className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors"
          >
            Purchase {PACKS[selected].credits.toLocaleString()} Credits for {PACKS[selected].price}
          </button>
        </>
      {/* )  */}
      {/* } */}
    </div>
  );
}

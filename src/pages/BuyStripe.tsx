import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, CheckCircle, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

const PACKS = [
  { credits: 5_000,   price: '$5.00',   dollars: 5,   popular: false },
  { credits: 10_000,  price: '$10.00',  dollars: 10,  popular: false },
  { credits: 25_000,  price: '$25.00',  dollars: 25,  popular: true  },
  { credits: 50_000,  price: '$50.00',  dollars: 50,  popular: false },
  { credits: 100_000, price: '$100.00', dollars: 100, popular: false },
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

  const [selected, setSelected] = useState(2); // default $25

  const [showModal, setShowModal] = useState(false);
  const [pendingPack, setPendingPack] = useState<typeof PACKS[0] | null>(null);
  const [startTimestamp, setStartTimestamp] = useState<number | null>(null);
  const [isWaitingForReturn, setIsWaitingForReturn] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

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
    setStartTimestamp(Date.now());
    window.open(url, '_blank', 'noopener,noreferrer');
    setShowModal(false);
    setIsWaitingForReturn(true);
  };

  const handleVerifyPayment = async () => {
    if (!pendingPack || !startTimestamp || !user) return;
    setIsVerifying(true);
    setVerifyResult(null);
    try {
      const response = await api.post<{ status?: string }>('/api/verify-stripe-payment', {
        timeRange: { start: startTimestamp, end: Date.now() },
        user: { id: user.id, username: user.username, email: user.email },
        packageData: { credits: pendingPack.credits, amount: pendingPack.dollars * 100, dollars: pendingPack.dollars },
      });
      if (response.status === 'succeeded') {
        setVerifyResult({
          success: true,
          message: `${pendingPack.credits.toLocaleString()} credits have been added to your account!`,
        });
        setIsWaitingForReturn(false);
        setPendingPack(null);
        setStartTimestamp(null);
      } else {
        setVerifyResult({ success: false, message: 'Payment not yet confirmed. Please wait a moment and try again.' });
      }
    } catch (err: unknown) {
      const e = err as { data?: { error?: string }; message?: string };
      setVerifyResult({
        success: false,
        message: e?.data?.error || e?.message || 'Verification failed. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

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
              A new payment window will open. Complete the payment there, then return here and click{' '}
              <span className="font-medium text-text">"I've Completed Payment"</span> to verify and receive your credits.
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
      {isWaitingForReturn && pendingPack && (
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

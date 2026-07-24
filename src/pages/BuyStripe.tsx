import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_ECONOMY_SETTINGS, fetchEconomySettings } from '../lib/economySettings';

const PACK_CONFIG = [
  { credits: 5_000, key: 'creditPack5000' as const, popular: false },
  { credits: 10_000, key: 'creditPack10000' as const, popular: false },
  { credits: 25_000, key: 'creditPack25000' as const, popular: true },
  { credits: 50_000, key: 'creditPack50000' as const, popular: false },
  { credits: 100_000, key: 'creditPack100000' as const, popular: false },
];

// Stripe test checkout payment link IDs
// const STRIPE_IDS: Record<number, string> = {
//   5_000:   'test_4gM4gs1lVbJMa7rgDD0sU04',
//   10_000:  'test_3cIeV6d4DdRU4N7gDD0sU03',
//   25_000:  'test_6oUcMY3u3g02frLaff0sU02',
//   50_000:  'test_eVq14g8OnbJM7Zjdrr0sU01',
//   100_000: 'test_4gM6oA2pZeVYfrLcnn0sU00',
// };

const STRIPE_IDS: Record<number, string> = {
  // 5_000:   'dRmeVeekngJ59WPfz89AA01',
  5_000:   '3cI4gA0tx50ngldev49AA0c',


  10_000:  '00wfZi2BF2Sf3yr4Uu9AA02',
  25_000:  'cNi28s4JN1Ob8SLbiS9AA06',
  50_000:  'fZu00k6RV64r8SL3Qq9AA03',
  100_000: '5kQ9AU5NRdwT4CvbiS9AA04',
};

export default function BuyStripe() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const getStripeUrl = (credits: number) => {
    const id = STRIPE_IDS[credits];
    return id ? `https://buy.stripe.com/${id}?client_reference_id=${user?.id}` : null;
  };

  const handleStartPurchase = () => {
    setPendingPack(PACKS[selected]);
    setShowModal(true);
  };

  const handleConfirmPurchase = () => {
    if (!pendingPack) return;
    const url = getStripeUrl(pendingPack.credits);
    if (!url) return;
    sessionStorage.setItem('stripe_pending_start', String(Date.now()));
    sessionStorage.setItem('stripe_pending_pack', JSON.stringify(pendingPack));
    setShowModal(false);
    window.location.assign(url);
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

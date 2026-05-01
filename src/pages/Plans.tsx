import { Check, Zap, Star, Crown, ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_ECONOMY_SETTINGS, fetchEconomySettings } from '../lib/economySettings';

interface Plan {
  id: string;
  name: string;
  price: string;
  interval: string;
  credits: string;
  icon: React.ReactNode;
  accentColor: string;
  borderClass: string;
  buttonClass: string;
  popular?: boolean;
  features: string[];
  stripePriceId?: string;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    interval: 'forever',
    credits: '1,000 credits/mo',
    icon: <Zap className="w-6 h-6" />,
    accentColor: 'text-text-muted',
    borderClass: 'border-surface-3',
    buttonClass: 'bg-surface-3 text-text-muted hover:bg-surface cursor-default',
    features: [
      '1,000 credits per month',
      'Ads displayed',
      'Standard quality only',
      'File size limits apply',
      'Watermarks on content',
      'Longest wait times',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: '$5',
    interval: '/mo',
    credits: '7,500 credits/mo',
    icon: <Star className="w-6 h-6" />,
    accentColor: 'text-blue-400',
    borderClass: 'border-blue-500/40',
    buttonClass: 'bg-blue-500 hover:bg-blue-400 text-white',
    popular: true,
    features: [
      '7,500 credits per month',
      'Ad free',
      'No daily limits',
      'No watermarks',
      'HD content quality',
      'Larger file size limits',
      'Faster processing',
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_STANDARD,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$10',
    interval: '/mo',
    credits: '15,000 credits/mo',
    icon: <Crown className="w-6 h-6" />,
    accentColor: 'text-brand',
    borderClass: 'border-brand/50',
    buttonClass: 'bg-brand hover:bg-orange-400 text-white',
    features: [
      '15,000 credits per month',
      'Everything in Standard',
      'No wait times',
      'Advanced content options',
      'Full HD & 4K quality',
      'Largest file limits (250 MB)',
      'Priority support',
    ],
    stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM,
  },
];

export default function Plans() {
  const { user } = useAuth();
  const currentPlan = (user?.accountType ?? 'free').toLowerCase();
  const [economy, setEconomy] = useState(DEFAULT_ECONOMY_SETTINGS);

  useEffect(() => {
    fetchEconomySettings().then(setEconomy);
  }, []);

  const displayPrice = (value: number) => `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;

  const plans = useMemo(() => {
    return PLANS.map((plan) => {
      if (plan.id === 'free') return { ...plan, price: displayPrice(economy.subscriptionPriceFree) };
      if (plan.id === 'standard') return { ...plan, price: displayPrice(economy.subscriptionPriceStandard) };
      if (plan.id === 'premium') return { ...plan, price: displayPrice(economy.subscriptionPricePremium) };
      return plan;
    });
  }, [economy]);

  const handleSubscribe = (plan: Plan) => {
    if (!plan.stripePriceId || plan.id === 'free') return;
    // Redirect to Stripe Checkout (replace with real checkout session endpoint when ready)
    const url = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/stripe/create-checkout?priceId=${plan.stripePriceId}&userId=${user?.id}`;
    window.location.href = url;
  };

  const handleManage = () => {
    const url = `${import.meta.env.VITE_API_URL ?? 'http://localhost:4000'}/api/stripe/portal?userId=${user?.id}`;
    window.location.href = url;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link
        to="/account"
        className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition mb-6 no-underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Account
      </Link>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-text mb-2">Choose Your Plan</h1>
        <p className="text-text-muted text-sm">Unlock more credits and features with a subscription.</p>
        {currentPlan !== 'free' && (
          <button
            onClick={handleManage}
            className="mt-4 text-sm text-brand hover:underline"
          >
            Manage or cancel your subscription →
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col bg-surface rounded-2xl border-2 p-6 transition ${plan.borderClass} ${
                plan.popular ? 'shadow-lg shadow-blue-500/10' : ''
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </div>
              )}

              {/* Current plan badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-surface-3 text-text-muted text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-surface-3">
                  Current Plan
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`${plan.accentColor}`}>{plan.icon}</div>
                <div>
                  <h2 className="text-lg font-bold text-text">{plan.name}</h2>
                  <p className="text-xs text-text-muted">{plan.credits}</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span className={`text-4xl font-bold font-mono ${plan.accentColor}`}>{plan.price}</span>
                <span className="text-text-muted text-sm ml-1">{plan.interval}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={`w-4 h-4 shrink-0 mt-0.5 ${plan.accentColor}`} />
                    <span className="text-text-muted">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                <div className="w-full py-2.5 rounded-xl text-center text-sm font-medium bg-surface-2 text-text-muted border border-surface-3">
                  ✓ Active
                </div>
              ) : plan.id === 'free' ? (
                <div className="w-full py-2.5 rounded-xl text-center text-sm font-medium bg-surface-2 text-text-muted">
                  Default
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${plan.buttonClass}`}
                >
                  {currentPlan === 'free' ? `Subscribe to ${plan.name}` : `Switch to ${plan.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-text-muted mt-8">
        Subscriptions are billed monthly and can be cancelled anytime from the billing portal.
        Credits reset each billing cycle and do not roll over.
      </p>
    </div>
  );
}

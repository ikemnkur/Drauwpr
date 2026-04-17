import { HelpCircle, Flame, Clock, Zap, DollarSign, Shield } from 'lucide-react';

const SECTIONS = [
  {
    icon: Flame,
    title: 'What is a Drop?',
    content:
      'A Drop is a file, app, game, or document uploaded by a creator with a future release time. The countdown clock ticks towards the drop — but contributors can speed it up by burning credits!',
  },
  {
    icon: Clock,
    title: 'How does the Burn Rate work?',
    content:
      'The base burn rate is 1:1 (1 real second = 1 clock second). When users contribute credits, they add Momentum that increases the burn rate. Momentum decays exponentially over hours, so sustained contributions keep the fire burning.',
  },
  {
    icon: Zap,
    title: 'What is the Spark Threshold?',
    content:
      'The countdown timer doesn\'t start until a minimum contribution goal ("Spark Threshold") is met. This ensures the creator gets baseline support. If the goal isn\'t met by the expiry date, credits are refunded.',
  },
  {
    icon: DollarSign,
    title: 'How is pricing calculated?',
    content:
      'Post-drop pricing combines three models: Contributor Discount (more you contributed = bigger discount), Time Decay (price drops daily), and Volume Decay (price drops as more people download). You always get the best price.',
  },
  {
    icon: Shield,
    title: 'Are my credits safe?',
    content:
      'Yes! Credits contributed to a drop that fails to meet its Spark Threshold are fully refunded to your wallet. We use Stripe and crypto payments for secure transactions.',
  },
];

export default function Help() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-text flex items-center gap-2 mb-6">
        <HelpCircle className="w-6 h-6 text-brand" />
        Help & Info
      </h1>

      <div className="space-y-4">
        {SECTIONS.map((s, i) => (
          <div key={i} className="bg-surface-2 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <s.icon className="w-5 h-5 text-brand shrink-0" />
              <h2 className="text-base font-semibold text-text">{s.title}</h2>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">{s.content}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-surface-2/50 border border-surface-3 rounded-xl p-6 text-center">
        <p className="text-sm text-text-muted">
          Still have questions? Contact us at{' '}
          <span className="text-brand font-medium">support@Drauwper.com</span>
        </p>
      </div>
    </div>
  );
}

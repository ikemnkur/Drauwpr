import { contributorDiscount, timeDecayPrice, volumeDecayPrice } from '../engine/burnRate';
import { DollarSign } from 'lucide-react';
import type { Drop } from '../types';

interface Props {
  drop: Drop;
  userContribution?: number;
}

export default function PriceDisplay({ drop, userContribution = 0 }: Props) {
  const hoursSinceRelease = Math.max(0, (Date.now() - drop.scheduledDropTime)) / 3_600_000;
  const basePrice = drop.basePrice;

  const contribPrice = contributorDiscount(basePrice, userContribution, drop.goalAmount);
  const timePrice = timeDecayPrice(basePrice, hoursSinceRelease);
  const volPrice = volumeDecayPrice(basePrice, drop.totalDownloads);

  // Best price for user
  const finalPrice = Math.round(Math.min(contribPrice, timePrice, volPrice));

  const toUsd = (credits: number) => `$${(credits / 1000).toFixed(2)}`;

  return (
    <div className="bg-surface-2 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="w-4 h-4 text-success" />
        <h3 className="text-sm font-semibold text-text">Download Price</h3>
      </div>

      <div className="text-3xl font-bold text-success font-mono mb-1">
        {finalPrice.toLocaleString()} <span className="text-sm text-text-muted">credits</span>
      </div>
      <p className="text-xs text-text-muted mb-3">≈ {toUsd(finalPrice)} USD</p>

      <div className="space-y-1.5 text-xs text-text-muted">
        <div className="flex justify-between">
          <span>Base price</span>
          <span className="font-mono">{basePrice.toLocaleString()}</span>
        </div>
        {userContribution > 0 && (
          <div className="flex justify-between text-brand">
            <span>Your contributor discount</span>
            <span className="font-mono">{Math.round(contribPrice).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Time decay ({hoursSinceRelease.toFixed(0)}h)</span>
          <span className="font-mono">{Math.round(timePrice).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Volume decay ({drop.totalDownloads.toLocaleString()} DLs)</span>
          <span className="font-mono">{Math.round(volPrice).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

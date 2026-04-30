import { contributorDiscount, timeDecayPrice, volumeDecayPrice } from '../engine/burnRate';
import { DollarSign } from 'lucide-react';
import type { Drop } from '../types';

interface PricePreviewLike {
  basePrice: number;
  contributorDiscountPct: number;
  timeDecayDiscountPct: number;
  volumeDecayDiscountPct: number;
  totalDiscountPct: number;
  finalPrice: number;
}

interface Props {
  drop: Drop;
  userContribution?: number;
  pricePreview?: PricePreviewLike | null;
}

export default function PriceDisplay({ drop, userContribution = 0, pricePreview = null }: Props) {
  const hoursSinceRelease = Math.max(0, (Date.now() - drop.scheduledDropTime)) / 3_600_000;
  const basePrice = drop.basePrice;

  const contribPrice = contributorDiscount(basePrice, userContribution, drop.goalAmount);
  const timePrice = timeDecayPrice(basePrice, hoursSinceRelease);
  const volPrice = volumeDecayPrice(basePrice, drop.totalDownloads);

  // Fallback local estimate only when backend preview is not yet available
  const estimatedFinalPrice = Math.round(Math.min(contribPrice, timePrice, volPrice));
  const displayBasePrice = pricePreview?.basePrice ?? basePrice;
  const finalPrice = pricePreview?.finalPrice ?? estimatedFinalPrice;

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
          <span className="font-mono">{displayBasePrice.toLocaleString()}</span>
        </div>
        {pricePreview ? (
          <>
            {pricePreview.contributorDiscountPct > 0 && (
              <div className="flex justify-between text-brand">
                <span>Contributor discount</span>
                <span className="font-mono">-{pricePreview.contributorDiscountPct.toFixed(1)}%</span>
              </div>
            )}
            {pricePreview.timeDecayDiscountPct > 0 && (
              <div className="flex justify-between">
                <span>Time discount</span>
                <span className="font-mono">-{pricePreview.timeDecayDiscountPct.toFixed(1)}%</span>
              </div>
            )}
            {pricePreview.volumeDecayDiscountPct > 0 && (
              <div className="flex justify-between">
                <span>Volume discount</span>
                <span className="font-mono">-{pricePreview.volumeDecayDiscountPct.toFixed(1)}%</span>
              </div>
            )}
            {pricePreview.totalDiscountPct > 0 && (
              <div className="flex justify-between font-semibold text-text">
                <span>Total discount</span>
                <span className="font-mono">-{pricePreview.totalDiscountPct.toFixed(1)}%</span>
              </div>
            )}
          </>
        ) : userContribution > 0 && (
          <div className="flex justify-between text-brand">
            <span>Your contributor discount</span>
            <span className="font-mono">{Math.round(contribPrice).toLocaleString()}</span>
          </div>
        )}
        {/* <div className="flex justify-between">
          <span>Time decay ({hoursSinceRelease.toFixed(0)}h)</span>
          <span className="font-mono">{Math.round(timePrice).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Volume decay ({drop.totalDownloads.toLocaleString()} DLs)</span>
          <span className="font-mono">{Math.round(volPrice).toLocaleString()}</span>
        </div> */}
      </div>
    </div>
  );
}

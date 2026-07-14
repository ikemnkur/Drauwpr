import { X, ExternalLink, Music } from 'lucide-react';

export interface SponsoredPromo {
  id: string;
  username: string | null;
  submissionType: 'ad' | 'post_sponsorship';
  title: string;
  description: string | null;
  targetPostId: string;
  target_url: string | null;
  ctaText: string | null;
  mediaUrl: string | null;
  assetPath: string | null;
  thumbnailPath?: string | null;
  thumbnailImg?: string | null;
  mediaType: string | null;
}

type MediaKind = 'image' | 'video' | 'audio';

type PromotionModalVariant = 'ad' | 'post_sponsorship';

interface PromotionModalProps {
  open: boolean;
  ad: SponsoredPromo | null;
  countdown: number;
  variant: PromotionModalVariant;
  onClose: () => void;
  onPrimaryAction: () => void;
  onReact?: (reaction: 'like' | 'neutral' | 'dislike') => void;
  resolveAssetUrl: (pathOrUrl: string | null, fallbackUrl: string | null) => string;
  detectMediaKind: (assetPath: string | null, mediaUrl: string | null, mediaType: string | null | undefined) => MediaKind;
  toEmbedUrl?: (url: string) => string | null;
  primaryLabel?: string;
  fallbackImageAlt?: string;
}

export default function PromotionModal({
  open,
  ad,
  countdown,
  variant,
  onClose,
  onPrimaryAction,
  onReact,
  resolveAssetUrl,
  detectMediaKind,
  toEmbedUrl,
  primaryLabel,
  fallbackImageAlt,
}: PromotionModalProps) {
  if (!open || !ad) return null;

  const mediaKind = detectMediaKind(ad.assetPath, ad.mediaUrl, ad.mediaType);
  const resolvedAudioUrl = resolveAssetUrl(ad.assetPath, ad.mediaUrl);
  const resolvedMediaUrl = resolveAssetUrl(ad.mediaUrl, null);
  const resolvedThumbnailUrl = resolveAssetUrl(ad.thumbnailPath || ad.thumbnailImg || null, ad.mediaUrl || ad.assetPath);
  const canClose = countdown === 0;
  const isAd = variant === 'ad';
  const label = isAd ? 'Ad' : 'Sponsored';
  const subtitle = isAd ? (ad.username || 'Advertiser') : (ad.username || 'Sponsor');
  const closeText = canClose ? 'Close' : `Close (${countdown}s)`;

  const renderMedia = () => {
    if (mediaKind === 'video') {
      const embedSrc = toEmbedUrl?.(resolvedMediaUrl);
      if (embedSrc) {
        const autoplaySrc = embedSrc.includes('?') ? `${embedSrc}&autoplay=1&mute=1` : `${embedSrc}?autoplay=1&mute=1`;
        return (
          <div className="aspect-[16/7] bg-black overflow-hidden">
            <iframe
              src={autoplaySrc}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={ad.title}
            />
          </div>
        );
      }

      if (!resolvedMediaUrl) {
        return (
          <div className="aspect-[16/7] bg-surface-2 overflow-hidden">
            <img
              src={resolvedThumbnailUrl}
              alt={fallbackImageAlt || ad.title}
              className="w-full h-full object-cover"
            />
          </div>
        );
      }

      return (
        <div className="aspect-[16/7] bg-black overflow-hidden">
          <video
            src={resolvedMediaUrl}
            className="w-full h-full object-cover"
            controls={variant === 'post_sponsorship'}
            autoPlay={variant === 'ad'}
            muted={variant === 'ad'}
            playsInline
            loop={variant === 'ad'}
            preload="metadata"
          />
        </div>
      );
    }

    if (mediaKind === 'audio') {
      return (
        <div className="bg-surface-2 px-5 py-8 flex flex-col items-center gap-4">
          <img
            src={resolvedThumbnailUrl}
            alt={fallbackImageAlt || ad.title}
            className="w-full max-h-48 object-cover rounded-lg"
          />
          <div className="w-14 h-14 rounded-full bg-brand/15 flex items-center justify-center">
            <Music className="w-7 h-7 text-brand" />
          </div>
          <p className="text-sm font-semibold text-text text-center line-clamp-1">{ad.title}</p>
          <audio src={resolvedAudioUrl} controls preload="metadata" className="w-full max-w-xs" />
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={onPrimaryAction}
        className="block w-full aspect-[16/7] bg-surface-2 overflow-hidden cursor-pointer group"
        aria-label={`Visit ${ad.title}`}
      >
        <img
          src={resolvedThumbnailUrl}
          alt={fallbackImageAlt || ad.title}
          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
        />
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        className="absolute inset-0 bg-black/65"
        onClick={onClose}
        aria-label={isAd ? 'Close advertisement' : 'Close ad'}
        disabled={!canClose}
      />
      <div className="relative w-full max-w-xl bg-surface border border-surface-3 rounded-2xl overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          disabled={!canClose}
          className={`absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full text-white transition z-10 ${
            canClose ? 'bg-black/50 hover:bg-black/70 cursor-pointer' : 'bg-black/40 cursor-not-allowed'
          }`}
          aria-label={canClose ? 'Close' : `Close in ${countdown}s`}
        >
          {canClose ? <X className="w-4 h-4" /> : <span className="text-xs font-bold">{countdown}</span>}
        </button>

        {renderMedia()}

        <div className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] uppercase tracking-wider font-bold text-text-muted/60 border border-surface-3 rounded px-1.5 py-0.5">
              {label}
            </span>
            <p className="text-[10px] text-text-muted/50 truncate">{subtitle}</p>
          </div>
          <h3 className="text-lg font-bold text-text">{ad.title}</h3>
          <p className="text-xs text-text-muted mt-1 line-clamp-2">{ad.description || ''}</p>

          {onReact && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onReact('like')}
                className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
              >
                Like
              </button>
              <button
                type="button"
                onClick={() => onReact('neutral')}
                className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
              >
                Neutral
              </button>
              <button
                type="button"
                onClick={() => onReact('dislike')}
                className="px-2.5 py-1 text-xs rounded-lg bg-surface-2 text-text-muted hover:text-text"
              >
                Dislike
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={onPrimaryAction}
              className="px-4 py-2 text-sm font-semibold rounded-lg bg-brand text-white hover:bg-brand-dark transition inline-flex items-center gap-2"
            >
              {primaryLabel || (isAd ? 'Visit Site' : 'Learn more')}
              {isAd ? null : <ExternalLink className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              disabled={!canClose}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition ${
                canClose ? 'bg-surface-2 text-text-muted hover:text-text cursor-pointer' : 'bg-surface-2 text-text-muted/50 cursor-not-allowed'
              }`}
            >
              {closeText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

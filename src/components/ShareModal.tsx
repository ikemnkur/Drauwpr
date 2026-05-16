import { useState } from 'react';
import { X, Link2, Check, MessageCircle, Send } from 'lucide-react';
import XIcon from '@mui/icons-material/X';
import FacebookIcon from '@mui/icons-material/Facebook';

interface Props {
  dropTitle: string;
  dropUrl: string;
  onClose: () => void;
}

const SHARE_CHANNELS = [
  {
    label: 'X / Twitter',
    icon: XIcon,
    color: 'hover:bg-[#1d9bf0]/10 hover:border-[#1d9bf0]/40 hover:text-[#1d9bf0]',
    href: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out "${title}" on Drauwper 🔥`)}&url=${encodeURIComponent(url)}`,
  },
  {
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'hover:bg-[#25d366]/10 hover:border-[#25d366]/40 hover:text-[#25d366]',
    href: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(`Check out "${title}" on Drauwper 🔥 ${url}`)}`,
  },
  {
    label: 'Facebook',
    icon: FacebookIcon,
    color: 'hover:bg-[#1877f2]/10 hover:border-[#1877f2]/40 hover:text-[#1877f2]',
    href: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    label: 'Telegram',
    icon: Send,
    color: 'hover:bg-[#2aabee]/10 hover:border-[#2aabee]/40 hover:text-[#2aabee]',
    href: (url: string, title: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`Check out "${title}" on Drauwper 🔥`)}`,
  },
];

export default function ShareModal({ dropTitle, dropUrl, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dropUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = dropUrl;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-surface-3 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-bold text-text">Share Drop</h2>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Drop title preview */}
          <p className="text-sm text-text-muted">
            Share <span className="font-semibold text-text">"{dropTitle}"</span> with others.
          </p>

          {/* Copy link row */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface-2 border border-surface-3 rounded-xl px-3 py-2.5 text-sm text-text-muted truncate font-mono select-all">
              {dropUrl}
            </div>
            <button
              onClick={handleCopy}
              className={[
                'shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition',
                copied
                  ? 'bg-green-500/20 border border-green-500/40 text-green-400'
                  : 'bg-brand/10 border border-brand/30 text-brand hover:bg-brand/20 hover:border-brand/50',
              ].join(' ')}
            >
              {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-3" />
            <span className="text-xs text-text-muted">or share via</span>
            <div className="flex-1 h-px bg-surface-3" />
          </div>

          {/* Social buttons */}
          <div className="grid grid-cols-2 gap-2">
            {SHARE_CHANNELS.map(({ label, icon: Icon, color, href }) => (
              <a
                key={label}
                href={href(dropUrl, dropTitle)}
                target="_blank"
                rel="noopener noreferrer"
                className={[
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border border-surface-3 text-sm text-text-muted transition',
                  color,
                ].join(' ')}
              >
                <Icon className="w-4 h-4 shrink-0" style={{ fontSize: 16 }} />
                {label}
              </a>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

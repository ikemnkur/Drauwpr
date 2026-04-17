import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SocialIcon } from 'react-social-icons';
import {
  ArrowLeft, Eye, Save, User, Link as LinkIcon,
  Video, Image, Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { SocialLinks } from '../types';

interface ProfileForm {
  bio: string;
  bioVideoUrl: string;
  bannerUrl: string;
  avatarUrl: string;
  socialLinks: Required<SocialLinks>;
}

const EMPTY_SOCIAL: Required<SocialLinks> = {
  twitter: '', instagram: '', youtube: '', github: '', tiktok: '', discord: '', website: '',
};

interface ServerProfile {
  bio: string | null;
  bioVideoUrl: string | null;
  bannerUrl: string | null;
  profilePicture: string | null;
  socialLinks: string | Record<string, string> | null;
}

const SOCIAL_FIELDS: {
  key: keyof SocialLinks;
  label: string;
  placeholder: string;
  network?: string;
  LucideIcon?: React.ElementType;
}[] = [
  { key: 'website',   label: 'Website',        placeholder: 'https://yoursite.com',               LucideIcon: Globe },
  { key: 'twitter',   label: 'Twitter / X',    placeholder: 'https://x.com/yourhandle',          network: 'twitter' },
  { key: 'instagram', label: 'Instagram',      placeholder: 'https://instagram.com/yourhandle',  network: 'instagram' },
  { key: 'youtube',   label: 'YouTube',        placeholder: 'https://youtube.com/c/yourchannel', network: 'youtube' },
  { key: 'github',    label: 'GitHub',         placeholder: 'https://github.com/yourhandle',     network: 'github' },
  { key: 'tiktok',    label: 'TikTok',         placeholder: 'https://tiktok.com/@yourhandle',    network: 'tiktok' },
  { key: 'discord',   label: 'Discord Server', placeholder: 'https://discord.gg/yourserver',     network: 'discord' },
];

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [form, setForm] = useState<ProfileForm>({
    bio: '',
    bioVideoUrl: '',
    bannerUrl: '',
    avatarUrl: '',
    socialLinks: { ...EMPTY_SOCIAL },
  });

  useEffect(() => {
    if (!user) return;
    api.get<ServerProfile>(`/api/users/${user.id}`)
      .then(p => {
        const raw = p.socialLinks;
        const social: Required<SocialLinks> = {
          ...EMPTY_SOCIAL,
          ...(typeof raw === 'string' ? (JSON.parse(raw || '{}') as SocialLinks) : (raw ?? {})),
        };
        setForm({
          bio: p.bio || '',
          bioVideoUrl: p.bioVideoUrl || '',
          bannerUrl: p.bannerUrl || '',
          avatarUrl: p.profilePicture || user.avatar || '',
          socialLinks: social,
        });
      })
      .catch(() => {
        setForm(f => ({ ...f, avatarUrl: user.avatar || '' }));
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    navigate('/login');
    return null;
  }

  const set = <K extends keyof ProfileForm>(field: K, value: ProfileForm[K]) =>
    setForm(f => ({ ...f, [field]: value }));

  const setSocial = (key: keyof SocialLinks, value: string) =>
    setForm(f => ({ ...f, socialLinks: { ...f.socialLinks, [key]: value } }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await api.put('/api/users/profile', {
        bio: form.bio,
        bioVideoUrl: form.bioVideoUrl || null,
        bannerUrl: form.bannerUrl || null,
        profilePicture: form.avatarUrl || null,
        socialLinks: form.socialLinks,
      });
      navigate(`/user/${user.id}`);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted">Loading profile…</p>
      </div>
    );
  }

  const avatarPreviewOk = !!form.avatarUrl;
  const bannerPreviewOk = !!form.bannerUrl;

  return (
    <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text transition no-underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Account
        </Link>
        <Link
          to={`/user/${user.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-brand transition no-underline"
        >
          <Eye className="w-4 h-4" />
          Preview Profile
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-text">Edit Profile</h1>

      {/* Images */}
      <section className="bg-surface-2 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <Image className="w-4 h-4 text-brand" />
          Images
        </h2>

        {/* Avatar */}
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Avatar URL</label>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-surface-3 border-2 border-surface-3 overflow-hidden shrink-0 flex items-center justify-center text-xl font-bold text-brand">
              {avatarPreviewOk
                ? <img
                    src={form.avatarUrl}
                    alt="avatar preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                : user.username[0].toUpperCase()
              }
            </div>
            <input
              type="url"
              value={form.avatarUrl}
              onChange={e => set('avatarUrl', e.target.value)}
              placeholder="https://…"
              className="flex-1 px-3 py-2 rounded-xl bg-surface-3 border border-surface-3 focus:border-brand text-sm text-text outline-none transition"
            />
          </div>
        </div>

        {/* Banner */}
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Banner Image URL</label>
          <input
            type="url"
            value={form.bannerUrl}
            onChange={e => set('bannerUrl', e.target.value)}
            placeholder="https://… (1280×320 recommended)"
            className="w-full px-3 py-2 rounded-xl bg-surface-3 border border-surface-3 focus:border-brand text-sm text-text outline-none transition"
          />
          <div
            className="h-16 rounded-xl mt-2 border border-surface-3 overflow-hidden"
            style={bannerPreviewOk
              ? { backgroundImage: `url(${form.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: 'linear-gradient(90deg, rgba(249,115,22,0.2), rgba(249,115,22,0.05))' }}
          >
            {!bannerPreviewOk && (
              <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                Banner preview
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="bg-surface-2 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <User className="w-4 h-4 text-brand" />
          About
        </h2>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Bio</label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="Tell people about yourself…"
            className="w-full px-3 py-2 rounded-xl bg-surface-3 border border-surface-3 focus:border-brand text-sm text-text outline-none transition resize-none"
          />
          <p className="text-xs text-text-muted text-right mt-1">{form.bio.length}/500</p>
        </div>
      </section>

      {/* Bio Video */}
      <section className="bg-surface-2 rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <Video className="w-4 h-4 text-brand" />
          Intro Video
        </h2>
        <div>
          <label className="block text-xs text-text-muted mb-1.5">YouTube Embed URL</label>
          <input
            type="url"
            value={form.bioVideoUrl}
            onChange={e => set('bioVideoUrl', e.target.value)}
            placeholder="https://www.youtube.com/embed/VIDEO_ID"
            className="w-full px-3 py-2 rounded-xl bg-surface-3 border border-surface-3 focus:border-brand text-sm text-text outline-none transition"
          />
          <p className="text-xs text-text-muted mt-1">
            On YouTube: Share → Embed → copy the <code className="bg-surface-3 px-1 rounded">src</code> URL
          </p>
        </div>
        {form.bioVideoUrl && (
          <div className="aspect-video rounded-xl overflow-hidden border border-surface-3">
            <iframe
              src={form.bioVideoUrl}
              title="Bio video preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        )}
      </section>

      {/* Social Links */}
      <section className="bg-surface-2 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-brand" />
          Social Links
        </h2>
        {SOCIAL_FIELDS.map(({ key, label, placeholder, network, LucideIcon }) => (
          <div key={key} className="flex items-center gap-3">
            <span className="shrink-0 flex items-center justify-center" style={{ pointerEvents: 'none' }}>
              {network
                ? <SocialIcon network={network} style={{ height: 28, width: 28 }} />
                : LucideIcon ? <LucideIcon className="w-4 h-4 text-text-muted" /> : null
              }
            </span>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">{label}</label>
              <input
                type="url"
                value={form.socialLinks[key] ?? ''}
                onChange={e => setSocial(key, e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl bg-surface-3 border border-surface-3 focus:border-brand text-sm text-text outline-none transition"
              />
            </div>
          </div>
        ))}
      </section>

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          {saveError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-xl bg-brand hover:bg-orange-400 text-white font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <Link
          to={`/user/${user.id}`}
          className="px-5 py-3 rounded-xl bg-surface-2 border border-surface-3 text-sm text-text-muted hover:text-text transition no-underline flex items-center gap-1.5"
        >
          <Eye className="w-4 h-4" />
          Preview
        </Link>
      </div>
    </div>
  );
}

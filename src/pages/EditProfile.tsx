import { useState, useEffect, useRef } from 'react';
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
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const bannerInputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [avatarDragOver, setAvatarDragOver] = useState(false);
  const [bannerDragOver, setBannerDragOver] = useState(false);
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

  const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image file'));
    };
    img.src = objectUrl;
  });

  const canvasToFile = async (canvas: HTMLCanvasElement, filenameBase: string): Promise<File> => {
    const qualitySteps = [0.88, 0.82, 0.76, 0.7];
    const maxBytes = 1_500_000;

    for (const quality of qualitySteps) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/webp', quality);
      });
      if (blob && blob.size <= maxBytes) {
        return new File([blob], `${filenameBase}.webp`, { type: 'image/webp' });
      }
    }

    const fallbackBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.65);
    });
    if (!fallbackBlob) throw new Error('Could not process image');
    return new File([fallbackBlob], `${filenameBase}.webp`, { type: 'image/webp' });
  };

  const preprocessImage = async (kind: 'avatar' | 'banner', file: File): Promise<File> => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload an image file');
    }

    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image processing not supported in this browser');

    if (kind === 'avatar') {
      const size = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = Math.floor((img.naturalWidth - size) / 2);
      const sy = Math.floor((img.naturalHeight - size) / 2);
      const outputSize = 512;

      canvas.width = outputSize;
      canvas.height = outputSize;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, outputSize, outputSize);
      return canvasToFile(canvas, 'avatar');
    }

    const ratio = 4; // 4:1 banner crop
    const sourceRatio = img.naturalWidth / img.naturalHeight;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (sourceRatio > ratio) {
      sw = Math.floor(img.naturalHeight * ratio);
      sx = Math.floor((img.naturalWidth - sw) / 2);
    } else {
      sh = Math.floor(img.naturalWidth / ratio);
      sy = Math.floor((img.naturalHeight - sh) / 2);
    }

    canvas.width = 1600;
    canvas.height = 400;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvasToFile(canvas, 'banner');
  };

  const uploadImage = async (kind: 'avatar' | 'banner', file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const endpoint = kind === 'avatar'
      ? '/api/users/profile/avatar-upload'
      : '/api/users/profile/banner-upload';

    const result = await api.upload<{ url?: string }>(endpoint, formData);
    if (!result?.url) throw new Error('Upload succeeded but no URL was returned');
    return result.url;
  };

  const processAndUpload = async (kind: 'avatar' | 'banner', file: File) => {
    const optimizedFile = await preprocessImage(kind, file);
    return uploadImage(kind, optimizedFile);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaveError('');
    setUploadingAvatar(true);
    try {
      const url = await processAndUpload('avatar', file);
      set('avatarUrl', url);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaveError('');
    setUploadingBanner(true);
    try {
      const url = await processAndUpload('banner', file);
      set('bannerUrl', url);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
      e.target.value = '';
    }
  };

  const handleAvatarDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setAvatarDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setSaveError('');
    setUploadingAvatar(true);
    try {
      const url = await processAndUpload('avatar', file);
      set('avatarUrl', url);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setBannerDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    setSaveError('');
    setUploadingBanner(true);
    try {
      const url = await processAndUpload('banner', file);
      set('bannerUrl', url);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

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
          <label className="block text-xs text-text-muted mb-1.5">Profile Picture</label>
          <div
            className={`flex items-center gap-3 rounded-xl border border-dashed p-3 transition ${avatarDragOver ? 'border-brand bg-brand/10' : 'border-surface-3 bg-surface-3/30'}`}
            onDragOver={(e) => { e.preventDefault(); setAvatarDragOver(true); }}
            onDragLeave={() => setAvatarDragOver(false)}
            onDrop={handleAvatarDrop}
          >
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
            <div className="flex-1 flex items-center justify-end gap-2">
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="px-3 py-2 rounded-xl bg-brand hover:bg-orange-400 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {uploadingAvatar ? 'Uploading…' : 'Upload Picture'}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-text-muted mt-1">Drag and drop an image or click Upload Picture. It is auto-cropped to 1:1 and compressed before upload.</p>
        </div>

        {/* Banner */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-text-muted">Banner Image</label>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handleBannerUpload}
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="px-3 py-2 rounded-xl bg-brand hover:bg-orange-400 text-white text-xs font-semibold transition disabled:opacity-50"
            >
              {uploadingBanner ? 'Uploading…' : 'Upload Banner'}
            </button>
          </div>
          <div
            className={`h-16 rounded-xl mt-2 border border-dashed overflow-hidden transition ${bannerDragOver ? 'border-brand bg-brand/10' : 'border-surface-3'}`}
            onDragOver={(e) => { e.preventDefault(); setBannerDragOver(true); }}
            onDragLeave={() => setBannerDragOver(false)}
            onDrop={handleBannerDrop}
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
          <p className="text-[11px] text-text-muted mt-1">Drop a banner here or click Upload Banner. It is center-cropped to 4:1 and compressed before upload.</p>
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

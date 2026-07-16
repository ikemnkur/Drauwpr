import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, Upload, Film, Image, Link2, Crown, Lock, Tag, X } from 'lucide-react';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import { useAuth } from '../context/AuthContext';
import type { Drop } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';
const FILE_TYPES = ['game', 'app', 'document', 'music', 'video', 'audio', 'image', 'picture', 'other', 'link'] as const;

type TrailerMode = 'link' | 'upload';
type MainAssetMode = 'file' | 'link';

function resolveAssetUrl(raw: string): string {
  const t = String(raw || '').trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (t.startsWith('/')) return `${API_BASE}${t}`;
  return `${API_BASE}/${t}`;
}

export default function EditDrop() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [drop, setDrop] = useState<Drop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState<(typeof FILE_TYPES)[number]>('other');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [isMature, setIsMature] = useState(false);

  const [durationDays, setDurationDays] = useState('7');
  

  const [mainAssetMode, setMainAssetMode] = useState<MainAssetMode>('file');
  const [dropFile, setDropFile] = useState<File | null>(null);
  const [dropFileName, setDropFileName] = useState('');
  const [dropFileSize, setDropFileSize] = useState('');
  const [dropFileMime, setDropFileMime] = useState('application/octet-stream');
  const [linkUrl, setLinkUrl] = useState('');

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerName, setBannerName] = useState('');

  const [trailerMode, setTrailerMode] = useState<TrailerMode>('link');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [trailerFileName, setTrailerFileName] = useState('');
  const [trailerFileSize, setTrailerFileSize] = useState('');

  const [uploadStep, setUploadStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const dropInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const trailerInputRef = useRef<HTMLInputElement>(null);

  const plan = String(user?.accountPlan || '').toLowerCase();
  const isPremium = plan === 'premium';
  const isStandardOrAbove = plan === 'standard' || plan === 'premium' || plan === 'admin';

  const isCreator = useMemo(() => {
    if (!drop || !user) return false;
    return drop.creatorId === user.id;
  }, [drop, user]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    api.get<ServerDrop>(`/api/drops/${id}`)
      .then((raw) => {
        if (cancelled) return;
        const d = mapDrop(raw);
        setDrop(d);
        setTitle(d.title);
        setDescription(d.description);
        setFileType(d.fileType);
        setTags(Array.isArray(d.tags) ? d.tags : []);
        setGoalAmount(String(d.goalAmount));
        setBasePrice(String(d.basePrice));
        setIsMature(Boolean(d.mature));
        setTrailerUrl(String(d.trailerUrl || '').trim());

        const initialLink = String(d.link || '').trim();
        if (d.fileType === 'link' || initialLink) {
          setMainAssetMode('link');
          setLinkUrl(initialLink);
          setFileType('link');
        } else {
          setMainAssetMode('file');
        }

        if (d.trailerUrl && /^https?:\/\//i.test(d.trailerUrl) && /youtube\.com|youtu\.be/i.test(d.trailerUrl)) {
          setTrailerMode('link');
        }

        const msUntilDrop = Math.max(24 * 60 * 60 * 1000, d.scheduledDropTime - Date.now());
        const dayGuess = Math.min(90, Math.max(1, Math.round(msUntilDrop / (24 * 60 * 60 * 1000))));
        setDurationDays(String(dayGuess));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load drop';
        setError(msg || 'Drop not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const assignDropFile = (f: File) => {
    setDropFile(f);
    setDropFileName(f.name);
    setDropFileMime(f.type || 'application/octet-stream');
    const mb = f.size / (1024 * 1024);
    setDropFileSize(mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`);
  };

  const assignBannerFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setError('Banner/thumbnail must be an image file.');
      return;
    }
    setError('');
    setBannerFile(f);
    setBannerName(f.name);
  };

  const assignTrailerFile = (f: File) => {
    if (!f.type.startsWith('video/')) {
      setError('Trailer must be a video file.');
      return;
    }
    setError('');
    setTrailerFile(f);
    setTrailerFileName(f.name);
    const mb = f.size / (1024 * 1024);
    setTrailerFileSize(mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`);
  };

  const addTag = () => {
    const normalized = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (normalized && !tags.includes(normalized) && tags.length < 8) {
      setTags([...tags, normalized]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((current) => current !== tag));
  };

  const canSave = !!drop && isCreator && !saving && title.trim() && description.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !drop || !canSave) return;

    if (!isStandardOrAbove && (bannerFile || dropFile || trailerFile || trailerUrl.trim() || mainAssetMode === 'link')) {
      setError('Media editing is available for Standard and Premium plans.');
      return;
    }

    if (mainAssetMode === 'link' && !linkUrl.trim()) {
      setError('Please provide a valid external link when using Link mode.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);
    setUploadProgress(0);
    setUploadStep('');

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        tags,
        isMature
      };

      if (isStandardOrAbove) {
        payload.fileType = mainAssetMode === 'link' ? 'link' : fileType;
        payload.link = mainAssetMode === 'link' ? linkUrl.trim() : null;
        payload.trailerUrl = trailerMode === 'link' ? trailerUrl.trim() || null : null;
      }

      if (isPremium) {
        payload.goalAmount = Number(goalAmount || 0);
        payload.basePrice = Number(basePrice || 0);

        const durMs = Number(durationDays || 7) * 24 * 60 * 60 * 1000;
        const now = Date.now();
        payload.scheduledDropTime = new Date(now + durMs).toISOString();
        payload.expiresAt = new Date(now + durMs + 2 * 24 * 60 * 60 * 1000).toISOString();
      }

      setUploadStep('Saving base fields…');
      await api.put(`/api/drops/${id}`, payload);

      if (isStandardOrAbove && bannerFile) {
        setUploadStep('Uploading banner…');
        const token = localStorage.getItem('drauwper_token');
        const form = new FormData();
        form.append('banner', bannerFile);
        const resp = await fetch(`${API_BASE}/api/drops/${id}/banner`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error || 'Banner upload failed');
        }
      }

      if (isStandardOrAbove && trailerMode === 'upload' && trailerFile) {
        setUploadStep('Uploading trailer…');
        const token = localStorage.getItem('drauwper_token');
        const form = new FormData();
        form.append('trailer', trailerFile, trailerFile.name);
        const resp = await fetch(`${API_BASE}/api/drops/${id}/trailer`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!resp.ok) {
          const body = await resp.json().catch(() => ({}));
          throw new Error(body.error || 'Trailer upload failed');
        }
      }

      if (isStandardOrAbove && mainAssetMode === 'file' && dropFile) {
        setUploadStep('Preparing file upload…');
        const { uploadUrl } = await api.post<{ uploadUrl: string }>(`/api/drops/${id}/upload-url`, {
          fileName: dropFile.name,
          fileType: dropFileMime,
          fileSize: dropFile.size,
        });

        setUploadStep('Uploading main file…');
        await uploadToStorage(uploadUrl, dropFile, dropFileMime, setUploadProgress);

        setUploadStep('Finalizing file upload…');
        await api.post(`/api/drops/${id}/confirm-upload`, {
          originalFileName: dropFile.name,
        });
      }

      setUploadStep('Done');
      setSuccess(true);
      setTimeout(() => navigate(`/drop/${id}`), 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save changes';
      setError(msg);
    } finally {
      setSaving(false);
      setTimeout(() => setUploadStep(''), 500);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!drop) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="text-danger mb-4">{error || 'Drop not found'}</p>
        <Link to="/dashboard" className="text-brand hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const bannerUrl = resolveAssetUrl(drop.thumbnailUrl || '');

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition no-underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-text mb-2">Edit Drop</h1>
      <p className="text-sm text-text-muted mb-6">Update your media and pricing settings.</p>

      {!isCreator && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          You are not the creator of this drop.
        </div>
      )}

      {!isStandardOrAbove && (
        <div className="mb-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Media replacement (banner, trailer, drop file/link) requires Standard or Premium.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">Basic</h2>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Tags (up to 8)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 bg-surface-2 text-text-muted text-xs px-2.5 py-1 rounded-full"
                >
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400 transition">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Add a tag, press Enter"
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg pl-8 pr-3 py-2 text-sm text-text placeholder-text-muted/50 focus:outline-none focus:border-brand"
                />
              </div>
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-2 rounded-lg bg-surface-2 border border-surface-3 text-sm text-text-muted hover:text-brand hover:border-brand/50 transition"
              >
                Add
              </button>
            </div>

            {/* Mature Content */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="mature"
                checked={isMature}
                onChange={(e) => setIsMature(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="mature" className="text-sm text-text-muted">
               Check if this drop contains mature content
              </label>
            </div>
          </div>
        </section>

        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Image className="w-4 h-4" /> Banner / Thumbnail (Standard+)
          </h2>

          {bannerUrl && (
            <div className="rounded-xl overflow-hidden border border-surface-3 h-32 bg-surface-2">
              <img src={bannerUrl} alt="Current banner" className="w-full h-full object-cover" />
            </div>
          )}

          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) assignBannerFile(f);
            }}
            disabled={!isStandardOrAbove || !isCreator}
          />
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            disabled={!isStandardOrAbove || !isCreator}
            className="w-full border border-dashed rounded-xl h-20 flex items-center justify-center gap-2 text-sm transition border-surface-3 text-text-muted enabled:hover:border-brand/50 enabled:hover:text-brand disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {bannerName || 'Choose replacement banner image'}
          </button>
        </section>

        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Main Drop Asset (Standard+)
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMainAssetMode('file')}
              disabled={!isStandardOrAbove || !isCreator}
              className={`rounded-lg border px-3 py-2 text-sm transition ${mainAssetMode === 'file'
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-surface-3 text-text-muted'} disabled:opacity-50`}
            >
              Replace File
            </button>
            <button
              type="button"
              onClick={() => {
                setMainAssetMode('link');
                setFileType('link');
              }}
              disabled={!isStandardOrAbove || !isCreator}
              className={`rounded-lg border px-3 py-2 text-sm transition ${mainAssetMode === 'link'
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-surface-3 text-text-muted'} disabled:opacity-50`}
            >
              Use Link
            </button>
          </div>

          {mainAssetMode === 'file' ? (
            <>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">File Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as (typeof FILE_TYPES)[number])}
                  disabled={!isStandardOrAbove || !isCreator}
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-50"
                >
                  {FILE_TYPES.filter((x) => x !== 'link').map((ft) => (
                    <option key={ft} value={ft}>{ft}</option>
                  ))}
                </select>
              </div>

              <input
                ref={dropInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) assignDropFile(f);
                }}
                disabled={!isStandardOrAbove || !isCreator}
              />
              <button
                type="button"
                onClick={() => dropInputRef.current?.click()}
                disabled={!isStandardOrAbove || !isCreator}
                className="w-full border border-dashed rounded-xl h-24 flex items-center justify-center gap-2 text-sm transition border-surface-3 text-text-muted enabled:hover:border-brand/50 enabled:hover:text-brand disabled:opacity-50"
              >
                <Upload className="w-5 h-5" />
                {dropFileName || 'Choose replacement main file'}
              </button>
              {dropFileSize && <p className="text-xs text-text-muted">Selected: {dropFileSize}</p>}
            </>
          ) : (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">External Download Link</label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com/my-file"
                disabled={!isStandardOrAbove || !isCreator}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-50"
              />
            </div>
          )}
        </section>

        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Film className="w-4 h-4" /> Trailer (Standard+)
          </h2>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTrailerMode('link')}
              disabled={!isStandardOrAbove || !isCreator}
              className={`rounded-lg border px-3 py-2 text-sm transition ${trailerMode === 'link'
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-surface-3 text-text-muted'} disabled:opacity-50`}
            >
              Embed / Link
            </button>
            <button
              type="button"
              onClick={() => setTrailerMode('upload')}
              disabled={!isStandardOrAbove || !isCreator}
              className={`rounded-lg border px-3 py-2 text-sm transition ${trailerMode === 'upload'
                ? 'border-brand bg-brand/10 text-brand'
                : 'border-surface-3 text-text-muted'} disabled:opacity-50`}
            >
              Upload Video
            </button>
          </div>

          {trailerMode === 'link' ? (
            <input
              type="url"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              disabled={!isStandardOrAbove || !isCreator}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-50"
            />
          ) : (
            <>
              <input
                ref={trailerInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) assignTrailerFile(f);
                }}
                disabled={!isStandardOrAbove || !isCreator}
              />
              <button
                type="button"
                onClick={() => trailerInputRef.current?.click()}
                disabled={!isStandardOrAbove || !isCreator}
                className="w-full border border-dashed rounded-xl h-24 flex items-center justify-center gap-2 text-sm transition border-surface-3 text-text-muted enabled:hover:border-brand/50 enabled:hover:text-brand disabled:opacity-50"
              >
                <Film className="w-5 h-5" />
                {trailerFileName || 'Choose replacement trailer video'}
              </button>
              {trailerFileSize && <p className="text-xs text-text-muted">Selected: {trailerFileSize}</p>}
            </>
          )}
        </section>

        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4 relative">
          {!isPremium && (
            <div className="absolute inset-0 rounded-2xl bg-surface/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
              <div className="flex items-center gap-2 bg-[#1e1e2e] border border-brand/30 rounded-xl px-4 py-2.5 shadow-lg">
                <Crown className="w-4 h-4 text-brand" />
                <span className="text-sm font-semibold text-brand">Premium only</span>
                <Lock className="w-3.5 h-3.5 text-text-muted ml-1" />
              </div>
              <p className="text-xs text-text-muted">Goal amount, price, and countdown editing require Premium.</p>
            </div>
          )}

          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Crown className="w-4 h-4 text-brand" /> Premium Controls
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Drop Goal Amount (credits)</label>
              <input
                type="number"
                min={1000}
                step={100}
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                disabled={!isPremium || !isCreator}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Drop Price (credits)</label>
              <input
                type="number"
                min={100}
                step={1}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                disabled={!isPremium || !isCreator}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Countdown (days until drop)</label>
            <input
              type="number"
              min={1}
              max={90}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              disabled={!isPremium || !isCreator}
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand disabled:opacity-50"
            />
          </div>
        </section>

        {saving && uploadStep && (
          <div className="w-full">
            <div className="flex justify-between text-xs text-text-muted mb-1">
              <span>{uploadStep}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div className="h-full bg-brand transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-green-400">Changes saved successfully. Redirecting…</p>}

        <button
          type="submit"
          disabled={!canSave}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${canSave
            ? 'bg-brand text-white hover:bg-brand-dark'
            : 'bg-surface-3 text-text-muted cursor-not-allowed'}`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

function uploadToStorage(
  signedUrl: string,
  file: File,
  mimeType: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error during file upload'));
    xhr.send(file);
  });
}

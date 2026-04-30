import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Film,
  Image,
  FileText,
  Tag,
  DollarSign,
  Clock,
  X,
  Flame,
  CheckCircle,
} from 'lucide-react';
import { api } from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || '';

const FILE_TYPES = ['game', 'app', 'document', 'music', 'video', 'other'] as const;

export default function CreateDrop() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [fileType, setFileType] = useState<(typeof FILE_TYPES)[number]>('game');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [goalAmount, setGoalAmount] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [bannerName, setBannerName] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [dropFile, setDropFile] = useState<File | null>(null);
  const [dropFileMime, setDropFileMime] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdDropId, setCreatedDropId] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setDropFile(f);
    setDropFileMime(f.type || 'application/octet-stream');
    const mb = f.size / (1024 * 1024);
    setFileSize(mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`);
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBannerName(f.name);
    setBannerFile(f);
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const canSubmit = title.trim() && summary.trim() && fileName && goalAmount && basePrice && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError('');
    setSubmitting(true);
    setUploadProgress(0);
    setUploadStep('');

    try {
      const durationMs = Number(durationDays) * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const scheduledDropTime = new Date(now + durationMs).toISOString();
      const expiresAt = new Date(now + durationMs + 2 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Create the drop record
      setUploadStep('Creating drop…');
      const { id: dropId } = await api.post<{ id: string; message: string }>('/api/drops', {
        title: title.trim(),
        description: summary.trim(),
        fileType,
        tags,
        goalAmount: Number(goalAmount),
        basePrice: Number(basePrice),
        scheduledDropTime,
        expiresAt,
        trailerUrl: trailerUrl.trim() || null,
      });

      setCreatedDropId(dropId);

      // 2. Upload banner if selected
      if (bannerFile) {
        setUploadStep('Uploading banner…');
        const token = localStorage.getItem('drauwper_token');
        const form = new FormData();
        form.append('banner', bannerFile);
        await fetch(`${API_BASE}/api/drops/${dropId}/banner`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
      }

      // 3. Upload the drop file to GCS
      if (dropFile) {
        const mimeType = dropFileMime || 'application/octet-stream';

        setUploadStep('Preparing upload…');
        const { uploadUrl } = await api.post<{ uploadUrl: string; gcsPath: string }>(
          `/api/drops/${dropId}/upload-url`,
          { fileName: dropFile.name, fileType: mimeType, fileSize: dropFile.size }
        );

        setUploadStep('Uploading file…');
        await uploadToGCS(uploadUrl, dropFile, mimeType, setUploadProgress);

        setUploadStep('Confirming upload…');
        await api.post(`/api/drops/${dropId}/confirm-upload`, {
          originalFileName: dropFile.name,
        });
      }

      // 4. Publish (draft → pending)
      setUploadStep('Publishing…');
      await api.post(`/api/drops/${dropId}/publish`);

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create drop';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
      setUploadStep('');
    }
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold text-text">Drop Created!</h1>
        <p className="text-text-muted text-sm">
          Your drop <span className="text-brand font-semibold">{title}</span> is now live and
          awaiting contributions on the Drauwper marketplace.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => navigate(`/drop/${createdDropId}`)}
            className="px-5 py-2 rounded-lg bg-brand text-white font-medium text-sm hover:bg-brand-dark transition"
          >
            View Drop
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-5 py-2 rounded-lg bg-surface-2 text-text-muted font-medium text-sm hover:text-text border border-surface-3 transition"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => {
              setSubmitted(false);
              setTitle('');
              setSummary('');
              setFileName('');
              setFileSize('');
              setBannerName('');
              setBannerFile(null);
              setDropFile(null);
              setTags([]);
              setGoalAmount('');
              setBasePrice('');
              setTrailerUrl('');
              setDurationDays('7');
              setCreatedDropId('');
              setSubmitError('');
            }}
            className="px-5 py-2 rounded-lg bg-surface-2 text-text-muted font-medium text-sm hover:text-text border border-surface-3 transition"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <div className="flex items-center gap-3 mb-6">
        <Flame className="w-6 h-6 text-brand" />
        <h1 className="text-2xl font-bold text-text">Create a Drop</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── File Upload ── */}
        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-4 h-4" /> File
          </h2>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full border-2 border-dashed border-surface-3 rounded-xl p-8 flex flex-col items-center gap-2 text-text-muted hover:border-brand/50 hover:text-brand transition group"
          >
            <Upload className="w-8 h-8 group-hover:scale-110 transition-transform" />
            {fileName ? (
              <div className="text-center">
                <p className="text-sm font-medium text-text">{fileName}</p>
                <p className="text-xs text-text-muted">{fileSize}</p>
              </div>
            ) : (
              <p className="text-sm">Click to select a file to drop</p>
            )}
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">File Type</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value as (typeof FILE_TYPES)[number])}
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand"
              >
                {FILE_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft.charAt(0).toUpperCase() + ft.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Duration (days until expiry)</label>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted shrink-0" />
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Details ── */}
        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" /> Details
          </h2>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Title</label>
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Galactic Frontier — Season Pass"
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted/50 focus:outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Summary</label>
            <textarea
              rows={4}
              maxLength={1000}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Tell people what this drop is about…"
              className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted/50 focus:outline-none focus:border-brand resize-none"
            />
            <p className="text-right text-xs text-text-muted mt-1">{summary.length}/1000</p>
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Tags (up to 8)</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 bg-surface-2 text-text-muted text-xs px-2.5 py-1 rounded-full"
                >
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-red-400 transition">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
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
          </div>
        </section>

        {/* ── Media ── */}
        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Image className="w-4 h-4" /> Media
          </h2>

          {/* Banner */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Banner Image</label>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleBannerSelect}
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              className="w-full border border-dashed border-surface-3 rounded-xl h-32 flex items-center justify-center gap-2 text-text-muted hover:border-brand/50 hover:text-brand transition text-sm"
            >
              <Image className="w-5 h-5" />
              {bannerName || 'Upload banner image (recommended 1200×400)'}
            </button>
          </div>

          {/* Trailer URL */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Trailer / Preview Video (YouTube URL)</label>
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-text-muted shrink-0" />
              <input
                type="url"
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted/50 focus:outline-none focus:border-brand"
              />
            </div>
          </div>

          {/* Video preview */}
          {trailerUrl && /youtube\.com|youtu\.be/.test(trailerUrl) && (
            <div className="rounded-xl overflow-hidden border border-surface-3 aspect-video">
              <iframe
                src={toYouTubeEmbed(trailerUrl)}
                title="Trailer preview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}
        </section>

        {/* ── Pricing & Goal ── */}
        <section className="bg-surface rounded-2xl border border-surface-3 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Pricing &amp; Goal
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Spark Goal (credits to activate timer)</label>
              <input
                type="number"
                min="1000"
                step="100"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted/50 focus:outline-none focus:border-brand"
              />
              {goalAmount && (
                <p className="text-xs text-text-muted mt-1">
                  ≈ ${(Number(goalAmount) / 1000).toFixed(2)} USD
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Base Price (credits after drop)</label>
              <input
                type="number"
                min="100"
                step="100"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="e.g. 5000"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text placeholder-text-muted/50 focus:outline-none focus:border-brand"
              />
              {basePrice && (
                <p className="text-xs text-text-muted mt-1">
                  ≈ ${(Number(basePrice) / 1000).toFixed(2)} USD
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Submit ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 pb-8">
          {submitError && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 w-full sm:w-auto">
              {submitError}
            </p>
          )}
          {submitting && uploadStep.includes('Uploading file') && (
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
          <p className="text-xs text-text-muted">
            By creating a drop you agree to the Drauwper Creator Terms.
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-8 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-2 ${
              canSubmit
                ? 'bg-brand text-white hover:bg-brand-dark shadow-lg shadow-brand/20'
                : 'bg-surface-3 text-text-muted cursor-not-allowed'
            }`}
          >
            <Flame className="w-4 h-4" />
            {submitting ? (uploadStep || 'Creating…') : 'Create Drop'}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Upload a file to GCS via a pre-signed PUT URL, reporting progress 0→100. */
function uploadToGCS(
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

/** Convert a YouTube watch/share URL to an embed URL */
function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    let videoId = '';
    if (u.hostname.includes('youtu.be')) {
      videoId = u.pathname.slice(1);
    } else {
      videoId = u.searchParams.get('v') || '';
    }
    return videoId ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}` : '';
  } catch {
    return '';
  }
}

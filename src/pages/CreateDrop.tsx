import { useState, useRef, useEffect } from 'react';
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
  Crown,
  Lock,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || '';
const PREMIUM_TRAILER_SIZE_LIMIT_MB = 25;
const TRAILER_PRECOMPRESS_THRESHOLD_MB = 80;

const FILE_TYPES = ['game', 'app', 'document', 'music', 'photo', 'video', 'other', 'link'] as const;

export default function CreateDrop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPremium = (user?.accountPlan ?? '').toLowerCase() === 'premium';
  const isStandard = (user?.accountPlan ?? '').toLowerCase() === 'standard';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const trailerInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [fileType, setFileType] = useState<(typeof FILE_TYPES)[number]>('game');
  const [isMature, setIsMature] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [goalAmount, setGoalAmount] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [trailerMode, setTrailerMode] = useState<'link' | 'upload'>('link');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [trailerFileName, setTrailerFileName] = useState('');
  const [trailerFileSize, setTrailerFileSize] = useState('');
  // 'refund' = credits returned to contributors on expiry | 'keep' = drop stays downloadable
  const [expiryBehaviour, setExpiryBehaviour] = useState<'refund' | 'keep'>('refund');
  const [expiryThreshold, setExpiryThreshold] = useState<number>(0);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [bannerName, setBannerName] = useState('');
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [dropFile, setDropFile] = useState<File | null>(null);
  const [dropFileMime, setDropFileMime] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressProgress, setCompressProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdDropId, setCreatedDropId] = useState('');

  const [isFileDragActive, setIsFileDragActive] = useState(false);
  const [isThumbnailDragActive, setIsThumbnailDragActive] = useState(false);
  const [isTrailerDragActive, setIsTrailerDragActive] = useState(false);
  

  const applyDropFile = (f: File) => {
    setFileName(f.name);
    setDropFile(f);
    setDropFileMime(f.type || 'application/octet-stream');
    const mb = f.size / (1024 * 1024);
    setFileSize(mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`);
  };

  const applyBannerFile = (f: File) => {
    if (!f.type.startsWith('image/')) {
      setSubmitError('Banner/thumbnail must be an image file.');
      return;
    }
    setSubmitError('');
    setBannerName(f.name);
    setBannerFile(f);
  };

  const applyTrailerFile = (f: File) => {
    if (!f.type.startsWith('video/')) {
      setSubmitError('Trailer must be a video file.');
      return;
    }
    if (!isPremium && f.size > PREMIUM_TRAILER_SIZE_LIMIT_MB * 1024 * 1024) {
      setSubmitError(`Trailer files over ${PREMIUM_TRAILER_SIZE_LIMIT_MB}MB are a Premium feature.`);
      return;
    }
    const maxTrailerMb = 300;
    if (f.size > maxTrailerMb * 1024 * 1024) {
      setSubmitError(`Trailer is too large. Max file size is ${maxTrailerMb}MB.`);
      return;
    }
    setSubmitError('');
    setTrailerFile(f);
    setTrailerFileName(f.name);
    const mb = f.size / (1024 * 1024);
    setTrailerFileSize(mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSubmitError('');
    applyDropFile(f);
  };

  const handleBannerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    applyBannerFile(f);
  };

  const handleTrailerSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    applyTrailerFile(f);
  };


  // Drop zone drag-and-drop handlers for Main file drop area
  
  const handleDropZoneDragOver = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropFileDragEnter = (e: React.DragEvent<HTMLElement>) => {
    handleDropZoneDragOver(e);
    setIsFileDragActive(true);
  };

  const handleDropFileDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragActive(false);
  };

  const handleDropFileDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFileDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    setSubmitError('');
    applyDropFile(f);
  };

  // Banner drag-and-drop handlers

  const handleBannerDragEnter = (e: React.DragEvent<HTMLElement>) => {
    handleDropZoneDragOver(e);
    setIsThumbnailDragActive(true);
  };

  const handleBannerDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsThumbnailDragActive(false);
  };

  const handleBannerDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsThumbnailDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    applyBannerFile(f);
  };


  // Trailer drag-and-drop handlers

  const handleTrailerDragEnter = (e: React.DragEvent<HTMLElement>) => {
    handleDropZoneDragOver(e);
    setIsTrailerDragActive(true);
  };

  const handleTrailerDragLeave = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTrailerDragActive(false);
  };

  const handleTrailerDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsTrailerDragActive(false);
    const f = e.dataTransfer?.files?.[0];
    if (!f) return;
    applyTrailerFile(f);
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

  useEffect(() => {
    if (!submitting || uploadStep !== 'Pre-compressing trailer…') {
      setCompressProgress(0);
      return;
    }

    setCompressProgress(8);
    const iv = window.setInterval(() => {
      setCompressProgress((prev) => Math.min(95, prev + Math.max(1, Math.floor((100 - prev) / 12))));
    }, 280);
    return () => window.clearInterval(iv);
  }, [submitting, uploadStep]);

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

    // exirpy delay depends on account plan type
    // free plan: add 2 days to expiry
    // standard plan: add 4 days to expiry
    // premium plan: add 7 days to expiry

    const delayDays = isPremium ? 7 : isStandard ? 4 : 2;

      const expiresAt = new Date(now + durationMs + delayDays * 24 * 60 * 60 * 1000).toISOString();

      // 1. Create the drop record
      setUploadStep('Creating drop…');
      const { id: dropId } = await api.post<{ id: string; message: string }>('/api/drops', {
        title: title.trim(),
        description: summary.trim(),
        fileType,
        tags,
        mature: isMature,
        goalAmount: Number(goalAmount),
        basePrice: Number(basePrice),
        scheduledDropTime,
        expiresAt,
        trailerUrl: trailerMode === 'link' ? trailerUrl.trim() || null : null,
        expiryBehaviour: isPremium ? expiryBehaviour : 'refund',
        expiryThreshold: (isPremium && expiryBehaviour === 'keep' && expiryThreshold > 0) ? expiryThreshold / 100 : null,
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

      // 3. Upload trailer video if selected
      if (trailerMode === 'upload' && trailerFile) {
        let trailerToUpload = trailerFile;
        if (trailerFile.size > TRAILER_PRECOMPRESS_THRESHOLD_MB * 1024 * 1024) {
          setUploadStep('Pre-compressing trailer…');
          trailerToUpload = await precompressTrailerVideo(trailerFile);
          setCompressProgress(100);
        }

        setUploadStep('Uploading trailer…');
        const token = localStorage.getItem('drauwper_token');
        const form = new FormData();
        form.append('trailer', trailerToUpload, trailerToUpload.name);
        const response = await fetch(`${API_BASE}/api/drops/${dropId}/trailer`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || 'Trailer upload failed');
        }
      }

      // 4. Upload the drop file to GCS
      if (dropFile) {
        const mimeType = dropFileMime || 'application/octet-stream';

        setUploadStep('Preparing upload…');
        const { uploadUrl } = await api.post<{ uploadUrl: string; gcsPath: string }>(
          `/api/drops/${dropId}/upload-url`,
          { fileName: dropFile.name, fileType: mimeType, fileSize: dropFile.size }
        );

        setUploadStep('Uploading file…');
        // await uploadToGCS(uploadUrl, dropFile, mimeType, setUploadProgress);
        await uploadToStorage(uploadUrl, dropFile, mimeType, setUploadProgress);

        setUploadStep('Confirming upload…');
        await api.post(`/api/drops/${dropId}/confirm-upload`, {
          originalFileName: dropFile.name,
        });
      }

      // 5. Publish (draft → pending)
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
              setTrailerMode('link');
              setTrailerUrl('');
              setTrailerFile(null);
              setTrailerFileName('');
              setTrailerFileSize('');
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
            onDragEnter={handleDropFileDragEnter}
            onDragOver={handleDropZoneDragOver}
            onDragLeave={handleDropFileDragLeave}
            onDrop={handleDropFileDrop}
            className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-2 text-text-muted transition group ${isFileDragActive
                ? 'border-brand bg-brand/5 text-brand'
                : 'border-surface-3 hover:border-brand/50 hover:text-brand'
              }`}
          >
            <Upload className="w-8 h-8 group-hover:scale-110 transition-transform" />
            {fileName ? (
              <div className="text-center">
                <p className="text-sm font-medium text-text">{fileName}</p>
                <p className="text-xs text-text-muted">{fileSize}</p>
              </div>
            ) : (
              <p className="text-sm">Click or drag and drop a file to upload</p>
            )}


          </button>

          <label className="mb-6 flex items-start gap-3 rounded-xl border border-surface-3 bg-surface-2 px-4 py-3">
            <input
              type="checkbox"
              checked={isMature}
              onChange={(e) => setIsMature(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-surface-3 text-brand focus:ring-brand"
            />
            <span className="text-sm text-text-muted">
              Mark this post as mature to avoid flags. Mature posts will be blurred in Explore and More Posts, and common cuss words in the title will be censored.
            </span>
          </label>

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
            <label className="block text-xs text-text-muted mb-1.5">Banner/Thumbnail Image</label>
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
              onDragEnter={handleBannerDragEnter}
              onDragOver={handleDropZoneDragOver}
              onDragLeave={handleBannerDragLeave}
              onDrop={handleBannerDrop}
              className={`w-full border border-dashed rounded-xl h-32 flex items-center justify-center gap-2 text-sm transition ${isThumbnailDragActive
                  ? 'border-brand bg-brand/5 text-brand'
                  : 'border-surface-3 text-text-muted hover:border-brand/50 hover:text-brand'
                }`}
            >
              <Image className="w-5 h-5" />
              {bannerName || 'Click or drag and drop a banner image (recommended 1200x400)'}
            </button>
          </div>

          {/* Trailer source mode */}
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Trailer Source</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTrailerMode('link')}
                className={`rounded-lg border px-3 py-2 text-sm transition ${trailerMode === 'link'
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-surface-3 text-text-muted hover:border-brand/50 hover:text-brand'
                  }`}
              >
                Paste Link
              </button>
              <button
                type="button"
                onClick={() => setTrailerMode('upload')}
                className={`rounded-lg border px-3 py-2 text-sm transition ${trailerMode === 'upload'
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-surface-3 text-text-muted hover:border-brand/50 hover:text-brand'
                  }`}
              >
                Upload Video
              </button>
            </div>
          </div>

          {/* Trailer URL */}
          {trailerMode === 'link' && (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Trailer / Preview Video URL</label>
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
          )}

          {/* Trailer file upload */}
          {trailerMode === 'upload' && (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Trailer / Preview Video File</label>
              <input
                ref={trailerInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleTrailerSelect}
              />
              <button
                type="button"
                onClick={() => trailerInputRef.current?.click()}
                onDragEnter={handleTrailerDragEnter}
                onDragOver={handleDropZoneDragOver}
                onDragLeave={handleTrailerDragLeave}
                onDrop={handleTrailerDrop}
                className={`w-full border border-dashed rounded-xl h-24 flex items-center justify-center gap-2 text-sm transition ${isTrailerDragActive
                  ? 'border-brand bg-brand/5 text-brand'
                  : 'border-surface-3 text-text-muted hover:border-brand/50 hover:text-brand'
                  }`}
              >
                <Film className="w-5 h-5" />
                {trailerFileName || 'Choose trailer video (very large videos are pre-compressed before upload)'}
              </button>
              {trailerFileSize && (
                <p className="text-xs text-text-muted mt-2">Selected: {trailerFileSize}</p>
              )}
              <p className="text-xs text-text-muted mt-2">
                {isPremium
                  ? `Premium: uploads over ${PREMIUM_TRAILER_SIZE_LIMIT_MB}MB allowed. Videos over ${TRAILER_PRECOMPRESS_THRESHOLD_MB}MB will pre-compress in-browser.`
                  : `Free: trailer uploads are limited to ${PREMIUM_TRAILER_SIZE_LIMIT_MB}MB.`}
              </p>
            </div>
          )}

          {/* Video preview */}
          {trailerMode === 'link' && trailerUrl && /youtube\.com|youtu\.be/.test(trailerUrl) && (
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
                min="50"
                step="1"
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

        {/* ── Expiry Behaviour (Premium) ── */}
        <section className={`rounded-2xl border p-5 space-y-4 relative ${isPremium ? 'bg-surface border-surface-3' : 'bg-surface/50 border-surface-3/50'
          }`}>
          {/* Lock overlay for non-premium */}
          {!isPremium && (
            <div className="absolute inset-0 rounded-2xl bg-surface/60 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 z-10">
              <div className="flex items-center gap-2 bg-[#1e1e2e] border border-brand/30 rounded-xl px-4 py-2.5 shadow-lg">
                <Crown className="w-4 h-4 text-brand" />
                <span className="text-sm font-semibold text-brand">Premium feature</span>
                <Lock className="w-3.5 h-3.5 text-text-muted ml-1" />
              </div>
              <p className="text-xs text-text-muted">Upgrade to Premium to control expiry behaviour</p>
            </div>
          )}

          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <Crown className="w-4 h-4 text-brand" /> Expiry Behaviour
            {!isPremium && <span className="ml-auto text-[10px] font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full uppercase tracking-wide">Premium only</span>}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Refund option */}
            <button
              type="button"
              disabled={!isPremium}
              onClick={() => isPremium && setExpiryBehaviour('refund')}
              className={`relative text-left rounded-xl border-2 p-4 transition ${!isPremium
                ? 'border-surface-3 opacity-50 cursor-not-allowed'
                : expiryBehaviour === 'refund'
                  ? 'border-brand bg-brand/10'
                  : 'border-surface-3 hover:border-surface-3/80'
                }`}
            >
              {expiryBehaviour === 'refund' && isPremium && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand" />
              )}
              <p className="text-sm font-semibold text-text mb-1">Refund contributors</p>
              <p className="text-xs text-text-muted leading-relaxed">
                If the drop expires without reaching its goal, all contributed credits are automatically returned to contributors.
              </p>
            </button>

            {/* Keep downloadable option */}
            <button
              type="button"
              disabled={!isPremium}
              onClick={() => isPremium && setExpiryBehaviour('keep')}
              className={`relative text-left rounded-xl border-2 p-4 transition ${!isPremium
                ? 'border-surface-3 opacity-50 cursor-not-allowed'
                : expiryBehaviour === 'keep'
                  ? 'border-brand bg-brand/10'
                  : 'border-surface-3 hover:border-surface-3/80'
                }`}
            >
              {expiryBehaviour === 'keep' && isPremium && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-brand" />
              )}
              <p className="text-sm font-semibold text-text mb-1">Keep downloadable</p>
              <p className="text-xs text-text-muted leading-relaxed">
                The drop remains available for purchase and download even after its expiry date passes.
              </p>
            </button>
          </div>

          {/* Threshold — only shown when 'keep' is selected */}
          {isPremium && expiryBehaviour === 'keep' && (
            <div className="border-t border-surface-3 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-text-muted">
                  Activation threshold
                  <span className="ml-1 text-text font-semibold">{expiryThreshold}%</span>
                  <span className="ml-1 text-text-muted">(of goal)</span>
                </label>
                {expiryThreshold === 0 && (
                  <span className="text-[10px] text-text-muted border border-surface-3 px-2 py-0.5 rounded-full">No threshold</span>
                )}
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={expiryThreshold}
                onChange={(e) => setExpiryThreshold(Number(e.target.value))}
                className="w-full accent-brand"
              />
              <p className="text-xs text-text-muted">
                {expiryThreshold === 0
                  ? 'Drop stays downloadable after expiry regardless of contributions.'
                  : `Drop only stays downloadable if at least ${expiryThreshold}% of the goal was reached.`
                }
              </p>
            </div>
          )}
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
          {submitting && uploadStep === 'Pre-compressing trailer…' && (
            <div className="w-full">
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>{uploadStep}</span>
                <span>{compressProgress}%</span>
              </div>
              <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 transition-all duration-200" style={{ width: `${compressProgress}%` }} />
              </div>
            </div>
          )}
          <p className="text-xs text-text-muted">
            By creating a drop you agree to the Drauwper Creator Terms.
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`px-8 py-3 rounded-xl font-semibold text-sm transition flex items-center gap-2 ${canSubmit
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

async function precompressTrailerVideo(file: File): Promise<File> {
  if (!('MediaRecorder' in window)) return file;

  const preferredTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const supportedType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
  if (!supportedType) return file;

  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.src = objectUrl;
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  try {
    await waitForVideoMetadata(video);

    const targetWidth = Math.min(1280, Math.max(320, video.videoWidth || 1280));
    const sourceHeight = video.videoHeight || 720;
    const sourceWidth = video.videoWidth || 1280;
    const targetHeight = Math.max(180, Math.floor((targetWidth / sourceWidth) * sourceHeight));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, {
      mimeType: supportedType,
      videoBitsPerSecond: 2_000_000,
    });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data);
    };

    let drawFrameId = 0;
    const drawFrame = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
      drawFrameId = requestAnimationFrame(drawFrame);
    };

    const completion = new Promise<void>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Trailer compression failed.'));
      recorder.onstop = () => resolve();
    });

    recorder.start(750);
    await video.play();
    drawFrame();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });

    cancelAnimationFrame(drawFrameId);
    recorder.stop();
    await completion;

    const compressedBlob = new Blob(chunks, { type: supportedType });
    if (!compressedBlob.size || compressedBlob.size >= file.size * 0.98) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    return new File([compressedBlob], `${baseName}.webm`, {
      type: supportedType,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function waitForVideoMetadata(video: HTMLVideoElement): Promise<void> {
  return new Promise((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('Failed to read trailer metadata.'));
    };
    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);
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

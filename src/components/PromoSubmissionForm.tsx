import { useMemo, useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';

type SubmissionType = 'ad' | 'drop_sponsorship';
type MediaType = 'image' | 'video_link' | 'audio';

interface Props {
  fixedType: SubmissionType;
  title: string;
  subtitle: string;
}

export default function PromoSubmissionForm({ fixedType, title, subtitle }: Props) {
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [campaignTitle, setCampaignTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDropId, setTargetDropId] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [tags, setTags] = useState('');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const needsUpload = useMemo(() => mediaType === 'image' || mediaType === 'audio', [mediaType]);
  const canSubmit = campaignTitle.trim() && description.trim() && contactEmail.trim() && !submitting && (needsUpload ? !!assetFile || !!mediaUrl.trim() : !!mediaUrl.trim());

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAssetFile(file);
    setAssetName(file?.name || '');
  };

  const resetForm = () => {
    setCampaignTitle('');
    setDescription('');
    setTargetDropId('');
    setMediaUrl('');
    setCtaText('');
    setBudgetUsd('');
    setTags('');
    setAssetFile(null);
    setAssetName('');
    setMediaType('image');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setSubmitted(false);
    setError('');

    try {
      const form = new FormData();
      form.append('submissionType', fixedType);
      form.append('mediaType', mediaType);
      form.append('title', campaignTitle.trim());
      form.append('description', description.trim());
      form.append('targetDropId', targetDropId.trim());
      form.append('mediaUrl', mediaUrl.trim());
      form.append('ctaText', ctaText.trim());
      form.append('budgetUsd', budgetUsd.trim());
      form.append('contactEmail', contactEmail.trim());
      form.append('tags', tags.trim());
      if (assetFile) form.append('asset', assetFile);

      await api.upload('/api/promo-submissions', form);
      setSubmitted(true);
      resetForm();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit this request right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <section className="bg-surface border border-surface-3 rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">{title}</h1>
        <p className="text-text-muted">{subtitle}</p>
      </section>

      <form onSubmit={handleSubmit} className="bg-surface border border-surface-3 rounded-2xl p-6 space-y-5">
        {submitted && (
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-success">
            <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Submission received</p>
              <p className="text-sm text-text">Your promo request is now pending admin review.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Media Type</label>
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as MediaType)}
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            >
              <option value="image">Image</option>
              <option value="video_link">Video Link</option>
              <option value="audio">Audio</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="fitness, running, music"
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Campaign Title</label>
          <input
            value={campaignTitle}
            onChange={(e) => setCampaignTitle(e.target.value)}
            placeholder="Spring campaign, featured sponsor, trailer placement..."
            className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
          />
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Description</label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text resize-y"
          />
        </div>

        {fixedType === 'drop_sponsorship' && (
          <div>
            <label className="block text-sm text-text-muted mb-1">Target Drop ID or Link</label>
            <input
              value={targetDropId}
              onChange={(e) => setTargetDropId(e.target.value)}
              placeholder="https://... or drop id"
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Media Link</label>
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={mediaType === 'video_link' ? 'https://youtube.com/...' : 'Optional external asset URL'}
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">CTA / Promo Text</label>
            <input
              value={ctaText}
              onChange={(e) => setCtaText(e.target.value)}
              placeholder="Learn more, Shop now, Support this drop"
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Budget (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetUsd}
              onChange={(e) => setBudgetUsd(e.target.value)}
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Contact Email</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Upload Asset</label>
          <label className="flex items-center justify-center w-full rounded-xl border border-dashed border-surface-3 bg-bg px-4 py-6 text-center cursor-pointer hover:border-brand transition-colors">
            <input type="file" className="hidden" accept={mediaType === 'image' ? 'image/*' : mediaType === 'audio' ? 'audio/*' : '*'} onChange={onSelectFile} />
            <div>
              <p className="text-text font-medium">Choose a file</p>
              <p className="text-sm text-text-muted mt-1">{assetName || 'Image or audio creative'}</p>
            </div>
          </label>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Submitting…' : 'Submit for Review'}
        </button>
      </form>
    </div>
  );
}

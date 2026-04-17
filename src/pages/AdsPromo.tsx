import { useEffect, useMemo, useState } from 'react';
import { Megaphone, BadgeDollarSign, Image as ImageIcon, Music4, Link2, Send, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type SubmissionType = 'ad' | 'drop_sponsorship';
type MediaType = 'image' | 'video_link' | 'audio';

export default function AdsPromo() {
  const { user } = useAuth();
  const [submissionType, setSubmissionType] = useState<SubmissionType>('ad');
  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDropId, setTargetDropId] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [budgetUsd, setBudgetUsd] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetName, setAssetName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.email) setContactEmail(user.email);
  }, [user]);

  const needsUpload = useMemo(() => mediaType === 'image' || mediaType === 'audio', [mediaType]);
  const canSubmit = title.trim() && description.trim() && contactEmail.trim() && !submitting && (needsUpload ? !!assetFile || !!mediaUrl.trim() : !!mediaUrl.trim());

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAssetFile(file);
    setAssetName(file?.name || '');
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setTargetDropId('');
    setMediaUrl('');
    setCtaText('');
    setBudgetUsd('');
    setAssetFile(null);
    setAssetName('');
    setSubmissionType('ad');
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
      form.append('submissionType', submissionType);
      form.append('mediaType', mediaType);
      form.append('title', title.trim());
      form.append('description', description.trim());
      form.append('targetDropId', targetDropId.trim());
      form.append('mediaUrl', mediaUrl.trim());
      form.append('ctaText', ctaText.trim());
      form.append('budgetUsd', budgetUsd.trim());
      form.append('contactEmail', contactEmail.trim());
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
    <div className="max-w-4xl mx-auto space-y-6">
      <section className="bg-surface border border-surface-3 rounded-2xl p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-brand/15 flex items-center justify-center shrink-0">
            <Megaphone className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text mb-2">Ads & Promo</h1>
            <p className="text-text-muted max-w-2xl">
              Submit an ad creative or sponsor a drop. Every request goes into the admin review queue before it can be approved.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 bg-surface border border-surface-3 rounded-2xl p-6 space-y-5">
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
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-muted mb-1">Submission Type</label>
              <select
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value as SubmissionType)}
                className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
              >
                <option value="ad">Ad Creative</option>
                <option value="drop_sponsorship">Sponsor a Drop</option>
              </select>
            </div>
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
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">Campaign Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              placeholder="Tell the admins what you want promoted, where it should appear, and any timing or audience notes."
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text resize-y"
            />
          </div>

          {submissionType === 'drop_sponsorship' && (
            <div>
              <label className="block text-sm text-text-muted mb-1">Target Drop ID or Link</label>
              <input
                value={targetDropId}
                onChange={(e) => setTargetDropId(e.target.value)}
                placeholder="Optional: the drop you want to sponsor"
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
                placeholder="Listen now, Visit site, Support this drop..."
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
                placeholder="0.00"
                className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
              />
            </div>
            <div>
              <label className="block text-sm text-text-muted mb-1">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-muted mb-1">
              Upload Asset {needsUpload ? '(recommended)' : '(optional)'}
            </label>
            <label className="flex items-center justify-center w-full rounded-xl border border-dashed border-surface-3 bg-bg px-4 py-6 text-center cursor-pointer hover:border-brand transition-colors">
              <input type="file" className="hidden" accept={mediaType === 'image' ? 'image/*' : mediaType === 'audio' ? 'audio/*' : '*'} onChange={onSelectFile} />
              <div>
                <p className="text-text font-medium">Choose a file</p>
                <p className="text-sm text-text-muted mt-1">{assetName || 'Image or audio creative for admin review'}</p>
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

        <aside className="space-y-4">
          <div className="bg-surface border border-surface-3 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-text mb-3">Supported promo types</h2>
            <ul className="space-y-3 text-sm text-text-muted">
              <li className="flex gap-2"><ImageIcon className="w-4 h-4 text-brand mt-0.5" /> Image ads and static promo cards</li>
              <li className="flex gap-2"><Link2 className="w-4 h-4 text-brand mt-0.5" /> Video links and external campaigns</li>
              <li className="flex gap-2"><Music4 className="w-4 h-4 text-brand mt-0.5" /> Audio promos and sponsor spots</li>
              <li className="flex gap-2"><BadgeDollarSign className="w-4 h-4 text-brand mt-0.5" /> Sponsored drop placements</li>
            </ul>
          </div>

          <div className="bg-surface border border-surface-3 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-text mb-3">Review flow</h2>
            <ol className="space-y-2 text-sm text-text-muted list-decimal pl-5">
              <li>You submit the creative or sponsorship request.</li>
              <li>Admins review the content and account details.</li>
              <li>The request is approved, held, or rejected later.</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

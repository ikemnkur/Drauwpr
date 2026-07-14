import { useMemo, useState } from 'react';
import { Send, CheckCircle2, X } from 'lucide-react';
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
  const [targetUrl, setTargetUrl] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [budgetCredits, setBudgetCredits] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [assetFile, setAssetFile] = useState<File | null>(null); //  used for audio uploads (mp3, wav, etc.)
  const [assetName, setAssetName] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailName, setThumbnailName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const canSubmit = useMemo(() => {
    if (!campaignTitle.trim() || !description.trim() || !contactEmail.trim() || submitting) return false;
    if (!thumbnailFile) return false;
    if (fixedType === 'ad' && !targetUrl.trim()) return false;
    if (mediaType === 'video_link') return !!mediaUrl.trim();
    if (mediaType === 'audio') return !!assetFile || !!mediaUrl.trim();
    return true;
  }, [campaignTitle, description, contactEmail, submitting, thumbnailFile, fixedType, targetUrl, mediaType, mediaUrl, assetFile]);

  const onSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setAssetFile(file);
    setAssetName(file?.name || '');
  };

  const onSelectThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setThumbnailFile(file);
    setThumbnailName(file?.name || '');
  };

  const resetForm = () => {
    setCampaignTitle('');
    setDescription('');
    setTargetDropId('');
    setMediaUrl('');
    setTargetUrl('');
    setCtaText('');
    setBudgetCredits('');
    setTagInput('');
    setTags([]);
    setAssetFile(null);
    setAssetName('');
    setThumbnailFile(null);
    setThumbnailName('');
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
      form.append('targetUrl', targetUrl.trim());
      form.append('mediaUrl', mediaUrl.trim());
      form.append('ctaText', ctaText.trim());
      form.append('budgetCredits', budgetCredits.trim());
      form.append('contactEmail', contactEmail.trim());
      form.append('tags', tags.join(','));
      if (thumbnailFile) form.append('thumbnail', thumbnailFile);
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
              style={{ backgroundColor: '#1f2938f0' }}
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
            value={campaignTitle}
            onChange={(e) => setCampaignTitle(e.target.value)}
            placeholder="Spring campaign, featured sponsor, trailer placement..."
            className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            style={{ backgroundColor: '#1f293800' }}
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

        {fixedType === 'ad' && (
          <div>
            <label className="block text-sm text-text-muted mb-1">
              Redirect URL <span className="text-danger">*</span>
            </label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://yoursite.com/landing-page"
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
            />
            <p className="text-xs text-text-muted mt-1">The URL users are sent to when they click your ad.</p>
          </div>
        )}

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
          {(mediaType === 'video_link' || mediaType === 'audio') && (
            <div>
              <label className="block text-sm text-text-muted mb-1">{mediaType === 'video_link' ? 'Video Link' : 'Audio Link (optional)'}</label>
              <input
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder={mediaType === 'video_link' ? 'https://youtube.com/...' : 'Optional external asset URL'}
                className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
              />
            </div>
          )}
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

         <div>
            <label className="block text-xs text-text-muted mb-1.5">Tags (up to 10)</label>
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
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder="Type a tag and press Enter"
              className="w-full rounded-xl border border-surface-3 bg-bg px-3 py-2.5 text-text"
              style={{ backgroundColor: '#1f293800' }}
            />
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Budget (Credits)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetCredits}
              onChange={(e) => setBudgetCredits(e.target.value)}
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
          {/* allow user to select a thumbnail image */}
          <label className="block text-sm text-text-muted mb-1">Upload AD Thumbnail <span className="text-danger">*</span></label>
          <label className="flex items-center justify-center w-full rounded-xl border border-dashed border-surface-3 bg-bg px-4 py-6 text-center cursor-pointer hover:border-brand transition-colors">
            <input type="file" className="hidden" accept={'image/*'} onChange={onSelectThumbnail} />
            <div>
              <p className="text-text font-medium">Choose a file</p>
              <p className="text-sm text-text-muted mt-1">{thumbnailName || 'Required image file'}</p>
            </div>
          </label>
        </div>

        {mediaType === 'audio' && (
          <div>
            <label className="block text-sm text-text-muted mb-1">Upload Audio</label>
            <label className="flex items-center justify-center w-full rounded-xl border border-dashed border-surface-3 bg-bg px-4 py-6 text-center cursor-pointer hover:border-brand transition-colors">
              <input type="file" className="hidden" accept={'audio/*'} onChange={onSelectFile} />
              <div>
                <p className="text-text font-medium">Choose a file</p>
                <p className="text-sm text-text-muted mt-1">{assetName || 'Audio file'}</p>
              </div>
            </label>
          </div>
        )}


        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {submitting ? 'Submitting…' : 'Submit for Review'}
        </button>

      </form>

      {submitted && (
        <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-success">
          <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Submission received</p>
            <p className="text-sm text-text">Your promo request is now pending admin review.</p>
          </div>
        </div>
      )}
    </div>
  );
}

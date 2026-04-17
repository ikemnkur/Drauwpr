import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Tag, X } from 'lucide-react';
import { api } from '../lib/api';
import { mapDrop, type ServerDrop } from '../hooks/useData';
import type { Drop } from '../types';

const FILE_TYPES = ['game', 'app', 'document', 'music', 'video', 'other'] as const;

export default function EditDrop() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [drop, setDrop] = useState<Drop | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState<(typeof FILE_TYPES)[number]>('other');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get<ServerDrop>(`/api/drops/${id}`)
      .then((raw) => {
        const d = mapDrop(raw);
        if (d.status !== 'pending') {
          setError('Only pending drops can be edited.');
          setLoading(false);
          return;
        }
        setDrop(d);
        setTitle(d.title);
        setDescription(d.description);
        setFileType(d.fileType);
        setTags(d.tags);
        setGoalAmount(String(d.goalAmount));
        setBasePrice(String(d.basePrice));
        setTrailerUrl(d.trailerUrl);
      })
      .catch(() => setError('Drop not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (t && !tags.includes(t) && tags.length < 8) setTags([...tags, t]);
    setTagInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/api/drops/${id}`, {
        title: title.trim(),
        description: description.trim(),
        fileType,
        tags,
        goalAmount: Number(goalAmount),
        basePrice: Number(basePrice),
        trailerUrl: trailerUrl.trim() || null,
      });
      setSuccess(true);
      setTimeout(() => navigate(`/drop/${id}`), 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !drop) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="text-danger mb-4">{error}</p>
        <Link to="/dashboard" className="text-brand hover:underline">← Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-6 px-4">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text transition no-underline mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <h1 className="text-2xl font-bold text-text mb-6">Edit Drop</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="text-sm text-text-muted block mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-brand"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm text-text-muted block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-brand resize-none"
            required
          />
        </div>

        {/* File type */}
        <div>
          <label className="text-sm text-text-muted block mb-1">File Type</label>
          <div className="flex gap-2 flex-wrap">
            {FILE_TYPES.map((ft) => (
              <button
                key={ft}
                type="button"
                onClick={() => setFileType(ft)}
                className={`px-3 py-1.5 rounded-lg text-sm capitalize transition ${
                  fileType === ft
                    ? 'bg-brand text-white'
                    : 'bg-surface-2 text-text-muted hover:text-text border border-surface-3'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="text-sm text-text-muted block mb-1">Tags</label>
          <div className="flex gap-2 flex-wrap mb-2">
            {tags.map((t) => (
              <span key={t} className="bg-surface-2 text-text-muted text-xs px-2 py-1 rounded-full flex items-center gap-1">
                #{t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-danger">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(); } }}
              placeholder="Add a tag…"
              className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-brand"
            />
            <button type="button" onClick={addTag} className="px-3 py-2 bg-surface-2 rounded-lg text-text-muted hover:text-brand transition">
              <Tag className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Goal & Price */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-text-muted block mb-1">Goal Amount (credits)</label>
            <input
              type="number"
              min={1000}
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-brand"
              required
            />
          </div>
          <div>
            <label className="text-sm text-text-muted block mb-1">Base Price (credits)</label>
            <input
              type="number"
              min={100}
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text font-mono focus:outline-none focus:border-brand"
              required
            />
          </div>
        </div>

        {/* Trailer URL */}
        <div>
          <label className="text-sm text-text-muted block mb-1">Trailer URL (optional)</label>
          <input
            type="url"
            value={trailerUrl}
            onChange={(e) => setTrailerUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=…"
            className="w-full bg-surface-2 border border-surface-3 rounded-xl px-4 py-2.5 text-sm text-text focus:outline-none focus:border-brand"
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}
        {success && <p className="text-green-500 text-sm">Changes saved! Redirecting…</p>}

        <button
          type="submit"
          disabled={saving || !title.trim() || !description.trim()}
          className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand-dark transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}

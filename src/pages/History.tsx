import { useState, useMemo } from 'react';
import {
  History as HistoryIcon, Flame, ArrowUpRight, Undo2,
  Download, CreditCard, Crown, Search, Filter, FileDown,
  FileText, ChevronDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useContributionHistory,
  usePurchaseHistory,
  useDownloadHistory,
  useMembershipHistory,
} from '../hooks/useData';

// ── Types ──────────────────────────────────────────────────

type Tab = 'contributions' | 'purchases' | 'downloads' | 'membership';
type DateRange = 'all' | 'month' | '3months' | 'year';

// ── Helpers ────────────────────────────────────────────────

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function dateRangeCutoff(range: DateRange): number {
  const now = Date.now();
  if (range === 'month') return now - 30 * 86400_000;
  if (range === '3months') return now - 90 * 86400_000;
  if (range === 'year') return now - 365 * 86400_000;
  return 0;
}

// ── CSV export ─────────────────────────────────────────────

function downloadCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF export ─────────────────────────────────────────────

async function downloadPDF(title: string, headers: string[], rows: (string | number)[][], filename: string) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape' });
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(`Exported ${new Date().toLocaleString()}`, 14, 22);
  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map(r => r.map(String)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [99, 102, 241] },
  });
  doc.save(filename);
}

// ── Status badge ───────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const cls =
    s === 'completed' || s === 'active' ? 'bg-green-500/15 text-green-400' :
    s === 'processing' || s === 'pending' ? 'bg-yellow-500/15 text-yellow-400' :
    s === 'refunded' ? 'bg-blue-500/15 text-blue-400' :
    'bg-surface-3 text-text-muted';
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{status}</span>;
}

// ── Main component ─────────────────────────────────────────

export default function History() {
  const [tab, setTab] = useState<Tab>('contributions');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const contrib = useContributionHistory();
  const purchases = usePurchaseHistory();
  const downloads = useDownloadHistory();
  const memberships = useMembershipHistory();

  const loading =
    tab === 'contributions' ? contrib.loading :
    tab === 'purchases' ? purchases.loading :
    tab === 'downloads' ? downloads.loading :
    memberships.loading;

  const cutoff = dateRangeCutoff(dateRange);
  const q = search.toLowerCase();

  // Filtered rows per tab
  const filteredContribs = useMemo(() => contrib.entries.filter(e => {
    if (e.timestamp < cutoff) return false;
    if (statusFilter !== 'all') {
      const s = e.isRefunded ? 'refunded' : 'completed';
      if (s !== statusFilter) return false;
    }
    return !q || e.dropTitle.toLowerCase().includes(q);
  }), [contrib.entries, cutoff, q, statusFilter]);

  const filteredPurchases = useMemo(() => purchases.entries.filter(e => {
    if (e.timestamp < cutoff) return false;
    if (statusFilter !== 'all' && e.status.toLowerCase() !== statusFilter) return false;
    return !q || e.paymentMethod.toLowerCase().includes(q) || (e.txHash ?? '').toLowerCase().includes(q);
  }), [purchases.entries, cutoff, q, statusFilter]);

  const filteredDownloads = useMemo(() => downloads.entries.filter(e => {
    if (e.timestamp < cutoff) return false;
    if (statusFilter !== 'all' && 'completed' !== statusFilter) return false;
    return !q || e.dropTitle.toLowerCase().includes(q);
  }), [downloads.entries, cutoff, q, statusFilter]);

  const filteredMemberships = useMemo(() => memberships.entries.filter(e => {
    if (e.timestamp < cutoff) return false;
    if (statusFilter !== 'all' && e.status.toLowerCase() !== statusFilter) return false;
    return !q || e.plan.toLowerCase().includes(q);
  }), [memberships.entries, cutoff, q, statusFilter]);

  // ── Export helpers ────────────────────────────────
  function exportCSV() {
    if (tab === 'contributions') {
      downloadCSV(
        ['Date', 'Time', 'Drop', 'Amount', 'Penalty', 'Status'],
        filteredContribs.map(e => [fmtDate(e.timestamp), fmtTime(e.timestamp), e.dropTitle, e.amount, e.penaltyAmount, e.isRefunded ? 'Refunded' : 'Completed']),
        'contributions.csv',
      );
    } else if (tab === 'purchases') {
      downloadCSV(
        ['Date', 'Time', 'Credits', 'Amount Paid', 'Currency', 'Method', 'Status', 'TX Hash'],
        filteredPurchases.map(e => [fmtDate(e.timestamp), fmtTime(e.timestamp), e.credits, e.amountPaid, e.currency, e.paymentMethod, e.status, e.txHash ?? '']),
        'credit-purchases.csv',
      );
    } else if (tab === 'downloads') {
      downloadCSV(
        ['Date', 'Time', 'Drop', 'Price Paid', 'Base Price', 'Contributor Disc.', 'Time Dec. Disc.', 'Volume Dec. Disc.', 'Download #'],
        filteredDownloads.map(e => [fmtDate(e.timestamp), fmtTime(e.timestamp), e.dropTitle, e.pricePaid, e.basePrice, `${e.contributorDiscount}%`, `${e.timeDecayDiscount}%`, `${e.volumeDecayDiscount}%`, e.downloadNumber]),
        'downloads.csv',
      );
    } else {
      downloadCSV(
        ['Date', 'Time', 'Plan', 'Amount', 'Billing', 'Status'],
        filteredMemberships.map(e => [fmtDate(e.timestamp), fmtTime(e.timestamp), e.plan, e.amount, e.billingPeriod, e.status]),
        'memberships.csv',
      );
    }
  }

  async function exportPDF() {
    if (tab === 'contributions') {
      await downloadPDF('Contribution History', ['Date', 'Time', 'Drop', 'Amount', 'Penalty', 'Status'],
        filteredContribs.map(e => [fmtDate(e.timestamp), fmtTime(e.timestamp), e.dropTitle, e.amount, e.penaltyAmount, e.isRefunded ? 'Refunded' : 'Completed']),
        'contributions.pdf');
    } else if (tab === 'purchases') {
      await downloadPDF('Credit Purchase History', ['Date', 'Time', 'Credits', 'Amount Paid', 'Currency', 'Method', 'Status', 'TX Hash'],
        filteredPurchases.map(e => [fmtDate(e.timestamp), fmtTime(e.timestamp), e.credits, e.amountPaid, e.currency, e.paymentMethod, e.status, e.txHash ?? '']),
        'credit-purchases.pdf');
    } else if (tab === 'downloads') {
      await downloadPDF('Download History', ['Date', 'Time', 'Drop', 'Price Paid', 'Base Price', 'Contrib Disc', 'Time Disc', 'Vol Disc', 'DL #'],
        filteredDownloads.map(e => [fmtDate(e.timestamp), fmtTime(e.timestamp), e.dropTitle, e.pricePaid, e.basePrice, `${e.contributorDiscount}%`, `${e.timeDecayDiscount}%`, `${e.volumeDecayDiscount}%`, e.downloadNumber]),
        'downloads.pdf');
    } else {
      await downloadPDF('Membership History', ['Date', 'Time', 'Plan', 'Amount', 'Billing', 'Status'],
        filteredMemberships.map(e => [fmtDate(e.timestamp), fmtTime(e.timestamp), e.plan, e.amount, e.billingPeriod, e.status]),
        'memberships.pdf');
    }
  }

  // ── Summary bar ────────────────────────────────────
  const totalCreditsBought = purchases.entries.filter(e => e.status === 'completed').reduce((s, e) => s + e.credits, 0);
  const totalSpentDownloads = downloads.entries.reduce((s, e) => s + e.pricePaid, 0);
  const totalSpentContribs = contrib.totalSpent;

  // ── Tab config ─────────────────────────────────────
  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'contributions', label: 'Contributions', icon: <Flame className="w-4 h-4" />, count: contrib.entries.length },
    { id: 'purchases', label: 'Credit Purchases', icon: <CreditCard className="w-4 h-4" />, count: purchases.entries.length },
    { id: 'downloads', label: 'Downloads', icon: <Download className="w-4 h-4" />, count: downloads.entries.length },
    { id: 'membership', label: 'Membership', icon: <Crown className="w-4 h-4" />, count: memberships.entries.length },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-text flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 text-brand" />
          Payment History
        </h1>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={exportPDF}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-text rounded-lg transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-surface-2 rounded-xl p-3">
          <p className="text-xs text-text-muted mb-1">Credits spent (contributions)</p>
          <p className="text-lg font-bold text-brand">{totalSpentContribs.toLocaleString()}</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3">
          <p className="text-xs text-text-muted mb-1">Credits spent (downloads)</p>
          <p className="text-lg font-bold text-brand">{totalSpentDownloads.toLocaleString()}</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3">
          <p className="text-xs text-text-muted mb-1">Credits bought</p>
          <p className="text-lg font-bold text-green-400">{totalCreditsBought.toLocaleString()}</p>
        </div>
        <div className="bg-surface-2 rounded-xl p-3">
          <p className="text-xs text-text-muted mb-1">Active plan</p>
          <p className="text-lg font-bold text-text capitalize">{memberships.activePlan ?? 'None'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-2 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap transition-colors ${
              tab === t.id
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-muted hover:text-text hover:bg-surface-3'
            }`}
          >
            {t.icon}
            {t.label}
            {t.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ml-0.5 ${tab === t.id ? 'bg-white/20 text-white' : 'bg-surface-3 text-text-muted'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={
              tab === 'contributions' ? 'Search by drop title…' :
              tab === 'purchases' ? 'Search by method or TX hash…' :
              tab === 'downloads' ? 'Search by drop title…' :
              'Search by plan…'
            }
            className="w-full pl-9 pr-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-brand"
          />
        </div>

        <div className="relative">
          <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as DateRange)}
            className="pl-8 pr-7 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm text-text appearance-none focus:outline-none focus:border-brand"
          >
            <option value="all">All time</option>
            <option value="month">This month</option>
            <option value="3months">Last 3 months</option>
            <option value="year">This year</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>

        {tab !== 'downloads' && (
          <div className="relative">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 pr-7 py-2 bg-surface-2 border border-surface-3 rounded-lg text-sm text-text appearance-none focus:outline-none focus:border-brand"
            >
              <option value="all">All statuses</option>
              <option value="completed">Completed</option>
              <option value="processing">Processing</option>
              {tab === 'contributions' && <option value="refunded">Refunded</option>}
              {tab === 'membership' && <option value="active">Active</option>}
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Contributions tab */}
          {tab === 'contributions' && (
            filteredContribs.length === 0 ? <EmptyState icon={<Flame className="w-8 h-8 text-text-muted" />} label="No contributions found." /> :
            <div className="space-y-2">
              {filteredContribs.map(h => (
                <Link
                  key={h.id}
                  to={`/drop/${h.dropId}`}
                  className="bg-surface-2 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-3 transition-colors block no-underline"
                >
                  <div className="w-9 h-9 bg-surface-3 rounded-lg flex items-center justify-center shrink-0">
                    {h.isRefunded ? <Undo2 className="w-4 h-4 text-green-400" /> : <Flame className="w-4 h-4 text-brand" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{h.dropTitle}</p>
                    <p className="text-xs text-text-muted">{fmtDate(h.timestamp)} · {fmtTime(h.timestamp)}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className={`text-sm font-mono font-semibold ${h.isRefunded ? 'text-green-400' : 'text-brand'}`}>
                      {h.isRefunded ? '+' : '-'}{h.amount.toLocaleString()} cr
                    </span>
                    <StatusBadge status={h.isRefunded ? 'Refunded' : 'Completed'} />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-text-muted shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {/* Purchases tab */}
          {tab === 'purchases' && (
            filteredPurchases.length === 0 ? <EmptyState icon={<CreditCard className="w-8 h-8 text-text-muted" />} label="No credit purchases found." /> :
            <div className="space-y-2">
              {filteredPurchases.map(p => (
                <div key={p.id} className="bg-surface-2 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-9 h-9 bg-surface-3 rounded-lg flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">
                      {p.credits.toLocaleString()} credits via {p.paymentMethod}
                    </p>
                    <p className="text-xs text-text-muted">{fmtDate(p.timestamp)} · {fmtTime(p.timestamp)}</p>
                    {p.txHash && (
                      <p className="text-xs text-text-muted font-mono truncate max-w-xs mt-0.5">TX: {p.txHash}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-sm font-mono font-semibold text-green-400">
                      +{p.credits.toLocaleString()} cr
                    </span>
                    <span className="text-xs text-text-muted">{p.amountPaid} {p.currency}</span>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Downloads tab */}
          {tab === 'downloads' && (
            filteredDownloads.length === 0 ? <EmptyState icon={<Download className="w-8 h-8 text-text-muted" />} label="No downloads found." /> :
            <div className="space-y-2">
              {filteredDownloads.map(d => {
                const totalDisc = d.contributorDiscount + d.timeDecayDiscount + d.volumeDecayDiscount;
                return (
                  <Link
                    key={d.id}
                    to={`/drop/${d.dropId}`}
                    className="bg-surface-2 rounded-xl p-4 flex items-center gap-4 hover:bg-surface-3 transition-colors block no-underline"
                  >
                    <div className="w-9 h-9 bg-surface-3 rounded-lg flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text truncate">{d.dropTitle}</p>
                      <p className="text-xs text-text-muted">{fmtDate(d.timestamp)} · {fmtTime(d.timestamp)} · Download #{d.downloadNumber}</p>
                      {totalDisc > 0 && (
                        <p className="text-xs text-green-400 mt-0.5">
                          {totalDisc}% total discount applied (saved {(d.basePrice - d.pricePaid).toFixed(0)} cr)
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className="text-sm font-mono font-semibold text-brand">
                        -{d.pricePaid.toLocaleString()} cr
                      </span>
                      {totalDisc > 0 && (
                        <span className="text-xs text-text-muted line-through">{d.basePrice.toLocaleString()} cr</span>
                      )}
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-text-muted shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}

          {/* Membership tab */}
          {tab === 'membership' && (
            <>
              {memberships.activePlan && (
                <div className="bg-gradient-to-r from-brand/20 to-purple-500/10 border border-brand/30 rounded-xl p-4 flex items-center gap-3">
                  <Crown className="w-5 h-5 text-brand shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-text capitalize">
                      {memberships.activePlan} Plan — Active
                    </p>
                    <p className="text-xs text-text-muted">Your current membership plan</p>
                  </div>
                </div>
              )}
              {filteredMemberships.length === 0 ? (
                <EmptyState
                  icon={<Crown className="w-8 h-8 text-text-muted" />}
                  label="No membership charges yet."
                  sub="Standard and Premium plans will appear here once you subscribe."
                />
              ) : (
                <div className="space-y-2">
                  {filteredMemberships.map(m => (
                    <div key={m.id} className="bg-surface-2 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-9 h-9 bg-surface-3 rounded-lg flex items-center justify-center shrink-0">
                        <Crown className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text capitalize">{m.plan} Plan</p>
                        <p className="text-xs text-text-muted">
                          {fmtDate(m.timestamp)} · {m.billingPeriod}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <span className="text-sm font-mono font-semibold text-brand">
                          -{m.amount.toLocaleString()} cr
                        </span>
                        <StatusBadge status={m.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Empty state helper ─────────────────────────────────────

function EmptyState({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="bg-surface-2 rounded-xl p-10 text-center flex flex-col items-center gap-3">
      <div className="opacity-40">{icon}</div>
      <p className="text-text-muted text-sm">{label}</p>
      {sub && <p className="text-text-muted text-xs max-w-xs">{sub}</p>}
    </div>
  );
}


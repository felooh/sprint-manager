'use client';

import { Fragment, useState } from 'react';
import { useData } from '@/lib/data-context';
import { GoalTrack, HEALTH_FILL, PRODUCTS, QUARTERS, TASK_STEPS } from '@/lib/types';
import { averageProgress, averageSteps, completedWithin, countGoals, daysSince, daysUntil, devsForProduct, formatChange, formatDate, formatQuarter, isOverdue, needsAttention, ownerNames, progressBefore, stepLabel, todayKey } from '@/lib/goals';
import { HealthBadge, MetricCard, ProductBadge, ProgressBar, Spinner, StepBreakdown } from '@/components/ui';
import { AlertTriangle, Copy, Download, Printer } from 'lucide-react';

const PERIODS = [7, 14, 30, 90];
const DUE_SOON_DAYS = 14;
const STALE_DAYS = 14;

interface Props {
  product: string;
  onSelectProduct: (product: string) => void;
  quarter: string;
  onSelectQuarter: (quarter: string) => void;
}

interface Row {
  track: GoalTrack;
  title: string;
  quarter: string;
  owners: string;
  change: number;
}

const attentionReason = (t: GoalTrack) => {
  if (t.health === 'At Risk' || t.health === 'Blocked') return isOverdue(t) ? `${t.health}, overdue` : t.health;
  return 'Overdue';
};

export default function ProductReport({ product, onSelectProduct, quarter, onSelectQuarter }: Props) {
  const { state, syncStatus } = useData();
  const [days, setDays] = useState(7);
  const [copied, setCopied] = useState(false);

  if (syncStatus === 'loading' || syncStatus === 'idle') return <Spinner />;

  const products = product ? [product] : PRODUCTS;
  const goals = quarter ? state.goals.filter(g => g.quarter === quarter) : state.goals;
  const rows: Row[] = state.tracks.filter(t => products.includes(t.product)).flatMap(track => {
    const goal = goals.find(g => g.id === track.goalId);
    if (!goal) return [];
    return [{
      track,
      title: goal.title,
      quarter: goal.quarter,
      owners: ownerNames(track, state.members),
      change: track.progress - progressBefore(track, state.log, days).baseline,
    }];
  });

  const rowsFor = (p: string) => rows.filter(r => r.track.product === p);
  const overall = averageProgress(rows.map(r => r.track));
  const before = averageProgress(rows.map(r => ({ progress: r.track.progress - r.change })));

  const completed = rows.filter(r => completedWithin(r.track, state.log, days));
  const moved = rows.filter(r => r.change !== 0 && r.track.health !== 'Done');
  const attention = rows.filter(r => needsAttention(r.track));
  const dueSoon = rows
    .filter(r => r.track.targetDate && r.track.health !== 'Done' && !isOverdue(r.track) && daysUntil(r.track.targetDate) <= DUE_SOON_DAYS)
    .sort((a, b) => a.track.targetDate.localeCompare(b.track.targetDate));
  const stale = rows.filter(r => r.track.health !== 'Done' && daysSince(r.track.updatedAt) >= STALE_DAYS);

  const scopeName = `${product || 'All products'}${quarter ? ` ${formatQuarter(quarter)}` : ''}`;
  const today = formatDate(todayKey());
  const periodLabel = `last ${days} days`;

  const copyText = () => {
    let txt = `${scopeName} — Progress Report\nGenerated: ${today} | Period: ${periodLabel}\n\n`;
    txt += `OVERALL: ${overall}% complete (${formatChange(overall - before)} in period)\n`;
    txt += `Goal tasks: ${countGoals(rows.map(r => r.track))} | Done: ${rows.filter(r => r.track.health === 'Done').length} | Need attention: ${attention.length}\n`;
    products.forEach(p => {
      const pr = rowsFor(p);
      txt += `\n${p.toUpperCase()} — ${averageProgress(pr.map(r => r.track))}%\n`;
      if (!pr.length) txt += 'No goal tasks.\n';
      else txt += `Average by step: ${averageSteps(pr.map(r => r.track)).filter(st => st.enabled).map(st => `${stepLabel(st.key)} ${st.progress}%`).join(', ')}\n`;
      pr.forEach(r => {
        txt += `- ${r.title} [${formatQuarter(r.quarter)}]: ${r.track.progress}% (${r.track.health}, ${formatChange(r.change)})`;
        txt += `${r.owners ? ` — ${r.owners}` : ''}${r.track.targetDate ? ` — target ${formatDate(r.track.targetDate)}` : ''}\n`;
        txt += `  Steps: ${r.track.steps.filter(s => s.enabled).map(s => `${stepLabel(s.key)} ${s.progress}%`).join(', ')}\n`;
        if (r.track.note) txt += `  ${r.track.note}\n`;
      });
    });
    if (completed.length) {
      txt += '\nCOMPLETED IN PERIOD\n';
      completed.forEach(r => { txt += `- ${r.title} [${r.track.product}]\n`; });
    }
    if (attention.length) {
      txt += '\nNEEDS ATTENTION\n';
      attention.forEach(r => { txt += `- ${r.title} [${r.track.product}] — ${attentionReason(r.track)}${r.track.note ? `: ${r.track.note}` : ''}\n`; });
    }
    if (dueSoon.length) {
      txt += `\nDUE IN THE NEXT ${DUE_SOON_DAYS} DAYS\n`;
      dueSoon.forEach(r => { txt += `- ${r.title} [${r.track.product}] — ${formatDate(r.track.targetDate)} (${r.track.progress}%)\n`; });
    }
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const downloadCsv = () => {
    // A leading = + - or @ would make a spreadsheet run the cell as a formula
    const cell = (v: string | number) => {
      const text = typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : String(v);
      return `"${text.replace(/"/g, '""')}"`;
    };
    const lines = [
      ['Product', 'Goal task', 'Quarter', 'Status', 'Progress %', `Change % (${periodLabel})`, ...TASK_STEPS.map(s => `${s.label} %`), 'Developers', 'Target date', 'Latest update', 'Last updated'],
      ...rows.map(r => [r.track.product, r.title, r.quarter ? formatQuarter(r.quarter) : '', r.track.health, r.track.progress, r.change, ...TASK_STEPS.map(({ key }) => {
        const step = r.track.steps.find(s => s.key === key);
        return step?.enabled ? step.progress : 'Not needed';
      }), r.owners, r.track.targetDate, r.track.note, r.track.updatedAt.slice(0, 10)]),
    ].map(line => line.map(cell).join(','));
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `progress-report-${todayKey()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Controls */}
      <div className="no-print flex flex-wrap gap-2 mb-5">
        <select value={product} onChange={e => onSelectProduct(e.target.value)} aria-label="Report scope" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          <option value="">All products</option>
          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={quarter} onChange={e => onSelectQuarter(e.target.value)} aria-label="Report quarter" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          <option value="">All quarters</option>
          {QUARTERS.map(q => <option key={q} value={q}>{formatQuarter(q)}</option>)}
        </select>
        <select value={days} onChange={e => setDays(Number(e.target.value))} aria-label="Report period" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          {PERIODS.map(d => <option key={d} value={d}>Last {d} days</option>)}
        </select>
        <button onClick={copyText} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Copy size={13} /> {copied ? 'Copied!' : 'Copy text'}
        </button>
        <button onClick={downloadCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Download size={13} /> Download CSV
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Printer size={13} /> Print / PDF
        </button>
      </div>

      <div className="space-y-5">
        {/* Summary */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{scopeName} — Progress Report</h2>
              <p className="text-xs text-gray-500 mt-1">Generated {today} · Changes over the {periodLabel}</p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-gray-900">{overall}<span className="text-base font-normal text-gray-400">% complete</span></div>
              <div className="text-xs text-gray-500 mt-1">{formatChange(overall - before)} in period · average across goal tasks</div>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <MetricCard label="Goal tasks" value={countGoals(rows.map(r => r.track))} />
            <MetricCard label="Completed in period" value={completed.length} valueClass="text-green-700" />
            <MetricCard label="Progressed in period" value={moved.filter(r => r.change > 0).length} valueClass="text-blue-700" />
            <MetricCard label="Need attention" value={attention.length} valueClass={attention.length ? 'text-red-700' : 'text-gray-900'} />
          </div>
        </section>

        {/* Needs attention */}
        {attention.length > 0 && (
          <section className="bg-white border border-red-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="font-medium text-red-700">Needs attention ({attention.length})</h3>
            </div>
            <div className="space-y-3">
              {attention.map(r => (
                <div key={r.track.id} className="border-l-4 border-red-400 pl-3 py-1">
                  <div className="text-sm font-medium text-gray-900">{r.title}</div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-gray-500">
                    <ProductBadge product={r.track.product} />
                    <span>{attentionReason(r.track)} · {r.track.progress}%</span>
                    {r.track.targetDate && <span>· Target {formatDate(r.track.targetDate)}</span>}
                    {r.owners && <span>· {r.owners}</span>}
                  </div>
                  {r.track.note && <p className="text-xs text-gray-500 mt-1">{r.track.note}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Each product */}
        {products.map(p => {
          const pr = rowsFor(p);
          return (
            <section key={p} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 break-inside-avoid">
              <div className="flex items-center justify-between gap-3 mb-1">
                <h3 className="font-medium text-gray-900">{p}</h3>
                <span className="text-sm font-semibold text-gray-900">{averageProgress(pr.map(r => r.track))}%</span>
              </div>
              <ProgressBar pct={averageProgress(pr.map(r => r.track))} />
              {pr.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-gray-600 mb-2">Progress by step</h4>
                  <StepBreakdown steps={averageSteps(pr.map(r => r.track))} />
                </div>
              )}
              {!pr.length ? <p className="text-sm text-gray-400 mt-4">No goal tasks.</p> : (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                      <th className="text-left font-medium pb-2 pr-4">Goal task</th>
                      <th className="text-left font-medium pb-2 px-2">Quarter</th>
                      <th className="text-left font-medium pb-2 px-2 w-40">Progress</th>
                      <th className="text-left font-medium pb-2 px-2">Change</th>
                      <th className="text-left font-medium pb-2 px-2">Status</th>
                      <th className="text-left font-medium pb-2 px-2">Developers</th>
                      <th className="text-left font-medium pb-2 px-2">Target</th>
                    </tr></thead>
                    <tbody>{pr.map(r => (
                      <Fragment key={r.track.id}>
                      <tr className="align-top">
                        <td className="py-2.5 pr-4">
                          <div className="font-medium text-gray-900">{r.title}</div>
                          {r.track.note && <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{r.track.note}</div>}
                        </td>
                        <td className="py-2.5 px-2 text-xs text-gray-600 whitespace-nowrap">{formatQuarter(r.quarter)}</td>
                        <td className="py-2.5 px-2">
                          <div className="text-gray-900 font-medium">{r.track.progress}%</div>
                          <ProgressBar pct={r.track.progress} color={HEALTH_FILL[r.track.health]} />
                        </td>
                        <td className={`py-2.5 px-2 ${r.change > 0 ? 'text-green-700 font-medium' : r.change < 0 ? 'text-red-700 font-medium' : 'text-gray-500'}`}>{formatChange(r.change)}</td>
                        <td className="py-2.5 px-2"><HealthBadge health={r.track.health} /></td>
                        <td className="py-2.5 px-2 text-xs text-gray-600">{r.owners || '—'}</td>
                        <td className={`py-2.5 px-2 text-xs whitespace-nowrap ${isOverdue(r.track) ? 'text-red-700 font-medium' : 'text-gray-600'}`}>{formatDate(r.track.targetDate)}</td>
                      </tr>
                      <tr className="border-b border-gray-50">
                        <td colSpan={7} className="pb-3"><StepBreakdown steps={r.track.steps} /></td>
                      </tr>
                      </Fragment>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </section>
          );
        })}

        <div className="grid md:grid-cols-3 gap-5">
          <ReportList title="Completed in period" empty="Nothing completed in this period." rows={completed} detail={() => ''} />
          <ReportList title={`Due in the next ${DUE_SOON_DAYS} days`} empty="Nothing due soon." rows={dueSoon} detail={r => `${formatDate(r.track.targetDate)} · ${r.track.progress}%`} />
          <ReportList title={`No update for ${STALE_DAYS}+ days`} empty="Everything has a recent update." rows={stale} detail={r => `Last updated ${formatDate(r.track.updatedAt)}`} />
        </div>

        {/* Developers */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 break-inside-avoid">
          <h3 className="font-medium text-gray-900 mb-4">Developers</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left font-medium pb-2 pr-4">Developer</th>
                <th className="text-left font-medium pb-2 px-2">Role</th>
                <th className="text-left font-medium pb-2 px-2">Goal tasks</th>
                <th className="text-left font-medium pb-2 px-2">Average progress</th>
                <th className="text-left font-medium pb-2 px-2">Need attention</th>
              </tr></thead>
              <tbody>{[...new Set(products.flatMap(p => devsForProduct(state, p)))].map(m => {
                const mine = rows.filter(r => r.track.ownerIds.includes(m.id)).map(r => r.track);
                const stuck = mine.filter(needsAttention).length;
                return (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{m.name}</td>
                    <td className="py-2.5 px-2 text-xs text-gray-600">{m.role}</td>
                    <td className="py-2.5 px-2 text-gray-700">{mine.length}</td>
                    <td className="py-2.5 px-2 text-gray-700">{mine.length ? `${averageProgress(mine)}%` : '—'}</td>
                    <td className={`py-2.5 px-2 ${stuck ? 'text-red-700 font-medium' : 'text-gray-700'}`}>{stuck}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function ReportList({ title, empty, rows, detail }: { title: string; empty: string; rows: Row[]; detail: (r: Row) => string }) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 break-inside-avoid">
      <h3 className="font-medium text-gray-900 mb-3">{title} ({rows.length})</h3>
      {!rows.length ? <p className="text-sm text-gray-400">{empty}</p> : (
        <ul className="space-y-2.5">
          {rows.map(r => (
            <li key={r.track.id}>
              <div className="text-sm text-gray-900">{r.title}</div>
              <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-gray-500">
                <ProductBadge product={r.track.product} />
                {detail(r) && <span>{detail(r)}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

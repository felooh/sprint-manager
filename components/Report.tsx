'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { PRODUCTS, STATUSES, AVATAR_COLORS } from '@/lib/types';
import { ProductBadge, StatusBadge, PriorityBadge, MetricCard, ProgressBar, Spinner } from '@/components/ui';
import { AlertTriangle, Copy, Printer } from 'lucide-react';

export default function Report() {
  const { state, syncStatus, activeSprint } = useData();
  const [selectedSprint, setSelectedSprint] = useState('');
  const [copied, setCopied] = useState(false);

  if (syncStatus === 'loading') return <Spinner />;

  const sprintId = selectedSprint || activeSprint?.id || '';
  const sp       = state.sprints.find(s => s.id === sprintId);
  const tasks    = state.tasks.filter(t => t.sprintId === sprintId);

  const total   = tasks.length;
  const done    = tasks.filter(t => t.status === 'Done').length;
  const inprog  = tasks.filter(t => t.status === 'In Progress').length;
  const blocked = tasks.filter(t => t.status === 'Blocked').length;
  const pct     = total ? Math.round(done / total * 100) : 0;
  const today   = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const copyText = () => {
    let txt = `${sp?.name ?? ''} — Sprint Report\nGenerated: ${today}${sp ? ' | ' + sp.start + ' → ' + sp.end : ''}\n\n`;
    txt += `SPRINT PROGRESS\nCompletion: ${pct}% (${done}/${total} tasks done)\n`;
    STATUSES.forEach(s => { txt += `${s}: ${tasks.filter(t => t.status === s).length}  `; });
    txt += '\n\nCOMPLETED VS PLANNED — BY PRODUCT\n';
    PRODUCTS.forEach(p => {
      const pt = tasks.filter(t => t.product === p); if (!pt.length) return;
      const pd = pt.filter(t => t.status === 'Done').length;
      txt += `${p}: ${pd}/${pt.length} done (${Math.round(pd/pt.length*100)}%)\n`;
    });
    txt += '\nPER-MEMBER WORKLOAD\n';
    state.members.forEach(m => {
      const mt = tasks.filter(t => t.assigneeId === m.id); if (!mt.length) return;
      const md = mt.filter(t => t.status === 'Done').length;
      const mb = mt.filter(t => t.status === 'Blocked').length;
      txt += `${m.name} (${m.role}): ${mt.length} tasks, ${md} done${mb ? ', ' + mb + ' blocked' : ''}\n`;
    });
    if (blocked) {
      txt += '\nBLOCKED / AT-RISK\n';
      tasks.filter(t => t.status === 'Blocked').forEach(t => {
        const m = state.members.find(mm => mm.id === t.assigneeId);
        txt += `- ${t.title} [${t.product}] — ${m?.name ?? 'Unassigned'} — ${t.priority} priority\n`;
        if (t.desc) txt += `  ${t.desc}\n`;
      });
    }
    txt += '\nFULL TASK LIST\n';
    tasks.forEach(t => {
      const m = state.members.find(mm => mm.id === t.assigneeId);
      txt += `[${t.status}] ${t.title} (${t.product}) — ${m?.name ?? 'Unassigned'} — ${t.priority}\n`;
      if (t.desc) txt += `  ${t.desc}\n`;
    });
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={selectedSprint} onChange={e => setSelectedSprint(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          {state.sprints.map(s => <option key={s.id} value={s.id}>{s.name}{s.active === 'TRUE' ? ' (active)' : ''}</option>)}
        </select>
        <button onClick={copyText} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Copy size={13} /> {copied ? 'Copied!' : 'Copy text'}
        </button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <Printer size={13} /> Print / PDF
        </button>
      </div>

      <div className="space-y-5">
        {/* Header */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{sp?.name ?? '—'} — Sprint Report</h2>
              <p className="text-xs text-gray-500 mt-1">Generated {today}{sp ? ` · ${sp.start} → ${sp.end}` : ''}</p>
            </div>
            <div className="text-4xl font-bold text-gray-900">{pct}<span className="text-base font-normal text-gray-400">% complete</span></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <MetricCard label="Planned"     value={total} />
            <MetricCard label="Completed"   value={done}   valueClass="text-green-700" />
            <MetricCard label="In progress" value={inprog} valueClass="text-blue-700" />
            <MetricCard label="Blocked"     value={blocked} valueClass={blocked ? 'text-red-700' : 'text-gray-900'} />
          </div>
        </div>

        {/* By product */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-medium text-gray-900 mb-4">Completed vs planned — by product</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2 pr-4">Product</th>
                <th className="text-left pb-2 px-2">Planned</th>
                <th className="text-left pb-2 px-2">Done</th>
                <th className="text-left pb-2 px-2">In Progress</th>
                <th className="text-left pb-2 px-2">Review</th>
                <th className="text-left pb-2 px-2">Blocked</th>
                <th className="text-left pb-2 px-2">% Done</th>
              </tr></thead>
              <tbody>{PRODUCTS.map(p => {
                const pt = tasks.filter(t => t.product === p);
                const pd = pt.filter(t => t.status === 'Done').length;
                const pb = pt.filter(t => t.status === 'Blocked').length;
                const pp = pt.length ? Math.round(pd/pt.length*100) : 0;
                return (
                  <tr key={p} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4"><ProductBadge product={p} /></td>
                    <td className="py-2.5 px-2 text-gray-700">{pt.length}</td>
                    <td className="py-2.5 px-2 text-green-700 font-medium">{pd}</td>
                    <td className="py-2.5 px-2 text-gray-700">{pt.filter(t=>t.status==='In Progress').length}</td>
                    <td className="py-2.5 px-2 text-gray-700">{pt.filter(t=>t.status==='Review').length}</td>
                    <td className="py-2.5 px-2">{pb ? <span className="text-red-700 font-medium">{pb}</span> : <span className="text-gray-700">0</span>}</td>
                    <td className="py-2.5 px-2 text-gray-700">{pp}%</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>

        {/* Per-member */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-medium text-gray-900 mb-4">Per-member workload</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2 pr-4">Member</th>
                <th className="text-left pb-2 px-2">Product</th>
                <th className="text-left pb-2 px-2">Assigned</th>
                <th className="text-left pb-2 px-2">Done</th>
                <th className="text-left pb-2 px-2">In Progress</th>
                <th className="text-left pb-2 px-2">Blocked</th>
              </tr></thead>
              <tbody>{state.members.map((m, i) => {
                const mt = tasks.filter(t => t.assigneeId === m.id);
                if (!mt.length) return null;
                const md = mt.filter(t=>t.status==='Done').length;
                const mb = mt.filter(t=>t.status==='Blocked').length;
                const [bg, tc] = AVATAR_COLORS[i % AVATAR_COLORS.length];
                return (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{background:bg,color:tc}}>
                          {m.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{m.name}</div>
                          <div className="text-xs text-gray-400">{m.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2"><ProductBadge product={m.product} /></td>
                    <td className="py-2.5 px-2 text-gray-700">{mt.length}</td>
                    <td className="py-2.5 px-2 text-green-700 font-medium">{md}</td>
                    <td className="py-2.5 px-2 text-gray-700">{mt.filter(t=>t.status==='In Progress').length}</td>
                    <td className="py-2.5 px-2">{mb ? <span className="text-red-700 font-medium">{mb}</span> : <span className="text-gray-700">0</span>}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>

        {/* Blocked */}
        {blocked > 0 && (
          <div className="bg-white border border-red-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-red-500" />
              <h3 className="font-medium text-red-700">Blocked / at-risk ({blocked})</h3>
            </div>
            <div className="space-y-3">
              {tasks.filter(t=>t.status==='Blocked').map(t => {
                const m = state.members.find(mm=>mm.id===t.assigneeId);
                return (
                  <div key={t.id} className="border-l-4 border-red-400 pl-3 py-1">
                    <div className="text-sm font-medium text-gray-900">{t.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <ProductBadge product={t.product} />
                      <PriorityBadge priority={t.priority} />
                      {m && <span className="text-xs text-gray-500">{m.name}</span>}
                    </div>
                    {t.desc && <p className="text-xs text-gray-500 mt-1">{t.desc}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full task list */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-medium text-gray-900 mb-4">Full task list</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2 pr-4">Task</th>
                <th className="text-left pb-2 px-2">Product</th>
                <th className="text-left pb-2 px-2">Assignee</th>
                <th className="text-left pb-2 px-2">Status</th>
                <th className="text-left pb-2 px-2">Priority</th>
              </tr></thead>
              <tbody>{tasks.map(t => {
                const m = state.members.find(mm=>mm.id===t.assigneeId);
                return (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2.5 pr-4 max-w-[220px]">
                      <div className="font-medium text-gray-900">{t.title}</div>
                      {t.desc && <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{t.desc}</div>}
                    </td>
                    <td className="py-2.5 px-2"><ProductBadge product={t.product} /></td>
                    <td className="py-2.5 px-2 text-gray-600 text-xs">{m?.name ?? '—'}</td>
                    <td className="py-2.5 px-2"><StatusBadge status={t.status} /></td>
                    <td className="py-2.5 px-2"><PriorityBadge priority={t.priority} /></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

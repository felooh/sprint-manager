'use client';

import { useData } from '@/lib/data-context';
import { PRODUCTS, AVATAR_COLORS } from '@/lib/types';
import { MetricCard, ProgressBar, ProductBadge, PriorityBadge, Spinner } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

const PFILL = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500'];

export default function Overview() {
  const { state, syncStatus, activeSprint } = useData();
  if (syncStatus === 'loading') return <Spinner />;

  const tasks = activeSprint ? state.tasks.filter(t => t.sprintId === activeSprint.id) : state.tasks;
  const total   = tasks.length;
  const done    = tasks.filter(t => t.status === 'Done').length;
  const inprog  = tasks.filter(t => t.status === 'In Progress').length;
  const blocked = tasks.filter(t => t.status === 'Blocked').length;
  const pct     = total ? Math.round(done / total * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total tasks"  value={total} />
        <MetricCard label="Done"         value={done}    valueClass="text-green-700" />
        <MetricCard label="In progress"  value={inprog}  valueClass="text-blue-700" />
        <MetricCard label="Blocked"      value={blocked} valueClass={blocked ? 'text-red-700' : 'text-gray-900'} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Sprint progress */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-medium text-gray-900 mb-3">{activeSprint ? activeSprint.name + ' progress' : 'Sprint progress'}</h3>
          <div className="text-4xl font-bold text-gray-900 mb-2">{pct}%</div>
          <ProgressBar pct={pct} />
          <p className="text-xs text-gray-500 mt-2">{done} of {total} completed{activeSprint ? ` · ${activeSprint.start} → ${activeSprint.end}` : ''}</p>
        </div>

        {/* By product */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-medium text-gray-900 mb-3">By product</h3>
          {PRODUCTS.map((p, i) => {
            const pt = tasks.filter(t => t.product === p);
            const pd = pt.filter(t => t.status === 'Done').length;
            const pp = pt.length ? Math.round(pd / pt.length * 100) : 0;
            return (
              <div key={p} className="mb-3 last:mb-0">
                <div className="flex justify-between items-center mb-1">
                  <ProductBadge product={p} />
                  <span className="text-xs text-gray-500">{pd}/{pt.length} · {pp}%</span>
                </div>
                <ProgressBar pct={pp} color={PFILL[i]} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Team workload */}
      <div className="bg-white border border-gray-100 rounded-xl p-5">
        <h3 className="font-medium text-gray-900 mb-4">Team workload</h3>
        {!state.members.length ? (
          <p className="text-sm text-gray-400">No team members yet. Go to the Team tab to add members.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {state.members.map((m, i) => {
              const mt = tasks.filter(t => t.assigneeId === m.id);
              const md = mt.filter(t => t.status === 'Done').length;
              const mb = mt.filter(t => t.status === 'Blocked').length;
              const [bg, tc] = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={m.id} className="flex items-center gap-3 py-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: bg, color: tc }}>
                    {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{m.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-xs text-gray-500">{m.role}</span>
                      <span className="text-gray-300">·</span>
                      <ProductBadge product={m.product} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">{mt.length} tasks</div>
                    <div className="text-xs text-gray-500">{md} done{mb > 0 ? <span className="text-red-600"> · {mb} blocked</span> : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Blocked */}
      {blocked > 0 && (
        <div className="bg-white border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-red-500" />
            <h3 className="font-medium text-red-700">Blocked / at-risk ({blocked})</h3>
          </div>
          <div className="space-y-2">
            {tasks.filter(t => t.status === 'Blocked').map(t => {
              const m = state.members.find(mm => mm.id === t.assigneeId);
              return (
                <div key={t.id} className="border-l-4 border-red-400 pl-3 py-1">
                  <div className="text-sm font-medium text-gray-900">{t.title}</div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
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
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { Task, STATUSES, PRODUCTS, AVATAR_COLORS, getDaysDue } from '@/lib/types';
import { ProductBadge, PriorityBadge, StatusBadge, DueBadge, Spinner } from '@/components/ui';
import TaskModal from '@/components/TaskModal';
import { Plus } from 'lucide-react';

export default function Board() {
  const { state, syncStatus, activeSprint } = useData();
  const [selectedSprint, setSelectedSprint] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined);

  if (syncStatus === 'loading') return <Spinner />;

  const sprintId = selectedSprint || activeSprint?.id || '';
  let tasks = state.tasks.filter(t => t.sprintId === sprintId);
  if (productFilter) tasks = tasks.filter(t => t.product === productFilter);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={selectedSprint} onChange={e => setSelectedSprint(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          {state.sprints.map(s => <option key={s.id} value={s.id}>{s.name}{s.active === 'TRUE' ? ' (active)' : ''}</option>)}
        </select>
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          <option value="">All products</option>
          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
        </select>
        <button onClick={() => setEditTask(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
          <Plus size={14} /> Add task
        </button>
      </div>

      {/* Board */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-5 gap-3 min-w-[900px]">
          {STATUSES.map(status => {
            const col = tasks.filter(t => t.status === status);
            return (
              <div key={status} className="bg-gray-50 rounded-xl p-3 min-h-[220px]">
                <div className="flex items-center gap-1.5 mb-3">
                  <StatusBadge status={status} />
                  <span className="text-xs text-gray-400 ml-auto">{col.length}</span>
                </div>
                <div className="space-y-2">
                  {col.map(t => {
                    const mi = state.members.findIndex(m => m.id === t.assigneeId);
                    const m  = mi >= 0 ? state.members[mi] : null;
                    const [bg, tc] = mi >= 0 ? AVATAR_COLORS[mi % AVATAR_COLORS.length] : ['#E5E7EB','#6B7280'];
                    return (
                      <div key={t.id} onClick={() => setEditTask(t)} className="bg-white border border-gray-100 rounded-lg p-2.5 cursor-pointer hover:border-gray-300 transition-colors">
                        <div className="text-sm font-medium text-gray-900 mb-2 leading-snug">{t.title}</div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <ProductBadge product={t.product} />
                          <PriorityBadge priority={t.priority} />
                          <DueBadge daysDue={getDaysDue(t)} />
                          {m && (
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ml-auto" style={{ background: bg, color: tc }}>
                              {m.name.split(' ').map((w:string) => w[0]).join('').slice(0,2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {editTask !== undefined && <TaskModal task={editTask} onClose={() => setEditTask(undefined)} />}
    </div>
  );
}

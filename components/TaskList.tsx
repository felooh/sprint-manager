'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { Task, PRODUCTS } from '@/lib/types';
import { ProductBadge, StatusBadge, PriorityBadge, Spinner } from '@/components/ui';
import TaskModal from '@/components/TaskModal';
import { Plus } from 'lucide-react';

export default function TaskList() {
  const { state, syncStatus } = useData();
  const [fprod, setFprod]   = useState('');
  const [fstat, setFstat]   = useState('');
  const [fassn, setFassn]   = useState('');
  const [fsprint, setFsprint] = useState('');
  const [editTask, setEditTask] = useState<Task | null | undefined>(undefined);

  if (syncStatus === 'loading') return <Spinner />;

  let tasks = state.tasks;
  if (fprod)   tasks = tasks.filter(t => t.product === fprod);
  if (fstat)   tasks = tasks.filter(t => t.status === fstat);
  if (fassn)   tasks = tasks.filter(t => t.assigneeId === fassn);
  if (fsprint) tasks = tasks.filter(t => t.sprintId === fsprint);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-5">
        <select value={fprod} onChange={e => setFprod(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          <option value="">All products</option>
          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
        </select>
        <select value={fstat} onChange={e => setFstat(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          <option value="">All statuses</option>
          {['To Do','In Progress','Review','Done','Blocked'].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={fassn} onChange={e => setFassn(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          <option value="">All members</option>
          {state.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select value={fsprint} onChange={e => setFsprint(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
          <option value="">All sprints</option>
          {state.sprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={() => setEditTask(null)} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors ml-auto">
          <Plus size={14} /> Add task
        </button>
      </div>

      {!tasks.length ? (
        <p className="text-sm text-gray-400 py-8 text-center">No tasks found.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map(t => {
            const m  = state.members.find(mm => mm.id === t.assigneeId);
            const sp = state.sprints.find(s => s.id === t.sprintId);
            return (
              <div key={t.id} className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 mb-2">{t.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
                      <ProductBadge product={t.product} />
                      {m && <span className="text-xs text-gray-500">{m.name}</span>}
                      {sp && <span className="text-xs text-gray-400">{sp.name}</span>}
                    </div>
                    {t.desc && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{t.desc}</p>}
                  </div>
                  <button onClick={() => setEditTask(t)} className="flex-shrink-0 px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editTask !== undefined && <TaskModal task={editTask} onClose={() => setEditTask(undefined)} />}
    </div>
  );
}

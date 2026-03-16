'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { Spinner } from '@/components/ui';

export default function Sprints() {
  const { state, syncStatus, addSprint, removeSprint, setActiveSprint } = useData();
  const [name, setName]   = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd]     = useState('');
  const [saving, setSaving] = useState(false);

  if (syncStatus === 'loading') return <Spinner />;

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await addSprint({ name: name.trim(), start, end }); setName(''); setStart(''); setEnd(''); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* List */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">All sprints</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          {!state.sprints.length ? (
            <p className="text-sm text-gray-400">No sprints yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {state.sprints.map(s => {
                const st   = state.tasks.filter(t => t.sprintId === s.id);
                const done = st.filter(t => t.status === 'Done').length;
                const pct  = st.length ? Math.round(done / st.length * 100) : 0;
                return (
                  <div key={s.id} className="py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{s.name}</span>
                        {s.active === 'TRUE' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">active</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {s.start || '—'} → {s.end || '—'} &nbsp;·&nbsp; {st.length} tasks, {done} done ({pct}%)
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {s.active !== 'TRUE' && (
                        <button onClick={() => setActiveSprint(s.id)} className="text-xs border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">Set active</button>
                      )}
                      <button onClick={() => removeSprint(s.id)} className="text-xs text-red-500 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">Del</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Create sprint</h2>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Sprint 2" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start date</label>
                <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End date</label>
                <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
              </div>
            </div>
            <button onClick={handleAdd} disabled={saving || !name.trim()} className="w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
              {saving ? 'Creating...' : 'Create sprint'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

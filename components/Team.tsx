'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { PRODUCTS, ROLES, STATUSES, AVATAR_COLORS } from '@/lib/types';
import { ProductBadge, StatusBadge, Spinner } from '@/components/ui';

export default function Team() {
  const { state, syncStatus, activeSprint, addMember, removeMember } = useData();
  const [name, setName]       = useState('');
  const [role, setRole]       = useState(ROLES[0]);
  const [product, setProduct] = useState(PRODUCTS[0] as string);
  const [saving, setSaving]   = useState(false);

  if (syncStatus === 'loading') return <Spinner />;

  const spTasks = activeSprint ? state.tasks.filter(t => t.sprintId === activeSprint.id) : state.tasks;

  const handleAdd = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await addMember({ name: name.trim(), role, product }); setName(''); }
    finally { setSaving(false); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Members list + add form */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Team members</h2>

        {/* List */}
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-4">
          {!state.members.length ? (
            <p className="text-sm text-gray-400">No members yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {state.members.map((m, i) => {
                const [bg, tc] = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const mt = state.tasks.filter(t => t.assigneeId === m.id).length;
                return (
                  <div key={m.id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ background: bg, color: tc }}>
                      {m.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{m.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-500">{m.role}</span>
                        <span className="text-gray-300 text-xs">·</span>
                        <ProductBadge product={m.product} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{mt} tasks</span>
                      <button onClick={() => removeMember(m.id)} className="text-xs text-red-500 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add form */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add member</h3>
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <select value={role} onChange={e => setRole(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-400">
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <select value={product} onChange={e => setProduct(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-400">
              {[...PRODUCTS, 'All products'].map(p => <option key={p}>{p}</option>)}
            </select>
            <button onClick={handleAdd} disabled={saving || !name.trim()} className="w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
              {saving ? 'Adding...' : 'Add member'}
            </button>
          </div>
        </div>
      </div>

      {/* Workload */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Workload — {activeSprint?.name ?? 'active sprint'}</h2>
        {!state.members.length ? (
          <p className="text-sm text-gray-400">No members yet.</p>
        ) : (
          <div className="space-y-3">
            {state.members.map((m, i) => {
              const mt = spTasks.filter(t => t.assigneeId === m.id);
              const [bg, tc] = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const byStatus = STATUSES.map(s => ({ s, n: mt.filter(t => t.status === s).length })).filter(x => x.n > 0);
              return (
                <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: bg, color: tc }}>
                      {m.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.name}</div>
                      <div className="text-xs text-gray-500">{mt.length} tasks this sprint</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {byStatus.map(x => <StatusBadge key={x.s} status={`${x.s}: ${x.n}`} />)}
                    {!mt.length && <span className="text-xs text-gray-400">No tasks assigned yet</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

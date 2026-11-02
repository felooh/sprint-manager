'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { HEALTHS, Member, PRODUCTS, ROLES, AVATAR_COLORS } from '@/lib/types';
import { averageProgress } from '@/lib/goals';
import { HealthBadge, ProductBadge, Spinner } from '@/components/ui';

export default function Team() {
  const { state, syncStatus, addMember, updateMember, removeMember } = useData();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName]       = useState('');
  const [role, setRole]       = useState(ROLES[0]);
  const [product, setProduct] = useState(PRODUCTS[0] as string);
  const [saving, setSaving]   = useState(false);

  if (syncStatus === 'loading') return <Spinner />;

  const resetForm = () => { setEditingId(null); setName(''); setRole(ROLES[0]); setProduct(PRODUCTS[0]); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId) await updateMember({ id: editingId, name: name.trim(), role, product });
      else await addMember({ name: name.trim(), role, product });
      resetForm();
    } catch {
      // The error toast has already told the user; keep the form to retry
    } finally { setSaving(false); }
  };

  const startEdit = (m: Member) => { setEditingId(m.id); setName(m.name); setRole(m.role); setProduct(m.product); };

  const handleRemove = async (m: Member, goalCount: number) => {
    const note = goalCount ? ` They'll be taken off ${goalCount} goal task${goalCount === 1 ? '' : 's'}.` : '';
    if (!confirm(`Remove ${m.name} from the team?${note}`)) return;
    try {
      await removeMember(m.id);
      if (editingId === m.id) resetForm();
    } catch {
      // Shown by the error toast
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Members list + add form */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Team members</h2>

        {/* List */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
          {!state.members.length ? (
            <p className="text-sm text-gray-400">No members yet.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {state.members.map((m, i) => {
                const [bg, tc] = AVATAR_COLORS[i % AVATAR_COLORS.length];
                const mt = state.tracks.filter(t => t.ownerIds.includes(m.id)).length;
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
                      <span className="text-xs text-gray-400">{mt} goal task{mt === 1 ? '' : 's'}</span>
                      <button onClick={() => startEdit(m)} aria-label={`Edit ${m.name}`} className="text-xs text-gray-700 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 transition-colors">Edit</button>
                      <button onClick={() => handleRemove(m, mt)} aria-label={`Remove ${m.name}`} className="text-xs text-red-600 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add form */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">{editingId ? 'Edit member' : 'Add member'}</h3>
          <div className="space-y-3">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" aria-label="Full name" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
            <select value={role} aria-label="Role" onChange={e => setRole(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-400">
              {ROLES.map(r => <option key={r}>{r}</option>)}
            </select>
            <select value={product} aria-label="Product" onChange={e => setProduct(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-gray-400">
              {[...new Set([...PRODUCTS, 'All products', product])].map(p => <option key={p}>{p}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add member'}
              </button>
              {editingId && <button onClick={resetForm} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>}
            </div>
          </div>
        </div>
      </div>

      {/* Workload */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Workload</h2>
        {!state.members.length ? (
          <p className="text-sm text-gray-400">No members yet.</p>
        ) : (
          <div className="space-y-3">
            {state.members.map((m, i) => {
              const mt = state.tracks.filter(t => t.ownerIds.includes(m.id));
              const [bg, tc] = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const byStatus = HEALTHS.map(s => ({ s, n: mt.filter(t => t.health === s).length })).filter(x => x.n > 0);
              return (
                <div key={m.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold" style={{ background: bg, color: tc }}>
                      {m.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{m.name}</div>
                      <div className="text-xs text-gray-500">{mt.length} goal task{mt.length === 1 ? '' : 's'}{mt.length ? ` · ${averageProgress(mt)}% average progress` : ''}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {byStatus.map(x => <HealthBadge key={x.s} health={x.s} count={x.n} />)}
                    {!mt.length && <span className="text-xs text-gray-400">No goal tasks assigned yet</span>}
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

'use client';

import { useState } from 'react';
import { Goal, PRIORITIES, QUARTERS, TASK_STEPS, TRACKING_SCOPES } from '@/lib/types';
import { useData } from '@/lib/data-context';
import { currentQuarter, formatQuarter } from '@/lib/goals';
import { Modal } from '@/components/ui';

interface Props {
  goal?: Goal | null;
  defaultProduct?: string;
  onCreated?: (quarter: string, products: string[]) => void;
  onClose: () => void;
}

export default function GoalModal({ goal, defaultProduct, onCreated, onClose }: Props) {
  const { state, saveGoal, deleteGoal } = useData();
  const tracked = goal ? state.tracks.filter(t => t.goalId === goal.id).map(t => t.product) : [];
  const [title, setTitle] = useState(goal?.title ?? '');
  const [desc, setDesc] = useState(goal?.desc ?? '');
  const [priority, setPriority] = useState(goal?.priority ?? 'Medium');
  const [quarter, setQuarter] = useState(goal ? goal.quarter : currentQuarter());
  const [products, setProducts] = useState<string[]>(goal ? tracked : defaultProduct ? [defaultProduct] : []);
  const [ownerIds, setOwnerIds] = useState<string[]>([]);
  const [targetDate, setTargetDate] = useState('');
  const [optionalSteps, setOptionalSteps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggle = (list: string[], item: string) => list.includes(item) ? list.filter(x => x !== item) : [...list, item];
  const isScope = (scope: string[]) => scope.length === products.length && scope.every(p => products.includes(p));
  const validScope = TRACKING_SCOPES.some(isScope);
  const removing = tracked.filter(p => !products.includes(p));

  const handleSave = async () => {
    if (!title.trim() || !validScope) return;
    if (removing.length && !confirm(`Stop tracking this on ${removing.join(' and ')}? Its progress, owners and steps there will be removed.`)) return;
    setSaving(true);
    try {
      await saveGoal({ id: goal?.id, title: title.trim(), desc: desc.trim(), priority, quarter }, products, goal ? undefined : { ownerIds, targetDate, optionalSteps });
      if (!goal) onCreated?.(quarter, products);
      onClose();
    } catch {
      // The error toast has already told the user; keep the form open to retry
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!goal || !confirm(`Delete "${goal.title}" from every product? This removes all its progress tracking.`)) return;
    setSaving(true);
    try { await deleteGoal(goal.id); onClose(); }
    catch { /* shown by the error toast */ }
    finally { setSaving(false); }
  };

  return (
    <Modal
      label={goal ? 'Edit goal task' : 'Add goal task'}
      width="max-w-3xl"
      onClose={onClose}
      header={<h3 className="font-semibold text-gray-900">{goal ? 'Edit goal task' : 'Add goal task'}</h3>}
      footer={
        <>
          <button onClick={handleSave} disabled={saving || !title.trim() || !validScope} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          {goal && (
            <button onClick={handleDelete} disabled={saving} className="ml-auto px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              Delete
            </button>
          )}
        </>
      }
    >
      <div className="p-5 grid md:grid-cols-2 gap-x-8 gap-y-4">
        <div className="space-y-4 min-w-0">
          <div>
            <label htmlFor="goal-title" className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
            <input id="goal-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Patient appointment booking" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <div>
            <label htmlFor="goal-desc" className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
            <textarea id="goal-desc" value={desc} onChange={e => setDesc(e.target.value)} placeholder="What does finished look like?" rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-priority" className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
              <select id="goal-priority" value={priority} onChange={e => setPriority(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="goal-quarter" className="block text-xs font-medium text-gray-600 mb-1.5">Quarter</label>
              <select id="goal-quarter" value={quarter} onChange={e => setQuarter(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                {!quarter && <option value="">Not set</option>}
                {QUARTERS.map(q => <option key={q} value={q}>{formatQuarter(q)}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="space-y-4 min-w-0">
          <fieldset>
            <legend className="block text-xs font-medium text-gray-600 mb-1.5">Belongs to *</legend>
            <div className="space-y-2">
              {TRACKING_SCOPES.map(scope => (
                <label key={scope.join()} className="flex items-center gap-2 text-sm text-gray-800">
                  <input type="radio" name="goal-scope" checked={isScope(scope)} onChange={() => setProducts(scope)} />
                  {scope.length > 1 ? scope.join(' + ') : `${scope[0]} only`}
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Every task gets the standard steps, from Development to Frontend Deployment. A task on both Afyangu products tracks them separately for each.</p>
          </fieldset>
          {!goal && (
            <>
              <div>
                <label htmlFor="goal-target" className="block text-xs font-medium text-gray-600 mb-1.5">Target date</label>
                <input id="goal-target" type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white" />
              </div>
              <fieldset>
                <legend className="block text-xs font-medium text-gray-600 mb-1.5">Optional steps this task needs</legend>
                <div className="space-y-1.5">
                  {TASK_STEPS.filter(st => st.optional).map(st => (
                    <label key={st.key} className="flex items-center gap-2 text-sm text-gray-800">
                      <input type="checkbox" checked={optionalSteps.includes(st.key)} onChange={() => setOptionalSteps(l => toggle(l, st.key))} />
                      {st.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {state.members.length > 0 && (
                <fieldset>
                  <legend className="block text-xs font-medium text-gray-600 mb-1.5">Developers</legend>
                  <div className="grid grid-cols-2 gap-1.5 max-h-28 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {state.members.map(m => (
                      <label key={m.id} className="flex items-center gap-2 text-sm text-gray-800 min-w-0">
                        <input type="checkbox" checked={ownerIds.includes(m.id)} onChange={() => setOwnerIds(l => toggle(l, m.id))} />
                        <span className="truncate">{m.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

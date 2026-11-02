'use client';

import { useState } from 'react';
import { GoalStep, GoalTrack, HEALTHS, HEALTH_FILL, TASK_STEPS } from '@/lib/types';
import { useData } from '@/lib/data-context';
import { normaliseTrack, formatDate, formatQuarter } from '@/lib/goals';
import { Modal, ProductBadge, ProgressBar } from '@/components/ui';

interface Props {
  track: GoalTrack;
  onEditGoal: () => void;
  onClose: () => void;
}

export default function TrackModal({ track, onEditGoal, onClose }: Props) {
  const { state, saveTrack } = useData();
  const goal = state.goals.find(g => g.id === track.goalId);
  const [form, setForm] = useState(track);
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<GoalTrack>) => setForm(f => normaliseTrack({ ...f, ...patch }));
  const updateStep = (key: string, patch: Partial<GoalStep>) => update({ steps: form.steps.map(s => s.key === key ? { ...s, ...patch } : s) });
  const toggleOwner = (id: string) => update({ ownerIds: form.ownerIds.includes(id) ? form.ownerIds.filter(x => x !== id) : [...form.ownerIds, id] });

  // Developers on this product are listed first
  const people = [...state.members].sort((a, b) => Number(b.product === track.product) - Number(a.product === track.product));
  const history = state.log.filter(e => e.trackId === track.id).slice(-5).reverse();

  const handleSave = async () => {
    setSaving(true);
    try { await saveTrack(form); onClose(); }
    catch { /* shown by the error toast; keep the form open to retry */ }
    finally { setSaving(false); }
  };

  return (
    <Modal
      label={`Update ${goal?.title ?? 'goal task'} on ${track.product}`}
      width="max-w-4xl"
      onClose={onClose}
      header={
        <>
          <h3 className="font-semibold text-gray-900">{goal?.title ?? 'Goal task'}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <ProductBadge product={track.product} />
            {goal && <span className="text-xs text-gray-500">{formatQuarter(goal.quarter)}</span>}
          </div>
          {goal?.desc && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{goal.desc}</p>}
        </>
      }
      footer={
        <>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save update'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onEditGoal} className="ml-auto px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Edit goal task</button>
        </>
      }
    >
        <div className="p-5 grid md:grid-cols-2 gap-x-8 gap-y-5">
          {/* Progress */}
          <div className="space-y-4 min-w-0">
          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-xs font-medium text-gray-600">Overall progress</span>
              <span className="text-2xl font-semibold text-gray-900">{form.progress}%</span>
            </div>
            <ProgressBar pct={form.progress} color={HEALTH_FILL[form.health]} />
            <p className="text-xs text-gray-500 mt-2">The average of the steps below.</p>
          </div>

          <div>
            <div className="space-y-1.5">
              {TASK_STEPS.map(({ key, label, optional }) => {
                const step = form.steps.find(s => s.key === key);
                if (!step) return null;
                return (
                  <div key={key} className="grid grid-cols-[minmax(0,1fr)_5rem] sm:grid-cols-[11rem_minmax(0,1fr)_5rem] items-center gap-x-3 min-h-9">
                    <span className="flex items-center gap-2 min-w-0">
                      {optional && (
                        <input id={`need-${key}`} type="checkbox" checked={step.enabled} onChange={e => updateStep(key, { enabled: e.target.checked })} aria-label={`${label} needed for this task`} />
                      )}
                      <label htmlFor={optional ? `need-${key}` : `step-${key}`} className={`text-sm leading-tight ${step.enabled ? 'text-gray-800' : 'text-gray-400'}`}>{label}</label>
                    </span>
                    {step.enabled ? (
                      <>
                        <input type="range" min={0} max={100} step={5} value={step.progress} onChange={e => updateStep(key, { progress: Number(e.target.value) })} aria-label={`${label} slider`} className="w-full accent-gray-900 order-last col-span-2 sm:order-none sm:col-span-1" />
                        <span className="flex items-center justify-end gap-1 text-sm font-medium text-gray-900">
                          <input
                            id={`step-${key}`}
                            type="number"
                            min={0}
                            max={100}
                            value={step.progress}
                            onChange={e => updateStep(key, { progress: Number(e.target.value) })}
                            aria-label={`${label} percent`}
                            className="w-14 border border-gray-200 rounded-lg px-1.5 py-1 text-right text-sm focus:outline-none focus:border-gray-400"
                          />
                          %
                        </span>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 text-right sm:col-span-2">Not needed</span>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">Tick an optional step only if this task needs it.</p>
          </div>
          </div>

          {/* Details */}
          <div className="space-y-4 min-w-0">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="track-status" className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select id="track-status" value={form.health} onChange={e => update({ health: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                {HEALTHS.map(h => (
                  <option key={h} disabled={(h === 'Done' && form.progress < 100) || (h === 'Not Started' && form.progress > 0)}>{h}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="track-target" className="block text-xs font-medium text-gray-600 mb-1.5">Target date</label>
              <input id="track-target" type="date" value={form.targetDate} onChange={e => update({ targetDate: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white" />
            </div>
          </div>

          <fieldset>
            <legend className="block text-xs font-medium text-gray-600 mb-1.5">Developers</legend>
            {!people.length ? (
              <p className="text-xs text-gray-500">Add people in the Team tab first.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {people.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-sm text-gray-800 min-w-0">
                    <input type="checkbox" checked={form.ownerIds.includes(m.id)} onChange={() => toggleOwner(m.id)} />
                    <span className="truncate">{m.name}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          <div>
            <label htmlFor="track-note" className="block text-xs font-medium text-gray-600 mb-1.5">Latest update</label>
            <textarea id="track-note" value={form.note} onChange={e => update({ note: e.target.value })} placeholder="What changed, or what's in the way? This appears in reports." rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none" />
          </div>

          {history.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 mb-1.5">Recent history</h4>
              <ul className="space-y-1">
                {history.map(e => (
                  <li key={e.id} className="text-xs text-gray-500">
                    {formatDate(e.at)} · <span className="text-gray-800">{e.progress}%</span> · {e.health}{e.note ? ` · ${e.note}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
          </div>
        </div>
    </Modal>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Task, PRODUCTS, STATUSES, PRIORITIES } from '@/lib/types';
import { useData } from '@/lib/data-context';
import { X } from 'lucide-react';

interface Props {
  task?: Task | null;
  onClose: () => void;
}

export default function TaskModal({ task, onClose }: Props) {
  const { state, saveTask, deleteTask, activeSprint } = useData();
  const [form, setForm] = useState({
    title: '', product: PRODUCTS[0], sprintId: '', status: 'To Do',
    priority: 'Medium', assigneeId: '', desc: '', createdAt: '', updatedAt: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({ title: task.title, product: task.product, sprintId: task.sprintId, status: task.status, priority: task.priority, assigneeId: task.assigneeId, desc: task.desc, createdAt: task.createdAt, updatedAt: task.updatedAt });
    } else {
      const now = new Date().toISOString();
      setForm({ title: '', product: PRODUCTS[0], sprintId: activeSprint?.id ?? '', status: 'To Do', priority: 'Medium', assigneeId: '', desc: '', createdAt: now, updatedAt: now });
    }
  }, [task, activeSprint]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await saveTask(task ? { id: task.id, ...form } : form);
      onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!task || !confirm('Delete this task?')) return;
    setSaving(true);
    try { await deleteTask(task.id); onClose(); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{task ? 'Edit task' : 'Add task'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Task title" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Product</label>
              <select value={form.product} onChange={e => set('product', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                {PRODUCTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Sprint</label>
              <select value={form.sprintId} onChange={e => set('sprintId', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                <option value="">No sprint</option>
                {state.sprints.map(s => <option key={s.id} value={s.id}>{s.name}{s.active === 'TRUE' ? ' (active)' : ''}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Assignee</label>
            <select value={form.assigneeId} onChange={e => set('assigneeId', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 bg-white">
              <option value="">Unassigned</option>
              {state.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
            <textarea value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="Optional task description..." rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none" />
          </div>
        </div>
        <div className="flex items-center gap-2 p-5 border-t border-gray-100">
          <button onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : 'Save task'}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          {task && (
            <button onClick={handleDelete} disabled={saving} className="ml-auto px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

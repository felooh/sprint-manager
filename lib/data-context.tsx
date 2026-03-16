'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { AppState, Member, Sprint, Task, SyncStatus } from './types';
import { uid, sheetsBatchGet, sheetsAppend, sheetsRewrite, ensureSheets } from './sheets';

interface DataContextValue {
  state: AppState;
  syncStatus: SyncStatus;
  loadAll: () => Promise<void>;
  addMember: (m: Omit<Member, 'id'>) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  addSprint: (s: Omit<Sprint, 'id' | 'active'>) => Promise<void>;
  removeSprint: (id: string) => Promise<void>;
  setActiveSprint: (id: string) => Promise<void>;
  saveTask: (t: Omit<Task, 'id'> & { id?: string }) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  activeSprint: Sprint | undefined;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({ members: [], sprints: [], tasks: [] });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const setSync = (s: SyncStatus) => setSyncStatus(s);

  const loadAll = useCallback(async () => {
    setSync('loading');
    try {
      await ensureSheets();
      const [mRows, sRows, tRows] = await sheetsBatchGet(['Members!A2:D', 'Sprints!A2:E', 'Tasks!A2:H']);

      setState({
        members: mRows.filter(r => r[0]).map(r => ({ id: r[0], name: r[1]||'', role: r[2]||'', product: r[3]||'' })),
        sprints: sRows.filter(r => r[0]).map(r => ({ id: r[0], name: r[1]||'', start: r[2]||'', end: r[3]||'', active: r[4]||'FALSE' })),
        tasks:   tRows.filter(r => r[0]).map(r => ({ id: r[0], title: r[1]||'', product: r[2]||'', sprintId: r[3]||'', status: r[4]||'To Do', priority: r[5]||'Medium', assigneeId: r[6]||'', desc: r[7]||'' })),
      });
      setSync('ok');
    } catch (e) {
      console.error(e);
      setSync('error');
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activeSprint = state.sprints.find(s => s.active === 'TRUE') ?? state.sprints[0];

  // ── Members ──
  const addMember = async (m: Omit<Member, 'id'>) => {
    setSync('syncing');
    const newM = { id: uid(), ...m };
    await sheetsAppend('Members', [[newM.id, newM.name, newM.role, newM.product]]);
    setState(prev => ({ ...prev, members: [...prev.members, newM] }));
    setSync('ok');
  };

  const removeMember = async (id: string) => {
    setSync('syncing');
    const members = state.members.filter(m => m.id !== id);
    await sheetsRewrite('Members', members.map(m => [m.id, m.name, m.role, m.product]));
    setState(prev => ({ ...prev, members }));
    setSync('ok');
  };

  // ── Sprints ──
  const addSprint = async (s: Omit<Sprint, 'id' | 'active'>) => {
    setSync('syncing');
    const ns = { id: uid(), ...s, active: 'FALSE' };
    await sheetsAppend('Sprints', [[ns.id, ns.name, ns.start, ns.end, ns.active]]);
    setState(prev => ({ ...prev, sprints: [...prev.sprints, ns] }));
    setSync('ok');
  };

  const removeSprint = async (id: string) => {
    setSync('syncing');
    const sprints = state.sprints.filter(s => s.id !== id);
    await sheetsRewrite('Sprints', sprints.map(s => [s.id, s.name, s.start, s.end, s.active]));
    setState(prev => ({ ...prev, sprints }));
    setSync('ok');
  };

  const setActiveSprint = async (id: string) => {
    setSync('syncing');
    const sprints = state.sprints.map(s => ({ ...s, active: s.id === id ? 'TRUE' : 'FALSE' }));
    await sheetsRewrite('Sprints', sprints.map(s => [s.id, s.name, s.start, s.end, s.active]));
    setState(prev => ({ ...prev, sprints }));
    setSync('ok');
  };

  // ── Tasks ──
  const saveTask = async (t: Omit<Task, 'id'> & { id?: string }) => {
    setSync('syncing');
    if (t.id) {
      const tasks = state.tasks.map(tk => tk.id === t.id ? { ...tk, ...t } as Task : tk);
      await sheetsRewrite('Tasks', tasks.map(tk => [tk.id, tk.title, tk.product, tk.sprintId, tk.status, tk.priority, tk.assigneeId, tk.desc]));
      setState(prev => ({ ...prev, tasks }));
    } else {
      const nt = { id: uid(), ...t } as Task;
      await sheetsAppend('Tasks', [[nt.id, nt.title, nt.product, nt.sprintId, nt.status, nt.priority, nt.assigneeId, nt.desc]]);
      setState(prev => ({ ...prev, tasks: [...prev.tasks, nt] }));
    }
    setSync('ok');
  };

  const deleteTask = async (id: string) => {
    setSync('syncing');
    const tasks = state.tasks.filter(t => t.id !== id);
    await sheetsRewrite('Tasks', tasks.map(t => [t.id, t.title, t.product, t.sprintId, t.status, t.priority, t.assigneeId, t.desc]));
    setState(prev => ({ ...prev, tasks }));
    setSync('ok');
  };

  return (
    <DataContext.Provider value={{ state, syncStatus, loadAll, addMember, removeMember, addSprint, removeSprint, setActiveSprint, saveTask, deleteTask, activeSprint }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

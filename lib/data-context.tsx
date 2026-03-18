'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { AppState, Member, Sprint, Task, SyncStatus } from './types';
import { uid, sheetsBatchGet, sheetsAppend, sheetsRewrite, ensureSheets } from './sheets';
import { toast } from 'sonner';

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
  const { status } = useSession();
  const [state, setState] = useState<AppState>({ members: [], sprints: [], tasks: [] });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const setSync = (s: SyncStatus) => setSyncStatus(s);

  const loadAll = useCallback(async () => {
    setSync('loading');
    try {
      await ensureSheets();
      const [mRows, sRows, tRows] = await sheetsBatchGet(['Members!A2:D', 'Sprints!A2:E', 'Tasks!A2:J']);

      setState({
        members: mRows.filter(r => r[0]).map(r => ({ id: r[0], name: r[1]||'', role: r[2]||'', product: r[3]||'' })),
        sprints: sRows.filter(r => r[0]).map(r => ({ id: r[0], name: r[1]||'', start: r[2]||'', end: r[3]||'', active: r[4]||'FALSE' })),
        tasks:   tRows.filter(r => r[0]).map(r => ({
          id: r[0],
          title: r[1]||'',
          product: r[2]||'',
          sprintId: r[3]||'',
          status: r[4]||'To Do',
          priority: r[5]||'Medium',
          assigneeId: r[6]||'',
          desc: r[7]||'',
          createdAt: r[8]||new Date().toISOString(),
          updatedAt: r[9]||new Date().toISOString()
        })),
      });
      setSync('ok');
    } catch (e) {
      console.error(e);
      setSync('error');
      toast.error('Failed to load data', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
    }
  }, []);

  useEffect(() => {
    // Only load data when authenticated
    if (status === 'authenticated') {
      loadAll();
    }
  }, [status, loadAll]);

  const activeSprint = state.sprints.find(s => s.active === 'TRUE') ?? state.sprints[0];

  // ── Members ──
  const addMember = async (m: Omit<Member, 'id'>) => {
    setSync('syncing');
    try {
      const newM = { id: uid(), ...m };
      await sheetsAppend('Members', [[newM.id, newM.name, newM.role, newM.product]]);
      setState(prev => ({ ...prev, members: [...prev.members, newM] }));
      setSync('ok');
      toast.success('Member added successfully', {
        description: `${newM.name} has been added to the team`
      });
    } catch (e) {
      setSync('error');
      toast.error('Failed to add member', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  const removeMember = async (id: string) => {
    setSync('syncing');
    try {
      const memberToRemove = state.members.find(m => m.id === id);
      const members = state.members.filter(m => m.id !== id);
      await sheetsRewrite('Members', members.map(m => [m.id, m.name, m.role, m.product]));
      setState(prev => ({ ...prev, members }));
      setSync('ok');
      toast.success('Member removed', {
        description: memberToRemove ? `${memberToRemove.name} has been removed from the team` : 'Member removed successfully'
      });
    } catch (e) {
      setSync('error');
      toast.error('Failed to remove member', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  // ── Sprints ──
  const addSprint = async (s: Omit<Sprint, 'id' | 'active'>) => {
    setSync('syncing');
    try {
      const ns = { id: uid(), ...s, active: 'FALSE' };
      await sheetsAppend('Sprints', [[ns.id, ns.name, ns.start, ns.end, ns.active]]);
      setState(prev => ({ ...prev, sprints: [...prev.sprints, ns] }));
      setSync('ok');
      toast.success('Sprint created', {
        description: `${ns.name} (${ns.start} → ${ns.end})`
      });
    } catch (e) {
      setSync('error');
      toast.error('Failed to create sprint', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  const removeSprint = async (id: string) => {
    setSync('syncing');
    try {
      const sprintToRemove = state.sprints.find(s => s.id === id);
      const sprints = state.sprints.filter(s => s.id !== id);
      await sheetsRewrite('Sprints', sprints.map(s => [s.id, s.name, s.start, s.end, s.active]));
      setState(prev => ({ ...prev, sprints }));
      setSync('ok');
      toast.success('Sprint deleted', {
        description: sprintToRemove ? `${sprintToRemove.name} has been deleted` : 'Sprint deleted successfully'
      });
    } catch (e) {
      setSync('error');
      toast.error('Failed to delete sprint', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  const setActiveSprint = async (id: string) => {
    setSync('syncing');
    try {
      const newActiveSprint = state.sprints.find(s => s.id === id);
      const sprints = state.sprints.map(s => ({ ...s, active: s.id === id ? 'TRUE' : 'FALSE' }));
      await sheetsRewrite('Sprints', sprints.map(s => [s.id, s.name, s.start, s.end, s.active]));
      setState(prev => ({ ...prev, sprints }));
      setSync('ok');
      toast.success('Active sprint updated', {
        description: newActiveSprint ? `${newActiveSprint.name} is now the active sprint` : 'Sprint activated'
      });
    } catch (e) {
      setSync('error');
      toast.error('Failed to update active sprint', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  // ── Tasks ──
  const saveTask = async (t: Omit<Task, 'id'> & { id?: string }) => {
    setSync('syncing');
    try {
      if (t.id) {
        const now = new Date().toISOString();
        const tasks = state.tasks.map(tk => tk.id === t.id ? { ...tk, ...t, updatedAt: now } as Task : tk);
        await sheetsRewrite('Tasks', tasks.map(tk => [tk.id, tk.title, tk.product, tk.sprintId, tk.status, tk.priority, tk.assigneeId, tk.desc, tk.createdAt, tk.updatedAt]));
        setState(prev => ({ ...prev, tasks }));
        toast.success('Task updated', {
          description: `${t.title} has been updated`
        });
      } else {
        const now = new Date().toISOString();
        const nt = { id: uid(), ...t, createdAt: now, updatedAt: now } as Task;
        await sheetsAppend('Tasks', [[nt.id, nt.title, nt.product, nt.sprintId, nt.status, nt.priority, nt.assigneeId, nt.desc, nt.createdAt, nt.updatedAt]]);
        setState(prev => ({ ...prev, tasks: [...prev.tasks, nt] }));
        toast.success('Task created', {
          description: `${nt.title} has been created`
        });
      }
      setSync('ok');
    } catch (e) {
      setSync('error');
      toast.error(t.id ? 'Failed to update task' : 'Failed to create task', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  const deleteTask = async (id: string) => {
    setSync('syncing');
    try {
      const taskToDelete = state.tasks.find(t => t.id === id);
      const tasks = state.tasks.filter(t => t.id !== id);
      await sheetsRewrite('Tasks', tasks.map(t => [t.id, t.title, t.product, t.sprintId, t.status, t.priority, t.assigneeId, t.desc, t.createdAt, t.updatedAt]));
      setState(prev => ({ ...prev, tasks }));
      setSync('ok');
      toast.success('Task deleted', {
        description: taskToDelete ? `${taskToDelete.title} has been deleted` : 'Task deleted successfully'
      });
    } catch (e) {
      setSync('error');
      toast.error('Failed to delete task', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
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

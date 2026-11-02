'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { AppState, Goal, GoalTrack, Member, SyncStatus } from './types';
import { uid, sheetsBatchGet, sheetsAppend, sheetsRewrite, ensureSheets } from './sheets';
import { goalRow, trackRow, logRow, parseGoal, parseTrack, parseLog, normaliseTrack, newSteps } from './goals';
import { toast } from 'sonner';

interface DataContextValue {
  state: AppState;
  syncStatus: SyncStatus;
  loadAll: () => Promise<void>;
  addMember: (m: Omit<Member, 'id'>) => Promise<void>;
  updateMember: (m: Member) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
  saveGoal: (g: Pick<Goal, 'title' | 'desc' | 'priority' | 'quarter'> & { id?: string }, products: string[], setup?: NewTrackSetup) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  saveTrack: (t: GoalTrack) => Promise<void>;
}

// Starting values for the tracks of a new goal task
export interface NewTrackSetup {
  ownerIds: string[];
  targetDate: string;
  optionalSteps: string[];
}

const GOAL_RANGES = ['Goals!A2:G', 'GoalTracks!A2:J'];

// Existing sheet rows use the old product name
const productName = (p: string) => (p === 'P360 Mobile' ? 'P360 Mobile App' : p);

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { status, data: session } = useSession();
  const [state, setState] = useState<AppState>({ members: [], goals: [], tracks: [], log: [] });
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const setSync = (s: SyncStatus) => setSyncStatus(s);

  const loadAll = useCallback(async () => {
    setSync('loading');
    try {
      await ensureSheets();
      const [mRows, gRows, gtRows, lRows] = await sheetsBatchGet(['Members!A2:D', ...GOAL_RANGES, 'ProgressLog!A2:I']);

      setState({
        members: mRows.filter(r => r[0]).map(r => ({ id: r[0], name: r[1]||'', role: r[2]||'', product: productName(r[3]||'') })),
        goals:  gRows.filter(r => r[0]).map(parseGoal),
        tracks: gtRows.filter(r => r[0]).map(parseTrack),
        log:    lRows.filter(r => r[0]).map(parseLog),
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

  const updateMember = async (m: Member) => {
    setSync('syncing');
    try {
      const members = state.members.map(x => x.id === m.id ? m : x);
      await sheetsRewrite('Members', members.map(x => [x.id, x.name, x.role, x.product]));
      setState(prev => ({ ...prev, members }));
      setSync('ok');
      toast.success('Member updated', { description: m.name });
    } catch (e) {
      setSync('error');
      toast.error('Failed to update member', {
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

  // ── Goals ──
  // Goals and tracks are re-read before each write, because a rewrite replaces the
  // whole sheet and this page's copy may be missing someone else's latest update.
  const readGoalData = async () => {
    const [gRows, gtRows] = await sheetsBatchGet(GOAL_RANGES);
    return { goals: gRows.filter(r => r[0]).map(parseGoal), tracks: gtRows.filter(r => r[0]).map(parseTrack) };
  };

  const logEntry = (t: GoalTrack, at: string) => ({
    id: uid(), trackId: t.id, goalId: t.goalId, product: t.product, progress: t.progress,
    health: t.health, note: t.note, at, by: session?.user?.email ?? '',
  });

  const saveGoal = async (g: Pick<Goal, 'title' | 'desc' | 'priority' | 'quarter'> & { id?: string }, products: string[], setup?: NewTrackSetup) => {
    setSync('syncing');
    try {
      const now = new Date().toISOString();
      const fresh = await readGoalData();
      const prev = g.id ? fresh.goals.find(x => x.id === g.id) : undefined;
      if (g.id && !prev) throw new Error('This goal task was deleted by someone else. Refresh to see the latest.');

      const goal: Goal = { id: g.id ?? uid(), title: g.title, desc: g.desc, priority: g.priority, quarter: g.quarter, createdAt: prev?.createdAt ?? now, updatedAt: now };
      const goals = prev ? fresh.goals.map(x => x.id === goal.id ? goal : x) : [...fresh.goals, goal];
      if (prev) await sheetsRewrite('Goals', goals.map(goalRow));
      else await sheetsAppend('Goals', [goalRow(goal)]);

      const mine = fresh.tracks.filter(t => t.goalId === goal.id);
      const added: GoalTrack[] = products.filter(p => !mine.some(t => t.product === p)).map(product => ({
        id: uid(), goalId: goal.id, product, progress: 0, health: 'Not Started', ownerIds: setup?.ownerIds ?? [], targetDate: setup?.targetDate ?? '', note: '',
        steps: newSteps().map(st => ({ ...st, enabled: st.enabled || !!setup?.optionalSteps.includes(st.key) })), updatedAt: now,
      }));
      const removed = mine.filter(t => !products.includes(t.product));
      const tracks = [...fresh.tracks.filter(t => !removed.includes(t)), ...added];
      if (removed.length) await sheetsRewrite('GoalTracks', tracks.map(trackRow));
      else if (added.length) await sheetsAppend('GoalTracks', added.map(trackRow));

      const entries = added.map(t => logEntry(t, now));
      if (entries.length) await sheetsAppend('ProgressLog', entries.map(logRow));

      setState(s => ({ ...s, goals, tracks, log: [...s.log, ...entries] }));
      setSync('ok');
      toast.success(prev ? 'Goal task updated' : 'Goal task created', { description: goal.title });
    } catch (e) {
      setSync('error');
      toast.error('Failed to save goal task', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  const deleteGoal = async (id: string) => {
    setSync('syncing');
    try {
      const fresh = await readGoalData();
      const tracks = fresh.tracks.filter(t => t.goalId !== id);
      const goals = fresh.goals.filter(g => g.id !== id);
      await sheetsRewrite('GoalTracks', tracks.map(trackRow));
      await sheetsRewrite('Goals', goals.map(goalRow));
      setState(s => ({ ...s, goals, tracks }));
      setSync('ok');
      toast.success('Goal task deleted');
    } catch (e) {
      setSync('error');
      toast.error('Failed to delete goal task', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  const saveTrack = async (t: GoalTrack) => {
    setSync('syncing');
    try {
      const now = new Date().toISOString();
      const fresh = await readGoalData();
      const prev = fresh.tracks.find(x => x.id === t.id);
      if (!prev) throw new Error('This goal task was removed by someone else. Refresh to see the latest.');

      const next = { ...normaliseTrack(t), updatedAt: now };
      const tracks = fresh.tracks.map(x => x.id === t.id ? next : x);
      await sheetsRewrite('GoalTracks', tracks.map(trackRow));

      // The log is what reports use to work out progress made over a period
      const changed = prev.progress !== next.progress || prev.health !== next.health || prev.note !== next.note;
      const entry = changed ? logEntry(next, now) : null;
      if (entry) await sheetsAppend('ProgressLog', [logRow(entry)]);

      setState(s => ({ ...s, goals: fresh.goals, tracks, log: entry ? [...s.log, entry] : s.log }));
      setSync('ok');
      toast.success('Progress updated', { description: `${next.product}: ${next.progress}%` });
    } catch (e) {
      setSync('error');
      toast.error('Failed to update progress', {
        description: e instanceof Error ? e.message : 'An unexpected error occurred'
      });
      throw e;
    }
  };

  return (
    <DataContext.Provider value={{ state, syncStatus, loadAll, addMember, updateMember, removeMember, saveGoal, deleteGoal, saveTrack }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

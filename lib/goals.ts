import { AppState, Goal, GoalStep, GoalTrack, Member, ProgressEntry, TASK_STEPS } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Sheet rows ────────────────────────────────────────────────────────────
const clampPercent = (n: number) => Math.min(100, Math.max(0, Math.round(n) || 0));

export const newSteps = (progress = 0): GoalStep[] =>
  TASK_STEPS.map(({ key, optional }) => ({ key, progress: optional ? 0 : progress, enabled: !optional }));

// Tracks saved before the standard steps existed have one overall percentage.
// Starting every required step at that value keeps their overall progress unchanged.
function parseSteps(raw: string | undefined, progress: number): GoalStep[] {
  let saved: Partial<GoalStep>[] = [];
  try {
    const parsed = JSON.parse(raw || '[]');
    if (Array.isArray(parsed)) saved = parsed;
  } catch {
    // Unreadable cell: treated the same as a track without steps
  }
  if (!saved.some(s => s.key)) return newSteps(progress);

  return TASK_STEPS.map(({ key, optional }) => {
    const step = saved.find(s => s.key === key);
    return { key, progress: clampPercent(step?.progress ?? 0), enabled: !optional || !!step?.enabled };
  });
}

export const parseGoal = (r: string[]): Goal => ({
  id: r[0], title: r[1]||'', desc: r[2]||'', priority: r[3]||'Medium', createdAt: r[4]||'', updatedAt: r[5]||'', quarter: r[6]||'',
});

export const parseTrack = (r: string[]): GoalTrack => ({
  id: r[0],
  goalId: r[1]||'',
  product: r[2]||'',
  progress: Number(r[3]) || 0,
  health: r[4]||'Not Started',
  ownerIds: (r[5]||'').split(',').filter(Boolean),
  targetDate: r[6]||'',
  note: r[7]||'',
  steps: parseSteps(r[8], Number(r[3]) || 0),
  updatedAt: r[9]||'',
});

export const parseLog = (r: string[]): ProgressEntry => ({
  id: r[0], trackId: r[1]||'', goalId: r[2]||'', product: r[3]||'', progress: Number(r[4]) || 0,
  health: r[5]||'', note: r[6]||'', at: r[7]||'', by: r[8]||'',
});

export const goalRow = (g: Goal) => [g.id, g.title, g.desc, g.priority, g.createdAt, g.updatedAt, g.quarter];

export const trackRow = (t: GoalTrack) => [
  t.id, t.goalId, t.product, String(t.progress), t.health, t.ownerIds.join(','),
  t.targetDate, t.note, JSON.stringify(t.steps), t.updatedAt,
];

export const logRow = (e: ProgressEntry) => [e.id, e.trackId, e.goalId, e.product, String(e.progress), e.health, e.note, e.at, e.by];

// ── Progress rules ────────────────────────────────────────────────────────
// A track's progress is the average of the steps that apply to it, and only a
// track with all of those steps at 100% can be Done.
export function normaliseTrack(t: GoalTrack): GoalTrack {
  const steps = t.steps.map(s => ({ ...s, progress: clampPercent(s.progress) }));
  const active = steps.filter(s => s.enabled);
  const average = averageProgress(active);
  // Rounding must not turn 99.8% into 100% while a step is still unfinished
  const progress = active.some(s => s.progress < 100) ? Math.min(average, 99) : average;

  let health = t.health;
  if (progress === 100) health = 'Done';
  else if (health === 'Done' || (health === 'Not Started' && progress > 0)) health = 'On Track';
  return { ...t, steps, progress, health };
}

// Average progress of each step across tracks, counting only tracks that use the step
export function averageSteps(tracks: GoalTrack[]): GoalStep[] {
  return TASK_STEPS.map(({ key }) => {
    const using = tracks.flatMap(t => t.steps.filter(s => s.key === key && s.enabled));
    return { key, progress: averageProgress(using), enabled: using.length > 0 };
  });
}

export function stepLabel(key: string): string {
  return TASK_STEPS.find(s => s.key === key)?.label ?? key;
}

// A task on two products has two tracks but is still one goal task
export const countGoals = (tracks: GoalTrack[]) => new Set(tracks.map(t => t.goalId)).size;

export function averageProgress(tracks: { progress: number }[]): number {
  if (!tracks.length) return 0;
  return Math.round(tracks.reduce((sum, t) => sum + t.progress, 0) / tracks.length);
}

export const todayKey = () => new Date().toLocaleDateString('en-CA');

export function isOverdue(t: GoalTrack): boolean {
  return !!t.targetDate && t.health !== 'Done' && t.targetDate < todayKey();
}

export const needsAttention = (t: GoalTrack) => t.health === 'At Risk' || t.health === 'Blocked' || isOverdue(t);

export function daysUntil(date: string): number {
  return Math.round((new Date(date + 'T00:00:00').getTime() - new Date(todayKey() + 'T00:00:00').getTime()) / DAY_MS);
}

export function daysSince(iso: string): number {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS) : 0;
}

export const currentQuarter = () => String(Math.floor(new Date().getMonth() / 3) + 1);

export const formatQuarter = (q: string) => (q ? `Q${q}` : 'No quarter');

export function formatDate(date: string): string {
  if (!date) return '—';
  const d = new Date(date.length === 10 ? date + 'T00:00:00' : date);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Progress the track had `days` ago, from the last log entry before that point.
// A track with no entry that old started inside the period, so it counts from 0.
export function progressBefore(track: GoalTrack, log: ProgressEntry[], days: number): { baseline: number; isNew: boolean } {
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const earlier = log.filter(e => e.trackId === track.id && e.at <= since);
  if (!earlier.length) return { baseline: 0, isNew: true };
  const last = earlier.reduce((a, b) => (b.at >= a.at ? b : a));
  return { baseline: last.progress, isNew: false };
}

export function completedWithin(track: GoalTrack, log: ProgressEntry[], days: number): boolean {
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  return track.health === 'Done' && log.some(e => e.trackId === track.id && e.health === 'Done' && e.at > since);
}

export function formatChange(change: number): string {
  if (change === 0) return '—';
  return `${change > 0 ? '+' : ''}${change}%`;
}

// ── People ────────────────────────────────────────────────────────────────
export function devsForProduct(state: AppState, product: string): Member[] {
  const owners = new Set(state.tracks.filter(t => t.product === product).flatMap(t => t.ownerIds));
  return state.members.filter(m => m.product === product || m.product === 'All products' || owners.has(m.id));
}

export function ownerNames(t: GoalTrack, members: Member[]): string {
  return t.ownerIds.map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(', ');
}

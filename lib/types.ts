export interface Member {
  id: string;
  name: string;
  role: string;
  product: string;
}

export interface Goal {
  id: string;
  title: string;
  desc: string;
  priority: string;
  quarter: string; // '1' | '2' | '3' | '4', empty if not set
  createdAt: string;
  updatedAt: string;
}

export interface GoalStep {
  key: string; // one of TASK_STEPS
  progress: number; // 0-100
  enabled: boolean; // false when an optional step isn't needed for this task
}

// One goal task tracked on one product. The same goal has a separate track per
// product, so Web and Mobile can each have their own progress, owners and steps.
export interface GoalTrack {
  id: string;
  goalId: string;
  product: string;
  progress: number; // 0-100, the average of the steps that apply
  health: string;
  ownerIds: string[];
  targetDate: string; // YYYY-MM-DD
  note: string;
  steps: GoalStep[];
  updatedAt: string;
}

export interface ProgressEntry {
  id: string;
  trackId: string;
  goalId: string;
  product: string;
  progress: number;
  health: string;
  note: string;
  at: string;
  by: string;
}

export interface AppState {
  members: Member[];
  goals: Goal[];
  tracks: GoalTrack[];
  log: ProgressEntry[];
}

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'ok' | 'error';

export const PRODUCTS = ['Afyangu Web', 'Afyangu Mobile', 'P360 Mobile App'];
// The only product combinations a goal task can belong to
export const TRACKING_SCOPES = [
  ['Afyangu Web'],
  ['Afyangu Mobile'],
  ['P360 Mobile App'],
  ['Afyangu Web', 'Afyangu Mobile'],
];
// Every goal task goes through these steps, in this order
export const TASK_STEPS = [
  { key: 'development', label: 'Development',                 optional: false },
  { key: 'qa',          label: 'QA Testing',                  optional: false },
  { key: 'security',    label: 'Security Checks and Testing', optional: false },
  { key: 'afyangu-be',  label: 'Afyangu BE Deployment',       optional: true  },
  { key: 'upstream-be', label: 'Upstream BE Deployment',      optional: true  },
  { key: 'frontend',    label: 'Frontend Deployment',         optional: false },
];
export const QUARTERS = ['1', '2', '3', '4'];
export const HEALTHS = ['Not Started', 'On Track', 'At Risk', 'Blocked', 'Done'];
export const ROLES    = ['Frontend Dev','Mobile Dev','UI/UX Designer','QA Engineer','Backend Dev','Tech Lead','Other'];
export const PRIORITIES = ['High', 'Medium', 'Low'];

export const PRODUCT_BADGE: Record<string, string> = {
  'Afyangu Web':    'bg-blue-100 text-blue-800',
  'Afyangu Mobile': 'bg-purple-100 text-purple-800',
  'P360 Mobile App':'bg-emerald-100 text-emerald-800',
};
export const PRODUCT_FILL: Record<string, string> = {
  'Afyangu Web':    'bg-blue-500',
  'Afyangu Mobile': 'bg-purple-500',
  'P360 Mobile App':'bg-emerald-500',
};
export const HEALTH_BADGE: Record<string, string> = {
  'Not Started':'bg-gray-200 text-gray-700',
  'On Track':   'bg-blue-100 text-blue-800',
  'At Risk':    'bg-amber-100 text-amber-800',
  'Blocked':    'bg-red-100 text-red-800',
  'Done':       'bg-green-100 text-green-800',
};
export const HEALTH_FILL: Record<string, string> = {
  'Not Started':'bg-gray-400',
  'On Track':   'bg-blue-500',
  'At Risk':    'bg-amber-500',
  'Blocked':    'bg-red-500',
  'Done':       'bg-green-600',
};
export const PRIORITY_BADGE: Record<string, string> = {
  'High':   'bg-red-100 text-red-800',
  'Medium': 'bg-amber-100 text-amber-800',
  'Low':    'bg-green-100 text-green-800',
};

export const AVATAR_COLORS = [
  ['#B5D4F4','#0C447C'],
  ['#CECBF6','#3C3489'],
  ['#9FE1CB','#085041'],
  ['#F5C4B3','#993C1D'],
  ['#F4C0D1','#72243E'],
  ['#FAC775','#633806'],
  ['#C0DD97','#27500A'],
];

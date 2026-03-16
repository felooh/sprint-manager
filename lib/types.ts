export interface Member {
  id: string;
  name: string;
  role: string;
  product: string;
}

export interface Sprint {
  id: string;
  name: string;
  start: string;
  end: string;
  active: string; // 'TRUE' | 'FALSE'
}

export interface Task {
  id: string;
  title: string;
  product: string;
  sprintId: string;
  status: string;
  priority: string;
  assigneeId: string;
  desc: string;
}

export interface AppState {
  members: Member[];
  sprints: Sprint[];
  tasks: Task[];
}

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'ok' | 'error';

export const PRODUCTS = ['Afyangu Web', 'Afyangu Mobile', 'P360 Mobile', 'NIMIMI'];
export const STATUSES = ['To Do', 'In Progress', 'Review', 'Done', 'Blocked'];
export const ROLES    = ['Frontend Dev','Mobile Dev','UI/UX Designer','QA Engineer','Backend Dev','Tech Lead','Other'];
export const PRIORITIES = ['High', 'Medium', 'Low'];

export const PRODUCT_BADGE: Record<string, string> = {
  'Afyangu Web':    'bg-blue-100 text-blue-800',
  'Afyangu Mobile': 'bg-purple-100 text-purple-800',
  'P360 Mobile':    'bg-emerald-100 text-emerald-800',
  'NIMIMI':         'bg-amber-100 text-amber-800',
};
export const STATUS_BADGE: Record<string, string> = {
  'To Do':      'bg-gray-200 text-gray-700',
  'In Progress':'bg-blue-100 text-blue-800',
  'Review':     'bg-amber-100 text-amber-800',
  'Done':       'bg-green-100 text-green-800',
  'Blocked':    'bg-red-100 text-red-800',
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

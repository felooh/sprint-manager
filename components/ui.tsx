'use client';

import { AVATAR_COLORS, PRODUCT_BADGE, STATUS_BADGE, PRIORITY_BADGE } from '@/lib/types';
import { ReactNode } from 'react';

export function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${className ?? ''}`}>
      {label}
    </span>
  );
}

export function ProductBadge({ product }: { product: string }) {
  return <Badge label={product} className={PRODUCT_BADGE[product] ?? 'bg-gray-100 text-gray-700'} />;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={status} className={STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-700'} />;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge label={priority} className={PRIORITY_BADGE[priority] ?? 'bg-gray-100 text-gray-700'} />;
}

export function Avatar({ name, index, size = 'md' }: { name: string; index: number; size?: 'sm' | 'md' }) {
  const [bg, tc] = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-9 h-9 text-xs';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-semibold flex-shrink-0`} style={{ background: bg, color: tc }}>
      {initials}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-100 rounded-xl p-4 ${className ?? ''}`}>
      {children}
    </div>
  );
}

export function MetricCard({ label, value, valueClass }: { label: string; value: number | string; valueClass?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${valueClass ?? 'text-gray-900'}`}>{value}</div>
    </div>
  );
}

export function ProgressBar({ pct, color = 'bg-green-600' }: { pct: number; color?: string }) {
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1.5">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function SyncBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    loading: 'bg-blue-50 text-blue-700 border-blue-200',
    syncing: 'bg-blue-50 text-blue-700 border-blue-200',
    ok:      'bg-green-50 text-green-700 border-green-200',
    error:   'bg-red-50 text-red-700 border-red-200',
    idle:    'bg-gray-50 text-gray-500 border-gray-200',
  };
  const label: Record<string, string> = {
    loading: 'Loading...', syncing: 'Saving...', ok: 'Synced ✓', error: 'Sync error', idle: 'Idle',
  };
  return (
    <span className={`text-xs px-2.5 py-1 rounded-full border ${map[status] ?? map.idle}`}>
      {label[status] ?? status}
    </span>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
      <div className="w-5 h-5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
      <span className="text-sm">Loading from Google Sheets...</span>
    </div>
  );
}

'use client';

import { AVATAR_COLORS, PRODUCT_BADGE, PRIORITY_BADGE, HEALTH_BADGE } from '@/lib/types';
import { GoalStep } from '@/lib/types';
import { stepLabel } from '@/lib/goals';
import { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge label={priority} className={PRIORITY_BADGE[priority] ?? 'bg-gray-100 text-gray-700'} />;
}

export function HealthBadge({ health, count }: { health: string; count?: number }) {
  return <Badge label={count === undefined ? health : `${health}: ${count}`} className={HEALTH_BADGE[health] ?? 'bg-gray-100 text-gray-700'} />;
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
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm p-4 ${className ?? ''}`}>
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

export function ProgressBar({ pct, color = 'bg-green-600', size = 'md' }: { pct: number; color?: string; size?: 'sm' | 'md' }) {
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} className={`${size === 'sm' ? 'h-1.5' : 'h-2'} bg-gray-100 rounded-full overflow-hidden mt-1.5`}>
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function StepBreakdown({ steps }: { steps: GoalStep[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
      {steps.filter(s => s.enabled).map(s => (
        <div key={s.key} className="min-w-0">
          <div className="flex justify-between gap-2 text-xs text-gray-500">
            <span className="truncate">{stepLabel(s.key)}</span>
            <span className="font-medium text-gray-900 tabular-nums">{s.progress}%</span>
          </div>
          <div className="-mt-0.5"><ProgressBar pct={s.progress} size="sm" color={s.progress === 100 ? 'bg-green-600' : 'bg-slate-500'} /></div>
        </div>
      ))}
    </div>
  );
}

export function Modal({ label, header, footer, width = 'max-w-lg', onClose, children }: {
  label: string;
  header: ReactNode;
  footer: ReactNode;
  width?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="no-print fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div ref={dialog} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={`bg-white rounded-2xl shadow-xl w-full ${width} max-h-[95vh] flex flex-col outline-none`}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div className="min-w-0">{header}</div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"><X size={16} /></button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
        <div className="flex items-center gap-2 p-4 border-t border-gray-100">{footer}</div>
      </div>
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

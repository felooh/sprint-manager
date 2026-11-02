'use client';

import { useSyncExternalStore } from 'react';
import { useData } from '@/lib/data-context';
import { PRODUCTS, QUARTERS } from '@/lib/types';
import { SyncBadge } from '@/components/ui';
import Dashboard     from '@/components/Dashboard';
import ProductReport from '@/components/ProductReport';
import Team          from '@/components/Team';
import { RefreshCw, LogOut, ListChecks } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard'    },
  { id: 'report',    label: 'Report'       },
  { id: 'team',      label: 'Team'         },
];

// The current view lives in the URL hash, so it survives a page reload and a
// report can be shared or bookmarked as a link.
const subscribeToHash = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

function setView(key: string, value: string) {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (value) params.set(key, value);
  else params.delete(key);
  window.location.hash = params.toString();
}

export default function Home() {
  const { syncStatus, loadAll } = useData();
  const { data: session } = useSession();
  const hash = useSyncExternalStore(subscribeToHash, () => window.location.hash, () => '');

  const params = new URLSearchParams(hash.slice(1));
  const view = (key: string, allowed: string[]) => {
    const value = params.get(key) ?? '';
    return allowed.includes(value) ? value : '';
  };
  const tab = view('tab', TABS.map(t => t.id)) || 'dashboard';
  const product = view('product', PRODUCTS);
  const quarter = view('quarter', QUARTERS);

  return (
    <div>
      <header className="no-print sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-x-6 gap-y-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center flex-shrink-0">
              <ListChecks size={17} />
            </div>
            <h1 className="text-base font-semibold text-gray-900">Delivery Tracker</h1>
          </div>

          <nav className="flex gap-1 order-last sm:order-none w-full sm:w-auto">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setView('tab', t.id === 'dashboard' ? '' : t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors font-medium ${
                  tab === t.id ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <SyncBadge status={syncStatus} />
            {session?.user?.email && <span className="hidden md:inline text-xs text-gray-500 max-w-48 truncate">{session.user.email}</span>}
            <button onClick={loadAll} aria-label="Refresh" title="Refresh" className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-gray-700">
              <RefreshCw size={14} className={syncStatus === 'loading' || syncStatus === 'syncing' ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              aria-label="Sign out"
              title="Sign out"
              className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-gray-700"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'dashboard' && <Dashboard product={product} onSelectProduct={p => setView('product', p)} quarter={quarter} onSelectQuarter={q => setView('quarter', q)} />}
        {tab === 'report'    && <ProductReport product={product} onSelectProduct={p => setView('product', p)} quarter={quarter} onSelectQuarter={q => setView('quarter', q)} />}
        {tab === 'team'      && <Team />}
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { SyncBadge } from '@/components/ui';
import Overview  from '@/components/Overview';
import Board     from '@/components/Board';
import TaskList  from '@/components/TaskList';
import Team      from '@/components/Team';
import Sprints   from '@/components/Sprints';
import Report    from '@/components/Report';
import { RefreshCw } from 'lucide-react';

const TABS = [
  { id: 'overview', label: 'Overview'     },
  { id: 'board',    label: 'Sprint Board' },
  { id: 'tasks',    label: 'All Tasks'    },
  { id: 'team',     label: 'Team'         },
  { id: 'sprints',  label: 'Sprints'      },
  { id: 'report',   label: 'Report'       },
];

export default function Home() {
  const { syncStatus, loadAll, activeSprint } = useData();
  const [tab, setTab] = useState('overview');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sprint Manager</h1>
          <p className="text-sm text-gray-500 mt-0.5">Afyangu Web &nbsp;·&nbsp; Afyangu Mobile &nbsp;·&nbsp; P360 Mobile</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeSprint && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-medium">
              Active: {activeSprint.name}
            </span>
          )}
          <SyncBadge status={syncStatus} />
          <button onClick={loadAll} className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors bg-white">
            <RefreshCw size={13} className={syncStatus === 'loading' || syncStatus === 'syncing' ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm rounded-lg transition-all font-medium ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview' && <Overview />}
        {tab === 'board'    && <Board />}
        {tab === 'tasks'    && <TaskList />}
        {tab === 'team'     && <Team />}
        {tab === 'sprints'  && <Sprints />}
        {tab === 'report'   && <Report />}
      </div>
    </div>
  );
}

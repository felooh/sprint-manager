'use client';

import { useState } from 'react';
import { useData } from '@/lib/data-context';
import { Goal, GoalTrack, HEALTHS, HEALTH_FILL, PRODUCTS, PRODUCT_FILL, PRIORITIES, QUARTERS, TRACKING_SCOPES } from '@/lib/types';
import { averageProgress, averageSteps, countGoals, daysSince, daysUntil, devsForProduct, formatChange, formatDate, formatQuarter, isOverdue, needsAttention, progressBefore } from '@/lib/goals';
import { Avatar, HealthBadge, MetricCard, PriorityBadge, ProductBadge, ProgressBar, Spinner, StepBreakdown } from '@/components/ui';
import GoalModal from '@/components/GoalModal';
import TrackModal from '@/components/TrackModal';
import { AlertTriangle, ChevronDown, ChevronsDownUp, ChevronsUpDown, Pencil, Plus, Target } from 'lucide-react';

const WEEK = 7;

interface Props {
  product: string;
  onSelectProduct: (product: string) => void;
  quarter: string;
  onSelectQuarter: (quarter: string) => void;
}

export default function Dashboard({ product, onSelectProduct, quarter, onSelectQuarter }: Props) {
  const { state, syncStatus } = useData();
  const [openTrackId, setOpenTrackId] = useState<string | null>(null);
  const [editGoal, setEditGoal] = useState<Goal | null | undefined>(undefined);
  const [listKey, setListKey] = useState(0);
  // Kept here so cards stay open across a refresh or a change of product
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  if (syncStatus === 'loading' || syncStatus === 'idle') return <Spinner />;

  const goals = quarter ? state.goals.filter(g => g.quarter === quarter) : state.goals;
  const visibleTracks = state.tracks.filter(t => goals.some(g => g.id === t.goalId));
  const scopedTracks = product ? visibleTracks.filter(t => t.product === product) : visibleTracks;
  const cards: CardControls = {
    expandedIds,
    onToggle: id => setExpandedIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]),
    onSetAll: setExpandedIds,
    onOpen: setOpenTrackId,
  };
  const openTrack = state.tracks.find(t => t.id === openTrackId);
  const hiddenByQuarter = state.goals.length - goals.length;

  // A new task must show up straight away, whatever the current filters are
  const revealNewGoal = (goalQuarter: string, products: string[]) => {
    if (quarter && quarter !== goalQuarter) onSelectQuarter('');
    if (product && !products.includes(product)) onSelectProduct('');
    setListKey(k => k + 1);
  };
  const openGoal = (goalId: string) => {
    setOpenTrackId(null);
    setEditGoal(state.goals.find(g => g.id === goalId) ?? null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{product || 'All products'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {quarter ? `${formatQuarter(quarter)} goal tasks` : 'Goal tasks across all quarters'}
            {hiddenByQuarter > 0 && (
              <>
                {' · '}{hiddenByQuarter} in other quarters{' '}
                <button onClick={() => onSelectQuarter('')} className="no-print text-blue-700 font-medium hover:underline">Show all</button>
              </>
            )}
          </p>
        </div>
        <div role="group" aria-label="Filter by quarter" className="no-print flex gap-0.5 bg-gray-100 p-0.5 rounded-lg">
          {['', ...QUARTERS].map(q => (
            <button
              key={q}
              onClick={() => onSelectQuarter(q)}
              aria-pressed={quarter === q}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${quarter === q ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {q ? formatQuarter(q) : 'All quarters'}
            </button>
          ))}
        </div>
      </div>

      {/* Product selector */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {['', ...PRODUCTS].map(p => {
          const tracks = p ? visibleTracks.filter(t => t.product === p) : visibleTracks;
          const pct = averageProgress(tracks);
          const attention = tracks.filter(needsAttention).length;
          const devs = p ? devsForProduct(state, p).length : state.members.length;
          const selected = product === p;
          return (
            <button
              key={p}
              onClick={() => onSelectProduct(selected ? '' : p)}
              aria-pressed={selected}
              className={`text-left bg-white border rounded-xl p-4 shadow-sm transition-colors ${selected ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="flex items-center gap-2 font-medium text-gray-900 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRODUCT_FILL[p] ?? 'bg-gray-900'}`} />
                  <span className="truncate">{p || 'All products'}</span>
                </span>
                <span className="text-xl font-semibold text-gray-900 tabular-nums">{pct}%</span>
              </div>
              <ProgressBar pct={pct} color={PRODUCT_FILL[p] ?? 'bg-gray-900'} />
              <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 mt-2">
                <span>{countGoals(tracks)} goal task{countGoals(tracks) === 1 ? '' : 's'} · {devs} dev{devs === 1 ? '' : 's'}</span>
                {attention > 0 && <span className="text-red-700 font-medium flex items-center gap-1"><AlertTriangle size={12} /> {attention} need{attention === 1 ? 's' : ''} attention</span>}
              </div>
            </button>
          );
        })}
      </div>

      {scopedTracks.length > 0 && <Summary tracks={scopedTracks} />}

      {product
        ? <ProductView key={listKey} product={product} visibleTracks={visibleTracks} cards={cards} onAdd={() => setEditGoal(null)} />
        : <AllProducts key={listKey} goals={goals} cards={cards} onAdd={() => setEditGoal(null)} />}

      {openTrack && <TrackModal key={openTrack.id} track={openTrack} onEditGoal={() => openGoal(openTrack.goalId)} onClose={() => setOpenTrackId(null)} />}
      {editGoal !== undefined && <GoalModal goal={editGoal} defaultProduct={product} onCreated={revealNewGoal} onClose={() => setEditGoal(undefined)} />}
    </div>
  );
}

function Summary({ tracks }: { tracks: GoalTrack[] }) {
  const { state } = useData();
  const overall = averageProgress(tracks);
  const before = averageProgress(tracks.map(t => ({ progress: progressBefore(t, state.log, WEEK).baseline })));
  const stuck = tracks.filter(t => t.health === 'At Risk' || t.health === 'Blocked').length;
  const overdue = tracks.filter(isOverdue).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard label={`Overall · ${formatChange(overall - before)} this week`} value={`${overall}%`} />
        <MetricCard label="Goal tasks" value={countGoals(tracks)} />
        <MetricCard label="Done" value={tracks.filter(t => t.health === 'Done').length} valueClass="text-green-700" />
        <MetricCard label="At risk / blocked" value={stuck} valueClass={stuck ? 'text-red-700' : 'text-gray-900'} />
        <MetricCard label="Overdue" value={overdue} valueClass={overdue ? 'text-red-700' : 'text-gray-900'} />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-900">Progress by step</h3>
        <p className="text-xs text-gray-500 mb-2">Average across the goal tasks that use each step, showing where work is waiting.</p>
        <StepBreakdown steps={averageSteps(tracks)} />
      </div>
    </div>
  );
}

interface CardControls {
  expandedIds: string[];
  onToggle: (goalId: string) => void;
  onSetAll: (goalIds: string[]) => void;
  onOpen: (trackId: string) => void;
}

function AddGoalButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
      <Plus size={14} /> Add goal task
    </button>
  );
}

function EmptyGoals({ onAdd }: { onAdd: () => void }) {
  const { syncStatus, loadAll } = useData();
  if (syncStatus === 'error') {
    return (
      <div className="bg-white border border-red-200 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-700 mb-3">Goal tasks could not be loaded from Google Sheets.</p>
        <button onClick={loadAll} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Try again</button>
      </div>
    );
  }
  return (
    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
      <Target size={24} className="mx-auto text-gray-400 mb-2" />
      <p className="text-sm font-medium text-gray-900">No goal tasks here yet</p>
      <p className="text-sm text-gray-500 mt-0.5 mb-4">Add one to start tracking its steps and progress.</p>
      <div className="inline-block"><AddGoalButton onClick={onAdd} /></div>
    </div>
  );
}

// ── All products: the same goal side by side ─────────────────────────────
function AllProducts({ goals, cards, onAdd }: { goals: Goal[]; cards: CardControls; onAdd: () => void }) {
  const { state } = useData();
  const [search, setSearch] = useState('');
  const [fscope, setFscope] = useState('');
  const [fstat, setFstat]   = useState('');
  const [fprio, setFprio]   = useState('');
  const [fdev, setFdev]     = useState('');

  const clearFilters = () => { setSearch(''); setFscope(''); setFstat(''); setFprio(''); setFdev(''); };
  const filtering = !!(search.trim() || fscope || fstat || fprio || fdev);

  // A task matches if any of its products does, and keeps all its bars for context
  const shown = goals.filter(g => {
    const tracks = state.tracks.filter(t => t.goalId === g.id);
    const text = search.trim().toLowerCase();
    if (text && !`${g.title} ${g.desc}`.toLowerCase().includes(text)) return false;
    if (fscope) {
      const scope = TRACKING_SCOPES[Number(fscope)];
      if (tracks.length !== scope.length || !tracks.every(t => scope.includes(t.product))) return false;
    }
    if (fstat && !tracks.some(t => fstat === 'Overdue' ? isOverdue(t) : t.health === fstat)) return false;
    if (fprio && g.priority !== fprio) return false;
    if (fdev && !tracks.some(t => t.ownerIds.includes(fdev))) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
          <h2 className="font-medium text-gray-900">Goal tasks across products</h2>
          <AddGoalButton onClick={onAdd} />
        </div>
        <p className="text-xs text-gray-500 mb-4">Click a task to see its steps and details. Select a product above for its developers.</p>
        {goals.length > 0 && (
          <div className="no-print flex flex-wrap items-center gap-2 mb-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." aria-label="Search goal tasks" className="flex-1 min-w-40 border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400" />
            <select value={fscope} onChange={e => setFscope(e.target.value)} aria-label="Filter by product" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
              <option value="">All products</option>
              {TRACKING_SCOPES.map((scope, i) => <option key={scope.join()} value={i}>{scope.length > 1 ? scope.join(' + ') : `${scope[0]} only`}</option>)}
            </select>
            <select value={fstat} onChange={e => setFstat(e.target.value)} aria-label="Filter by status" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
              <option value="">All statuses</option>
              {HEALTHS.map(h => <option key={h}>{h}</option>)}
              <option>Overdue</option>
            </select>
            <select value={fprio} onChange={e => setFprio(e.target.value)} aria-label="Filter by priority" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
              <option value="">All priorities</option>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
            <select value={fdev} onChange={e => setFdev(e.target.value)} aria-label="Filter by developer" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
              <option value="">All developers</option>
              {state.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {filtering && (
              <>
                <span className="text-xs text-gray-500">Showing {shown.length} of {goals.length}</span>
                <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">Clear filters</button>
              </>
            )}
            {shown.length > 0 && <ExpandAllButton goalIds={shown.map(g => g.id)} cards={cards} />}
          </div>
        )}
      </div>

      {!goals.length ? <EmptyGoals onAdd={onAdd} /> : !shown.length ? (
        <p className="text-sm text-gray-400 py-8 text-center">No goal tasks match these filters.</p>
      ) : (
        <div className="space-y-2">
          {shown.map(g => (
            <GoalCard
              key={g.id}
              goal={g}
              tracks={PRODUCTS.flatMap(p => state.tracks.filter(t => t.goalId === g.id && t.product === p))}
              alwaysLabel
              cards={cards}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── One product: its developers and goal tasks ───────────────────────────
function ProductView({ product, visibleTracks, cards, onAdd }: { product: string; visibleTracks: GoalTrack[]; cards: CardControls; onAdd: () => void }) {
  const { state } = useData();
  const [fstat, setFstat] = useState('');
  const [fdev, setFdev] = useState('');
  const [sortBy, setSortBy] = useState('priority');

  const all = visibleTracks.filter(t => t.product === product);
  const devs = devsForProduct(state, product);
  const goalFor = (t: GoalTrack) => state.goals.find(g => g.id === t.goalId);

  let tracks = all;
  if (fstat) tracks = tracks.filter(t => t.health === fstat);
  if (fdev)  tracks = tracks.filter(t => t.ownerIds.includes(fdev));

  const byTarget = (a: GoalTrack, b: GoalTrack) => (a.targetDate || '9999').localeCompare(b.targetDate || '9999');
  const byPriority = (a: GoalTrack, b: GoalTrack) => PRIORITIES.indexOf(goalFor(a)?.priority ?? '') - PRIORITIES.indexOf(goalFor(b)?.priority ?? '');
  tracks = [...tracks].sort(
    sortBy === 'target' ? byTarget :
    sortBy === 'progress' ? (a, b) => a.progress - b.progress :
    (a, b) => byPriority(a, b) || byTarget(a, b)
  );

  return (
    <div className="space-y-5">
      <div className="grid lg:grid-cols-3 gap-5 items-start">
        {/* Goal tasks */}
        <div className="lg:col-span-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h2 className="font-medium text-gray-900 mr-auto">Goal tasks</h2>
            <select value={fstat} onChange={e => setFstat(e.target.value)} aria-label="Filter by status" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
              <option value="">All statuses</option>
              {HEALTHS.map(h => <option key={h}>{h}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} aria-label="Sort goal tasks" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-gray-400">
              <option value="priority">Sort: priority</option>
              <option value="target">Sort: target date</option>
              <option value="progress">Sort: least progress</option>
            </select>
            {tracks.length > 0 && <ExpandAllButton goalIds={tracks.map(t => t.goalId)} cards={cards} />}
            <AddGoalButton onClick={onAdd} />
          </div>

          {!all.length ? <EmptyGoals onAdd={onAdd} /> : !tracks.length ? (
            <p className="text-sm text-gray-400 py-8 text-center">No goal tasks match these filters.</p>
          ) : (
            <div className="space-y-2">
              {tracks.map(t => {
                const goal = goalFor(t);
                if (!goal) return null;
                // This product first, then any other product the task belongs to
                const others = state.tracks.filter(x => x.goalId === t.goalId && x.id !== t.id);
                return <GoalCard key={t.id} goal={goal} tracks={[t, ...others]} cards={cards} />;
              })}
            </div>
          )}
        </div>

        {/* Developers */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-gray-900">Developers ({devs.length})</h2>
            {fdev && <button onClick={() => setFdev('')} className="text-xs text-gray-500 hover:text-gray-900 transition-colors">Clear filter</button>}
          </div>
          {!devs.length ? (
            <p className="text-sm text-gray-400">No developers on {product} yet. Add them in the Team tab.</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {devs.map(m => {
                const mine = all.filter(t => t.ownerIds.includes(m.id));
                const stuck = mine.filter(needsAttention).length;
                return (
                  <button
                    key={m.id}
                    onClick={() => setFdev(fdev === m.id ? '' : m.id)}
                    aria-pressed={fdev === m.id}
                    className={`w-full flex items-center gap-3 py-2.5 px-2 text-left rounded-lg transition-colors ${fdev === m.id ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
                  >
                    <Avatar name={m.name} index={state.members.indexOf(m)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{m.name}</div>
                      <div className="text-xs text-gray-500 truncate">{m.role}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-medium text-gray-900">{mine.length} goal{mine.length === 1 ? '' : 's'}{mine.length ? ` · ${averageProgress(mine)}%` : ''}</div>
                      {stuck > 0 && <div className="text-xs text-red-700">{stuck} need{stuck === 1 ? 's' : ''} attention</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpandAllButton({ goalIds, cards }: { goalIds: string[]; cards: CardControls }) {
  const allOpen = goalIds.every(id => cards.expandedIds.includes(id));
  const Icon = allOpen ? ChevronsDownUp : ChevronsUpDown;
  return (
    <button onClick={() => cards.onSetAll(allOpen ? [] : goalIds)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <Icon size={14} /> {allOpen ? 'Collapse all' : 'Expand all'}
    </button>
  );
}

// Collapsed: the title, status and a bar per product. Expanded: steps and details too.
function GoalCard({ goal, tracks, alwaysLabel, cards }: { goal: Goal; tracks: GoalTrack[]; alwaysLabel?: boolean; cards: CardControls }) {
  const expanded = cards.expandedIds.includes(goal.id);
  const shared = tracks.length > 1;
  const detailsId = `goal-details-${goal.id}`;

  return (
    <article aria-label={goal.title} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition-colors">
      <button onClick={() => cards.onToggle(goal.id)} aria-expanded={expanded} aria-controls={detailsId} className="block w-full text-left p-4 rounded-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ChevronDown size={16} className={`flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            <span className="font-semibold text-gray-900 min-w-0">{goal.title}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!shared && tracks[0] && isOverdue(tracks[0]) && <span className="text-xs font-medium text-red-700">Overdue</span>}
            <span className="text-xs text-gray-500">{formatQuarter(goal.quarter)}</span>
            <PriorityBadge priority={goal.priority} />
            {!shared && tracks[0] && <HealthBadge health={tracks[0].health} />}
          </div>
        </div>

        <div className="space-y-2 mt-2">
          {tracks.map(t => (
            <div key={t.id}>
              {(alwaysLabel || shared) && (
                <div className="flex items-center justify-between gap-2 mb-1">
                  <ProductBadge product={t.product} />
                  {shared && (
                    <span className="flex items-center gap-1.5">
                      {isOverdue(t) && <span className="text-xs font-medium text-red-700">Overdue</span>}
                      <HealthBadge health={t.health} />
                    </span>
                  )}
                </div>
              )}
              <TrackBar track={t} />
            </div>
          ))}
        </div>
      </button>

      {expanded && (
        <div id={detailsId} className="px-4 pb-4 divide-y divide-gray-100">
          {tracks.map(t => (
            <div key={t.id} className="py-3 first:pt-0 last:pb-0">
              {shared && <div className="mb-2"><ProductBadge product={t.product} /></div>}
              <TrackDetails track={t} />
              <button onClick={() => cards.onOpen(t.id)} aria-label={`Update ${goal.title} on ${t.product}`} className="flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline mt-2">
                <Pencil size={11} /> Update progress
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function TrackBar({ track: t }: { track: GoalTrack }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 -mt-1.5"><ProgressBar pct={t.progress} color={HEALTH_FILL[t.health]} /></div>
      <span className="text-sm font-semibold text-gray-900 w-10 text-right tabular-nums">{t.progress}%</span>
    </div>
  );
}

function TrackDetails({ track: t }: { track: GoalTrack }) {
  const { state } = useData();
  const { baseline } = progressBefore(t, state.log, WEEK);
  const change = t.progress - baseline;
  const owners = t.ownerIds.map(id => state.members.find(m => m.id === id)).filter(m => m !== undefined);
  const dueIn = t.targetDate ? daysUntil(t.targetDate) : null;

  return (
    <>
      <StepBreakdown steps={t.steps} />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-xs text-gray-500">
        {owners.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <span className="flex -space-x-1">{owners.map(m => <Avatar key={m.id} name={m.name} index={state.members.indexOf(m)} size="sm" />)}</span>
            {owners.map(m => m.name).join(', ')}
          </span>
        ) : <span>No developer assigned</span>}
        {t.targetDate && (
          <span className={isOverdue(t) ? 'text-red-700 font-medium' : ''}>
            {isOverdue(t) ? `Overdue by ${-(dueIn ?? 0)}d · ` : 'Target '}{formatDate(t.targetDate)}
          </span>
        )}
        {change !== 0 && <span className={change > 0 ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>{formatChange(change)} this week</span>}
        {t.updatedAt && <span>Updated {daysSince(t.updatedAt) === 0 ? 'today' : `${daysSince(t.updatedAt)}d ago`}</span>}
      </div>

      {t.note && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{t.note}</p>}
    </>
  );
}

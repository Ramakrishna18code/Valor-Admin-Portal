import React from 'react';
import { Activity, AlertTriangle, Building2, CheckCircle2, ClipboardList, HeartPulse, RefreshCw, ShieldCheck, Users, Wrench } from 'lucide-react';
import { isAdmin } from './api/services.js';
export function ProtectedContent({user, children}) { return isAdmin(user) ? children : <section className="permission-page" role="alert"><ShieldCheck size={32}/><h1>Permission denied</h1><p>Sign in with an administrator account to access the Valor operations workspace.</p></section>; }
const cards = [
  ['totalCustomers','Customers',Users,'blue'],
  ['totalLifts','Lifts',Building2,'cyan'],
  ['totalRequests','Service requests',ClipboardList,'navy'],
  ['pendingJobs','Pending jobs',Activity,'warning'],
  ['completedJobs','Completed jobs',CheckCircle2,'success'],
  ['emergencyJobs','Emergency jobs',AlertTriangle,'danger'],
  ['totalTechnicians','Technicians',Wrench,'blue'],
  ['totalAmcs','AMC contracts',ShieldCheck,'success']
];
function BackendStatus({health, healthLoading, healthError, refresh}) {
  const label = healthLoading ? 'Checking' : healthError ? 'Unreachable' : health ? 'Connected' : 'Checking';
  return <section className="panel backend-status-card"><div className="panel-heading"><div><h2>Backend API</h2><span>{label}</span></div><button className="secondary-btn" disabled={healthLoading} onClick={refresh}>Check</button></div>
    {healthError ? <div className="state-message error" role="alert"><AlertTriangle size={18}/><span>{healthError.message}</span></div> : health ? <dl className="detail-list compact"><dt>Backend URL</dt><dd>{health.backendUrl}</dd><dt>Last successful check</dt><dd>{new Date(health.checkedAt).toLocaleString()}</dd></dl> : <div className="state-message" role="status"><HeartPulse size={18}/><span>Checking backend connectivity...</span></div>}
  </section>;
}
export function SummaryView({data, loading, error, refresh, health, healthLoading, healthError, refreshHealth}) {
  return <><div className="page-header dashboard-hero"><div><div className="eyebrow">OPERATIONS OVERVIEW</div><h1>Dashboard</h1><p>Current totals from Valor. Counts include retained records and backend-authoritative lifecycle state.</p></div><button className="secondary-btn" disabled={loading || healthLoading} onClick={() => { refresh(); refreshHealth(); }}><RefreshCw size={15}/>Refresh</button></div>
    <div className="dashboard-overview-grid"><BackendStatus health={health} healthLoading={healthLoading} healthError={healthError} refresh={refreshHealth}/>
      <section className="panel dashboard-note"><div className="panel-heading"><div><h2>Workspace posture</h2><span>Real backend counts only</span></div></div><p>No mock metrics are rendered here. Empty states mean the API returned no records or zero totals.</p></section></div>
    {loading ? <div className="kpi-grid" role="status" aria-label="Loading dashboard">{cards.map(([key,label]) => <section className="kpi-card skeleton-card" key={key}><div className="skeleton-line short"/><div className="skeleton-value"/><div className="skeleton-line"/></section>)}</div> : error ? <section className="panel empty-state" role="alert"><div><AlertTriangle size={24}/></div><b>{error.status === 403 ? 'Access denied' : 'Dashboard unavailable'}</b><span>{error.message}</span><button className="secondary-btn" onClick={refresh}>Try again</button></section> : data ? <><div className="kpi-grid">{cards.map(([key,label,Icon,tone]) => <section className={`kpi-card tone-${tone}`} key={key}><div className="kpi-top"><div className="kpi-label">{label}</div><div className="kpi-icon"><Icon size={18}/></div></div><div className="kpi-value">{Number(data[key] ?? 0).toLocaleString()}</div><div className="kpi-change neutral">Backend total</div></section>)}</div>{cards.every(([key]) => data[key] === 0) && <section className="panel empty-state"><div><ClipboardList size={24}/></div><b>No operational records yet</b><span>The dashboard is connected, but the backend returned zero totals.</span></section>}</> : null}
  </>;
}

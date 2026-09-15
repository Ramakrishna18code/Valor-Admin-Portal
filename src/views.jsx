import React from 'react';
import { RefreshCw } from 'lucide-react';
import { isAdmin } from './api/services.js';
export function ProtectedContent({user, children}) { return isAdmin(user) ? children : <p role="alert">Sign in with an administrator account.</p>; }
const cards = [['totalCustomers','Customers'],['totalLifts','Lifts'],['totalRequests','Service requests'],['pendingJobs','Pending jobs'],['completedJobs','Completed jobs'],['emergencyJobs','Emergency jobs'],['totalTechnicians','Technicians'],['totalAmcs','AMC contracts']];
function BackendStatus({health, healthLoading, healthError, refresh}) {
  const label = healthLoading ? 'Checking' : healthError ? 'Unreachable' : health ? 'Connected' : 'Checking';
  return <section className="panel"><div className="panel-heading"><div><h2>Backend API</h2><span>{label}</span></div><button className="secondary-btn" disabled={healthLoading} onClick={refresh}>Check</button></div>
    {healthError ? <p role="alert">{healthError.message}</p> : health ? <dl><dt>Backend URL</dt><dd>{health.backendUrl}</dd><dt>Last successful check</dt><dd>{new Date(health.checkedAt).toLocaleString()}</dd></dl> : <p role="status">Checking backend connectivity...</p>}
  </section>;
}
export function SummaryView({data, loading, error, refresh, health, healthLoading, healthError, refreshHealth}) {
  return <><div className="page-header"><div><div className="eyebrow">OPERATIONS OVERVIEW</div><h1>Dashboard</h1><p>Current totals from Valor. Counts include retained records.</p></div><button className="secondary-btn" disabled={loading || healthLoading} onClick={() => { refresh(); refreshHealth(); }}><RefreshCw size={15}/>Refresh</button></div>
    <BackendStatus health={health} healthLoading={healthLoading} healthError={healthError} refresh={refreshHealth}/>
    {loading ? <section className="panel empty-state" role="status">Loading dashboard...</section> : error ? <section className="panel empty-state" role="alert"><h2>{error.status === 403 ? 'Access denied' : 'Dashboard unavailable'}</h2><p>{error.message}</p><button className="secondary-btn" onClick={refresh}>Try again</button></section> : data ? <><div className="kpi-grid">{cards.map(([key,label]) => <section className="kpi-card" key={key}><div className="kpi-label">{label}</div><div className="kpi-value">{data[key].toLocaleString()}</div></section>)}</div>{cards.every(([key]) => data[key] === 0) && <section className="panel empty-state">No operational records yet.</section>}</> : null}
  </>;
}

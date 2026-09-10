import React from 'react';
import { RefreshCw } from 'lucide-react';
import { isAdmin } from './api/services.js';
export function ProtectedContent({user, children}) { return isAdmin(user) ? children : <p role="alert">Sign in with an administrator account.</p>; }
const cards = [['totalCustomers','Customers'],['totalLifts','Lifts'],['totalRequests','Service requests'],['pendingJobs','Pending jobs'],['completedJobs','Completed jobs'],['emergencyJobs','Emergency jobs'],['totalTechnicians','Technicians'],['totalAmcs','AMC contracts']];
export function SummaryView({data, loading, error, refresh}) {
  return <><div className="page-header"><div><div className="eyebrow">OPERATIONS OVERVIEW</div><h1>Dashboard</h1><p>Current totals from Valor. Counts include retained records.</p></div><button className="secondary-btn" disabled={loading} onClick={refresh}><RefreshCw size={15}/>Refresh</button></div>
    {loading ? <section className="panel empty-state" role="status">Loading dashboard...</section> : error ? <section className="panel empty-state" role="alert"><h2>{error.status === 403 ? 'Access denied' : 'Dashboard unavailable'}</h2><p>{error.message}</p><button className="secondary-btn" onClick={refresh}>Try again</button></section> : data ? <><div className="kpi-grid">{cards.map(([key,label]) => <section className="kpi-card" key={key}><div className="kpi-label">{label}</div><div className="kpi-value">{data[key].toLocaleString()}</div></section>)}</div>{cards.every(([key]) => data[key] === 0) && <section className="panel empty-state">No operational records yet.</section>}<section className="panel empty-state"><b>Detailed operations are deferred</b><p>Job lists, charts, schedules, renewals, exports and management actions will be connected in later migration stages.</p></section></> : null}
  </>;
}

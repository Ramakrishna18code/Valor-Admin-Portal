import React from 'react';
import { Activity, AlertTriangle, ClipboardList, RefreshCw, Wrench } from 'lucide-react';
import { isAdmin } from './api/services.js';
export function ProtectedContent({user, children}) { return isAdmin(user) ? children : <section className="permission-page" role="alert"><ShieldCheck size={32}/><h1>Permission denied</h1><p>Sign in with an administrator account to access the Valor operations workspace.</p></section>; }
const cards = [
  ['unassignedRequests','Unassigned requests',ClipboardList,'warning'],
  ['inProgressRequests','In progress',Activity,'blue'],
  ['emergencyJobs','Open emergencies',AlertTriangle,'danger']
];
export function SummaryView({data, loading, error, refresh, onAutoAssign, autoAssigning = false, notice = ''}) {
  return <><div className="page-header dashboard-hero"><div><h1>Dashboard</h1></div><div className="page-actions"><button className="secondary-btn" disabled={loading || autoAssigning} onClick={refresh}><RefreshCw size={15}/>Refresh</button><button className="primary-btn" disabled={loading || autoAssigning || !data?.unassignedRequests} onClick={onAutoAssign}><Wrench size={15}/>{autoAssigning ? 'Assigning...' : 'Auto-assign jobs'}</button></div></div>
    {notice ? <p role="status">{notice}</p> : null}
    {loading ? <div className="kpi-grid" role="status" aria-label="Loading dashboard">{cards.map(([key,label]) => <section className="kpi-card skeleton-card" key={key}><div className="skeleton-line short"/><div className="skeleton-value"/></section>)}</div> : error ? <section className="panel empty-state" role="alert"><div><AlertTriangle size={24}/></div><b>{error.status === 403 ? 'Access denied' : 'Dashboard unavailable'}</b><span>{error.message}</span><button className="secondary-btn" onClick={refresh}>Try again</button></section> : data ? <div className="kpi-grid">{cards.map(([key,label,Icon,tone]) => <section className={`kpi-card tone-${tone}`} key={key}><div className="kpi-top"><div className="kpi-label">{label}</div><div className="kpi-icon"><Icon size={18}/></div></div><div className="kpi-value">{Number(data[key] ?? 0).toLocaleString()}</div></section>)}</div> : null}
  </>;
}

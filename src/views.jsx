import React from 'react';
import { Activity, AlertTriangle, Building2, ClipboardList, CreditCard, Layers3, RefreshCw, ShieldCheck, Users, UserRound, Wrench } from 'lucide-react';
import { isAdmin, summaryFields } from './api/services.js';
export function ProtectedContent({user, children}) { return isAdmin(user) ? children : <section className="permission-page" role="alert"><ShieldCheck size={32}/><h1>Permission denied</h1><p>Sign in with an administrator account to access the Valor operations workspace.</p></section>; }
const cards = [
  ['unassignedRequests','Unassigned',ClipboardList,'warning',{section:'service-requests',status:'PENDING'}],
  ['inProgressRequests','In progress',Activity,'blue',{section:'service-requests',preset:'in-progress'}],
  ['emergencyJobs','Open emergency',AlertTriangle,'danger',{section:'service-requests',priority:'EMERGENCY'}]
];
const assetCards = [
  ['customerCount','Customers',Users,'blue','customers'],
  ['buildingCount','Buildings',Building2,'teal','buildings'],
  ['liftCount','Lifts',Layers3,'violet','lifts'],
  ['amcCount','AMC contracts',ShieldCheck,'green','amc']
];
const technicianCards = [
  ['technicianCount','Total technicians',UserRound,'blue',{section:'technician-profiles'}],
  ['availableTechnicianCount','Available',UserRound,'green',{section:'technician-profiles',availabilityStatus:'AVAILABLE'}],
  ['busyTechnicianCount','Busy',Activity,'warning',{section:'technician-profiles',availabilityStatus:'BUSY'}],
  ['onLeaveTechnicianCount','On leave',UserRound,'violet',{section:'technician-profiles',availabilityStatus:'ON_LEAVE'}],
  ['notAvailableTechnicianCount','Not available',UserRound,'danger',{section:'technician-profiles',availabilityStatus:'OFF_DUTY'}]
];
const financeCards = [
  ['paymentCount','Payments',CreditCard,'blue','payments'],
  ['pendingPaymentCount','Pending payments',CreditCard,'warning','payments'],
  ['outstandingInvoiceCount','Open invoices',CreditCard,'violet','transactions']
];
function MetricCard({item, data, onClick}) {
  const [key,label,Icon,tone,target] = item;
  const interactive = Boolean(onClick && target);
  return <section className={`kpi-card tone-${tone}${interactive ? ' kpi-card-action' : ''}`} role={interactive ? 'button' : undefined} tabIndex={interactive ? 0 : undefined} onClick={interactive ? () => onClick(target) : undefined} onKeyDown={interactive ? event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(target); } } : undefined} aria-label={interactive ? `Open ${label}` : undefined}><div className="kpi-top"><div className="kpi-label">{label}</div><div className="kpi-icon"><Icon size={18}/></div></div><div className="kpi-value">{Number(data?.[key] ?? 0).toLocaleString()}</div>{interactive && <span className="kpi-link">Open</span>}</section>;
}
function MetricGroup({title, cards: groupCards, data, onClick}) {
  return <section className="dashboard-group"><div className="dashboard-group-head"><h2>{title}</h2></div><div className="kpi-grid">{groupCards.map(item => <MetricCard key={item[0]} item={item} data={data} onClick={onClick}/>)}</div></section>;
}
export function SummaryView({data, loading, error, refresh, onAutoAssign, autoAssigning = false, notice = '', onCardClick}) {
  const openCard = target => onCardClick?.(target);
  const extendedReady = data && summaryFields.filter(key => !cards.some(card => card[0] === key)).every(key => Number.isSafeInteger(data[key]) && data[key] >= 0);
  return <><div className="page-header dashboard-hero"><div><h1>Dashboard</h1></div><div className="page-actions"><button className="secondary-btn" disabled={loading || autoAssigning} onClick={refresh}><RefreshCw size={15}/>Refresh</button><button className="primary-btn" disabled={loading || autoAssigning || !data?.unassignedRequests} onClick={onAutoAssign}><Wrench size={15}/>{autoAssigning ? 'Assigning...' : 'Auto-assign jobs'}</button></div></div>
    {notice ? <p role="status">{notice}</p> : null}
    {loading ? <div className="dashboard-group" role="status" aria-label="Loading dashboard"><div className="kpi-grid">{[...Array(5)].map((_, index) => <section className="kpi-card skeleton-card" key={index}><div className="skeleton-line short"/><div className="skeleton-value"/></section>)}</div></div> : error ? <section className="panel empty-state" role="alert"><div><AlertTriangle size={24}/></div><b>{error.status === 403 ? 'Access denied' : 'Dashboard unavailable'}</b><span>{error.message}</span><button className="secondary-btn" onClick={refresh}>Try again</button></section> : data ? <><MetricGroup title="Service operations" cards={cards} data={data} onClick={openCard}/>{extendedReady ? <><MetricGroup title="Customers and assets" cards={assetCards} data={data} onClick={target => onCardClick?.({section:target})}/><MetricGroup title="Technicians" cards={technicianCards} data={data}/><MetricGroup title="Finance" cards={financeCards} data={data} onClick={target => onCardClick?.({section:target})}/></> : <p className="dashboard-sync-note" role="status">Extended dashboard counts will appear after the updated backend is available.</p>}</> : null}
  </>;
}

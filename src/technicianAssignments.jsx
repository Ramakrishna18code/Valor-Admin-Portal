import React, { useEffect, useState } from 'react';
import { ErrorState } from './assetModules.jsx';
import { DetailPage, Pager } from './workflowModules.jsx';
import { priorities, statuses } from './api/workflow.js';
import { isAdmin } from './api/services.js';

export function TechnicianAssignmentsPage({ api, user }) {
  const [page, setPage] = useState(0), [status, setStatus] = useState(''), [priority, setPriority] = useState(''), [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0), [selected, setSelected] = useState(null);
  const allowed = isAdmin(user);
  useEffect(() => {
    if (!allowed || selected) return;
    let current = true;
    setData(null); setError(null); setLoading(true);
    api.list({ page, size: 20, status, priority }).then(value => { if (current) setData(value); }).catch(value => { if (current) setError(value); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [api, allowed, selected, page, status, priority, revision]);
  if (!allowed) return <p role="alert">Access denied. Administrator role required.</p>;
  if (selected) return <DetailPage key={selected} id={selected} api={api} onBack={() => setSelected(null)} />;
  return <><div className="page-header"><div><div className="eyebrow">OPERATIONS</div><h1>Technician Assignments</h1><p>Assign or reassign technicians through the canonical Service Request workflow.</p></div><button className="secondary-btn" disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh</button></div>
    <section className="asset-form panel">
      <div className="asset-fields">{[['Status', statuses, status, setStatus], ['Priority', priorities, priority, setPriority]].map(([label, options, value, setter]) => <label key={label}>{label}<select value={value} onChange={event => { setData(null); setter(event.target.value); setPage(0); }}><option value="">All</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>)}</div>
      <ErrorState error={error}/>
      {loading ? <p role="status">Loading assignment queue...</p> : data?.items.length === 0 ? <p>No service requests found.</p> : <div className="asset-table"><table><thead><tr><th>Request</th><th>Title</th><th>Status</th><th>Priority</th><th>Assignment</th></tr></thead><tbody>{data?.items.map(request => <tr key={request.id}><td>{request.serviceId}</td><td>{request.title}</td><td>{request.status}</td><td>{request.priority}</td><td><button className="secondary-btn" onClick={() => setSelected(request.id)}>Open assignment</button></td></tr>)}</tbody></table></div>}
      <Pager data={data} page={page} onPage={value => { setData(null); setPage(value); }} busy={loading}/>
    </section></>;
}

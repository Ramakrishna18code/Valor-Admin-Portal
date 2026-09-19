import React, { useEffect, useState } from 'react';
import { ErrorState } from './assetModules.jsx';
import { DetailPage, Pager } from './workflowModules.jsx';
import { priorities, statuses } from './api/workflow.js';
import { isAdmin } from './api/services.js';
import { DataTable, PriorityChip, StatusChip } from './uiPatterns.jsx';

export function TechnicianAssignmentsPage({ api, user }) {
  const [page, setPage] = useState(0), [status, setStatus] = useState(''), [priority, setPriority] = useState(''), [q, setQ] = useState(''), [data, setData] = useState(null), [error, setError] = useState(null), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0), [selected, setSelected] = useState(null);
  const allowed = isAdmin(user);
  useEffect(() => {
    if (!allowed || selected) return;
    let current = true;
    setData(null); setError(null); setLoading(true);
    const searching = Boolean(q.trim());
    api.list({ page: searching ? 0 : page, size: searching ? 100 : 10, status, priority }).then(value => {
      if (!current) return;
      if (searching) {
        const items = value.items.filter(row => JSON.stringify(row).toLowerCase().includes(q.trim().toLowerCase()));
        const start = page * 10;
        setData({ ...value, page, size: 10, totalElements: items.length, totalPages: Math.ceil(items.length / 10), items: items.slice(start, start + 10) });
      } else setData(value);
    }).catch(value => { if (current) setError(value); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [api, allowed, selected, page, status, priority, q, revision]);
  if (!allowed) return <p role="alert">Access denied. Administrator role required.</p>;
  if (selected) return <DetailPage key={selected} id={selected} api={api} onBack={() => setSelected(null)} />;
  return <><div className="page-header"><div><div className="eyebrow">OPERATIONS</div><h1>Technician Assignments</h1><p>Assign or reassign technicians through the canonical Service Request workflow.</p></div><button className="secondary-btn" disabled={loading} onClick={() => setRevision(value => value + 1)}>Refresh</button></div>
    <section className="asset-form panel">
      <div className="table-controls four-controls"><label>Search<input value={q} onChange={event => { setQ(event.target.value); setPage(0); }} placeholder="Search assignments"/></label>{[['Status', statuses, status, setStatus], ['Priority', priorities, priority, setPriority]].map(([label, options, value, setter]) => <label key={label}>{label}<select value={value} onChange={event => { setData(null); setter(event.target.value); setPage(0); }}><option value="">All</option>{options.map(option => <option key={option}>{option}</option>)}</select></label>)}</div>
      <ErrorState error={error}/>
      {loading ? <p role="status">Loading assignment queue...</p> : <DataTable empty="No service requests found." rows={data?.items || []} columns={[{key:'serviceId',label:'Request'},{key:'title',label:'Title'},{key:'status',label:'Status',render:r=><StatusChip value={r.status}/>},{key:'priority',label:'Priority',render:r=><PriorityChip value={r.priority}/>}]} onRow={request => setSelected(request.id)} />}
      <Pager data={data} page={page} onPage={value => { setData(null); setPage(value); }} busy={loading}/>
    </section></>;
}

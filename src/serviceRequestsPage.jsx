import { useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Download, Edit3, Eye, Filter, LoaderCircle, MoreHorizontal, Plus, RefreshCw, Search, SlidersHorizontal, Trash2, UserRound, X } from 'lucide-react';
import { apiRequest } from './api/client';
import { serviceRequestApi } from './api/services';
import './serviceRequestsPage.css';

const initialRequest = { title: '', description: '', serviceType: 'BREAKDOWN', priority: 'MEDIUM', status: 'PENDING', customerId: '', liftId: '', assignedTechnicianId: '', preferredVisitDate: '', preferredTimeSlot: '' };
const statusOptions = ['PENDING', 'ASSIGNED', 'ACCEPTED', 'ON_THE_WAY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];
const serviceTypes = ['BREAKDOWN', 'INSPECTION', 'ROUTINE_MAINTENANCE', 'EMERGENCY'];
const label = (value) => String(value || 'N/A').replaceAll('_', ' ');
const initials = (name) => name && name !== 'Unassigned' ? name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'N/A';
const dateLabel = (value) => value ? new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A';
const publicId = (prefix, value) => value == null || value === '' ? 'N/A' : `VAL-${prefix}-${new Date().getFullYear()}-${String(value).padStart(4, '0')}`;

function StatusPill({ value }) { return <span className={`request-pill ${String(value || '').toLowerCase().replaceAll('_', '-')}`}><i />{label(value)}</span>; }

function RequestEditor({ request, customers, lifts, technicians, onClose, onSave, saving }) {
  const [draft, setDraft] = useState(request === 'create' ? initialRequest : {
    ...initialRequest,
    ...request,
    customerId: request.customerId ?? '',
    liftId: request.liftId ?? '',
    assignedTechnicianId: request.assignedTechnicianId ?? '',
  });
  const [validation, setValidation] = useState('');
  const availableLifts = draft.customerId ? lifts.filter((lift) => String(lift.customerId) === String(draft.customerId)) : lifts;
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = () => {
    if (!draft.title.trim() || !draft.description.trim() || !draft.customerId || !draft.liftId) { setValidation('Title, description, customer, and lift are required.'); return; }
    setValidation('');
    onSave({ ...draft, customerId: Number(draft.customerId), liftId: Number(draft.liftId), assignedTechnicianId: draft.assignedTechnicianId ? Number(draft.assignedTechnicianId) : undefined });
  };
  return <div className="request-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="request-editor" role="dialog" aria-modal="true" aria-labelledby="request-editor-title">
      <div className="request-editor-head"><div><span className="request-eyebrow">{request === 'create' ? 'NEW REQUEST' : 'EDIT REQUEST'}</span><h2 id="request-editor-title">{request === 'create' ? 'Create service request' : `Edit ${request.serviceId || `SR-${request.id}`}`}</h2></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      {validation && <div className="request-validation">{validation}</div>}
      <div className="request-form-grid">
        <label className="request-form-wide">Issue title<input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Door sensor calibration" /></label>
        <label className="request-form-wide">Description<textarea rows="3" value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="Describe the issue or requested service" /></label>
        <label>Customer<select value={draft.customerId} onChange={(event) => setDraft((current) => ({ ...current, customerId: event.target.value, liftId: '' }))}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{publicId('CUS', customer.id)} - {customer.name || customer.companyName || 'Customer'}</option>)}</select></label>
        <label>Lift<select value={draft.liftId} onChange={(event) => update('liftId', event.target.value)}><option value="">Select lift</option>{availableLifts.map((lift) => <option key={lift.id} value={lift.id}>{publicId('LFT', lift.id)} - {lift.liftNumber || lift.name || 'Lift'}</option>)}</select></label>
        <label>Service type<select value={draft.serviceType} onChange={(event) => update('serviceType', event.target.value)}>{serviceTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label>
        <label>Priority<select value={draft.priority} onChange={(event) => update('priority', event.target.value)}>{priorityOptions.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select></label>
        <label>Status<select value={draft.status} onChange={(event) => update('status', event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></label>
        <label>Technician<select value={draft.assignedTechnicianId} onChange={(event) => update('assignedTechnicianId', event.target.value)}><option value="">Unassigned</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name || `Technician #${technician.id}`}</option>)}</select></label>
        <label>Preferred date<input type="date" value={draft.preferredVisitDate || ''} onChange={(event) => update('preferredVisitDate', event.target.value)} /></label>
        <label>Time slot<input value={draft.preferredTimeSlot || ''} onChange={(event) => update('preferredTimeSlot', event.target.value)} placeholder="09:00 AM - 10:00 AM" /></label>
      </div>
      <div className="request-editor-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="button" onClick={submit} disabled={saving}><CheckCircle2 size={15} />{saving ? 'Saving...' : 'Save request'}</button></div>
    </aside>
  </div>;
}

function RequestDetails({ request, customer, lift, technician, onClose, onEdit }) {
  return <div className="request-overlay request-details-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="request-details" role="dialog" aria-modal="true" aria-labelledby="request-details-title">
      <div className="request-editor-head"><div><span className="request-eyebrow">SERVICE REQUEST</span><h2 id="request-details-title">{request.serviceId || `SR-${request.id}`}</h2></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <div className="request-detail-title"><div className="request-detail-icon"><Activity size={18} /></div><div><h3>{request.title || 'Service request'}</h3><span>{request.description || 'No description provided.'}</span></div></div>
      <div className="request-detail-grid"><div><span>Service ID</span><b>{request.serviceId || publicId('SRQ', request.id)}</b></div><div><span>Customer ID</span><b>{publicId('CUS', request.customerId)}</b></div><div><span>Customer</span><b>{customer}</b></div><div><span>Lift ID</span><b>{publicId('LFT', request.liftId)}</b></div><div><span>Lift</span><b>{lift}</b></div><div><span>Technician</span><b>{technician}</b></div><div><span>Service type</span><b>{label(request.serviceType)}</b></div><div><span>Priority</span><StatusPill value={request.priority} /></div><div><span>Status</span><StatusPill value={request.status} /></div><div><span>Preferred date</span><b>{dateLabel(request.preferredVisitDate)}</b></div><div><span>Time slot</span><b>{request.preferredTimeSlot || 'N/A'}</b></div></div>
      <div className="request-details-footer"><button className="secondary-btn" type="button" onClick={onClose}>Close</button><button className="primary-btn" type="button" onClick={() => { onClose(); onEdit(request); }}><Edit3 size={15} />Edit request</button></div>
    </section>
  </div>;
}

function RequestActions({ row, open, onToggle, onView, onEdit, onDelete, onStart, onComplete }) {
  const [position, setPosition] = useState(null);
  const toggle = (event) => { event.stopPropagation(); if (open) { onToggle(null); return; } const rect = event.currentTarget.getBoundingClientRect(); const menuHeight = 220; const top = rect.bottom + 6 + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6; const left = Math.min(Math.max(8, rect.right - 170), window.innerWidth - 178); setPosition({ top, left }); onToggle(row.id); };
  const closeAnd = (callback) => { onToggle(null); callback(row); };
  return <div className="request-action-wrap"><button className="more-btn" type="button" aria-label={`Actions for ${row.serviceId || row.id}`} onClick={toggle}><MoreHorizontal size={17} /></button>{open && <div className="request-action-menu" style={position} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => closeAnd(onView)}><Eye size={15} />View</button><button type="button" onClick={() => closeAnd(onEdit)}><Edit3 size={15} />Edit / assign</button>{row.status !== 'IN_PROGRESS' && row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && <button type="button" onClick={() => closeAnd(onStart)}><Activity size={15} />Start work</button>}{row.status !== 'COMPLETED' && row.status !== 'CANCELLED' && <button type="button" onClick={() => closeAnd(onComplete)}><CheckCircle2 size={15} />Mark complete</button>}<button className="danger-action" type="button" onClick={() => closeAnd(onDelete)}><Trash2 size={15} />Delete</button></div>}</div>;
}
export function ServiceRequestsPage({ emergency = false, initialQuery = '', notify }) {
  const [records, setRecords] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [lifts, setLifts] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [technicianFilter, setTechnicianFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const pageSize = 8;

  const load = async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [requestRows, customerRows, liftRows, technicianRows] = await Promise.all([
        serviceRequestApi.list(),
        apiRequest('/api/customers').catch(() => []),
        apiRequest('/api/lifts').catch(() => []),
        apiRequest('/api/technicians').catch(() => []),
      ]);
      setRecords(requestRows); setCustomers(customerRows); setLifts(liftRows); setTechnicians(technicianRows);
    } catch (err) { setError(err.message || 'Could not load service requests.'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { setQuery(initialQuery); }, [initialQuery]);

  const customerName = (id) => customers.find((customer) => String(customer.id) === String(id))?.name || customers.find((customer) => String(customer.id) === String(id))?.companyName || `Customer #${id || 'N/A'}`;
  const liftName = (id) => { const lift = lifts.find((item) => String(item.id) === String(id)); return lift?.liftNumber || lift?.name || `Lift #${id || 'N/A'}`; };
  const technicianName = (id) => technicians.find((technician) => String(technician.id) === String(id))?.name || (id ? `Technician #${id}` : 'Unassigned');
  const viewModel = (row) => ({ ...row, customerDisplay: customerName(row.customerId), liftDisplay: liftName(row.liftId), technicianDisplay: technicianName(row.assignedTechnicianId) });
  const filtered = useMemo(() => records.filter((row) => {
    const text = `${row.serviceId || ''} ${row.title || ''} ${row.description || ''} ${customerName(row.customerId)} ${liftName(row.liftId)}`.toLowerCase();
    return (!emergency || row.priority === 'EMERGENCY') && (!query || text.includes(query.toLowerCase())) && (statusFilter === 'ALL' || row.status === statusFilter) && (priorityFilter === 'ALL' || row.priority === priorityFilter) && (technicianFilter === 'ALL' || String(row.assignedTechnicianId || '') === technicianFilter) && (typeFilter === 'ALL' || row.serviceType === typeFilter);
  }), [records, emergency, query, statusFilter, priorityFilter, technicianFilter, typeFilter, customers, lifts]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  useEffect(() => { setPage(1); setOpenMenuId(null); }, [query, statusFilter, priorityFilter, technicianFilter, typeFilter, emergency]);
  useEffect(() => { const close = () => setOpenMenuId(null); window.addEventListener('click', close); window.addEventListener('scroll', close, true); window.addEventListener('resize', close); return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); }; }, []);

  const save = async (draft) => {
    setSaving(true);
    try {
      const saved = editor === 'create' ? await serviceRequestApi.create(draft) : await serviceRequestApi.update(editor.id, draft);
      setRecords((current) => editor === 'create' ? [saved, ...current] : current.map((row) => row.id === editor.id ? saved : row));
      notify(editor === 'create' ? 'Service request created' : 'Service request updated');
      setEditor(null);
    } catch (err) { notify(err.message || 'Could not save service request.', 'error'); }
    finally { setSaving(false); }
  };
  const remove = async (row) => {
    if (!window.confirm(`Delete ${row.serviceId || `SR-${row.id}`}? This cannot be undone.`)) return;
    try { await serviceRequestApi.remove(row.id); setRecords((current) => current.filter((item) => item.id !== row.id)); notify('Service request deleted'); }
    catch (err) { notify(err.message || 'Could not delete service request.', 'error'); }
  };
  const quickAction = async (row, action) => {
    try {
      const updated = action === 'start' ? await serviceRequestApi.start(row.id) : await serviceRequestApi.complete(row.id);
      setRecords((current) => current.map((item) => item.id === row.id ? updated : item));
      notify(action === 'start' ? 'Service request started' : 'Service request completed');
    } catch (err) { notify(err.message || 'Could not update request status.', 'error'); }
  };
  const exportRows = () => {
    const csv = [['Service ID', 'Customer', 'Lift', 'Issue', 'Priority', 'Status', 'Technician', 'Requested date'], ...filtered.map((row) => [row.serviceId || `SR-${row.id}`, customerName(row.customerId), liftName(row.liftId), row.title || row.description, row.priority, row.status, technicianName(row.assignedTechnicianId), row.preferredVisitDate])].map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `valor-service-requests-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url); notify('Service request export downloaded');
  };
  const summary = { total: emergency ? records.filter((row) => row.priority === 'EMERGENCY').length : records.length, progress: records.filter((row) => row.status === 'IN_PROGRESS').length, unassigned: records.filter((row) => !row.assignedTechnicianId).length, completed: records.filter((row) => row.status === 'COMPLETED').length };

  return <div className="service-requests-page"><div className="functional-page-header"><div><div className="eyebrow">{emergency ? 'PRIORITY OPERATIONS' : 'OPERATIONS'}</div><h1>{emergency ? 'Emergency queue' : 'Service requests'}</h1><p>{emergency ? 'Resolve urgent lift incidents with real-time response visibility.' : 'Track every service request from intake to completion.'}</p></div><div className="page-actions"><button className="secondary-btn" type="button" onClick={() => load(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''} />{refreshing ? 'Refreshing...' : 'Refresh'}</button><button className="secondary-btn" type="button" onClick={exportRows} disabled={!filtered.length}><Download size={15} />Export</button><button className="primary-btn" type="button" onClick={() => setEditor('create')}><Plus size={16} />{emergency ? 'Log emergency' : 'Create request'}</button></div></div>
    <div className="request-summary-strip"><div><span>{emergency ? 'Open emergencies' : 'Total requests'}</span><b>{summary.total}</b></div><div><span>In progress</span><b>{summary.progress}</b></div><div><span>Unassigned</span><b>{summary.unassigned}</b></div><div><span>Completed</span><b>{summary.completed}</b></div><div className="request-strip-note"><Activity size={16} /><span>Live API data  -  Updated just now</span></div></div>
    {error && <div className="inline-error">{error}<button type="button" onClick={() => setError('')}><X size={14} /></button></div>}
    <section className="panel request-table-panel"><div className="request-filter-bar"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search service ID, customer or issue" /></div><label className="request-filter"><Filter size={14} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All status</option>{statusOptions.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select><ChevronDown size={13} /></label><label className="request-filter"><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}><option value="ALL">All priority</option>{priorityOptions.map((priority) => <option key={priority} value={priority}>{label(priority)}</option>)}</select><ChevronDown size={13} /></label><label className="request-filter request-technician-filter"><UserRound size={14} /><select value={technicianFilter} onChange={(event) => setTechnicianFilter(event.target.value)}><option value="ALL">All technicians</option>{technicians.map((technician) => <option key={technician.id} value={technician.id}>{technician.name}</option>)}</select><ChevronDown size={13} /></label><button className={`filter-btn ${showMoreFilters ? 'active' : ''}`} type="button" onClick={() => setShowMoreFilters((value) => !value)}><SlidersHorizontal size={15} />More filters</button></div>{showMoreFilters && <div className="request-more-filters"><label>Service type<select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="ALL">All service types</option>{serviceTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></label><button className="text-btn" type="button" onClick={() => { setStatusFilter('ALL'); setPriorityFilter('ALL'); setTechnicianFilter('ALL'); setTypeFilter('ALL'); setQuery(''); }}>Clear filters</button></div>}
      {loading ? <div className="loading-state"><LoaderCircle className="spin" size={22} />Loading service requests...</div> : pageRows.length === 0 ? <div className="request-empty"><div><Search size={22} /></div><b>No service requests found</b><span>Try a different filter or create a new request.</span><button className="secondary-btn" type="button" onClick={() => setEditor('create')}><Plus size={15} />Create request</button></div> : <div className="request-table-scroll"><div className="request-data-table"><div className="request-data-head"><span>Service ID</span><span>Customer / issue</span><span>Lift</span><span>Priority</span><span>Technician</span><span>Status</span><span>Requested</span><span /></div>{pageRows.map((row) => <div className="request-data-row" key={row.id} onDoubleClick={() => setViewing(row)}><b className="request-id-cell">{row.serviceId || `SR-${row.id}`}</b><div className="request-customer-cell"><b>{customerName(row.customerId)}</b><span>{row.title || row.description || 'Service request'}</span></div><span className="request-lift-cell">{liftName(row.liftId)}</span><StatusPill value={row.priority} /><span className="request-technician-cell"><span className="mini-avatar">{initials(technicianName(row.assignedTechnicianId))}</span>{technicianName(row.assignedTechnicianId)}</span><StatusPill value={row.status} /><span>{dateLabel(row.preferredVisitDate || row.serviceRequestedAt)}</span><RequestActions row={row} open={openMenuId === row.id} onToggle={(id) => setOpenMenuId(id)} onView={setViewing} onEdit={setEditor} onDelete={remove} onStart={(item) => quickAction(item, 'start')} onComplete={(item) => quickAction(item, 'complete')} /></div>)}</div></div>}
      {!loading && filtered.length > 0 && <div className="request-pagination"><span>Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length} requests</span><div><button className="page-btn" type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={15} /></button><span className="request-page-number">{page} / {pageCount}</span><button className="page-btn" type="button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight size={15} /></button></div></div>}
    </section>
    {viewing && <RequestDetails request={viewing} customer={customerName(viewing.customerId)} lift={liftName(viewing.liftId)} technician={technicianName(viewing.assignedTechnicianId)} onClose={() => setViewing(null)} onEdit={(request) => setEditor(request)} />}
    {editor && <RequestEditor request={editor} customers={customers} lifts={lifts} technicians={technicians} onClose={() => setEditor(null)} onSave={save} saving={saving} />}
  </div>;
}






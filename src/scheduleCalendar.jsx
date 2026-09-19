import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Edit3, LoaderCircle, Plus, Save, X } from 'lucide-react';
import { ErrorState } from './assetModules.jsx';
import { StatusChip } from './uiPatterns.jsx';
import './scheduleCalendar.css';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dateKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const monthDays = month => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const total = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length: total }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
};
const displayTime = visit => `${String(visit.startTime || '').slice(0, 5)} - ${String(visit.endTime || '').slice(0, 5)}`;
const displayCustomer = visit => visit.customerName || `Customer #${visit.customerProfileId}`;
const displayTechnician = visit => visit.technicianName || (visit.technicianProfileId ? `Technician #${visit.technicianProfileId}` : 'Assigned technician');

function VisitEditor({ draft, requests, technicians, visits = [], onClose, onSave, saving }) {
  const [form, setForm] = useState(draft);
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const selectedRequest = requests.find(request => String(request.id) === String(form.serviceRequestId));
  const assignedTechnicianId = selectedRequest?.activeAssignment?.technicianProfileId;
  const technicianOptions = draft.id || !form.serviceRequestId ? technicians : technicians.filter(tech => String(tech.technicianProfileId) === String(assignedTechnicianId));
  const sameTechnicianVisits = visits.filter(visit => visit.id !== form.id && visit.technicianProfileId && String(visit.technicianProfileId) === String(form.technicianProfileId) && visit.scheduledDate === form.scheduledDate && ['SCHEDULED', 'IN_PROGRESS'].includes(visit.status));
  const conflicts = sameTechnicianVisits.filter(visit => String(visit.startTime || '').slice(0, 5) < String(form.endTime || '').slice(0, 5) && String(visit.endTime || '').slice(0, 5) > String(form.startTime || '').slice(0, 5));

  return <section className="asset-form panel schedule-editor-page" aria-labelledby="visit-editor-title">
    <div className="schedule-editor-head">
      <div><span className="eyebrow">SERVICE VISIT</span><h2 id="visit-editor-title">{draft.id ? 'Edit visit' : 'Schedule visit'}</h2></div>
      <button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={18}/></button>
    </div>
    <div className="schedule-form-grid">
      {!draft.id && <label className="schedule-form-wide">Service request<select required value={form.serviceRequestId || ''} onChange={event => { const request = requests.find(item => String(item.id) === event.target.value); setForm(current => ({ ...current, serviceRequestId: event.target.value, technicianProfileId: request?.activeAssignment?.technicianProfileId || '' })); }}><option value="">Select an unscheduled request</option>{requests.map(request => <option key={request.id} value={request.id}>{request.serviceId} - {request.title}</option>)}</select></label>}
      <label>Assigned technician<select required value={form.technicianProfileId || ''} onChange={event => update('technicianProfileId', event.target.value)}><option value="">{form.serviceRequestId && !assignedTechnicianId ? 'No accepted assignment for request' : 'Select assigned technician'}</option>{technicianOptions.map(tech => <option key={tech.technicianProfileId} value={tech.technicianProfileId}>{tech.employeeId || tech.email || `Technician #${tech.technicianProfileId}`}</option>)}</select></label>
      <label>Date<input required type="date" value={form.scheduledDate || ''} onChange={event => update('scheduledDate', event.target.value)}/></label>
      <label>Start time<input required type="time" value={String(form.startTime || '').slice(0, 5)} onChange={event => update('startTime', event.target.value)}/></label>
      <label>End time<input required type="time" value={String(form.endTime || '').slice(0, 5)} onChange={event => update('endTime', event.target.value)}/></label>
      <label className="schedule-form-wide">Notes<textarea rows="3" maxLength="2000" value={form.notes || ''} onChange={event => update('notes', event.target.value)} placeholder="Optional visit notes"/></label>
    </div>
    {sameTechnicianVisits.length > 0 && <section className="schedule-help"><h3>Technician day workload</h3>{conflicts.length > 0 && <p role="alert">This time overlaps an existing active visit. The backend will reject conflicting schedules.</p>}<ul>{sameTechnicianVisits.map(visit => <li key={visit.id}>{visit.serviceId} - {displayTime(visit)} - {visit.status}</li>)}</ul></section>}
    {!draft.id && form.serviceRequestId && !assignedTechnicianId && <p role="alert">Assign and accept a technician before scheduling this request.</p>}
    <div className="schedule-editor-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="button" disabled={saving || (!draft.id && form.serviceRequestId && !assignedTechnicianId)} onClick={() => onSave(form)}><Save size={15}/>{saving ? 'Saving...' : 'Save visit'}</button></div>
  </section>;
}

function ChangeRequests({ api, onChanged }) {
  const [data, setData] = useState(null), [error, setError] = useState(null), [busy, setBusy] = useState(null), [revision, setRevision] = useState(0), [page, setPage] = useState(0);
  useEffect(() => { let current = true; api.changeRequests({ status: 'PENDING' }).then(value => current && setData(value)).catch(value => current && setError(value)); return () => { current = false; }; }, [api, revision]);
  const decide = async (request, approve) => {
    setBusy(request.id); setError(null);
    try {
      if (approve) await api.approveChange(request.id, { technicianProfileId: window.prompt('Technician profile ID', request.requestedTechnicianProfileId) || request.requestedTechnicianProfileId, scheduledDate: window.prompt('Scheduled date', request.requestedDate) || request.requestedDate, startTime: window.prompt('Start time', String(request.requestedStartTime).slice(0, 5)) || request.requestedStartTime, endTime: window.prompt('End time', String(request.requestedEndTime).slice(0, 5)) || request.requestedEndTime, reviewNotes: window.prompt('Review notes', 'Approved by operations') || 'Approved by operations' });
      else await api.rejectChange(request.id, 'Rejected by operations');
      onChanged(); setRevision(value => value + 1);
    } catch (value) { setError(value); } finally { setBusy(null); }
  };
  const items = data?.items || [];
  const shown = items.slice(page * 4, page * 4 + 4);
  const totalPages = Math.max(1, Math.ceil(items.length / 4));

  return <section className="panel unscheduled-panel">
    <div className="panel-heading"><div><h2>Technician requests</h2><span>Review reschedule and additional-visit requests</span></div><button className="secondary-btn" type="button" onClick={() => setRevision(value => value + 1)}>Refresh</button></div>
    <ErrorState error={error}/>
    {items.length ? <>
      <div className="unscheduled-list">{shown.map(request => <article className="calendar-task" key={request.id}><b>{request.type.replaceAll('_', ' ')} - Request #{request.serviceRequestId}</b><span>{request.reason} - {request.requestedDate} {String(request.requestedStartTime).slice(0, 5)} - {String(request.requestedEndTime).slice(0, 5)}</span><div className="page-actions"><button className="primary-btn approve-btn" disabled={busy === request.id} onClick={() => decide(request, true)}>Approve</button><button className="secondary-btn reject-btn" disabled={busy === request.id} onClick={() => decide(request, false)}>Reject</button></div></article>)}</div>
      <div className="pager"><button className="secondary-btn" disabled={page === 0} onClick={() => setPage(value => value - 1)}>Previous</button><span>{page + 1} of {totalPages}</span><button className="secondary-btn" disabled={page + 1 >= totalPages} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </> : <div className="schedule-empty pretty-empty"><b>No technician requests</b><span>Pending change requests will appear here.</span></div>}
  </section>;
}

export function ScheduleCalendarPage({ api, requests, directories, notify }) {
  const today = dateKey(new Date());
  const [month, setMonth] = useState(() => new Date()), [selectedDate, setSelectedDate] = useState(today);
  const [visits, setVisits] = useState([]), [requestsData, setRequestsData] = useState([]), [requestDetails, setRequestDetails] = useState([]), [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(null), [editor, setEditor] = useState(null), [saving, setSaving] = useState(false), [draggedId, setDraggedId] = useState(null), [revision, setRevision] = useState(0), [unscheduledPage, setUnscheduledPage] = useState(0);
  const days = useMemo(() => monthDays(month), [month]);
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [visitPage, requestPage, techPage] = await Promise.all([api.list({ page: 0, size: 100 }), requests.list({ page: 0, size: 100 }), directories.directory('technicians', { page: 0, size: 100, active: true })]);
      const details = await Promise.all(requestPage.items.filter(request => !['COMPLETED', 'CANCELLED'].includes(request.status)).map(request => requests.detail(request.id).catch(() => ({ request, activeAssignment: null }))));
      setVisits(visitPage.items); setRequestsData(requestPage.items); setRequestDetails(details); setTechnicians(techPage.items);
    } catch (value) { setError(value); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [revision]);
  const activeRequestIds = new Set(visits.filter(visit => ['SCHEDULED', 'IN_PROGRESS'].includes(visit.status)).map(visit => visit.serviceRequestId));
  const unscheduled = requestsData.filter(request => !['COMPLETED', 'CANCELLED'].includes(request.status) && !activeRequestIds.has(request.id)).map(request => ({ ...request, activeAssignment: requestDetails.find(detail => detail.request?.id === request.id)?.activeAssignment || null }));
  const byDate = useMemo(() => visits.reduce((groups, visit) => { const key = visit.scheduledDate; groups[key] = [...(groups[key] || []), visit]; return groups; }, {}), [visits]);
  const save = async form => {
    setSaving(true); setError(null);
    try { const saved = form.id ? await api.update(form.id, form) : await api.create(form); setEditor(null); setSelectedDate(saved.scheduledDate); setMonth(new Date(`${saved.scheduledDate}T00:00:00`)); setRevision(value => value + 1); notify(form.id ? 'Visit updated' : 'Visit scheduled'); }
    catch (value) { setError(value); } finally { setSaving(false); }
  };
  const move = async (visit, targetDate) => {
    if (visit.status !== 'SCHEDULED' || targetDate === visit.scheduledDate) return;
    const original = visit.scheduledDate; setVisits(current => current.map(item => item.id === visit.id ? { ...item, scheduledDate: targetDate } : item)); setError(null);
    try { await api.update(visit.id, { ...visit, scheduledDate: targetDate }); setRevision(value => value + 1); notify('Visit rescheduled'); }
    catch (value) { setVisits(current => current.map(item => item.id === visit.id ? { ...item, scheduledDate: original } : item)); setError(value); }
  };
  const cancel = async visit => { const reason = window.prompt('Cancellation reason'); if (!reason?.trim()) return; try { await api.cancel(visit.id, reason); setRevision(value => value + 1); notify('Visit cancelled; service request remains available'); } catch (value) { setError(value); } };
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });
  const selectedVisits = byDate[selectedDate] || [];
  const shownUnscheduled = unscheduled.slice(unscheduledPage * 4, unscheduledPage * 4 + 4);
  const unscheduledPages = Math.max(1, Math.ceil(unscheduled.length / 4));

  if (editor) return <div className="schedule-page">
    <div className="functional-page-header"><button className="secondary-btn" type="button" onClick={() => setEditor(null)}><ChevronLeft size={16}/>Back to schedule</button><div><p className="eyebrow">Schedule</p><h1>{editor.id ? 'Edit Visit' : 'Schedule Visit'}</h1></div></div>
    <ErrorState error={error}/>
    <VisitEditor draft={editor} technicians={technicians} requests={unscheduled} visits={visits} onClose={() => setEditor(null)} onSave={save} saving={saving}/>
  </div>;

  return <div className="schedule-page">
    <ErrorState error={error}/>
    <section className="panel schedule-panel">
      <div className="schedule-toolbar"><div className="schedule-nav"><button className="icon-btn" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={17}/></button><button className="today-btn" type="button" onClick={() => { setMonth(new Date()); setSelectedDate(today); }}>Today</button><button className="icon-btn" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={17}/></button></div><h2>{month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</h2><span className="schedule-summary"><CalendarDays size={15}/>{visits.length} visits</span></div>
      <div className="calendar-weekdays">{weekdays.map(day => <span key={day}>{day}</span>)}</div>
      {loading ? <div className="loading-state"><LoaderCircle className="spin" size={22}/>Loading visits...</div> : <div className="calendar-grid">{days.map(day => { const key = dateKey(day); const dayVisits = byDate[key] || []; return <div key={key} className={`calendar-day ${day.getMonth() === month.getMonth() ? '' : 'outside-month'} ${key === selectedDate ? 'calendar-selected' : ''}`} onClick={() => setSelectedDate(key)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const visit = visits.find(item => String(item.id) === String(draggedId)); setDraggedId(null); if (visit) move(visit, key); }}><div className="calendar-day-head"><span>{day.getDate()}</span>{dayVisits.length > 0 && <em>{dayVisits.length}</em>}</div><div className="calendar-tasks">{dayVisits.slice(0, 3).map(visit => <article key={visit.id} className={`calendar-task task-${visit.status.toLowerCase()}`} draggable={visit.status === 'SCHEDULED'} onDragStart={() => setDraggedId(visit.id)} onClick={event => { event.stopPropagation(); setEditor(visit); }}><b>{visit.serviceId}</b><span>{displayTime(visit)}</span></article>)}</div></div>; })}</div>}
    </section>
    <section className="schedule-lower">
      <div className="panel selected-day-panel"><div className="panel-heading"><div><h2>{selectedLabel}</h2><span>{selectedVisits.length} visits</span></div><button className="text-btn" type="button" onClick={() => setEditor({ serviceRequestId: '', technicianProfileId: '', scheduledDate: selectedDate, startTime: '', endTime: '', notes: '' })}><Plus size={14}/>Schedule Visit</button></div>{selectedVisits.length === 0 ? <div className="schedule-empty pretty-empty"><b>No visits today</b><span>Use Schedule Visit to add an appointment.</span></div> : <div className="selected-task-list">{selectedVisits.map(visit => <button className="selected-task" type="button" key={visit.id} onClick={() => setEditor(visit)}><span className={`task-dot task-${visit.status.toLowerCase()}`}/><span><b>{visit.serviceId} - {displayTime(visit)}</b><small>{displayCustomer(visit)} - {displayTechnician(visit)}</small></span><Edit3 size={15}/></button>)}</div>}</div>
      <div className="panel schedule-help"><h3>Server-authoritative scheduling</h3><p>Overlaps, assigned technicians, active-visit limits, and time ranges are validated by the backend.</p></div>
    </section>
    <section className="panel unscheduled-panel"><div className="panel-heading"><div><h2>Unscheduled Service Requests</h2><span>Requests without an active or upcoming visit</span></div></div>{unscheduled.length ? <><div className="unscheduled-list">{shownUnscheduled.map(request => <article className="calendar-task" key={request.id}><b>{request.serviceId} - {request.title}</b><span>Customer #{request.customerProfileId} - <StatusChip value={request.status}/></span><button className="primary-btn" type="button" onClick={() => setEditor({ serviceRequestId: request.id, technicianProfileId: request.activeAssignment?.technicianProfileId || '', scheduledDate: selectedDate, startTime: '', endTime: '', notes: '' })}>Schedule Visit</button></article>)}</div><div className="pager"><button className="secondary-btn" disabled={unscheduledPage === 0} onClick={() => setUnscheduledPage(value => value - 1)}>Previous</button><span>{unscheduledPage + 1} of {unscheduledPages}</span><button className="secondary-btn" disabled={unscheduledPage + 1 >= unscheduledPages} onClick={() => setUnscheduledPage(value => value + 1)}>Next</button></div></> : <div className="schedule-empty pretty-empty"><b>No unscheduled requests</b><span>Requests without visits will appear here.</span></div>}</section>
    <ChangeRequests api={api} onChanged={() => setRevision(value => value + 1)}/>
    {visits.length > 0 && <section className="panel cancel-visit-card"><div className="panel-heading"><div><h2>Select Visit to Cancel</h2><span>Choose an active visit and provide a cancellation reason.</span></div></div><label>Visit<select onChange={event => { const visit = visits.find(item => String(item.id) === event.target.value); if (visit) cancel(visit); event.target.value = ''; }}><option value="">Select visit</option>{visits.filter(visit => visit.status !== 'CANCELLED').map(visit => <option key={visit.id} value={visit.id}>{visit.serviceId} - {displayTime(visit)}</option>)}</select></label></section>}
  </div>;
}

import { useEffect, useState } from 'react';
import { Eye, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react';
import { serviceRequestApi } from './api/services';
import './dashboardActions.css';

const fieldValue = (value) => value || 'N/A';

export function downloadDashboardCsv(rows) {
  const columns = ['Service ID', 'Customer', 'Lift', 'Issue', 'Priority', 'Status', 'Technician', 'Scheduled'];
  const values = rows.map((row) => [
    row.id,
    row.customer,
    row.lift,
    row.issue,
    row.priority,
    row.status,
    row.technician,
    row.time,
  ]);
  const csv = [columns, ...values]
    .map((line) => line.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `valor-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DashboardDetail({ job, onClose }) {
  return (
    <div className="dashboard-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dashboard-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-job-title">
        <div className="dashboard-dialog-head">
          <div>
            <span className="eyebrow">Service request</span>
            <h2 id="dashboard-job-title">{job.id}</h2>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close details"><X size={18} /></button>
        </div>
        <div className="dashboard-detail-grid">
          <div><span>Customer</span><strong>{fieldValue(job.customer)}</strong></div>
          <div><span>Lift</span><strong>{fieldValue(job.lift)}</strong></div>
          <div><span>Issue</span><strong>{fieldValue(job.issue)}</strong></div>
          <div><span>Priority</span><strong>{fieldValue(job.priority)}</strong></div>
          <div><span>Status</span><strong>{fieldValue(job.status)}</strong></div>
          <div><span>Technician</span><strong>{fieldValue(job.technician)}</strong></div>
          <div><span>Scheduled</span><strong>{fieldValue(job.time)}</strong></div>
        </div>
        <button className="primary-btn dashboard-close-btn" type="button" onClick={onClose}>Close</button>
      </section>
    </div>
  );
}

function DashboardEditor({ job, onClose, notify, onChanged }) {
  const [form, setForm] = useState({
    title: job.issue || '',
    description: job.issue || '',
    priority: job.priority || 'MEDIUM',
    status: job.status || 'OPEN',
    preferredVisitDate: job.preferredVisitDate || '',
    preferredTimeSlot: job.preferredTimeSlot || '',
  });
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async (event) => {
    event.preventDefault();
    if (!job.recordId) {
      notify('This row is fallback data; connect the backend before editing it.', 'error');
      return;
    }
    setSaving(true);
    try {
      await serviceRequestApi.update(job.recordId, form);
      notify(`${job.id} updated successfully`);
      onChanged();
      onClose();
    } catch (error) {
      notify(error.message || 'Could not update the service request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dashboard-dialog dashboard-editor" role="dialog" aria-modal="true" aria-labelledby="dashboard-edit-title">
        <div className="dashboard-dialog-head">
          <div><span className="eyebrow">Update request</span><h2 id="dashboard-edit-title">Edit {job.id}</h2></div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close editor"><X size={18} /></button>
        </div>
        <form onSubmit={save}>
          <label>Issue<input value={form.title} onChange={(event) => update('title', event.target.value)} required /></label>
          <label>Description<textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows="3" /></label>
          <div className="dashboard-form-grid">
            <label>Priority<select value={form.priority} onChange={(event) => update('priority', event.target.value)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label>
            <label>Status<select value={form.status} onChange={(event) => update('status', event.target.value)}><option value="PENDING">Pending</option><option value="OPEN">Open</option><option value="ASSIGNED">Assigned</option><option value="IN_PROGRESS">In progress</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></label>
            <label>Visit date<input type="date" value={form.preferredVisitDate} onChange={(event) => update('preferredVisitDate', event.target.value)} /></label>
            <label>Time slot<input value={form.preferredTimeSlot} onChange={(event) => update('preferredTimeSlot', event.target.value)} placeholder="09:00 - 11:00" /></label>
          </div>
          <div className="dashboard-dialog-actions"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button></div>
        </form>
      </section>
    </div>
  );
}

export function DashboardJobActions({ job, notify, onChanged }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const [viewing, setViewing] = useState(false);
  const [editing, setEditing] = useState(false);
  const menuKey = String(job.recordId || job.id);
  const toggle = (event) => { event.stopPropagation(); if (open) { setOpen(false); return; } const rect = event.currentTarget.getBoundingClientRect(); const menuHeight = 150; const top = rect.bottom + 6 + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6; const left = Math.min(Math.max(8, rect.right - 150), window.innerWidth - 158); setPosition({ top, left }); window.dispatchEvent(new CustomEvent('valor:action-menu-open', { detail: menuKey })); setOpen(true); };
  useEffect(() => { if (!open) return undefined; const close = () => setOpen(false); const closeOther = (event) => { if (event.detail !== menuKey) setOpen(false); }; window.addEventListener('click', close); window.addEventListener('resize', close); window.addEventListener('scroll', close, true); window.addEventListener('valor:action-menu-open', closeOther); return () => { window.removeEventListener('click', close); window.removeEventListener('resize', close); window.removeEventListener('scroll', close, true); window.removeEventListener('valor:action-menu-open', closeOther); }; }, [open, menuKey]);
  const deleteJob = async () => { setOpen(false); if (!job.recordId) { notify('This row is fallback data; connect the backend before deleting it.', 'error'); return; } if (!window.confirm(`Delete service request ${job.id}?`)) return; try { await serviceRequestApi.remove(job.recordId); notify(`${job.id} deleted successfully`); onChanged(); } catch (error) { notify(error.message || 'Could not delete the service request.', 'error'); } };
  return <><div className="dashboard-action-wrap"><button className="more-btn" type="button" aria-label={`Actions for ${job.id}`} onClick={toggle}><MoreHorizontal size={17} /></button>{open && <div className="dashboard-action-menu" style={position} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => { setOpen(false); setViewing(true); }}><Eye size={15} />View</button><button type="button" onClick={() => { setOpen(false); setEditing(true); }}><Pencil size={15} />Edit</button><button className="danger-action" type="button" onClick={deleteJob}><Trash2 size={15} />Delete</button></div>}</div>{viewing && <DashboardDetail job={job} onClose={() => setViewing(false)} />}{editing && <DashboardEditor job={job} notify={notify} onChanged={onChanged} onClose={() => setEditing(false)} />}</>;
}



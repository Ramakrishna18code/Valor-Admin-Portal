import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api/client';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Edit3, LoaderCircle, Plus, RefreshCw, Save, UserRound, X } from 'lucide-react';
import './scheduleCalendar.css';

const statusOptions = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const recordDate = (task) => task.date || task.scheduledDate || task.visitDate || task.preferredVisitDate || '';
const taskTitle = (task) => task.visit || task.title || task.serviceId || `Task #${task.id}`;
const taskDate = (task) => String(recordDate(task)).slice(0, 10);
const emptyTask = (date) => ({ visit: '', customer: '', technician: '', date, status: 'SCHEDULED' });

const monthDays = (month) => {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const total = Math.ceil((offset + count) / 7) * 7;
  return Array.from({ length: total }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1));
};

function TaskEditor({ task, onClose, onSave, saving }) {
  const [draft, setDraft] = useState(task === 'create' ? emptyTask(dateKey(new Date())) : { ...task, date: taskDate(task) });
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return <div className="schedule-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <aside className="schedule-editor" role="dialog" aria-modal="true" aria-labelledby="schedule-editor-title">
      <div className="schedule-editor-head"><div><span className="eyebrow">{task === 'create' ? 'NEW TASK' : 'EDIT TASK'}</span><h2 id="schedule-editor-title">{task === 'create' ? 'Add schedule task' : 'Edit schedule task'}</h2></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <div className="schedule-form-grid">
        <label>Task title<input value={draft.visit || ''} onChange={(event) => update('visit', event.target.value)} placeholder="Preventive maintenance" required /></label>
        <label>Customer<input value={draft.customer || ''} onChange={(event) => update('customer', event.target.value)} placeholder="Customer or building" /></label>
        <label>Technician<input value={draft.technician || ''} onChange={(event) => update('technician', event.target.value)} placeholder="Assign technician" /></label>
        <label>Date<input type="date" value={draft.date || ''} onChange={(event) => update('date', event.target.value)} required /></label>
        <label>Status<select value={draft.status || 'SCHEDULED'} onChange={(event) => update('status', event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></label>
        <label>Time<input value={draft.time || draft.timeSlot || ''} onChange={(event) => update('time', event.target.value)} placeholder="09:00 - 11:00" /></label>
        <label className="schedule-form-wide">Notes<textarea rows="3" value={draft.description || draft.notes || ''} onChange={(event) => update('description', event.target.value)} placeholder="Add instructions for the visit" /></label>
      </div>
      <div className="schedule-editor-footer"><button className="secondary-btn" type="button" onClick={onClose}>Cancel</button><button className="primary-btn" type="button" disabled={saving} onClick={() => onSave(draft)}><Save size={15} />{saving ? 'Saving...' : 'Save task'}</button></div>
    </aside>
  </div>;
}

export function ScheduleCalendarPage({ notify }) {
  const today = dateKey(new Date());
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState(null);
  const days = useMemo(() => monthDays(month), [month]);

  const load = async (quiet = false) => {
    if (quiet) setRefreshing(true); else setLoading(true);
    setError('');
    try { setTasks(await apiRequest('/api/schedule')); }
    catch (err) { setError(err.message || 'Could not load scheduled tasks.'); }
    finally { setLoading(false); setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const tasksByDate = useMemo(() => tasks.reduce((groups, task) => {
    const key = taskDate(task);
    if (key) groups[key] = [...(groups[key] || []), task];
    return groups;
  }, {}), [tasks]);
  const unscheduled = tasks.filter((task) => !taskDate(task));
  const monthLabel = month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

  const saveTask = async (draft) => {
    setSaving(true);
    try {
      if (editor === 'create') {
        const created = await apiRequest('/api/schedule', { method: 'POST', body: JSON.stringify(draft) });
        setTasks((current) => [...current, created]);
        notify('Schedule task added');
      } else {
        const updated = await apiRequest(`/api/schedule/${editor.id}`, { method: 'PUT', body: JSON.stringify({ ...editor, ...draft }) });
        setTasks((current) => current.map((task) => task.id === editor.id ? updated : task));
        notify('Schedule task updated');
      }
      setSelectedDate(draft.date || selectedDate);
      setMonth(new Date(`${draft.date || selectedDate}T00:00:00`));
      setEditor(null);
    } catch (err) { notify(err.message || 'Could not save the schedule task.', 'error'); }
    finally { setSaving(false); }
  };

  const moveTask = async (task, targetDate) => {
    const currentDate = taskDate(task);
    if (!task.id || !targetDate || currentDate === targetDate) return;
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, date: targetDate } : item));
    try {
      const updated = await apiRequest(`/api/schedule/${task.id}`, { method: 'PUT', body: JSON.stringify({ ...task, date: targetDate }) });
      setTasks((current) => current.map((item) => item.id === task.id ? updated : item));
      notify(`Moved ${taskTitle(task)} to ${targetDate}`);
    } catch (err) {
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, date: currentDate } : item));
      notify(err.message || 'Could not move this task.', 'error');
    }
  };

  return <div className="schedule-page">
    <div className="functional-page-header"><div><div className="eyebrow">OPERATIONS</div><h1>Schedule</h1><p>Plan service visits and move tasks between days with drag and drop.</p></div><div className="page-actions"><button className="secondary-btn" type="button" onClick={() => load(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing ? 'spin' : ''} />{refreshing ? 'Refreshing...' : 'Refresh'}</button><button className="primary-btn" type="button" onClick={() => setEditor('create')}><Plus size={16} />Add task</button></div></div>
    {error && <div className="inline-error">{error}<button type="button" onClick={() => setError('')}><X size={14} /></button></div>}
    <section className="panel schedule-panel">
      <div className="schedule-toolbar"><div className="schedule-nav"><button className="icon-btn" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month"><ChevronLeft size={17} /></button><button className="today-btn" type="button" onClick={() => { setMonth(new Date()); setSelectedDate(today); }}>Today</button><button className="icon-btn" type="button" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month"><ChevronRight size={17} /></button></div><h2>{monthLabel}</h2><div className="schedule-summary"><CalendarDays size={15} />{tasks.length} tasks</div></div>
      <div className="calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
      {loading ? <div className="loading-state"><LoaderCircle className="spin" size={22} />Loading schedule...</div> : <div className="calendar-grid">{days.map((day) => { const key = dateKey(day); const dayTasks = tasksByDate[key] || []; const inMonth = day.getMonth() === month.getMonth(); return <div key={key} className={`calendar-day ${inMonth ? '' : 'outside-month'} ${key === today ? 'calendar-today' : ''} ${key === selectedDate ? 'calendar-selected' : ''}`} onClick={() => setSelectedDate(key)} onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drop-target'); }} onDragLeave={(event) => event.currentTarget.classList.remove('drop-target')} onDrop={(event) => { event.preventDefault(); event.currentTarget.classList.remove('drop-target'); const task = tasks.find((item) => String(item.id) === String(draggedId)); setDraggedId(null); if (task) moveTask(task, key); }}><div className="calendar-day-head"><span>{day.getDate()}</span>{dayTasks.length > 0 && <em>{dayTasks.length}</em>}</div><div className="calendar-tasks">{dayTasks.slice(0, 3).map((task) => <article key={task.id} className={`calendar-task task-${String(task.status || 'scheduled').toLowerCase()}`} draggable onDragStart={(event) => { event.stopPropagation(); setDraggedId(task.id); event.dataTransfer.effectAllowed = 'move'; }} onDragEnd={() => setDraggedId(null)} onClick={(event) => { event.stopPropagation(); setEditor(task); }}><b>{taskTitle(task)}</b><span>{task.time || task.timeSlot || task.technician || 'Open task'}</span></article>)}{dayTasks.length > 3 && <button className="more-tasks" type="button" onClick={(event) => { event.stopPropagation(); setSelectedDate(key); }}>+{dayTasks.length - 3} more</button>}</div></div>; })}</div>}
    </section>
    <section className="schedule-lower"><div className="panel selected-day-panel"><div className="panel-heading"><div><h2>{selectedLabel}</h2><span>{(tasksByDate[selectedDate] || []).length} scheduled tasks</span></div><button className="text-btn" type="button" onClick={() => { setEditor('create'); }}><Plus size={14} />Add task</button></div>{(tasksByDate[selectedDate] || []).length === 0 ? <div className="schedule-empty"><CalendarDays size={20} /><span>No tasks scheduled for this day.</span><button className="secondary-btn" type="button" onClick={() => setEditor('create')}>Add first task</button></div> : <div className="selected-task-list">{(tasksByDate[selectedDate] || []).map((task) => <button className="selected-task" type="button" key={task.id} onClick={() => setEditor(task)}><span className={`task-dot task-${String(task.status || 'scheduled').toLowerCase()}`} /><span><b>{taskTitle(task)}</b><small>{task.customer || 'No customer'}{task.technician ? `  -  ${task.technician}` : ''}</small></span><Edit3 size={15} /></button>)}</div>}</div><div className="panel schedule-help"><div className="schedule-help-icon"><Clock3 size={18} /></div><div><h3>Move tasks quickly</h3><p>Drag any task card to another date. Click a task to edit its details, status, or time.</p><button className="secondary-btn" type="button" onClick={() => load(true)}><UserRound size={14} />Sync schedule</button></div></div></section>
    {unscheduled.length > 0 && <section className="panel unscheduled-panel"><div className="panel-heading"><div><h2>Unscheduled tasks</h2><span>Drag a task into a calendar day</span></div></div><div className="unscheduled-list">{unscheduled.map((task) => <article key={task.id} className="calendar-task" draggable onDragStart={() => setDraggedId(task.id)}><b>{taskTitle(task)}</b><span>{task.customer || 'No customer'}</span></article>)}</div></section>}
    {editor && <TaskEditor task={editor} onClose={() => setEditor(null)} onSave={saveTask} saving={saving} />}
  </div>;
}


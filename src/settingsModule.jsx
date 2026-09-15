import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { ErrorState } from './assetModules.jsx';
import { currencies, dateFormats } from './api/settings.js';
import { isAdmin } from './api/services.js';

const defaults = {
  companyName: '',
  supportEmail: '',
  supportPhone: '',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  dateFormat: 'DD MMM YYYY',
  defaultVisitDurationMinutes: 60,
  maintenanceReminderDays: 30,
  emergencyResponseTargetMinutes: 60,
  emailNotificationsEnabled: false,
  smsNotificationsEnabled: false,
  autoAssignRequestsEnabled: false
};

export function SettingsPage({ api, user }) {
  const [draft, setDraft] = useState(defaults), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(null), [saved, setSaved] = useState(false), [revision, setRevision] = useState(0);
  const allowed = isAdmin(user);
  useEffect(() => {
    if (!allowed) return;
    let current = true;
    setLoading(true); setError(null); setSaved(false);
    api.get().then(value => { if (current) setDraft({ ...defaults, ...value }); }).catch(value => { if (current) setError(value); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [api, allowed, revision]);
  if (!allowed) return <p role="alert">Access denied. Administrator role required.</p>;
  const update = (key, value) => { setSaved(false); setDraft(current => ({ ...current, [key]: value })); };
  const submit = async event => {
    event.preventDefault();
    setSaving(true); setError(null); setSaved(false);
    try { setDraft({ ...defaults, ...(await api.update(draft)) }); setSaved(true); }
    catch (value) { setError(value); }
    finally { setSaving(false); }
  };
  return <><div className="page-header"><div><div className="eyebrow">ADMINISTRATION</div><h1>Settings</h1><p>Manage non-secret operational preferences used by the Admin workspace.</p></div><button className="secondary-btn" disabled={loading || saving} onClick={() => setRevision(value => value + 1)}>Reload</button></div>
    <form className="asset-form panel" onSubmit={submit}>
      {loading ? <p role="status">Loading settings...</p> : <>
        <ErrorState error={error}/>{saved && <p role="status">Settings saved.</p>}
        <div className="asset-fields">
          <label>Company name *<input required maxLength={200} value={draft.companyName || ''} onChange={event => update('companyName', event.target.value)} /></label>
          <label>Support email<input maxLength={254} type="email" value={draft.supportEmail || ''} onChange={event => update('supportEmail', event.target.value)} /></label>
          <label>Support phone<input maxLength={20} value={draft.supportPhone || ''} onChange={event => update('supportPhone', event.target.value)} /></label>
          <label>Timezone *<input required maxLength={64} value={draft.timezone || ''} onChange={event => update('timezone', event.target.value)} /></label>
          <label>Currency *<select required value={draft.currency || 'INR'} onChange={event => update('currency', event.target.value)}>{currencies.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Date format *<select required value={draft.dateFormat || 'DD MMM YYYY'} onChange={event => update('dateFormat', event.target.value)}>{dateFormats.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Default visit duration<input required type="number" min="15" max="480" step="1" value={draft.defaultVisitDurationMinutes ?? 60} onChange={event => update('defaultVisitDurationMinutes', event.target.value)} /></label>
          <label>Maintenance reminder days<input required type="number" min="0" max="365" step="1" value={draft.maintenanceReminderDays ?? 30} onChange={event => update('maintenanceReminderDays', event.target.value)} /></label>
          <label>Emergency target minutes<input required type="number" min="5" max="1440" step="1" value={draft.emergencyResponseTargetMinutes ?? 60} onChange={event => update('emergencyResponseTargetMinutes', event.target.value)} /></label>
        </div>
        <div className="asset-fields">
          <label><input type="checkbox" checked={Boolean(draft.emailNotificationsEnabled)} onChange={event => update('emailNotificationsEnabled', event.target.checked)} /> Email notifications</label>
          <label><input type="checkbox" checked={Boolean(draft.smsNotificationsEnabled)} onChange={event => update('smsNotificationsEnabled', event.target.checked)} /> SMS notifications</label>
          <label><input type="checkbox" checked={Boolean(draft.autoAssignRequestsEnabled)} onChange={event => update('autoAssignRequestsEnabled', event.target.checked)} /> Auto assignment</label>
        </div>
        <div className="page-actions"><button className="primary-btn" disabled={saving}><Save size={15}/>{saving ? 'Saving...' : 'Save settings'}</button></div>
      </>}
    </form></>;
}

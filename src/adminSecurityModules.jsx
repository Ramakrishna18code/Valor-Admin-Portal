import React, {useEffect, useMemo, useState} from 'react';
import {RefreshCw, Save, ShieldCheck} from 'lucide-react';
import {ErrorState} from './assetModules.jsx';
import {isAdmin} from './api/services.js';
import { PagerButtons, StatusChip } from './uiPatterns.jsx';

const roleLabel = value => String(value || '').replaceAll('_', ' ');
const display = value => value == null || value === '' ? '—' : String(value);

export function RolesPage({api, user}) {
  const [roles, setRoles] = useState([]), [permissions, setPermissions] = useState([]), [selected, setSelected] = useState('ADMIN');
  const [draft, setDraft] = useState([]), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [error, setError] = useState(null), [notice, setNotice] = useState('');
  const allowed = isAdmin(user), canWrite = user?.role === 'SUPER_ADMIN' && selected !== 'SUPER_ADMIN';
  const selectedRole = roles.find(role => role.name === selected);
  const grouped = useMemo(() => permissions.reduce((map, permission) => ({...map, [permission.category]: [...(map[permission.category] || []), permission]}), {}), [permissions]);
  const changed = selectedRole && JSON.stringify([...draft].sort()) !== JSON.stringify([...selectedRole.permissions].sort());
  const reload = async () => {
    setLoading(true); setError(null); setNotice('');
    try {
      const [p, r] = await Promise.all([api.permissions(), api.roles()]);
      setPermissions(p); setRoles(r);
      const current = r.find(role => role.name === selected) || r.find(role => role.name === 'ADMIN') || r[0];
      if (current) { setSelected(current.name); setDraft(current.permissions); }
    } catch (failure) { setError(failure); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (allowed) reload(); }, [allowed]);
  useEffect(() => { const role = roles.find(item => item.name === selected); if (role) setDraft(role.permissions); }, [selected]);
  const toggle = code => setDraft(current => current.includes(code) ? current.filter(value => value !== code) : [...current, code]);
  const save = async () => {
    setSaving(true); setError(null); setNotice('');
    try { const role = await api.updateRolePermissions(selected, draft); setRoles(current => current.map(item => item.name === role.name ? role : item)); setDraft(role.permissions); setNotice('Permissions saved.'); }
    catch (failure) { setError(failure); }
    finally { setSaving(false); }
  };
  if (!allowed) return <p role="alert">Access denied. Administrator role required.</p>;
  return <><div className="page-header"><div><div className="eyebrow">SECURITY</div><h1>Roles & Permissions</h1><p>Database-backed permission assignments for existing Valor roles.</p></div><div className="page-actions"><button className="secondary-btn" disabled={loading || saving} onClick={reload}><RefreshCw size={15}/>Refresh</button><button className="primary-btn" disabled={!canWrite || !changed || saving} onClick={save}><Save size={15}/>{saving ? 'Saving...' : 'Save'}</button></div></div>
    <section className="panel asset-form"><ErrorState error={error}/>{notice && <p role="status">{notice}</p>}{loading ? <div className="empty-state" role="status">Loading roles...</div> : roles.length === 0 ? <div className="empty-state">No roles found.</div> : <><div className="asset-fields"><label>Role<select value={selected} onChange={event => setSelected(event.target.value)}>{roles.map(role => <option key={role.name} value={role.name}>{roleLabel(role.name)}</option>)}</select></label><label>Status<input readOnly value={selectedRole?.enabled ? 'Enabled' : 'Disabled'} /></label></div>{!canWrite && <p>Only SUPER_ADMIN can change non-SUPER_ADMIN role permissions.</p>}{changed && <p role="status">Unsaved permission changes.</p>}<div className="asset-table"><table><thead><tr><th>Permission</th><th>Description</th><th>Enabled</th></tr></thead><tbody>{Object.entries(grouped).flatMap(([category, items]) => [<tr key={category}><td colSpan="3"><strong>{category}</strong></td></tr>, ...items.map(permission => <tr key={permission.code}><td>{permission.code}</td><td>{permission.description}</td><td><input type="checkbox" disabled={!canWrite || saving} checked={draft.includes(permission.code)} onChange={() => toggle(permission.code)} /></td></tr>)])}</tbody></table></div></>}</section></>;
}

export function AuditLogPage({api, user}) {
  const [data, setData] = useState(null), [detail, setDetail] = useState(null), [filters, setFilters] = useState({page:0,size:10});
  const [loading, setLoading] = useState(true), [error, setError] = useState(null);
  const allowed = isAdmin(user);
  const load = async () => { setLoading(true); setError(null); try { setData(await api.audit(filters)); } catch (failure) { setError(failure); } finally { setLoading(false); } };
  useEffect(() => { if (allowed) load(); }, [allowed, JSON.stringify(filters)]);
  const update = (key, value) => setFilters(current => ({...current, page:0, [key]:value}));
  const open = async id => { setError(null); try { setDetail(await api.auditDetail(id)); } catch (failure) { setError(failure); } };
  if (!allowed) return <p role="alert">Access denied. Administrator role required.</p>;
  return <><div className="page-header"><div><div className="eyebrow">SECURITY</div><h1>Audit Log</h1><p>Append-only accountability records for important mutations.</p></div><button className="secondary-btn" disabled={loading} onClick={load}><RefreshCw size={15}/>Refresh</button></div>
    <section className="panel asset-form"><div className="table-controls"><label>Actor Role<select value={filters.role || ''} onChange={event => update('role', event.target.value)}><option value="">All roles</option>{['SUPER_ADMIN','ADMIN','CUSTOMER','TECHNICIAN'].map(role=><option key={role}>{role}</option>)}</select></label><label>Action<input value={filters.action || ''} onChange={event => update('action', event.target.value)} placeholder="Search action" /></label><label>Entity Type<input value={filters.entityType || ''} onChange={event => update('entityType', event.target.value)} placeholder="Search entity" /></label><label>From<input type="date" value={filters.dateFrom || ''} onChange={event => update('dateFrom', event.target.value)} /></label><label>To<input type="date" value={filters.dateTo || ''} onChange={event => update('dateTo', event.target.value)} /></label></div><ErrorState error={error}/>{loading ? <div className="empty-state" role="status">Loading audit logs...</div> : data?.items.length === 0 ? <div className="empty-state">No audit logs found.</div> : <div className="asset-table"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Status</th><th>Summary</th><th>Detail</th></tr></thead><tbody>{data?.items.map(row => <tr key={row.id}><td>{display(row.createdAt)}</td><td>{display(row.actorRole)} #{display(row.actorUserId)}</td><td>{row.action}</td><td>{display(row.entityType)} {display(row.entityId)}</td><td><StatusChip value={row.resultStatus}/></td><td>{display(row.summary)}</td><td><button className="secondary-btn" onClick={() => open(row.id)}>Open</button></td></tr>)}</tbody></table></div>}<PagerButtons page={filters.page || 0} totalPages={data?.totalPages} totalItems={data?.totalElements} onPage={page=>setFilters(current=>({...current,page}))} busy={loading}/></section>{detail && <section className="panel"><div className="page-header"><div><div className="eyebrow">AUDIT DETAIL</div><h2>{detail.action}</h2></div><button className="secondary-btn" onClick={() => setDetail(null)}>Close</button></div><dl className="detail-list"><dt>Entity</dt><dd>{display(detail.entityType)} {display(detail.entityId)}</dd><dt>Summary</dt><dd>{display(detail.summary)}</dd><dt>Before</dt><dd>{display(detail.beforeSummary)}</dd><dt>After</dt><dd>{display(detail.afterSummary)}</dd></dl></section>}</>;
}

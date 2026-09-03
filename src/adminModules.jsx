import React, { useEffect, useMemo, useState } from 'react';
import { apiRequest } from './api/client';
import { Check, Edit3, Eye, LoaderCircle, MoreHorizontal, Plus, Save, Search, Trash2, X } from 'lucide-react';
import './adminModules.css';

const resourceMap = {
  customers: 'customers', buildings: 'buildings', lifts: 'lifts', amc: 'amcs', technicians: 'technicians',
  payments: 'payments', inventory: 'inventory', notifications: 'notifications', 'admin-users': 'admin', roles: 'roles',
  settings: 'settings', audit: 'audit', invoices: 'invoices', transactions: 'transactions', exports: 'exports', schedule: 'schedule'
};

const definitions = {
  'admin-users': { title: 'Admin Users', description: 'Control who can access the Valor operations workspace.', action: 'Create admin', columns: ['Name', 'Email', 'Role', 'Employee ID', 'Designation', 'Active'], fields: [['name','Name'],['email','Email','email'],['phone','Phone'],['password','Temporary password','password'],['role','Role','select',['ADMIN','SUPER_ADMIN']],['employeeId','Employee ID'],['designation','Designation'],['active','Active','checkbox']] },
  roles: { title: 'Roles & Permissions', description: 'Define access boundaries for every operations role.', action: 'Create role', columns: ['Name', 'Description', 'Permissions'], fields: [['name','Role name'],['description','Description'],['permissions','Permissions','textarea']] },
  settings: { title: 'Settings', description: 'Manage workspace defaults, support contacts, notifications, and security preferences.', action: 'Save settings', columns: ['Setting','Value'], fields: [['companyName','Company name'],['supportEmail','Support email','email'],['supportPhone','Support phone'],['timezone','Timezone','select',['Asia/Kolkata','UTC','Asia/Dubai']],['currency','Currency','select',['INR','USD','AED']],['dateFormat','Date format','select',['DD MMM YYYY','MM/DD/YYYY','YYYY-MM-DD']],['defaultVisitDuration','Default visit duration'],['maintenanceReminderDays','Maintenance reminder days','number'],['sessionTimeoutMinutes','Session timeout minutes','number'],['emergencyResponseMinutes','Emergency response target','number'],['emailNotifications','Email notifications','checkbox'],['smsNotifications','SMS notifications','checkbox'],['autoAssignRequests','Auto-assign service requests','checkbox']] },
  audit: { title: 'Audit Log', description: 'Review security-sensitive changes across the operations workspace.', columns: ['Actor','Action','Entity','Timestamp','Status'], readonly: true },
  invoices: { title: 'Invoices', description: 'Create, review, and manage customer billing records.', action: 'Create invoice', columns: ['Invoice number','Customer','Amount','Tax','Total','Status','Due date'], fields: [['invoiceNumber','Invoice number'],['customer','Customer'],['amount','Amount','number'],['tax','Tax','number'],['total','Total','number'],['status','Status','select',['PENDING','PAID','PARTIALLY_PAID','FAILED']],['dueDate','Due date','date']] },
  transactions: { title: 'Transactions', description: 'Review inventory movement and stock-control history.', action: 'Add transaction', columns: ['Item','Type','Quantity','Reference','Date'], fields: [['item','Item'],['type','Type','select',['PURCHASE','ISSUE','RETURN','ADJUSTMENT']],['quantity','Quantity','number'],['reference','Reference'],['date','Date','datetime-local']], readonly: true },
  exports: { title: 'Exports', description: 'Prepare operational data exports for finance and compliance.', action: 'Create export', columns: ['Name','Format','Status','Created by','Created at'], fields: [['name','Export name'],['format','Format','select',['CSV','PDF']],['status','Status','select',['QUEUED','READY']],['createdBy','Created by']] },
  schedule: { title: 'Schedule', description: 'Manage scheduled service visits and maintenance slots.', action: 'Create visit', columns: ['Visit','Customer','Technician','Date','Status'], fields: [['visit','Visit title'],['customer','Customer'],['technician','Technician'],['date','Visit date','date'],['status','Status','select',['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED']]] }
};

const aliases = {
  'ID': ['id'], 'Name': ['name','title','visit','itemName','actor'], 'Building': ['buildingName','building','name'], 'Customer': ['customerName','companyName','customer','customerId'], 'Customer ID': ['customerId'], 'Building ID': ['buildingId'], 'Lift ID': ['liftId'], 'Service ID': ['serviceId'], 'Email': ['email'], 'Address': ['address','street'], 'Status': ['status','accountStatus'], 'Role': ['role'],
  'Employee ID': ['employeeId'], 'Designation': ['designation'], 'Active': ['active','enabled'], 'Description': ['description','message'],
  'Permissions': ['permissions'], 'Setting': ['setting','companyName','supportEmail','supportPhone','timezone'], 'Value': ['value'],
  'Invoice number': ['invoiceNumber'], 'Amount': ['amount'], 'Tax': ['tax','gstAmount'], 'Total': ['total','totalAmount'], 'Due date': ['dueDate'],
  'Actor': ['actor'], 'Action': ['action'], 'Entity': ['entity'], 'Timestamp': ['timestamp','date','transactionDateTime'], 'Status': ['status'],
  'Type': ['type','buildingType','transactionType'], 'Lifts': ['lifts','numberOfLifts','liftCount'], 'Emergency contact': ['emergencyContactPhone','emergencyContact'], 'AMC': ['amc','amcStatus'], 'Health': ['health','healthScore'], 'Next maintenance': ['nextMaintenance','nextMaintenanceDate','maintenanceDate'], 'Quantity': ['quantity'], 'Reference': ['reference','referenceNumber'], 'Date': ['date','transactionDateTime'],
  'Technician': ['technician','technicianName','assignedTechnicianId']
};

const normalize = (value) => String(value ?? '').replaceAll('_',' ').replaceAll('-',' ');
const publicId = (prefix, value) => value == null || value === '' ? 'N/A' : `VAL-${prefix}-${new Date().getFullYear()}-${String(value).padStart(4, '0')}`;
const recordPublicId = (row) => row.buildingName ? publicId('BLD', row.id) : row.liftNumber ? publicId('LFT', row.id) : publicId('CUS', row.id);
const displayValue = (row, column) => {
  if (column === 'ID') return recordPublicId(row);
  if (column === 'Customer ID') return publicId('CUS', row.customerId);
  if (column === 'Building ID') return publicId('BLD', row.buildingId);
  if (column === 'Lift ID') return publicId('LFT', row.liftId);
  const keys = aliases[column] || [column.replaceAll(' ','').replace(/^./, (c) => c.toLowerCase())];
  const key = Object.keys(row).find((candidate) => keys.some((alias) => candidate.toLowerCase() === alias.toLowerCase()));
  if (!key) return 'N/A';
  const value = row[key];
  if (typeof value === 'boolean') return value ? 'Active' : 'Inactive';
  if (typeof value === 'object') return JSON.stringify(value);
  return normalize(value);
};

const fieldsFor = (moduleId, module) => module.fields || {
  customers: [['name','Name'],['email','Email','email'],['password','Temporary password','password'],['phone','Phone'],['address','Address'],['city','City'],['state','State'],['pincode','Pincode'],['accountStatus','Account status','select',['ACTIVE','INACTIVE','SUSPENDED']],['buildingName','First building (optional)'],['buildingType','Building type'],['liftName','First lift (optional)'],['liftNumber','Lift number']],
  buildings: [['customerId','Customer ID','number'],['buildingName','Building name'],['buildingType','Building type'],['city','City'],['emergencyContactPhone','Emergency contact'],['status','Status','select',['ACTIVE','INACTIVE']]],
  lifts: [['name','Name'],['liftNumber','Lift number'],['manufacturer','Manufacturer'],['model','Model'],['customerId','Customer ID','number'],['buildingId','Building ID','number'],['currentStatus','Status','select',['ACTIVE','DOWN','MAINTENANCE','OUT_OF_SERVICE']],['healthScore','Health score','number']],
  amc: [['plan','Plan'],['amcNumber','AMC number'],['liftId','Lift ID','number'],['startDate','Start date','date'],['endDate','End date','date'],['status','Status','select',['ACTIVE','EXPIRED','CANCELLED','RENEWED']]],
  technicians: [['name','Name'],['email','Email','email'],['phone','Phone'],['employeeId','Employee ID'],['assignedArea','Area'],['specialization','Specialization'],['availabilityStatus','Availability','select',['AVAILABLE','BUSY','OFF_DUTY','ON_LEAVE']]],
  payments: [['customerId','Customer ID','number'],['amcId','AMC ID','number'],['amount','Amount','number'],['gstAmount','GST','number'],['totalAmount','Total','number'],['paymentMode','Payment mode','select',['UPI','BANK_TRANSFER','CASH']],['status','Status','select',['PENDING','PARTIALLY_PAID','PAID','FAILED','REFUNDED']]],
  inventory: [['itemName','Item name'],['sku','SKU'],['stockQuantity','Current stock','number'],['reorderLevel','Reorder level','number'],['unit','Unit'],['location','Location']],
  notifications: [['recipientType','Recipient type','select',['CUSTOMER','TECHNICIAN','ADMIN']],['recipientId','Recipient ID','number'],['title','Title'],['message','Message','textarea'],['channel','Channel','select',['EMAIL','SMS','PUSH']],['status','Status','select',['PENDING','SENT','FAILED','READ']]]
}[moduleId] || [];

function Pill({ value }) { const status = String(value || '').toLowerCase().replaceAll(' ','-').replaceAll('_','-'); return <span className={`badge ${status}`}><i />{normalize(value)}</span>; }

function ModuleDetails({ row, title, onClose }) {
  const details = Object.entries(row || {}).filter(([key]) => !['password', 'id'].includes(key));
  return <div className="module-detail-overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="module-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="module-detail-title">
      <div className="module-detail-head"><div><div className="eyebrow">RECORD DETAILS</div><h2 id="module-detail-title">{title}</h2></div><button className="icon-btn" type="button" onClick={onClose} aria-label="Close"><X size={18} /></button></div>
      <div className="module-detail-grid">{details.map(([key, value]) => <div key={key}><span>{normalize(key)}</span><b>{typeof value === 'object' ? JSON.stringify(value) : typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : normalize(value)}</b></div>)}</div>
      <button className="primary-btn module-detail-close" type="button" onClick={onClose}>Close</button>
    </section>
  </div>;
}

function ModuleActions({ row, open, onToggle, onView, onEdit, onDelete, canEdit, canDelete, title }) {
  const [position, setPosition] = useState(null);
  const toggle = (event) => { event.stopPropagation(); if (open) { onToggle(null); return; } const rect = event.currentTarget.getBoundingClientRect(); const menuHeight = canEdit && canDelete ? 150 : 80; const top = rect.bottom + 6 + menuHeight > window.innerHeight ? Math.max(8, rect.top - menuHeight - 6) : rect.bottom + 6; const left = Math.min(Math.max(8, rect.right - 150), window.innerWidth - 158); setPosition({ top, left }); onToggle(String(row.id ?? title)); };
  const closeAnd = (callback) => { onToggle(null); callback(row); };
  return <div className="module-action-wrap"><button className="more-btn" type="button" aria-label={`Actions for ${title}`} onClick={toggle}><MoreHorizontal size={17} /></button>{open && <div className="module-action-menu" style={position} onClick={(event) => event.stopPropagation()}><button type="button" onClick={() => closeAnd(onView)}><Eye size={15} />View</button>{canEdit && <button type="button" onClick={() => closeAnd(onEdit)}><Edit3 size={15} />Edit</button>}{canDelete && <button className="danger-action" type="button" onClick={() => closeAnd(onDelete)}><Trash2 size={15} />Delete</button>}</div>}</div>;
}

export function AdminModulePage({ moduleId, module, notify }) {
  const definition = definitions[moduleId] || module || { title: moduleId, description: '', columns: [] };
  const resource = resourceMap[moduleId];
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [draft, setDraft] = useState({});
  const [error, setError] = useState('');
  const [lookups, setLookups] = useState({ customers: [], buildings: [] });
  const [openActionId, setOpenActionId] = useState(null);
  const columns = definition.columns || [];
  const fields = fieldsFor(moduleId, definition);

  const load = async () => { setLoading(true); setError(''); setOpenActionId(null); try { const rows = await apiRequest(`/api/${resource}`); setRecords(rows); if (moduleId === 'buildings' || moduleId === 'lifts') { const [customers, buildings] = await Promise.all([apiRequest('/api/customers').catch(() => []), apiRequest('/api/buildings').catch(() => [])]); setLookups({ customers, buildings }); } } catch (err) { setError(err.message || 'Could not load records.'); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [resource]);
  useEffect(() => { const close = () => setOpenActionId(null); window.addEventListener('click', close); window.addEventListener('scroll', close, true); window.addEventListener('resize', close); return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); }; }, []);
  const moduleDisplayValue = (row, column) => { if (column === 'Customer' && row.customerId) { const customer = lookups.customers.find((item) => String(item.id) === String(row.customerId)); return customer?.name || customer?.companyName || `Customer #${row.customerId}`; } if (column === 'Building' && row.buildingId) { const building = lookups.buildings.find((item) => String(item.id) === String(row.buildingId)); return building?.buildingName || building?.name || `Building #${row.buildingId}`; } return displayValue(row, column); };
  const tableRecords = moduleId === 'settings' && records[0] ? fields.map(([key, fieldLabel]) => ({ id: key, setting: fieldLabel, value: records[0][key] ?? 'N/A' })) : records;
  const filtered = useMemo(() => tableRecords.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())), [tableRecords, query]);
  const openCreate = () => { if (moduleId === 'settings' && records[0]) { setDraft({ ...records[0] }); setEditor(records[0]); return; } const blank = {}; fields.forEach(([key,,type]) => { blank[key] = type === 'checkbox' ? true : ''; }); setDraft(blank); setEditor('create'); };
  const openEdit = (row) => { setDraft({ ...row }); setEditor(row); };
  const save = async () => { try {
    if (editor === 'create' && moduleId === 'lifts' && (!draft.customerId || !draft.buildingId)) {
      setError('Select a customer and one of that customer\'s buildings before adding a lift.');
      return;
    }
    if (editor === 'create' && moduleId === 'customers' && draft.liftName?.trim() && !draft.buildingName?.trim()) {
      setError('Add a building before adding the first lift.');
      return;
    }
    const { buildingName, buildingType, liftName, liftNumber, ...recordPayload } = draft;
    const payload = moduleId === 'buildings' || moduleId === 'lifts'
      ? { ...draft, customerId: draft.customerId ? Number(draft.customerId) : undefined, buildingId: draft.buildingId ? Number(draft.buildingId) : undefined }
      : moduleId === 'customers' ? recordPayload : draft;
    if (editor === 'create') {
      const savedCustomer = await apiRequest(`/api/${resource}`, { method: 'POST', body: JSON.stringify(payload) });
      if (moduleId === 'customers' && buildingName?.trim()) {
        const savedBuilding = await apiRequest('/api/buildings', { method: 'POST', body: JSON.stringify({ customerId: savedCustomer.id, buildingName: buildingName.trim(), buildingType: buildingType || 'RESIDENTIAL', status: 'ACTIVE' }) });
        if (liftName?.trim()) await apiRequest('/api/lifts', { method: 'POST', body: JSON.stringify({ customerId: savedCustomer.id, buildingId: savedBuilding.id, name: liftName.trim(), liftNumber: liftNumber?.trim() || undefined, currentStatus: 'ACTIVE' }) });
      }
    } else await apiRequest(`/api/${resource}/${editor.id}`, { method: 'PUT', body: JSON.stringify(payload) });
    notify(moduleId === 'customers' && buildingName?.trim() ? 'Customer, building, and lift saved successfully' : `${definition.title} saved successfully`); setEditor(null); await load();
  } catch (err) { setError(err.message || 'Could not save this record.'); } };
  const remove = async (row) => { if (!window.confirm(`Delete ${displayValue(row, columns[0])}? This cannot be undone.`)) return; try { await apiRequest(`/api/${resource}/${row.id}`, { method: 'DELETE' }); notify('Record deleted'); await load(); } catch (err) { setError(err.message || 'Could not delete this record.'); } };
  const formRecord = editor === 'create' ? draft : editor || {};

  return <><div className="functional-page-header"><div><div className="eyebrow">ADMINISTRATION</div><h1>{definition.title}</h1><p>{definition.description}</p></div><div className="page-actions"><button className="secondary-btn" type="button" onClick={load} disabled={loading}><LoaderCircle size={15} className={loading ? 'spin' : ''} />{loading ? 'Loading…' : 'Refresh'}</button>{definition.action && !definition.readonly && <button className="primary-btn" type="button" onClick={openCreate}><Plus size={16} />{definition.action}</button>}</div></div>
    {error && <div className="inline-error">{error}<button type="button" onClick={() => setError('')}><X size={14} /></button></div>}
    <section className="panel functional-panel"><div className="functional-toolbar"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${definition.title.toLowerCase()}`} /></div><span className="record-count">{filtered.length} records</span></div>{loading ? <div className="loading-state"><LoaderCircle className="spin" size={22} />Loading {definition.title.toLowerCase()}…</div> : filtered.length === 0 ? <div className="empty-state"><div><Search size={22} /></div><b>No records found</b><span>Try another search or create a new record.</span></div> : <div className="functional-table-wrap"><table className="functional-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>Actions</th></tr></thead><tbody>{filtered.map((row) => { const rowKey = String(row.id ?? displayValue(row, columns[0])); const rowTitle = moduleDisplayValue(row, columns[0]); const actionRecord = moduleId === 'settings' ? records[0] : row; return <tr key={rowKey}>{columns.map((column) => <td key={column}>{['Status', 'Active', 'Role'].includes(column) ? <Pill value={displayValue(row, column)} /> : <span title={moduleDisplayValue(row, column)}>{moduleDisplayValue(row, column)}</span>}</td>)}<td><ModuleActions row={row} title={rowTitle} open={openActionId === rowKey} onToggle={setOpenActionId} onView={() => setViewing(actionRecord)} onEdit={() => openEdit(actionRecord)} onDelete={() => remove(actionRecord)} canEdit={!definition.readonly} canDelete={!definition.readonly && moduleId !== 'settings'} /></td></tr>; })}</tbody></table></div>}</section>
    {viewing && <ModuleDetails row={viewing} title={moduleDisplayValue(viewing, columns[0])} onClose={() => setViewing(null)} />}
    {editor && <><div className="drawer-scrim" onClick={() => setEditor(null)} /><aside className="drawer functional-drawer"><div className="drawer-head"><div><div className="eyebrow">{editor === 'create' ? 'NEW RECORD' : 'EDIT RECORD'}</div><h2>{editor === 'create' ? definition.action : 'Edit ' + definition.title}</h2></div><button className="icon-btn" type="button" onClick={() => setEditor(null)}><X size={18} /></button></div><p className="drawer-description">Changes are validated by the Valor backend and saved securely.</p><div className="form-grid">{fields.map(([key, fieldLabel, type, options]) => <label key={key}>{fieldLabel}{type === 'textarea' ? <textarea value={formRecord[key] ?? ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /> : type === 'select' ? <select value={formRecord[key] ?? ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}><option value="">Select {fieldLabel.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{normalize(option)}</option>)}</select> : type === 'checkbox' ? <input type="checkbox" checked={Boolean(formRecord[key])} onChange={(event) => setDraft({ ...draft, [key]: event.target.checked })} /> : moduleId === 'buildings' && key === 'customerId' ? <select required value={formRecord[key] ?? ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}><option value="">Select customer</option>{lookups.customers.map((customer) => <option key={customer.id} value={customer.id}>{publicId('CUS', customer.id)} - {customer.name || customer.companyName}</option>)}</select> : moduleId === 'lifts' && key === 'customerId' ? <select required value={formRecord[key] ?? ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value, buildingId: '' })}><option value="">Select customer first</option>{lookups.customers.map((customer) => <option key={customer.id} value={customer.id}>{publicId('CUS', customer.id)} - {customer.name || customer.companyName}</option>)}</select> : moduleId === 'lifts' && key === 'buildingId' ? <select required={editor === 'create'} disabled={!formRecord.customerId} value={formRecord[key] ?? ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}><option value="">{formRecord.customerId ? 'Select customer building' : 'Select customer first'}</option>{lookups.buildings.filter((building) => String(building.customerId) === String(formRecord.customerId)).map((building) => <option key={building.id} value={building.id}>{publicId('BLD', building.id)} - {building.buildingName}</option>)}</select> : <input type={type || 'text'} required={editor === 'create' && moduleId === 'customers' && ['name', 'email', 'password', 'phone'].includes(key)} value={formRecord[key] ?? ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />}</label>)}</div><div className="drawer-footer"><button className="secondary-btn" type="button" onClick={() => setEditor(null)}>Cancel</button><button className="primary-btn" type="button" onClick={save}><Save size={15} />Save changes</button></div></aside></>}
  </>;
}







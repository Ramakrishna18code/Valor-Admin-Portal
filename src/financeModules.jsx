import React, {useEffect, useState} from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { ErrorState } from './assetModules.jsx';
import { isAdmin } from './api/services.js';
import { reportTypes } from './api/finance.js';

const money = row => `${row.currency || 'INR'} ${Number(row.amount || 0).toFixed(2)}`;
const when = value => value ? new Date(value).toLocaleString() : 'None';
const label = value => String(value || 'UNKNOWN').replace(/_/g, ' ').toLowerCase();
function Badge({value}) { return <span className={`badge ${String(value || 'neutral').toLowerCase().replace(/_/g, '-')}`}><i />{label(value)}</span>; }
function Detail({label, value}) { return <div><span>{label}</span><b>{value || 'None'}</b></div>; }

async function saveResponse(response, filename) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

export function TransactionsPage({api, user}) {
  const [filters, setFilters] = useState({page:0, size:20, sort:'createdAt,desc', q:'', type:'', status:''});
  const [data, setData] = useState(null), [selected, setSelected] = useState(null), [loading, setLoading] = useState(true);
  const [error, setError] = useState(null), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0);
  const allowed = isAdmin(user);
  useEffect(() => {
    if (!allowed) return;
    let current = true; setLoading(true); setError(null); setNotice('');
    api.transactions(filters).then(page => { if (current) { setData(page); if (!selected && page.items[0]) setSelected(page.items[0]); } })
      .catch(value => { if (current) { setData(null); setError(value); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [api, allowed, revision, JSON.stringify(filters)]);
  if (!allowed) return <p role="alert">Access denied. Administrator role required.</p>;
  const update = patch => setFilters(current => ({...current, ...patch, page:0}));
  const exportCsv = async () => {
    setError(null); setNotice('');
    try { await saveResponse(await api.transactionExport(filters), 'transactions.csv'); setNotice('Transaction export downloaded.'); }
    catch (value) { setError(value); }
  };
  return <><div className="page-header"><div><div className="eyebrow">FINANCE</div><h1>Transactions</h1><p>Payment and refund movement from backend-authoritative payment records.</p></div><div className="page-actions"><button className="secondary-btn" disabled={loading} onClick={exportCsv}><Download size={15}/>CSV</button><button className="secondary-btn" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15}/>Refresh</button></div></div>
    <ErrorState error={error}/>{notice && <p role="status">{notice}</p>}
    <section className="panel table-panel"><div className="filter-bar"><div className="search-box"><input placeholder="Search invoice or gateway id" value={filters.q} onChange={event => update({q:event.target.value})}/></div>
      <select className="filter-btn" value={filters.type} onChange={event => update({type:event.target.value})}><option value="">All types</option><option>PAYMENT</option><option>REFUND</option></select>
      <select className="filter-btn" value={filters.status} onChange={event => update({status:event.target.value})}><option value="">All statuses</option>{['PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED','REQUESTED'].map(value => <option key={value}>{value}</option>)}</select>
      <input className="filter-btn" type="date" value={filters.dateFrom || ''} onChange={event => update({dateFrom:event.target.value})}/><input className="filter-btn" type="date" value={filters.dateTo || ''} onChange={event => update({dateTo:event.target.value})}/></div>
      {loading ? <div className="empty-state" role="status">Loading transactions...</div> : <div className="payments-table"><div className="table-head"><span>ID</span><span>Relationship</span><span>Amount</span><span>Status</span><span>Gateway</span><span></span></div>
        {(data?.items || []).map(row => <button key={row.id} className="table-row" style={{width:'100%',textAlign:'left'}} onClick={() => setSelected(row)}><span className="strong">{row.id}</span><span>{row.invoiceNumber || (row.invoiceId ? `Invoice ${row.invoiceId}` : `Customer ${row.customerProfileId}`)}</span><span>{money(row)}</span><Badge value={row.status}/><span>{row.razorpayRefundId || row.razorpayPaymentId || row.razorpayOrderId || row.gatewayStatus || 'Internal'}</span><span>Open</span></button>)}
        {data?.items?.length ? null : <div className="empty-state"><b>No transactions</b><span>No matching payment or refund records were returned.</span></div>}</div>}
    </section>
    <section className="module-detail-dialog" style={{position:'static',width:'100%',maxHeight:'none',boxShadow:'none',marginTop:16}}>
      {selected ? <><div className="module-detail-head"><div><span className="eyebrow">{selected.type}</span><h2>{selected.id}</h2></div><Badge value={selected.status}/></div><div className="module-detail-grid">
        <Detail label="Amount" value={money(selected)}/><Detail label="Customer profile" value={selected.customerProfileId}/><Detail label="Invoice" value={selected.invoiceNumber || selected.invoiceId}/><Detail label="Payment" value={selected.paymentId}/><Detail label="Refund" value={selected.refundId}/><Detail label="Service request" value={selected.serviceRequestId}/><Detail label="AMC contract" value={selected.amcContractId}/><Detail label="Purpose" value={selected.purpose}/><Detail label="Razorpay order" value={selected.razorpayOrderId}/><Detail label="Razorpay payment" value={selected.razorpayPaymentId}/><Detail label="Razorpay refund" value={selected.razorpayRefundId}/><Detail label="Gateway status" value={selected.gatewayStatus}/><Detail label="Created" value={when(selected.createdAt)}/><Detail label="Updated" value={when(selected.updatedAt)}/></div></> : <div className="empty-state"><b>Select a transaction</b><span>Open a transaction to inspect its payment, refund and invoice relationship.</span></div>}
    </section></>;
}

export function ReportsPage({api, user, initialType = 'revenue'}) {
  const [type, setType] = useState(initialType), [filters, setFilters] = useState({dateFrom:'', dateTo:'', status:''});
  const [data, setData] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(null), [notice, setNotice] = useState(''), [revision, setRevision] = useState(0);
  const allowed = isAdmin(user);
  useEffect(() => {
    if (!allowed) return;
    let current = true; setLoading(true); setError(null); setNotice('');
    api.report(type, filters).then(value => { if (current) setData(value); }).catch(value => { if (current) { setData(null); setError(value); } }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [api, allowed, type, revision, JSON.stringify(filters)]);
  if (!allowed) return <p role="alert">Access denied. Administrator role required.</p>;
  const exportCsv = async () => {
    try { await saveResponse(await api.reportExport(type, filters), `${type}-report.csv`); setNotice('Report export downloaded.'); }
    catch (value) { setError(value); }
  };
  const rows = data?.rows || [], summary = data?.summary || {};
  return <><div className="page-header"><div><div className="eyebrow">ANALYTICS</div><h1>Reports & Exports</h1><p>Database-derived operational and financial summaries with CSV export.</p></div><div className="page-actions"><button className="secondary-btn" disabled={loading} onClick={exportCsv}><Download size={15}/>CSV</button><button className="secondary-btn" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15}/>Refresh</button></div></div>
    <ErrorState error={error}/>{notice && <p role="status">{notice}</p>}
    <section className="panel table-panel"><div className="filter-bar"><select className="filter-btn" value={type} onChange={event => setType(event.target.value)}>{reportTypes.map(value => <option key={value} value={value}>{value}</option>)}</select><input className="filter-btn" type="date" value={filters.dateFrom} onChange={event => setFilters(current => ({...current, dateFrom:event.target.value}))}/><input className="filter-btn" type="date" value={filters.dateTo} onChange={event => setFilters(current => ({...current, dateTo:event.target.value}))}/><input className="filter-btn" placeholder="Status filter" value={filters.status} onChange={event => setFilters(current => ({...current, status:event.target.value.trim().toUpperCase()}))}/></div></section>
    {loading ? <section className="panel empty-state" role="status">Loading report...</section> : <><div className="kpi-grid">{Object.entries(summary).map(([key,value]) => <section className="kpi-card" key={key}><div className="kpi-label">{label(key)}</div><div className="kpi-value">{typeof value === 'number' ? value.toLocaleString() : String(value)}</div></section>)}</div>
      <section className="panel"><div className="panel-heading"><div><h2>{label(data?.type || type)} rows</h2><span>{rows.length} rows</span></div></div>{rows.length ? <div className="payments-table">{rows.map((row, index) => <div className="table-row" key={index}><span className="strong">{row.status || row.metric || index + 1}</span><span>{row.count ?? row.value ?? ''}</span><span>{row.amount ?? ''}</span><span></span><span></span><span></span></div>)}</div> : <div className="empty-state"><b>No rows</b><span>This report returned summary totals only or no matching records.</span></div>}</section></>}
  </>;
}

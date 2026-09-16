import React, { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw } from 'lucide-react';
import { ErrorState } from './assetModules.jsx';
import { isAdmin } from './api/services.js';

const money = row => `${row.currency || 'INR'} ${Number(row.amount || 0).toFixed(2)}`;
const when = value => value ? new Date(value).toLocaleString() : 'Not synced';

function Badge({ value }) {
  return <span className={`badge ${String(value || 'neutral').toLowerCase().replace(/_/g, '-')}`}><i />{String(value || 'UNKNOWN').replace(/_/g, ' ').toLowerCase()}</span>;
}

function DetailRow({ label, value }) {
  return <div><span>{label}</span><b>{value || 'None'}</b></div>;
}

function PaymentDetail({ payment, refunds, refunding, refundDraft, setRefundDraft, onRefund, onReload }) {
  if (!payment) return <section className="panel empty-state"><b>Select a payment</b><span>Open a row to inspect invoice, gateway, refund and reconciliation state.</span></section>;
  const busyRefund = refunding === payment.id;
  return <section className="module-detail-dialog" style={{position:'static',width:'100%',maxHeight:'none',boxShadow:'none'}}>
    <div className="module-detail-head"><div><span className="eyebrow">PAYMENT #{payment.id}</span><h2>{money(payment)}</h2></div><Badge value={payment.status}/></div>
    <div className="module-detail-grid">
      <DetailRow label="Customer profile" value={payment.customerProfileId}/>
      <DetailRow label="Invoice" value={payment.invoiceId}/>
      <DetailRow label="Service request" value={payment.serviceRequestId}/>
      <DetailRow label="AMC contract" value={payment.amcContractId}/>
      <DetailRow label="Purpose" value={payment.purpose}/>
      <DetailRow label="Gateway status" value={payment.gatewayStatus}/>
      <DetailRow label="Razorpay order" value={payment.razorpayOrderId}/>
      <DetailRow label="Razorpay payment" value={payment.razorpayPaymentId}/>
      <DetailRow label="Gateway synced" value={when(payment.gatewaySyncedAt)}/>
      <DetailRow label="Failure reason" value={payment.failureReason}/>
    </div>
    <h3>Refunds</h3>
    {refunds.length ? refunds.map(row => <div className="module-detail-grid" key={row.id} style={{marginBottom:10}}>
      <DetailRow label="Refund" value={`#${row.id} ${money(row)}`}/>
      <DetailRow label="Status" value={row.status}/>
      <DetailRow label="Razorpay refund" value={row.razorpayRefundId}/>
      <DetailRow label="Gateway status" value={row.gatewayStatus}/>
      <DetailRow label="Reason" value={row.reason}/>
      <DetailRow label="Updated" value={when(row.updatedAt)}/>
    </div>) : <p>No refunds requested.</p>}
    <form className="asset-fields" onSubmit={event => { event.preventDefault(); onRefund(payment.id); }}>
      <label>Refund amount<input type="number" min="0.01" step="0.01" disabled={busyRefund} value={refundDraft.amount} onChange={event => setRefundDraft(current => ({...current, amount:event.target.value}))}/></label>
      <label>Reason<textarea maxLength={500} disabled={busyRefund} value={refundDraft.reason} onChange={event => setRefundDraft(current => ({...current, reason:event.target.value}))}/></label>
      <div className="page-actions"><button className="primary-btn" disabled={busyRefund || !refundDraft.amount}><RotateCcw size={15}/>{busyRefund ? 'Requesting...' : 'Request refund'}</button><button type="button" className="secondary-btn" disabled={busyRefund} onClick={onReload}>Refresh status</button></div>
    </form>
  </section>;
}

export function PaymentsPage({ api, user }) {
  const [data, setData] = useState(null), [selected, setSelected] = useState(null), [refunds, setRefunds] = useState([]);
  const [issues, setIssues] = useState([]), [loading, setLoading] = useState(true), [error, setError] = useState(null);
  const [notice, setNotice] = useState(''), [revision, setRevision] = useState(0), [refunding, setRefunding] = useState(null);
  const [refundDraft, setRefundDraft] = useState({amount:'', reason:''});
  const allowed = isAdmin(user);
  useEffect(() => {
    if (!allowed) return;
    let current = true;
    setLoading(true); setError(null); setNotice('');
    Promise.all([api.list(), api.reconciliation()])
      .then(([payments, reconciliation]) => { if (current) { setData(payments); setIssues(reconciliation); if (!selected && payments.items[0]) setSelected(payments.items[0]); } })
      .catch(value => { if (current) { setData(null); setIssues([]); setError(value); } })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [api, allowed, revision]);
  useEffect(() => {
    if (!selected) { setRefunds([]); return; }
    let current = true;
    api.refunds(selected.id).then(rows => { if (current) setRefunds(rows); }).catch(value => { if (current) setError(value); });
    return () => { current = false; };
  }, [api, selected?.id, revision]);
  if (!allowed) return <p role="alert">Access denied. Administrator role required.</p>;
  const reloadSelected = async () => {
    if (!selected) return;
    setSelected(await api.detail(selected.id));
    setRefunds(await api.refunds(selected.id));
  };
  const requestRefund = async id => {
    setRefunding(id); setError(null); setNotice('');
    try {
      setSelected(await api.requestRefund(id, refundDraft));
      setRefundDraft({amount:'', reason:''});
      setNotice('Refund request submitted. Status remains backend-authoritative; refresh for gateway/webhook updates.');
      setRefunds(await api.refunds(id));
      setData(await api.list());
    } catch (value) { setError(value); }
    finally { setRefunding(null); }
  };
  return <><div className="page-header"><div><div className="eyebrow">FINANCE</div><h1>Payments</h1><p>Review invoice-linked payment state, Razorpay identifiers, refunds and reconciliation issues.</p></div><button className="secondary-btn" disabled={loading} onClick={() => setRevision(value => value + 1)}><RefreshCw size={15}/>Refresh</button></div>
    <ErrorState error={error}/>{notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Loading payments...</p> : <div className="dashboard-grid">
      <section className="panel"><div className="panel-heading"><div><h2>Payment records</h2><span>{data?.totalElements ?? 0} backend records</span></div></div>
        <div className="payments-table">
          <div className="table-head"><span>ID</span><span>Invoice</span><span>Amount</span><span>Status</span><span>Gateway</span><span></span></div>
          {(data?.items ?? []).map(row => <button key={row.id} className="table-row" style={{width:'100%',textAlign:'left'}} onClick={() => { setSelected(row); setRefundDraft({amount:'', reason:''}); }}>
            <span className="strong">#{row.id}</span><span>{row.invoiceId ? `Invoice ${row.invoiceId}` : 'No invoice'}</span><span>{money(row)}</span><Badge value={row.status}/><span>{row.gatewayStatus || row.razorpayOrderId || 'Internal'}</span><span>Open</span>
          </button>)}
          {data?.items?.length ? null : <div className="empty-state"><b>No payments</b><span>No payment records were returned by the backend.</span></div>}
        </div>
      </section>
      <PaymentDetail payment={selected} refunds={refunds} refunding={refunding} refundDraft={refundDraft} setRefundDraft={setRefundDraft} onRefund={requestRefund} onReload={reloadSelected}/>
    </div>}
    <section className="panel payments-panel"><div className="panel-heading"><div><h2>Reconciliation</h2><span>Gateway/local mismatch visibility</span></div></div>
      {(issues ?? []).length ? <div className="payments-table">{issues.map((row, index) => <div className="table-row" key={`${row.type}-${index}`}><span className="strong">{row.type}</span><span>{row.paymentId ? `Payment ${row.paymentId}` : 'No payment'}</span><span>{row.invoiceId ? `Invoice ${row.invoiceId}` : 'No invoice'}</span><span>{row.detail}</span><span></span><span></span></div>)}</div> : <div className="empty-state"><b>No reconciliation issues</b><span>The backend did not report payment mismatches.</span></div>}
    </section>
  </>;
}

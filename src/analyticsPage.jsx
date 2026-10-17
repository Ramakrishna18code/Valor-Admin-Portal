import React, {useEffect,useState} from 'react';
import {BarChart,DonutChart,DashboardAnalytics,HealthMeter,groupCounts} from './analytics.jsx';
import {summaryFields} from './api/services.js';

const tabs=[['workload','Workload & availability'],['assets','Assets & AMC'],['requests','Service requests'],['applications','Applications'],['visits','Visits & lift health'],['payments','Payments']];
export function paymentAmounts(rows,currency) {
 const amounts=new Map();
 for(const row of rows){if(row.currency!==currency||!Number.isFinite(row.amount)||row.amount<0)continue;amounts.set(row.status,(amounts.get(row.status)||0)+row.amount);}
 return [...amounts].map(([label,value])=>({label:label.replaceAll('_',' ').toLowerCase(),value:Math.round(value*100)/100}));
}
export function AnalyticsPage({dashboard,assets,requests,applications,visits,payments,onNavigate}) {
 const [tab,setTab]=useState('workload'),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(null),[revision,setRevision]=useState(0);
 const [currency,setCurrency]=useState('INR'),[month,setMonth]=useState(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit'}).format(new Date()).slice(0,7));
 useEffect(()=>{
  let current=true;setLoading(true);setData(null);setError(null);
  const load=async()=>{
   if(tab==='workload')return dashboard.summary();
   if(tab==='assets'){const [buildings,lifts,amc]=await Promise.all([assets.buildings.list(),assets.lifts.list(),assets.amc.list()]);return {buildings,lifts,amc};}
   if(tab==='requests')return requests.list({page:0,size:100});
   if(tab==='applications')return applications.list();
   if(tab==='visits'){const [visitPage,lifts]=await Promise.all([visits.list({page:0,size:100}),assets.lifts.list()]);return {visitPage,lifts};}
   return payments.list(0,100);
  };
  load().then(value=>{if(current)setData(value);}).catch(value=>{if(current)setError(value);}).finally(()=>{if(current)setLoading(false);});
  return()=>{current=false;};
 },[tab,revision,dashboard,assets,requests,applications,visits,payments]);
 const currencies=[...new Set((data?.items||[]).map(row=>row.currency).filter(Boolean))];
 const selectedCurrency=currencies.includes(currency)?currency:currencies[0]||'INR';
 const scope=page=>`Showing ${page.items.length} loaded records${Number.isFinite(page.totalElements)?` of ${page.totalElements}`:''}. Charts describe these records only.`;
 return <div className="analytics-page"><div className="page-header"><div><div className="eyebrow">ANALYTICS</div><h1>Charts & insights</h1><p>Explore operational performance and payment activity by section.</p></div><button className="secondary-btn" disabled={loading} onClick={()=>setRevision(v=>v+1)}>Refresh charts</button></div>
 <nav className="analytics-section-tabs" aria-label="Analytics sections">{tabs.map(([key,label])=><button className={tab===key?'active':''} aria-current={tab===key?'page':undefined} key={key} onClick={()=>{if(tab!==key){setData(null);setLoading(true);setError(null);setTab(key);}}}>{label}</button>)}</nav>
 {loading?<section className="panel empty-state" role="status">Loading analytics...</section>:error?<section className="panel empty-state" role="alert"><b>Unable to load this section</b><p>{error.message}</p><button className="secondary-btn" onClick={()=>setRevision(v=>v+1)}>Retry</button></section>:data&&<>
 {tab==='workload'&&<DashboardAnalytics data={data} extended={summaryFields.every(key=>Number.isSafeInteger(data[key]))} onSelect={onNavigate} workloadOnly/>}
 {tab==='assets'&&<div className="analytics-grid"><BarChart title="Building statuses" description="All loaded buildings." items={groupCounts(data.buildings,'status')}/><BarChart title="Lift statuses" description="All loaded lifts." items={groupCounts(data.lifts,'currentStatus')}/><DonutChart title="AMC plan mix" description="All loaded contracts grouped by plan." items={groupCounts(data.amc,'plan')}/><BarChart title="Contract statuses" description="All loaded AMC contracts." items={groupCounts(data.amc,'status')}/></div>}
 {tab==='requests'&&<><p className="analytics-scope">{scope(data)}</p><div className="analytics-grid"><BarChart title="Request statuses" items={groupCounts(data.items,'status')}/><DonutChart title="Request priorities" items={groupCounts(data.items,'priority')}/></div></>}
 {tab==='applications'&&<div className="analytics-grid"><BarChart title="Application progress" description="All returned applications by review status." items={groupCounts(data,'status')}/><DonutChart title="Specializations" description="Applicant counts by specialization." items={groupCounts(data,'specialization')}/></div>}
 {tab==='visits'&&<><label className="analytics-filter">Visit month<input type="month" value={month} onChange={e=>setMonth(e.target.value)}/></label><p className="analytics-scope">{scope(data.visitPage)} Monthly counts include cancelled visits.</p><div className="analytics-grid"><BarChart title="Monthly visit activity" description={month?`Visits in ${month}, grouped by week.`:'Select a month.'} items={month?[0,1,2,3,4].filter(week=>week*7<new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate()).map(week=>({label:`Week ${week+1}`,value:data.visitPage.items.filter(row=>row.scheduledDate?.startsWith(month)&&Math.floor((Number(row.scheduledDate.slice(8,10))-1)/7)===week).length})):[]}/><BarChart title="Visit statuses" description="Loaded visits in the selected month." items={groupCounts(data.visitPage.items.filter(row=>month&&row.scheduledDate?.startsWith(month)),'status')}/></div><section className="panel analytics-card"><h3>Lift health</h3><p>Health scores reported for each lift.</p><div className="analytics-health-list">{data.lifts.length?data.lifts.map(lift=><div key={lift.id}><strong>{lift.name||`Lift #${lift.id}`}</strong><HealthMeter value={lift.healthScore}/></div>):<p>No lifts available.</p>}</div></section></>}
 {tab==='payments'&&<><p className="analytics-scope">{scope(data)}</p><div className="analytics-grid"><BarChart title="Payment statuses" description="Number of payments in each status." items={groupCounts(data.items,'status')}/><DonutChart title="Payment purpose" description="Payment counts by purpose." items={groupCounts(data.items,'purpose')}/></div><label className="analytics-filter">Amount currency<select value={selectedCurrency} onChange={e=>setCurrency(e.target.value)}>{(currencies.length?currencies:['INR']).map(value=><option key={value}>{value}</option>)}</select></label><div className="analytics-grid"><BarChart title={`Payment amounts · ${selectedCurrency}`} description="Original payment amounts grouped by current status; these are not net revenue or refund totals." items={paymentAmounts(data.items,selectedCurrency)} formatValue={value=>`${selectedCurrency} ${value.toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`}/><DonutChart title="Payment status mix" description="Share of loaded payment records in each status." items={groupCounts(data.items,'status')}/></div></>}
 </> }</div>;
}

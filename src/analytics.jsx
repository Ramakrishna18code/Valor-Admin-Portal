import React from 'react';
import './analytics.css';

const colors=['#2563eb','#15916b','#d97706','#7c3aed','#dc4454','#64748b'];
const count=value=>Number.isFinite(Number(value))&&Number(value)>=0?Number(value):0;
export function groupCounts(rows,key) {
 const counts=new Map();
 for(const row of rows||[]){const label=String(typeof key==='function'?key(row):row[key]||'Unknown');counts.set(label,(counts.get(label)||0)+1);}
 return [...counts].map(([label,value])=>({label:label.replaceAll('_',' ').toLowerCase(),value}));
}
export function BarChart({title,description,items,onSelect,formatValue=value=>value.toLocaleString()}) {
 const max=Math.max(1,...items.map(item=>count(item.value)));
 return <section className="panel analytics-card"><header><h3>{title}</h3><p>{description}</p></header>{items.some(item=>count(item.value)>0)?<ul className="analytics-bars">{items.map((item,index)=>{
  const content=<><span className="analytics-bar-heading"><span>{item.label}</span><strong>{formatValue(count(item.value))}</strong></span><span className="analytics-track" aria-hidden="true"><span style={{width:`${count(item.value)/max*100}%`,background:item.color||colors[index%colors.length]}}/></span></>;
  return <li key={item.label}>{onSelect&&item.target?<button type="button" className="analytics-bar-button" onClick={()=>onSelect(item.target)} aria-label={`Open ${item.label}: ${item.value}`}>{content}</button>:<div>{content}</div>}</li>;
 })}</ul>:<p className="analytics-empty">No records to chart yet.</p>}</section>;
}
export function DonutChart({title,description,items}) {
 const total=items.reduce((sum,item)=>sum+count(item.value),0);let offset=0;
 const slices=items.map((item,index)=>{const start=offset;offset+=total?count(item.value)/total*100:0;return `${item.color||colors[index%colors.length]} ${start}% ${offset}%`;});
 return <section className="panel analytics-card"><header><h3>{title}</h3><p>{description}</p></header>{total?<div className="analytics-donut-body"><div className="analytics-donut" style={{background:`conic-gradient(${slices.join(',')})`}} role="img" aria-label={items.map(item=>`${item.label}: ${item.value}`).join(', ')}><div><strong>{total.toLocaleString()}</strong><span>Total</span></div></div><ul className="analytics-legend">{items.map((item,index)=><li key={item.label}><i style={{background:item.color||colors[index%colors.length]}}/><span>{item.label}</span><strong>{item.value} <small>({Math.round(count(item.value)/total*100)}%)</small></strong></li>)}</ul></div>:<p className="analytics-empty">No records to chart yet.</p>}</section>;
}
export function HealthMeter({value}) {
 if(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))return <span>Not provided</span>;
 const score=Math.min(100,Math.max(0,Number(value)));
 return <div className="health-meter"><strong>{score} / 100</strong><meter min="0" max="100" value={score} aria-label="Lift health score"/><span>Reported lift health</span></div>;
}
export function DashboardAnalytics({data,extended,onSelect,workloadOnly=false}) {
 return <div className="analytics-grid"><BarChart title="Service workload" description="Current counts. Emergency jobs may also appear in other groups." onSelect={onSelect} items={[
  {label:'Unassigned',value:data.unassignedRequests,color:'#d97706',target:{section:'service-requests',status:'PENDING'}},
  {label:'In progress',value:data.inProgressRequests,target:{section:'service-requests',preset:'in-progress'}},
  {label:'Open emergency',value:data.emergencyJobs,color:'#dc4454',target:{section:'service-requests',priority:'EMERGENCY'}},
 ]}/>{extended&&<><BarChart title="Technician availability" description="Current technician counts by availability." items={[
  {label:'Available',value:data.availableTechnicianCount,color:'#15916b'}, {label:'Busy',value:data.busyTechnicianCount,color:'#d97706'}, {label:'On leave',value:data.onLeaveTechnicianCount,color:'#7c3aed'}, {label:'Not available',value:data.notAvailableTechnicianCount,color:'#64748b'},
 ]}/>{!workloadOnly&&<><DonutChart title="AMC plan mix" description="Contracts reported under the three available plans." items={[
  {label:'Standard',value:data.standardAmcCount},{label:'Premium',value:data.premiumAmcCount},{label:'Comprehensive',value:data.comprehensiveAmcCount},
 ]}/><BarChart title="Customers & assets" description="Compare current portfolio counts." onSelect={onSelect} items={[
  {label:'Customers',value:data.customerCount,target:{section:'customers'}},{label:'Buildings',value:data.buildingCount,target:{section:'buildings'}},{label:'Lifts',value:data.liftCount,target:{section:'lifts'}},{label:'AMC contracts',value:data.amcCount,target:{section:'amc'}},
 ]}/></>}</>}</div>;
}

import React from 'react';
import { HealthMeter } from './analytics.jsx';
import { StatusChip } from './uiPatterns.jsx';

export const assetSections = {
  lifts: [
    {title:'Lift & building',keys:['buildingId','name','liftNumber','location','currentStatus']},
    {title:'Technical specifications',keys:['liftType','manufacturer','model','capacity','floorCount','doorType','serialNumber','machineRoom','qrCode','specifications']},
    {title:'Installation & warranty',keys:['installationDate','warrantyStatus','warrantyStartDate','warrantyEndDate']},
    {title:'Maintenance & coverage',keys:['lastMaintenanceDate','nextMaintenanceDate','healthScore','amcCoverage','asOfDate']},
  ],
  amc: [
    {title:'Contract & coverage',keys:['liftId','amcNumber','plan','status','covered','coverageDetails']},
    {title:'Coverage dates & renewal',keys:['startDate','endDate','renewalDate','renewalCount','lastReminderSentAt','asOfDate']},
  ],
};
const labels={id:'Record ID',buildingId:'Building',liftId:'Lift',name:'Lift name',amcNumber:'Contract number',qrCode:'QR code',amcCoverage:'AMC coverage',isActive:'Active',asOfDate:'Coverage checked on',createdAt:'Created',updatedAt:'Last updated',manufacturer:'Brand'};
export const fieldLabel=key=>labels[key]||key.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,letter=>letter.toUpperCase());
export function readableDate(value) {
  if(!value)return 'Not provided';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return String(value);
  return date.toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',...(String(value).includes('T')?{hour:'2-digit',minute:'2-digit'}:{})});
}
export function AssetRecordDetail({kind,detail,lookups}) {
  const sections=[...assetSections[kind],{title:'Record information',keys:['id','isActive','createdAt','updatedAt'].filter(key=>key in detail)}];
  const valueFor=key=>{
    const value=detail[key];
    if(key==='healthScore')return <HealthMeter value={value}/>;
    if(value==null||value==='')return 'Not provided';
    if(['status','currentStatus','warrantyStatus','amcCoverage'].includes(key))return <StatusChip value={value}/>;
    if(/Date$|At$/.test(key))return <time dateTime={value}>{readableDate(value)}</time>;
    if(key==='buildingId')return lookups?.buildings?.find(row=>String(row.id)===String(value))?.buildingName||`Building #${value}`;
    if(key==='liftId')return lookups?.lifts?.find(row=>String(row.id)===String(value))?.name||`Lift #${value}`;
    return typeof value==='boolean'?(value?'Yes':'No'):String(value);
  };
  return <section className="asset-form panel asset-record-detail"><header className="record-profile"><div><div className="eyebrow">{kind==='lifts'?'LIFT PROFILE':'AMC CONTRACT'}</div><h2>{detail.name||detail.amcNumber||`Record #${detail.id}`}</h2><p>{kind==='lifts'?`Lift number: ${detail.liftNumber||'Not provided'}`:`Plan: ${detail.plan||'Not provided'}`}</p></div><StatusChip value={detail.currentStatus||detail.status}/></header><div className="record-section-grid">{sections.map(section=><section className="record-info-card" key={section.title}><h3>{section.title}</h3><dl>{section.keys.map(key=><div className={['specifications','coverageDetails'].includes(key)?'record-wide':undefined} key={key}><dt>{fieldLabel(key)}</dt><dd>{valueFor(key)}</dd></div>)}</dl></section>)}</div></section>;
}

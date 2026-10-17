import React, {useEffect,useState} from 'react';
import {fieldsFor,confirmedDeactivation,validId,amcPlans,fallbackLiftCatalog} from './api/assets.js';
import {isAdmin} from './api/services.js';
import { DataTable, PagerButtons, StatusChip, useClientPager } from './uiPatterns.jsx';
import './assetModules.css';

import { AssetRecordDetail, assetSections } from './recordDetails.jsx';
export const moduleTitles={buildings:'Buildings',lifts:'Lifts',amc:'AMC Contracts'};
const columns={buildings:[['id','ID'],['buildingName','Building'],['customerProfileId','Customer profile ID'],['city','City'],['status','Status'],['isActive','Active'],['activeLiftCount','Active lifts']],lifts:[['id','ID'],['name','Lift'],['buildingId','Building'],['currentStatus','Status'],['isActive','Active'],['healthScore','Health'],['amcCoverage','AMC coverage'],['nextMaintenanceDate','Next maintenance']],amc:[['id','ID'],['amcNumber','Contract'],['liftId','Lift ID'],['plan','Plan'],['status','Status'],['covered','Covered'],['asOfDate','As of'],['startDate','Start'],['endDate','End'],['renewalDate','Renewal']]};
export const buildingMapUrl=building=>{
 const latitude=Number(building?.latitude), longitude=Number(building?.longitude);
 if(building?.latitude!=null&&building?.longitude!=null&&String(building.latitude).trim()!==''&&String(building.longitude).trim()!==''&&Number.isFinite(latitude)&&latitude>=-90&&latitude<=90&&Number.isFinite(longitude)&&longitude>=-180&&longitude<=180) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;
 const address=[building?.address,building?.city,building?.state,building?.pincode].filter(value=>String(value||'').trim()).join(', ');
 return address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
};
const openBuildingMap=building=>{const url=buildingMapUrl(building);if(url)window.open(url,'_blank','noopener,noreferrer');};
export const displayValue=value=>value===null||value===undefined||value===''?'Not provided':typeof value==='boolean'?(value?'Yes':'No'):String(value);
const buildingSections=[
 {title:'Building information',keys:['customerProfileId','buildingName','buildingType','buildingPreference','status']},
 {title:'Address & location',keys:['address','state','city','pincode','latitude','longitude']},
 {title:'Emergency contact',keys:['emergencyContactName','emergencyContactPhone']}
];
const buildingLabels={id:'Building ID',customerProfileId:'Customer ID',buildingName:'Building name',buildingType:'Building type',buildingPreference:'Building preference',address:'Street address',state:'State',city:'City',pincode:'PIN code',latitude:'Latitude',longitude:'Longitude',emergencyContactName:'Contact name',emergencyContactPhone:'Contact phone',status:'Status',isActive:'Active',activeLiftCount:'Active lifts',createdAt:'Created',updatedAt:'Last updated'};
function BuildingDetail({detail}) {
 const sections=[...buildingSections,{title:'Record information',keys:['id','isActive','activeLiftCount','createdAt','updatedAt']}];
 return <section className="asset-form panel building-detail"><header className="building-profile"><div><div className="eyebrow">BUILDING PROFILE</div><h2>{detail.buildingName||'Building details'}</h2><p>{[detail.city,detail.state].filter(Boolean).join(', ')||'Location not provided'}</p></div><StatusChip value={detail.status}/></header><div className="building-section-grid">{sections.map(section=><section className="building-info-card" key={section.title}><h3>{section.title}</h3><dl>{section.keys.map(key=>{const value=detail[key];const date=['createdAt','updatedAt'].includes(key)&&value?new Date(value):null;return <div key={key} className={key==='address'?'building-wide':undefined}><dt>{buildingLabels[key]}</dt><dd>{key==='status'?<StatusChip value={value}/>:date&&!Number.isNaN(date.getTime())?<time dateTime={value}>{date.toLocaleString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}</time>:displayValue(value)}</dd></div>;})}</dl></section>)}</div>{!buildingMapUrl(detail)&&<p className="field-help">Add an address or coordinates to view this building on a map.</p>}</section>;
}
export function ErrorState({error}){return error?<div className="asset-error" role="alert"><b>{error.status===403?'Access denied':error.status===400?'Check your input':'Request failed'}</b><p>{error.message}</p></div>:null;}
const today=()=>new Date().toISOString().slice(0,10);
const addMonths=(date,months=12)=>{if(!date)return '';const [year,month,day]=date.split('-').map(Number), value=new Date(Date.UTC(year,month-1,day));if(!year||!month||!day)return '';value.setUTCMonth(value.getUTCMonth()+months);return value.toISOString().slice(0,10);};
const customerLabel=row=>`${row.fullName || row.email || 'Customer'}${row.email ? ` - ${row.email}` : ''}`;
const buildingLabel=building=>`${building?.buildingName || `Building #${building?.id}`}${building?.city ? ` - ${building.city}` : ''}`;
const liftLabel=(lift,building,customer)=>`${lift.name || lift.liftNumber || `Lift #${lift.id}`} - ${building?.buildingName || `Building #${lift.buildingId}`} - ${customer?.fullName || customer?.email || 'Customer'}`;
export function AssetTable({kind,rows,onEdit,onDeactivate,onDetail,canWrite,busy,lookups}){
 const cols=columns[kind].map(([key,label])=>({key,label,render:row=>kind==='lifts'&&key==='buildingId'?buildingLabel(lookups?.buildings?.find(building=>building.id===row.buildingId)):['status','currentStatus','amcCoverage'].includes(key)?<StatusChip value={row[key]}/>:displayValue(row[key])}));
 return <DataTable rows={rows} columns={cols} empty="No records found." onRow={onDetail || (row=>onEdit(row))} />;
}
const stateCities={Telangana:['Hyderabad','Warangal','Nizamabad','Karimnagar','Khammam','Ramagundam','Mahbubnagar','Nalgonda','Adilabad','Suryapet'], 'Andhra Pradesh':['Visakhapatnam','Vijayawada','Guntur','Nellore','Kurnool','Rajahmundry','Tirupati','Kakinada','Anantapur','Kadapa']};
const pincodeMap={'500001':['Telangana','Hyderabad'],'506002':['Telangana','Warangal'],'503001':['Telangana','Nizamabad'],'520001':['Andhra Pradesh','Vijayawada'],'530001':['Andhra Pradesh','Visakhapatnam'],'522001':['Andhra Pradesh','Guntur'],'524001':['Andhra Pradesh','Nellore']};
const buildingTypes=['Apartment','Commercial','Hospital','Hotel','Mall','Office','Residential Complex','Other'];
const buildingStatuses=['ACTIVE','INACTIVE','MAINTENANCE'];
const warrantyStatuses=['ACTIVE','INACTIVE','NO_WARRANTY'];
const dropdownValue=(value,options)=>options.includes(value)?value:(value?'Other':'');
function CatalogSelect({label,field,value,options,placeholder,customPlaceholder,onChange}) {
 const custom = value !== undefined && (!value || !options.includes(value));
 return <><select value={dropdownValue(value,options)} onChange={e=>onChange(e.target.value==='Other'?'':e.target.value)}><option value="">{placeholder}</option>{options.map(option=><option key={option}>{option}</option>)}<option value="Other">Custom</option></select>{custom?<input aria-label={label+' custom value'} placeholder={customPlaceholder} maxLength={field.maxLength} value={value??''} onChange={e=>onChange(e.target.value)}/>:null}</>;
}
export function RecordForm({kind,mode='create',original,onSubmit,onClose,busy,error,lookups}){
 const [draft,setDraft]=useState(()=>kind==='staff'?{role:'ADMIN'}:mode==='renew'?{plan:original.plan,coverageDetails:original.coverageDetails,startDate:today(),endDate:addMonths(today()),renewalDate:original.renewalDate}:kind==='amc'?{plan:amcPlans[0],startDate:today(),endDate:addMonths(today())}:kind==='buildings'?{status:'ACTIVE',...(original||{})}:original||{});
 const customers=lookups?.customers?.items??[], buildings=lookups?.buildings??[], lifts=lookups?.lifts??[];
 const liftCatalog=lookups?.liftCatalog??fallbackLiftCatalog;
 const brandOptions=(liftCatalog.brands??[]).map(row=>row.brand);
 const selectedBrand=(liftCatalog.brands??[]).find(row=>row.brand===draft.manufacturer);
 const modelOptions=selectedBrand?.models?.length?selectedBrand.models:[...new Set((liftCatalog.brands??[]).flatMap(row=>row.models??[]))];
 const selectedBuilding=buildings.find(building=>String(building.id)===String(draft.buildingId));
 const updateDraft=(key,value)=>setDraft(d=>{
  if(key==='startDate'&&kind==='amc')return {...d,startDate:value,endDate:addMonths(value)};
  if(kind==='buildings'&&key==='state')return {...d,state:value,city:''};
  if(kind==='buildings'&&key==='pincode'&&pincodeMap[value]){const [state,city]=pincodeMap[value];return {...d,pincode:value,state,city};}
  if(kind==='lifts'&&key==='customerProfileId')return {...d,customerProfileId:value,buildingId:''};
  if(kind==='lifts'&&key==='manufacturer')return {...d,manufacturer:value,model:''};
  if(kind==='lifts'&&key==='warrantyStatus'&&value==='NO_WARRANTY')return {...d,warrantyStatus:value,warrantyStartDate:'',warrantyEndDate:''};
  return {...d,[key]:value};
 });
 const submit=async event=>{event.preventDefault();if(busy)return;const snapshot={...draft};if(kind==='staff')setDraft(current=>({...current,password:''}));await onSubmit(snapshot);};
 const activeCustomers=customers.filter(customer=>customer.active&&customer.status==='ACTIVE');
 const activeBuildings=buildings.filter(building=>building.isActive);
 const buildingsForCustomer=activeBuildings.filter(building=>String(building.customerProfileId)===String(draft.customerProfileId || selectedBuilding?.customerProfileId));
 const availableLifts=lifts.filter(lift=>lift.isActive && (kind!=='amc'||activeBuildings.some(building=>building.id===lift.buildingId)));
 const formFields=fieldsFor(kind,mode,draft.role);
 const sectionDefinitions=kind==='buildings'?buildingSections:assetSections[kind];
 const formSections=sectionDefinitions?sectionDefinitions.map(section=>({...section,fields:section.keys.map(key=>formFields.find(f=>f.key===key)).filter(Boolean)})).filter(section=>section.fields.length):[{title:null,fields:formFields}];
 return <form className={'asset-form panel'+(sectionDefinitions?' building-editor structured-editor':'')} aria-busy={busy} onSubmit={submit}><h2>{mode==='renew'?'Renew contract':mode==='edit'?(kind==='lifts'?'Edit lift':kind==='buildings'?'Edit building':'Edit record'):'Create '+(kind==='staff'?'staff account':kind==='lifts'?'lift':kind==='amc'?'AMC contract':'building')}</h2>
 {kind==='buildings'&&<p>{mode==='edit'?'Update the building details below. The assigned customer cannot be changed.':'Select a customer, then enter the building, location and emergency contact details.'} Fields marked * are required.</p>}
 {kind==='lifts'&&<p>Select a customer, then choose one of that customer's active buildings. Building ownership cannot be changed after creation.</p>}
 {kind==='amc'&&<p>{mode==='renew'?`New coverage must start after ${original.endDate}.`:'Select a lift and AMC plan. The backend generates the contract number.'} Contract status and coverage are supplied by the backend.</p>}
 {kind==='staff'&&<p>ADMIN has no profile. For TECHNICIAN, supply employee ID, area and specialization where available; the backend permits omission and defaults availability to AVAILABLE. Password is used only for submission and cleared afterward.</p>}
 {lookups?.loading&&['buildings','lifts','amc'].includes(kind)&&<p role="status">Loading lookup options...</p>}
 {lookups?.error&&['buildings','lifts','amc'].includes(kind)&&<ErrorState error={lookups.error}/>}
 {formSections.map(section=><fieldset className="asset-form-section" key={section.title||kind} disabled={busy}>{section.title&&<legend>{section.title}</legend>}<div className="asset-fields">{section.fields.map(f=>{
  if(kind==='lifts'&&draft.warrantyStatus==='NO_WARRANTY'&&['warrantyStartDate','warrantyEndDate'].includes(f.key))return null;
  return <label className={['address','specifications','coverageDetails'].includes(f.key)?'building-wide':undefined} key={f.key}>{kind==='buildings'?(buildingLabels[f.key]||f.label):f.label}{f.required?' *':''}
   {kind==='buildings'&&f.key==='customerProfileId'?<select required disabled={mode==='edit'||lookups?.loading} value={draft.customerProfileId??''} onChange={e=>updateDraft('customerProfileId',e.target.value)}><option value="">Select customer</option>{activeCustomers.map(customer=><option key={customer.customerProfileId} value={customer.customerProfileId}>{customer.fullName || customer.email || `Customer #${customer.customerProfileId}`}</option>)}</select>:
   kind==='lifts'&&f.key==='buildingId'?<><select required disabled={mode==='edit'||lookups?.loading} value={draft.customerProfileId || selectedBuilding?.customerProfileId || ''} onChange={e=>updateDraft('customerProfileId',e.target.value)}><option value="">Select customer</option>{activeCustomers.map(customer=><option key={customer.customerProfileId} value={customer.customerProfileId}>{customerLabel(customer)}</option>)}</select><select required disabled={mode==='edit'||lookups?.loading||!(draft.customerProfileId||selectedBuilding?.customerProfileId)} value={draft.buildingId??''} onChange={e=>updateDraft('buildingId',e.target.value)}><option value="">{draft.customerProfileId||selectedBuilding?.customerProfileId?'Select building':'Select customer first'}</option>{buildingsForCustomer.map(building=><option key={building.id} value={building.id}>{building.buildingName}{building.city?` - ${building.city}`:''}</option>)}</select></>:
   kind==='buildings'&&f.key==='buildingType'?<><select value={buildingTypes.includes(draft.buildingType)?draft.buildingType:(draft.buildingType?'Other':'')} onChange={e=>updateDraft('buildingType',e.target.value==='Other'?'':e.target.value)}><option value="">Select type</option>{buildingTypes.map(value=><option key={value}>{value}</option>)}</select>{(!buildingTypes.includes(draft.buildingType)&&draft.buildingType!==undefined)||draft.buildingType===''?<input placeholder="Custom building type" value={draft.buildingType??''} onChange={e=>updateDraft('buildingType',e.target.value)}/>:null}</>:
   kind==='buildings'&&['state','city'].includes(f.key)?<><input list={'building-'+f.key+'-options'} maxLength={f.maxLength} value={draft[f.key]??''} onChange={e=>updateDraft(f.key,e.target.value)}/><datalist id={'building-'+f.key+'-options'}>{(f.key==='state'?Object.keys(stateCities):stateCities[draft.state]||[]).map(value=><option key={value} value={value}/>)}</datalist></>:
   kind==='buildings'&&f.key==='status'?<select value={draft.status??'ACTIVE'} onChange={e=>updateDraft('status',e.target.value)}>{buildingStatuses.map(value=><option key={value}>{value}</option>)}</select>:
   kind==='amc'&&f.key==='liftId'?<select required disabled={mode==='renew'||lookups?.loading} value={draft.liftId??''} onChange={e=>updateDraft('liftId',e.target.value)}><option value="">Select lift</option>{availableLifts.map(lift=>{const building=buildings.find(row=>row.id===lift.buildingId), customer=customers.find(row=>row.customerProfileId===building?.customerProfileId);return <option key={lift.id} value={lift.id}>{liftLabel(lift,building,customer)}</option>;})}</select>:
   kind==='lifts'&&f.key==='liftType'?<CatalogSelect label={f.label} field={f} value={draft.liftType} options={liftCatalog.liftTypes??[]} placeholder="Select lift type" customPlaceholder="Custom lift type" onChange={value=>updateDraft('liftType',value)}/>:
   kind==='lifts'&&f.key==='manufacturer'?<CatalogSelect label={f.label} field={f} value={draft.manufacturer} options={brandOptions} placeholder="Select brand" customPlaceholder="Custom brand" onChange={value=>updateDraft('manufacturer',value)}/>:
   kind==='lifts'&&f.key==='model'?<CatalogSelect label={f.label} field={f} value={draft.model} options={modelOptions} placeholder={draft.manufacturer?'Select model':'Select brand first or custom'} customPlaceholder="Custom model" onChange={value=>updateDraft('model',value)}/>:
   f.type==='select'?<select required={f.required} value={draft[f.key]??''} onChange={e=>f.key==='role'?setDraft(d=>({email:d.email,password:d.password,role:e.target.value})):updateDraft(f.key,e.target.value)}><option value="">{f.key==='availabilityStatus'?'Default: AVAILABLE':'Select'}</option>{f.options.map(value=><option key={value}>{value}</option>)}</select>:
   (f.type==='textarea'||kind==='buildings'&&f.key==='address')?<textarea required={f.required} maxLength={f.maxLength} value={draft[f.key]??''} onChange={e=>updateDraft(f.key,e.target.value)}/>:
   <><input type={f.type} autoComplete={f.type==='password'?'new-password':'off'} required={f.required} maxLength={f.maxLength} min={f.min} max={f.max} step={f.type==='number'?(f.step??1):undefined} disabled={mode==='edit'&&['customerProfileId','buildingId'].includes(f.key)} value={draft[f.key]??''} onChange={e=>updateDraft(f.key,e.target.value)}/>{kind==='lifts'&&f.key==='serialNumber'?<small className="field-help">You can usually find the serial number on the lift sticker.</small>:null}{kind==='lifts'&&f.key==='location'?<small className="field-help">Where the lift is placed inside the building, for example Tower A lobby, Basement, or Block 2.</small>:null}{kind==='lifts'&&f.key==='qrCode'?<small className="field-help">Optional QR code value if already assigned.</small>:null}</>}</label>;
 })}</div></fieldset>)}
 {kind==='amc'&&mode==='create'&&<p role="status">Contract number will be generated by the backend after save.</p>}
 <ErrorState error={error}/><div className={sectionDefinitions?'page-actions building-save-actions':'page-actions'}><button type="button" className="secondary-btn" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-btn" disabled={busy}>{busy?'Saving...':kind==='buildings'?'Save building':kind==='lifts'?'Save lift':kind==='amc'?(mode==='renew'?'Renew contract':'Save contract'):'Save'}</button></div></form>;
}
export function AssetPage({kind,api,user,directories,assets}){
 const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(null),[editor,setEditor]=useState(null),[detail,setDetail]=useState(null),[busy,setBusy]=useState(false),[revision,setRevision]=useState(0),[notice,setNotice]=useState(''),[q,setQ]=useState('');
 const [lookups,setLookups]=useState({loading:false,error:null,customers:{items:[]},buildings:[],lifts:[],liftCatalog:fallbackLiftCatalog});
 useEffect(()=>{let current=true;setRows([]);setLoading(true);setError(null);api.list().then(data=>{if(current)setRows(data);}).catch(e=>{if(current)setError(e);}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;};},[api,revision]);
 useEffect(()=>{if(!['buildings','lifts','amc'].includes(kind)||!directories)return;let current=true;setLookups(value=>({...value,loading:true,error:null}));Promise.all([
  directories.directory('customers',{page:0,size:100,active:true}),
  ['lifts','amc'].includes(kind)?assets.buildings.list():Promise.resolve([]),
  kind==='amc'?assets.lifts.list():Promise.resolve([]),
  kind==='lifts'?assets.liftCatalog():Promise.resolve(fallbackLiftCatalog)
 ]).then(([customers,buildings,lifts,liftCatalog])=>{if(current)setLookups({loading:false,error:null,customers,buildings,lifts,liftCatalog});}).catch(error=>{if(current)setLookups(value=>({...value,loading:false,error}));});return()=>{current=false;};},[kind,directories,assets,revision]);
 const reload=()=>{setRows([]);setRevision(v=>v+1);};
 const save=async draft=>{setBusy(true);setError(null);setNotice('');try{const saved=editor.mode==='create'?await api.create(draft):editor.mode==='renew'?await api.renew(editor.original,draft):await api.update(editor.original,draft);setEditor(null);setDetail(saved);setNotice(kind==='amc'&&editor.mode==='create'?`Contract ${saved.amcNumber} created.`:kind==='buildings'?'Building saved successfully.':kind==='lifts'?'Lift saved successfully.':'Contract renewed successfully.');reload();}catch(e){setRows([]);setError(e);}finally{setBusy(false);}};
 const deactivate=async row=>{setBusy(true);setError(null);setNotice('');try{if(await confirmedDeactivation(api,row.id,text=>window.confirm(text))){setNotice('Deactivated. The record is retained.');reload();}}catch(e){setRows([]);setError(e);}finally{setBusy(false);}};
 const filtered=rows.filter(row=>JSON.stringify(row).toLowerCase().includes(q.toLowerCase()));
 const pager=useClientPager(filtered,10);
 if(!isAdmin(user))return <p role="alert">Access denied. Administrator role required.</p>;
 if(detail)return <><div className="page-header"><div><div className="eyebrow">ASSETS</div><h1>{kind==='buildings'?'Building details':kind==='lifts'?'Lift details':'AMC contract details'}</h1></div><div className="page-actions"><button className="secondary-btn" onClick={()=>setDetail(null)}>Back</button>{kind==='buildings'&&buildingMapUrl(detail)&&<button className="secondary-btn" onClick={()=>openBuildingMap(detail)}>Open in Maps</button>}{kind!=='amc'&&<button className="primary-btn" disabled={busy} onClick={()=>{setEditor({mode:'edit',original:detail});setDetail(null);}}>Edit</button>}{kind==='amc'&&<button className="primary-btn" onClick={()=>{setEditor({mode:'renew',original:detail});setDetail(null);}}>Renew Contract</button>}</div></div>{notice&&<p className="asset-save-notice" role="status">{notice}</p>}{kind==='buildings'?<BuildingDetail detail={detail}/>:<AssetRecordDetail kind={kind} detail={detail} lookups={lookups}/>}</>;
 return <><div className="page-header"><div><div className="eyebrow">ASSETS</div><h1>{moduleTitles[kind]}</h1><p>Canonical customer assets and contracts</p></div><div className="page-actions"><button className="secondary-btn" disabled={loading||busy||!!editor} onClick={reload}>Refresh</button><button className="primary-btn" disabled={busy||!!editor} onClick={()=>{setError(null);setEditor({mode:'create'});}}>Create</button></div></div>{notice&&<p role="status">{notice}</p>}
 {editor?<RecordForm key={editor.mode+String(editor.original?.id)} kind={kind} {...editor} onSubmit={save} onClose={()=>{setEditor(null);reload();}} busy={busy} error={error} lookups={lookups}/>:<section className="panel asset-form"><div className="table-controls"><label>Search<input value={q} onChange={e=>pager.setPage(0)||setQ(e.target.value)} placeholder={`Search ${moduleTitles[kind].toLowerCase()}`}/></label></div><ErrorState error={error}/>{loading?<div className="empty-state" role="status">Loading...</div>:error?<div className="empty-state"><button className="secondary-btn" onClick={reload}>Retry</button></div>:filtered.length===0?<div className="empty-state">No records found.</div>:<><AssetTable kind={kind} rows={pager.items} canWrite={isAdmin(user)} busy={busy} lookups={lookups} onDetail={setDetail} onEdit={row=>setEditor({mode:kind==='amc'?'renew':'edit',original:row})} onDeactivate={deactivate}/><PagerButtons page={pager.page} totalPages={pager.totalPages} totalItems={pager.totalItems} onPage={pager.setPage}/></>}</section>}</>;
}
export function StaffPage({api,user}){
 const [creating,setCreating]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(null),[result,setResult]=useState(null),[target,setTarget]=useState('');
 if(user?.role!=='SUPER_ADMIN')return <section className="panel empty-state" role="alert">Staff provisioning requires SUPER_ADMIN.</section>;
 const save=async draft=>{setBusy(true);setResult(null);setError(null);try{const data=await api.create(draft);setResult(data);setCreating(false);}catch(e){setError(e);}finally{setBusy(false);}};
 const deactivate=async event=>{event.preventDefault();if(!validId(target))return; if(!window.confirm('Deactivate staff user #'+target+'? The account/profile and related records are retained.'))return;setBusy(true);setResult(null);setError(null);try{setResult(await api.deactivate(target));}catch(e){setError(e);}finally{setBusy(false);}};
 return <><div className="page-header"><div><div className="eyebrow">ADMINISTRATION</div><h1>Staff provisioning</h1><p>Create ADMIN or TECHNICIAN accounts; deactivate a known staff user ID.</p></div><button className="primary-btn" disabled={creating||busy} onClick={()=>{setError(null);setResult(null);setCreating(true);}}>Create staff</button></div>
 <section className="panel empty-state"><b>Staff directory unavailable</b><p>The backend has no staff list, search or detail GET endpoint.</p><button className="secondary-btn" disabled>List / search staff unavailable</button></section>
 {creating?<RecordForm kind="staff" onSubmit={save} onClose={()=>setCreating(false)} busy={busy} error={error}/>:<><form className="asset-form panel" onSubmit={deactivate}><label>Known staff user ID<input type="number" min="1" step="1" max={Number.MAX_SAFE_INTEGER} required value={target} onChange={e=>setTarget(e.target.value)}/></label><button className="secondary-btn" disabled={busy}>Deactivate staff</button><ErrorState error={error}/></form>{result&&<section className="panel asset-form" role="status"><h2>Backend result</h2><dl>{Object.entries(result).map(([key,value])=><React.Fragment key={key}><dt>{key}</dt><dd>{displayValue(value)}</dd></React.Fragment>)}</dl></section>}</>}
 </>;
}

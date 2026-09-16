import {ApiError} from './client.js';
import {validId} from './assets.js';
export const priorities=['LOW','MEDIUM','HIGH','EMERGENCY'];
export const serviceTypes=['ROUTINE_MAINTENANCE','BREAKDOWN','EMERGENCY','INSPECTION','INSTALLATION','MODERNIZATION'];
// Backend transition graph: UI guidance only, never changes a local request status.
const graph={PENDING:['CANCELLED'],ASSIGNED:['ACCEPTED','CANCELLED'],ACCEPTED:['ON_THE_WAY','CANCELLED'],ON_THE_WAY:['REACHED_SITE','CANCELLED'],REACHED_SITE:['DIAGNOSIS','CANCELLED'],DIAGNOSIS:['REPAIR_IN_PROGRESS','WAITING_FOR_PARTS','CANCELLED'],REPAIR_IN_PROGRESS:['WAITING_FOR_PARTS','TESTING','CANCELLED'],WAITING_FOR_PARTS:['REPAIR_IN_PROGRESS','CANCELLED'],TESTING:['COMPLETED','REPAIR_IN_PROGRESS','CANCELLED'],COMPLETED:[],CANCELLED:[]};
export const statuses=Object.keys(graph);
const fail=message=>{throw new ApiError(400,message);};
const id=value=>validId(value)?Number(value):fail('Select a valid record.');
const pick=(value,keys)=>Object.fromEntries(keys.split(' ').map(k=>[k,value[k]??null]));
const record=(value,key='id')=>{if(!value||!validId(value[key]))throw new ApiError(502,'Invalid workflow response.');return value;};
export function pageQuery({page=0,size=20,q,active,status,priority}={}){
 if(!Number.isInteger(page)||page<0||!Number.isInteger(size)||size<1||size>100||page*size>2147483647)fail('Invalid page.');
 const params=new URLSearchParams({page:String(page),size:String(size)});
 if(q?.trim()){if(q.trim().length>254)fail('Search is too long.');params.set('q',q.trim());}
 if(active!==undefined){if(typeof active!=='boolean')fail('Invalid active filter.');params.set('active',String(active));}
 for(const [key,value,allowed] of [['status',status,statuses],['priority',priority,priorities]])if(value){if(!allowed.includes(value))fail('Invalid '+key+'.');params.set(key,value);}
 return '?'+params;
}
export function pageView(data,map){
 if(!data||!Array.isArray(data.items)||!['page','size','totalElements','totalPages'].every(k=>Number.isSafeInteger(data[k])&&data[k]>=0)||data.size<1)throw new ApiError(502,'Invalid page response.');
 return {...pick(data,'page size totalElements totalPages'),items:data.items.map(map)};
}
export const requestView=value=>pick(record(value),'id serviceId customerProfileId liftId title description issueCategory priority status serviceType customerRemarks technicianRemarks serviceRequestedAt preferredVisitDate preferredTimeSlot internalAdminNotes completedAt estimatedCompletionMinutes createdAt updatedAt');
export function detailView(value){
 if(!value||!(value.history==null||Array.isArray(value.history)))throw new ApiError(502,'Invalid request detail.');
 return {request:requestView(value.request),activeAssignment:value.activeAssignment==null?null:pick(record(value.activeAssignment),'id serviceRequestId technicianProfileId status assignedByUserId assignedAt acceptedAt releasedAt notes'),
 history:(value.history??[]).map(row=>pick(record(row),'id fromStatus toStatus changedByUserId notes changedAt')),
 report:value.report==null?null:pick(record(value.report),'id serviceRequestId assignmentId diagnosis workPerformed testingResult completionNotes reportedByUserId createdAt updatedAt')};
}
export const attachmentView=value=>pick(record(value),'id serviceRequestId originalFilename contentType fileSize uploadedByUserId createdAt');
export const feedbackView=value=>value==null?null:pick(record(value),'id serviceRequestId customerProfileId rating comment createdAt updatedAt');
export function relatedAssets(customer,buildings,lifts,buildingId){
 const owned=customer?.active&&customer.status==='ACTIVE'?buildings.filter(b=>b.isActive&&b.customerProfileId===customer.customerProfileId):[];
 return {buildings:owned,lifts:owned.some(b=>b.id===Number(buildingId))?lifts.filter(l=>l.isActive&&l.buildingId===Number(buildingId)):[]};
}
const text=(value,label,max,required=false)=>{const result=String(value??'').trim();if(required&&!result)fail(label+' is required.');if(max&&result.length>max)fail(label+' is too long.');return result||null;};
export function createPayload(draft,customer,buildings,lifts){
 const related=relatedAssets(customer,buildings,lifts,draft.buildingId);
 if(!related.lifts.some(l=>l.id===Number(draft.liftId)))fail('Select an active lift belonging to the selected customer and building.');
 if(!serviceTypes.includes(draft.serviceType)||!priorities.includes(draft.priority))fail('Select a supported service type and priority.');
 const body={customerProfileId:id(customer.customerProfileId),liftId:id(draft.liftId),title:text(draft.title,'Title',200,true),description:text(draft.description,'Description',null,true),serviceType:draft.serviceType,priority:draft.priority};
 for(const [key,max] of [['issueCategory',100],['customerRemarks',2000],['preferredTimeSlot',80],['internalAdminNotes',2000]])body[key]=text(draft[key],key,max);
 const date=draft.preferredVisitDate;
 if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))fail('Invalid visit date.');
 body.preferredVisitDate=date||null;
 if(draft.estimatedCompletionMinutes!==''&&draft.estimatedCompletionMinutes!=null){const n=Number(draft.estimatedCompletionMinutes);if(!Number.isInteger(n)||n<0||n>2147483647)fail('Invalid completion estimate.');body.estimatedCompletionMinutes=n;}
 return body;
}
export function nextStatuses(detail){
 const {request,activeAssignment:a,report}=detail;
 return (graph[request.status]??[]).filter(to=>to==='CANCELLED'||(a&&(to==='ACCEPTED'?a.status==='ASSIGNED':a.status==='ACCEPTED')&&(to!=='COMPLETED'||(report?.assignmentId===a.id&&['diagnosis','workPerformed','testingResult'].every(k=>report[k]?.trim())))));
}
export function assignmentPayload(technician,notes){if(!technician?.active)fail('Select an active technician.');return {technicianProfileId:id(technician.technicianProfileId),notes:text(notes,'Notes',2000)};}
export function statusPayload(detail,toStatus,notes){if(!nextStatuses(detail).includes(toStatus))fail('This status action is unavailable. Refresh the request.');return {toStatus,notes:text(notes,'Notes / cancellation reason',2000,['CANCELLED','WAITING_FOR_PARTS'].includes(toStatus))};}
export function createWorkflowServices(client){
 return {
  async directory(kind,filters={}){if(!['customers','technicians'].includes(kind))fail('Invalid directory.');return pageView(await client.request('/admin/'+kind+pageQuery(filters)),row=>pick(record(row,kind==='customers'?'customerProfileId':'technicianProfileId'),kind==='customers'?'userId customerProfileId fullName email active status':'userId technicianProfileId email active employeeId assignedArea specialization availabilityStatus'));},
  async list(filters){return pageView(await client.request('/service-requests'+pageQuery(filters)),requestView);},
  async detail(value){return detailView(await client.request('/service-requests/'+id(value)));},
  async create(draft,customer,buildings,lifts){return detailView(await client.request('/service-requests',{method:'POST',body:createPayload(draft,customer,buildings,lifts)}));},
  async assign(detail,technician,notes){return detailView(await client.request('/service-requests/'+id(detail.request.id)+'/assignments',{method:'POST',body:assignmentPayload(technician,notes)}));},
  async status(detail,toStatus,notes){return detailView(await client.request('/service-requests/'+id(detail.request.id)+'/status',{method:'POST',body:statusPayload(detail,toStatus,notes)}));},
  async attachments(value){const rows=await client.request('/service-requests/'+id(value)+'/attachments');if(!Array.isArray(rows))throw new ApiError(502,'Invalid attachment response.');return rows.map(attachmentView);},
  async feedback(value){return feedbackView(await client.request('/service-requests/'+id(value)+'/feedback'));}
 };
}

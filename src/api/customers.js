import { ApiError } from './client.js';
import { pageQuery, pageView, requestView } from './workflow.js';
import { validId } from './assets.js';

const text=(value,label,max,required=false)=>{const result=String(value??'').trim();if(required&&!result)throw new ApiError(400,label+' is required.');if(max&&result.length>max)throw new ApiError(400,label+' is too long.');return result||null;};
const email=value=>{const result=text(value,'Email',254);if(result&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))throw new ApiError(400,'Enter a valid email.');return result?.toLowerCase()??null;};
const phone=(value,label)=>{
 const result=text(value,label,20);
 if(!result)return result;
 const compact=result.replace(/[\s()-]/g,'');
 const normalized=/^\d{10}$/.test(compact)?'+91'+compact:compact;
 if(!/^\+[1-9]\d{7,14}$/.test(normalized))throw new ApiError(400,'Enter '+label.toLowerCase()+' with country code, for example +919876543210.');
 return normalized;
};
const id=value=>{if(!validId(value))throw new ApiError(400,'Select a valid customer.');return Number(value);};
const assign=(target,key,value)=>{if(value!==null&&value!==undefined&&value!=='')target[key]=value;};
export const customerStatuses=['all','active','inactive'];
export function customerSummary(row){
 if(!row||!validId(row.customerProfileId)||!validId(row.userId))throw new ApiError(502,'Invalid customer response.');
 return Object.fromEntries('userId customerProfileId fullName email phone active status'.split(' ').map(key=>[key,row[key]??null]));
}
export function customerDetail(data){
 const base={...customerSummary(data),alternatePhone:data.alternatePhone??null,companyName:data.companyName??null,address:data.address??null,
  createdAt:data.createdAt??null,updatedAt:data.updatedAt??null,buildingCount:Number(data.buildingCount??0),liftCount:Number(data.liftCount??0),serviceRequestCount:Number(data.serviceRequestCount??0)};
 for(const key of ['buildings','lifts','serviceRequests'])if(!Array.isArray(data[key]))throw new ApiError(502,'Invalid customer detail response.');
 return {...base,buildings:data.buildings.map(b=>Object.fromEntries('id buildingName buildingType city status isActive'.split(' ').map(k=>[k,b[k]??null]))),
  lifts:data.lifts.map(l=>Object.fromEntries('id buildingId name liftNumber currentStatus isActive'.split(' ').map(k=>[k,l[k]??null]))),
  serviceRequests:data.serviceRequests.map(requestView)};
}
export function customerPayload(draft,mode='create'){
 const body={fullName:text(draft.fullName,'Full name',160,true)};
 assign(body,'alternatePhone',phone(draft.alternatePhone,'Alternate phone'));
 assign(body,'companyName',text(draft.companyName,'Company name',200));
 assign(body,'address',text(draft.address,'Address',500));
 if(mode==='create'){
  assign(body,'email',email(draft.email));assign(body,'phone',phone(draft.phone,'Phone'));
  body.password=String(draft.password??'');
  if(!body.email&&!body.phone)throw new ApiError(400,'Email or phone is required.');
  if(!body.password.trim())throw new ApiError(400,'Temporary password is required.');
  if(new TextEncoder().encode(body.password).length>72)throw new ApiError(400,'Password must be at most 72 bytes.');
 }
 return body;
}
export function createCustomerServices(client){
 return {
  async list(filters={}){return pageView(await client.request('/admin/customers'+pageQuery(filters)),customerSummary);},
  async detail(value){return customerDetail(await client.request('/admin/customers/'+id(value)));},
  async create(draft){return customerDetail(await client.request('/admin/customers',{method:'POST',body:customerPayload(draft,'create')}));},
  async update(original,draft){return customerDetail(await client.request('/admin/customers/'+id(original.customerProfileId),{method:'PUT',body:customerPayload(draft,'update')}));},
  async deactivate(value){return customerDetail(await client.request('/admin/customers/'+id(value)+'/deactivate',{method:'POST',body:{}}));},
  async reactivate(value){return customerDetail(await client.request('/admin/customers/'+id(value)+'/reactivate',{method:'POST',body:{}}));}
 };
}

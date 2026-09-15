import { ApiError } from './client.js';
import { pageQuery, pageView, requestView } from './workflow.js';
import { validId } from './assets.js';

const text=(value,label,max,required=false)=>{const result=String(value??'').trim();if(required&&!result)throw new ApiError(400,label+' is required.');if(max&&result.length>max)throw new ApiError(400,label+' is too long.');return result||null;};
const email=value=>{const result=text(value,'Email',254);if(result&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result))throw new ApiError(400,'Enter a valid email.');return result?.toLowerCase()??null;};
const id=value=>{if(!validId(value))throw new ApiError(400,'Select a valid customer.');return Number(value);};
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
 const body={fullName:text(draft.fullName,'Full name',160,true),alternatePhone:text(draft.alternatePhone,'Alternate phone',20),companyName:text(draft.companyName,'Company name',200),address:text(draft.address,'Address',500)};
 if(mode==='create'){
  body.email=email(draft.email);body.phone=text(draft.phone,'Phone',20);
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

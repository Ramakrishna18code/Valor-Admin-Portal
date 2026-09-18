import { ApiError } from './client.js';
const id=value=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<=0)throw new ApiError(400,'Enter a valid ID.');return n;};
const serviceTypes=['ROUTINE_MAINTENANCE','BREAKDOWN','EMERGENCY','INSPECTION','INSTALLATION','MODERNIZATION'];
export function createPhase15Services(client){
 return {
  serviceTypes,
  async templates(){const rows=await client.request('/admin/checklist-templates');if(!Array.isArray(rows))throw new ApiError(502,'Invalid checklist response.');return rows;},
  async saveTemplate(draft, original){
   const body={name:String(draft.name||'').trim(),description:String(draft.description||'').trim()||null,active:draft.active!==false,serviceTypes:(draft.serviceTypes||[]).filter(value=>serviceTypes.includes(value))};
   if(!body.name)throw new ApiError(400,'Template name is required.');
   return client.request(original?'/admin/checklist-templates/'+id(original.id):'/admin/checklist-templates',{method:original?'PUT':'POST',body});
  },
  async addItem(templateId,draft){return client.request('/admin/checklist-templates/'+id(templateId)+'/items',{method:'POST',body:itemPayload(draft)});},
  async updateItem(templateId,itemId,draft){return client.request('/admin/checklist-templates/'+id(templateId)+'/items/'+id(itemId),{method:'PUT',body:itemPayload(draft)});},
  async deleteItem(templateId,itemId){return client.request('/admin/checklist-templates/'+id(templateId)+'/items/'+id(itemId),{method:'DELETE'});},
  async technicianProfile(technicianId){return client.request('/admin/technicians/'+id(technicianId));},
  async updateTechnicianProfile(technicianId,draft){return client.request('/admin/technicians/'+id(technicianId),{method:'PUT',body:draft});},
  async technicianPrivateAttachments(technicianId){const rows=await client.request('/admin/technicians/'+id(technicianId)+'/private-attachments');if(!Array.isArray(rows))throw new ApiError(502,'Invalid private attachment response.');return rows;},
  async openTechnicianPrivateAttachment(technicianId,attachmentId){return client.raw('/admin/technicians/'+id(technicianId)+'/private-attachments/'+id(attachmentId));},
  async deleteTechnicianPrivateAttachment(technicianId,attachmentId){return client.request('/admin/technicians/'+id(technicianId)+'/private-attachments/'+id(attachmentId),{method:'DELETE'});}
 };
}
function itemPayload(draft){
 const label=String(draft.label||'').trim(); if(!label)throw new ApiError(400,'Item label is required.');
 const sortOrder=Number(draft.sortOrder??0); if(!Number.isSafeInteger(sortOrder)||sortOrder<0)throw new ApiError(400,'Sort order must be a positive integer.');
 return {label,description:String(draft.description||'').trim()||null,required:draft.required!==false,sortOrder,inputType:['CHECKBOX','TEXT','NUMBER','PHOTO_NOTE'].includes(draft.inputType)?draft.inputType:'CHECKBOX'};
}

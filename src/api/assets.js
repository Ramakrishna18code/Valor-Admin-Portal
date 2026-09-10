import { ApiError } from './client.js';
const field = (key,label,type='text',required=false,maxLength) => ({key,label,type,required,maxLength});
const id = (key,label) => ({...field(key,label,'number',true),min:1,max:Number.MAX_SAFE_INTEGER});
const date = (key,label,required=false) => field(key,label,'date',required);
export const availability = ['AVAILABLE','BUSY','OFF_DUTY','ON_LEAVE'];
export const schemas = {
 buildings: [id('customerProfileId','Customer profile ID'),field('buildingName','Building name','text',true,200),field('buildingType','Building type','text',false,80),field('address','Address','text',false,500),field('city','City','text',false,100),field('state','State','text',false,100),field('pincode','Pincode','text',false,20),field('emergencyContactName','Emergency contact name','text',false,160),field('emergencyContactPhone','Emergency contact phone','text',false,20),field('status','Status (defaults to ACTIVE)','text',false,20)],
 lifts: [id('buildingId','Building ID'),field('name','Lift name','text',true,160),field('liftNumber','Lift number','text',false,80),field('model','Model','text',false,120),field('manufacturer','Manufacturer','text',false,120),{...field('capacity','Capacity','number'),min:0,max:2147483647},{...field('floorCount','Floor count','number'),min:0,max:2147483647},field('serialNumber','Serial number','text',false,120),date('installationDate','Installation date'),field('location','Location','text',false,200),{...field('currentStatus','Status','select'),options:['ACTIVE','DOWN','MAINTENANCE','OUT_OF_SERVICE']},field('warrantyStatus','Warranty status','text',false,80),date('warrantyStartDate','Warranty start'),date('warrantyEndDate','Warranty end'),date('lastMaintenanceDate','Last maintenance'),date('nextMaintenanceDate','Next maintenance'),{...field('healthScore','Health score','number'),min:0,max:100},field('machineRoom','Machine room','text',false,200),field('qrCode','QR code','text',false,255),field('specifications','Specifications','textarea')],
 amc: [id('liftId','Lift ID'),field('amcNumber','Contract number','text',true,80),field('plan','Plan','text',true,80),field('coverageDetails','Coverage details','textarea'),date('startDate','Start date',true),date('endDate','End date',true),date('renewalDate','Renewal date')],
 staff: [field('email','Email','email',true,254),field('password','Password','password',true,72),{...field('role','Role','select',true),options:['ADMIN','TECHNICIAN']},field('employeeId','Employee ID','text',false,50),field('assignedArea','Assigned area','text',false,160),field('specialization','Specialization','text',false,160),{...field('availabilityStatus','Availability','select'),options:availability}]
};
export function fieldsFor(kind, mode='create', role='ADMIN') {
 return schemas[kind].filter(f => !(kind==='amc' && mode==='renew' && ['liftId','amcNumber'].includes(f.key)) && !(kind==='staff' && role==='ADMIN' && ['employeeId','assignedArea','specialization','availabilityStatus'].includes(f.key)));
}
export const validId = value => Number.isSafeInteger(Number(value)) && Number(value)>0;
export function payloadFor(kind,draft,mode='create',original) {
 const result={};
 for(const f of fieldsFor(kind,mode,draft.role)) {
  const raw=draft[f.key], value=raw===undefined||raw===null?'':String(raw);
  const text=f.type==='password'?value:value.trim();
  if(!text){if(f.required)throw new ApiError(400,f.label+' is required.');result[f.key]=null;continue;}
  if(f.maxLength && text.length>f.maxLength)throw new ApiError(400,f.label+' is too long.');
  if(f.options && !f.options.includes(text))throw new ApiError(400,'Choose a supported '+f.label.toLowerCase()+'.');
  if(f.type==='number') {const n=Number(text);if(!Number.isSafeInteger(n)||n<(f.min??0)||n>(f.max??Number.MAX_SAFE_INTEGER))throw new ApiError(400,f.label+' is outside the allowed integer range.');result[f.key]=n;}
  else if(f.type==='date'){if(!/^\d{4}-\d{2}-\d{2}$/.test(text)||!Number.isFinite(Date.parse(text))||new Date(text).toISOString().slice(0,10)!==text)throw new ApiError(400,'Enter a valid '+f.label.toLowerCase()+'.');result[f.key]=text;}
  else result[f.key]=text;
 }
 if(kind==='staff'){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email))throw new ApiError(400,'Enter a valid email.');
  if(new TextEncoder().encode(result.password).length>72)throw new ApiError(400,'Password must be at most 72 bytes.');
  result.email=result.email.toLowerCase();
  if(result.role==='TECHNICIAN'&&!result.availabilityStatus)result.availabilityStatus='AVAILABLE';
 }
 if(kind==='amc'){
  if(result.endDate<result.startDate)throw new ApiError(400,'End date must not precede start date.');
  if(mode==='renew' && original?.endDate && result.startDate<=original.endDate)throw new ApiError(400,'Renewal must start after the current contract ends.');
 }
 if(mode==='edit') {const key=kind==='buildings'?'customerProfileId':'buildingId';if(original && Number(original[key])!==result[key])throw new ApiError(400,'Ownership cannot be transferred.');}
 return result;
}
export function safeStaff(data){
 if(!data||!validId(data.userId)||!['ADMIN','TECHNICIAN'].includes(data.role))throw new ApiError(502,'Invalid staff response.');
 const keys=['userId','email','role','active','technicianProfileId','employeeId','assignedArea','specialization','availabilityStatus'];
 return Object.fromEntries(keys.filter(k=>Object.hasOwn(data,k)).map(k=>[k,data[k]]));
}
export function createAssetServices(client) {
 const record=data=>{if(!data||!validId(data.id))throw new ApiError(502,'Invalid asset response.');return data;};
 const pathId=value=>{if(!validId(value))throw new ApiError(400,'Enter a valid record ID.');return String(Number(value));};
 const resources={};
 for(const [kind,path] of Object.entries({buildings:'/buildings',lifts:'/lifts',amc:'/amc-contracts'})) {
  resources[kind]={
   async list(){const rows=await client.request(path);if(!Array.isArray(rows))throw new ApiError(502,'Invalid asset list response.');return rows.map(record);},
   async create(draft){return record(await client.request(path,{method:'POST',body:payloadFor(kind,draft)}));}
  };
  if(kind==='amc') resources[kind].renew=async(original,draft)=>record(await client.request(path+'/'+pathId(original.id)+'/renew',{method:'PUT',body:payloadFor(kind,draft,'renew',original)}));
  else Object.assign(resources[kind],{
   async update(original,draft){return record(await client.request(path+'/'+pathId(original.id),{method:'PUT',body:payloadFor(kind,draft,'edit',original)}));},
   async deactivate(value){return client.request(path+'/'+pathId(value),{method:'DELETE'});}
  });
 }
 resources.staff={
  async create(draft){return safeStaff(await client.request('/admin/users',{method:'POST',body:payloadFor('staff',draft)}));},
  async deactivate(value){return safeStaff(await client.request('/admin/users/'+pathId(value),{method:'DELETE'}));}
 };
 return resources;
}
export async function confirmedDeactivation(api,id,confirm){if(!confirm('Deactivate record #'+id+'? Its data will be retained. No reactivation is available here.'))return false;await api.deactivate(id);return true;}

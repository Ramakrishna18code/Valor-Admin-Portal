import {ApiError} from './client.js';
import {pageQuery} from './workflow.js';

const statuses = ['PENDING','PROCESSING','SENT','DELIVERED','FAILED','CANCELLED'];
function view(row){
 if(!row||typeof row.id!=='number'||typeof row.eventType!=='string')throw new ApiError(502,'Invalid communication message.');
 return row;
}
export function createCommunicationServices(client){return {
 async messages({page=0,size=20,status=''}={}) {
  if(status&&!statuses.includes(status))throw new ApiError(400,'Invalid communication status.');
  const query=pageQuery({page,size})+(status?'&status='+encodeURIComponent(status):'');
  const data=await client.request('/admin/communications/messages'+query);
  if(!data||!Array.isArray(data.items))throw new ApiError(502,'Invalid communication page.');
  return {...data,items:data.items.map(view)};
 },
 async process(id){return view(await client.request('/admin/communications/messages/'+Number(id)+'/process',{method:'POST'}));}
};}
export {statuses as communicationStatuses};

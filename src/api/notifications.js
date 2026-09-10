import {ApiError} from './client.js';
import {validId} from './assets.js';
import {pageQuery,pageView} from './workflow.js';
export const notificationStatuses=['PENDING','SENT','FAILED','READ'];
export function notificationView(data){
 if(!data||!validId(data.id)||!validId(data.recipientUserId)||!notificationStatuses.includes(data.status))throw new ApiError(502,'Invalid notification response.');
 return Object.fromEntries('id recipientUserId title message channel status scheduledAt sentAt readAt createdAt updatedAt'.split(' ').map(key=>[key,data[key]??null]));
}
export function notificationPayload(draft,recipient){
 if(!recipient?.active||!validId(recipient.userId))throw new ApiError(400,'Select an active recipient.');
 const title=String(draft.title??'').trim(),message=String(draft.message??'').trim();
 if(!title||title.length>200||!message||message.length>2000)throw new ApiError(400,'Title (1–200 characters) and message (1–2000 characters) are required.');
 if(draft.channel&&draft.channel!=='IN_APP')throw new ApiError(400,'Only in-app notifications are supported.');
 let scheduledAt=draft.scheduledAt||null;
 if(scheduledAt){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(scheduledAt))throw new ApiError(400,'Enter a valid UTC schedule.');if(scheduledAt.length===16)scheduledAt+=':00';const parsed=new Date(scheduledAt+'Z');if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,19)!==scheduledAt)throw new ApiError(400,'Enter a valid UTC schedule.');}
 return {recipientUserId:Number(recipient.userId),title,message,channel:'IN_APP',scheduledAt};
}
export function createNotificationServices(client){return {
 async list({page=0,size=20,status=''}={}){if(status&&!notificationStatuses.includes(status))throw new ApiError(400,'Invalid notification status.');const query=pageQuery({page,size})+(status?'&status='+encodeURIComponent(status):'');return pageView(await client.request('/notifications'+query),notificationView);},
 async create(draft,recipient){return notificationView(await client.request('/notifications',{method:'POST',body:notificationPayload(draft,recipient)}));},
 async read(id){if(!validId(id))throw new ApiError(400,'Select a valid notification.');const data=notificationView(await client.request('/notifications/'+Number(id)+'/read',{method:'PUT'}));if(data.id!==Number(id)||data.status!=='READ'||!data.readAt)throw new ApiError(502,'Invalid read confirmation.');return data;}
};}

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { summaryFields } from '../src/api/services.js';
test('protected content and dashboard render loading, empty, errors and real metrics',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try {
  const {ProtectedContent,SummaryView}=await server.ssrLoadModule('/src/views.jsx');
  const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
  assert(!render(ProtectedContent,{user:null,children:'protected-content'}).includes('protected-content'));
  assert(!render(ProtectedContent,{user:{role:'CUSTOMER'},children:'protected-content'}).includes('protected-content'));
  assert(render(ProtectedContent,{user:{role:'ADMIN'},children:'protected-content'}).includes('protected-content'));
  assert(render(SummaryView,{loading:true}).includes('Loading dashboard'));
  assert(render(SummaryView,{error:{status:403,message:'Forbidden'}}).includes('Access denied'));
  assert(render(SummaryView,{error:{status:500,message:'Unavailable'}}).includes('Dashboard unavailable'));
  const data=Object.fromEntries(summaryFields.map(key=>[key,0]));
  assert(render(SummaryView,{data}).includes('No operational records yet'));
  const html=render(SummaryView,{data:{...data,totalRequests:123}});
  assert(html.includes('123'));assert(html.includes('Service requests'));assert(!html.includes('Jobs today'));
 } finally { await server.close(); }
});
test('asset and staff screens show backend values, role controls and no unsupported directory',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try {
  const {AssetTable,StaffPage,RecordForm,displayValue,ErrorState}=await server.ssrLoadModule('/src/assetModules.jsx');
  const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
  assert.equal(displayValue(null),'Not provided');assert.equal(displayValue(0),'0');assert.equal(displayValue(false),'No');
  const html=render(AssetTable,{kind:'amc',rows:[{id:1,amcNumber:'Actual contract',status:'EXPIRED',covered:false,endDate:null}],canWrite:true});
  assert(html.includes('Actual contract'));assert(html.includes('EXPIRED'));assert(html.includes('No'));assert(html.includes('Renew'));assert(!html.includes('Deactivate'));
  assert(!render(AssetTable,{kind:'buildings',rows:[{id:1,isActive:true}],canWrite:false}).includes('Deactivate'));
  const staff=render(StaffPage,{user:{role:'SUPER_ADMIN'},api:{}});assert(staff.includes('Staff directory unavailable'));assert(staff.includes('disabled'));assert(!staff.includes('<table'));
  assert(render(StaffPage,{user:{role:'ADMIN'},api:{}}).includes('requires SUPER_ADMIN'));
  const form=render(RecordForm,{kind:'staff'});assert(form.includes('type="password"'));assert(!form.includes('SUPER_ADMIN'));assert(form.includes('TECHNICIAN'));assert(!form.includes('value="test-only"'));
  assert(render(ErrorState,{error:{status:400,message:'Check input'}}).includes('Check your input'));
  assert(render(ErrorState,{error:{status:403,message:'Forbidden'}}).includes('Access denied'));
 } finally {await server.close();}
});

 test('workflow views show server history/report, no manual profile-ID input or report writing',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try{
 const {RequestDetail,CreateRequest,WorkflowPage}=await server.ssrLoadModule('/src/workflowModules.jsx');
 const render=(component,props)=>renderToStaticMarkup(React.createElement(component,props));
 const html=render(RequestDetail,{detail:{request:{id:31,status:'COMPLETED',completedAt:'2026-09-10'},activeAssignment:null,history:[{id:1,fromStatus:'TESTING',toStatus:'COMPLETED',notes:'Confirmed'}],report:{id:9,diagnosis:'Actual diagnosis',workPerformed:'Actual work',testingResult:'Actual test'}}});
 assert(html.includes('Actual diagnosis'));assert(html.includes('Confirmed'));assert(html.includes('No active assignment'));assert(!html.includes('<textarea'));
 const empty=render(RequestDetail,{detail:{request:{id:31},activeAssignment:null,history:[],report:null}});assert(empty.includes('No status history returned'));assert(empty.includes('No service report returned'));
 const form=render(CreateRequest,{api:{},assets:{}});assert(form.includes('Search customers'));assert(!form.includes('type="number" name="customerProfileId"'));assert(form.includes('Select customer building'));assert(!form.includes('address'));
 assert(render(WorkflowPage,{api:{},assets:{},user:{role:'CUSTOMER'}}).includes('Access denied'));
 }finally{await server.close();}
 });

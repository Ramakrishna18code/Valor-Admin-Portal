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

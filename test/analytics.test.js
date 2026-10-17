import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';

test('payment analytics keep currencies separate and preserve payment statuses',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try {
  const {paymentAmounts}=await server.ssrLoadModule('/src/analyticsPage.jsx');
  const {BarChart,DonutChart}=await server.ssrLoadModule('/src/analytics.jsx');
  const rows=[{currency:'INR',status:'SUCCEEDED',amount:100.25},{currency:'INR',status:'SUCCEEDED',amount:20.5},{currency:'USD',status:'SUCCEEDED',amount:900},{currency:'INR',status:'REFUNDED',amount:50},{currency:'INR',status:'FAILED',amount:NaN}];
  assert.deepEqual(JSON.parse(JSON.stringify(paymentAmounts(rows,'INR'))),[{label:'succeeded',value:120.75},{label:'refunded',value:50}]);
  assert.equal(paymentAmounts(rows,'USD')[0].value,900);
  assert.equal(paymentAmounts(rows,'EUR').length,0);
  const empty=renderToStaticMarkup(React.createElement(DonutChart,{title:'Payments',items:[]}));
  assert(empty.includes('No records to chart yet.'));assert(!empty.includes('NaN'));
  const bar=renderToStaticMarkup(React.createElement(BarChart,{title:'Amounts',items:paymentAmounts(rows,'INR'),formatValue:value=>`INR ${value.toFixed(2)}`}));
  assert(bar.includes('INR 120.75'));
 }finally{await server.close();}
});
test('charts have a separate analytics route and are absent from the dashboard',async()=>{
 const main=await readFile(new URL('../src/main.jsx',import.meta.url),'utf8');
 const views=await readFile(new URL('../src/views.jsx',import.meta.url),'utf8');
 assert(main.includes("id: 'analytics-overview'"));assert(main.includes('<AnalyticsPage'));
 assert(!views.includes('DashboardAnalytics'));
});

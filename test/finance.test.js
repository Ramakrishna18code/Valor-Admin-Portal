import test from 'node:test';
import assert from 'node:assert/strict';
import {createFinanceServices} from '../src/api/finance.js';

const page = items => ({items, page:0, size:20, totalElements:items.length, totalPages:items.length ? 1 : 0});
const tx = {id:'PAYMENT-7', type:'PAYMENT', status:'SUCCEEDED', amount:1180, currency:'INR', customerProfileId:4, invoiceId:3, paymentId:7, gatewayStatus:'captured', createdAt:'2026-09-17T10:00:00'};

test('transactions use canonical admin filters and safe mapping', async () => {
  const calls = [];
  const api = createFinanceServices({request: async path => { calls.push(path); return page([tx]); }, raw: async path => { calls.push(path); return {blob: async () => new Blob(['csv'])}; }});
  const result = await api.transactions({page:2, size:10, q:'INV&1', type:'PAYMENT', status:'SUCCEEDED', dateFrom:'2026-01-01'});
  assert.equal(calls[0], '/admin/transactions?page=2&size=10&status=SUCCEEDED&type=PAYMENT&dateFrom=2026-01-01&q=INV%261');
  assert.equal(result.items[0].id, 'PAYMENT-7');
  await api.transactionExport({status:'SUCCEEDED'});
  assert.equal(calls[1], '/admin/transactions.csv?page=0&size=100&status=SUCCEEDED');
});

test('transaction validation rejects malformed backend data and bad filters', async () => {
  const api = createFinanceServices({request: async () => page([{...tx, status:'SECRET'}]), raw: async () => ({})});
  await assert.rejects(api.transactions(), {status:502});
  await assert.rejects(createFinanceServices({}).transactions({page:-1}), {status:400});
});

test('reports use canonical endpoints and export through authenticated raw requests', async () => {
  const calls = [];
  const api = createFinanceServices({request: async path => { calls.push(path); return {type:'REVENUE', summary:{netAmount:100}, rows:[{metric:'netAmount', amount:100}]}; }, raw: async path => { calls.push(path); return {blob: async () => new Blob(['csv'])}; }});
  const result = await api.report('revenue', {dateFrom:'2026-01-01', dateTo:'2026-01-31'});
  assert.equal(calls[0], '/admin/reports/revenue?dateFrom=2026-01-01&dateTo=2026-01-31');
  assert.equal(result.summary.netAmount, 100);
  await api.reportExport('payments', {status:'SUCCEEDED'});
  assert.equal(calls[1], '/admin/reports/payments.csv?status=SUCCEEDED');
  await assert.rejects(api.report('audit'), {status:400});
});

test('active admin finance modules are wired and not deferred', async () => {
  const {readFile} = await import('node:fs/promises');
  const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert(main.includes('<TransactionsPage'));
  assert(main.includes('<ReportsPage'));
  assert(main.includes("'transactions','reports','exports'"));
  assert(!main.includes("from './adminModules"));
});

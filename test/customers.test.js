import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { createCustomerServices, customerDetail, customerPayload, customerSummary } from '../src/api/customers.js';
import { createWorkflowServices } from '../src/api/workflow.js';

const paged = items => ({ items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 });
const customer = {
  userId: 10, customerProfileId: 7, fullName: 'Valor Customer', email: 'customer@example.invalid',
  phone: '+911234567890', active: true, status: 'ACTIVE', alternatePhone: null, companyName: 'Valor Co',
  address: 'Lift Street', createdAt: '2026-09-15T00:00:00', updatedAt: '2026-09-15T00:00:00',
  buildingCount: 1, liftCount: 1, serviceRequestCount: 1,
  buildings: [{ id: 3, buildingName: 'Tower One', buildingType: 'COMMERCIAL', city: 'Hyderabad', status: 'ACTIVE', isActive: true }],
  lifts: [{ id: 4, buildingId: 3, name: 'Lift A', liftNumber: 'L-1', currentStatus: 'OPERATIONAL', isActive: true }],
  serviceRequests: [{ id: 9, serviceId: 'SR-9', customerProfileId: 7, liftId: 4, title: 'Emergency stop', priority: 'EMERGENCY', status: 'PENDING', serviceType: 'BREAKDOWN' }]
};
const fixture = response => {
  const calls = [];
  return { calls, api: createCustomerServices({ request: async (path, options) => { calls.push({ path, options }); return response; } }) };
};

test('customer management services use canonical admin customer routes and safe mapping', async () => {
  const listed = fixture(paged([{ ...customer, passwordHash: 'hidden', address: 'private' }]));
  const list = await listed.api.list({ q: ' valor ', active: true });
  assert.equal(listed.calls[0].path, '/admin/customers?page=0&size=20&q=valor&active=true');
  assert.equal(list.items[0].customerProfileId, 7);
  assert(!JSON.stringify(list).includes('hidden'));
  assert(!JSON.stringify(list).includes('private'));

  const detailed = fixture({ ...customer, passwordHash: 'hidden' });
  assert.equal((await detailed.api.detail(7)).buildings[0].buildingName, 'Tower One');
  assert.equal(detailed.calls[0].path, '/admin/customers/7');
  await detailed.api.create({ fullName: ' New ', email: 'NEW@EXAMPLE.INVALID', password: 'Valor@123' });
  assert.equal(detailed.calls[1].path, '/admin/customers');
  assert.equal(detailed.calls[1].options.method, 'POST');
  assert.deepEqual(detailed.calls[1].options.body, { fullName: 'New', alternatePhone: null, companyName: null, address: null, email: 'new@example.invalid', phone: null, password: 'Valor@123' });
  await detailed.api.update(customer, { fullName: 'Updated', email: 'ignored@example.invalid', password: 'ignored' });
  assert.equal(detailed.calls[2].path, '/admin/customers/7');
  assert.equal(detailed.calls[2].options.method, 'PUT');
  assert(!Object.hasOwn(detailed.calls[2].options.body, 'email'));
  assert(!Object.hasOwn(detailed.calls[2].options.body, 'password'));
  await detailed.api.deactivate(7);
  await detailed.api.reactivate(7);
  assert.equal(detailed.calls[3].path, '/admin/customers/7/deactivate');
  assert.equal(detailed.calls[4].path, '/admin/customers/7/reactivate');
});

test('customer validation rejects unsupported identity and malformed backend responses', () => {
  assert.throws(() => customerPayload({ fullName: 'A', password: 'Valor@123' }), { status: 400 });
  assert.throws(() => customerPayload({ fullName: 'A', email: 'bad', password: 'Valor@123' }), { status: 400 });
  assert.throws(() => customerPayload({ fullName: 'A', email: 'a@example.invalid', password: 'x'.repeat(73) }), { status: 400 });
  assert.throws(() => customerSummary({ userId: 1 }), { status: 502 });
  assert.throws(() => customerDetail({ ...customer, buildings: {} }), { status: 502 });
});

test('customer and emergency views render canonical data without fake records', async () => {
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { CustomersPage, EmergencyQueuePage } = await server.ssrLoadModule('/src/customerModules.jsx');
    const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
    const customers = render(CustomersPage, { api: {}, user: { role: 'ADMIN' } });
    assert(customers.includes('Create customer'));
    assert(customers.includes('Search'));
    assert(!customers.includes('/api/customers'));
    assert(render(CustomersPage, { api: {}, user: { role: 'CUSTOMER' } }).includes('Access denied'));
    const emergency = render(EmergencyQueuePage, { api: {}, user: { role: 'SUPER_ADMIN' } });
    assert(emergency.includes('Emergency Queue'));
    assert(emergency.includes('Filtered canonical service requests'));
    assert(!emergency.includes('Log emergency'));
  } finally { await server.close(); }
});

test('emergency queue reuses service request filtering instead of a separate API', async () => {
  const calls = [];
  const api = createWorkflowServices({ request: async (path, options) => { calls.push({ path, options }); return paged([{ id: 9, serviceId: 'SR-9', priority: 'EMERGENCY', status: 'PENDING' }]); } });
  assert.equal((await api.list({ page: 0, size: 20, priority: 'EMERGENCY' })).items[0].id, 9);
  assert.equal(calls[0].path, '/service-requests?page=0&size=20&priority=EMERGENCY');
});

test('active customer source removes legacy customer and emergency module usage', async () => {
  const { readFile } = await import('node:fs/promises');
  const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  const customerSource = await readFile(new URL('../src/customerModules.jsx', import.meta.url), 'utf8');
  const customerApi = await readFile(new URL('../src/api/customers.js', import.meta.url), 'utf8');
  assert(entry.includes('<CustomersPage'));
  assert(entry.includes('<EmergencyQueuePage'));
  assert(!entry.includes("from './adminModules"));
  for (const text of [customerSource, customerApi]) {
    assert(!/fetch\(|localStorage|sessionStorage|accessToken|refreshToken|['"]\/api\/customers|mock|fake|Log emergency/.test(text));
  }
});

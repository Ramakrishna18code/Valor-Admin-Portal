import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createInstallationServices } from '../src/api/installations.js';

test('technician directory loads every page and deduplicates overlapping records', async () => {
  const calls = [];
  const pages = [
    { items: [{ technicianProfileId: 1, fullName: 'First' }, { technicianProfileId: 2, fullName: 'Second' }], page: 0, size: 2, totalElements: 3, totalPages: 2 },
    { items: [{ technicianProfileId: 2, fullName: 'Second updated' }, { technicianProfileId: 3, fullName: 'Third' }], page: 1, size: 2, totalElements: 3, totalPages: 2 },
  ];
  const api = createInstallationServices({ request: async path => { calls.push(path); return pages[calls.length - 1]; } });
  const result = await api.technicians({ size: 2 });
  assert.deepEqual(calls, ['/admin/technicians?page=0&size=2', '/admin/technicians?page=1&size=2']);
  assert.deepEqual(result.items.map(row => row.technicianProfileId), [1, 2, 3]);
  assert.equal(result.items[1].fullName, 'Second updated');
});

test('technician directory stops safely when a response has no page metadata', async () => {
  const calls = [];
  const api = createInstallationServices({ request: async path => { calls.push(path); return { items: [{ id: 7 }] }; } });
  const result = await api.technicians({ size: 100 });
  assert.equal(calls.length, 1);
  assert.deepEqual(result.items, [{ id: 7 }]);
});

test('installation assignments are mounted through the selected installation drawer portal', () => {
  const source = fs.readFileSync(new URL('../src/installations.jsx', import.meta.url), 'utf8');
  assert(source.includes('InstallationAssignmentPortal'));
  assert(source.includes("createPortal(<InstallationAssignmentSection {...props} />, target)"));
  assert(source.includes("querySelector('[role=\"dialog\"]')"));
});

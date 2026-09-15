import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitServices } from '../src/api/visits.js';
import { ApiError } from '../src/api/client.js';

const visit = { id: 8, serviceRequestId: 31, serviceId: 'SR-31', technicianProfileId: 4, scheduledDate: '2031-01-10', startTime: '10:00:00', endTime: '11:00:00', status: 'SCHEDULED' };
const page = items => ({ items, page: 0, size: 20, totalElements: items.length, totalPages: items.length ? 1 : 0 });
const fixture = response => { const calls = []; return { calls, api: createVisitServices({ request: async (path, options) => { calls.push({ path, options }); return response; } }) }; };

test('visit list uses canonical admin endpoint and page filters', async () => {
  const f = fixture(page([visit]));
  const result = await f.api.list({ fromDate: '2031-01-01', toDate: '2031-01-31', technicianProfileId: 4, status: 'SCHEDULED' });
  assert.equal(result.items[0].id, 8);
  assert.equal(f.calls[0].path, '/admin/service-visits?page=0&size=20&fromDate=2031-01-01&toDate=2031-01-31&technicianProfileId=4&status=SCHEDULED');
});

test('visit creation validates typed request, technician, time range, and uses canonical POST', async () => {
  const f = fixture(visit);
  await f.api.create({ serviceRequestId: 31, technicianProfileId: 4, scheduledDate: '2031-01-10', startTime: '10:00', endTime: '11:00', notes: 'Inspect' });
  assert.equal(f.calls[0].path, '/admin/service-visits');
  assert.deepEqual(f.calls[0].options.body, { serviceRequestId: 31, technicianProfileId: 4, scheduledDate: '2031-01-10', startTime: '10:00:00', endTime: '11:00:00', notes: 'Inspect' });
  await assert.rejects(f.api.create({ serviceRequestId: 31, technicianProfileId: 4, scheduledDate: '2031-01-10', startTime: '11:00', endTime: '10:00' }), { status: 400 });
});

test('reschedule uses canonical PUT and preserves backend conflict messages', async () => {
  const f = fixture(visit);
  await f.api.update(8, { technicianProfileId: 4, scheduledDate: '2031-01-11', startTime: '10:00', endTime: '11:00' });
  assert.equal(f.calls[0].path, '/admin/service-visits/8');
  assert.equal(f.calls[0].options.method, 'PUT');
  const conflict = new ApiError(409, 'Technician has an overlapping visit');
  const failing = createVisitServices({ request: async () => { throw conflict; } });
  await assert.rejects(failing.update(8, { technicianProfileId: 4, scheduledDate: '2031-01-11', startTime: '10:00', endTime: '11:00' }), { status: 409, message: 'Technician has an overlapping visit' });
});

test('cancellation, change-request approval, and rejection use canonical endpoints', async () => {
  const f = fixture(visit);
  await f.api.cancel(8, 'Customer unavailable');
  assert.equal(f.calls[0].path, '/admin/service-visits/8/cancel');
  assert.deepEqual(f.calls[0].options.body, { reason: 'Customer unavailable' });
  const pending = { id: 12, serviceRequestId: 31, visitId: 8, type: 'ADDITIONAL_VISIT', status: 'PENDING', requestedByUserId: 9, requestedTechnicianProfileId: 4, requestedDate: '2031-01-12', requestedStartTime: '09:00:00', requestedEndTime: '10:00:00' };
  const g = fixture(visit);
  await g.api.approveChange(12, { technicianProfileId: 4, scheduledDate: '2031-01-13', startTime: '09:00', endTime: '10:00', reviewNotes: 'Approved' });
  assert.equal(g.calls[0].path, '/admin/visit-change-requests/12/approve');
  const h = fixture(pending);
  await h.api.rejectChange(12, 'Not required');
  assert.equal(h.calls[0].path, '/admin/visit-change-requests/12/reject');
});

test('active scheduling source contains no legacy schedule route or generic task payload', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('../src/scheduleCalendar.jsx', import.meta.url), 'utf8');
  assert(!source.includes('/api/schedule'));
  assert(!source.includes('task.title'));
  assert(source.includes('Unscheduled Service Requests'));
  assert(source.includes('Unscheduled Service Requests'));
});

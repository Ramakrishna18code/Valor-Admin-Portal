import { ApiError } from './client.js';
import { validId } from './assets.js';

export const visitStatuses = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
export const changeTypes = ['RESCHEDULE', 'ADDITIONAL_VISIT'];
export const changeStatuses = ['PENDING', 'APPROVED', 'REJECTED'];

const id = (value, label = 'record') => {
  if (!validId(value)) throw new ApiError(400, `Select a valid ${label}.`);
  return Number(value);
};
const pageParams = ({ page = 0, size = 20, fromDate, toDate, technicianProfileId, status, serviceRequestId } = {}) => {
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) throw new ApiError(400, 'Invalid page.');
  if (status && !visitStatuses.includes(status)) throw new ApiError(400, 'Invalid visit status.');
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate) params.set('toDate', toDate);
  if (technicianProfileId) params.set('technicianProfileId', String(id(technicianProfileId, 'technician')));
  if (serviceRequestId) params.set('serviceRequestId', String(id(serviceRequestId, 'service request')));
  if (status) params.set('status', status);
  return `?${params}`;
};
const page = data => {
  if (!data || !Array.isArray(data.items) || !['page', 'size', 'totalElements', 'totalPages'].every(key => Number.isSafeInteger(data[key]))) throw new ApiError(502, 'Invalid visit page response.');
  return data;
};
const visit = data => {
  if (!data || !validId(data.id) || !validId(data.serviceRequestId) || !visitStatuses.includes(data.status)) throw new ApiError(502, 'Invalid visit response.');
  return data;
};
const change = data => {
  if (!data || !validId(data.id) || !changeTypes.includes(data.type) || !changeStatuses.includes(data.status)) throw new ApiError(502, 'Invalid visit request response.');
  return data;
};
const text = (value, label, required = false, max = 2000) => {
  const result = String(value ?? '').trim();
  if (required && !result) throw new ApiError(400, `${label} is required.`);
  if (result.length > max) throw new ApiError(400, `${label} is too long.`);
  return result || null;
};
const date = (value, label) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '') || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new ApiError(400, `Invalid ${label}.`);
  return value;
};
const time = (value, label) => {
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value || '')) throw new ApiError(400, `Invalid ${label}.`);
  return value.length === 5 ? `${value}:00` : value;
};
const windowPayload = (draft, includeRequest = true) => {
  const scheduledDate = date(draft.scheduledDate, 'scheduled date');
  const startTime = time(draft.startTime, 'start time');
  const endTime = time(draft.endTime, 'end time');
  if (startTime >= endTime) throw new ApiError(400, 'Start time must be before end time.');
  return {
    ...(includeRequest ? { serviceRequestId: id(draft.serviceRequestId, 'service request') } : {}),
    technicianProfileId: id(draft.technicianProfileId, 'technician'), scheduledDate, startTime, endTime,
    notes: text(draft.notes, 'Notes')
  };
};

export function createVisitServices(client) {
  return {
    async list(filters = {}) { return page(await client.request(`/admin/service-visits${pageParams(filters)}`)); },
    async customerRequests(filters = {}) { return page(await client.request(`/service-requests${pageParams(filters)}`)); },
    async detail(idValue) { return visit(await client.request(`/admin/service-visits/${id(idValue, 'visit')}`)); },
    async create(draft) { return visit(await client.request('/admin/service-visits', { method: 'POST', body: windowPayload(draft) })); },
    async update(idValue, draft) { return visit(await client.request(`/admin/service-visits/${id(idValue, 'visit')}`, { method: 'PUT', body: windowPayload(draft, false) })); },
    async cancel(idValue, reason) {
      return visit(await client.request(`/admin/service-visits/${id(idValue, 'visit')}/cancel`, { method: 'POST', body: { reason: text(reason, 'Cancellation reason', true) } }));
    },
    async changeRequests(filters = {}) {
      const params = new URLSearchParams({ page: String(filters.page ?? 0), size: String(filters.size ?? 20) });
      if (filters.type) params.set('type', filters.type);
      if (filters.status) params.set('status', filters.status);
      return page(await client.request(`/admin/visit-change-requests?${params}`));
    },
    async approveChange(idValue, draft = {}) {
      const body = {
        reviewNotes: text(draft.reviewNotes, 'Review notes'),
        ...(draft.technicianProfileId ? { technicianProfileId: id(draft.technicianProfileId, 'technician') } : {}),
        ...(draft.scheduledDate ? { scheduledDate: date(draft.scheduledDate, 'scheduled date') } : {}),
        ...(draft.startTime ? { startTime: time(draft.startTime, 'start time') } : {}),
        ...(draft.endTime ? { endTime: time(draft.endTime, 'end time') } : {})
      };
      return visit(await client.request(`/admin/visit-change-requests/${id(idValue, 'change request')}/approve`, { method: 'POST', body }));
    },
    async rejectChange(idValue, reason) {
      return change(await client.request(`/admin/visit-change-requests/${id(idValue, 'change request')}/reject`, { method: 'POST', body: { reason: text(reason, 'Rejection reason', true) } }));
    }
  };
}

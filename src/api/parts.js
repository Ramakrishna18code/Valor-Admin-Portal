import { ApiError } from './client.js';
const id = value => { const number = Number(value); if (!Number.isSafeInteger(number) || number < 1) throw new ApiError(400, 'Invalid ID.'); return number; };
const page = value => ({ ...value, items: value?.items || value?.content || [] });
export function createPartsServices(client) {
  return {
    categories: () => client.request('/admin/part-categories'),
    createCategory: body => client.request('/admin/part-categories', { method: 'POST', body }),
    updateCategory: (value, body) => client.request('/admin/part-categories/' + id(value), { method: 'PATCH', body }),
    parts: ({ q = '', page: pageNumber = 0, size = 100 } = {}) => client.request('/admin/parts?page=' + pageNumber + '&size=' + size + (q ? '&q=' + encodeURIComponent(q) : '')).then(page),
    createPart: body => client.request('/admin/parts', { method: 'POST', body }),
    updatePart: (value, body) => client.request('/admin/parts/' + id(value), { method: 'PATCH', body }),
    moveStock: (value, body) => client.request('/admin/parts/' + id(value) + '/stock-movements', { method: 'POST', body }),
    movements: value => client.request('/admin/parts/' + id(value) + '/stock-movements'),
    requests: ({ page: pageNumber = 0, size = 100 } = {}) => client.request('/admin/part-requests?page=' + pageNumber + '&size=' + size).then(page),
    request: value => client.request('/admin/part-requests/' + id(value)),
    approve: (value, reason = '') => client.request('/admin/part-requests/' + id(value) + '/approve', { method: 'POST', body: { reason } }),
    reject: (value, reason) => client.request('/admin/part-requests/' + id(value) + '/reject', { method: 'POST', body: { reason } }),
    ready: value => client.request('/admin/part-requests/' + id(value) + '/ready', { method: 'POST', body: {} }),
    issue: value => client.request('/admin/part-requests/' + id(value) + '/issue', { method: 'POST', body: {} }),
  };
}

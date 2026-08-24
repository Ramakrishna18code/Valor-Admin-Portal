import { apiRequest } from './client';

export const authApi = {
  login: (body) => apiRequest('/api/admin/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  verifyOtp: (body) => apiRequest('/api/admin/auth/verify-otp', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiRequest('/api/admin/auth/me')
};

export const dashboardApi = {
  serviceJobs: () => apiRequest('/api/admin/dashboard/service-jobs'),
  summary: () => apiRequest('/api/reports/summary')
};

const listApi = (resource) => ({
  list: (query = '') => apiRequest(`/api/${resource}${query}`),
  get: (id) => apiRequest(`/api/${resource}/${id}`),
  update: (id, body) => apiRequest(`/api/${resource}/${id}`, { method: 'PUT', body: JSON.stringify(body) })
});

export const customerApi = listApi('customers');
export const buildingApi = listApi('buildings');
export const liftApi = listApi('lifts');
export const amcApi = listApi('amc-contracts');
export const technicianApi = listApi('technicians');
export const paymentApi = listApi('payments');
export const inventoryApi = listApi('inventory');
export const notificationApi = listApi('notifications');
export const reportApi = { summary: () => apiRequest('/api/reports/summary') };
export const adminApi = listApi('admin/users');

export const serviceRequestApi = {
  ...listApi('service-requests'),
  create: (body) => apiRequest('/api/service-requests', { method: 'POST', body: JSON.stringify(body) }),
  remove: (id) => apiRequest('/api/service-requests/' + id, { method: 'DELETE' }),
  search: (query) => apiRequest(`/api/service-requests/search${query}`),
  assign: (id, body) => apiRequest(`/api/service-requests/${id}/assign`, { method: 'PUT', body: JSON.stringify(body) }),
  start: (id) => apiRequest(`/api/service-requests/${id}/start`, { method: 'PUT' }),
  complete: (id, body) => apiRequest(`/api/service-requests/${id}/complete`, { method: 'PUT', body: JSON.stringify(body) })
};


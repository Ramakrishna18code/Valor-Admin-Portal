export function createInstallationServices(client) {
  return {
    list: ({ status = '', q = '', page = 0, size = 20 } = {}) => client.request(`/admin/installations/authorizations?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}&size=${size}`),
    detail: id => client.request(`/admin/installations/authorizations/${id}`),
    reviewAuthorization: (id, status) => client.request(`/admin/installations/authorizations/${id}/review`, { method: 'POST', body: { status } }),
    requestInspection: requestId => client.request(`/admin/installations/${requestId}/inspection`, { method: 'POST', body: {} }),
    inspectionForInstallation: id => client.request(`/admin/installations/${id}/inspection`),
    inspection: id => client.request(`/admin/installations/inspections/${id}`),
    scheduleInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/schedule`, { method: 'PUT', body }),
    assignInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/assign`, { method: 'PUT', body }),
    rescheduleInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/reschedule`, { method: 'PUT', body }),
    cancelInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/cancel`, { method: 'POST', body }),
    reviewInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/review`, { method: 'POST', body }),
    technicians: () => client.request('/admin/technicians?page=0&size=100'),
    inspectionQueue: ({ status = '', technicianProfileId = '', from = '', to = '', page = 0, size = 20 } = {}) => client.request(`/admin/installations/inspections?status=${encodeURIComponent(status)}&technicianProfileId=${encodeURIComponent(technicianProfileId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${page}&size=${size}`),
  };
}

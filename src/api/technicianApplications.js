export function createTechnicianApplicationServices(client) {
  return {
    list: ({ page = 0, size = 50 } = {}) => client.request(`/admin/technician-applications?page=${page}&size=${size}`),
    review: (id, status, reason = '') => client.request(`/admin/technician-applications/${id}/status`, { method: 'PUT', body: { status, reason } }),
    reviewDocument: (id, documentId, status, reason = '') => client.request(`/admin/technician-applications/${id}/documents/${documentId}/review`, { method: 'PUT', body: { status, reason } }),
    meeting: (id, body) => client.request(`/admin/technician-applications/${id}/meeting`, { method: 'PUT', body }),
    completeMeeting: (id, reason = '') => client.request(`/admin/technician-applications/${id}/meeting/complete`, { method: 'POST', body: { status: 'MEETING_COMPLETED', reason } }),
    documentUrl: (id, documentId) => `${client.baseUrl || ''}/api/v1/admin/technician-applications/${id}/documents/${documentId}/download`,
  };
}

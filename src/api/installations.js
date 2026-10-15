export function createInstallationServices(client) {
  return {
    list: ({ status = '', q = '', page = 0, size = 20 } = {}) => client.request(`/admin/installations/authorizations?status=${encodeURIComponent(status)}&q=${encodeURIComponent(q)}&page=${page}&size=${size}`),
    detail: id => client.request(`/admin/installations/authorizations/${id}`),
    reviewAuthorization: (id, status) => client.request(`/admin/installations/authorizations/${id}/review`, { method: 'POST', body: { status } }),
    requestInspection: (requestId, body) => client.request(`/admin/installations/${requestId}/inspection`, { method: 'POST', body }),
    inspectionForInstallation: id => client.request(`/admin/installations/${id}/inspection`),
    inspection: id => client.request(`/admin/installations/inspections/${id}`),
    scheduleInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/schedule`, { method: 'PUT', body }),
    assignInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/assign`, { method: 'PUT', body }),
    rescheduleInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/reschedule`, { method: 'PUT', body }),
    cancelInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/cancel`, { method: 'POST', body }),
    reviewInspection: (id, body) => client.request(`/admin/installations/inspections/${id}/review`, { method: 'POST', body }),
    technicians: async ({ size = 100 } = {}) => {
      const all = new Map();
      let page = 0;
      let totalPages = 1;
      do {
        const result = await client.request(`/admin/technicians?page=${page}&size=${size}`);
        const rows = result?.items || result?.content || [];
        rows.forEach(row => all.set(row.technicianProfileId || row.id, row));
        totalPages = Number.isFinite(Number(result?.totalPages)) ? Number(result.totalPages) : (rows.length < size ? page + 1 : page + 2);
        page += 1;
      } while (page < totalPages);
      return { items: [...all.values()], content: [...all.values()], page: 0, size, totalElements: all.size, totalPages: 1 };
    },
    inspectionQueue: ({ status = '', technicianProfileId = '', from = '', to = '', page = 0, size = 20 } = {}) => client.request(`/admin/installations/inspections?status=${encodeURIComponent(status)}&technicianProfileId=${encodeURIComponent(technicianProfileId)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${page}&size=${size}`),
    reviewRequirements: (id, body) => client.request(`/admin/installations/${id}/requirements`, { method: 'POST', body }),
    proposals: id => client.request(`/admin/installations/${id}/proposals`),
    saveProposal: (id, body) => client.request(`/admin/installations/${id}/proposals`, { method: 'POST', body }),
    presentProposal: (id, version) => client.request(`/admin/installations/proposals/${id}/present?version=${version}`, { method: 'POST', body: {} }),
    startInstallation: (id, version) => client.request(`/admin/installations/${id}/start?version=${version}`, { method: 'POST', body: {} }),
    completeInstallation: (id, version) => client.request(`/admin/installations/${id}/complete?version=${version}`, { method: 'POST', body: {} }),
    assignments: id => client.request(`/admin/installations/${id}/assignments`),
    assignConstructionTechnician: (id, body) => client.request(`/admin/installations/${id}/assignments`, { method: 'POST', body }),
    cancelAssignment: (id, version) => client.request(`/admin/installations/assignments/${id}/cancel?version=${version}`, { method: 'POST', body: {} }),
  };
}

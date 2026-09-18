import { ApiError } from './client.js';
import { pageView } from './workflow.js';

const roles = ['SUPER_ADMIN','ADMIN','CUSTOMER','TECHNICIAN'];
const validCode = value => typeof value === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(value);
export const roleNames = roles;

export function permissionView(data) {
  if (!data || !Number.isSafeInteger(Number(data.id)) || !validCode(data.code)) throw new ApiError(502, 'Invalid permission response.');
  return { id: Number(data.id), code: data.code, description: String(data.description ?? ''), category: String(data.category ?? 'General') };
}

export function roleView(data) {
  if (!data || !roles.includes(data.name) || !Array.isArray(data.permissions)) throw new ApiError(502, 'Invalid role response.');
  return {
    id: Number(data.id),
    name: data.name,
    description: String(data.description ?? ''),
    enabled: Boolean(data.enabled),
    systemRole: Boolean(data.systemRole),
    permissions: data.permissions.filter(validCode),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null
  };
}

export function auditView(data) {
  if (!data || !Number.isSafeInteger(Number(data.id)) || !validCode(data.action) || !data.entityType) throw new ApiError(502, 'Invalid audit response.');
  const text = value => value == null ? null : String(value);
  const json = JSON.stringify(data).toLowerCase();
  if (/(password|token|secret|otp|cvv|pin)/.test(json)) throw new ApiError(502, 'Unsafe audit response.');
  return {
    id: Number(data.id),
    actorUserId: data.actorUserId == null ? null : Number(data.actorUserId),
    actorRole: text(data.actorRole),
    action: data.action,
    entityType: text(data.entityType),
    entityId: text(data.entityId),
    resultStatus: text(data.resultStatus),
    summary: text(data.summary),
    beforeSummary: text(data.beforeSummary),
    afterSummary: text(data.afterSummary),
    createdAt: text(data.createdAt)
  };
}

const cleanFilters = filters => Object.fromEntries(Object.entries(filters || {}).filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== ''));
const auditQuery = filters => {
  const safe = cleanFilters(filters);
  const page = Number(safe.page ?? 0);
  const size = Number(safe.size ?? 20);
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100 || page * size > 2147483647) {
    throw new ApiError(400, 'Invalid page.');
  }
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  for (const key of ['actorUserId', 'role', 'action', 'entityType', 'entityId', 'dateFrom', 'dateTo']) {
    if (safe[key] !== undefined) params.set(key, String(safe[key]).trim());
  }
  return `?${params}`;
};

export function createAdminSecurityServices(client) {
  return {
    async permissions() {
      const rows = await client.request('/admin/permissions');
      if (!Array.isArray(rows)) throw new ApiError(502, 'Invalid permission list response.');
      return rows.map(permissionView);
    },
    async roles() {
      const rows = await client.request('/admin/roles');
      if (!Array.isArray(rows)) throw new ApiError(502, 'Invalid role list response.');
      return rows.map(roleView);
    },
    async role(name) {
      if (!roles.includes(name)) throw new ApiError(400, 'Choose a supported role.');
      return roleView(await client.request(`/admin/roles/${name}`));
    },
    async updateRolePermissions(name, permissions) {
      if (!roles.includes(name) || name === 'SUPER_ADMIN') throw new ApiError(400, 'This role cannot be changed.');
      const unique = [...new Set((permissions || []).map(value => String(value).trim().toUpperCase()).filter(Boolean))];
      if (unique.some(value => !validCode(value))) throw new ApiError(400, 'Invalid permission code.');
      return roleView(await client.request(`/admin/roles/${name}/permissions`, { method: 'PUT', body: { permissions: unique } }));
    },
    async audit(filters = {}) {
      const query = auditQuery(filters);
      return pageView(await client.request(`/admin/audit-logs${query}`), auditView);
    },
    async auditDetail(id) {
      const n = Number(id);
      if (!Number.isSafeInteger(n) || n <= 0) throw new ApiError(400, 'Invalid audit log ID.');
      return auditView(await client.request(`/admin/audit-logs/${n}`));
    }
  };
}

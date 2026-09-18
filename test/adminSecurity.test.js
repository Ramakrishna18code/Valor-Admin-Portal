import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminSecurityServices, permissionView, roleView, auditView } from '../src/api/adminSecurity.js';

const page = items => ({items,page:0,size:20,totalElements:items.length,totalPages:1});
const perm = {id:1,code:'AUDIT_READ',description:'Read audit logs',category:'Security'};
const role = {id:2,name:'ADMIN',description:'Admin',enabled:true,systemRole:true,permissions:['ROLE_READ'],createdAt:'2026-01-01T00:00:00',updatedAt:'2026-01-01T00:00:00'};
const audit = {id:3,actorUserId:9,actorRole:'SUPER_ADMIN',action:'ROLE_PERMISSIONS_UPDATE',entityType:'ROLE',entityId:'ADMIN',resultStatus:'SUCCESS',summary:'Updated',beforeSummary:'permissions=[]',afterSummary:'permissions=[AUDIT_READ]',createdAt:'2026-01-01T00:00:00'};

test('roles and permissions use canonical admin security endpoints', async () => {
  const calls = [];
  const api = createAdminSecurityServices({request: async (path, options) => { calls.push({path, options}); if(path === '/admin/permissions') return [perm]; if(path === '/admin/roles') return [role]; return {...role, permissions:['AUDIT_READ']}; }});
  assert.equal((await api.permissions())[0].code, 'AUDIT_READ');
  assert.equal((await api.roles())[0].name, 'ADMIN');
  assert.equal((await api.role('ADMIN')).name, 'ADMIN');
  assert.deepEqual((await api.updateRolePermissions('ADMIN', ['audit_read','AUDIT_READ'])).permissions, ['AUDIT_READ']);
  assert.deepEqual(calls.map(call => call.path), ['/admin/permissions','/admin/roles','/admin/roles/ADMIN','/admin/roles/ADMIN/permissions']);
  assert.deepEqual(calls[3].options.body, {permissions:['AUDIT_READ']});
});

test('audit uses safe paged mapping and rejects sensitive payloads', async () => {
  const calls = [];
  const api = createAdminSecurityServices({request: async path => { calls.push(path); return path.includes('/3') ? audit : page([audit]); }});
  assert.equal((await api.audit({action:'role_permissions_update',page:0,size:20})).items[0].action, 'ROLE_PERMISSIONS_UPDATE');
  assert.equal((await api.auditDetail(3)).entityType, 'ROLE');
  assert.equal(calls[0], '/admin/audit-logs?page=0&size=20&action=role_permissions_update');
  assert.throws(() => auditView({...audit, summary:'password=secret'}), {status:502});
});

test('admin security validators reject malformed data and unsafe edits', async () => {
  assert.equal(permissionView(perm).category, 'Security');
  assert.equal(roleView(role).permissions[0], 'ROLE_READ');
  await assert.rejects(() => createAdminSecurityServices({}).role('OWNER'), {status:400});
  await assert.rejects(() => createAdminSecurityServices({}).updateRolePermissions('SUPER_ADMIN', []), {status:400});
  assert.throws(() => permissionView({id:1,code:'bad'}), {status:502});
  assert.throws(() => roleView({...role,name:'OWNER'}), {status:502});
});

test('active roles and audit modules are wired', async () => {
  const {readFile} = await import('node:fs/promises');
  const main = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
  assert(main.includes('<RolesPage'));
  assert(main.includes('<AuditLogPage'));
  assert(main.includes("'roles','audit'"));
});

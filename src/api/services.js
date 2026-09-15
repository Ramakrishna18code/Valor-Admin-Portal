import { ApiError } from './client.js';
export const isAdmin = user => ['ADMIN', 'SUPER_ADMIN'].includes(user?.role);
export const routeState = (loading, user) => loading ? 'loading' : isAdmin(user) ? 'authenticated' : 'login';
export const summaryFields = ['totalCustomers','totalLifts','totalRequests','pendingJobs','completedJobs','emergencyJobs','totalTechnicians','totalAmcs'];
export function mapSummary(data) {
  if (!data || summaryFields.some(key => !Number.isSafeInteger(data[key]) || data[key] < 0)) throw new ApiError(502, 'Valor returned an invalid dashboard summary.');
  return Object.fromEntries(summaryFields.map(key => [key, data[key]]));
}
export function mapHealth(data, baseUrl) {
  if (!data || data.status !== 'UP') throw new ApiError(502, 'Valor returned an invalid health response.');
  return { status: 'Connected', backendUrl: baseUrl, checkedAt: new Date().toISOString() };
}
export function createServices(client, session) {
  async function me() {
    const user = await client.request('/me');
    if (!isAdmin(user) || !user.userId) { session.clear(); throw new ApiError(403, 'Only administrators can enter this portal.'); }
    return user;
  }
  return {
    auth: {
      async login({email, password}) {
        session.clear();
        const data = await client.request('/auth/login/admin', {public:true, method:'POST', body:{email:email.trim().toLowerCase(), password}});
        if (!isAdmin(data) || !data.userId) throw new ApiError(403, 'Only administrators can enter this portal.');
        try { session.set(data); return await me(); } catch (error) { session.clear(); throw error; }
      },
      me,
      async restore() { if (!session.get()) return null; try { return await me(); } catch (error) { session.clear(); throw error; } },
      async logout() {
        try { if (session.get()) await client.request('/auth/logout', {method:'POST', body:() => ({refreshToken:session.get()?.refreshToken})}); }
        finally { session.clear(); }
      }
    },
    dashboard: {
      summary: async () => mapSummary(await client.request('/admin/dashboard/summary')),
      health: async () => mapHealth(await client.request('/health', { public: true }), client.baseUrl)
    }
  };
}

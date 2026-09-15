export class ApiError extends Error {
  constructor(status, message) { super(message); this.name = 'ApiError'; this.status = status; }
}
export function resolveBaseUrl(value) {
  const base = (value || 'http://localhost:8081').trim().replace(/\/+$/, '');
  const url = new URL(base);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('VITE_API_BASE_URL must be an HTTP backend origin');
  return base;
}
function message(status) {
  return ({400:'The request could not be processed. Check your details.',401:'Your session has expired. Please sign in again.',403:'You do not have permission to access this resource.',404:'The requested resource was not found.',409:'This request conflicts with existing data.',429:'Too many requests. Please try again shortly.'})[status] || 'Valor service is unavailable. Please try again.';
}
export function createApiClient({ baseUrl, session, fetchImpl = globalThis.fetch }) {
  const base = resolveBaseUrl(baseUrl);
  let refreshing = null;
  async function send(path, options, tokens) {
    if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/api/') || path.includes('..')) throw new Error('Use a relative v1 resource path');
    let response;
    try {
      const body = typeof options.body === 'function' ? options.body() : options.body;
      response = await fetchImpl(base + '/api/v1' + path, {
        method: options.method || 'GET', signal: options.signal,
        headers: { Accept: 'application/json', ...(body !== undefined ? {'Content-Type':'application/json'} : {}), ...(tokens ? {Authorization: 'Bearer ' + tokens.accessToken} : {}) },
        ...(body !== undefined ? {body: JSON.stringify(body)} : {})
      });
    } catch (error) { if (error.name === 'AbortError') throw error; throw new ApiError(0, 'Cannot reach Valor. Check your connection and try again.'); }
    let payload;
    try { payload = await response.json(); } catch { throw new ApiError(response.ok ? 502 : response.status, message(response.status)); }
    const serverMessage = [400, 403, 404, 409].includes(response.status) && /^[A-Z][A-Za-z0-9 ,.'-]+[.!?]?$/.test(payload?.message || '') ? payload.message : null;
    if (!response.ok) throw new ApiError(response.status, serverMessage || message(response.status));
    if (!payload || payload.success !== true || payload.status !== response.status || !Object.hasOwn(payload, 'data')) throw new ApiError(502, 'Valor returned an invalid response.');
    return payload.data;
  }
  function refresh() {
    if (refreshing) return refreshing;
    const original = session.get();
    if (!original) return Promise.reject(new ApiError(401, message(401)));
    refreshing = (async () => {
      try {
        const tokens = await send('/auth/refresh', {method:'POST', body:{refreshToken:original.refreshToken}}, null);
        if (session.get() !== original) throw new ApiError(401, message(401));
        if (typeof tokens?.accessToken !== 'string' || !tokens.accessToken || typeof tokens?.refreshToken !== 'string' || !tokens.refreshToken) throw new ApiError(502, 'Invalid session response');
        session.set(tokens);
      } catch {
        if (session.get() === original) session.clear();
        throw new ApiError(401, message(401));
      } finally { refreshing = null; }
    })();
    return refreshing;
  }
  async function request(path, options = {}) {
    const generation = session.generation();
    const original = options.public ? null : session.get();
    if (!options.public && !original) throw new ApiError(401, message(401));
    try { return await send(path, options, original); }
    catch (error) {
      if (error.status !== 401 || options.public) throw error;
      if (!session.get() || session.generation() !== generation) throw error;
      // A late 401 for the old token shares the rotation already completed by another request.
      if (session.get() === original) await refresh();
      const retriedSession = session.get();
      try { return await send(path, options, retriedSession); }
      catch (retryError) { if (retryError.status === 401 && session.get() === retriedSession) session.clear(); throw retryError; }
    }
  }
  return { request, refresh };
}

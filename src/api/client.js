const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const defaultApiBaseUrl = import.meta.env.DEV ? 'http://localhost:8081' : 'https://valor-backend-rk.onrender.com';
const API_BASE_URL = (configuredApiBaseUrl || defaultApiBaseUrl).replace(/\/+$/, '');

export const session = {
  get token() { return localStorage.getItem('valor_access_token'); },
  set token(value) { value ? localStorage.setItem('valor_access_token', value) : localStorage.removeItem('valor_access_token'); },
  clear() { this.token = null; }
};

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(options.headers || {})
    }
  });

  if (response.status === 401) {
    session.clear();
    window.dispatchEvent(new CustomEvent('valor:unauthorized'));
  }
  if (response.status === 403) {
    // This is an admin-only portal. Require a fresh login for forbidden sessions.
    session.clear();
    window.dispatchEvent(new CustomEvent('valor:unauthorized'));
    throw new Error('Your admin session is no longer valid. Please sign in again.');
  }
  if (response.status === 409) throw new Error('This change conflicts with existing data.');
  if (response.status === 429) throw new Error('Too many requests. Please try again shortly.');
  if (!response.ok) throw new Error('Valor service is temporarily unavailable.');

  const payload = await response.json();
  return payload?.data ?? payload;
}



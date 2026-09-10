const KEY = 'valor_admin_session_v1';
export function createSession(storage) {
  let value = null, generation = 0;
  const listeners = new Set();
  try {
    const saved = JSON.parse(storage?.getItem(KEY) || 'null');
    if (saved && typeof saved.accessToken === 'string' && saved.accessToken && typeof saved.refreshToken === 'string' && saved.refreshToken) value = {accessToken:saved.accessToken, refreshToken:saved.refreshToken};
    else storage?.removeItem(KEY);
  } catch { try { storage?.removeItem(KEY); } catch { /* Memory-only fallback. */ } }
  return {
    get: () => value,
    generation: () => generation,
    set(tokens) {
      if (typeof tokens?.accessToken !== 'string' || !tokens.accessToken || typeof tokens?.refreshToken !== 'string' || !tokens.refreshToken) throw new Error('Invalid session');
      const next = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
      storage?.setItem(KEY, JSON.stringify(next));
      value = next;
    },
    clear() { value = null; generation++; try { storage?.removeItem(KEY); } catch { /* Session is cleared in memory even if storage is unavailable. */ } listeners.forEach(fn => fn()); },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
}

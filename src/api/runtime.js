import { createSession } from './session.js';
import { createApiClient } from './client.js';
import { createServices } from './services.js';
// Remove the retired token; it has no refresh token and is not a restorable session.
try { window.localStorage.removeItem('valor_access_token'); } catch { /* Storage can be disabled. */ }
let storage;
try { storage = window.sessionStorage; } catch { /* Memory-only sessions still work. */ }
export const session = createSession(storage);
export const services = createServices(createApiClient({baseUrl:import.meta.env.VITE_API_BASE_URL, session}), session);

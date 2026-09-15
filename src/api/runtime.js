import { createSession } from './session.js';
import { createApiClient } from './client.js';
import { createServices } from './services.js';
import { createAssetServices } from './assets.js';
// Remove the retired token; it has no refresh token and is not a restorable session.
try { window.localStorage.removeItem('valor_access_token'); } catch { /* Storage can be disabled. */ }
let storage;
try { storage = window.sessionStorage; } catch { /* Memory-only sessions still work. */ }
export const session = createSession(storage);
const client = createApiClient({baseUrl:import.meta.env.VITE_API_BASE_URL, session});
export const services = createServices(client, session);
export const assetServices = createAssetServices(client);

import { createWorkflowServices } from './workflow.js';
export const workflowServices = createWorkflowServices(client);

import { createNotificationServices } from './notifications.js';
export const notificationServices = createNotificationServices(client);

import { createVisitServices } from './visits.js';
export const visitServices = createVisitServices(client);

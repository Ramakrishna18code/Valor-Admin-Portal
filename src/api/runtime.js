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

import { createCustomerServices } from './customers.js';
export const customerServices = createCustomerServices(client);

import { createSettingsServices } from './settings.js';
export const settingsServices = createSettingsServices(client);

import { createPaymentServices } from './payments.js';
export const paymentServices = createPaymentServices(client);

import { createFinanceServices } from './finance.js';
export const financeServices = createFinanceServices(client);

import { createAdminSecurityServices } from './adminSecurity.js';
export const adminSecurityServices = createAdminSecurityServices(client);

import { createPhase15Services } from './phase15.js';
export const phase15Services = createPhase15Services(client);

import { createCommunicationServices } from './communications.js';
export const communicationServices = createCommunicationServices(client);

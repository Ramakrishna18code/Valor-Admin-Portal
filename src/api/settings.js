import { ApiError } from './client.js';

export const currencies = ['INR', 'USD', 'AED'];
export const dateFormats = ['DD MMM YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];

const positiveInt = (value, label, min, max) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new ApiError(400, `${label} must be between ${min} and ${max}.`);
  return parsed;
};
const text = (value, label, required, max) => {
  const result = String(value ?? '').trim();
  if (required && !result) throw new ApiError(400, `${label} is required.`);
  if (result.length > max) throw new ApiError(400, `${label} is too long.`);
  return result || null;
};
const email = value => {
  const result = text(value, 'Support email', false, 254);
  if (result && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result)) throw new ApiError(400, 'Enter a valid support email.');
  return result;
};
const payload = draft => {
  const currency = text(draft.currency, 'Currency', true, 3).toUpperCase();
  if (!currencies.includes(currency)) throw new ApiError(400, 'Unsupported currency.');
  const dateFormat = text(draft.dateFormat, 'Date format', true, 20);
  if (!dateFormats.includes(dateFormat)) throw new ApiError(400, 'Unsupported date format.');
  return {
    companyName: text(draft.companyName, 'Company name', true, 200),
    supportEmail: email(draft.supportEmail),
    supportPhone: text(draft.supportPhone, 'Support phone', false, 20),
    timezone: text(draft.timezone, 'Timezone', true, 64),
    currency,
    dateFormat,
    defaultVisitDurationMinutes: positiveInt(draft.defaultVisitDurationMinutes, 'Default visit duration', 15, 480),
    maintenanceReminderDays: positiveInt(draft.maintenanceReminderDays, 'Maintenance reminder days', 0, 365),
    emergencyResponseTargetMinutes: positiveInt(draft.emergencyResponseTargetMinutes, 'Emergency target minutes', 5, 1440),
    emailNotificationsEnabled: Boolean(draft.emailNotificationsEnabled),
    smsNotificationsEnabled: Boolean(draft.smsNotificationsEnabled),
    autoAssignRequestsEnabled: Boolean(draft.autoAssignRequestsEnabled)
  };
};
const view = data => {
  if (!data || typeof data.companyName !== 'string' || !currencies.includes(data.currency) || !dateFormats.includes(data.dateFormat)) {
    throw new ApiError(502, 'Valor returned invalid settings.');
  }
  return data;
};

export function createSettingsServices(client) {
  return {
    async get() { return view(await client.request('/admin/settings')); },
    async update(draft) { return view(await client.request('/admin/settings', { method: 'PUT', body: payload(draft) })); }
  };
}

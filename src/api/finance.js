import { ApiError } from './client.js';

const transactionTypes = new Set(['PAYMENT', 'REFUND']);
const transactionStatuses = new Set(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'REQUESTED']);
export const reportTypes = ['revenue', 'payments', 'invoices', 'services', 'customers', 'technicians'];

function pageQuery(filters = {}) {
  const page = Number(filters.page ?? 0), size = Number(filters.size ?? 20);
  if (!Number.isInteger(page) || page < 0 || !Number.isInteger(size) || size < 1 || size > 100) throw new ApiError(400, 'Invalid pagination.');
  const params = new URLSearchParams({page:String(page), size:String(size)});
  for (const key of ['sort','status','type','dateFrom','dateTo','q','customerProfileId']) {
    const value = filters[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') params.set(key, String(value).trim());
  }
  return params.toString();
}

function transaction(row) {
  if (!row || typeof row.id !== 'string' || !transactionTypes.has(row.type) || !transactionStatuses.has(row.status)) throw new ApiError(502, 'Valor returned an invalid transaction.');
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    amount: Number(row.amount),
    currency: row.currency || 'INR',
    customerProfileId: row.customerProfileId ?? null,
    invoiceId: row.invoiceId ?? null,
    invoiceNumber: row.invoiceNumber ?? null,
    paymentId: row.paymentId ?? null,
    refundId: row.refundId ?? null,
    serviceRequestId: row.serviceRequestId ?? null,
    amcContractId: row.amcContractId ?? null,
    purpose: row.purpose ?? null,
    providerReference: row.providerReference ?? null,
    razorpayOrderId: row.razorpayOrderId ?? null,
    razorpayPaymentId: row.razorpayPaymentId ?? null,
    razorpayRefundId: row.razorpayRefundId ?? null,
    gatewayStatus: row.gatewayStatus ?? null,
    gatewaySyncedAt: row.gatewaySyncedAt ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null
  };
}

function page(value) {
  if (!value || !Array.isArray(value.items)) throw new ApiError(502, 'Valor returned invalid transaction data.');
  return {...value, items:value.items.map(transaction)};
}

function report(value, type) {
  if (!value || typeof value.type !== 'string' || !value.summary || !Array.isArray(value.rows)) throw new ApiError(502, 'Valor returned invalid report data.');
  return {type: value.type || type.toUpperCase(), summary: value.summary, rows: value.rows};
}

function reportQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const key of ['dateFrom','dateTo','status','customerProfileId','technicianProfileId']) {
    const value = filters[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') params.set(key, String(value).trim());
  }
  return params.toString();
}

export function createFinanceServices(client) {
  return {
    async transactions(filters) {
      const query = pageQuery(filters);
      return page(await client.request(`/admin/transactions?${query}`));
    },
    async transaction(id) {
      return transaction(await client.request(`/admin/transactions/${encodeURIComponent(String(id))}`));
    },
    async transactionExport(filters = {}) {
      return client.raw(`/admin/transactions.csv?${pageQuery({...filters, page:0, size:100})}`);
    },
    async report(type, filters) {
      if (!reportTypes.includes(type)) throw new ApiError(400, 'Invalid report type.');
      const query = reportQuery(filters);
      return report(await client.request(`/admin/reports/${type}${query ? `?${query}` : ''}`), type);
    },
    async reportExport(type, filters = {}) {
      if (!reportTypes.includes(type)) throw new ApiError(400, 'Invalid report type.');
      const query = reportQuery(filters);
      return client.raw(`/admin/reports/${type}.csv${query ? `?${query}` : ''}`);
    }
  };
}

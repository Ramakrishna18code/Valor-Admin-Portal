import { ApiError } from './client.js';

const statuses = new Set(['PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED']);
const refundStatuses = new Set(['REQUESTED', 'PROCESSING', 'SUCCEEDED', 'FAILED']);

function asArrayPage(value, name) {
  if (!value || !Array.isArray(value.items)) throw new ApiError(502, `Valor returned invalid ${name} data.`);
  return value;
}

function payment(row) {
  if (!row || !Number.isSafeInteger(row.id) || !statuses.has(row.status)) throw new ApiError(502, 'Valor returned an invalid payment.');
  return {
    id: row.id,
    customerProfileId: row.customerProfileId ?? null,
    serviceRequestId: row.serviceRequestId ?? null,
    amcContractId: row.amcContractId ?? null,
    invoiceId: row.invoiceId ?? null,
    amount: Number(row.amount),
    currency: row.currency || 'INR',
    purpose: row.purpose || 'OTHER',
    status: row.status,
    providerReference: row.providerReference ?? null,
    razorpayOrderId: row.razorpayOrderId ?? null,
    razorpayPaymentId: row.razorpayPaymentId ?? null,
    gatewayStatus: row.gatewayStatus ?? null,
    gatewaySyncedAt: row.gatewaySyncedAt ?? null,
    failureReason: row.failureReason ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null
  };
}

function refund(row) {
  if (!row || !Number.isSafeInteger(row.id) || !refundStatuses.has(row.status)) throw new ApiError(502, 'Valor returned an invalid refund.');
  return {
    id: row.id,
    paymentId: row.paymentId,
    amount: Number(row.amount),
    currency: row.currency || 'INR',
    status: row.status,
    razorpayRefundId: row.razorpayRefundId ?? null,
    gatewayStatus: row.gatewayStatus ?? null,
    reason: row.reason ?? null,
    createdAt: row.createdAt ?? null,
    updatedAt: row.updatedAt ?? null
  };
}

function issue(row) {
  if (!row || typeof row.type !== 'string' || typeof row.detail !== 'string') throw new ApiError(502, 'Valor returned an invalid reconciliation issue.');
  return { paymentId: row.paymentId ?? null, invoiceId: row.invoiceId ?? null, type: row.type, detail: row.detail };
}

function refundPayload(input) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, 'Refund amount must be greater than zero.');
  return { amount, reason: input.reason?.trim() || null };
}

export function createPaymentServices(client) {
  return {
    async list(page = 0, size = 20) {
      const data = asArrayPage(await client.request(`/payments?page=${page}&size=${size}`), 'payment');
      return { ...data, items: data.items.map(payment) };
    },
    async detail(id) {
      return payment(await client.request(`/payments/${encodeURIComponent(String(id))}`));
    },
    async refunds(id) {
      const rows = await client.request(`/payments/${encodeURIComponent(String(id))}/refunds`);
      if (!Array.isArray(rows)) throw new ApiError(502, 'Valor returned invalid refund data.');
      return rows.map(refund);
    },
    async requestRefund(id, input) {
      return payment(await client.request(`/payments/${encodeURIComponent(String(id))}/refunds`, { method: 'POST', body: refundPayload(input) }));
    },
    async reconciliation() {
      const rows = await client.request('/admin/payments/reconciliation');
      if (!Array.isArray(rows)) throw new ApiError(502, 'Valor returned invalid reconciliation data.');
      return rows.map(issue);
    }
  };
}

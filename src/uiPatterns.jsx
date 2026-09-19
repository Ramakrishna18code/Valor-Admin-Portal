import React, { useMemo, useState } from 'react';

export const pageSize = 10;
export const detailPageSize = 5;

export function slug(value) {
  return String(value || 'neutral').toLowerCase().replace(/_/g, '-').replace(/\s+/g, '-');
}

export function pretty(value) {
  return String(value || 'Unknown').replace(/_/g, ' ').toLowerCase();
}

export function StatusChip({ value }) {
  return <span className={`badge status-chip ${slug(value)}`}><i />{pretty(value)}</span>;
}

export function PriorityChip({ value }) {
  return <span className={`badge priority-chip ${slug(value)}`}><i />{pretty(value)}</span>;
}

export function AvailabilityDot({ value }) {
  const label = String(value || 'UNKNOWN').replace(/_/g, ' ');
  return <span className={`availability-dot-wrap ${slug(value)}`}><i className="availability-dot" />{label.toLowerCase()}</span>;
}

export function PagerButtons({ page, totalPages, totalItems, onPage, busy = false, pageSize: size = pageSize }) {
  const safeTotal = Math.max(1, totalPages || 1);
  const start = totalItems ? page * size + 1 : 0;
  const end = totalItems ? Math.min(totalItems, (page + 1) * size) : 0;
  return <div className="pager pager-buttons"><span>{totalItems ? `${start}-${end} of ${totalItems}` : '0 results'}</span><button type="button" className="secondary-btn" disabled={busy || page <= 0} onClick={() => onPage(page - 1)}>Previous</button><button type="button" className="secondary-btn" disabled={busy || page + 1 >= safeTotal} onClick={() => onPage(page + 1)}>Next</button></div>;
}

export function useClientPager(rows, size = pageSize) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil((rows?.length || 0) / size));
  const currentPage = Math.min(page, totalPages - 1);
  const items = useMemo(() => (rows || []).slice(currentPage * size, currentPage * size + size), [rows, currentPage, size]);
  return { page: currentPage, setPage, totalPages, items, totalItems: rows?.length || 0, pageSize: size };
}

export function DataTable({ columns, rows, empty = 'No records found.', onRow }) {
  if (!rows?.length) return <div className="empty-state"><b>{empty}</b></div>;
  return <div className="asset-table modern-table"><table><thead><tr>{columns.map(column => <th key={column.key}>{column.label}</th>)}{onRow && <th>Action</th>}</tr></thead><tbody>{rows.map(row => <tr key={row.id ?? row.customerProfileId ?? row.notificationId ?? JSON.stringify(row)}>{columns.map(column => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}{onRow && <td><button type="button" className="secondary-btn" onClick={() => onRow(row)}>View details</button></td>}</tr>)}</tbody></table></div>;
}

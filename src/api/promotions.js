import { ApiError } from './client.js';

const validId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;
const clean = value => value == null ? '' : String(value).trim();

export function createPromotionServices(client) {
  const normalize = row => {
    if (!row || !validId(row.id)) throw new ApiError(502, 'Invalid promotion card response.');
    return row;
  };
  return {
    async list() {
      const rows = await client.request('/admin/amc-promotions');
      if (!Array.isArray(rows)) throw new ApiError(502, 'Invalid promotion card list response.');
      return rows.map(normalize);
    },
    async update(id, draft) {
      if (!validId(id)) throw new ApiError(400, 'Choose a valid promotion card.');
      const body = {
        quote: clean(draft.quote),
        title: clean(draft.title),
        supportingText: clean(draft.supportingText),
        ctaLabel: clean(draft.ctaLabel),
        imageUrl: clean(draft.imageUrl) || null,
        backgroundColor: clean(draft.backgroundColor) || '#EAF5FF',
        active: Boolean(draft.active)
      };
      if (!body.quote || !body.title || !body.supportingText || !body.ctaLabel) throw new ApiError(400, 'Quote, title, supporting text and CTA are required.');
      if (!/^#[0-9A-Fa-f]{6}$/.test(body.backgroundColor)) throw new ApiError(400, 'Use a valid hex background color.');
      return normalize(await client.request('/admin/amc-promotions/' + Number(id), { method: 'PUT', body }));
    }
  };
}

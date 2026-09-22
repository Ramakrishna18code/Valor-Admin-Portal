import React, { useEffect, useState } from 'react';
import { RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { ErrorState } from './assetModules.jsx';

export function AmcPromoCardsPage({ api }) {
  const [cards, setCards] = useState([]), [drafts, setDrafts] = useState({}), [loading, setLoading] = useState(true), [saving, setSaving] = useState(null), [error, setError] = useState(null), [notice, setNotice] = useState('');
  const load = () => {
    setLoading(true); setError(null); setNotice('');
    api.list().then(rows => { setCards(rows); setDrafts(Object.fromEntries(rows.map(row => [row.id, row]))); }).catch(setError).finally(() => setLoading(false));
  };
  useEffect(load, [api]);
  const updateDraft = (id, key, value) => setDrafts(current => ({ ...current, [id]: { ...current[id], [key]: value } }));
  const save = async id => {
    setSaving(id); setError(null); setNotice('');
    try {
      const saved = await api.update(id, drafts[id]);
      setCards(current => current.map(card => card.id === id ? saved : card));
      setDrafts(current => ({ ...current, [id]: saved }));
      setNotice('Promotion card saved.');
    } catch (failure) { setError(failure); }
    finally { setSaving(null); }
  };
  return <><div className="page-header"><div><div className="eyebrow">ASSETS</div><h1>AMC Promo Cards</h1><p>Edit the four promotional cards shown in the customer app Home AMC section.</p></div><button className="secondary-btn" disabled={loading || saving} onClick={load}><RefreshCw size={15}/>Refresh</button></div>
    {notice && <p role="status">{notice}</p>}<ErrorState error={error}/>
    {loading ? <section className="panel empty-state" role="status">Loading promo cards...</section> : <section className="promo-card-grid">{cards.map(card => {
      const draft = drafts[card.id] || card;
      return <article className="panel promo-editor-card" key={card.id}>
        <div className="promo-editor-preview" style={{ backgroundColor: draft.backgroundColor || '#EAF5FF' }}>
          <div><span>{draft.quote}</span><b>{draft.title}</b><p>{draft.supportingText}</p><button type="button">{draft.ctaLabel}</button></div><ShieldCheck size={52}/>
        </div>
        <div className="promo-editor-form">
          <label>Top quote<input value={draft.quote || ''} maxLength={80} onChange={event => updateDraft(card.id, 'quote', event.target.value)} /></label>
          <label>Main title<input value={draft.title || ''} maxLength={120} onChange={event => updateDraft(card.id, 'title', event.target.value)} /></label>
          <label>Supporting text<textarea value={draft.supportingText || ''} maxLength={240} onChange={event => updateDraft(card.id, 'supportingText', event.target.value)} /></label>
          <label>CTA label<input value={draft.ctaLabel || ''} maxLength={60} onChange={event => updateDraft(card.id, 'ctaLabel', event.target.value)} /></label>
          <label>Image URL<input value={draft.imageUrl || ''} maxLength={500} onChange={event => updateDraft(card.id, 'imageUrl', event.target.value)} /></label>
          <label>Background<input type="color" value={draft.backgroundColor || '#EAF5FF'} onChange={event => updateDraft(card.id, 'backgroundColor', event.target.value)} /></label>
          <label className="promo-active"><input type="checkbox" checked={!!draft.active} onChange={event => updateDraft(card.id, 'active', event.target.checked)} /> Active</label>
          <button className="primary-btn" disabled={saving === card.id} onClick={() => save(card.id)}><Save size={15}/>{saving === card.id ? 'Saving...' : 'Save card ' + card.slotNumber}</button>
        </div>
      </article>;
    })}</section>}
  </>;
}

import { getStore } from '../lib/store.js';
import { MONTH_RE, isPlainObject, query, readJson, send, withAuth } from '../lib/http.js';

// PUT ?month=AAAA-MM {notes} : notes du récap mensuel (ce qui a marché / posé problème)
export default withAuth(async (req, res) => {
  if (req.method !== 'PUT') return send(res, 405, { error: 'Méthode non autorisée' });
  const { month } = query(req);
  if (!MONTH_RE.test(month || '')) return send(res, 400, { error: 'Mois invalide' });
  const { notes } = await readJson(req);
  if (!isPlainObject(notes) || JSON.stringify(notes).length > 50 * 1024) {
    return send(res, 400, { error: 'Notes invalides' });
  }
  await getStore().putMonth(month, notes);
  send(res, 200, { ok: true });
});

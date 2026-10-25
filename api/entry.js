import { getStore } from '../lib/store.js';
import { DATE_RE, isPlainObject, query, readJson, send, withAuth } from '../lib/http.js';

const MAX_ENTRY = 50 * 1024;

// PUT ?date=AAAA-MM-JJ {entry} : enregistre une journée — DELETE ?date= : la supprime
export default withAuth(async (req, res) => {
  const { date } = query(req);
  if (!DATE_RE.test(date || '')) return send(res, 400, { error: 'Date invalide' });
  const store = getStore();

  if (req.method === 'PUT') {
    const { entry } = await readJson(req);
    if (!isPlainObject(entry)) return send(res, 400, { error: 'Entrée invalide' });
    if (JSON.stringify(entry).length > MAX_ENTRY) return send(res, 413, { error: 'Entrée trop volumineuse' });
    await store.putEntry(date, { ...entry, date });
    return send(res, 200, { ok: true });
  }
  if (req.method === 'DELETE') {
    await store.deleteEntry(date);
    return send(res, 200, { ok: true });
  }
  send(res, 405, { error: 'Méthode non autorisée' });
});

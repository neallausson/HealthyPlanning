import { getStore } from '../lib/store.js';
import { isPlainObject, readJson, send, withAuth } from '../lib/http.js';

// PUT {settings} : objectifs, paliers, compléments, listes d'aliments…
export default withAuth(async (req, res) => {
  if (req.method !== 'PUT') return send(res, 405, { error: 'Méthode non autorisée' });
  const { settings } = await readJson(req);
  if (!isPlainObject(settings) || JSON.stringify(settings).length > 200 * 1024) {
    return send(res, 400, { error: 'Réglages invalides' });
  }
  await getStore().putSettings(settings);
  send(res, 200, { ok: true });
});

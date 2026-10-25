import { getStore } from '../lib/store.js';
import { DATE_RE, MONTH_RE, isPlainObject, readJson, send, withAuth } from '../lib/http.js';

function pick(obj, re) {
  const out = {};
  if (isPlainObject(obj)) {
    for (const [k, v] of Object.entries(obj)) if (re.test(k) && isPlainObject(v)) out[k] = v;
  }
  return out;
}

// POST {backup, mode: 'merge' | 'replace'} : restaure une sauvegarde JSON exportée depuis le site
export default withAuth(async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  const { backup, mode } = await readJson(req);
  if (!isPlainObject(backup)) return send(res, 400, { error: 'Sauvegarde invalide' });

  const store = getStore();
  const incoming = {
    entries: pick(backup.entries, DATE_RE),
    months: pick(backup.months, MONTH_RE),
    settings: isPlainObject(backup.settings) ? backup.settings : null,
  };

  if (mode === 'replace') {
    await store.replaceAll(incoming);
  } else {
    const current = await store.getAll();
    await store.replaceAll({
      entries: { ...current.entries, ...incoming.entries },
      months: { ...current.months, ...incoming.months },
      settings: incoming.settings || current.settings,
    });
  }
  send(res, 200, {
    ok: true,
    entries: Object.keys(incoming.entries).length,
    months: Object.keys(incoming.months).length,
  });
});

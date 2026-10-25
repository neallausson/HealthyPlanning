import { getStore } from '../lib/store.js';
import { send, withAuth } from '../lib/http.js';

// GET : toutes les données (entrées journalières, notes mensuelles, réglages)
export default withAuth(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, { error: 'Méthode non autorisée' });
  const store = getStore();
  const data = await store.getAll();
  send(res, 200, { ...data, storage: store.kind });
});

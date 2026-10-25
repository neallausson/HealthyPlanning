import { checkPassword, createSessionCookie, isConfigured } from '../lib/auth.js';
import { readJson, send } from '../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  if (!isConfigured()) {
    return send(res, 500, { error: 'APP_PASSWORD n’est pas configuré sur le serveur (voir README).' });
  }
  let body = {};
  try { body = await readJson(req); } catch { /* corps invalide = mauvais mot de passe */ }
  if (!checkPassword(body.password)) {
    // Ralentit les essais de mot de passe à la chaîne
    await new Promise((r) => setTimeout(r, 800));
    return send(res, 401, { error: 'Mot de passe incorrect' });
  }
  res.setHeader('Set-Cookie', createSessionCookie(req));
  send(res, 200, { ok: true });
}

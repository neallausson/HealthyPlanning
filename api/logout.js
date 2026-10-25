import { clearSessionCookie } from '../lib/auth.js';
import { send } from '../lib/http.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' });
  res.setHeader('Set-Cookie', clearSessionCookie(req));
  send(res, 200, { ok: true });
}

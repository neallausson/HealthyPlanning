import { isAuthenticated, isConfigured } from '../lib/auth.js';
import { send } from '../lib/http.js';

export default function handler(req, res) {
  send(res, 200, { authenticated: isAuthenticated(req), configured: isConfigured() });
}

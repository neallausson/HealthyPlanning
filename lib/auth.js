// Authentification par mot de passe unique (APP_PASSWORD) + cookie de session signé (HMAC).
import crypto from 'node:crypto';

const COOKIE = 'hp_session';
const MAX_AGE = 60 * 60 * 24 * 180; // 180 jours

function secret() {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  // Sans SESSION_SECRET, la clé dérive du mot de passe : le changer déconnecte tout le monde.
  return process.env.SESSION_SECRET
    || crypto.createHash('sha256').update(`healthy-planning:${password}`).digest('hex');
}

function sign(payload) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function isHttps(req) {
  return String(req.headers['x-forwarded-proto'] || '').includes('https') || !!process.env.VERCEL;
}

function cookie(req, value, maxAge) {
  const secure = isHttps(req) ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export const isConfigured = () => !!process.env.APP_PASSWORD;

export function checkPassword(input) {
  const password = process.env.APP_PASSWORD;
  if (!password || typeof input !== 'string') return false;
  return safeEqual(input, password);
}

export function createSessionCookie(req) {
  const payload = String(Date.now() + MAX_AGE * 1000);
  return cookie(req, `${payload}.${sign(payload)}`, MAX_AGE);
}

export const clearSessionCookie = (req) => cookie(req, '', 0);

export function isAuthenticated(req) {
  if (!secret()) return false;
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return false;
  const [payload, sig] = token.split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  return Number(payload) > Date.now();
}

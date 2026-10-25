// Petits utilitaires HTTP compatibles Vercel et serveur Node local.
import { isAuthenticated } from './auth.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const MONTH_RE = /^\d{4}-\d{2}$/;
const MAX_BODY = 5 * 1024 * 1024;

export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

export async function readJson(req) {
  // Sur Vercel, le corps est déjà parsé dans req.body
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return req.body ? JSON.parse(req.body) : {};
    if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error('Corps de requête trop volumineux');
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

export function query(req) {
  return Object.fromEntries(new URL(req.url, 'http://localhost').searchParams);
}

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

// Enveloppe un handler : exige une session valide et renvoie les erreurs en JSON.
export function withAuth(handler) {
  return async (req, res) => {
    if (!isAuthenticated(req)) return send(res, 401, { error: 'Non connecté' });
    try {
      await handler(req, res);
    } catch (err) {
      console.error(err);
      send(res, 500, { error: err.message || 'Erreur serveur' });
    }
  };
}

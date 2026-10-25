// Stockage des données : Upstash Redis (REST) en production, fichier JSON local en développement.
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PREFIX = process.env.STORE_PREFIX || 'hp';
const KEYS = {
  entries: `${PREFIX}:entries`,
  months: `${PREFIX}:months`,
  settings: `${PREFIX}:settings`,
};

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redis(command) {
  const { url, token } = redisConfig();
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(`Redis : ${data.error || res.status}`);
  return data.result;
}

function parseHash(result) {
  const out = {};
  if (Array.isArray(result)) {
    for (let i = 0; i < result.length; i += 2) {
      try { out[result[i]] = JSON.parse(result[i + 1]); } catch { /* valeur corrompue ignorée */ }
    }
  } else if (result && typeof result === 'object') {
    for (const [k, v] of Object.entries(result)) {
      try { out[k] = typeof v === 'string' ? JSON.parse(v) : v; } catch { /* ignorée */ }
    }
  }
  return out;
}

const redisStore = {
  kind: 'redis',
  async getAll() {
    const [entries, months, settings] = await Promise.all([
      redis(['HGETALL', KEYS.entries]),
      redis(['HGETALL', KEYS.months]),
      redis(['GET', KEYS.settings]),
    ]);
    return {
      entries: parseHash(entries),
      months: parseHash(months),
      settings: settings ? JSON.parse(settings) : null,
    };
  },
  putEntry: (date, entry) => redis(['HSET', KEYS.entries, date, JSON.stringify(entry)]),
  deleteEntry: (date) => redis(['HDEL', KEYS.entries, date]),
  putMonth: (ym, data) => redis(['HSET', KEYS.months, ym, JSON.stringify(data)]),
  putSettings: (settings) => redis(['SET', KEYS.settings, JSON.stringify(settings)]),
  async replaceAll({ entries = {}, months = {}, settings = null }) {
    await redis(['DEL', KEYS.entries, KEYS.months]);
    const e = Object.entries(entries).flatMap(([k, v]) => [k, JSON.stringify(v)]);
    const m = Object.entries(months).flatMap(([k, v]) => [k, JSON.stringify(v)]);
    if (e.length) await redis(['HSET', KEYS.entries, ...e]);
    if (m.length) await redis(['HSET', KEYS.months, ...m]);
    if (settings) await redis(['SET', KEYS.settings, JSON.stringify(settings)]);
  },
};

const FILE = path.join(process.cwd(), '.data', 'db.json');

async function readDb() {
  try {
    return JSON.parse(await fs.readFile(FILE, 'utf8'));
  } catch {
    return { entries: {}, months: {}, settings: null };
  }
}

async function writeDb(db) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(db, null, 2));
}

async function updateDb(fn) {
  const db = await readDb();
  fn(db);
  await writeDb(db);
}

const fileStore = {
  kind: 'file',
  getAll: readDb,
  putEntry: (date, entry) => updateDb((db) => { db.entries[date] = entry; }),
  deleteEntry: (date) => updateDb((db) => { delete db.entries[date]; }),
  putMonth: (ym, data) => updateDb((db) => { db.months[ym] = data; }),
  putSettings: (settings) => updateDb((db) => { db.settings = settings; }),
  replaceAll: ({ entries = {}, months = {}, settings = null }) =>
    writeDb({ entries, months, settings }),
};

export function getStore() {
  if (redisConfig()) return redisStore;
  if (process.env.VERCEL) {
    throw new Error('Base de données non configurée : ajoute Upstash Redis au projet Vercel (voir README).');
  }
  return fileStore;
}

// État de l'application + synchronisation avec le serveur.
// Les modifications sont appliquées tout de suite en local, mises en file d'attente
// (localStorage) puis envoyées au serveur ; en cas de coupure réseau, elles repartent plus tard.
import { DEFAULT_SETTINGS } from './config.js';
import { clone } from './utils.js';

const LS_CACHE = 'hp_cache_v1';
const LS_PENDING = 'hp_pending_v1';

export const state = { entries: {}, months: {}, settings: clone(DEFAULT_SETTINGS), storage: null };

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

class Unauthorized extends Error {}

async function request(method, url, body) {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !url.endsWith('/login')) {
    onUnauthorized();
    throw new Unauthorized('Non connecté');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `Erreur ${res.status}`), { status: res.status });
  return data;
}

export const api = {
  session: () => request('GET', '/api/session'),
  login: (password) => request('POST', '/api/login', { password }),
  logout: () => request('POST', '/api/logout'),
  import: (backup, mode) => request('POST', '/api/import', { backup, mode }),
};

// ---- Statut de synchro -------------------------------------------------------
const listeners = new Set();
export let syncStatus = 'idle';
export const onSyncStatus = (fn) => listeners.add(fn);
function setStatus(s) {
  syncStatus = s;
  listeners.forEach((fn) => fn(s));
}

// ---- Réglages : fusion avec les valeurs par défaut ------------------------------
export function mergeSettings(saved) {
  const d = clone(DEFAULT_SETTINGS);
  if (!saved) return d;
  return {
    ...d,
    ...saved,
    water: { ...d.water, ...saved.water },
    sleep: { ...d.sleep, ...saved.sleep },
    alerts: { ...d.alerts, ...saved.alerts },
    supplements: Array.isArray(saved.supplements) ? saved.supplements : d.supplements,
    foods: { ...d.foods, ...saved.foods },
  };
}

// ---- File d'attente locale ----------------------------------------------------
function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage plein ou bloqué */ }
}

let pending = readLS(LS_PENDING, { entries: {}, months: {}, settings: null });
const persistPending = () => writeLS(LS_PENDING, pending);
const hasPending = () => Object.keys(pending.entries).length || Object.keys(pending.months).length || pending.settings;

function saveCache() {
  writeLS(LS_CACHE, { entries: state.entries, months: state.months, settings: state.settings });
}

function applyPending() {
  for (const [date, entry] of Object.entries(pending.entries)) {
    if (entry) state.entries[date] = entry; else delete state.entries[date];
  }
  Object.assign(state.months, pending.months);
  if (pending.settings) state.settings = mergeSettings(pending.settings);
}

export async function loadAll() {
  try {
    const data = await request('GET', '/api/data');
    state.entries = data.entries || {};
    state.months = data.months || {};
    state.settings = mergeSettings(data.settings);
    state.storage = data.storage;
  } catch (err) {
    if (err instanceof Unauthorized) throw err;
    const cache = readLS(LS_CACHE, null);
    if (!cache) throw err;
    state.entries = cache.entries || {};
    state.months = cache.months || {};
    state.settings = mergeSettings(cache.settings);
    setStatus('offline');
  }
  applyPending();
  saveCache();
  if (hasPending()) flush();
}

// ---- Envoi au serveur ----------------------------------------------------------
let flushing = false;
let flushTimer;
let retryTimer;

function scheduleFlush(ms = 600) {
  setStatus('saving');
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, ms);
}

export async function flush() {
  if (flushing) return scheduleFlush(400);
  flushing = true;
  clearTimeout(retryTimer);
  try {
    for (const [date, entry] of Object.entries(pending.entries)) {
      if (entry) await request('PUT', `/api/entry?date=${date}`, { entry });
      else await request('DELETE', `/api/entry?date=${date}`);
      if (pending.entries[date] === entry) delete pending.entries[date];
      persistPending();
    }
    for (const [ym, notes] of Object.entries(pending.months)) {
      await request('PUT', `/api/month?month=${ym}`, { notes });
      if (pending.months[ym] === notes) delete pending.months[ym];
      persistPending();
    }
    if (pending.settings) {
      const sent = pending.settings;
      await request('PUT', '/api/settings', { settings: sent });
      if (pending.settings === sent) pending.settings = null;
      persistPending();
    }
    setStatus(hasPending() ? 'saving' : 'saved');
  } catch (err) {
    if (!(err instanceof Unauthorized)) {
      setStatus(err.status ? 'error' : 'offline');
      retryTimer = setTimeout(flush, 15000);
    }
  } finally {
    flushing = false;
  }
}

window.addEventListener('online', () => { if (hasPending()) flush(); });

// ---- Mutations -----------------------------------------------------------------
export const getEntry = (date) => state.entries[date] || null;

export function saveEntry(date, entry) {
  const copy = clone({ ...entry, date, updatedAt: new Date().toISOString() });
  state.entries[date] = copy;
  pending.entries[date] = copy;
  persistPending();
  saveCache();
  scheduleFlush();
}

export function deleteEntry(date) {
  delete state.entries[date];
  pending.entries[date] = null;
  persistPending();
  saveCache();
  scheduleFlush(0);
}

export function saveSettings(settings) {
  state.settings = mergeSettings(clone(settings));
  pending.settings = clone(state.settings);
  persistPending();
  saveCache();
  scheduleFlush();
}

export function saveMonthNotes(ym, notes) {
  const copy = clone(notes);
  state.months[ym] = copy;
  pending.months[ym] = copy;
  persistPending();
  saveCache();
  scheduleFlush(900);
}

export function clearLocalData() {
  pending = { entries: {}, months: {}, settings: null };
  localStorage.removeItem(LS_PENDING);
  localStorage.removeItem(LS_CACHE);
}

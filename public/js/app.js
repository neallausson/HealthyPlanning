// Point d'entrée : connexion, navigation par onglets (#hash), statut de synchro.
import { api, clearLocalData, flush, loadAll, onSyncStatus, setUnauthorizedHandler, state } from './state.js';
import { renderToday } from './views/today.js';
import { renderJournal } from './views/journal.js';
import { renderCalendar } from './views/calendar.js';
import { renderRecap } from './views/recap.js';
import { renderFoods } from './views/foods.js';
import { renderOptions } from './views/options.js';

const VIEWS = {
  today: renderToday,
  journal: renderJournal,
  calendar: renderCalendar,
  recap: renderRecap,
  foods: renderFoods,
  options: renderOptions,
};

const $ = (id) => document.getElementById(id);

export function applyTheme() {
  const t = state.settings.theme;
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}

function route() {
  const [name, param] = location.hash.replace(/^#/, '').split('/');
  const view = VIEWS[name] ? name : 'today';
  document.querySelectorAll('#tabs a').forEach((a) => a.classList.toggle('active', a.dataset.tab === view));
  // Conteneur neuf à chaque navigation : les écouteurs de la vue précédente disparaissent avec l'ancien
  const el = document.createElement('main');
  el.id = 'view';
  el.className = `view view-${view}`;
  $('view').replaceWith(el);
  VIEWS[view](el, param ? decodeURIComponent(param) : undefined);
  window.scrollTo({ top: 0 });
}

export function navigate(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}

const SYNC_LABELS = {
  idle: '',
  saving: '⏳ Enregistrement…',
  saved: '✓ Enregistré',
  offline: '📴 Hors ligne — sera synchronisé',
  error: '⚠️ Erreur d’enregistrement',
};

onSyncStatus((s) => {
  const el = $('sync');
  el.textContent = SYNC_LABELS[s] || '';
  el.dataset.status = s;
  if (s === 'error' || s === 'offline') el.onclick = () => flush();
});

function showLogin() {
  $('splash').hidden = true;
  $('app').hidden = true;
  $('login').hidden = false;
  setTimeout(() => $('login-password').focus(), 50);
}

async function startApp() {
  await loadAll();
  applyTheme();
  $('splash').hidden = true;
  $('login').hidden = true;
  $('app').hidden = false;
  route();
}

setUnauthorizedHandler(showLogin);
window.addEventListener('hashchange', route);

$('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  const err = $('login-error');
  err.textContent = '';
  btn.disabled = true;
  try {
    await api.login($('login-password').value);
    $('login-password').value = '';
    await startApp();
  } catch (ex) {
    err.textContent = ex.message || 'Connexion impossible';
  } finally {
    btn.disabled = false;
  }
});

export async function logout() {
  await flush();
  await api.logout().catch(() => {});
  clearLocalData();
  showLogin();
}

(async function init() {
  try {
    const s = await api.session();
    if (!s.authenticated) {
      showLogin();
      if (!s.configured) $('login-error').textContent = 'Le mot de passe du site n’est pas encore configuré (APP_PASSWORD).';
      return;
    }
    await startApp();
  } catch {
    // Hors ligne : on tente le cache local
    try { await startApp(); } catch { showLogin(); }
  }
})();

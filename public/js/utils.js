// Utilitaires : dates locales (AAAA-MM-JJ), formatage, DOM.

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

export const pad = (n) => String(n).padStart(2, '0');
export const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const monthOf = (iso) => iso.slice(0, 7);

export function parseISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

// Nombre de jours de a vers b
export const diffDays = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 86400000);

export function daysInMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function addMonths(ym, n) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function addMonthsISO(iso, n) {
  const d = parseISO(iso);
  const day = d.getDate();
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  target.setDate(Math.min(day, new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()));
  return toISO(target);
}

export function monthDays(ym) {
  return Array.from({ length: daysInMonth(ym) }, (_, i) => `${ym}-${pad(i + 1)}`);
}

export const formatLong = (iso) => parseISO(iso).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
export const formatShort = (iso) => parseISO(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
export const formatDay = (iso) => parseISO(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
export function formatMonth(ym) {
  const s = parseISO(`${ym}-01`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fmt(n, digits = 1) {
  if (n == null || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('fr-FR', { maximumFractionDigits: digits });
}

export const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);

export function avg(values) {
  const nums = values.filter(isNum);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export const clone = (o) => JSON.parse(JSON.stringify(o ?? null));

export function download(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

let toastTimer;
export function toast(message, ms = 2600) {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function openModal(html, onBind) {
  const dlg = document.getElementById('modal');
  dlg.innerHTML = `<div class="modal-body">${html}</div>`;
  dlg.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => dlg.close()));
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }, { once: true });
  onBind?.(dlg);
  dlg.showModal();
  return dlg;
}

// Couleur d'un score 0-10 : vert → rouge (inversé si `good`)
export function scoreColor(value, good = false) {
  if (!isNum(value)) return 'var(--muted)';
  const t = Math.max(0, Math.min(10, value)) / 10;
  const hue = good ? 8 + t * 132 : 140 - t * 132;
  return `hsl(${hue.toFixed(0)} 62% 48%)`;
}

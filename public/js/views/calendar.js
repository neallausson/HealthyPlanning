// Onglet Calendrier : vue du mois, filtres (migraine, règles…) et coloration par indicateur.
import { BRISTOL } from '../config.js';
import { METRICS, hasJournalData, sleepHours, totalWater, waterGoal, waterReached } from '../domain.js';
import { state } from '../state.js';
import { addMonths, esc, fmt, formatLong, formatMonth, isNum, monthDays, monthOf, parseISO, todayISO, openModal } from '../utils.js';
import { scoreLabel } from '../ui.js';
import { navigate } from '../app.js';

const FLAGS = [
  { id: 'migraine', icon: '🤕', label: 'Migraine', test: (e) => e.migraine === true },
  { id: 'imigrane', icon: '💊', label: 'Imigrane', test: (e) => e.imigrane === true },
  { id: 'period', icon: '🩸', label: 'Règles', test: (e) => e.period === true },
  { id: 'spotting', icon: '🔸', label: 'Spotting', test: (e) => e.spotting === true },
  { id: 'water', icon: '💧', label: 'Eau OK', test: (e, d) => waterReached(e, d) },
  { id: 'walk', icon: '🚶', label: 'Marche', test: (e) => e.walkNoon === true || e.walkEve === true },
  { id: 'bruxism', icon: '😬', label: 'Bruxisme', test: (e) => e.bruxism === true },
  { id: 'meal', icon: '🍽️', label: 'Repas à problème', test: (e) => !!e.problemMeal },
  { id: 'notes', icon: '📝', label: 'Notes', test: (e) => !!e.notes },
];

const LS_KEY = 'hp_cal_filters';
function loadPrefs() {
  try {
    return { flags: ['migraine', 'imigrane', 'period', 'spotting'], metric: '', only: false, ...JSON.parse(localStorage.getItem(LS_KEY)) };
  } catch {
    return { flags: ['migraine', 'imigrane', 'period', 'spotting'], metric: '', only: false };
  }
}
function savePrefs(p) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignoré */ }
}

// Échelle séquentielle à une seule teinte : clair (faible) → foncé (fort)
function heat(metric, value) {
  const t = Math.max(0, Math.min(1, value / metric.max));
  const hue = metric.good === true ? 150 : metric.good === false ? 12 : 205;
  const light = 90 - t * 50;
  return { bg: `hsl(${hue} 60% ${light}%)`, ink: light < 62 ? '#fff' : '#2b211c' };
}

export function daySummaryHTML(date, e) {
  if (!e) return '<p class="muted">Rien de noté ce jour-là.</p>';
  const row = (label, value) => (value == null || value === '' ? '' : `<dt>${label}</dt><dd>${esc(value)}</dd>`);
  const yn = (v) => (v === true ? 'oui' : v === false ? 'non' : null);
  const sc = (k, v) => (isNum(v) ? scoreLabel(k, v) : null);
  const sups = state.settings.supplements.filter((s) => e.supplements?.[s.id]).map((s) => s.name);
  const bristol = (e.bristol || []).slice(0, e.stoolCount || 0).filter(isNum)
    .map((b) => `T${b} ${BRISTOL[b - 1].label.toLowerCase()}`).join(', ');
  const h = sleepHours(e);
  return `
  <dl class="kv">
    ${row('Phase', e.phase)}${row('Jour du cycle', e.cycleDay ? `J${e.cycleDay}` : null)}
    ${row('Ballon. matin', sc('bloat', e.bloatMorning))}${row('Ballon. après-midi', sc('bloat', e.bloatAfternoon))}${row('Ballon. soir', sc('bloat', e.bloatEvening))}
    ${row('Douleurs', sc('pain', e.pain))}${row('Où', [...(e.painWhere || []), e.painNote].filter(Boolean).join(', '))}
    ${row('Gaz', sc('gas', e.gas))}${row('Selles', e.stoolCount)}${row('Bristol', bristol)}
    ${row('Repas à problème', e.problemMeal)}
    ${row('Énergie', sc('energy', e.energy))}
    ${row('Sommeil', h != null ? `${e.bedtime} → ${e.wakeTime} (${fmt(h)} h)` : null)}
    ${row('Qualité sommeil', sc('sleepQuality', e.sleepQuality))}
    ${row('Stress', sc('stress', e.stress))}${row('Bruxisme', yn(e.bruxism))}
    ${row('Migraine', e.migraine ? `oui${isNum(e.migraineIntensity) ? ` · ${scoreLabel('migraine', e.migraineIntensity)}` : ''}${e.migraineDuration ? ` · ${e.migraineDuration}` : ''}` : yn(e.migraine))}
    ${row('Imigrane', e.imigrane ? `oui (${e.imigraneCount || 1})` : yn(e.imigrane))}
    ${row('Autre antidouleur', e.otherPainkiller)}
    ${row('Règles', yn(e.period))}${row('Spotting', yn(e.spotting))}
    ${row('Eau', isNum(e.water) || isNum(e.infusion) ? `${fmt(totalWater(e), 2)} L / ${fmt(waterGoal(date), 2)} L` : null)}
    ${row('Infusions', e.infusion)}
    ${row('Compléments', sups.join(', '))}
    ${row('Marche midi / soir', e.walkNoon != null || e.walkEve != null ? `${yn(e.walkNoon) || '—'} / ${yn(e.walkEve) || '—'}` : null)}
  </dl>
  ${e.notes ? `<p style="margin-top:.8rem"><strong>📝 Notes :</strong> ${esc(e.notes)}</p>` : ''}`;
}

export function renderCalendar(el, param) {
  let ym = /^\d{4}-\d{2}$/.test(param || '') ? param : monthOf(todayISO());
  const prefs = loadPrefs();

  function render() {
    const days = monthDays(ym);
    const offset = (parseISO(days[0]).getDay() + 6) % 7; // lundi = 0
    const metric = METRICS[prefs.metric];
    const flags = FLAGS.filter((f) => prefs.flags.includes(f.id));
    const today = todayISO();

    const counts = flags.map((f) => ({ ...f, n: days.filter((d) => state.entries[d] && f.test(state.entries[d], d)).length }));

    const cells = days.map((d) => {
      const e = state.entries[d];
      const filled = hasJournalData(e);
      const icons = e ? flags.filter((f) => f.test(e, d)).map((f) => f.icon).join('') : '';
      const value = metric && e ? metric.get(e) : null;
      const h = isNum(value) ? heat(metric, value) : null;
      const dim = prefs.only && flags.length && !icons;
      return `
      <button type="button" class="cal-day ${d === today ? 'today' : ''} ${h ? 'heat' : ''} ${dim ? 'dim' : ''}" data-day="${d}"
        ${h ? `style="background:${h.bg};color:${h.ink}"` : ''} aria-label="${formatLong(d)}">
        <span class="cal-num">${Number(d.slice(8))}</span>
        ${filled ? `<span class="cal-dot ${e.completed ? '' : 'partial'}"></span>` : ''}
        ${h ? `<span class="cal-val">${fmt(value)}${metric.unit ? ` ${metric.unit}` : ''}</span>` : ''}
        <span class="cal-icons">${icons}</span>
      </button>`;
    }).join('');

    el.innerHTML = `
    <div class="page-head">
      <div class="btn-row" style="align-items:center">
        <button class="btn btn-icon" data-month="-1" aria-label="Mois précédent">◀</button>
        <h2 style="min-width:10ch;text-align:center">${formatMonth(ym)}</h2>
        <button class="btn btn-icon" data-month="1" aria-label="Mois suivant">▶</button>
      </div>
      <a class="btn btn-sm btn-soft" href="#recap/${ym}">📊 Récap du mois</a>
    </div>

    <section class="card filter-bar">
      <div>
        <div class="small muted" style="font-weight:700;margin-bottom:.35rem">Afficher</div>
        <div class="chips">
          ${FLAGS.map((f) => `<button type="button" class="chip ${prefs.flags.includes(f.id) ? 'on' : ''}" data-flag="${f.id}">${f.icon} ${f.label}</button>`).join('')}
        </div>
      </div>
      <div class="field-row" style="align-items:end">
        <label class="field" style="margin:0"><span>Colorer les jours par</span>
          <select id="cal-metric">
            <option value="">— aucun —</option>
            ${Object.entries(METRICS).map(([k, m]) => `<option value="${k}" ${prefs.metric === k ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select>
        </label>
        <label class="switch"><input type="checkbox" id="cal-only" ${prefs.only ? 'checked' : ''}> Atténuer les jours sans filtre</label>
      </div>
    </section>

    <section class="card">
      <div class="cal-grid">
        ${['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((w) => `<div class="cal-wd">${w}</div>`).join('')}
        ${'<div class="cal-day empty"></div>'.repeat(offset)}
        ${cells}
      </div>
      <div class="legend">
        <span><span class="cal-dot" style="position:static;display:inline-block"></span> journal terminé</span>
        <span><span class="cal-dot partial" style="position:static;display:inline-block"></span> commencé</span>
        ${metric ? `<span>${metric.label} : 0 <span class="legend-scale" style="background:linear-gradient(90deg, ${heat(metric, 0).bg}, ${heat(metric, metric.max).bg})"></span> ${metric.max}${metric.unit ? ` ${metric.unit}` : ''}</span>` : ''}
      </div>
      ${counts.length ? `<div class="chips" style="margin-top:.8rem">${counts.map((c) => `<span class="badge">${c.icon} ${c.label} : ${c.n} j</span>`).join('')}</div>` : ''}
    </section>`;
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.month) {
      ym = addMonths(ym, Number(b.dataset.month));
      history.replaceState(null, '', `#calendar/${ym}`);
      return render();
    }
    if (b.dataset.flag) {
      const i = prefs.flags.indexOf(b.dataset.flag);
      if (i >= 0) prefs.flags.splice(i, 1); else prefs.flags.push(b.dataset.flag);
      savePrefs(prefs);
      return render();
    }
    if (b.dataset.day) {
      const d = b.dataset.day;
      openModal(`
        <div class="modal-head"><h3>${formatLong(d)}</h3><button class="btn btn-icon" data-close aria-label="Fermer">✕</button></div>
        ${daySummaryHTML(d, state.entries[d])}
        <div class="btn-row" style="margin-top:1rem">
          <button class="btn btn-primary" data-open="#journal/${d}">✏️ ${state.entries[d] ? 'Modifier' : 'Remplir'} le journal</button>
          <button class="btn" data-open="#today/${d}">☀️ Guide du jour</button>
        </div>`, (dlg) => {
        dlg.querySelectorAll('[data-open]').forEach((x) => x.addEventListener('click', () => {
          dlg.close();
          navigate(x.dataset.open);
        }));
      });
    }
  });

  el.addEventListener('change', (e) => {
    if (e.target.id === 'cal-metric') { prefs.metric = e.target.value; savePrefs(prefs); render(); }
    if (e.target.id === 'cal-only') { prefs.only = e.target.checked; savePrefs(prefs); render(); }
  });

  render();
}

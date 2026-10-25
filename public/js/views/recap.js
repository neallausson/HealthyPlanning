// Onglet Récap : synthèse mensuelle pour Julie et le médecin, graphiques, exports, impression.
import { BRISTOL, MOTTO } from '../config.js';
import { METRICS, computeMonth, waterGoal } from '../domain.js';
import { exportCSV, exportJSON, recapText } from '../export.js';
import { saveMonthNotes, state } from '../state.js';
import { scoreLabel } from '../ui.js';
import { addMonths, debounce, esc, fmt, formatDay, formatMonth, formatShort, isNum, monthDays, monthOf, todayISO, toast } from '../utils.js';

const CHART_METRICS = ['bloat', 'pain', 'energy', 'stress', 'sleepHours', 'sleepQuality', 'water', 'stools'];
const SCALE_OF = { bloat: 'bloat', pain: 'pain', energy: 'energy', stress: 'stress', sleepQuality: 'sleepQuality', gas: 'gas' };

const tile = (label, value, sub = '', alert = false) => `
  <div class="tile ${alert ? 'alert' : ''}"><div class="t-label">${label}</div><div class="t-value">${value}</div>${sub ? `<div class="t-sub">${sub}</div>` : ''}</div>`;

const dates = (list) => (list.length
  ? `<div class="date-list">${list.map((d) => `<span class="badge">${formatShort(d)}</span>`).join('')}</div>`
  : '<span class="muted">aucune</span>');

// Diagramme en barres d'un indicateur jour par jour (une seule série, survol = détail du jour)
function chartSVG(ym, key) {
  const m = METRICS[key];
  const days = monthDays(ym);
  const W = 720; const H = 230; const L = 34; const R = 8; const T = 22; const B = 26;
  const pw = W - L - R; const ph = H - T - B;
  const slot = pw / days.length;
  const bw = Math.max(3, slot - 2);
  const max = key === 'stools' ? Math.max(4, ...days.map((d) => m.get(state.entries[d]) || 0)) : m.max;
  const y = (v) => T + ph - (Math.min(v, max) / max) * ph;
  const ticks = [0, max / 2, max];

  const grid = ticks.map((t) => `
    <line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--border)" stroke-width="1"/>
    <text x="${L - 6}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--muted)">${fmt(t)}</text>`).join('');

  let refs = '';
  if (key === 'water') {
    const goals = days.map((d) => waterGoal(d));
    refs = days.map((d, i) => `<line x1="${L + i * slot}" x2="${L + (i + 1) * slot}" y1="${y(goals[i])}" y2="${y(goals[i])}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="4 3"/>`).join('');
  }
  if (key === 'sleepHours') {
    const { minHours, maxHours } = state.settings.sleep;
    refs = [minHours, maxHours].map((h) => `<line x1="${L}" x2="${W - R}" y1="${y(h)}" y2="${y(h)}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="4 3"/>`).join('');
  }

  const bars = days.map((d, i) => {
    const e = state.entries[d];
    const v = m.get(e);
    const x = L + i * slot + (slot - bw) / 2;
    let mark = '';
    if (isNum(v) && v > 0) {
      const top = y(v); const base = T + ph; const r = Math.min(4, bw / 2, base - top);
      mark = `<path d="M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z" fill="var(--primary)"/>`;
    } else if (isNum(v)) {
      mark = `<line x1="${x}" x2="${x + bw}" y1="${T + ph}" y2="${T + ph}" stroke="var(--primary)" stroke-width="3"/>`;
    }
    const migr = e?.migraine ? `<text x="${x + bw / 2}" y="${T - 6}" text-anchor="middle" font-size="11">🤕</text>` : '';
    return `${mark}${migr}<rect x="${L + i * slot}" y="0" width="${slot}" height="${H}" fill="transparent" data-tip="${d}"/>`;
  }).join('');

  const xl = days.map((d, i) => ((i + 1) % 5 === 0 || i === 0
    ? `<text x="${L + i * slot + slot / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="var(--muted)">${i + 1}</text>` : '')).join('');

  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(m.label)} par jour">
    ${grid}${refs}${bars}${xl}
    <line x1="${L}" x2="${W - R}" y1="${T + ph}" y2="${T + ph}" stroke="var(--muted)" stroke-width="1"/>
  </svg>`;
}

function tipText(key, date) {
  const m = METRICS[key];
  const e = state.entries[date];
  const v = m.get(e);
  let txt = `${formatDay(date)} : `;
  if (!isNum(v)) txt += 'non renseigné';
  else if (SCALE_OF[key]) txt += scoreLabel(SCALE_OF[key], Math.round(v * 10) / 10);
  else txt += `${fmt(v, 2)}${m.unit ? ` ${m.unit}` : ''}`;
  if (key === 'water') txt += ` (objectif ${fmt(waterGoal(date), 2)} L)`;
  if (e?.migraine) txt += ' · 🤕 migraine';
  return txt;
}

export function renderRecap(el, param) {
  let ym = /^\d{4}-\d{2}$/.test(param || '') ? param : monthOf(todayISO());
  let chartKey = 'bloat';

  function render() {
    const s = state.settings;
    const m = computeMonth(ym);
    const notes = state.months[ym] || {};
    const pct = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '—');

    el.innerHTML = `
    <div class="print-only"><h1>Récap ${formatMonth(ym)} — Healthy Planning</h1></div>
    <div class="page-head no-print">
      <div class="btn-row" style="align-items:center">
        <button class="btn btn-icon" data-month="-1" aria-label="Mois précédent">◀</button>
        <h2 style="min-width:10ch;text-align:center">${formatMonth(ym)}</h2>
        <button class="btn btn-icon" data-month="1" aria-label="Mois suivant">▶</button>
      </div>
      <div class="btn-row">
        <button class="btn btn-sm btn-primary" data-act="print">🖨️ Imprimer / PDF</button>
        <button class="btn btn-sm" data-act="csv">📊 Excel du mois</button>
        <button class="btn btn-sm" data-act="copy">📋 Copier le texte</button>
        <button class="btn btn-sm" data-act="json">💾 Sauvegarde</button>
      </div>
    </div>

    ${m.filled === 0 ? `<div class="card empty-state"><div class="big">🌱</div><p>Aucune journée renseignée pour ${formatMonth(ym).toLowerCase()}.</p><a class="btn btn-primary" href="#journal">Remplir le journal</a></div>` : ''}

    ${m.imigraneAlert ? `<div class="alert-box bad">⚠️ ${m.imigraneDates.length} jours avec Imigrane ce mois-ci (seuil : ${s.alerts.imigraneDays}). À signaler au médecin : une prise trop fréquente peut entretenir les maux de tête.</div>` : ''}

    <div class="tiles">
      ${tile('🤕 Jours de migraine', m.migraineDates.length, m.migraineIntensity != null ? `intensité moy. ${fmt(m.migraineIntensity)}/10` : '')}
      ${tile('💊 Jours avec Imigrane', m.imigraneDates.length, `${m.imigraneTotal} prise(s) · seuil ${s.alerts.imigraneDays}`, m.imigraneAlert)}
      ${tile('📓 Jours renseignés', `${m.filled}/${m.daysInMonth}`, `${m.completed} journal(aux) terminé(s)`)}
      ${tile('💧 Objectif eau atteint', `${m.waterGoalDays}/${m.waterTracked}`, `moy. ${fmt(m.water, 2)} L/jour`)}
      ${tile('🎈 Ballonnements', `${fmt(m.bloat.all)}<small>/10</small>`, m.bloat.all != null ? scoreLabel('bloat', Math.round(m.bloat.all)).replace(/^\d+ · /, '') : '')}
      ${tile('🔋 Énergie', `${fmt(m.energy)}<small>/10</small>`, m.energy != null ? scoreLabel('energy', Math.round(m.energy)).replace(/^\d+ · /, '') : '')}
      ${tile('😴 Sommeil', `${fmt(m.sleepHours)} h`, `qualité ${fmt(m.sleepQuality)}/10`)}
      ${tile('🌡️ Stress', `${fmt(m.stress)}<small>/10</small>`, `${m.highStressDates.length} jour(s) ≥ ${s.alerts.highScore}`)}
    </div>

    <section class="card">
      <div class="card-title"><h3>📈 Jour par jour</h3><span class="small muted">🤕 = jour de migraine</span></div>
      <div class="chart-tabs no-print">
        ${CHART_METRICS.map((k) => `<button class="chip ${k === chartKey ? 'on' : ''}" data-chart="${k}">${METRICS[k].label}</button>`).join('')}
      </div>
      <div class="chart-wrap" id="chart">${chartSVG(ym, chartKey)}</div>
      <div class="chart-tooltip" id="chart-tip">${key2hint(chartKey)}</div>
    </section>

    <div class="grid-2">
      <section class="card">
        <h3>🌸 Cycle</h3>
        <p><strong>Règles :</strong></p>${dates(m.periodDates)}
        <p style="margin-top:.7rem"><strong>Spotting :</strong></p>${dates(m.spottingDates)}
      </section>
      <section class="card">
        <h3>🤕 Migraines</h3>
        <p><strong>Jours de migraine :</strong></p>${dates(m.migraineDates)}
        <p style="margin-top:.7rem"><strong>Jours avec Imigrane :</strong></p>${dates(m.imigraneDates)}
      </section>

      <section class="card">
        <h3>🌿 Digestion</h3>
        <dl class="kv">
          <dt>Ballonnements matin</dt><dd>${fmt(m.bloat.morning)}/10</dd>
          <dt>Ballonnements après-midi</dt><dd>${fmt(m.bloat.afternoon)}/10</dd>
          <dt>Ballonnements soir</dt><dd>${fmt(m.bloat.evening)}/10</dd>
          <dt>Jours ballonnements ≥ ${s.alerts.highScore}</dt><dd>${m.highBloatDates.length}</dd>
          <dt>Douleurs abdo (moy.)</dt><dd>${fmt(m.pain)}/10</dd>
          <dt>Jours douleur ≥ ${s.alerts.highScore}</dt><dd>${m.highPainDates.length}</dd>
          <dt>Gaz (moy.)</dt><dd>${fmt(m.gas)}/10</dd>
          <dt>Selles / jour (moy.)</dt><dd>${fmt(m.stoolsPerDay)}</dd>
          <dt>Bristol moyen</dt><dd>${fmt(m.bristolAvg)}</dd>
        </dl>
        ${m.bristolDist.some(Boolean) ? `
        <h4 style="margin-top:1rem">Répartition Bristol</h4>
        ${BRISTOL.map((b, i) => {
          const max = Math.max(...m.bristolDist);
          return `<div class="bar-row"><span>T${b.type} ${esc(b.label)}</span><div class="bar"><span style="width:${(m.bristolDist[i] / max) * 100}%;background:var(--primary)"></span></div><span>${m.bristolDist[i]}</span></div>`;
        }).join('')}` : ''}
      </section>

      <section class="card">
        <h3>😴 Sommeil, énergie & stress</h3>
        <dl class="kv">
          <dt>Durée moyenne</dt><dd>${fmt(m.sleepHours)} h</dd>
          <dt>Nuits dans l’objectif (${s.sleep.minHours}-${s.sleep.maxHours} h)</dt><dd>${m.sleepInRange}/${m.sleepTracked}</dd>
          <dt>Qualité moyenne</dt><dd>${fmt(m.sleepQuality)}/10</dd>
          <dt>Énergie moyenne</dt><dd>${fmt(m.energy)}/10</dd>
          <dt>Stress moyen</dt><dd>${fmt(m.stress)}/10</dd>
          <dt>Jours bruxisme</dt><dd>${m.bruxismDates.length}</dd>
          <dt>Marche après midi</dt><dd>${m.walkNoon} j</dd>
          <dt>Marche après dîner</dt><dd>${m.walkEve} j</dd>
        </dl>
      </section>

      <section class="card">
        <h3>💊 Compléments</h3>
        ${m.supplements.length ? m.supplements.map((x) => `
          <div class="bar-row"><span>${esc(x.name)}</span><div class="bar"><span style="width:${(x.rate || 0) * 100}%"></span></div><span>${x.taken}/${x.days}</span></div>`).join('')
        : '<p class="muted">Rien à afficher.</p>'}
        <p class="small muted" style="margin-top:.5rem">Jours cochés / jours renseignés où le complément était prévu (${pct(m.supplements.reduce((a, x) => a + x.taken, 0), m.supplements.reduce((a, x) => a + x.days, 0))} au total).</p>
      </section>

      <section class="card">
        <h3>📝 Notes du mois</h3>
        ${m.notes.length ? `<ul class="note-list">${m.notes.map((n) => `
          <li><strong>${formatShort(n.date)}</strong>
            ${n.problemMeal ? `<br>🍽️ ${esc(n.problemMeal)}` : ''}
            ${n.otherPainkiller ? `<br>💊 ${esc(n.otherPainkiller)}` : ''}
            ${n.notes ? `<br>📝 ${esc(n.notes)}` : ''}</li>`).join('')}</ul>`
        : '<p class="muted">Aucune note ce mois-ci.</p>'}
      </section>
    </div>

    <section class="card" style="margin-top:1rem">
      <h3>💬 Bilan du mois</h3>
      <label class="field"><span>✅ Ce qui a marché</span><textarea data-note="worked" rows="3">${esc(notes.worked)}</textarea></label>
      <label class="field"><span>⚠️ Ce qui a posé problème</span><textarea data-note="problems" rows="3">${esc(notes.problems)}</textarea></label>
      <label class="field"><span>🩺 Questions pour le médecin</span><textarea data-note="questions" rows="3">${esc(notes.questions)}</textarea></label>
    </section>

    <p class="motto small">💛 ${esc(MOTTO)}</p>`;
  }

  function key2hint(key) {
    return `${METRICS[key].label} — survole ou touche une barre pour le détail.`;
  }

  const saveNotes = debounce(() => {
    const notes = {};
    el.querySelectorAll('[data-note]').forEach((t) => { notes[t.dataset.note] = t.value; });
    saveMonthNotes(ym, notes);
  }, 500);

  el.addEventListener('input', (e) => { if (e.target.dataset.note) saveNotes(); });

  const showTip = (e) => {
    const r = e.target.closest('[data-tip]');
    if (r) el.querySelector('#chart-tip').textContent = tipText(chartKey, r.dataset.tip);
  };
  el.addEventListener('pointerover', showTip);
  el.addEventListener('pointerdown', showTip);

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.month) {
      ym = addMonths(ym, Number(b.dataset.month));
      history.replaceState(null, '', `#recap/${ym}`);
      return render();
    }
    if (b.dataset.chart) {
      chartKey = b.dataset.chart;
      el.querySelectorAll('[data-chart]').forEach((c) => c.classList.toggle('on', c.dataset.chart === chartKey));
      el.querySelector('#chart').innerHTML = chartSVG(ym, chartKey);
      el.querySelector('#chart-tip').textContent = key2hint(chartKey);
      return;
    }
    switch (b.dataset.act) {
      case 'print': window.print(); break;
      case 'csv': toast(`${exportCSV(ym)} jour(s) exporté(s)`); break;
      case 'json': exportJSON(); break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(recapText(ym));
          toast('Récap copié 📋 — colle-le dans un message ou un mail');
        } catch {
          toast('Copie impossible sur cet appareil');
        }
        break;
      default:
    }
  });

  render();
}

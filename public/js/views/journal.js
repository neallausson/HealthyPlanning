// Onglet Journal : le questionnaire quotidien, version ludique. Enregistrement automatique.
import { BRISTOL, MIGRAINE_DURATIONS, MOTTO, PAIN_SPOTS } from '../config.js';
import { activeSupplements, computeMonth, programInfo, sleepHours, suggestCycleDay, totalWater, waterGoal } from '../domain.js';
import { deleteEntry, getEntry, saveEntry, state } from '../state.js';
import { checkTileHTML, formatStep, sliderHTML, stepValue, stepperHTML, updateSlider, updateYN, ynHTML } from '../ui.js';
import { addDays, clone, esc, fmt, formatLong, isNum, monthOf, todayISO, toast } from '../utils.js';
import { navigate } from '../app.js';

const STEP_OPTS = {
  stoolCount: { step: 1, min: 0, max: 8 },
  imigraneCount: { step: 1, min: 1, max: 6 },
  water: { step: 0.25, min: 0, max: 5, unit: 'L', digits: 2 },
  infusion: { step: 1, min: 0, max: 10, unit: 'tasse(s)' },
};

const REVEALS = {
  migraine: (e) => e.migraine === true,
  imigrane: (e) => e.imigrane === true,
  pain: (e) => e.pain > 0,
};

const BRISTOL_COLORS = ['#9a5a2c', '#b8743a', '#5aa86b', '#2f9e66', '#c9a227', '#e08a2e', '#d9534f'];

const SECTIONS = [
  ['digestion', (e) => [e.bloatMorning, e.bloatAfternoon, e.bloatEvening, e.pain, e.gas, e.stoolCount].some(isNum)],
  ['sommeil', (e) => [e.energy, e.sleepQuality, e.stress].some(isNum) || !!e.bedtime],
  ['migraine', (e) => e.migraine != null],
  ['cycle', (e) => e.period != null || e.spotting != null],
  ['eau', (e) => isNum(e.water) || isNum(e.infusion)],
  ['complements', (e) => Object.values(e.supplements || {}).some(Boolean)],
  ['mouvement', (e) => e.walkNoon != null || e.walkEve != null],
  ['notes', (e) => !!(e.notes || e.problemMeal)],
];

export function renderJournal(el, param) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(param || '') ? param : todayISO();
  const s = state.settings;
  const entry = clone(getEntry(date)) || {};
  if (entry.phase == null) entry.phase = s.phase;
  entry.supplements ||= {};
  entry.painWhere ||= [];
  entry.bristol ||= [];
  const suggestedCycle = suggestCycleDay(date);
  const prog = programInfo(date);
  const imigraneThisMonth = computeMonth(monthOf(date)).imigraneDates.filter((d) => d !== date).length;

  const sups = activeSupplements(date);
  const extraSups = s.supplements.filter((x) => entry.supplements[x.id] && !sups.includes(x));

  el.innerHTML = `
  <div class="date-nav">
    <button class="btn btn-icon" data-go="-1" aria-label="Jour précédent">◀</button>
    <div class="date-label">${formatLong(date)}${date === todayISO() ? ' · aujourd’hui' : ''}</div>
    <button class="btn btn-icon" data-go="1" aria-label="Jour suivant" ${date >= todayISO() ? 'disabled' : ''}>▶</button>
  </div>
  <div class="field-row no-print" style="margin:-.4rem 0 .6rem"><input type="date" id="j-date" value="${date}" max="${todayISO()}" aria-label="Choisir une date"></div>

  <div class="journal-progress">
    <div class="progress"><span id="j-progress"></span></div>
    <div class="small muted" id="j-progress-txt" style="margin-top:.3rem"></div>
  </div>

  <div class="journal-sections">
    <section class="card">
      <div class="card-title"><h3>🧭 Programme</h3>${prog && !prog.before ? `<span class="badge">Semaine ${prog.week} · Mois ${prog.month}</span>` : ''}</div>
      <div class="field"><span>Phase</span>
        <div class="chips" data-single="phase">
          ${[1, 2, 3, 4].map((p) => `<button type="button" class="pill ${entry.phase === p ? 'on' : ''}" data-value="${p}">Phase ${p}</button>`).join('')}
        </div>
      </div>
    </section>

    <section class="card" id="sec-digestion">
      <h3>🌿 Digestion</h3>
      <p class="muted small">Ballonnements</p>
      ${sliderHTML('bloatMorning', '🌅 Matin', 'bloat', entry.bloatMorning)}
      ${sliderHTML('bloatAfternoon', '🌤️ Après-midi', 'bloat', entry.bloatAfternoon)}
      ${sliderHTML('bloatEvening', '🌙 Soir', 'bloat', entry.bloatEvening)}
      ${sliderHTML('pain', '🎯 Douleurs abdo', 'pain', entry.pain)}
      <div class="reveal" data-reveal="pain">
        <div class="field"><span>Où ?</span>
          <div class="chips" data-multi="painWhere">
            ${PAIN_SPOTS.map((p) => `<button type="button" class="chip ${entry.painWhere.includes(p) ? 'on' : ''}" data-value="${esc(p)}">${esc(p)}</button>`).join('')}
          </div>
        </div>
        <label class="field"><span>Précision</span><input type="text" data-text="painNote" value="${esc(entry.painNote)}" placeholder="ex : crampes après le repas"></label>
      </div>
      ${sliderHTML('gas', '💨 Gaz', 'gas', entry.gas)}
      <div class="stepper-row"><strong>🚽 Selles (nombre)</strong>${stepperHTML('stoolCount', entry.stoolCount, STEP_OPTS.stoolCount)}</div>
      <div id="bristol"></div>
      <label class="field"><span>🍽️ Repas qui a semblé poser problème</span>
        <input type="text" data-text="problemMeal" value="${esc(entry.problemMeal)}" placeholder="ex : pâtes au restau ce midi"></label>
    </section>

    <section class="card" id="sec-sommeil">
      <h3>⚡ Énergie & sommeil</h3>
      ${sliderHTML('energy', '🔋 Énergie', 'energy', entry.energy)}
      <div class="sleep-times">
        <label class="field"><span>🛏️ Couchée (hier soir)</span><input type="time" data-text="bedtime" value="${esc(entry.bedtime)}"></label>
        <label class="field"><span>⏰ Levée (ce matin)</span><input type="time" data-text="wakeTime" value="${esc(entry.wakeTime)}"></label>
      </div>
      <div class="sleep-duration" id="sleep-duration"></div>
      ${sliderHTML('sleepQuality', '😴 Qualité du sommeil', 'sleepQuality', entry.sleepQuality)}
      ${sliderHTML('stress', '🌡️ Stress', 'stress', entry.stress)}
      ${ynHTML('bruxism', '😬 Mâchoire serrée / bruxisme', entry.bruxism)}
    </section>

    <section class="card" id="sec-migraine">
      <h3>🤕 Migraine</h3>
      ${ynHTML('migraine', 'Migraine aujourd’hui ?', entry.migraine)}
      <div class="reveal" data-reveal="migraine">
        ${sliderHTML('migraineIntensity', 'Intensité', 'migraine', entry.migraineIntensity)}
        <div class="field"><span>Durée</span>
          <div class="chips" data-single="migraineDuration">
            ${MIGRAINE_DURATIONS.map((d) => `<button type="button" class="chip ${entry.migraineDuration === d ? 'on' : ''}" data-value="${esc(d)}">${esc(d)}</button>`).join('')}
          </div>
        </div>
      </div>
      ${ynHTML('imigrane', '💊 Imigrane pris ?', entry.imigrane)}
      <div class="reveal" data-reveal="imigrane">
        <div class="stepper-row"><span>Nombre de prises</span>${stepperHTML('imigraneCount', entry.imigraneCount ?? (entry.imigrane ? 1 : null), STEP_OPTS.imigraneCount)}</div>
        <p class="small muted" id="imigrane-month"></p>
      </div>
      <label class="field"><span>Autre antidouleur</span><input type="text" data-text="otherPainkiller" value="${esc(entry.otherPainkiller)}" placeholder="ex : paracétamol 1 g"></label>
    </section>

    <section class="card" id="sec-cycle">
      <h3>🌸 Cycle</h3>
      ${ynHTML('period', '🩸 Règles', entry.period)}
      ${ynHTML('spotting', '🔸 Spotting', entry.spotting)}
      <div class="stepper-row">
        <span><strong>Jour du cycle</strong>${suggestedCycle ? `<br><button type="button" class="link-btn" id="use-cycle">suggéré : J${suggestedCycle} (d’après tes règles)</button>` : ''}</span>
        <input type="number" min="1" max="60" inputmode="numeric" data-text="cycleDay" value="${esc(entry.cycleDay)}" style="max-width:110px" placeholder="J?">
      </div>
    </section>

    <section class="card" id="sec-eau">
      <h3>💧 Hydratation</h3>
      <div class="stepper-row"><strong>Eau bue</strong>${stepperHTML('water', entry.water, STEP_OPTS.water)}</div>
      <div class="stepper-row"><strong>🍵 Infusion</strong>${stepperHTML('infusion', entry.infusion, STEP_OPTS.infusion)}</div>
      <div class="progress" style="margin-top:.6rem"><span id="water-bar"></span></div>
      <p class="small muted" id="water-txt" style="margin-top:.35rem"></p>
    </section>

    <section class="card" id="sec-complements">
      <div class="card-title"><h3>💊 Compléments</h3>${prog && !prog.before ? `<span class="small muted">mois ${prog.month} du programme</span>` : ''}</div>
      <div class="sup-grid">
        ${[...sups, ...extraSups].map((x) => checkTileHTML(`data-sup="${esc(x.id)}"`, x.name, !!entry.supplements[x.id], x.note)).join('')}
      </div>
      ${sups.length === 0 ? '<p class="muted">Aucun complément actif ce mois-ci (voir Options).</p>' : ''}
    </section>

    <section class="card" id="sec-mouvement">
      <h3>🚶 Mouvement</h3>
      ${ynHTML('walkNoon', 'Marche après le repas de midi', entry.walkNoon)}
      ${ynHTML('walkEve', 'Marche après le repas du soir', entry.walkEve)}
    </section>

    <section class="card" id="sec-notes">
      <h3>📝 Notes / événements</h3>
      <label class="field"><span class="muted small" style="font-weight:600">Stress, sortie, repas inhabituel…</span>
        <textarea data-text="notes" rows="4" placeholder="Ce qui s’est passé aujourd’hui…">${esc(entry.notes)}</textarea></label>
    </section>

    <section class="card done-bar">
      <div id="done-zone"></div>
      <p class="motto small">💛 ${esc(MOTTO)}</p>
      ${getEntry(date) ? '<button type="button" class="link-btn" id="j-delete">Effacer cette journée</button>' : ''}
    </section>
  </div>`;

  const $ = (sel) => el.querySelector(sel);

  function commit() {
    saveEntry(date, entry);
    refresh();
  }

  function renderBristol() {
    const n = entry.stoolCount || 0;
    entry.bristol.length = Math.min(entry.bristol.length, n);
    $('#bristol').innerHTML = Array.from({ length: n }, (_, i) => {
      const v = entry.bristol[i];
      const info = BRISTOL.find((b) => b.type === v);
      return `
      <div class="bristol-row">
        <div class="row-label">Selle ${n > 1 ? i + 1 : ''} — consistance (Bristol)</div>
        <div class="bristol-chips">
          ${BRISTOL.map((b) => `<button type="button" class="${v === b.type ? 'on' : ''}" style="--bc:${BRISTOL_COLORS[b.type - 1]}" data-bristol="${i}" data-value="${b.type}" title="${esc(b.label)}">${b.type}</button>`).join('')}
        </div>
        <div class="bristol-desc">${info ? `Type ${info.type} — ${esc(info.label)} (${esc(info.hint)})` : 'Choisis le type'}</div>
      </div>`;
    }).join('');
  }

  function refresh() {
    // Rubriques remplies
    const done = SECTIONS.filter(([, test]) => test(entry)).length;
    $('#j-progress').style.width = `${(done / SECTIONS.length) * 100}%`;
    $('#j-progress-txt').textContent = `${done}/${SECTIONS.length} rubriques remplies${entry.completed ? ' · terminé ✓' : ''}`;

    for (const [key, test] of Object.entries(REVEALS)) {
      el.querySelectorAll(`[data-reveal="${key}"]`).forEach((n) => { n.hidden = !test(entry); });
    }

    const h = sleepHours(entry);
    const { minHours, maxHours } = s.sleep;
    $('#sleep-duration').innerHTML = h == null ? ''
      : `Durée : ${fmt(h)} h ${h >= minHours && h <= maxHours
        ? '<span class="badge badge-good">dans l’objectif</span>'
        : `<span class="badge badge-warn">objectif ${minHours}-${maxHours} h</span>`}`;

    const goal = waterGoal(date);
    const total = totalWater(entry);
    $('#water-bar').style.width = `${Math.min(100, (total / goal) * 100)}%`;
    $('#water-txt').textContent = `Total ${fmt(total, 2)} L / objectif ${fmt(goal, 2)} L${s.water.countInfusion ? ' (infusions comprises)' : ''}${total >= goal ? ' — objectif atteint 🎉' : ''}`;

    const imi = imigraneThisMonth + (entry.imigrane ? 1 : 0);
    $('#imigrane-month').textContent = `Ce mois-ci : ${imi} jour(s) avec Imigrane (seuil d’alerte : ${s.alerts.imigraneDays}).`;

    $('#done-zone').innerHTML = entry.completed
      ? '<h3>✨ Journal terminé, bravo !</h3><p class="muted">Tu peux encore modifier quand tu veux.</p>'
      : '<button type="button" class="btn btn-primary" id="j-done">J’ai fini pour aujourd’hui ✨</button>';
  }

  renderBristol();
  refresh();

  // ---- Interactions ----
  el.addEventListener('input', (e) => {
    const t = e.target;
    if (t.type === 'range' && t.dataset.field) {
      entry[t.dataset.field] = Number(t.value);
      updateSlider(t.closest('.slider'), entry[t.dataset.field]);
      commit();
    } else if (t.dataset.text) {
      const v = t.value.trim();
      entry[t.dataset.text] = t.type === 'number' ? (v ? Number(v) : null) : (v ? t.value : null);
      commit();
    }
  });

  el.addEventListener('click', (e) => {
    const t = e.target;

    // Un clic sur un curseur pas encore noté enregistre la valeur affichée
    if (t.type === 'range' && t.dataset.field && !isNum(entry[t.dataset.field])) {
      entry[t.dataset.field] = Number(t.value);
      updateSlider(t.closest('.slider'), entry[t.dataset.field]);
      return commit();
    }

    const btn = t.closest('button');
    if (!btn) return;

    if (btn.dataset.go) return navigate(`#journal/${addDays(date, Number(btn.dataset.go))}`);

    if (btn.dataset.clear) {
      entry[btn.dataset.clear] = null;
      updateSlider(btn.closest('.slider'), null);
      return commit();
    }

    const yn = btn.closest('[data-yn]');
    if (yn) {
      const field = yn.dataset.yn;
      const value = btn.dataset.value === 'true';
      entry[field] = entry[field] === value ? null : value;
      if (field === 'imigrane' && entry.imigrane && !isNum(entry.imigraneCount)) {
        entry.imigraneCount = 1;
        $('[data-stepper="imigraneCount"] output').textContent = '1';
      }
      updateYN(yn, entry[field]);
      return commit();
    }

    const stepper = btn.closest('[data-stepper]');
    if (stepper) {
      const field = stepper.dataset.stepper;
      entry[field] = stepValue(stepper, entry[field], Number(btn.dataset.dir));
      stepper.querySelector('output').textContent = formatStep(entry[field], STEP_OPTS[field]);
      if (field === 'stoolCount') renderBristol();
      return commit();
    }

    if (btn.dataset.bristol != null) {
      const i = Number(btn.dataset.bristol);
      const v = Number(btn.dataset.value);
      entry.bristol[i] = entry.bristol[i] === v ? null : v;
      renderBristol();
      return commit();
    }

    const single = btn.closest('[data-single]');
    if (single) {
      const field = single.dataset.single;
      const raw = btn.dataset.value;
      const value = field === 'phase' ? Number(raw) : raw;
      entry[field] = entry[field] === value && field !== 'phase' ? null : value;
      single.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(entry[field]) === b.dataset.value));
      return commit();
    }

    const multi = btn.closest('[data-multi]');
    if (multi) {
      const list = entry[multi.dataset.multi];
      const i = list.indexOf(btn.dataset.value);
      if (i >= 0) list.splice(i, 1); else list.push(btn.dataset.value);
      btn.classList.toggle('on', i < 0);
      return commit();
    }

    if (btn.dataset.sup) {
      const id = btn.dataset.sup;
      entry.supplements[id] = !entry.supplements[id];
      btn.classList.toggle('on', entry.supplements[id]);
      btn.querySelector('.box').textContent = entry.supplements[id] ? '✓' : '';
      return commit();
    }

    if (btn.id === 'use-cycle') {
      entry.cycleDay = suggestedCycle;
      $('[data-text="cycleDay"]').value = suggestedCycle;
      return commit();
    }

    if (btn.id === 'j-done') {
      entry.completed = true;
      commit();
      return toast('Bravo 💛 Journal enregistré !');
    }

    if (btn.id === 'j-delete') {
      if (confirm(`Effacer toutes les données du ${formatLong(date)} ?`)) {
        deleteEntry(date);
        toast('Journée effacée');
        navigate(`#journal/${date}`);
      }
    }
  });

  $('#j-date').addEventListener('change', (e) => {
    if (e.target.value) navigate(`#journal/${e.target.value}`);
  });
}

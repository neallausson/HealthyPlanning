// Onglet Aujourd'hui : guide quotidien à cocher, suivi de l'eau, conseils selon l'énergie.
import { BREAKFAST_IDEAS, ENERGY_TIPS, GUIDE, MOMENTS, MOTTO } from '../config.js';
import { activeSupplements, hasJournalData, programInfo, totalWater, waterGoal } from '../domain.js';
import { getEntry, saveEntry, state } from '../state.js';
import { addDays, avg, clone, esc, fmt, formatLong, todayISO, toast } from '../utils.js';
import { navigate } from '../app.js';

function energyTip(date, entry) {
  if (entry?.migraine || (entry?.energy != null && entry.energy <= 3)) return 'low';
  if (entry?.energy == null) return null;
  const week = Array.from({ length: 7 }, (_, i) => getEntry(addDays(date, -i))?.energy);
  return entry.energy >= 7 && avg(week) >= 6 ? 'better' : 'ok';
}

export function renderToday(el, param) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(param || '') ? param : todayISO();
  const isToday = date === todayISO();
  const s = state.settings;
  const entry = clone(getEntry(date)) || { phase: s.phase };
  entry.guide ||= {};
  entry.supplements ||= {};

  const prog = programInfo(date);
  const sups = activeSupplements(date);

  // Éléments cochables de chaque moment de la journée
  const sections = MOMENTS.map((m) => ({
    ...m,
    items: [
      ...sups.filter((x) => x.moment === m.id).map((x) => ({ kind: 'sup', id: x.id, label: x.name, note: x.note })),
      ...GUIDE[m.id].map((it) => ({ kind: it.kind || 'habit', ...it })),
    ],
  }));

  const isOn = (it) => {
    if (it.kind === 'sup') return !!entry.supplements[it.id];
    if (it.kind === 'walk') return entry[it.id] === true;
    if (it.kind === 'journal') return !!entry.completed;
    return !!entry.guide[it.id];
  };

  const itemHTML = (it) => `
    <li>
      <div class="check-item ${it.kind === 'sup' ? 'sup' : ''} ${isOn(it) ? 'on' : ''}" role="checkbox" tabindex="0" aria-checked="${isOn(it)}" data-kind="${it.kind}" data-id="${esc(it.id)}">
        <span class="box">${isOn(it) ? '✓' : ''}</span>
        <span class="txt">${it.emoji ? `${it.emoji} ` : ''}${esc(it.label)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</span>
      </div>
      ${it.ideas ? `<details class="ideas"><summary>Idées de petit-déj</summary><ul>${BREAKFAST_IDEAS.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></details>` : ''}
    </li>`;

  el.innerHTML = `
  <div class="date-nav">
    <button class="btn btn-icon" data-go="-1" aria-label="Jour précédent">◀</button>
    <div class="date-label">${isToday ? 'Aujourd’hui · ' : ''}${formatLong(date)}</div>
    <button class="btn btn-icon" data-go="1" aria-label="Jour suivant" ${isToday ? 'disabled' : ''}>▶</button>
  </div>

  ${!s.programStart ? `
  <div class="alert-box">🗓️ Indique la date de début du programme dans <a href="#options">Options</a> pour calculer automatiquement l’objectif d’eau de la semaine et les compléments du mois.</div>` : ''}

  <div class="card motto-card">💛 ${esc(MOTTO)}</div>

  <div class="grid-2">
    <section class="card">
      <div class="card-title"><h3>💧 Objectif eau</h3>${prog && !prog.before ? `<span class="badge">Semaine ${prog.week} · Mois ${prog.month} · Phase ${entry.phase || s.phase}</span>` : ''}</div>
      <div class="water-card">
        <div class="bottle"><div class="bottle-fill" id="bottle-fill"></div></div>
        <div>
          <div class="water-amount" id="water-amount"></div>
          <div class="muted small" id="water-sub"></div>
          <div class="water-actions">
            <button class="btn btn-primary btn-sm" data-water="1">+ 1 verre (${s.water.glassMl} ml)</button>
            <button class="btn btn-sm" data-water="-1" aria-label="Retirer un verre">−</button>
            <button class="btn btn-soft btn-sm" data-infusion="1">+ 🍵 infusion</button>
          </div>
        </div>
      </div>
      <p class="small muted" style="margin-top:.7rem">L’infusion compte, mais l’eau reste la boisson principale.</p>
    </section>

    <section class="card">
      <div class="card-title"><h3>📓 Journal du jour</h3><span id="journal-badge"></span></div>
      <p class="muted" id="journal-txt"></p>
      <a class="btn btn-primary" href="#journal/${date}" id="journal-btn"></a>
      <h4 style="margin-top:1.1rem">Selon mon énergie du jour</h4>
      <div class="tips">
        ${ENERGY_TIPS.map((t) => `<div class="tip" data-tip="${t.id}"><span class="emo">${t.emoji}</span><div><strong>${t.title}</strong><br><span class="small">${t.text}</span></div></div>`).join('')}
      </div>
    </section>
  </div>

  <div class="page-head" style="margin-top:1.2rem">
    <h2>☀️ Mon guide quotidien</h2>
    <span class="badge" id="guide-count"></span>
  </div>
  <div class="progress" style="margin-bottom:1rem"><span id="guide-bar"></span></div>

  <div class="grid-2">
    ${sections.map((sec) => `
    <section class="card">
      <div class="card-title"><h3>${sec.icon} ${sec.title}</h3><span class="small muted" data-sec-count="${sec.id}"></span></div>
      <ul class="checklist">${sec.items.map(itemHTML).join('')}</ul>
    </section>`).join('')}
  </div>`;

  const $ = (sel) => el.querySelector(sel);
  const allItems = sections.flatMap((sec) => sec.items.map((it) => ({ ...it, sec: sec.id })));

  function refresh() {
    const goal = waterGoal(date);
    const total = totalWater(entry);
    $('#bottle-fill').style.height = `${Math.min(100, (total / goal) * 100)}%`;
    $('#water-amount').textContent = `${fmt(total, 2)} L / ${fmt(goal, 2)} L`;
    $('#water-sub').textContent = `${fmt(entry.water || 0, 2)} L d’eau · ${entry.infusion || 0} infusion(s)${total >= goal ? ' · objectif atteint 🎉' : ''}`;

    const filled = hasJournalData(entry);
    $('#journal-badge').innerHTML = entry.completed
      ? '<span class="badge badge-good">Terminé ✓</span>'
      : filled ? '<span class="badge badge-warn">Commencé</span>' : '<span class="badge">À faire</span>';
    $('#journal-txt').textContent = entry.completed
      ? 'Merci, la journée est notée 💛'
      : '2 minutes pour noter digestion, énergie, sommeil, migraine…';
    $('#journal-btn').textContent = entry.completed ? 'Revoir le journal' : filled ? 'Continuer le journal →' : 'Remplir le journal →';

    const tip = energyTip(date, entry);
    el.querySelectorAll('[data-tip]').forEach((n) => n.classList.toggle('on', n.dataset.tip === tip));

    const done = allItems.filter(isOn).length;
    $('#guide-count').textContent = `${done}/${allItems.length} ✓`;
    $('#guide-bar').style.width = `${(done / allItems.length) * 100}%`;
    for (const sec of sections) {
      const d = sec.items.filter(isOn).length;
      el.querySelector(`[data-sec-count="${sec.id}"]`).textContent = `${d}/${sec.items.length}`;
    }
  }

  function commit() {
    saveEntry(date, entry);
    refresh();
  }

  function toggle(node) {
    const { kind, id } = node.dataset;
    if (kind === 'journal') return navigate(`#journal/${date}`);
    if (kind === 'sup') entry.supplements[id] = !entry.supplements[id];
    else if (kind === 'walk') entry[id] = entry[id] === true ? null : true;
    else entry.guide[id] = !entry.guide[id];
    const on = isOn({ kind, id });
    node.classList.toggle('on', on);
    node.setAttribute('aria-checked', on);
    node.querySelector('.box').textContent = on ? '✓' : '';
    commit();
    if (allItems.every(isOn)) toast('Toute la checklist est cochée, bravo ! 🌟');
  }

  el.addEventListener('click', (e) => {
    const item = e.target.closest('.check-item');
    if (item) return toggle(item);
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.go) return navigate(`#today/${addDays(date, Number(btn.dataset.go))}`);
    if (btn.dataset.water) {
      const next = (entry.water || 0) + (Number(btn.dataset.water) * s.water.glassMl) / 1000;
      entry.water = Math.max(0, Math.round(next * 1000) / 1000);
      commit();
    }
    if (btn.dataset.infusion) {
      entry.infusion = (entry.infusion || 0) + 1;
      commit();
    }
  });

  el.addEventListener('keydown', (e) => {
    const item = e.target.closest('.check-item');
    if (item && (e.key === ' ' || e.key === 'Enter')) {
      e.preventDefault();
      toggle(item);
    }
  });

  refresh();
}

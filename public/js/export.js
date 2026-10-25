// Exports : sauvegarde JSON complète, CSV (Excel FR) et récap texte pour le médecin.
import { BRISTOL } from './config.js';
import { computeMonth, hasJournalData, meanBloat, sleepHours, totalWater, waterGoal, waterReached } from './domain.js';
import { state } from './state.js';
import { download, fmt, formatMonth, formatShort, isNum, todayISO } from './utils.js';

export function exportJSON() {
  const backup = {
    app: 'healthy-planning',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: state.entries,
    months: state.months,
    settings: state.settings,
  };
  download(`healthy-planning-sauvegarde-${todayISO()}.json`, JSON.stringify(backup, null, 2), 'application/json');
}

const yn = (v) => (v === true ? 'oui' : v === false ? 'non' : '');
const num = (v, d = 2) => (isNum(v) ? String(Math.round(v * 10 ** d) / 10 ** d).replace('.', ',') : '');
const cell = (v) => {
  const s = String(v ?? '');
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// CSV au format Excel français : séparateur « ; », virgule décimale, BOM UTF-8
export function exportCSV(ym = null) {
  const sups = state.settings.supplements;
  const dates = Object.keys(state.entries)
    .filter((d) => (!ym || d.startsWith(ym)) && hasJournalData(state.entries[d]))
    .sort();

  const columns = [
    ['Date', (e, d) => d],
    ['Phase', (e) => e.phase ?? ''],
    ['Jour du cycle', (e) => e.cycleDay ?? ''],
    ['Ballonnements matin', (e) => e.bloatMorning ?? ''],
    ['Ballonnements après-midi', (e) => e.bloatAfternoon ?? ''],
    ['Ballonnements soir', (e) => e.bloatEvening ?? ''],
    ['Ballonnements moyenne', (e) => num(meanBloat(e), 1)],
    ['Douleurs abdo', (e) => e.pain ?? ''],
    ['Douleurs où', (e) => [...(e.painWhere || []), e.painNote].filter(Boolean).join(', ')],
    ['Gaz', (e) => e.gas ?? ''],
    ['Selles nombre', (e) => e.stoolCount ?? ''],
    ['Bristol', (e) => (e.bristol || []).slice(0, e.stoolCount || 0).filter(isNum).join(' ')],
    ['Repas problématique', (e) => e.problemMeal || ''],
    ['Énergie', (e) => e.energy ?? ''],
    ['Coucher', (e) => e.bedtime || ''],
    ['Lever', (e) => e.wakeTime || ''],
    ['Sommeil (h)', (e) => num(sleepHours(e), 1)],
    ['Qualité sommeil', (e) => e.sleepQuality ?? ''],
    ['Stress', (e) => e.stress ?? ''],
    ['Bruxisme', (e) => yn(e.bruxism)],
    ['Migraine', (e) => yn(e.migraine)],
    ['Migraine intensité', (e) => (e.migraine ? e.migraineIntensity ?? '' : '')],
    ['Migraine durée', (e) => (e.migraine ? e.migraineDuration || '' : '')],
    ['Imigrane', (e) => yn(e.imigrane)],
    ['Imigrane nombre', (e) => (e.imigrane ? e.imigraneCount ?? 1 : '')],
    ['Autre antidouleur', (e) => e.otherPainkiller || ''],
    ['Règles', (e) => yn(e.period)],
    ['Spotting', (e) => yn(e.spotting)],
    ['Eau (L)', (e) => num(e.water)],
    ['Infusion (tasses)', (e) => e.infusion ?? ''],
    ['Eau totale (L)', (e) => num(totalWater(e))],
    ['Objectif eau (L)', (e, d) => num(waterGoal(d))],
    ['Objectif eau atteint', (e, d) => (isNum(e.water) || isNum(e.infusion) ? yn(!!waterReached(e, d)) : '')],
    ...sups.map((s) => [s.name, (e) => (e.supplements?.[s.id] ? 'oui' : '')]),
    ['Marche midi', (e) => yn(e.walkNoon)],
    ['Marche soir', (e) => yn(e.walkEve)],
    ['Notes', (e) => e.notes || ''],
    ['Journal terminé', (e) => (e.completed ? 'oui' : '')],
  ];

  const lines = [columns.map(([h]) => cell(h)).join(';')];
  for (const d of dates) lines.push(columns.map(([, fn]) => cell(fn(state.entries[d], d))).join(';'));
  download(`healthy-planning-${ym || 'tout'}.csv`, `﻿${lines.join('\r\n')}`, 'text/csv;charset=utf-8');
  return dates.length;
}

const dateList = (dates) => (dates.length ? dates.map(formatShort).join(', ') : 'aucune');

export function recapText(ym) {
  const m = computeMonth(ym);
  const notes = state.months[ym] || {};
  const s = state.settings;
  const lines = [
    `Récap ${formatMonth(ym)} — Healthy Planning`,
    `Jours renseignés : ${m.filled}/${m.daysInMonth}`,
    '',
    `Jours de migraine : ${m.migraineDates.length} (${dateList(m.migraineDates)})`,
    `Intensité moyenne des migraines : ${fmt(m.migraineIntensity)}/10`,
    `Jours avec Imigrane : ${m.imigraneDates.length} — ${m.imigraneTotal} prise(s)${m.imigraneAlert ? ` ⚠️ seuil de ${s.alerts.imigraneDays} jours atteint` : ''}`,
    `Règles : ${dateList(m.periodDates)}`,
    `Spotting : ${dateList(m.spottingDates)}`,
    '',
    `Ballonnements moyens : ${fmt(m.bloat.all)}/10 (matin ${fmt(m.bloat.morning)}, après-midi ${fmt(m.bloat.afternoon)}, soir ${fmt(m.bloat.evening)})`,
    `Douleurs abdo moyennes : ${fmt(m.pain)}/10 — Gaz : ${fmt(m.gas)}/10`,
    `Selles par jour (moyenne) : ${fmt(m.stoolsPerDay)} — Bristol moyen : ${fmt(m.bristolAvg)}`,
    `Énergie moyenne : ${fmt(m.energy)}/10 — Stress moyen : ${fmt(m.stress)}/10`,
    `Sommeil moyen : ${fmt(m.sleepHours)} h — qualité ${fmt(m.sleepQuality)}/10`,
    `Bruxisme : ${m.bruxismDates.length} jour(s)`,
    `Eau moyenne : ${fmt(m.water, 2)} L/jour — objectif atteint ${m.waterGoalDays}/${m.waterTracked} jours`,
    `Marche après repas : midi ${m.walkNoon} j, soir ${m.walkEve} j`,
  ];
  if (m.supplements.length) {
    lines.push('', 'Compléments (jours pris / jours prévus) :');
    for (const x of m.supplements) lines.push(`- ${x.name} : ${x.taken}/${x.days}`);
  }
  if (m.bristolDist.some(Boolean)) {
    lines.push('', `Répartition Bristol : ${BRISTOL.map((b, i) => `T${b.type}:${m.bristolDist[i]}`).join(' ')}`);
  }
  if (notes.worked) lines.push('', 'Ce qui a marché :', notes.worked);
  if (notes.problems) lines.push('', 'Ce qui a posé problème :', notes.problems);
  if (notes.questions) lines.push('', 'Questions pour le médecin :', notes.questions);
  return lines.join('\n');
}

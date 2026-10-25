// Règles métier : programme (semaine / mois), objectifs, sommeil, cycle, statistiques.
import { state } from './state.js';
import { addDays, addMonthsISO, avg, diffDays, isNum, monthDays } from './utils.js';

export function programInfo(iso, settings = state.settings) {
  if (!settings.programStart) return null;
  const d = diffDays(settings.programStart, iso);
  if (d < 0) return { before: true, day: d, week: 1, month: 1 };
  let month = 1;
  while (addMonthsISO(settings.programStart, month) <= iso) month++;
  return { before: false, day: d + 1, week: Math.floor(d / 7) + 1, month };
}

export function waterGoal(iso, settings = state.settings) {
  const steps = [...settings.water.steps].sort((a, b) => a.fromWeek - b.fromWeek);
  const week = programInfo(iso, settings)?.week ?? 1;
  let goal = steps[0]?.liters ?? 1.5;
  for (const s of steps) if (week >= s.fromWeek) goal = s.liters;
  return goal;
}

export function totalWater(entry, settings = state.settings) {
  if (!entry) return 0;
  const infusion = settings.water.countInfusion ? ((entry.infusion || 0) * settings.water.infusionMl) / 1000 : 0;
  return (entry.water || 0) + infusion;
}

export const waterReached = (entry, iso) => entry && (isNum(entry.water) || isNum(entry.infusion))
  && totalWater(entry) >= waterGoal(iso) - 0.001;

export function supplementActive(sup, iso, settings = state.settings) {
  if (sup.enabled === false) return false;
  const p = programInfo(iso, settings);
  if (!p) return true;
  return (sup.fromMonth == null || p.month >= sup.fromMonth) && (sup.toMonth == null || p.month <= sup.toMonth);
}

export const activeSupplements = (iso, settings = state.settings) =>
  settings.supplements.filter((s) => supplementActive(s, iso, settings));

// Durée de la nuit (coucher la veille → lever le jour J)
export function sleepHours(entry) {
  if (!entry?.bedtime || !entry?.wakeTime) return null;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  let diff = toMin(entry.wakeTime) - toMin(entry.bedtime);
  if (diff <= 0) diff += 24 * 60;
  return Math.round((diff / 60) * 10) / 10;
}

// Jour du cycle déduit du dernier 1er jour de règles enregistré
export function suggestCycleDay(iso) {
  for (let i = 0; i <= 45; i++) {
    const d = addDays(iso, -i);
    if (state.entries[d]?.period === true && state.entries[addDays(d, -1)]?.period !== true) return i + 1;
  }
  return null;
}

const JOURNAL_FIELDS = [
  'bloatMorning', 'bloatAfternoon', 'bloatEvening', 'pain', 'gas', 'stoolCount', 'problemMeal',
  'energy', 'bedtime', 'wakeTime', 'sleepQuality', 'stress', 'bruxism', 'migraine', 'imigrane',
  'otherPainkiller', 'period', 'spotting', 'water', 'infusion', 'walkNoon', 'walkEve', 'notes',
];

export function hasJournalData(entry) {
  if (!entry) return false;
  return entry.completed || JOURNAL_FIELDS.some((f) => entry[f] != null && entry[f] !== '')
    || Object.values(entry.supplements || {}).some(Boolean);
}

export function maxBloat(e) {
  const v = [e?.bloatMorning, e?.bloatAfternoon, e?.bloatEvening].filter(isNum);
  return v.length ? Math.max(...v) : null;
}
export const meanBloat = (e) => avg([e?.bloatMorning, e?.bloatAfternoon, e?.bloatEvening]);

// Indicateurs du jour disponibles pour le calendrier et les graphiques
export const METRICS = {
  bloat: { label: 'Ballonnements (moy.)', short: 'Ballon.', get: meanBloat, max: 10, good: false },
  pain: { label: 'Douleurs abdo', short: 'Douleur', get: (e) => e?.pain, max: 10, good: false },
  gas: { label: 'Gaz', short: 'Gaz', get: (e) => e?.gas, max: 10, good: false },
  energy: { label: 'Énergie', short: 'Énergie', get: (e) => e?.energy, max: 10, good: true },
  stress: { label: 'Stress', short: 'Stress', get: (e) => e?.stress, max: 10, good: false },
  sleepQuality: { label: 'Qualité du sommeil', short: 'Sommeil', get: (e) => e?.sleepQuality, max: 10, good: true },
  sleepHours: { label: 'Durée de sommeil (h)', short: 'Durée', get: sleepHours, max: 12, good: true, unit: 'h' },
  migraine: { label: 'Intensité migraine', short: 'Migraine', get: (e) => (e?.migraine ? e.migraineIntensity : null), max: 10, good: false },
  water: { label: 'Eau totale (L)', short: 'Eau', get: (e) => (e && (isNum(e.water) || isNum(e.infusion)) ? totalWater(e) : null), max: 3, good: true, unit: 'L' },
  stools: { label: 'Selles (nombre)', short: 'Selles', get: (e) => e?.stoolCount, max: 6, good: null },
};

export function computeMonth(ym, settings = state.settings) {
  const days = monthDays(ym);
  const list = days.map((d) => ({ date: d, e: state.entries[d] })).filter((x) => hasJournalData(x.e));
  const E = list.map((x) => x.e);
  const datesWhere = (fn) => list.filter((x) => fn(x.e, x.date)).map((x) => x.date);
  const high = settings.alerts.highScore;

  const supplements = settings.supplements
    .map((s) => {
      const activeDays = list.filter((x) => supplementActive(s, x.date, settings));
      const taken = activeDays.filter((x) => x.e.supplements?.[s.id]).length;
      return { id: s.id, name: s.name, taken, days: activeDays.length, rate: activeDays.length ? taken / activeDays.length : null };
    })
    .filter((s) => s.days > 0);

  const bristolAll = E.flatMap((e) => (e.bristol || []).slice(0, e.stoolCount || 0)).filter(isNum);
  const bristolDist = [1, 2, 3, 4, 5, 6, 7].map((t) => bristolAll.filter((b) => b === t).length);

  const imigraneDates = datesWhere((e) => e.imigrane === true);
  return {
    ym,
    daysInMonth: days.length,
    filled: list.length,
    completed: E.filter((e) => e.completed).length,
    migraineDates: datesWhere((e) => e.migraine === true),
    imigraneDates,
    imigraneTotal: list.filter((x) => x.e.imigrane === true).reduce((n, x) => n + (x.e.imigraneCount || 1), 0),
    imigraneAlert: imigraneDates.length >= settings.alerts.imigraneDays,
    migraineIntensity: avg(E.filter((e) => e.migraine).map((e) => e.migraineIntensity)),
    periodDates: datesWhere((e) => e.period === true),
    spottingDates: datesWhere((e) => e.spotting === true),
    bloat: {
      morning: avg(E.map((e) => e.bloatMorning)),
      afternoon: avg(E.map((e) => e.bloatAfternoon)),
      evening: avg(E.map((e) => e.bloatEvening)),
      all: avg(E.map(meanBloat)),
    },
    highBloatDates: datesWhere((e) => maxBloat(e) >= high),
    pain: avg(E.map((e) => e.pain)),
    highPainDates: datesWhere((e) => e.pain >= high),
    gas: avg(E.map((e) => e.gas)),
    stoolsPerDay: avg(E.map((e) => e.stoolCount)),
    bristolAvg: avg(bristolAll),
    bristolDist,
    energy: avg(E.map((e) => e.energy)),
    stress: avg(E.map((e) => e.stress)),
    highStressDates: datesWhere((e) => e.stress >= high),
    bruxismDates: datesWhere((e) => e.bruxism === true),
    sleepQuality: avg(E.map((e) => e.sleepQuality)),
    sleepHours: avg(E.map(sleepHours)),
    sleepInRange: E.filter((e) => {
      const h = sleepHours(e);
      return h != null && h >= settings.sleep.minHours && h <= settings.sleep.maxHours;
    }).length,
    sleepTracked: E.filter((e) => sleepHours(e) != null).length,
    water: avg(E.map((e) => METRICS.water.get(e))),
    waterGoalDays: list.filter((x) => waterReached(x.e, x.date)).length,
    waterTracked: E.filter((e) => METRICS.water.get(e) != null).length,
    walkNoon: E.filter((e) => e.walkNoon === true).length,
    walkEve: E.filter((e) => e.walkEve === true).length,
    supplements,
    notes: list.filter((x) => x.e.notes || x.e.problemMeal || x.e.otherPainkiller)
      .map((x) => ({ date: x.date, notes: x.e.notes, problemMeal: x.e.problemMeal, otherPainkiller: x.e.otherPainkiller })),
  };
}

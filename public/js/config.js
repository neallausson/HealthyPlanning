// Valeurs par défaut (modifiables dans l'onglet Options) et contenus de référence.

export const MOTTO = "Pas besoin d'être parfaite : l'important est la régularité et les notes. Un jour « raté » n'annule rien.";

const food = (title, items, note = '') => ({ title, note, items });

export const DEFAULT_FOODS = {
  1: {
    good: [
      food('Féculents', ['riz basmati', 'quinoa', 'sarrasin', 'pommes de terre', 'avoine (portion adaptée)']),
      food('Légumes', ['carottes', 'courgettes', 'haricots verts', 'concombre', 'salade', 'aubergine', 'tomate'], 'cuits au début'),
      food('Fruits', ['kiwi', 'fraises', 'myrtilles', 'orange', 'clémentine', 'ananas'], '1 portion à la fois'),
      food('Protéines', ['œufs', 'poulet', 'dinde', 'poissons', 'viande non transformée', 'tofu ferme']),
      food('Gras', ["huile d'olive", 'colza', 'quelques noix', 'graines de courge']),
      food('Fromages OK', ['parmesan', 'comté', 'emmental', 'gruyère', 'brie', 'camembert', 'chèvre/brebis affinés', 'produits « sans lactose »']),
    ],
    reduce: [
      food('Fructanes', ['ail', 'oignon', 'poireau', 'artichaut', 'blé'], 'blé seulement après le test cœliaque'),
      food('GOS', ['grandes portions de lentilles', 'pois chiches', 'haricots', 'pois cassés']),
      food('Lactose', ['lait', 'fromage blanc', 'yaourts classiques', 'fromages frais']),
      food('Fructose', ['miel', 'mangue', 'pomme', 'poire']),
      food('Polyols', ['champignons', 'chou-fleur', 'abricot', 'prune', 'édulcorants (sorbitol, xylitol…)']),
      food('Fermentés', ['kéfir', 'kimchi', 'choucroute'], 'nouveaux aliments fermentés'),
    ],
  },
  2: { good: [], reduce: [] },
  3: { good: [], reduce: [] },
  4: { good: [], reduce: [] },
};

export const DEFAULT_SUPPLEMENTS = [
  { id: 'mag3_am', name: 'MAG3 matin', moment: 'matin', note: '', fromMonth: null, toMonth: null, enabled: true },
  { id: 'b9', name: 'Vitamine B9', moment: 'matin', note: 'au petit-déj', fromMonth: null, toMonth: null, enabled: true },
  { id: 'gbiome', name: "G'BIOME", moment: 'matin', note: '', fromMonth: 4, toMonth: 4, enabled: true },
  { id: 'fer', name: 'Fer', moment: 'matinee', note: "+ un kiwi ou un verre d'eau citronnée", fromMonth: null, toMonth: null, enabled: true },
  { id: 'origan_noon', name: 'Origan midi', moment: 'midi', note: '15-30 min avant — 7 jours seulement', fromMonth: 1, toMonth: 1, enabled: true },
  { id: 'enzym_noon', name: "Enzym'Activ midi", moment: 'midi', note: 'avec les premières bouchées', fromMonth: null, toMonth: null, enabled: true },
  { id: 'origan_eve', name: 'Origan soir', moment: 'diner', note: 'avant le repas — 7 jours seulement', fromMonth: 1, toMonth: 1, enabled: true },
  { id: 'enzym_eve', name: "Enzym'Activ soir", moment: 'diner', note: 'avec les premières bouchées', fromMonth: null, toMonth: null, enabled: true },
  { id: 'mag3_pm', name: 'MAG3 soir', moment: 'soir', note: '', fromMonth: null, toMonth: null, enabled: true },
  { id: 'permea', name: 'Perméa', moment: 'soir', note: 'à partir du mois 3', fromMonth: 3, toMonth: null, enabled: true },
];

export const DEFAULT_SETTINGS = {
  version: 1,
  programStart: null, // date de début du programme (AAAA-MM-JJ) → calcule semaine / mois
  phase: 1,
  water: {
    steps: [
      { fromWeek: 1, liters: 1 },
      { fromWeek: 2, liters: 1.25 },
      { fromWeek: 3, liters: 1.5 },
    ],
    glassMl: 250,
    countInfusion: true,
    infusionMl: 250,
  },
  sleep: { minHours: 7, maxHours: 9 },
  alerts: {
    imigraneDays: 10, // jours avec Imigrane / mois à signaler au médecin
    highScore: 7, // à partir de ce score, une journée compte comme « difficile »
  },
  supplements: DEFAULT_SUPPLEMENTS,
  foods: DEFAULT_FOODS,
  theme: 'auto',
};

export const MOMENTS = [
  { id: 'matin', title: 'Le matin', icon: '☀️' },
  { id: 'matinee', title: 'Milieu de matinée', icon: '🕙' },
  { id: 'midi', title: 'Déjeuner', icon: '🍽️' },
  { id: 'apresmidi', title: 'Après-midi', icon: '🌤️' },
  { id: 'diner', title: 'Dîner', icon: '🌙' },
  { id: 'soir', title: 'Le soir', icon: '🌛' },
];

export const BREAKFAST_IDEAS = [
  '3 œufs + 1 tranche de pain au levain + kiwi',
  '2 tartines au levain + 80 g de sardines + citron',
  '170 g de skyr sans lactose + graines de courge + kiwi',
  '150 g de tofu brouillé + légumes cuits + pain au levain',
  '2 tartines au levain + 60 g de chèvre/brebis affiné + quelques noix',
];

// Habitudes du guide quotidien. Les compléments actifs sont ajoutés automatiquement selon leur moment.
// kind: 'habit' (case du guide), 'walk' (lié au questionnaire), 'journal' (coché quand le journal est terminé)
export const GUIDE = {
  matin: [
    { id: 'water_wake', emoji: '💧', label: "1 verre d'eau au réveil" },
    { id: 'breakfast', emoji: '🍳', label: 'Petit-déj protéiné (~20 g)', ideas: true },
    { id: 'coffee_delay', emoji: '☕', label: 'Si petit-déj riche en fer : thé/café 1-2 h plus tard' },
    { id: 'light', emoji: '🌞', label: 'Lumière extérieure quelques minutes' },
  ],
  matinee: [
    { id: 'water_mid', emoji: '💧', label: "1 verre d'eau" },
  ],
  midi: [
    { id: 'plate_noon', emoji: '🍽️', label: "Assiette type : protéine + féculent toléré + légumes cuits + filet d'huile d'olive" },
    { id: 'calm_noon', emoji: '🧘', label: '15-20 min assise, sans écran, bien mâcher' },
    { id: 'walkNoon', kind: 'walk', emoji: '🚶', label: "5-10 min de marche douce si l'énergie le permet" },
  ],
  apresmidi: [
    { id: 'infusion', emoji: '🍵', label: "1 tasse de l'infusion de la phase en cours" },
    { id: 'bottle', emoji: '💧', label: 'Gourde à portée de main' },
    { id: 'breath', emoji: '😮‍💨', label: 'Si tension : 2-5 min de respiration (inspire 5 s / expire 5 s) + relâcher la mâchoire' },
  ],
  diner: [
    { id: 'meal_eve', emoji: '🍽️', label: 'Repas complet, pas trop copieux (les féculents le soir sont OK)' },
    { id: 'walkEve', kind: 'walk', emoji: '🚶', label: '5-10 min de marche si possible' },
  ],
  soir: [
    { id: 'journal', kind: 'journal', emoji: '📓', label: 'Remplir le journal (2 minutes)' },
    { id: 'sleep_regular', emoji: '😴', label: 'Coucher à heure régulière, viser 7-9 h de sommeil' },
  ],
};

export const ENERGY_TIPS = [
  { id: 'low', emoji: '🛌', title: 'Fatigue forte / migraine', text: 'Repos, repas réguliers, hydratation.' },
  { id: 'ok', emoji: '🚶', title: 'Énergie OK', text: 'Courte marche, sans performance.' },
  { id: 'better', emoji: '🌱', title: 'Mieux depuis un moment', text: 'Augmenter doucement, renforcement musculaire plus tard.' },
];

// Échelles des curseurs : [valeur max, adjectif, emoji]. `good: true` = plus c'est haut, mieux c'est.
export const SCALES = {
  bloat: { good: false, levels: [[0, 'Ventre tout plat', '🌸'], [2, 'Léger', '🍃'], [4, 'Gênant', '😕'], [6, 'Bien gonflé', '🎈'], [8, 'Très gonflé', '😣'], [10, 'Ballon de baudruche', '💥']] },
  pain: { good: false, levels: [[0, 'Aucune douleur', '😌'], [2, 'Petite gêne', '🙂'], [4, 'Inconfortable', '😕'], [6, 'Douloureux', '😣'], [8, 'Très douloureux', '😖'], [10, 'Insupportable', '🆘']] },
  gas: { good: false, levels: [[0, 'Rien à signaler', '😌'], [2, 'Discrets', '🍃'], [4, 'Présents', '💨'], [6, 'Envahissants', '😬'], [8, 'Très gênants', '😣'], [10, 'Tempête', '🌪️']] },
  energy: { good: true, levels: [[0, 'Batterie vide', '🪫'], [2, 'Épuisée', '😩'], [4, 'Fatiguée', '🥱'], [6, 'Ça va', '🙂'], [8, 'En forme', '😊'], [10, 'Pile électrique', '⚡']] },
  sleepQuality: { good: true, levels: [[1, 'Nuit blanche', '🦉'], [3, 'Agitée', '😵‍💫'], [5, 'Moyenne', '😐'], [7, 'Correcte', '🙂'], [9, 'Reposante', '😴'], [10, 'Comme un bébé', '👶']] },
  stress: { good: false, levels: [[0, 'Zen absolue', '🧘'], [2, 'Détendue', '😌'], [4, 'Un peu tendue', '😐'], [6, 'Stressée', '😟'], [8, 'Sous pression', '😫'], [10, 'Cocotte-minute', '🌋']] },
  migraine: { good: false, levels: [[2, 'Légère', '🙂'], [4, 'Modérée', '😕'], [6, 'Forte', '😣'], [8, 'Très forte', '😖'], [10, 'Terrassante', '🆘']] },
};

export const BRISTOL = [
  { type: 1, label: 'Petites billes dures', hint: 'constipation' },
  { type: 2, label: 'Saucisse grumeleuse', hint: 'constipation légère' },
  { type: 3, label: 'Saucisse craquelée', hint: 'normal' },
  { type: 4, label: 'Lisse et molle', hint: 'idéal ✨' },
  { type: 5, label: 'Morceaux mous', hint: 'manque de fibres' },
  { type: 6, label: 'Pâteuse', hint: 'diarrhée légère' },
  { type: 7, label: 'Liquide', hint: 'diarrhée' },
];

export const PAIN_SPOTS = ['Haut du ventre', 'Autour du nombril', 'Bas du ventre', 'Côté gauche', 'Côté droit', 'Diffuse'];

export const MIGRAINE_DURATIONS = ['< 1 h', '1-3 h', '3-6 h', '6-12 h', '12-24 h', '> 24 h'];

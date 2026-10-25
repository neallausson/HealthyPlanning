// Onglet Options : objectifs, paliers, compléments, listes d'aliments, données.
import { DEFAULT_SETTINGS, MOMENTS } from '../config.js';
import { exportCSV, exportJSON } from '../export.js';
import { api, loadAll, saveSettings, state } from '../state.js';
import { clone, debounce, esc, todayISO, toast } from '../utils.js';
import { applyTheme, logout, navigate } from '../app.js';

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (const k of keys.slice(0, -1)) o = o[k];
  o[keys[keys.length - 1]] = value;
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

export function renderOptions(el) {
  const draft = clone(state.settings);
  let foodPhase = draft.phase;
  const persist = debounce(() => saveSettings(draft), 500);

  const input = (path, type = 'text', attrs = '') => {
    const v = getPath(draft, path);
    if (type === 'bool') return `<input type="checkbox" data-path="${path}" data-type="bool" ${v ? 'checked' : ''} ${attrs}>`;
    return `<input type="${type}" data-path="${path}" data-type="${type}" value="${esc(v ?? '')}" ${attrs}>`;
  };

  function render() {
    const foods = draft.foods[foodPhase] || { good: [], reduce: [] };
    draft.foods[foodPhase] = foods;

    el.innerHTML = `
    <div class="page-head"><h2>⚙️ Options</h2><span class="small muted">Les changements sont enregistrés automatiquement.</span></div>

    <div class="grid-2">
      <section class="card">
        <h3>🧭 Programme</h3>
        <label class="field"><span>Date de début du programme</span>${input('programStart', 'date', `max="${todayISO()}"`)}</label>
        <p class="small muted">Sert à calculer la semaine (objectif d’eau) et le mois (compléments actifs).</p>
        <div class="field"><span>Phase actuelle</span>
          <div class="chips">${[1, 2, 3, 4].map((p) => `<button type="button" class="pill ${draft.phase === p ? 'on' : ''}" data-set-phase="${p}">Phase ${p}</button>`).join('')}</div>
        </div>
      </section>

      <section class="card">
        <h3>😴 Sommeil & alertes</h3>
        <div class="field-row">
          <label class="field"><span>Sommeil min (h)</span>${input('sleep.minHours', 'number', 'min="3" max="14" step="0.5"')}</label>
          <label class="field"><span>Sommeil max (h)</span>${input('sleep.maxHours', 'number', 'min="3" max="14" step="0.5"')}</label>
        </div>
        <label class="field"><span>Alerte Imigrane : jours / mois</span>${input('alerts.imigraneDays', 'number', 'min="1" max="31"')}</label>
        <label class="field"><span>Score « journée difficile » (ballonnements, douleur, stress ≥)</span>${input('alerts.highScore', 'number', 'min="1" max="10"')}</label>
      </section>
    </div>

    <section class="card" style="margin-top:1rem">
      <h3>💧 Hydratation — paliers</h3>
      <div class="opt-list">
        ${draft.water.steps.map((st, i) => `
        <div class="opt-row">
          <label class="field" style="margin:0"><span>À partir de la semaine</span>${input(`water.steps.${i}.fromWeek`, 'number', 'min="1" max="104"')}</label>
          <label class="field" style="margin:0"><span>Litres / jour</span>${input(`water.steps.${i}.liters`, 'number', 'min="0.25" max="5" step="0.05"')}</label>
          <button type="button" class="btn btn-icon btn-danger" data-del-step="${i}" aria-label="Supprimer le palier">✕</button>
        </div>`).join('')}
      </div>
      <button type="button" class="btn btn-sm btn-soft" data-add-step style="margin-top:.7rem">+ Ajouter un palier</button>
      <div class="field-row" style="margin-top:1rem">
        <label class="field"><span>Taille d’un verre (ml)</span>${input('water.glassMl', 'number', 'min="50" max="1000" step="10"')}</label>
        <label class="field"><span>Taille d’une tasse d’infusion (ml)</span>${input('water.infusionMl', 'number', 'min="50" max="1000" step="10"')}</label>
      </div>
      <label class="switch">${input('water.countInfusion', 'bool')} Compter les infusions dans l’objectif d’eau</label>
    </section>

    <section class="card">
      <h3>💊 Compléments</h3>
      <p class="small muted">Mois de début / fin vides = tout le temps. Ils apparaissent dans le guide du jour au moment choisi.</p>
      <div class="opt-list">
        ${draft.supplements.map((x, i) => `
        <div class="sup-row">
          <label class="field"><span>Nom</span>${input(`supplements.${i}.name`)}</label>
          <label class="field"><span>Moment</span>
            <select data-path="supplements.${i}.moment" data-type="text">
              ${MOMENTS.map((m) => `<option value="${m.id}" ${x.moment === m.id ? 'selected' : ''}>${m.title}</option>`).join('')}
            </select></label>
          <label class="field"><span>Du mois</span>${input(`supplements.${i}.fromMonth`, 'number', 'min="1" max="36" placeholder="—"')}</label>
          <label class="field"><span>Au mois</span>${input(`supplements.${i}.toMonth`, 'number', 'min="1" max="36" placeholder="—"')}</label>
          <div class="btn-row" style="align-items:center">
            <label class="switch" title="Actif">${input(`supplements.${i}.enabled`, 'bool')} actif</label>
            <button type="button" class="btn btn-icon btn-danger" data-del-sup="${i}" aria-label="Supprimer">✕</button>
          </div>
          <label class="field sup-note"><span>Note</span>${input(`supplements.${i}.note`)}</label>
        </div>`).join('')}
      </div>
      <button type="button" class="btn btn-sm btn-soft" data-add-sup style="margin-top:.7rem">+ Ajouter un complément</button>
    </section>

    <section class="card">
      <div class="card-title"><h3>🥗 Listes d’aliments</h3>
        <div class="chips">${[1, 2, 3, 4].map((p) => `<button type="button" class="pill ${foodPhase === p ? 'on' : ''}" data-food-phase="${p}">Phase ${p}</button>`).join('')}</div>
      </div>
      <p class="small muted">Un aliment par ligne ou séparés par des virgules.</p>
      <div class="grid-2">
        ${['good', 'reduce'].map((kind) => `
        <div>
          <h4>${kind === 'good' ? '✅ À privilégier' : '⏸️ À réduire'}</h4>
          ${foods[kind].map((c, i) => `
          <div class="sup-row" style="margin-bottom:.6rem; grid-template-columns:1fr">
            <div class="field-row">
              <label class="field" style="margin:0"><span>Catégorie</span>${input(`foods.${foodPhase}.${kind}.${i}.title`)}</label>
              <label class="field" style="margin:0"><span>Précision</span>${input(`foods.${foodPhase}.${kind}.${i}.note`)}</label>
            </div>
            <label class="field" style="margin:0"><span>Aliments</span>
              <textarea rows="3" data-path="foods.${foodPhase}.${kind}.${i}.items" data-type="items">${esc(c.items.join(', '))}</textarea></label>
            <button type="button" class="link-btn" data-del-food="${kind}.${i}">Supprimer la catégorie</button>
          </div>`).join('')}
          <button type="button" class="btn btn-sm btn-soft" data-add-food="${kind}">+ Catégorie</button>
        </div>`).join('')}
      </div>
    </section>

    <div class="grid-2">
      <section class="card">
        <h3>🎨 Apparence</h3>
        <div class="chips">
          ${[['auto', 'Automatique'], ['light', '☀️ Clair'], ['dark', '🌙 Sombre']].map(([v, l]) => `<button type="button" class="pill ${draft.theme === v ? 'on' : ''}" data-theme-set="${v}">${l}</button>`).join('')}
        </div>
        <p class="small muted" style="margin-top:.8rem">Astuce : sur téléphone, « Ajouter à l’écran d’accueil » depuis le navigateur pour l’ouvrir comme une appli.</p>
      </section>

      <section class="card">
        <h3>📦 Mes données</h3>
        <div class="btn-row">
          <button type="button" class="btn btn-primary btn-sm" data-export="csv">📊 Export Excel (CSV)</button>
          <button type="button" class="btn btn-sm" data-export="json">💾 Sauvegarde complète (JSON)</button>
        </div>
        <p class="small muted" style="margin-top:.6rem">Le récap mensuel (avec impression PDF pour le médecin) est dans l’onglet <a href="#recap">Récap</a>.</p>
        <label class="field" style="margin-top:.8rem"><span>Restaurer une sauvegarde JSON</span>
          <input type="file" id="import-file" accept="application/json,.json"></label>
        <p class="small muted">Stockage : ${state.storage === 'redis' ? 'base en ligne ✓' : state.storage === 'file' ? 'fichier local (mode développement)' : '—'}</p>
        <div class="btn-row" style="margin-top:.6rem">
          <button type="button" class="btn btn-sm" data-reset>↺ Réglages par défaut</button>
          <button type="button" class="btn btn-sm btn-danger" data-logout>Se déconnecter</button>
        </div>
      </section>
    </div>`;
  }

  function changed(rerender = false) {
    persist();
    if (rerender) render();
  }

  el.addEventListener('input', (e) => {
    const t = e.target;
    if (!t.dataset.path) return;
    let value;
    switch (t.dataset.type) {
      case 'number': value = t.value === '' ? null : Number(t.value); break;
      case 'bool': value = t.checked; break;
      case 'date': value = t.value || null; break;
      case 'items': value = t.value.split(/[,\n]/).map((x) => x.trim()).filter(Boolean); break;
      default: value = t.value;
    }
    setPath(draft, t.dataset.path, value);
    changed();
  });

  el.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const d = b.dataset;

    if (d.setPhase) { draft.phase = Number(d.setPhase); foodPhase = draft.phase; return changed(true); }
    if (d.foodPhase) { foodPhase = Number(d.foodPhase); return render(); }
    if (d.themeSet) { draft.theme = d.themeSet; saveSettings(draft); applyTheme(); return render(); }

    if (d.addStep !== undefined) {
      const last = draft.water.steps[draft.water.steps.length - 1];
      draft.water.steps.push({ fromWeek: (last?.fromWeek || 0) + 1, liters: last?.liters || 1.5 });
      return changed(true);
    }
    if (d.delStep) {
      if (draft.water.steps.length <= 1) return toast('Il faut au moins un palier');
      draft.water.steps.splice(Number(d.delStep), 1);
      return changed(true);
    }

    if (d.addSup !== undefined) {
      draft.supplements.push({ id: `sup_${Date.now().toString(36)}`, name: 'Nouveau complément', moment: 'matin', note: '', fromMonth: null, toMonth: null, enabled: true });
      return changed(true);
    }
    if (d.delSup) {
      const sup = draft.supplements[Number(d.delSup)];
      if (!confirm(`Supprimer « ${sup.name} » ? (les jours déjà cochés restent dans l’historique, mais ne seront plus affichés)`)) return;
      draft.supplements.splice(Number(d.delSup), 1);
      return changed(true);
    }

    if (d.addFood) {
      draft.foods[foodPhase][d.addFood].push({ title: 'Nouvelle catégorie', note: '', items: [] });
      return changed(true);
    }
    if (d.delFood) {
      const [kind, i] = d.delFood.split('.');
      draft.foods[foodPhase][kind].splice(Number(i), 1);
      return changed(true);
    }

    if (d.export === 'csv') { const n = exportCSV(); return toast(`${n} jour(s) exporté(s)`); }
    if (d.export === 'json') return exportJSON();

    if (d.reset !== undefined) {
      if (!confirm('Remettre tous les réglages par défaut ? (les données du journal ne sont pas touchées)')) return;
      const keep = { programStart: draft.programStart, phase: draft.phase, theme: draft.theme };
      Object.assign(draft, clone(DEFAULT_SETTINGS), keep);
      saveSettings(draft);
      return render();
    }
    if (d.logout !== undefined) return logout();
  });

  el.addEventListener('change', async (e) => {
    if (e.target.id !== 'import-file') return;
    const file = e.target.files[0];
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      if (!backup.entries) throw new Error('Ce fichier ne ressemble pas à une sauvegarde Healthy Planning');
      const n = Object.keys(backup.entries).length;
      let mode = 'merge';
      if (!confirm(`${n} journée(s) trouvée(s).\n\nOK = fusionner avec les données actuelles (les jours en double sont remplacés par la sauvegarde).`)) {
        if (!confirm('Remplacer TOUTES les données actuelles par cette sauvegarde ?')) return;
        mode = 'replace';
      }
      const res = await api.import(backup, mode);
      await loadAll();
      applyTheme();
      toast(`Import terminé : ${res.entries} journée(s) ✓`);
      navigate('#options');
    } catch (err) {
      toast(`Import impossible : ${err.message}`, 4000);
    } finally {
      e.target.value = '';
    }
  });

  render();
}

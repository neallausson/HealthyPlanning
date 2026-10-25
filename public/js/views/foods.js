// Onglet Aliments : à privilégier / à réduire par phase, avec recherche rapide.
import { BREAKFAST_IDEAS } from '../config.js';
import { state } from '../state.js';
import { esc } from '../utils.js';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export function renderFoods(el, param) {
  const s = state.settings;
  let phase = Number(param) || s.phase;
  let query = '';

  function column(kind, title, cats) {
    return `
    <section class="card food-col food-${kind}">
      <h3>${title}</h3>
      ${cats.length ? cats.map((c) => `
        <div class="food-cat">
          <h4>${esc(c.title)}${c.note ? ` <small>(${esc(c.note)})</small>` : ''}</h4>
          <div class="food-tags">${c.items.map((i) => `<span class="food-tag" data-food="${esc(norm(i))}">${esc(i)}</span>`).join('')}</div>
        </div>`).join('') : '<p class="muted">Rien pour l’instant — ajoute des aliments dans <a href="#options">Options</a>.</p>'}
    </section>`;
  }

  function render() {
    const lists = s.foods[phase] || { good: [], reduce: [] };
    el.innerHTML = `
    <div class="page-head">
      <h2>🥗 Ce que je mange / ce que je réduis</h2>
      <div class="chips">${[1, 2, 3, 4].map((p) => `<button class="pill ${p === phase ? 'on' : ''}" data-phase="${p}">Phase ${p}${p === s.phase ? ' •' : ''}</button>`).join('')}</div>
    </div>

    <div class="food-search">
      <input type="text" id="food-q" placeholder="🔎 Est-ce que je peux manger… (ex : pomme, riz, lait)" value="${esc(query)}" autocomplete="off">
      <div id="food-result"></div>
    </div>

    <div class="grid-2">
      ${column('good', '✅ À privilégier', lists.good)}
      ${column('reduce', '⏸️ À réduire temporairement', lists.reduce)}
    </div>

    <div class="grid-2" style="margin-top:1rem">
      <section class="card">
        <h3>🍳 Petit-déj protéiné (~20 g)</h3>
        <ul>${BREAKFAST_IDEAS.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      </section>
      <section class="card">
        <h3>🍽️ Assiette type</h3>
        <p><strong>Protéine</strong> (poulet / poisson / œufs) + <strong>féculent toléré</strong> (riz, quinoa…) + <strong>légumes cuits</strong> + filet d’huile d’olive.</p>
        <p class="muted small">15-20 min assise, sans écran, bien mâcher. Les féculents le soir sont OK.</p>
      </section>
    </div>`;
    search();
  }

  function search() {
    const q = norm(query.trim());
    const tags = el.querySelectorAll('.food-tag');
    tags.forEach((t) => t.classList.toggle('hit', q.length >= 2 && t.dataset.food.includes(q)));
    const box = el.querySelector('#food-result');
    if (q.length < 2) { box.innerHTML = ''; return; }
    const lists = s.foods[phase] || { good: [], reduce: [] };
    const find = (cats) => cats.flatMap((c) => c.items.filter((i) => norm(i).includes(q)).map((i) => `${i} (${c.title})`));
    const good = find(lists.good);
    const reduce = find(lists.reduce);
    box.innerHTML = `<div class="search-result">${
      good.length ? `✅ À privilégier : ${esc(good.join(', '))}<br>` : ''}${
      reduce.length ? `⏸️ À réduire : ${esc(reduce.join(', '))}` : ''}${
      !good.length && !reduce.length ? '🤔 Pas dans les listes de cette phase — à tester en petite quantité et à noter dans le journal.' : ''}</div>`;
  }

  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-phase]');
    if (b) { phase = Number(b.dataset.phase); render(); }
  });
  el.addEventListener('input', (e) => {
    if (e.target.id === 'food-q') { query = e.target.value; search(); }
  });

  render();
}

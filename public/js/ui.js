// Composants HTML réutilisables : curseurs avec adjectifs, Oui/Non, compteurs.
import { SCALES } from './config.js';
import { esc, fmt, isNum, scoreColor } from './utils.js';

export function levelFor(scaleKey, value) {
  const { levels } = SCALES[scaleKey];
  const hit = levels.find(([max]) => value <= max) || levels[levels.length - 1];
  return { label: hit[1], emoji: hit[2] };
}

export function scoreLabel(scaleKey, value) {
  if (!isNum(value)) return '—';
  const l = levelFor(scaleKey, value);
  return `${value} · ${l.label} ${l.emoji}`;
}

export function sliderHTML(field, title, scaleKey, value) {
  const { good } = SCALES[scaleKey];
  const set = isNum(value);
  const v = set ? value : 5;
  return `
  <div class="slider ${set ? '' : 'unset'} ${good ? 'track-good' : 'track-bad'}" data-slider="${field}" data-scale="${scaleKey}" style="--c:${scoreColor(v, good)}">
    <div class="slider-head">
      <span class="slider-title">${title}</span>
      <span class="slider-badge">${set ? esc(scoreLabel(scaleKey, value)) : 'Glisse pour noter'}</span>
    </div>
    <input type="range" min="0" max="10" step="1" value="${v}" data-field="${field}" aria-label="${esc(title.replace(/<[^>]+>/g, ''))}">
    <div class="slider-foot"><span>0</span><button type="button" class="link-btn" data-clear="${field}" ${set ? '' : 'hidden'}>effacer</button><span>10</span></div>
  </div>`;
}

export function updateSlider(wrap, value) {
  const scaleKey = wrap.dataset.scale;
  const { good } = SCALES[scaleKey];
  const set = isNum(value);
  wrap.classList.toggle('unset', !set);
  wrap.style.setProperty('--c', scoreColor(set ? value : 5, good));
  wrap.querySelector('.slider-badge').textContent = set ? scoreLabel(scaleKey, value) : 'Glisse pour noter';
  wrap.querySelector('[data-clear]').hidden = !set;
  if (!set) wrap.querySelector('input').value = 5;
}

export function ynHTML(field, label, value) {
  return `
  <div class="yn">
    <span class="yn-label">${label}</span>
    <div class="yn-btns" data-yn="${field}" role="group" aria-label="${esc(label.replace(/<[^>]+>/g, ''))}">
      <button type="button" data-value="true" class="${value === true ? 'on' : ''}">Oui</button>
      <button type="button" data-value="false" class="${value === false ? 'on' : ''}">Non</button>
    </div>
  </div>`;
}

export function updateYN(group, value) {
  group.querySelectorAll('button').forEach((b) => b.classList.toggle('on', String(value) === b.dataset.value));
}

// opts : { step, min, max, unit, digits }
export function stepperHTML(field, value, opts) {
  return `
  <div class="stepper" data-stepper="${field}" data-step="${opts.step}" data-min="${opts.min}" data-max="${opts.max}" data-unit="${esc(opts.unit || '')}" data-digits="${opts.digits ?? 0}">
    <button type="button" data-dir="-1" aria-label="Moins">−</button>
    <output>${formatStep(value, opts)}</output>
    <button type="button" data-dir="1" aria-label="Plus">+</button>
  </div>`;
}

export function formatStep(value, { unit = '', digits = 0 } = {}) {
  return isNum(value) ? `${fmt(value, digits)}${unit ? ` ${unit}` : ''}` : '—';
}

export function stepValue(stepper, current, dir) {
  const step = Number(stepper.dataset.step);
  const min = Number(stepper.dataset.min);
  const max = Number(stepper.dataset.max);
  // Compteur vide : « + » donne le premier palier, « − » donne le minimum (ex : 0 selle)
  if (!isNum(current)) return dir > 0 ? Math.min(max, Math.max(min, step)) : min;
  const next = Math.round((current + dir * step) * 1000) / 1000;
  return Math.max(min, Math.min(max, next));
}

export function checkTileHTML(attrs, label, on, sub = '') {
  return `<button type="button" class="check-tile ${on ? 'on' : ''}" ${attrs}><span class="box">${on ? '✓' : ''}</span><span>${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span></button>`;
}

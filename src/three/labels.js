/**
 * HTML overlays in 3D space.
 *
 * Fraction names sit on top of the blocks as crisp DOM text via CSS2DRenderer
 * rather than as textures, so they stay legible at any zoom and can be styled
 * with the rest of the UI. Elements are pooled: changing the label mode on a
 * 200-row wall reuses the same nodes instead of rebuilding the overlay.
 */

import { Group } from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';

export class LabelLayer {
  constructor(container) {
    this.renderer = new CSS2DRenderer();
    const el = this.renderer.domElement;
    el.classList.add('fw-labels');
    container.appendChild(el);

    this.group = new Group();
    this.pool = [];
    this.active = 0;
  }

  /**
   * @param {{text:string, className?:string, position:{x:number,y:number,z:number}}[]} list
   */
  setLabels(list) {
    for (let i = 0; i < list.length; i += 1) {
      const item = list[i];
      let entry = this.pool[i];
      if (!entry) {
        const element = document.createElement('div');
        const object = new CSS2DObject(element);
        entry = { element, object };
        this.pool.push(entry);
        this.group.add(object);
      }
      const { element, object } = entry;
      const className = item.className ?? 'fw-label';
      if (element.className !== className) element.className = className;
      if (element.textContent !== item.text) element.textContent = item.text;
      object.position.set(item.position.x, item.position.y, item.position.z);
      // `center` picks which part of the element sits on the 3D point, so row
      // captions can hang off the left of the wall instead of straddling it.
      object.center.set(item.center?.x ?? 0.5, item.center?.y ?? 0.5);
      object.visible = true;
    }
    for (let i = list.length; i < this.pool.length; i += 1) {
      this.pool[i].object.visible = false;
    }
    this.active = list.length;
  }

  clear() {
    this.setLabels([]);
  }

  setSize(width, height) {
    this.renderer.setSize(width, height);
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);
  }

  dispose() {
    this.group.clear();
    this.pool.forEach(({ object }) => {
      if (object.element?.parentNode) object.element.remove();
    });
    this.pool.length = 0;
    this.renderer.domElement.remove();
  }
}

/**
 * The floating card that follows the pointer's block. It is a single pooled
 * element, so hovering across a wall of 10 000 blocks does no DOM churn beyond
 * rewriting its contents.
 */
export class HoverCard {
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'fw-card';
    this.object = new CSS2DObject(this.element);
    this.object.center.set(0.5, 1);
    this.object.visible = false;
  }

  /**
   * @param {{x:number,y:number,z:number}} position
   * @param {{fraction:string, den:number, name:string, value:string|null,
   *          decimal:string, percent:string, equivalents:string|null,
   *          note:string|null, wholeLabel:string|null}} info
   */
  show(position, info) {
    this.element.innerHTML = cardMarkup(info);
    this.object.position.set(position.x, position.y, position.z);
    this.object.visible = true;
  }

  hide() {
    this.object.visible = false;
  }

  dispose() {
    if (this.element.parentNode) this.element.remove();
  }
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

function cardMarkup(info) {
  const rows = [];
  rows.push(
    `<div class="fw-card__head">` +
    `<span class="fw-frac" aria-hidden="true"><b>1</b><i>${escapeHtml(info.den)}</i></span>` +
    `<span class="fw-card__name">${escapeHtml(info.name)}</span>` +
    `</div>`,
  );
  if (info.value) {
    rows.push(`<div class="fw-card__value">${escapeHtml(info.value)}</div>`);
  }
  rows.push(
    `<div class="fw-card__meta">${escapeHtml(info.decimal)} \u00b7 ${escapeHtml(info.percent)}</div>`,
  );
  if (info.equivalents) {
    rows.push(`<div class="fw-card__equiv">= ${escapeHtml(info.equivalents)}</div>`);
  }
  if (info.note) {
    rows.push(`<div class="fw-card__note">${escapeHtml(info.note)}</div>`);
  }
  if (info.wholeLabel) {
    rows.push(`<div class="fw-card__whole">${escapeHtml(info.wholeLabel)}</div>`);
  }
  return rows.join('');
}

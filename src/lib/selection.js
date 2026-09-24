/**
 * Selection maths.
 *
 * A selection is a set of piece keys, `"<wholeIndex>:<den>:<index>"`. Adding
 * them up is how the wall expresses a mixed number: two whole blocks plus a
 * half block reads as 2 1/2.
 */

import { add, frac, sum, toMixed, zero } from './fraction.js';

export function parseKey(key) {
  const [wholeIndex, den, index] = key.split(':').map(Number);
  return { wholeIndex, den, index };
}

export function pieceKey(wholeIndex, den, index) {
  return `${wholeIndex}:${den}:${index}`;
}

/** Keys for a whole row, left to right. */
export function rowKeys(wholeIndex, den) {
  return Array.from({ length: den }, (_, i) => pieceKey(wholeIndex, den, i));
}

/** Keys from the start of a row up to and including `index`. */
export function runKeys(wholeIndex, den, index) {
  return Array.from({ length: index + 1 }, (_, i) => pieceKey(wholeIndex, den, i));
}

/** Toggle a group of keys as a unit: all on unless they are already all on. */
export function toggleGroup(selection, keys) {
  const next = new Set(selection);
  const allSelected = keys.every((key) => next.has(key));
  keys.forEach((key) => (allSelected ? next.delete(key) : next.add(key)));
  return next;
}

export function toggleKey(selection, key) {
  const next = new Set(selection);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  return next;
}

/** Drop keys that no longer exist after the wall's shape changed. */
export function pruneSelection(selection, denominators, wholes) {
  const allowed = new Set(denominators);
  const next = new Set();
  for (const key of selection) {
    const { wholeIndex, den, index } = parseKey(key);
    if (wholeIndex < wholes && allowed.has(den) && index < den) next.add(key);
  }
  return next.size === selection.size ? selection : next;
}

/**
 * Everything the readout needs: the exact total, the pieces grouped by
 * denominator, and how many wholes were touched.
 */
export function selectionSummary(selection) {
  const items = [...selection].map(parseKey);
  const total = items.length ? sum(items.map(({ den }) => frac(1, den))) : zero();

  const counts = new Map();
  items.forEach(({ den }) => counts.set(den, (counts.get(den) ?? 0) + 1));
  const terms = [...counts.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([den, count]) => ({ den, count, subtotal: frac(count, den) }));

  const wholesTouched = new Set(items.map((item) => item.wholeIndex)).size;

  return {
    count: items.length,
    total,
    mixed: toMixed(total),
    terms,
    wholesTouched,
  };
}

/** "1 + 1 + 1/2" for the selected pieces, collapsing repeats past four terms. */
export function termsExpression(terms) {
  const parts = [];
  terms.forEach(({ den, count }) => {
    const label = den === 1 ? '1' : `1/${den}`;
    if (count <= 3) {
      for (let i = 0; i < count; i += 1) parts.push(label);
    } else {
      parts.push(`${count} \u00d7 ${label}`);
    }
  });
  return parts.join(' + ');
}

/** Running total as you build a selection, used for the fraction strip. */
export function subtotalFor(terms) {
  return terms.reduce((acc, term) => add(acc, term.subtotal), zero());
}

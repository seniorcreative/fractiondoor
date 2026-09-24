/**
 * Which rows the wall shows.
 *
 * The printed wall stops at twelfths. Here the row set is a parameter, so you
 * can keep going until the first piece in a row is a sliver and the 1/n curve
 * visibly flattens onto its asymptote.
 */

export const ROW_PRESETS = [
  {
    id: 'classic',
    label: 'Classic wall',
    hint: 'Halves, thirds, quarters, sixths, eighths, twelfths \u2014 then every denominator past 12',
  },
  {
    id: 'sequential',
    label: 'Every denominator',
    hint: '2, 3, 4, 5, 6 \u2026 up to the limit',
  },
  {
    id: 'halving',
    label: 'Repeated halving',
    hint: '2, 4, 8, 16, 32 \u2026',
  },
  {
    id: 'decimal',
    label: 'Decimal friendly',
    hint: '2, 4, 5, 10, 20, 25, 50, 100',
  },
  {
    id: 'primes',
    label: 'Primes',
    hint: '2, 3, 5, 7, 11, 13 \u2026',
  },
  {
    id: 'custom',
    label: 'Custom list',
    hint: 'Type your own denominators',
  },
];

export const MIN_DENOMINATOR_LIMIT = 1;
export const MAX_DENOMINATOR_LIMIT = 200;

const CLASSIC = [2, 3, 4, 6, 8, 12];
const DECIMAL = [2, 4, 5, 10, 20, 25, 50, 100, 200];

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i += 1) {
    if (n % i === 0) return false;
  }
  return true;
}

function parseCustom(text) {
  return String(text ?? '')
    .split(/[^0-9]+/)
    .map((part) => Number.parseInt(part, 10))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= MAX_DENOMINATOR_LIMIT);
}

/**
 * Build the sorted, de-duplicated list of denominators for the current config.
 * Row order runs from the largest pieces (smallest denominator) downwards,
 * matching the printed wall.
 */
export function buildDenominators({
  rowPreset = 'classic',
  maxDenominator = 12,
  includeWhole = true,
  customDenominators = '',
} = {}) {
  const limit = clamp(maxDenominator, MIN_DENOMINATOR_LIMIT, MAX_DENOMINATOR_LIMIT);
  let list;

  switch (rowPreset) {
    case 'sequential':
      list = range(2, limit);
      break;
    case 'halving':
      list = [];
      for (let d = 2; d <= limit; d *= 2) list.push(d);
      break;
    case 'decimal':
      list = DECIMAL.filter((d) => d <= limit);
      break;
    case 'primes':
      list = range(2, limit).filter(isPrime);
      break;
    case 'custom':
      list = parseCustom(customDenominators);
      if (!list.length) list = [...CLASSIC];
      break;
    case 'classic':
    default:
      // The printed rows, trimmed by the limit so the wall can be taken right
      // down to a single bar, then continued with every denominator past 12.
      list = [...CLASSIC.filter((d) => d <= limit), ...range(13, limit)];
      break;
  }

  // Each branch already honours the limit; the custom list is bounded only by
  // what the app can draw.
  const set = new Set(list.filter((d) => d >= 1 && d <= MAX_DENOMINATOR_LIMIT));
  if (includeWhole) set.add(1);
  else set.delete(1);
  const rows = [...set].sort((a, b) => a - b);
  // There is always something to look at, even at the bottom of the slider.
  return rows.length ? rows : [1];
}

function range(from, to) {
  const out = [];
  for (let n = from; n <= to; n += 1) out.push(n);
  return out;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Total blocks in the scene for a row set across `wholes` wholes. */
export function countPieces(denominators, wholes) {
  return denominators.reduce((total, d) => total + d, 0) * wholes;
}

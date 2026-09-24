/**
 * What "the whole" stands for.
 *
 * Every preset says how much one whole is worth (`amount` of `unit`), so a
 * piece of the wall can be read as 30 min, 25p, 12.5 cm or 1.5 eggs. The value
 * is computed from the exact rational fraction, so 1/8 of an hour comes out as
 * "7 min 30 s" rather than 7.5.
 */

import {
  compare,
  equals,
  frac,
  formatRational,
  isInteger,
  isZero,
  multiply,
} from './fraction.js';
import { fractionPhrase } from './names.js';

export const UNIT_PRESETS = [
  {
    id: 'abstract',
    label: 'Abstract whole',
    emoji: '\u25a6',
    wholeName: 'whole',
    amount: 1,
    unit: '',
    kind: 'plain',
    blurb: 'Just the number: one is one.',
  },
  {
    id: 'pizza',
    label: 'Pizza',
    emoji: '\ud83c\udf55',
    wholeName: 'pizza',
    amount: 8,
    unit: 'slices',
    kind: 'count',
    blurb: 'One pizza cut into 8 slices.',
  },
  {
    id: 'cake',
    label: 'Cake',
    emoji: '\ud83c\udf82',
    wholeName: 'cake',
    amount: 12,
    unit: 'slices',
    kind: 'count',
    blurb: 'One cake cut into 12 slices.',
  },
  {
    id: 'chocolate',
    label: 'Chocolate bar',
    emoji: '\ud83c\udf6b',
    wholeName: 'bar',
    amount: 24,
    unit: 'squares',
    kind: 'count',
    discrete: true,
    blurb: '24 squares, and you cannot break a square in half neatly.',
  },
  {
    id: 'pound',
    label: 'One pound',
    emoji: '\ud83d\udcb7',
    wholeName: 'pound',
    amount: 100,
    unit: 'p',
    kind: 'money-gbp',
    blurb: '\u00a31 = 100p.',
  },
  {
    id: 'hour',
    label: 'One hour',
    emoji: '\ud83d\udd50',
    wholeName: 'hour',
    amount: 60,
    unit: 'min',
    kind: 'time-hour',
    blurb: '60 minutes, which is why thirds and sixths behave so well.',
  },
  {
    id: 'day',
    label: 'One day',
    emoji: '\ud83d\udcc5',
    wholeName: 'day',
    amount: 24,
    unit: 'h',
    kind: 'time-day',
    blurb: '24 hours.',
  },
  {
    id: 'metre',
    label: 'One metre',
    emoji: '\ud83d\udccf',
    wholeName: 'metre',
    amount: 100,
    unit: 'cm',
    kind: 'plain',
    blurb: '100 centimetres.',
  },
  {
    id: 'kilogram',
    label: 'One kilogram',
    emoji: '\u2696\ufe0f',
    wholeName: 'kilogram',
    amount: 1000,
    unit: 'g',
    kind: 'plain',
    blurb: '1000 grams.',
  },
  {
    id: 'litre',
    label: 'One litre',
    emoji: '\ud83e\uddea',
    wholeName: 'litre',
    amount: 1000,
    unit: 'ml',
    kind: 'plain',
    blurb: '1000 millilitres.',
  },
  {
    id: 'turn',
    label: 'Full turn',
    emoji: '\ud83e\udded',
    wholeName: 'turn',
    amount: 360,
    unit: '\u00b0',
    kind: 'angle',
    blurb: 'A full rotation of 360 degrees.',
  },
  {
    id: 'percent',
    label: 'Percent',
    emoji: '\ufe6a',
    wholeName: 'whole',
    amount: 100,
    unit: '%',
    kind: 'percent',
    blurb: 'The whole as 100%.',
  },
  {
    id: 'class',
    label: 'Class of 30',
    emoji: '\ud83e\uddd1\u200d\ud83c\udfeb',
    wholeName: 'class',
    amount: 30,
    unit: 'children',
    kind: 'count',
    discrete: true,
    blurb: '30 children, so fifths and sixths land on whole people.',
  },
  {
    id: 'dozen',
    label: 'Dozen eggs',
    emoji: '\ud83e\udd5a',
    wholeName: 'dozen',
    amount: 12,
    unit: 'eggs',
    kind: 'count',
    discrete: true,
    blurb: '12 eggs in the box.',
  },
  {
    id: 'custom',
    label: 'Custom\u2026',
    emoji: '\u2733\ufe0f',
    wholeName: 'whole',
    amount: 1,
    unit: 'units',
    kind: 'count',
    blurb: 'Set your own amount and unit name.',
  },
];

const PRESETS_BY_ID = new Map(UNIT_PRESETS.map((p) => [p.id, p]));

/** Merge a preset with the custom amount/name fields from the UI. */
export function resolveUnit(unitId, custom = {}) {
  const preset = PRESETS_BY_ID.get(unitId) ?? PRESETS_BY_ID.get('abstract');
  if (preset.id !== 'custom') return preset;
  const amount = Number(custom.amount);
  return {
    ...preset,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
    unit: (custom.unit ?? '').trim() || 'units',
    wholeName: (custom.wholeName ?? '').trim() || 'whole',
    blurb: 'Your own whole.',
  };
}

/** The exact value of `fraction` of one whole, in the unit's own scale. */
export function unitValue(fraction, unit) {
  const amount = ratioFromNumber(unit.amount);
  return multiply(fraction, amount);
}

/** Non-integer amounts (e.g. 2.5 slices) still become an exact rational. */
function ratioFromNumber(value) {
  if (Number.isInteger(value)) return frac(value);
  const scaled = Math.round(value * 1000);
  return frac(scaled, 1000);
}

const NO_SPACE = new Set(['%', '\u00b0', 'p', '\u00a2']);

/**
 * Format `fraction` of a whole in the current unit.
 * Returns `{ text, exact, note }` where `note` flags units that cannot be
 * split (half an egg) and `exact` is false when the number was rounded.
 */
export function formatUnitValue(fraction, unit) {
  const value = unitValue(fraction, unit);

  switch (unit.kind) {
    case 'money-gbp':
      return formatMoneyGbp(value);
    case 'time-hour':
      return formatTimeFromSeconds(multiply(fraction, frac(3600)), value, 'min');
    case 'time-day':
      return formatTimeFromSeconds(multiply(fraction, frac(86400)), value, 'h');
    default:
      return formatPlain(value, unit);
  }
}

function formatPlain(value, unit) {
  const { text, exact } = formatRational(value, { maxDecimals: 3 });
  const glue = NO_SPACE.has(unit.unit) ? '' : ' ';
  const suffix = unit.unit ? `${glue}${unit.unit}` : '';
  return {
    text: `${exact ? '' : '\u2248'}${text}${suffix}`,
    exact,
    note: unit.discrete && !isInteger(value) ? `does not split into whole ${unit.unit}` : null,
  };
}

function formatMoneyGbp(pence) {
  if (isInteger(pence)) {
    const n = Number(pence.n);
    if (n >= 100) {
      const pounds = Math.floor(n / 100);
      const rest = n % 100;
      return { text: `\u00a3${pounds}.${String(rest).padStart(2, '0')}`, exact: true, note: null };
    }
    return { text: `${n}p`, exact: true, note: null };
  }
  const { text, exact } = formatRational(pence, { maxDecimals: 2 });
  return {
    text: `${exact ? '' : '\u2248'}${text}p`,
    exact,
    note: 'not a whole number of pence',
  };
}

/**
 * Time is friendlier as h/min/s than as a decimal, so use the exact second
 * count when there is one and fall back to a rounded decimal when there is not.
 */
function formatTimeFromSeconds(seconds, fallbackValue, fallbackUnit) {
  if (isInteger(seconds)) {
    const total = Number(seconds.n);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const parts = [];
    if (h) parts.push(`${h} h`);
    if (m) parts.push(`${m} min`);
    if (s) parts.push(`${s} s`);
    return { text: parts.length ? parts.join(' ') : '0 s', exact: true, note: null };
  }
  const { text, exact } = formatRational(fallbackValue, { maxDecimals: 3 });
  return {
    text: `${exact ? '' : '\u2248'}${text} ${fallbackUnit}`,
    exact,
    note: 'not a whole number of seconds',
  };
}

function pluralize(word) {
  if (!word) return word;
  if (/(s|x|ch|sh)$/i.test(word)) return `${word}es`;
  if (/[^aeiou]y$/i.test(word)) return `${word.slice(0, -1)}ies`;
  return `${word}s`;
}

const AN_WORDS = new Set(['hour', 'heir', 'honest']);

/** "a" or "an" for the word that follows. */
function indefiniteArticle(word) {
  const first = String(word).trim().toLowerCase();
  if (AN_WORDS.has(first.split(/\s+/)[0])) return 'an';
  return /^[aeiou]/.test(first) ? 'an' : 'a';
}

/**
 * How much of the whole a selection comes to, said the way people say it.
 *
 * Below one whole it reads as a share of a single thing: "half of a whole",
 * "one quarter of a pizza", "three eighths of an hour". Nobody says "1/2
 * wholes". At one and above it is a count, so the plural comes back:
 * "1 whole", "2½ pizzas".
 */
export function formatWholes(fraction, unit) {
  const name = unit.wholeName;

  if (isZero(fraction)) return `0 ${pluralize(name)}`;

  const one = frac(1);
  if (compare(fraction, one) < 0) {
    return `${fractionPhrase(fraction)} of ${indefiniteArticle(name)} ${name}`;
  }
  if (equals(fraction, one)) return `1 ${name}`;

  const { text, exact } = formatRational(fraction, { maxDecimals: 3, preferVulgar: true });
  return `${exact ? '' : '\u2248'}${text} ${pluralize(name)}`;
}

/** Caption for one whole in the scene: "1 pizza = 8 slices". */
export function wholeCaption(unit) {
  if (unit.kind === 'plain' || unit.kind === 'count' || unit.kind === 'angle' || unit.kind === 'percent') {
    if (!unit.unit) return `1 ${unit.wholeName}`;
    return `1 ${unit.wholeName} = ${unit.amount}${NO_SPACE.has(unit.unit) ? '' : ' '}${unit.unit}`;
  }
  if (unit.kind === 'money-gbp') return '\u00a31 = 100p';
  if (unit.kind === 'time-hour') return '1 hour = 60 min';
  if (unit.kind === 'time-day') return '1 day = 24 h';
  return `1 ${unit.wholeName}`;
}

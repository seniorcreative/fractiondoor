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
  toMixed,
  vulgarGlyph,
} from './fraction.js';
import { fractionPhrase } from './names.js';

// `indefiniteArticle` is defined below, next to the whole-count phrasing it
// shares with the countable units.

export const UNIT_PRESETS = [
  {
    id: 'abstract',
    label: 'Abstract whole',
    icon: 'Square',
    wholeName: 'whole',
    amount: 1,
    unit: '',
    kind: 'plain',
    blurb: 'Just the number: one is one.',
  },
  {
    id: 'pizza',
    label: 'Pizza',
    icon: 'Pizza',
    wholeName: 'pizza',
    amount: 8,
    unit: 'slices',
    unitOne: 'slice',
    kind: 'count',
    blurb: 'One pizza cut into 8 slices.',
  },
  {
    id: 'cake',
    label: 'Cake',
    icon: 'CakeSlice',
    wholeName: 'cake',
    amount: 12,
    unit: 'slices',
    unitOne: 'slice',
    kind: 'count',
    blurb: 'One cake cut into 12 slices.',
  },
  {
    id: 'chocolate',
    label: 'Chocolate bar',
    icon: 'Grid3x3',
    wholeName: 'bar',
    amount: 24,
    unit: 'squares',
    unitOne: 'square',
    kind: 'count',
    discrete: true,
    blurb: '24 squares, and you cannot break a square in half neatly.',
  },
  {
    id: 'pound',
    label: 'One pound',
    icon: 'PoundSterling',
    wholeName: 'pound',
    amount: 100,
    unit: 'p',
    kind: 'money-gbp',
    blurb: '\u00a31 = 100p.',
  },
  {
    id: 'hour',
    label: 'One hour',
    icon: 'Clock',
    wholeName: 'hour',
    amount: 60,
    unit: 'min',
    kind: 'time-hour',
    blurb: '60 minutes, which is why thirds and sixths behave so well.',
  },
  {
    id: 'day',
    label: 'One day',
    icon: 'Calendar',
    wholeName: 'day',
    amount: 24,
    unit: 'h',
    kind: 'time-day',
    blurb: '24 hours.',
  },
  {
    id: 'metre',
    label: 'One metre',
    icon: 'Ruler',
    wholeName: 'metre',
    amount: 100,
    unit: 'cm',
    kind: 'plain',
    blurb: '100 centimetres.',
  },
  {
    id: 'kilogram',
    label: 'One kilogram',
    icon: 'Scale',
    wholeName: 'kilogram',
    amount: 1000,
    unit: 'g',
    kind: 'plain',
    blurb: '1000 grams.',
  },
  {
    id: 'litre',
    label: 'One litre',
    icon: 'FlaskConical',
    wholeName: 'litre',
    amount: 1000,
    unit: 'ml',
    kind: 'plain',
    blurb: '1000 millilitres.',
  },
  {
    id: 'turn',
    label: 'Full turn',
    icon: 'Compass',
    wholeName: 'turn',
    amount: 360,
    unit: '\u00b0',
    kind: 'angle',
    blurb: 'A full rotation of 360 degrees.',
  },
  {
    id: 'percent',
    label: 'Percent',
    icon: 'Percent',
    wholeName: 'whole',
    amount: 100,
    unit: '%',
    kind: 'percent',
    blurb: 'The whole as 100%.',
  },
  {
    id: 'class',
    label: 'Class of 30',
    icon: 'Users',
    wholeName: 'class',
    amount: 30,
    unit: 'children',
    unitOne: 'child',
    kind: 'count',
    discrete: true,
    blurb: '30 children, so fifths and sixths land on whole people.',
  },
  {
    id: 'dozen',
    label: 'Dozen eggs',
    icon: 'Egg',
    wholeName: 'dozen',
    amount: 12,
    unit: 'eggs',
    unitOne: 'egg',
    kind: 'count',
    discrete: true,
    blurb: '12 eggs in the box.',
  },
  {
    id: 'custom',
    label: 'Custom\u2026',
    icon: 'Sparkles',
    wholeName: 'whole',
    amount: 1,
    unit: 'units',
    unitOne: 'unit',
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
  const unit = (custom.unit ?? '').trim() || 'units';
  return {
    ...preset,
    amount: Number.isFinite(amount) && amount > 0 ? amount : 1,
    unit,
    unitOne: singularize(unit),
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
 *
 * `style` picks how a part-way amount is written:
 *   compact — "1½ eggs", for labels sitting inside a block
 *   spoken  — "1 and 1/2 eggs", for the cards, which is how it is read aloud
 *
 * Returns `{ text, exact, note }` where `note` flags units that cannot be
 * split (half an egg) and `exact` is false when the number was rounded.
 */
export function formatUnitValue(fraction, unit, { style = 'compact' } = {}) {
  const value = unitValue(fraction, unit);

  switch (unit.kind) {
    case 'money-gbp':
      return formatMoneyGbp(value);
    case 'time-hour':
      return formatTimeFromSeconds(multiply(fraction, frac(3600)), value, 'min');
    case 'time-day':
      return formatTimeFromSeconds(multiply(fraction, frac(86400)), value, 'h');
    default:
      return formatPlain(value, unit, style);
  }
}

/**
 * Things you count get fractions, because 1.5 eggs is not how anyone says it.
 * Things you measure keep decimals, because 12.5 cm is.
 */
function formatPlain(value, unit, style) {
  const note =
    unit.discrete && !isInteger(value) ? `does not split into whole ${unit.unit}` : null;

  if (unit.kind === 'count') {
    return { text: formatCount(value, unit, style), exact: true, note };
  }

  const rational = formatRational(value, { maxDecimals: 3 });
  const noun = unitNoun(unit, value);
  const glue = NO_SPACE.has(noun) ? '' : ' ';
  return {
    text: `${rational.exact ? '' : '\u2248'}${rational.text}${noun ? `${glue}${noun}` : ''}`,
    exact: rational.exact,
    note,
  };
}

/**
 * Countable amounts, agreeing with the number: "2 eggs", "1 egg",
 * "1½ eggs", and below one a share of a single thing, "half of an egg",
 * because "¾ eggs" is not something anyone says.
 */
function formatCount(value, unit, style) {
  if (isZero(value)) return `0 ${unit.unit}`;

  const singular = unit.unitOne ?? singularize(unit.unit);

  if (compare(value, frac(1)) < 0) {
    const share = style === 'spoken' ? fractionPhrase(value) : compactFraction(value);
    return `${share} of ${indefiniteArticle(singular)} ${singular}`;
  }

  return `${countText(value, style)} ${unitNoun(unit, value)}`;
}

/** "1", "1½", or "1 and 1/2" depending on the style. */
function countText(value, style) {
  if (isInteger(value)) return String(value.n);

  const { sign, whole, n, d } = toMixed(value);
  const prefix = sign < 0 ? '-' : '';

  if (style === 'spoken') {
    return whole === 0n ? `${prefix}${n}/${d}` : `${prefix}${whole} and ${n}/${d}`;
  }

  const glyph = vulgarGlyph(frac(n, d));
  if (glyph) return `${prefix}${whole === 0n ? '' : whole}${glyph}`;
  return whole === 0n ? `${prefix}${n}/${d}` : `${prefix}${whole} ${n}/${d}`;
}

/** "½" where a single glyph exists, otherwise "3/32". */
function compactFraction(value) {
  return vulgarGlyph(value) ?? `${value.n}/${value.d}`;
}

/** Unit noun agreeing with the amount: 1 egg, 2 eggs, 1½ eggs. */
function unitNoun(unit, value) {
  if (!unit.unit) return '';
  const isOne = isInteger(value) && (value.n === 1n || value.n === -1n);
  return isOne ? unit.unitOne ?? singularize(unit.unit) : unit.unit;
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

/**
 * Rough singular of a plural unit name, for agreement at exactly one.
 * Irregulars (children) carry an explicit `unitOne` on the preset instead.
 */
function singularize(word) {
  if (!word) return word;
  if (/ies$/i.test(word)) return `${word.slice(0, -3)}y`;
  if (/(ch|sh|s|x)es$/i.test(word)) return word.slice(0, -2);
  if (/ss$/i.test(word)) return word;
  if (/s$/i.test(word)) return word.slice(0, -1);
  return word;
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
    const noun = unitNoun(unit, frac(Math.round(unit.amount)));
    return `1 ${unit.wholeName} = ${unit.amount}${NO_SPACE.has(noun) ? '' : ' '}${noun}`;
  }
  if (unit.kind === 'money-gbp') return '\u00a31 = 100p';
  if (unit.kind === 'time-hour') return '1 hour = 60 min';
  if (unit.kind === 'time-day') return '1 day = 24 h';
  return `1 ${unit.wholeName}`;
}

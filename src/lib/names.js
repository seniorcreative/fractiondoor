/**
 * Words for fractions: "half", "quarter", "twelfth", "twenty-fourth"...
 * Used by the label overlay and the row captions.
 */

const ONES = [
  '',
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
  'thirteenth',
  'fourteenth',
  'fifteenth',
  'sixteenth',
  'seventeenth',
  'eighteenth',
  'nineteenth',
];

const TENS_ORDINAL = {
  20: 'twentieth',
  30: 'thirtieth',
  40: 'fortieth',
  50: 'fiftieth',
  60: 'sixtieth',
  70: 'seventieth',
  80: 'eightieth',
  90: 'ninetieth',
};

const TENS_CARDINAL = {
  20: 'twenty',
  30: 'thirty',
  40: 'forty',
  50: 'fifty',
  60: 'sixty',
  70: 'seventy',
  80: 'eighty',
  90: 'ninety',
};

const ONES_CARDINAL = [
  '',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

/** Counting word for 1..99, or null when we would rather show digits. */
export function cardinalWord(n) {
  if (!Number.isInteger(n) || n < 1 || n > 99) return null;
  if (n < 20) return ONES_CARDINAL[n];
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  if (ones === 0) return TENS_CARDINAL[tens];
  return `${TENS_CARDINAL[tens]}-${ONES_CARDINAL[ones]}`;
}

/** Ordinal word for 1..99, or null when we would rather show digits. */
export function ordinalWord(n) {
  if (!Number.isInteger(n) || n < 1 || n > 99) return null;
  if (n < 20) return ONES[n];
  const tens = Math.floor(n / 10) * 10;
  const ones = n % 10;
  if (ones === 0) return TENS_ORDINAL[tens];
  return `${TENS_CARDINAL[tens]}-${ONES[ones]}`;
}

/**
 * Name of one piece when the whole is split into `den` parts.
 * 1 -> "whole", 2 -> "half", 4 -> "quarter", 24 -> "twenty-fourth".
 */
export function pieceName(den) {
  if (den === 1) return 'whole';
  if (den === 2) return 'half';
  if (den === 4) return 'quarter';
  return ordinalWord(den) ?? `1/${den}`;
}

/** Plural piece name: "halves", "quarters", "twelfths". */
export function pieceNamePlural(den) {
  const name = pieceName(den);
  if (name === 'whole') return 'wholes';
  if (name === 'half') return 'halves';
  if (name.startsWith('1/')) return `${name}s`;
  return `${name}s`;
}

/** Row caption, e.g. "2 halves", "12 twelfths", "1 whole", "144 × 1/144". */
export function rowCaption(den) {
  if (den === 1) return '1 whole';
  const plural = pieceNamePlural(den);
  if (plural.startsWith('1/')) return `${den} \u00d7 1/${den}`;
  return `${den} ${plural}`;
}

/** Compact label for a piece: "1/12". */
export function fractionLabel(num, den) {
  return `${num}/${den}`;
}

const WORD_LIMIT = 20;

/**
 * How a fraction is said out loud: "half", "one quarter", "three eighths".
 * Falls back to digits once the words would be a mouthful ("13/24"), and keeps
 * "half" rather than "one half" because that is how people say it.
 *
 * @param {{n: bigint, d: bigint}} fraction
 */
export function fractionPhrase({ n, d }) {
  const num = Number(n);
  const den = Number(d);
  if (den === 1) return cardinalWord(num) ?? String(num);
  if (num === 1 && den === 2) return 'half';

  if (num <= WORD_LIMIT && den <= WORD_LIMIT) {
    const numberWord = cardinalWord(num);
    const partWord = num === 1 ? pieceName(den) : pieceNamePlural(den);
    if (numberWord && !partWord.startsWith('1/')) return `${numberWord} ${partWord}`;
  }
  return `${num}/${den}`;
}

/**
 * Unit fractions among `denoms` that are equal to 1/den, as [num, den] pairs.
 * 1/2 with the classic wall gives 2/4, 3/6, 4/8, 6/12.
 */
export function equivalentFractions(den, denoms) {
  return denoms
    .filter((d) => d !== den && d % den === 0)
    .map((d) => [d / den, d]);
}

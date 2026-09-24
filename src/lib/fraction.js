/**
 * Exact rational arithmetic on BigInt.
 *
 * The wall can hold denominators well past 12, and summing a selection like
 * 1/7 + 1/11 + 1/120 needs a common denominator that grows fast. BigInt keeps
 * every readout exact instead of drifting with floating point.
 *
 * A fraction is `{ n: BigInt, d: BigInt }`, always reduced, with `d > 0n`.
 */

const ZERO = { n: 0n, d: 1n };

function bigAbs(v) {
  return v < 0n ? -v : v;
}

function gcdBig(a, b) {
  let x = bigAbs(a);
  let y = bigAbs(b);
  while (y) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x;
}

/** Create a reduced fraction from numbers or BigInts. */
export function frac(n, d = 1) {
  let num = BigInt(n);
  let den = BigInt(d);
  if (den === 0n) throw new Error('Fraction denominator cannot be zero');
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = gcdBig(num, den) || 1n;
  return { n: num / g, d: den / g };
}

export const zero = () => ({ ...ZERO });

export function add(a, b) {
  return frac(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function subtract(a, b) {
  return frac(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function multiply(a, b) {
  return frac(a.n * b.n, a.d * b.d);
}

/** Sum a list of fractions exactly. */
export function sum(list) {
  return list.reduce((acc, f) => add(acc, f), zero());
}

export function isZero(f) {
  return f.n === 0n;
}

export function isInteger(f) {
  return f.d === 1n;
}

export function equals(a, b) {
  return a.n === b.n && a.d === b.d;
}

/** -1, 0 or 1 for a < b, a === b, a > b. */
export function compare(a, b) {
  const left = a.n * b.d;
  const right = b.n * a.d;
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/** Lossy but plenty precise for display and for driving geometry. */
export function toNumber(f) {
  return Number(f.n) / Number(f.d);
}

/**
 * Split into whole part plus proper remainder, e.g. 5/2 -> 2 and 1/2.
 * `whole`, `n` and `d` are BigInt; `sign` is -1 or 1.
 */
export function toMixed(f) {
  const sign = f.n < 0n ? -1 : 1;
  const n = bigAbs(f.n);
  const whole = n / f.d;
  const rem = n % f.d;
  return { sign, whole, n: rem, d: f.d };
}

/** "3/8", or "3" when the fraction is a whole number. */
export function toFractionString(f) {
  if (isInteger(f)) return String(f.n);
  return `${f.n}/${f.d}`;
}

/** "2 1/2", or "1/2" / "3" when there is no mixed part. */
export function toMixedString(f) {
  const { sign, whole, n, d } = toMixed(f);
  const prefix = sign < 0 ? '-' : '';
  if (n === 0n) return `${prefix}${whole}`;
  if (whole === 0n) return `${prefix}${n}/${d}`;
  return `${prefix}${whole} ${n}/${d}`;
}

const VULGAR = {
  '1/2': '\u00bd',
  '1/3': '\u2153',
  '2/3': '\u2154',
  '1/4': '\u00bc',
  '3/4': '\u00be',
  '1/5': '\u2155',
  '2/5': '\u2156',
  '3/5': '\u2157',
  '4/5': '\u2158',
  '1/6': '\u2159',
  '5/6': '\u215a',
  '1/8': '\u215b',
  '3/8': '\u215c',
  '5/8': '\u215d',
  '7/8': '\u215e',
};

/** Single-glyph fraction when one exists (½, ⅓, ⅜ ...), else null. */
export function vulgarGlyph(f) {
  return VULGAR[`${f.n}/${f.d}`] ?? null;
}

/**
 * Human number for an exact rational: prefers an exact short decimal, then a
 * mixed number with a vulgar glyph, and only falls back to a rounded decimal
 * (flagged as approximate) when neither is available.
 *
 * Returns `{ text, exact }`.
 */
export function formatRational(f, { maxDecimals = 3, preferVulgar = false } = {}) {
  if (isZero(f)) return { text: '0', exact: true };
  if (isInteger(f)) return { text: String(f.n), exact: true };

  const glyphText = () => {
    const mixed = toMixed(f);
    const glyph = vulgarGlyph(frac(mixed.n, mixed.d));
    if (!glyph) return null;
    const sign = mixed.sign < 0 ? '-' : '';
    const whole = mixed.whole === 0n ? '' : String(mixed.whole);
    return { text: `${sign}${whole}${glyph}`, exact: true };
  };

  if (preferVulgar) {
    const glyph = glyphText();
    if (glyph) return glyph;
  }

  // Exact terminating decimal? Only when the denominator is 2^a * 5^b.
  let d = f.d;
  while (d % 2n === 0n) d /= 2n;
  while (d % 5n === 0n) d /= 5n;
  if (d === 1n) {
    const decimals = decimalPlaces(f.d);
    if (decimals <= maxDecimals) {
      const value = Number(f.n) / Number(f.d);
      return { text: trimZeros(value.toFixed(decimals)), exact: true };
    }
  }

  const glyph = glyphText();
  if (glyph) return glyph;

  const value = toNumber(f);
  return { text: trimZeros(value.toFixed(maxDecimals)), exact: false };
}

function decimalPlaces(den) {
  // Smallest k with den | 10^k, for denominators of the form 2^a * 5^b.
  let k = 0;
  let pow = 1n;
  while (pow % den !== 0n && k < 12) {
    pow *= 10n;
    k += 1;
  }
  return k;
}

function trimZeros(text) {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** Percentage of one whole, e.g. 1/8 -> "12.5%". */
export function toPercentString(f) {
  const pct = multiply(f, frac(100));
  const { text, exact } = formatRational(pct, { maxDecimals: 2 });
  return `${exact ? '' : '\u2248'}${text}%`;
}

/** Decimal string with a leading ≈ when rounded, e.g. 1/3 -> "≈0.333". */
export function toDecimalString(f, decimals = 4) {
  if (isInteger(f)) return String(f.n);
  const exactShort = formatRational(f, { maxDecimals: decimals });
  const value = toNumber(f);
  const text = trimZeros(value.toFixed(decimals));
  return exactShort.exact && text === exactShort.text ? text : `\u2248${text}`;
}

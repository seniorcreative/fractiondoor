/**
 * Colour rules for the wall.
 *
 * Hue is derived from the denominator on a log scale rather than from the row
 * index, so a half is always the same blue whether the wall has 6 rows or 60.
 */

const HUE_START = 0.62; // blue for the biggest pieces
const HUE_SWEEP = 0.72; // sweeping towards red as pieces get smaller
const HUE_SPAN = Math.log2(210);

export const SCENE_COLORS = {
  background: 0x0a0e1a,
  fog: 0x0a0e1a,
  grid: 0x1b2540,
  frame: 0x7d8bb5,
  ground: 0x070a12,
  selected: 0xffc24b,
  hovered: 0xffffff,
  asymptote: 0xff5d7a,
  curve: 0x54e6ff,
};

/** Base colour of a piece, as HSL in 0..1. */
export function pieceHsl(den, index) {
  const t = Math.min(1, Math.log2(Math.max(1, den)) / HUE_SPAN);
  const h = (HUE_START - t * HUE_SWEEP + 1) % 1;
  const stripe = index % 2 === 0 ? 0 : -0.055;
  return { h, s: 0.52, l: 0.54 + stripe };
}

/** Piece colour for the "same span in another row" highlight. */
export function equivalentHsl(base) {
  return { h: base.h, s: Math.min(1, base.s + 0.3), l: Math.min(0.85, base.l + 0.16) };
}

/** Piece colour when the pointer is over it. */
export function hoveredHsl(base) {
  return { h: base.h, s: Math.min(1, base.s + 0.18), l: Math.min(0.92, base.l + 0.3) };
}

/** Piece colour when it is part of the current selection. */
export function selectedHsl() {
  return { h: 0.11, s: 0.9, l: 0.62 };
}

/** Dim colour for rows that are not the focus of the asymptote view. */
export function dimHsl(base) {
  return { h: base.h, s: base.s * 0.35, l: base.l * 0.45 };
}

/** CSS colour for React UI bits that need to match a row. */
export function pieceCss(den, index = 0) {
  const { h, s, l } = pieceHsl(den, index);
  return `hsl(${(h * 360).toFixed(0)} ${(s * 100).toFixed(0)}% ${(l * 100).toFixed(0)}%)`;
}

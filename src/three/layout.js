/**
 * Where every block sits.
 *
 * One place computes positions for blocks, labels, captions and the asymptote
 * curve, so all of them agree in every arrangement. Positions are expressed
 * through `anchor(wholeIndex, rowIndex, t)` where `t` runs 0..1 across a single
 * whole, which is exactly how fractions are addressed elsewhere in the app.
 */

export const DIMS = {
  wholeWidth: 6,
  wholeGap: 0.7,
  rowHeight: 0.62,
  rowGap: 0.07,
  depth: 0.5,
};

export const LAYOUTS = [
  {
    id: 'wall',
    label: 'Wall',
    hint: 'The printed wall, given thickness. Face on, it reads exactly like paper.',
  },
  {
    id: 'steps',
    label: 'Staircase',
    hint: 'Each row steps back and down, so the 1/n curve becomes a path you can fly along.',
  },
  {
    id: 'arc',
    label: 'Arena',
    hint: 'The rows curve around you. Stand inside and the whole wraps the horizon.',
  },
];

const { wholeWidth: W, wholeGap: GW, rowHeight: RH, rowGap: RG, depth: D } = DIMS;

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * @param {{layout:string, wholes:number, intensity:number}} config
 * @param {number[]} denominators row order, largest pieces first
 */
export function createLayout(config, denominators) {
  const wholes = Math.max(1, Math.round(config.wholes ?? 1));
  const rowCount = Math.max(1, denominators.length);
  const intensity = clamp01(config.intensity ?? 0.5);
  const mode = config.layout ?? 'wall';

  const contentWidth = wholes * W + (wholes - 1) * GW;
  const contentHeight = rowCount * (RH + RG) - RG;
  const centerX = contentWidth / 2;
  const topY = contentHeight / 2 - RH / 2;

  // Linear position across all wholes, 0..contentWidth.
  const linear = (wholeIndex, t) => wholeIndex * (W + GW) + t * W;

  // Staircase spans are normalised by row count so the shape stays framed
  // whether there are 6 rows or 200.
  const spanDenominator = Math.max(1, rowCount - 1);
  const stepYSpan = contentHeight * 0.5;
  const stepZSpan = 4 + intensity * 16;
  const stepY = (rowIndex) => stepYSpan / 2 - rowIndex * (stepYSpan / spanDenominator);
  const stepZ = (rowIndex) => stepZSpan / 2 - rowIndex * (stepZSpan / spanDenominator);

  // Arena: wrap the whole content width around a cylinder in front of the
  // viewer. A bigger sweep means a tighter radius and a more enveloping wall.
  const arcSweep = 0.7 + intensity * 3.4; // radians
  const radius = contentWidth / arcSweep;

  const flatY = (rowIndex) => topY - rowIndex * (RH + RG);

  function anchor(wholeIndex, rowIndex, t) {
    const lin = linear(wholeIndex, t);
    if (mode === 'arc') {
      const theta = (lin - centerX) / radius;
      return {
        x: radius * Math.sin(theta),
        y: flatY(rowIndex),
        z: radius * (1 - Math.cos(theta)),
        ry: -theta,
      };
    }
    if (mode === 'steps') {
      return { x: lin - centerX, y: stepY(rowIndex), z: stepZ(rowIndex), ry: 0 };
    }
    return { x: lin - centerX, y: flatY(rowIndex), z: 0, ry: 0 };
  }

  /** Width of the span t0..t1 of one whole, following the surface. */
  function spanWidth(t0, t1) {
    const flat = (t1 - t0) * W;
    if (mode !== 'arc') return flat;
    const dTheta = flat / radius;
    return 2 * radius * Math.sin(dTheta / 2); // chord, so blocks butt up cleanly
  }

  /** Block size for one piece, with a mortar gap that shrinks with the piece. */
  function pieceSize(t0, t1) {
    const raw = spanWidth(t0, t1);
    const gap = Math.min(0.04, raw * 0.16);
    return { w: Math.max(raw - gap, raw * 0.6), h: RH, d: D };
  }

  /** Dark slab behind a whole; only meaningful for the flat wall. */
  function backing(wholeIndex) {
    if (mode !== 'wall') return null;
    const a = anchor(wholeIndex, 0, 0);
    const b = anchor(wholeIndex, rowCount - 1, 1);
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      z: -D / 2 - 0.12,
      w: W + 0.18,
      h: contentHeight + 0.18,
      d: 0.16,
    };
  }

  function bounds() {
    const min = { x: Infinity, y: Infinity, z: Infinity };
    const max = { x: -Infinity, y: -Infinity, z: -Infinity };
    const pad = Math.max(RH, D) * 0.75;
    for (let wi = 0; wi < wholes; wi += 1) {
      for (let ri = 0; ri < rowCount; ri += 1) {
        for (const t of [0, 0.25, 0.5, 0.75, 1]) {
          const p = anchor(wi, ri, t);
          min.x = Math.min(min.x, p.x - pad);
          min.y = Math.min(min.y, p.y - pad);
          min.z = Math.min(min.z, p.z - pad);
          max.x = Math.max(max.x, p.x + pad);
          max.y = Math.max(max.y, p.y + pad);
          max.z = Math.max(max.z, p.z + pad);
        }
      }
    }
    return { min, max };
  }

  return {
    mode,
    wholes,
    rowCount,
    dims: DIMS,
    contentWidth,
    contentHeight,
    radius: mode === 'arc' ? radius : null,
    /** Camera spot for standing inside the arena. */
    insidePoint: mode === 'arc' ? { x: 0, y: 0, z: radius * 0.92 } : null,
    anchor,
    spanWidth,
    pieceSize,
    backing,
    bounds,
    rowY: mode === 'steps' ? stepY : flatY,
  };
}

/**
 * The flat list of blocks for a config: every piece of every row of every
 * whole. `t0`/`t1` are the piece's span within its whole.
 */
export function buildPieces(denominators, wholes) {
  const pieces = [];
  for (let wholeIndex = 0; wholeIndex < wholes; wholeIndex += 1) {
    denominators.forEach((den, rowIndex) => {
      for (let index = 0; index < den; index += 1) {
        pieces.push({
          key: `${wholeIndex}:${den}:${index}`,
          wholeIndex,
          rowIndex,
          den,
          index,
          t0: index / den,
          t1: (index + 1) / den,
        });
      }
    });
  }
  return pieces;
}

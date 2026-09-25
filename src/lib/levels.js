/**
 * Levels: one wall, three surfaces.
 *
 * The wall itself is not what overloads a young learner. The load comes from
 * everything around it: twenty controls, four notations at once, jargon, and a
 * camera that can lose the wall entirely. A level decides how much of that is
 * present. The scene code is identical at every level.
 *
 * `defaults` is patched into the UI state when a level is chosen.
 * `ui` says what the panels are allowed to render.
 * `camera` is handed to the scene, which clamps the controls to match.
 */

export const LEVEL_IDS = ['explore', 'build', 'investigate'];

export const LEVELS = [
  {
    id: 'explore',
    label: 'Explore',
    tagline: 'First fractions',
    blurb: 'One whole, a few big pieces, words instead of symbols.',
    defaults: {
      rowPreset: 'classic',
      maxDenominator: 4,
      includeWhole: true,
      wholes: 1,
      layout: 'wall',
      intensity: 0.45,
      labelMode: 'name',
      showCaptions: true,
      showEquivalents: true,
      showAsymptote: false,
      showGrid: false,
      unitId: 'pizza',
    },
    ui: {
      panel: 'simple',
      readout: 'sentence',
      cardDetail: 'simple',
      // "More pieces" steps through these, rather than a 1-200 slider.
      rowSteps: [1, 2, 3, 4, 6, 8],
      units: ['pizza', 'cake', 'chocolate', 'dozen', 'abstract'],
      labelModes: ['name', 'fraction', 'none'],
      wholesMax: 2,
      views: ['front', 'auto'],
      showRowPresets: false,
      showLayouts: false,
      showIntensity: false,
      showAsymptote: false,
      showGrid: false,
      showCaptionsToggle: false,
      showEquivalentsToggle: false,
      showKeyboardHelp: false,
    },
    camera: { pan: false, zoom: true, zoomRange: [0.55, 1.5], tilt: 0.3, turn: 0.7 },
  },
  {
    id: 'build',
    label: 'Build',
    tagline: 'Naming and comparing',
    blurb: 'The classic wall, mixed numbers, and values in real units.',
    defaults: {
      rowPreset: 'classic',
      maxDenominator: 12,
      includeWhole: true,
      wholes: 1,
      layout: 'wall',
      intensity: 0.45,
      labelMode: 'fraction',
      showCaptions: true,
      showEquivalents: true,
      showAsymptote: false,
      showGrid: true,
      unitId: 'abstract',
    },
    ui: {
      panel: 'full',
      readout: 'full',
      cardDetail: 'full',
      maxDenominatorLimit: 24,
      units: null, // all of them
      labelModes: ['none', 'fraction', 'name', 'value'],
      layouts: ['wall', 'steps'],
      wholesMax: 4,
      views: ['front', 'iso', 'top', 'auto'],
      showRowPresets: false,
      showLayouts: true,
      showIntensity: true,
      showAsymptote: false,
      showGrid: true,
      showCaptionsToggle: true,
      showEquivalentsToggle: true,
      showKeyboardHelp: true,
    },
    camera: { pan: true, zoom: true, zoomRange: [0.3, 3], tilt: 0.75, turn: null },
  },
  {
    id: 'investigate',
    label: 'Investigate',
    tagline: 'How far does it go?',
    blurb: 'Every row set, 200 rows deep, the 1/n curve and its asymptote.',
    defaults: {
      rowPreset: 'classic',
      maxDenominator: 12,
      includeWhole: true,
      wholes: 1,
      layout: 'wall',
      intensity: 0.45,
      labelMode: 'fraction',
      showCaptions: true,
      showEquivalents: true,
      showAsymptote: false,
      showGrid: true,
      unitId: 'abstract',
    },
    ui: {
      panel: 'full',
      readout: 'full',
      cardDetail: 'full',
      maxDenominatorLimit: null, // the full 200
      units: null,
      labelModes: ['none', 'fraction', 'name', 'value'],
      layouts: null, // all three
      wholesMax: 6,
      views: ['front', 'iso', 'side', 'top', 'inside', 'auto'],
      showRowPresets: true,
      showLayouts: true,
      showIntensity: true,
      showAsymptote: true,
      showGrid: true,
      showCaptionsToggle: true,
      showEquivalentsToggle: true,
      showKeyboardHelp: true,
    },
    camera: { pan: true, zoom: true, zoomRange: null, tilt: null, turn: null },
  },
];

const BY_ID = new Map(LEVELS.map((level) => [level.id, level]));

export const DEFAULT_LEVEL = 'build';

export function getLevel(id) {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_LEVEL);
}

/** The UI-state patch to apply when switching to a level. */
export function levelDefaults(id) {
  return { ...getLevel(id).defaults, level: id };
}

/** Next level up, for the "show me more" escape hatch. Null at the top. */
export function nextLevelUp(id) {
  const index = LEVEL_IDS.indexOf(id);
  return index >= 0 && index < LEVEL_IDS.length - 1 ? LEVEL_IDS[index + 1] : null;
}

/**
 * Clamp a UI state to what its level allows, so a value carried over from a
 * richer level (200 rows, the arena, six wholes) cannot strand a younger
 * learner in a view their controls cannot undo.
 */
export function constrainToLevel(ui) {
  const { ui: allowed } = getLevel(ui.level);
  const next = { ...ui };

  if (allowed.rowSteps) {
    const steps = allowed.rowSteps;
    if (!steps.includes(next.maxDenominator)) {
      next.maxDenominator = nearest(steps, next.maxDenominator);
    }
    if (next.rowPreset !== 'classic') next.rowPreset = 'classic';
  } else if (allowed.maxDenominatorLimit) {
    next.maxDenominator = Math.min(next.maxDenominator, allowed.maxDenominatorLimit);
  }

  if (!allowed.showRowPresets && next.rowPreset === 'custom') next.rowPreset = 'classic';
  if (allowed.units && !allowed.units.includes(next.unitId)) next.unitId = allowed.units[0];
  if (!allowed.labelModes.includes(next.labelMode)) next.labelMode = allowed.labelModes[0];
  if (allowed.layouts && !allowed.layouts.includes(next.layout)) next.layout = allowed.layouts[0];
  if (next.wholes > allowed.wholesMax) next.wholes = allowed.wholesMax;
  if (!allowed.showAsymptote) next.showAsymptote = false;
  if (!allowed.showGrid) next.showGrid = false;

  return next;
}

function nearest(values, target) {
  return values.reduce((best, value) =>
    Math.abs(value - target) < Math.abs(best - target) ? value : best,
  );
}

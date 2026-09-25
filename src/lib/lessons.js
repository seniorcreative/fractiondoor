/**
 * Lesson engine.
 *
 * A lesson is a plain object: a goal sentence, an ordered list of steps, each
 * step a prompt + a config patch + a success predicate. The engine is a pure
 * function: given the current app state it returns a `LessonState` describing
 * what to show and whether to advance.
 *
 * Nothing here touches the DOM or the scene. React drives the display;
 * FractionWallScene reads `config.focus` and `config.pointAt`.
 */

import { sum, frac, equals, compare } from './fraction.js';

// ----------------------------------------------------------------- predicates

/**
 * A predicate receives `{ selection, denominators, wholes, config, stats }`
 * and returns true when the step is done.
 */

export const predicates = {
  /** User has clicked at least one block matching the supplied keys. */
  selectionContains: (keys) => ({ selection }) =>
    keys.every((k) => selection.has(k)),

  /** Selection total equals exactly n/d. */
  selectionEquals: (n, d) => ({ selection }) => {
    if (selection.size === 0) return false;
    const pieces = [...selection].map((key) => {
      const [, den] = key.split(':').map(Number);
      return frac(1, den);
    });
    const total = sum(pieces);
    return equals(total, frac(n, d));
  },

  /** Selection total is at least n/d. */
  selectionAtLeast: (n, d) => ({ selection }) => {
    if (selection.size === 0) return false;
    const pieces = [...selection].map((key) => {
      const [, den] = key.split(':').map(Number);
      return frac(1, den);
    });
    return compare(sum(pieces), frac(n, d)) >= 0;
  },

  /** The wall has at least `min` rows. */
  rowsAtLeast: (min) => ({ denominators }) => denominators.length >= min,

  /** Any block has been hovered (pointer was moved into the scene). */
  anyHovered: () => ({ lastHover }) => !!lastHover,

  /** The camera has been moved from its default position. */
  cameraMoved: () => ({ cameraMoved }) => !!cameraMoved,

  /** Always true on the first eval — used for informational intro steps. */
  always: () => () => true,

  /** User has changed the unit to the supplied preset id. */
  unitIs: (id) => ({ config }) => config.unit?.id === id,

  /** The denominators list includes a specific value. */
  hasDenominator: (den) => ({ denominators }) => denominators.includes(den),

  /** Asymptote overlay is visible. */
  asymptoteVisible: () => ({ config }) => !!config.showAsymptote,

  /** The deepest denominator is at least n. */
  deepestAtLeast: (n) => ({ denominators }) =>
    denominators[denominators.length - 1] >= n,
};

// ---------------------------------------------------------------- lesson state

/**
 * Advance the lesson given the current app state.
 *
 * Returns `{ step, stepIndex, done, praise, configPatch }`:
 * - step: the current step object (unchanged while the predicate is false)
 * - stepIndex: index of the current step
 * - done: true when all steps are complete
 * - praise: text to show briefly after a step passes (the step's `praise`)
 * - configPatch: the step's `config` plus `focus` and `pointAt`
 */
export function advanceLesson(lesson, stepIndex, appState) {
  if (!lesson || stepIndex >= lesson.steps.length) {
    return { done: true, stepIndex, step: null, praise: null, configPatch: null };
  }

  const step = lesson.steps[stepIndex];
  const passed = step.done(appState);

  if (passed) {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= lesson.steps.length) {
      return {
        done: true,
        stepIndex: nextIndex,
        step,
        praise: step.praise ?? null,
        configPatch: null,
      };
    }
    const nextStep = lesson.steps[nextIndex];
    return {
      done: false,
      stepIndex: nextIndex,
      step: nextStep,
      praise: step.praise ?? null,
      configPatch: stepConfigPatch(nextStep),
    };
  }

  return {
    done: false,
    stepIndex,
    step,
    praise: null,
    configPatch: stepConfigPatch(step),
  };
}

function stepConfigPatch(step) {
  return {
    ...(step.config ?? {}),
    focus: step.focus ?? null,
    pointAt: step.pointAt ?? null,
    cardDetail: step.cardDetail ?? null,
  };
}

/** The config patch that should be active at the start of a lesson. */
export function lessonStartPatch(lesson) {
  const first = lesson.steps[0];
  return {
    ...(lesson.baseConfig ?? {}),
    ...(first.config ?? {}),
    focus: first.focus ?? null,
    pointAt: first.pointAt ?? null,
    cardDetail: first.cardDetail ?? null,
  };
}

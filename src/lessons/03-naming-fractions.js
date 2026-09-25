/**
 * Lesson 3: Naming fractions
 * Target: KS2, Year 3 (age 7–8)
 * Goal: Name fractions of a shape. Thirds and sixths. Equivalent fractions.
 */

import { predicates as P } from '../lib/lessons.js';

const { selectionEquals, anyHovered } = P;

export default {
  id: 'naming-fractions',
  level: 'build',
  title: 'Naming fractions',
  icon: 'CakeSlice',
  goal: 'Thirds and sixths — and why some fractions are the same size.',

  baseConfig: {
    unitId: 'cake',
    includeWhole: true,
    rowPreset: 'classic',
    maxDenominator: 6,
    wholes: 1,
    labelMode: 'fraction',
    showCaptions: true,
    showEquivalents: true,
  },

  steps: [
    {
      say: 'The wall shows thirds and sixths. Hover over a third to see its name.',
      config: { maxDenominator: 3 },
      focus: { rows: [1, 3] },
      done: (state) => !!state.lastHover && state.lastHover.den === 3,
      praise: 'One third — we write it ⅓.',
    },
    {
      say: 'When you hovered, the same-size pieces in the sixths row lit up. How many sixths equal one third?',
      config: { maxDenominator: 6, showEquivalents: true },
      focus: { rows: [3, 6] },
      done: selectionEquals(1, 3),
      praise: 'One third! You might have clicked ⅙ + ⅙, because 2/6 = 1/3.',
    },
    {
      say: 'Click two thirds. What fraction of the whole is that?',
      config: { maxDenominator: 6 },
      focus: { rows: [3] },
      done: selectionEquals(2, 3),
      praise: '⅔ — two thirds. Written as a number: 2 out of 3 equal parts.',
    },
    {
      say: 'Find 4 sixths — without using the thirds row. Is it the same size?',
      config: { maxDenominator: 6, showEquivalents: true },
      focus: { rows: [6] },
      done: selectionEquals(2, 3),
      praise: 'Yes! 4/6 = 2/3. Different numbers, same amount. That is an equivalent fraction.',
    },
    {
      say: 'Hover any block now and look at the "=" line underneath — it shows all the equivalent fractions in the wall.',
      config: { maxDenominator: 6, showEquivalents: true },
      focus: null,
      done: anyHovered(),
    },
  ],
};

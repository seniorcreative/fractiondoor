/**
 * Lesson 5: More than one whole
 * Target: KS2, Year 4–5 (age 9–10)
 * Goal: Build mixed numbers. Understand that 2½ = 5/2.
 */

import { predicates as P } from '../lib/lessons.js';

const { always, selectionEquals } = P;

export default {
  id: 'mixed-numbers',
  level: 'build',
  title: 'More than one whole',
  icon: 'Pizza',
  goal: 'Build two and a half. See how a mixed number and an improper fraction say the same thing.',

  baseConfig: {
    unitId: 'pizza',
    includeWhole: true,
    rowPreset: 'classic',
    maxDenominator: 2,
    wholes: 3,
    labelMode: 'name',
    showCaptions: true,
    showEquivalents: false,
  },

  steps: [
    {
      say: 'There are three pizzas. Click both halves of the first pizza.',
      config: { maxDenominator: 2, wholes: 3 },
      focus: { rows: [1, 2] },
      done: (state) =>
        state.selection.has('0:2:0') && state.selection.has('0:2:1'),
      praise: 'That is one whole pizza — 2 halves = 1.',
    },
    {
      say: 'Now add both halves of the second pizza. You have two whole pizzas.',
      config: { maxDenominator: 2, wholes: 3 },
      focus: { rows: [1, 2] },
      done: selectionEquals(2, 1),
      praise: 'Two whole pizzas!',
    },
    {
      say: 'Add one half from the third pizza. Now you have two and a half.',
      focus: { rows: [2] },
      done: selectionEquals(5, 2),
      praise: 'Two and a half! Written as a mixed number: 2½. As an improper fraction: 5/2.',
    },
    {
      say: 'Look at the readout on the right. It shows 2½ and 5/2 — two ways of writing the same amount.',
      focus: null,
      done: always(),
    },
    {
      say: 'What is 2½ pizzas worth in slices? Check the readout.',
      config: { labelMode: 'value' },
      focus: null,
      done: always(),
    },
  ],
};

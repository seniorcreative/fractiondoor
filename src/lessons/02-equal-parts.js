/**
 * Lesson 2: Equal parts
 * Target: KS1, Year 2 (age 6–7)
 * Goal: Halves and quarters. A quarter is half of a half.
 *       Two quarters equals one half.
 */

import { predicates as P } from '../lib/lessons.js';

const { always, selectionEquals } = P;

export default {
  id: 'equal-parts',
  level: 'explore',
  title: 'Halves and quarters',
  icon: 'Grid3x3',
  goal: 'Find out how many quarters fit into a half.',

  baseConfig: {
    unitId: 'chocolate',
    includeWhole: true,
    rowPreset: 'classic',
    maxDenominator: 4,
    wholes: 1,
    labelMode: 'name',
    showCaptions: true,
    showEquivalents: false,
  },

  steps: [
    {
      say: 'This chocolate bar is split into two halves. Click one half.',
      config: { maxDenominator: 2 },
      focus: { rows: [2] },
      done: (state) => [...state.selection].some((k) => k.startsWith('0:2:')),
      praise: 'That is one half of the bar.',
      cardDetail: 'simple',
    },
    {
      say: 'Now the bar is cut into quarters. Click two quarters that fill the same space as your half.',
      config: { maxDenominator: 4, showEquivalents: true },
      focus: { rows: [4] },
      done: selectionEquals(1, 2),
      praise: 'Two quarters make one half! 2 quarters = 1 half.',
      cardDetail: 'simple',
    },
    {
      say: 'Can you fill a whole bar with quarters? Click all four.',
      config: { maxDenominator: 4 },
      focus: { rows: [4] },
      done: selectionEquals(1, 1),
      praise: 'Four quarters make one whole. 4 × ¼ = 1.',
      cardDetail: 'simple',
    },
    {
      say: 'Compare the rows: the half row and the quarter row line up. That is what equivalent fractions means.',
      config: { maxDenominator: 4, showEquivalents: true },
      focus: null,
      done: always(),
    },
  ],
};

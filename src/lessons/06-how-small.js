/**
 * Lesson 6: How small can a piece get?
 * Target: KS2, Year 5–6 / KS3 (age 10–13)
 * Goal: As the denominator grows, the piece size shrinks. The 1/n curve
 *       approaches — but never reaches — the left edge. That is an asymptote.
 */

import { predicates as P } from '../lib/lessons.js';

const { always, deepestAtLeast, asymptoteVisible } = P;

export default {
  id: 'how-small',
  level: 'investigate',
  title: 'How small can a piece get?',
  icon: 'Microscope',
  goal: 'Push the wall to 100 rows. Watch the 1/n curve never quite reach the edge.',

  baseConfig: {
    unitId: 'abstract',
    includeWhole: false,
    rowPreset: 'classic',
    maxDenominator: 12,
    wholes: 1,
    labelMode: 'none',
    showCaptions: true,
    showEquivalents: false,
    showAsymptote: false,
  },

  steps: [
    {
      say: 'The wall shows the classic rows up to twelfths. What is the deepest row?',
      config: { maxDenominator: 12 },
      done: always(),
    },
    {
      say: 'Drag the "Deepest row" slider to 50. Watch the pieces get smaller.',
      config: { maxDenominator: 12 },
      done: deepestAtLeast(50),
      praise: 'The pieces keep getting thinner, but the whole stays the same width.',
    },
    {
      say: 'Now drag it past 100. The deepest pieces are nearly invisible. Turn on the 1/n curve to see the pattern.',
      done: deepestAtLeast(100),
      praise: 'Good. Now turn on the curve in the Overlays section.',
    },
    {
      say: 'Turn on the 1/n curve. It threads through the right edge of the first piece in every row.',
      done: asymptoteVisible(),
      praise: 'The cyan curve is y = 1/n. The red line on the left is where the curve is heading.',
    },
    {
      say: 'Keep dragging the slider. The curve gets flatter and flatter — but it never touches the red line. That line is called the asymptote.',
      done: deepestAtLeast(150),
      praise: '1/n gets smaller and smaller, but it can never reach 0. That is what an asymptote means.',
    },
    {
      say: 'The dotted part of the curve shows what would happen if you kept adding rows beyond the slider. It keeps bending towards the line, forever.',
      done: always(),
    },
  ],
};

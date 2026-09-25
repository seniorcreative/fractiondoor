/**
 * Lesson 1: What is a half?
 * Target: KS1, Year 1 (age 5–6)
 * Goal: A whole can be split into two equal parts. Each part is called a half.
 */

import { predicates as P } from '../lib/lessons.js';

const { always, cameraMoved, selectionEquals } = P;

export default {
  id: 'what-is-a-half',
  level: 'explore',
  title: 'What is a half?',
  icon: 'Pizza',
  goal: 'Cut the whole into two equal pieces. Each piece is a half.',

  // These are merged into the UI config for the entire lesson run.
  baseConfig: {
    unitId: 'pizza',
    includeWhole: true,
    rowPreset: 'classic',
    maxDenominator: 2,
    wholes: 1,
    labelMode: 'name',
    showCaptions: true,
    showEquivalents: false,
  },

  steps: [
    {
      say: 'This is one whole pizza. Drag it around to look at it.',
      config: { maxDenominator: 1, labelMode: 'none' },
      focus: { rows: [1] },
      done: cameraMoved(),
      cardDetail: 'simple',
    },
    {
      say: 'Now it is cut into two equal parts. Each part is called a half. Click one of the halves.',
      config: { maxDenominator: 2, labelMode: 'name' },
      focus: { rows: [2] },
      pointAt: { key: '0:2:0', text: 'click me' },
      done: (state) => [...state.selection].some((k) => k.startsWith('0:2:')),
      praise: 'Yes! That is one half. We write it as ½.',
      cardDetail: 'simple',
    },
    {
      say: 'Now click the other half too. What do you notice?',
      config: { maxDenominator: 2 },
      focus: { rows: [2] },
      done: selectionEquals(1, 1),
      praise: 'Two halves make one whole! ½ + ½ = 1.',
      cardDetail: 'simple',
    },
    {
      say: 'The whole row at the top is exactly the same size as both halves together. That is what equal parts mean.',
      config: { maxDenominator: 2, showEquivalents: true },
      focus: null,
      done: always(),
    },
  ],
};

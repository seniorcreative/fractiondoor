/**
 * Lesson 4: Fractions of things
 * Target: KS2, Year 3–4 (age 8–9)
 * Goal: The same fraction can mean different amounts depending on the whole.
 *       Changing the unit shows that 1/4 of an hour and 1/4 of a pound are
 *       both "one quarter", but one is 15 minutes and the other is 25p.
 */

import { predicates as P } from '../lib/lessons.js';

const { always, selectionEquals, anyHovered } = P;

export default {
  id: 'fractions-of-things',
  level: 'build',
  title: 'Fractions of things',
  icon: 'Clock',
  goal: 'The same fraction looks different depending on what the whole is.',

  baseConfig: {
    unitId: 'abstract',
    includeWhole: false,
    rowPreset: 'classic',
    maxDenominator: 4,
    wholes: 1,
    labelMode: 'fraction',
    showCaptions: false,
    showEquivalents: false,
  },

  steps: [
    {
      say: 'Click one quarter of the abstract whole.',
      config: { unitId: 'abstract', labelMode: 'fraction' },
      focus: { rows: [4] },
      done: selectionEquals(1, 4),
      praise: 'One quarter — written ¼. Now we will see what one quarter means in real life.',
    },
    {
      say: 'The whole is now one hour. One quarter of an hour is how many minutes? Check the label inside the block.',
      config: { unitId: 'hour', maxDenominator: 4, labelMode: 'value', showCaptions: true },
      focus: { rows: [4] },
      done: always(),
    },
    {
      say: '15 minutes! Now change the whole to one pound (£). How many pence is one quarter?',
      config: { unitId: 'pound', labelMode: 'value' },
      focus: { rows: [4] },
      done: (state) => state.config.unit?.id === 'pound',
      praise: '25p — one quarter of £1. The fraction is the same, the amount changed.',
    },
    {
      say: 'Try a class of 30. How many children is one quarter of the class?',
      config: { unitId: 'class', maxDenominator: 4, labelMode: 'value' },
      focus: { rows: [4] },
      done: always(),
    },
    {
      say: 'One quarter always means the same share — but what it is worth depends on the whole.',
      config: { unitId: 'class', showEquivalents: true, labelMode: 'name' },
      focus: null,
      done: anyHovered(),
    },
  ],
};

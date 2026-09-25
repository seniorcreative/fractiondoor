import lesson1 from './01-what-is-a-half.js';
import lesson2 from './02-equal-parts.js';
import lesson3 from './03-naming-fractions.js';
import lesson4 from './04-fractions-of-things.js';
import lesson5 from './05-mixed-numbers.js';
import lesson6 from './06-how-small.js';

export const ALL_LESSONS = [lesson1, lesson2, lesson3, lesson4, lesson5, lesson6];

const BY_ID = new Map(ALL_LESSONS.map((l) => [l.id, l]));
export const getLesson = (id) => BY_ID.get(id) ?? null;

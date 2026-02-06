/**
 * Answer normalization and comparison for Italian grammar exercises.
 */

/**
 * Normalize a string for comparison.
 * @param {string} str
 * @param {boolean} strictAccents - If false, accented chars match unaccented
 * @returns {string}
 */
export function normalizeAnswer(str, strictAccents = false) {
  let s = str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[''`\u2018\u2019]/g, "'")
    .replace(/[""«»\u201C\u201D]/g, '"')
    .replace(/\.\s*$/, '');  // remove trailing period

  if (!strictAccents) {
    s = s
      .replace(/[àáâã]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõ]/g, 'o')
      .replace(/[ùúûü]/g, 'u');
  }

  return s;
}

/**
 * Compare user answer against expected answer(s).
 * @param {string} userAnswer
 * @param {string|string[]} expected - Single answer or array of acceptable answers
 * @param {boolean} strictAccents
 * @returns {boolean}
 */
export function checkAnswer(userAnswer, expected, strictAccents = false) {
  const normalizedUser = normalizeAnswer(userAnswer, strictAccents);

  if (Array.isArray(expected)) {
    return expected.some(ans => normalizeAnswer(ans, strictAccents) === normalizedUser);
  }

  return normalizeAnswer(expected, strictAccents) === normalizedUser;
}

/**
 * Get the display version of the correct answer (first one if array).
 * @param {string|string[]} expected
 * @returns {string}
 */
export function getDisplayAnswer(expected) {
  return Array.isArray(expected) ? expected[0] : expected;
}

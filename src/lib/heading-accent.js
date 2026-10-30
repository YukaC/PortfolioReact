/**
 * Word matching for the split heading's emphasis.
 *
 * `SplitHeading` emphasises the words named by `accent`, and it compares whole
 * tokens. Copy carries punctuation ("Desarrollo tu software, de punta a punta"),
 * so a raw comparison makes `accent: "software"` miss the visible word
 * `software,` and the emphasis silently disappears — the failure is invisible in
 * review and only shows as a heading without its sky word.
 *
 * Both the component and the copy test normalise through here, so there is one
 * definition of "the same word" instead of two that can drift.
 */

/** Leading and trailing punctuation is decoration; a word is its letters. */
const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

/**
 * Comparable form of a heading word: edge punctuation removed, lowercased.
 *
 * @param {unknown} word
 * @returns {string}
 */
export function normalizeHeadingWord(word) {
  if (typeof word !== "string") return "";
  return word.replace(EDGE_PUNCTUATION, "").toLowerCase();
}

/**
 * Split a heading into its comparable words.
 *
 * @param {unknown} text
 * @returns {string[]}
 */
export function headingWords(text) {
  if (typeof text !== "string") return [];
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeHeadingWord)
    .filter(Boolean);
}

/**
 * The set of comparable words an `accent` string points at.
 *
 * @param {unknown} accent
 * @returns {Set<string>}
 */
export function accentWordSet(accent) {
  return new Set(headingWords(accent));
}

/**
 * Is this heading word one of the emphasised ones?
 *
 * @param {string} word
 * @param {Set<string>} accentWords
 * @returns {boolean}
 */
export function isAccentWord(word, accentWords) {
  const normalized = normalizeHeadingWord(word);
  return normalized !== "" && accentWords.has(normalized);
}

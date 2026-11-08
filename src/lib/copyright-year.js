/**
 * The two answers to "what year does the footer print?".
 *
 * The page is prerendered and revalidated every 6 h, so the same footer has a
 * build-time answer and a browser answer. Asking `new Date().getFullYear()` on
 * both sides made them disagree for up to six hours on 1 January — a hydration
 * mismatch and a visible "© 2025" under a page built in 2026.
 *
 * So the server keeps answering with the year the served snapshot belongs to
 * and the client answers with the current year, which lands as a
 * post-hydration update instead of a mismatch. Both live here, outside the
 * component, so `node --test` can pin them (a `.jsx` would need the bundler).
 */

/**
 * The year the prerendered HTML carries.
 *
 * It is `generatedAt`'s year in `src/data/pinned-projects.json`: bump it in the
 * same commit that moves the snapshot, so the served year can never lag the
 * copy it sits under.
 */
export const BUILD_YEAR = 2026;

/**
 * The reader's year — the answer the browser gives after hydration.
 *
 * @param {Date} [now] the date to read; the clock by default
 * @returns {number} that date's calendar year, in the reader's time zone
 */
export const currentYear = (now = new Date()) => now.getFullYear();

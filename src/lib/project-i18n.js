/**
 * Project copy in the reader's language.
 *
 * GitHub pins arrive in English (repo description + the overrides in
 * `src/data/projects.js`), so the translation lives next to the override that
 * already owns that slug and is applied per field: a slug with no `i18n` block,
 * or a locale without one, keeps the English string. The fallback is explicit
 * here rather than a silent merge in each component.
 *
 * The import is relative, not the `@/` alias, so `node --test` can load this
 * module without a resolver: the field list below is behaviour worth pinning.
 */
import { PROJECT_OVERRIDES } from "../data/projects.js";

/** Fields `PROJECT_OVERRIDES[slug].i18n[locale]` may translate. */
const TRANSLATED_FIELDS = ["title", "description", "problem", "outcome"];

/**
 * @param {object} project
 * @param {string} locale
 * @returns {object} the same project, with translated fields where available
 */
export function localizeProject(project, locale) {
  if (!project || typeof project !== "object") return project;

  const translations =
    PROJECT_OVERRIDES[project.name]?.i18n?.[locale] ?? null;
  if (!translations) return project;

  const localized = { ...project };

  for (const field of TRANSLATED_FIELDS) {
    const value = translations[field];
    if (typeof value === "string" && value.length > 0) {
      localized[field] = value;
    }
  }

  return localized;
}

/** Localize a whole list, keeping the input untouched. */
export function localizeProjects(projects, locale) {
  if (!Array.isArray(projects)) return [];

  return projects.map((project) => localizeProject(project, locale));
}

import test from "node:test";
import assert from "node:assert/strict";
import { localizeProject, localizeProjects } from "./project-i18n.js";

/** A pinned project as the components receive it: English copy from GitHub. */
const pinned = (name, overrides = {}) => ({
  name,
  title: "English title",
  description: "English description",
  problem: "English problem",
  outcome: "English outcome",
  ...overrides,
});

test("every translated field comes from the slug's i18n block", () => {
  const localized = localizeProject(pinned("btrfs2ext4"), "es");
  const english = pinned("btrfs2ext4");

  for (const field of ["description", "problem", "outcome"]) {
    assert.notEqual(
      localized[field],
      english[field],
      `${field} kept the English string`,
    );
  }
});

test("both locales translate, not only Spanish", () => {
  for (const locale of ["es", "pt"]) {
    const localized = localizeProject(pinned("AppDespensa"), locale);
    assert.notEqual(
      localized.problem,
      "English problem",
      `${locale} kept the English problem`,
    );
  }
});

test("a slug with no i18n block keeps every English field", () => {
  const project = pinned("not-a-pinned-slug");

  assert.deepEqual(localizeProject(project, "es"), project);
});

test("a locale with no block keeps the English string, and nothing goes blank", () => {
  const localized = localizeProject(pinned("AhorrAR"), "de");

  assert.deepEqual(localized, pinned("AhorrAR"));
});

test("localizing a list does not mutate the input projects", () => {
  const input = [pinned("btrfs2ext4"), pinned("OpenBalance")];
  const snapshot = JSON.parse(JSON.stringify(input));

  const output = localizeProjects(input, "pt");

  assert.deepEqual(input, snapshot);
  assert.notEqual(output[0].problem, input[0].problem);
});

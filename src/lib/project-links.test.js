import test from "node:test";
import assert from "node:assert/strict";
import { resolveProjectLinks } from "./project-links.js";

const REPO = "https://github.com/YukaC/PortfolioReact";
const DEMO = "https://ciucani.vercel.app";
const ABOUT = "https://from-the-about-field.example";

test("the override siteUrl wins over the API homepage and the repository", () => {
  assert.deepEqual(
    resolveProjectLinks({
      repoUrl: REPO,
      siteUrlFromOverride: DEMO,
      siteUrlFromApi: ABOUT,
    }),
    { siteUrl: DEMO, repoUrl: REPO, showRepoLink: true },
  );
});

test("the API homepage wins over the repository when there is no override", () => {
  assert.deepEqual(
    resolveProjectLinks({
      repoUrl: REPO,
      siteUrlFromOverride: undefined,
      siteUrlFromApi: ABOUT,
    }),
    { siteUrl: ABOUT, repoUrl: REPO, showRepoLink: true },
  );
});

test("a project without homepage opens the repository and hides the secondary action", () => {
  for (const siteUrlFromApi of [null, undefined, "", "   "]) {
    assert.deepEqual(
      resolveProjectLinks({ repoUrl: REPO, siteUrlFromApi }),
      { siteUrl: REPO, repoUrl: REPO, showRepoLink: false },
      `homepage ${JSON.stringify(siteUrlFromApi)} must fall back to the repo`,
    );
  }
});

test("a siteUrl equal to the repoUrl does not duplicate the destination", () => {
  for (const siteUrlFromOverride of [REPO, ` ${REPO} `]) {
    assert.deepEqual(
      resolveProjectLinks({
        repoUrl: REPO,
        siteUrlFromOverride,
        siteUrlFromApi: ABOUT,
      }),
      { siteUrl: REPO, repoUrl: REPO, showRepoLink: false },
      `override ${JSON.stringify(siteUrlFromOverride)} must not add a repo button`,
    );
  }
});

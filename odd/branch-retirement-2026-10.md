# Branch retirement — 2026-10

Owner instruction: portfolio keeps `main` only; every PR closed, every other branch gone.

`main` = `98e8830` (the rebrand, merged through PR #51). Only `main` is served by ciucani.vercel.app.

## Retired branches

| branch | sha | commits not in `main` | archive tag | where |
|---|---|---|---|---|
| `chore/gha-bumps-20260928` | `5ba9faa` | 0 | — | remote+local |
| `chore/PortfolioReact-tools-v020` | `26be9bd` | 0 | — | remote+local |
| `chore/reference-architecture-adopt` | `dd30755` | 0 | — | remote+local |
| `dependabot/github_actions/actions/setup-python-7` | `b0fe4a1` | 1 | — (regenerable) | remote |
| `dependabot/npm_and_yarn/next-16.3.8` | `b330080` | 1 | — (regenerable) | remote |
| `dependabot/npm_and_yarn/patch-updates-fcbd71a92a` | `da690bc` | 1 | — (regenerable) | remote |
| `dependabot/npm_and_yarn/react-19.3.0` | `5c4181e` | 1 | — (regenerable) | remote |
| `dependabot/npm_and_yarn/react-three/postprocessing-3.1.3` | `8be471a` | 1 | — (regenerable) | remote |
| `feat/agency-rebrand` | `66446c3` | 0 | — | remote+local |
| `pr/01-rebrand-foundation` | `c553a51` | 0 | — | remote+local |
| `pr/02-glass-identity` | `3e825cb` | 0 | — | remote+local |
| `pr/03-frost-system` | `d82fd73` | 0 | — | remote+local |
| `pr/04-hero-profile-and-seo` | `067aa3c` | 0 | — | remote+local |
| `pr/05-sections-and-taste` | `c50807c` | 0 | — | remote+local |
| `pr/06-perf-budget` | `c57b541` | 0 | — | remote+local |
| `pr/07-auto-locale` | `16786ab` | 0 | — | remote+local |
| `chore/docs-sec-20260928` | `3260109` | 1 | `archive/docs-sec-20260928` | local-only |
| `chore/fiber-9.8.1` | `4201e84` | 1 | `archive/fiber-9.8.1` | local-only |
| `feat/glass-motion-rebrand` | `32345b1` | 0 | — | local-only |
| `fix/react-dom-align` | `a932359` | 0 | — | local-only |
| `polish/bebop-approach-bob` | `0a3f1fb` | 1 | `archive/bebop-approach-bob` | local-only |
| `polish/bebop-cam-punch` | `ea7a194` | 1 | `archive/bebop-cam-punch` | local-only |
| `polish/bebop-fade-handoff` | `b68bd97` | 1 | `archive/bebop-fade-handoff` | local-only |
| `polish/bebop-thin-trail` | `1b66f4b` | 1 | `archive/bebop-thin-trail` | local-only |
| `polish/flare-diameter-lerp` | `d3ec449` | 1 | `archive/flare-diameter-lerp` | local-only |
| `runner/bebop-responsive` | `41150ec` | 0 | — | local-only |
| `runner/bebop-responsive-stage` | `b563520` | 4 | `archive/bebop-responsive-stage` | local-only |
| `slice/1-field` | `01d1e01` | 1 | `archive/1-field` | local-only |
| `slice/2-hero` | `8369d5d` | 0 | — | local-only |
| `slice/3-work` | `159f5a4` | 0 | — | local-only |
| `slice/4-sections` | `e7cdf48` | 0 | — | local-only |
| `slice/5-logo` | `b7d397b` | 0 | — | local-only |

`docs/add-spec-md` and `docs/spec-and-hdd-dev` (named in the retirement brief) no longer exist on the
remote or locally, so there was nothing to tag for them.

## Retired PRs

| PR | branch | disposition |
|---|---|---|
| #45 | `pr/02-glass-identity` | closed — superseded by #51 |
| #46 | `pr/03-frost-system` | closed — superseded by #51 |
| #47 | `pr/04-hero-profile-and-seo` | closed — superseded by #51 |
| #48 | `pr/05-sections-and-taste` | closed — superseded by #51 |
| #49 | `pr/06-perf-budget` | closed — superseded by #51 |
| #50 | `pr/07-auto-locale` | closed — superseded by #51 |
| #37 | `dependabot/github_actions/actions/setup-python-7` | closed — branch retired, regenerate on demand |
| #39 | `dependabot/npm_and_yarn/react-19.3.0` | closed — branch retired, regenerate on demand |
| #40 | `dependabot/npm_and_yarn/react-three/postprocessing-3.1.3` | closed — branch retired, regenerate on demand |
| #42 | `dependabot/npm_and_yarn/next-16.3.8` | closed — branch retired, regenerate on demand |
| #52 | `dependabot/npm_and_yarn/patch-updates-fcbd71a92a` | closed — branch retired, regenerate on demand |

## Recovery

Every commit that was not already in `main` stays reachable from the sha in the table above and, for the
local-only branches, from the local `archive/*` tags — none of them were pushed, so they live in this
clone only: `git show <sha>` still resolves each retired tip.

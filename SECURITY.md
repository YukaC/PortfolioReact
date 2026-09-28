# Security Policy

## Supported Versions

This is a personal portfolio project with no published release cadence. Security fixes land on `main` and are picked up automatically on the next deploy (Vercel deploys from the default branch).

| Version | Supported |
| ------- | --------- |
| `main`  | ✅        |
| < `main` (older commits) | ❌ |

There are no maintained release branches, so always run the latest commit of `main`.

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security problems.

Report vulnerabilities privately via GitHub's [private vulnerability reporting](https://github.com/YukaC/PortfolioReact/security/advisories/new), or by email to <agusyuk25@gmail.com>.

Include:

- a description of the issue and its impact,
- steps to reproduce (a URL, route, or request is ideal),
- any proof-of-concept or logs you already have.

You can expect an acknowledgement within 7 days. Confirmed issues will be fixed on `main`; if the report is declined, you will get the reasoning so you can decide whether to disclose publicly.

## Scope

This is a static, read-only portfolio: it fetches pinned repositories from the GitHub API at build time (`getStaticProps`) and has no authentication, database, or user-submitted content. Reports about those areas are unlikely to be exploitable, but still worth sending.

Third-party vulnerabilities in dependencies are handled by Dependabot (see [`.github/dependabot.yml`](.github/dependabot.yml)) and are not a security disclosure.

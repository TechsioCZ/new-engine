---
name: ui-release-check
description: >
  Check @techsio/ui-kit publish readiness before merging: exports map, files whitelist,
  semantic-release commit types, build output, and breaking-change review. Invoke
  explicitly with $ui-release-check.
metadata:
  plugin: techsio-ui-kit-ai
  library: "@techsio/ui-kit"
---

# ui-kit release check

Deep guidance: the bundled `ui-kit-publish-readiness` skill. Releases run via
semantic-release (`libs/ui/release.config.mjs`) from CI (`.github/workflows/ui-release.yml`)
— never publish manually.

## Checklist

1. **Build is publishable**: `bunx nx run ui-kit:build` succeeds; rslib emits
   `dist/{atoms,molecules,organisms,templates,theme}/*.js` + `dist/src/**/*.d.ts`
   (publint runs as part of the build via rsbuild-plugin-publint).
2. **Exports map intact**: every public component is reachable through the package.json
   wildcard subpaths (`@techsio/ui-kit/atoms/*`, `/molecules/*`, …); token CSS entries
   (`./tokens`, `./tokens-with-tailwind`, `./theme.css`, `./tokens/*`) untouched unless
   deliberately versioned.
3. **`files` whitelist**: `dist` + `src/tokens` — new runtime assets outside these two won't
   ship; add them consciously.
4. **Commit types drive the version**: `fix:` → patch, `feat:` → minor,
   `BREAKING CHANGE:`/`!` → major. Renamed/removed props, token renames, and changed
   data-attributes are BREAKING — check the diff for them explicitly.
5. **Peer range**: React >= 19.2 — verify nothing added requires newer peers silently.
6. **Quality gate passed**: `$ui-validate` for the final HEAD.

Report: proposed semver bump + justification, any breaking surface found, and whether the
changelog entry (generated from commits) will read sensibly.

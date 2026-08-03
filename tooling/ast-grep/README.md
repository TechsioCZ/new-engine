# ast-grep quality gate

`run.mjs` resolves the platform-specific ast-grep package and executes its native binary directly. This avoids pnpm's generated Node shim attempting to execute the native binary as JavaScript when dependency lifecycle scripts are intentionally disabled, while remaining portable across the supported Darwin, Linux, and Windows architectures.

Run the gate from the repository root:

```sh
pnpm ast-grep
```

The gate runs every rule fixture, then scans production source with no baseline or suppression layer. Every diagnostic fails CI; the expected production result is zero findings.

Run rule tests directly:

```sh
node ./tooling/ast-grep/run.mjs test --skip-snapshot-tests
```

Rule tests use positive and negative source cases. Snapshot baselines are unnecessary because these rules are diagnostic-only and have no rewrite output.

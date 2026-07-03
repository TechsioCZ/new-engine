#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const appRoot = path.resolve(path.dirname(scriptPath), '..');
const workspaceRoot = path.resolve(appRoot, '..', '..');
const defaultReportPath =
  '.codex/reports/smart-suggest-production-readiness/forbidden-patterns.json';

const ignoredDirectories = new Set([
  '.git',
  '.modern',
  '.output',
  'coverage',
  'dist',
  'dist-cloudflare',
  'node_modules',
  'repos',
]);

const textFilePattern = /\.(?:[cm]?[jt]sx?|json|css|html|mjs|mts|cts|ya?ml)$/u;
const codeFilePattern = /\.(?:[cm]?[jt]sx?|mjs|mts|cts)$/u;
const testFilePattern = /(?:^|\/)(?:tests?\/.*|.*\.(?:test|spec)\.[cm]?[jt]sx?)$/u;
const generatedFilePattern = /(?:^|\/)(?:router\.gen\.ts|.*\.gen\.[cm]?[jt]sx?)$/u;

const parseArgs = () => {
  const parsed = {
    format: 'text',
    jsonOut: defaultReportPath,
    writeReport: true,
  };

  for (let index = 2; index < process.argv.length; index += 1) {
    const arg = process.argv[index];

    if (arg === '--help') {
      process.stdout.write(`Usage: node scripts/smart-suggest-forbidden-pattern-gate.mjs [options]

Static production-readiness gate for Smart Suggest forbidden patterns.

Options:
  --json-out path     Write JSON report. Defaults to ${defaultReportPath}
  --format text|json  Print text summary or JSON report to stdout.
  --no-report         Do not write the JSON report file.
`);
      process.exit(0);
    }

    if (arg === '--json-out') {
      const value = process.argv[index + 1];
      if (value === undefined || value.startsWith('--')) {
        throw new Error('--json-out requires a path.');
      }
      parsed.jsonOut = value;
      index += 1;
      continue;
    }

    if (arg === '--format') {
      const value = process.argv[index + 1];
      if (value !== 'text' && value !== 'json') {
        throw new Error('--format must be text or json.');
      }
      parsed.format = value;
      index += 1;
      continue;
    }

    if (arg === '--no-report') {
      parsed.writeReport = false;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
};

const normalize = (filePath) => filePath.split(path.sep).join('/');
const relativeToWorkspace = (filePath) => normalize(path.relative(workspaceRoot, filePath));
const resolveWorkspacePath = (relativePath) => path.join(workspaceRoot, relativePath);
const resolveAppPath = (inputPath) =>
  path.isAbsolute(inputPath) ? inputPath : path.join(appRoot, inputPath);

const exists = (relativePath) => fs.existsSync(resolveWorkspacePath(relativePath));

const listFiles = (startDirectory) => {
  const absoluteStart = resolveWorkspacePath(startDirectory);
  if (!fs.existsSync(absoluteStart)) {
    return [];
  }

  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }

      const absoluteEntry = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(absoluteEntry);
        continue;
      }

      if (entry.isFile()) {
        files.push(relativeToWorkspace(absoluteEntry));
      }
    }
  };

  visit(absoluteStart);
  return files.sort((left, right) => left.localeCompare(right));
};

const unique = (values) => [...new Set(values)].sort((left, right) => left.localeCompare(right));

const readText = (relativePath) => fs.readFileSync(resolveWorkspacePath(relativePath), 'utf8');

const positionAt = (content, index) => {
  const prefix = content.slice(0, index);
  const lines = prefix.split('\n');
  return {
    column: lines.at(-1).length + 1,
    line: lines.length,
  };
};

const globalRegex = (regex) => {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  return new RegExp(regex.source, flags);
};

const appRuntimeFiles = listFiles('apps/smart-suggest/apps/shell-super-app/src')
  .concat(listFiles('apps/smart-suggest/apps/shell-super-app/sdk'))
  .filter(
    (file) =>
      textFilePattern.test(file) && !testFilePattern.test(file) && !generatedFilePattern.test(file),
  );

const bffRuntimeFiles = listFiles('apps/smart-suggest/apps/shell-super-app/api')
  .concat(listFiles('apps/smart-suggest/apps/shell-super-app/shared'))
  .filter(
    (file) =>
      codeFilePattern.test(file) &&
      !testFilePattern.test(file) &&
      !file.endsWith('.contract-proof.ts'),
  );

const bffApiFiles = listFiles('apps/smart-suggest/apps/shell-super-app/api').filter(
  (file) => codeFilePattern.test(file) && !testFilePattern.test(file),
);

const shellFiles = listFiles('apps/smart-suggest/apps/shell-super-app').filter((file) =>
  textFilePattern.test(file),
);
const packageFiles = listFiles('apps/smart-suggest/packages').filter((file) =>
  textFilePattern.test(file),
);
const smartSuggestLibFiles = listFiles('libs/smart-suggest').filter((file) =>
  textFilePattern.test(file),
);
const appRootConfigFiles = [
  'apps/smart-suggest/package.json',
  'apps/smart-suggest/pnpm-workspace.yaml',
  'apps/smart-suggest/tsconfig.base.json',
  'apps/smart-suggest/tsconfig.json',
  'apps/smart-suggest/vitest.config.ts',
].filter(exists);

const governedFiles = unique([
  ...shellFiles,
  ...packageFiles,
  ...smartSuggestLibFiles,
  ...appRootConfigFiles,
]).filter(
  (file) => !file.startsWith('apps/smart-suggest/scripts/') && !generatedFilePattern.test(file),
);

const testFiles = governedFiles.filter((file) => testFilePattern.test(file));
const scriptFiles = listFiles('apps/smart-suggest/scripts').filter((file) =>
  codeFilePattern.test(file),
);
const cssFiles = unique([
  ...listFiles('apps/smart-suggest/apps/shell-super-app/src').filter((file) =>
    file.endsWith('.css'),
  ),
  ...listFiles('apps/smart-suggest/packages').filter((file) => file.endsWith('.css')),
]);

const ruleGroups = [
  {
    files: scriptFiles,
    rules: [
      {
        id: 'cloudflare-generated-worker-output-mutation',
        message:
          'Smart Suggest scripts must not rewrite generated Cloudflare server or worker bundles; fix the UltraModern framework output and keep scripts as validation-only consumers.',
        regex:
          /\bfs\.writeFileSync\s*\(\s*(?:workerPath|path\.join\([^)]*\.output\/(?:server|worker))/u,
      },
      {
        id: 'cloudflare-generated-worker-source-inspection',
        message:
          'Smart Suggest scripts must not read generated Cloudflare server or worker bundles to detect framework behavior; fix and test the framework contract in UltraModern.',
        regex:
          /\bfs\.readFileSync\s*\([^;\n]*(?:\.output\/(?:server|worker)|workerPath)[^;\n]*,\s*['"]utf8['"]\s*\)/u,
      },
      {
        id: 'cloudflare-drizzle-entitykind-postbuild-patch',
        message:
          'Smart Suggest must not post-build patch Drizzle entityKind bundle markers; fix the UltraModern Cloudflare worker toolchain.',
        regex: /\.replaceAll\s*\(\s*['"];entityKind(?:,entityKind)?;['"]/u,
      },
      {
        id: 'effect-bff-runtime-shape-probe',
        message:
          'Smart Suggest scripts must not probe Effect BFF runtime object shape; use public @modern-js/plugin-bff/effect-server test handlers.',
        regex:
          /\b(?:typeof\s+\w+\.createHandler\s*===\s*['"]function['"]|\w+\.createHandler\s*\()/u,
      },
      {
        id: 'manual-effect-bff-dispatch-context',
        message:
          'Smart Suggest scripts must not hand-roll Effect BFF dispatch context; use createEffectBffTestHandler from @modern-js/plugin-bff/effect-server.',
        regex: /\brunWithEffectContext\s*\(/u,
      },
    ],
  },
  {
    files: bffRuntimeFiles,
    rules: [
      {
        id: 'runtime-sample-seeding-from-bff',
        message:
          'BFF runtime must not seed or read sample Smart Suggest datasets. Move production data setup to owned import/proof scripts.',
        regex:
          /\b(?:seedSampleAddressDatasetsEffect|SAMPLE_ADDRESS_FIXTURES|SAMPLE_DATA_SOURCES|CZ_SAMPLE_ADDRESSES|SK_SAMPLE_ADDRESSES|OPENADDRESSES_US_CA_SAMPLE_ADDRESSES|searchSampleAddressFixtures|sampleAddressFixtureToRecordInput)\b/u,
      },
      {
        id: 'runtime-sample-root-dataset-import-from-bff',
        message:
          'BFF runtime must not import the datasets root package because it exposes sample fixtures; use governed source-catalog imports only.',
        regex: /from\s+['"]@techsio\/smart-suggest-datasets['"]/u,
      },
      {
        id: 'runtime-sample-source-from-bff',
        message:
          'BFF runtime must not depend on sample source ids, sample dataset versions, or sample attribution labels.',
        regex:
          /\b(?:ruian-cz-sample|register-adries-sk-sample|openaddresses-us-ca-sample|sample-\d{4}-\d{2}-\d{2}|RUIAN sample|Register adries sample|OpenAddresses sample)\b/u,
      },
      {
        id: 'raw-response-json-in-bff',
        message:
          'BFF/shared API runtime must not hand-build JSON Response objects; keep protocol shape in Effect HttpApi schemas.',
        regex: /\b(?:new\s+Response|Response\.json)\s*\(/u,
      },
      {
        id: 'manual-request-body-in-bff',
        message:
          'BFF runtime must not manually parse request bodies; use HttpApiEndpoint payload/query/params schemas.',
        regex: /\brequest\.(?:json|text|formData|arrayBuffer)\s*\(/u,
      },
      {
        id: 'raw-request-handler-export-in-bff',
        message:
          'BFF runtime must not export raw request handlers; export defineEffectBff(...) from api/index.ts.',
        regex:
          /\bexport\s+(?:default\s+async|const\s+handler\b|async\s+function\s+(?:GET|POST|handler)\b)/u,
      },
      {
        id: 'generic-api-throw',
        message:
          'API modules must not throw generic Error values; return typed HttpApi errors or Effect failures.',
        regex: /\bthrow\s+(?:new\s+)?Error\s*\(/u,
      },
    ],
  },
  {
    files: bffApiFiles,
    rules: [
      {
        id: 'promise-first-bff-endpoint',
        message:
          'BFF endpoint handlers must return Effect programs, not async/Promise-first handlers.',
        regex: /\.handle\s*\(\s*['"][^'"]+['"]\s*,\s*async\b/su,
      },
      {
        id: 'promise-first-bff-endpoint-interop',
        message:
          'BFF endpoint handlers must not be thin Promise/fetch interop; keep endpoint behavior modeled as Effect programs.',
        regex:
          /\.handle\s*\(\s*['"][^'"]+['"]\s*,[\s\S]{0,220}?\b(?:Effect\.promise|Promise\.|new\s+Promise|fetch\s*\()/u,
      },
    ],
  },
  {
    files: appRuntimeFiles,
    rules: [
      {
        id: 'fake-local-suggestions-in-app',
        message:
          'App runtime must not provide fake/static local suggestions; visible suggestions must come from the Smart Suggest API/client path.',
        regex:
          /\b(?:createMockSmartSuggestClient|mockSmartSuggestClient|mockClient|fakeSuggestions|mockSuggestions|staticSuggestions|localSuggestions|fallbackSuggestions)\b/u,
      },
      {
        id: 'static-suggestion-array-in-app',
        message:
          'App runtime must not hardcode local suggestion arrays; use API-backed Smart Suggest clients.',
        regex: /\b(?:suggestions|addressSuggestions)\s*(?::\s*[^=;]+)?=\s*\[/u,
      },
      {
        id: 'sample-suggestion-source-in-app',
        message:
          'App runtime must not render sample source ids or sample address labels as product data.',
        regex:
          /\b(?:ruian-cz-sample|register-adries-sk-sample|openaddresses-us-ca-sample|RUIAN sample|Register adries sample|OpenAddresses sample|K Lou[žz]i)\b/iu,
      },
      {
        id: 'datasets-import-in-app-runtime',
        message:
          'App runtime must not import Smart Suggest datasets directly; it should consume the API/client contract.',
        regex: /from\s+['"]@techsio\/smart-suggest-datasets(?:['"]|\/)/u,
      },
    ],
  },
  {
    files: governedFiles,
    rules: [
      {
        id: 'rule-suppression-comment',
        message:
          'Rule suppressions are forbidden in the Smart Suggest production-readiness lane; fix the rule violation instead.',
        regex:
          /(?:eslint|oxlint|biome|typescript-eslint)-disable(?:-next-line|-line)?|@ts-(?:ignore|expect-error|nocheck)|\/\/\s*ts-(?:ignore|expect-error|nocheck)|\/\*\s*(?:istanbul|c8)\s+ignore/u,
      },
      {
        id: 'disabled-strict-typescript-rule',
        message:
          'Strict TypeScript safety rules must not be disabled for Smart Suggest production readiness.',
        regex:
          /"(?:(?:skipLibCheck)|(?:strict)|(?:noUncheckedIndexedAccess)|(?:exactOptionalPropertyTypes)|(?:useUnknownInCatchVariables))"\s*:\s*(?:true|false)/u,
        predicate: (match) => {
          const text = match[0];
          if (/"skipLibCheck"\s*:\s*true/u.test(text)) {
            return true;
          }
          return /"(?:(?:strict)|(?:noUncheckedIndexedAccess)|(?:exactOptionalPropertyTypes)|(?:useUnknownInCatchVariables))"\s*:\s*false/u.test(
            text,
          );
        },
      },
      {
        id: 'disabled-ultramodern-strict-api-rule',
        message:
          'UltraModern strict API/runtime checks must stay enabled; do not disable strictEffectApproach or the framework TS checker.',
        regex: /\b(?:strictEffectApproach\s*:\s*false|disableTsChecker\s*:\s*true)\b/u,
      },
    ],
  },
  {
    files: cssFiles,
    rules: [
      {
        id: 'broad-app-css-global-selector',
        message:
          'App CSS must not add broad global element/root overrides; use scoped components, tokens, or Tailwind utilities.',
        regex:
          /^\s*(?:html|body|\*|:root|#root|main|section|article|aside|form|label|input|button|select|textarea|a|p|ul|ol|li|h[1-6])(?:\s|,|\.|#|\[|:|\{)/mu,
      },
      {
        id: 'broad-app-css-layer-base',
        message:
          'App CSS must not patch global base styles; keep generated shell styling scoped and token-driven.',
        regex: /^\s*@layer\s+base\b/mu,
      },
      {
        id: 'broad-app-css-important',
        message:
          'App CSS must not use !important as a broad styling override; fix ownership or component styling instead.',
        regex: /!important\b/u,
      },
      {
        id: 'broad-app-css-reset',
        message: 'App CSS must not reset broad style inheritance with all: unset/initial/revert.',
        regex: /\ball\s*:\s*(?:unset|initial|revert)\b/u,
      },
      {
        id: 'broad-app-css-class-attribute-selector',
        message: 'App CSS must not target generated class strings with class attribute selectors.',
        regex: /\[class[*^$|~]?=/u,
      },
    ],
  },
  {
    files: testFiles,
    rules: [
      {
        id: 'class-name-test-assertion',
        message:
          'Tests must not assert product behavior through class names; use accessible behavior, browser evidence, or API evidence.',
        regex:
          /\b(?:toHaveClass|className|classList|getAttribute\s*\(\s*['"]class['"]|querySelector(?:All)?\s*\(\s*['"]\.)/u,
      },
      {
        id: 'css-content-test-assertion',
        message:
          'Tests must not assert product behavior through CSS strings or computed style content.',
        regex:
          /\b(?:getComputedStyle|toHaveStyle)\b|\.style\.(?:getPropertyValue|setProperty)\s*\(|readFileSync\s*\([\s\S]{0,160}\.css['"]/u,
      },
    ],
  },
];

const findings = [];
const findingKeys = new Set();

const addFinding = (file, rule, content, index) => {
  const { column, line } = positionAt(content, index);
  const key = `${file}:${line}:${column}:${rule.id}`;

  if (findingKeys.has(key)) {
    return;
  }

  findingKeys.add(key);
  findings.push({
    column,
    file,
    line,
    message: rule.message,
    ruleId: rule.id,
    severity: 'error',
  });
};

const scanFile = (file, rules) => {
  const content = readText(file);

  for (const rule of rules) {
    const regex = globalRegex(rule.regex);
    for (const match of content.matchAll(regex)) {
      if (match.index === undefined) {
        continue;
      }

      if (rule.predicate !== undefined && !rule.predicate(match)) {
        continue;
      }

      addFinding(file, rule, content, match.index);
    }
  }
};

for (const group of ruleGroups) {
  for (const file of group.files) {
    scanFile(file, group.rules);
  }
}

findings.sort(
  (left, right) =>
    left.file.localeCompare(right.file) ||
    left.line - right.line ||
    left.column - right.column ||
    left.ruleId.localeCompare(right.ruleId),
);

const report = {
  checkedAt: new Date().toISOString(),
  findings,
  profile: 'smart-suggest-production-readiness-forbidden-pattern-gate-v1',
  scanned: {
    appRuntimeFiles: appRuntimeFiles.length,
    bffApiFiles: bffApiFiles.length,
    bffRuntimeFiles: bffRuntimeFiles.length,
    cssFiles: cssFiles.length,
    governedFiles: governedFiles.length,
    testFiles: testFiles.length,
  },
  status: findings.length === 0 ? 'pass' : 'fail',
};

const args = parseArgs();
const reportPath = resolveAppPath(args.jsonOut);

if (args.writeReport) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

if (args.format === 'json') {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} else if (findings.length === 0) {
  process.stdout.write(
    `Smart Suggest forbidden-pattern gate passed. Report: ${normalize(
      path.relative(appRoot, reportPath),
    )}\n`,
  );
} else {
  process.stderr.write('Smart Suggest forbidden-pattern gate failed:\n');
  for (const finding of findings) {
    process.stderr.write(
      `- ${finding.file}:${finding.line}:${finding.column} ${finding.ruleId} - ${finding.message}\n`,
    );
  }
  process.stderr.write(`Report: ${normalize(path.relative(appRoot, reportPath))}\n`);
}

if (findings.length > 0) {
  process.exit(1);
}

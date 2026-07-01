#!/usr/bin/env node
import fs from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(workspaceRoot, '../..');
const defaultReportPath = '.codex/reports/smart-suggest-public-demo-proof/public-demo-proof.json';
const defaultLocalUrl = 'http://localhost:3020';
const productionArtifactManifestPath = path.join(
  workspaceRoot,
  '.codex/artifacts/smart-suggest-owned-data-production/manifest.json',
);
const phoneValidationModes = ['server-only', 'frontend-lazy', 'frontend-immediate'];
const expectedKLouziAddress = {
  countryCode: 'CZ',
  houseNumber: '1258',
  orientationNumber: '12',
  street: 'K Louži',
};

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value === '' ? undefined : value;
}

function defaultArgs() {
  const envUrl =
    envValue('SMART_SUGGEST_DEMO_URL') ?? envValue('ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP');

  return {
    apiBase: envValue('SMART_SUGGEST_API_BASE_URL'),
    help: false,
    out: defaultReportPath,
    requireLive: false,
    timeoutMs: 5000,
    url: envUrl ?? defaultLocalUrl,
    urlWasExplicit: envUrl !== undefined,
  };
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/smart-suggest-public-demo-proof.mjs [--url http://localhost:3020] [--api-base /api] [--out proof.json]

Checks the Smart Suggest localized root redirect, public SDK demo, and API matrix
without live provider credentials. The default URL is ${defaultLocalUrl}. Set
SMART_SUGGEST_DEMO_URL or ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP, or pass --url,
to prove a public Worker.

Options:
  --url value             Demo/public base URL. Default: ${defaultLocalUrl}
  --api-base value        API base URL/path. Default probes /api then /
  --out path              JSON report path under apps/smart-suggest
  --timeout-ms value      Per-request timeout. Default: 5000
  --require-live          Fail instead of falling back when the URL is unreachable
`);
}

function parsePositiveInteger(value, label) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }

  return parsed;
}

function parseArgs(argv) {
  const parsed = defaultArgs();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--require-live') {
      parsed.requireLive = true;
    } else if (arg === '--url') {
      const value = argv[index + 1];

      if (value === undefined || value.startsWith('--')) {
        throw new Error('--url requires a value.');
      }
      parsed.url = value;
      parsed.urlWasExplicit = true;
      index += 1;
    } else if (arg === '--api-base') {
      const value = argv[index + 1];

      if (value === undefined || value.startsWith('--')) {
        throw new Error('--api-base requires a value.');
      }
      parsed.apiBase = value;
      index += 1;
    } else if (arg === '--out') {
      const value = argv[index + 1];

      if (value === undefined || value.startsWith('--')) {
        throw new Error('--out requires a value.');
      }
      parsed.out = value;
      index += 1;
    } else if (arg === '--timeout-ms') {
      const value = argv[index + 1];

      if (value === undefined || value.startsWith('--')) {
        throw new Error('--timeout-ms requires a value.');
      }
      parsed.timeoutMs = parsePositiveInteger(value, '--timeout-ms');
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function resolveWorkspacePath(inputPath) {
  const absolutePath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(workspaceRoot, inputPath);

  if (absolutePath !== workspaceRoot && !absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error(`Path must stay inside apps/smart-suggest: ${inputPath}`);
  }

  return absolutePath;
}

function relativeWorkspacePath(filePath) {
  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(workspaceRoot, absolutePath);

  return relativePath === '' || relativePath.startsWith('..') || path.isAbsolute(relativePath)
    ? path.basename(absolutePath)
    : relativePath.split(path.sep).join('/');
}

function normalizeBaseUrl(value) {
  const url = new URL(value);
  url.hash = '';
  return url;
}

function joinRoute(baseUrl, routePath) {
  const normalizedBase = String(baseUrl).endsWith('/') ? String(baseUrl) : `${baseUrl}/`;
  const normalizedRoute = routePath.startsWith('/') ? routePath.slice(1) : routePath;

  return new URL(normalizedRoute, normalizedBase);
}

function joinOriginRoute(baseUrl, routePath) {
  return new URL(routePath, baseUrl);
}

function createReport(args) {
  return {
    schemaVersion: 'smart-suggest-public-demo-proof/v1',
    generatedAt: new Date().toISOString(),
    target: {
      apiBase: args.apiBase,
      mode: 'http',
      url: args.url,
    },
    status: 'pending',
    checks: [],
    summary: {},
  };
}

function recordCheck(report, id, status, summary, details = {}) {
  const entry = {
    id,
    status,
    summary,
    ...details,
  };
  report.checks.push(entry);
  return entry;
}

function pass(report, id, summary, details) {
  return recordCheck(report, id, 'pass', summary, details);
}

function fail(report, id, summary, details) {
  return recordCheck(report, id, 'fail', summary, details);
}

function skip(report, id, summary, details) {
  return recordCheck(report, id, 'skipped', summary, details);
}

function check(report, condition, id, passSummary, failSummary, details = {}) {
  return condition
    ? pass(report, id, passSummary, details)
    : fail(report, id, failSummary, details);
}

function summarizeReport(report) {
  const counts = report.checks.reduce(
    (summary, checkEntry) => {
      summary[checkEntry.status] = (summary[checkEntry.status] ?? 0) + 1;
      return summary;
    },
    { fail: 0, pass: 0, skipped: 0 },
  );
  const hasFailures = counts.fail > 0;
  const onlySkipped = counts.pass === 0 && counts.fail === 0 && counts.skipped > 0;

  report.summary = counts;
  report.status = hasFailures ? 'fail' : onlySkipped ? 'skipped' : 'pass';
}

function writeReport(report, outPath) {
  if (outPath === undefined) {
    return;
  }

  const absoluteOut = resolveWorkspacePath(outPath);
  fs.mkdirSync(path.dirname(absoluteOut), { recursive: true });
  fs.writeFileSync(absoluteOut, `${JSON.stringify(report, null, 2)}\n`);
}

function printReportSummary(report, outPath) {
  for (const checkEntry of report.checks) {
    process.stdout.write(
      `[smart-suggest-public-demo-proof] ${checkEntry.status.toUpperCase()} ${checkEntry.id}: ${checkEntry.summary}\n`,
    );
  }

  const suffix = outPath === undefined ? '' : ` report=${outPath}`;
  process.stdout.write(
    `[smart-suggest-public-demo-proof] ${report.status}${suffix} pass=${report.summary.pass} fail=${report.summary.fail} skipped=${report.summary.skipped}\n`,
  );
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(
      new DOMException('Smart Suggest public demo proof timed out.', 'TimeoutError'),
    );
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function responseToText(response) {
  return {
    body: await response.text(),
    contentType: response.headers.get('content-type'),
    ok: response.ok,
    status: response.status,
  };
}

function parseJsonBody(body) {
  try {
    return JSON.parse(body);
  } catch {
    return;
  }
}

async function responseToJson(response) {
  const text = await responseToText(response);

  return {
    ...text,
    json: parseJsonBody(text.body),
  };
}

async function fetchText(url, timeoutMs) {
  return responseToText(
    await fetchWithTimeout(
      url,
      {
        headers: { accept: 'text/html, text/plain, */*' },
        method: 'GET',
      },
      timeoutMs,
    ),
  );
}

async function fetchRootLocaleRedirect(url, timeoutMs) {
  const response = await fetchWithTimeout(
    url,
    {
      headers: {
        accept: 'text/html, text/plain, */*',
        'accept-language': 'cs-CZ,cs;q=0.9,en;q=0.1',
      },
      method: 'GET',
      redirect: 'manual',
    },
    timeoutMs,
  );

  return {
    body: await response.text(),
    cacheControl: response.headers.get('cache-control'),
    location: response.headers.get('location'),
    ok: response.ok,
    status: response.status,
    vary: response.headers.get('vary'),
  };
}

async function fetchJson(url, init, timeoutMs) {
  return responseToJson(
    await fetchWithTimeout(
      url,
      {
        ...init,
        headers: {
          accept: 'application/json',
          ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }),
          ...init?.headers,
        },
      },
      timeoutMs,
    ),
  );
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');
}

function readRepositorySource(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function htmlHasDemoForm(html) {
  return (
    html.includes('id="address-line"') &&
    html.includes('id="postal-code"') &&
    html.includes('id="country"') &&
    html.includes('id="phone"')
  );
}

function htmlHasManualEntryFallback(html) {
  return (
    /<form\b[^>]*\bmethod=["']post["'][^>]*\baction=["']\/checkout["']/iu.test(html) ||
    /<form\b[^>]*\baction=["']\/checkout["'][^>]*\bmethod=["']post["']/iu.test(html)
  );
}

function sourceRendersCheckoutDemo() {
  const localizedRootSource = readSource('apps/shell-super-app/src/routes/[lang]/page.tsx');
  const demoSource = readSource('apps/shell-super-app/src/routes/smart-suggest-demo.tsx');

  return (
    localizedRootSource.includes('smart-suggest-demo') &&
    demoSource.includes('TechsioSmartSuggest') &&
    demoSource.includes('/sdk/techsio-smart-suggest.js') &&
    demoSource.includes("apiBaseUrl: '/api'") &&
    demoSource.includes("addressLine: '#address-line'") &&
    demoSource.includes("postalCode: '#postal-code'") &&
    demoSource.includes("phone: '#phone'") &&
    demoSource.includes("phoneValidationMode: 'server-only'") &&
    demoSource.includes('action="/checkout"')
  );
}

function htmlHasSdkModuleScript(html) {
  return /<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["'](?:\.\/)?techsio-smart-suggest\.js["']/iu.test(
    html,
  );
}

function validateRootLocaleRedirect(report, root) {
  check(
    report,
    root.status === 302,
    'root-locale-redirect-status',
    'Root request returned the framework-owned locale redirect.',
    'Root request did not return the framework-owned locale redirect.',
    {
      statusCode: root.status,
    },
  );
  check(
    report,
    root.location === '/cs',
    'root-locale-redirect-location',
    'Root redirect targeted the negotiated Czech locale path.',
    'Root redirect did not target the negotiated Czech locale path.',
    {
      location: root.location,
    },
  );
  check(
    report,
    root.cacheControl === 'private, no-store',
    'root-locale-redirect-cache-control',
    'Root redirect is private and not stored.',
    'Root redirect did not include private, no-store cache control.',
    {
      cacheControl: root.cacheControl,
    },
  );
  check(
    report,
    typeof root.vary === 'string' && root.vary.toLowerCase().includes('accept-language'),
    'root-locale-redirect-vary',
    'Root redirect varies on locale negotiation headers.',
    'Root redirect did not vary on locale negotiation headers.',
    {
      vary: root.vary,
    },
  );
}

function validateDemoHtml(report, demo, source) {
  const contentType = demo.contentType ?? '';
  const isHtml = contentType.toLowerCase().includes('text/html') || demo.body.includes('<html');
  const hasForm = htmlHasDemoForm(demo.body);
  const hasSdk =
    demo.body.includes('/sdk/techsio-smart-suggest.js') || htmlHasSdkModuleScript(demo.body);
  const hasAttach = demo.body.includes('TechsioSmartSuggest') && demo.body.includes('attach');

  check(
    report,
    demo.ok,
    `${source}-demo-html-http`,
    'Demo HTML returned HTTP success.',
    'Demo HTML did not return HTTP success.',
    {
      statusCode: demo.status,
    },
  );
  check(
    report,
    isHtml,
    `${source}-demo-html-content-type`,
    'Demo response is HTML.',
    'Demo response was not recognizable HTML.',
    {
      contentType,
    },
  );
  check(
    report,
    hasForm,
    `${source}-demo-form-fields`,
    'Demo exposes address, country, postal, and phone fields.',
    'Demo form fields are incomplete.',
  );
  check(
    report,
    htmlHasManualEntryFallback(demo.body),
    `${source}-demo-manual-entry-fallback`,
    'Demo form remains a native checkout POST when no suggestion is accepted.',
    'Demo form does not expose a native manual-entry checkout fallback.',
  );
  check(
    report,
    hasSdk,
    `${source}-demo-sdk-script`,
    'Demo loads the Smart Suggest SDK module.',
    'Demo does not load the Smart Suggest SDK module.',
  );
  check(
    report,
    hasAttach,
    `${source}-demo-sdk-attach`,
    'Demo attaches the Smart Suggest SDK.',
    'Demo does not attach the Smart Suggest SDK.',
  );
}

function validateSdk(report, sdk, source) {
  const hasGlobal =
    sdk.body.includes('TechsioSmartSuggest') || sdk.body.includes('installSmartSuggestGlobal');
  const hasSuggest = sdk.body.includes('/v1/suggest');
  const hasAccept = sdk.body.includes('/v1/accept');
  const hasPhone = sdk.body.includes('/v1/validate/phone');
  const hasPostal = sdk.body.includes('/v1/validate/postal');
  const exposesPhoneMode = sdk.body.includes('phoneValidationMode');
  const missingPhoneModes = phoneValidationModes.filter((mode) => !sdk.body.includes(mode));

  check(
    report,
    sdk.ok,
    `${source}-sdk-http`,
    'SDK module returned HTTP success.',
    'SDK module did not return HTTP success.',
    {
      statusCode: sdk.status,
    },
  );
  check(
    report,
    hasGlobal,
    `${source}-sdk-global`,
    'SDK installs or exports the browser attach surface.',
    'SDK attach surface is missing.',
  );
  check(
    report,
    hasSuggest,
    `${source}-sdk-suggest-path`,
    'SDK calls the suggest endpoint.',
    'SDK suggest endpoint path is missing.',
  );
  check(
    report,
    hasAccept,
    `${source}-sdk-accept-path`,
    'SDK records accept events.',
    'SDK accept endpoint path is missing.',
  );
  check(
    report,
    hasPhone,
    `${source}-sdk-phone-path`,
    'SDK calls the phone validation endpoint.',
    'SDK phone validation endpoint path is missing.',
  );
  check(
    report,
    hasPostal,
    `${source}-sdk-postal-path`,
    'SDK calls the postal validation endpoint.',
    'SDK postal validation endpoint path is missing.',
  );

  if (!exposesPhoneMode) {
    skip(
      report,
      `${source}-sdk-phone-validation-modes`,
      'SDK does not expose phoneValidationMode; endpoint behavior is checked instead.',
    );
    return;
  }

  check(
    report,
    missingPhoneModes.length === 0,
    `${source}-sdk-phone-validation-modes`,
    'SDK exposes server-only, lazy, and immediate phone validation modes.',
    'SDK exposes phoneValidationMode but is missing one or more supported modes.',
    { missingPhoneModes },
  );
}

function createHttpTransport(apiBase, timeoutMs) {
  return {
    apiBase: String(apiBase),
    kind: 'http',
    requestJson(routePath, init) {
      return fetchJson(joinRoute(apiBase, routePath), init, timeoutMs);
    },
  };
}

function staticContentType(filePath) {
  if (filePath.endsWith('.json')) {
    return 'application/json; charset=utf-8';
  }

  return 'application/octet-stream';
}

async function createLocalArtifactServer(rootDir) {
  const artifactRoot = path.resolve(rootDir);
  const server = createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { allow: 'GET, HEAD' });
      response.end();
      return;
    }

    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    const decodedPath = decodeURIComponent(url.pathname).replace(/^\/+/u, '');
    const filePath = path.resolve(artifactRoot, decodedPath);

    if (filePath !== artifactRoot && !filePath.startsWith(`${artifactRoot}${path.sep}`)) {
      response.writeHead(403);
      response.end();
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError !== null || !stat.isFile()) {
        response.writeHead(404);
        response.end();
        return;
      }

      response.writeHead(200, {
        'cache-control': 'public, max-age=31536000, immutable',
        'content-length': String(stat.size),
        'content-type': staticContentType(filePath),
      });

      if (request.method === 'HEAD') {
        response.end();
        return;
      }

      const stream = fs.createReadStream(filePath);
      stream.on('error', () => {
        response.destroy();
      });
      stream.pipe(response);
    });
  });

  const { manifestUrl } = await new Promise((resolve, reject) => {
    const onError = (error) => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = () => {
      server.off('error', onError);
      const address = server.address();

      if (address === null || typeof address === 'string') {
        reject(new Error('Local artifact server did not expose a TCP address.'));
        return;
      }

      resolve({
        manifestUrl: `http://127.0.0.1:${address.port}/manifest.json`,
      });
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(0, '127.0.0.1');
  });

  return {
    manifestUrl,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error !== undefined) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    },
  };
}

async function createDirectArtifactManifest(report) {
  const explicitManifestUrl =
    envValue('SMART_SUGGEST_PUBLIC_DEMO_ARTIFACT_MANIFEST_URL') ??
    envValue('SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL');

  if (explicitManifestUrl !== undefined) {
    pass(
      report,
      'direct-api-production-artifacts',
      'Direct API fallback uses the configured owned artifact manifest URL.',
      {
        manifestUrl: explicitManifestUrl,
      },
    );
    return {
      manifestUrl: explicitManifestUrl,
      async close() {},
    };
  }

  if (!fs.existsSync(productionArtifactManifestPath)) {
    fail(
      report,
      'direct-api-production-artifacts',
      'Production owned artifact manifest is missing for direct API fallback.',
      {
        expectedManifestPath: relativeWorkspacePath(productionArtifactManifestPath),
        remediation:
          'Run pnpm smart-suggest:artifacts:build:production or set SMART_SUGGEST_PUBLIC_DEMO_ARTIFACT_MANIFEST_URL.',
      },
    );
    return;
  }

  const artifactServer = await createLocalArtifactServer(
    path.dirname(productionArtifactManifestPath),
  );
  pass(
    report,
    'direct-api-production-artifacts',
    'Direct API fallback serves the local production owned artifact tree.',
    {
      manifestPath: relativeWorkspacePath(productionArtifactManifestPath),
      manifestUrl: artifactServer.manifestUrl,
    },
  );

  return artifactServer;
}

function isSmartSuggestStatus(value) {
  return value?.service === 'smart-suggest';
}

async function detectApiBase(report, baseUrl, args) {
  const candidates =
    args.apiBase === undefined
      ? [joinOriginRoute(baseUrl, '/api'), joinOriginRoute(baseUrl, '/')]
      : [new URL(args.apiBase, baseUrl)];

  for (const candidate of candidates) {
    const status = await fetchJson(
      joinRoute(candidate, '/v1/status'),
      { method: 'GET' },
      args.timeoutMs,
    ).catch((error) => ({
      error,
      json: undefined,
      ok: false,
      status: 0,
    }));

    if (status.ok && isSmartSuggestStatus(status.json)) {
      report.target.apiBase = String(candidate);
      pass(report, 'api-base-detected', 'Smart Suggest API base is reachable.', {
        apiBase: String(candidate),
      });
      return createHttpTransport(candidate, args.timeoutMs);
    }
  }

  fail(
    report,
    'api-base-detected',
    'Smart Suggest API base was not reachable at /api/v1/status or /v1/status.',
    {
      probedBases: candidates.map(String),
    },
  );
  return;
}

async function createDirectApiTransport(report) {
  const distHandlerPath = path.join(workspaceRoot, 'apps/shell-super-app/dist/api/index.js');

  if (!fs.existsSync(distHandlerPath)) {
    skip(
      report,
      'direct-api-fallback',
      'Built API handler is missing, so direct API fallback was skipped.',
      {
        distHandlerPath: relativeWorkspacePath(distHandlerPath),
      },
    );
    return;
  }

  try {
    const module = await import(pathToFileURL(distHandlerPath).href);
    const runtime = module.default ?? module;
    const createdHandler =
      typeof runtime.createHandler === 'function'
        ? runtime.createHandler({ openapi: false })
        : undefined;
    const handler = createdHandler?.handler;

    if (typeof handler !== 'function') {
      throw new Error('dist Effect runtime createHandler export is missing.');
    }

    const shellAppRequire = createRequire(
      pathToFileURL(path.join(workspaceRoot, 'apps/shell-super-app/package.json')).href,
    );
    const effectServerPath = shellAppRequire.resolve('@modern-js/plugin-bff/effect-server');
    const { createEffectOperationContext, runWithEffectContext } = await import(
      pathToFileURL(effectServerPath).href
    );
    const artifactManifest = await createDirectArtifactManifest(report);

    if (artifactManifest === undefined) {
      return;
    }

    pass(report, 'direct-api-fallback', 'Loaded built API handler for direct fallback checks.', {
      distHandlerPath: relativeWorkspacePath(distHandlerPath),
    });

    return {
      apiBase: 'dist-api-handler',
      close: artifactManifest.close,
      kind: 'direct-dist',
      async requestJson(routePath, init) {
        const request = new Request(`https://smart-suggest.local${routePath}`, {
          ...init,
          headers: {
            accept: 'application/json',
            ...(init?.body === undefined ? {} : { 'content-type': 'application/json' }),
            ...init?.headers,
          },
        });
        const env = {
          HERE_API_KEY: '',
          MAPY_CZ_API_KEY: '',
          NOMINATIM_USER_AGENT: '',
          RADAR_API_KEY: '',
          RUIAN_GEOCODE_DISABLED: 'true',
          SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE: 'false',
          SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL: artifactManifest.manifestUrl,
          SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS: 'false',
          SMART_SUGGEST_PROVIDER_PRIORITY: '',
        };
        const context = {
          request,
          env,
          path: routePath,
          method: request.method,
          operationContext: createEffectOperationContext({
            request,
            env,
            path: routePath,
            method: request.method,
          }),
        };
        const response = await runWithEffectContext(context, () =>
          handler.length > 1 ? handler(request, context) : handler(request),
        );

        return responseToJson(response);
      },
    };
  } catch (error) {
    fail(report, 'direct-api-fallback', 'Built API handler could not be loaded.', {
      error: error instanceof Error ? error.message : String(error),
    });
    return;
  }
}

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replaceAll(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('cs-CZ')
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replaceAll(/\s+/gu, ' ');
}

function summarizeSuggestion(suggestion) {
  return {
    address: {
      city: suggestion.address?.city,
      countryCode: suggestion.address?.countryCode,
      houseNumber: suggestion.address?.houseNumber,
      orientationNumber: suggestion.address?.orientationNumber,
      postalCode: suggestion.address?.postalCode,
      street: suggestion.address?.street,
    },
    cacheStatus: suggestion.cacheStatus,
    displayLabel: suggestion.displayLabel,
    id: suggestion.id,
    sourceId: suggestion.source?.id,
    sourceKind: suggestion.source?.kind,
  };
}

function summarizeSuggestions(suggestions) {
  return suggestions.map(summarizeSuggestion);
}

function providerEventsForResponse(body) {
  return Array.isArray(body?.providerEvents) ? body.providerEvents : [];
}

function isOwnedKLouzi1258Slash12(suggestion) {
  const address = suggestion?.address ?? {};
  const streetText = normalizeText(address.street ?? address.line1 ?? suggestion?.displayLabel);

  return (
    suggestion?.source?.kind === 'owned-dataset' &&
    address.countryCode === expectedKLouziAddress.countryCode &&
    address.houseNumber === expectedKLouziAddress.houseNumber &&
    address.orientationNumber === expectedKLouziAddress.orientationNumber &&
    streetText.includes('k louzi')
  );
}

function isOwnedKLouziStreetSuggestion(suggestion) {
  const address = suggestion?.address ?? {};
  const streetText = normalizeText(address.street ?? address.line1 ?? suggestion?.displayLabel);

  return (
    suggestion?.source?.kind === 'owned-dataset' &&
    address.countryCode === expectedKLouziAddress.countryCode &&
    streetText.includes('k louzi')
  );
}

function sourceForAccept(source) {
  if (
    typeof source?.id !== 'string' ||
    typeof source?.kind !== 'string' ||
    typeof source?.name !== 'string'
  ) {
    return;
  }

  return {
    id: source.id,
    kind: source.kind,
    name: source.name,
  };
}

function statusProviderEventTotal(statusBody) {
  const providerEvents = statusBody?.metrics?.providerEvents;

  if (providerEvents === undefined || typeof providerEvents !== 'object') {
    return;
  }

  return Object.values(providerEvents).reduce(
    (total, value) => total + (typeof value === 'number' ? value : 0),
    0,
  );
}

function statusAcceptTotal(statusBody) {
  const total = statusBody?.metrics?.accept?.total;

  return typeof total === 'number' ? total : undefined;
}

async function getStatus(report, transport, checkId) {
  const response = await transport.requestJson('/v1/status', { method: 'GET' });

  check(
    report,
    response.ok,
    `${checkId}-http`,
    'Status endpoint returned HTTP success.',
    'Status endpoint did not return HTTP success.',
    {
      mode: transport.kind,
      statusCode: response.status,
    },
  );
  check(
    report,
    isSmartSuggestStatus(response.json),
    `${checkId}-service`,
    'Status endpoint identifies smart-suggest.',
    'Status endpoint did not identify smart-suggest.',
  );

  return response.json;
}

async function runSuggestScenario(report, transport, scenario) {
  const params = new URLSearchParams();
  params.set('countryCode', 'CZ');
  params.set('kind', 'address');
  params.set('language', 'cs-CZ');
  params.set('limit', String(scenario.limit ?? 5));
  params.set('q', scenario.query);

  const response = await transport.requestJson(`/v1/suggest?${params.toString()}`, {
    method: 'GET',
  });
  const suggestions = Array.isArray(response.json?.suggestions) ? response.json.suggestions : [];
  const providerEvents = providerEventsForResponse(response.json);
  const matchingSuggestion = suggestions.find(scenario.matches ?? (() => false));
  const relevantSuggestions =
    scenario.matches === undefined ? suggestions : suggestions.filter(scenario.matches);
  const suggestionIds = suggestions.map((suggestion) => suggestion.id);
  const details = {
    cacheStatus: response.json?.cacheStatus,
    mode: transport.kind,
    providerEventCount: providerEvents.length,
    requestId: response.json?.requestId,
    scenarioId: scenario.id,
    relevantSuggestionCount: relevantSuggestions.length,
    suggestionCount: suggestions.length,
    suggestionIds,
    suggestions: summarizeSuggestions(suggestions),
  };

  check(
    report,
    response.ok,
    `${scenario.id}-http`,
    'Suggest scenario returned HTTP success.',
    'Suggest scenario did not return HTTP success.',
    {
      mode: transport.kind,
      scenarioId: scenario.id,
      statusCode: response.status,
    },
  );

  if (scenario.expect === 'owned-k-louzi-1258-12') {
    check(
      report,
      matchingSuggestion !== undefined,
      scenario.id,
      scenario.passSummary ?? 'K Louzi scenario returned the owned 1258/12 suggestion.',
      scenario.failSummary ?? 'K Louzi scenario did not return the owned 1258/12 suggestion.',
      details,
    );
  } else if (scenario.expect === 'owned-address') {
    check(
      report,
      matchingSuggestion !== undefined,
      scenario.id,
      scenario.passSummary ?? 'Owned address suggestion was available.',
      scenario.failSummary ?? 'Owned address suggestion was not available.',
      details,
    );
  } else if (scenario.expect === 'minimum-suggestion-count') {
    check(
      report,
      relevantSuggestions.length >= scenario.minimumCount,
      scenario.id,
      scenario.passSummary ?? 'Suggest scenario returned enough suggestions.',
      scenario.failSummary ?? 'Suggest scenario returned too few suggestions.',
      details,
    );

    if (Array.isArray(scenario.requiredSuggestionIds)) {
      check(
        report,
        scenario.requiredSuggestionIds.every((id) => suggestionIds.includes(id)),
        `${scenario.id}-required-ids`,
        'Suggest scenario returned the required suggestions.',
        'Suggest scenario missed required suggestions.',
        {
          ...details,
          requiredSuggestionIds: scenario.requiredSuggestionIds,
        },
      );
    }
  } else if (scenario.expect === 'empty') {
    check(
      report,
      suggestions.length === 0,
      scenario.id,
      scenario.passSummary ?? 'Weak query collapsed to no suggestions.',
      scenario.failSummary ?? 'Weak query returned suggestions before enough address signal.',
      details,
    );
  }

  check(
    report,
    providerEvents.length === 0,
    `${scenario.id}-provider-events`,
    'Suggest scenario did not emit provider events.',
    'Suggest scenario emitted provider events.',
    {
      mode: transport.kind,
      providerEventCount: providerEvents.length,
      scenarioId: scenario.id,
    },
  );

  return {
    body: response.json,
    matchingSuggestion,
    providerEventCount: providerEvents.length,
    scenarioId: scenario.id,
    suggestions,
  };
}

async function postJsonScenario(report, transport, routePath, body, checkId) {
  const response = await transport.requestJson(routePath, {
    body: JSON.stringify(body),
    method: 'POST',
  });

  check(
    report,
    response.ok,
    `${checkId}-http`,
    'POST endpoint returned HTTP success.',
    'POST endpoint did not return HTTP success.',
    {
      mode: transport.kind,
      statusCode: response.status,
    },
  );

  return response.json;
}

async function runValidationMatrix(report, transport) {
  const validPhone = await postJsonScenario(
    report,
    transport,
    '/v1/validate/phone',
    {
      defaultCountry: 'CZ',
      rawInput: '777 123 456',
      requireMobile: true,
    },
    'phone-valid-cz-mobile',
  );

  check(
    report,
    validPhone?.isValid === true && validPhone?.e164 === '+420777123456',
    'phone-valid-cz-mobile',
    'Phone endpoint validates and normalizes a CZ mobile number.',
    'Phone endpoint did not validate the CZ mobile number as expected.',
    {
      detectedCountry: validPhone?.detectedCountry,
      displayValue: validPhone?.displayValue,
      e164: validPhone?.e164,
      isValid: validPhone?.isValid,
      mode: transport.kind,
    },
  );

  const invalidPhone = await postJsonScenario(
    report,
    transport,
    '/v1/validate/phone',
    {
      defaultCountry: 'CZ',
      rawInput: 'not a phone',
    },
    'phone-invalid-shape',
  );

  check(
    report,
    invalidPhone?.isValid === false && Array.isArray(invalidPhone?.errors),
    'phone-invalid-shape',
    'Phone endpoint rejects malformed values with structured errors.',
    'Phone endpoint did not reject malformed values as expected.',
    {
      errorCodes: Array.isArray(invalidPhone?.errors)
        ? invalidPhone.errors.map((error) => error.code)
        : [],
      isValid: invalidPhone?.isValid,
      mode: transport.kind,
    },
  );

  const validPostal = await postJsonScenario(
    report,
    transport,
    '/v1/validate/postal',
    {
      countryCode: 'CZ',
      rawInput: '10100',
    },
    'postal-valid-cz',
  );

  check(
    report,
    validPostal?.isValid === true && validPostal?.displayValue === '101 00',
    'postal-valid-cz',
    'Postal endpoint validates and formats a CZ postal code.',
    'Postal endpoint did not validate the CZ postal code as expected.',
    {
      displayValue: validPostal?.displayValue,
      isValid: validPostal?.isValid,
      mode: transport.kind,
    },
  );
}

async function findAcceptCandidate(report, transport, preferredResults) {
  for (const result of preferredResults) {
    const candidate = result.matchingSuggestion ?? result.suggestions[0];

    if (candidate !== undefined && sourceForAccept(candidate.source) !== undefined) {
      return {
        requestId: result.body?.requestId,
        scenarioId: result.scenarioId,
        suggestion: candidate,
      };
    }
  }

  const fallback = await runSuggestScenario(report, transport, {
    expect: 'owned-address',
    failSummary: 'Fallback owned sample was not available for accept-event proof.',
    id: 'accept-candidate-owned-sample',
    limit: 1,
    matches: (suggestion) => suggestion?.source?.kind === 'owned-dataset',
    passSummary: 'Fallback owned sample is available for accept-event proof.',
    query: 'vaclavske namesti',
  });
  const candidate = fallback.matchingSuggestion ?? fallback.suggestions[0];

  if (candidate === undefined || sourceForAccept(candidate.source) === undefined) {
    return;
  }

  return {
    requestId: fallback.body?.requestId,
    scenarioId: fallback.scenarioId,
    suggestion: candidate,
  };
}

async function runAcceptMatrix(report, transport, beforeStatus, preferredResults) {
  const candidate = await findAcceptCandidate(report, transport, preferredResults);

  if (candidate === undefined || typeof candidate.requestId !== 'string') {
    fail(
      report,
      'accept-event-post',
      'No suggestion with a trusted source was available for accept-event POST.',
      {
        mode: transport.kind,
      },
    );
    return;
  }

  const source = sourceForAccept(candidate.suggestion.source);

  if (source === undefined) {
    fail(
      report,
      'accept-event-post',
      'Accept candidate did not include the source contract required by POST /v1/accept.',
      {
        mode: transport.kind,
        scenarioId: candidate.scenarioId,
        suggestionId: candidate.suggestion.id,
      },
    );
    return;
  }

  const body = await postJsonScenario(
    report,
    transport,
    '/v1/accept',
    {
      acceptedAt: new Date().toISOString(),
      requestId: candidate.requestId,
      source,
      suggestionId: candidate.suggestion.id,
      tenant: {
        cartId: 'public-demo-proof-cart',
        tenantId: 'public-demo-proof',
      },
    },
    'accept-event-post',
  );

  check(
    report,
    body?.accepted === true,
    'accept-event-post',
    'Accept endpoint records the selected suggestion.',
    'Accept endpoint did not acknowledge the event.',
    {
      mode: transport.kind,
      scenarioId: candidate.scenarioId,
      sourceId: source.id,
      suggestionId: candidate.suggestion.id,
    },
  );

  const afterStatus = await getStatus(report, transport, 'status-after-accept');
  const beforeAcceptTotal = statusAcceptTotal(beforeStatus);
  const afterAcceptTotal = statusAcceptTotal(afterStatus);

  if (beforeAcceptTotal === undefined || afterAcceptTotal === undefined) {
    skip(
      report,
      'accept-event-status-delta',
      'Status response did not expose accept totals for delta proof.',
    );
  } else {
    check(
      report,
      afterAcceptTotal >= beforeAcceptTotal + 1,
      'accept-event-status-delta',
      'Status metrics increased after accept-event POST.',
      'Status metrics did not increase after accept-event POST.',
      {
        afterAcceptTotal,
        beforeAcceptTotal,
        mode: transport.kind,
      },
    );
  }

  return afterStatus;
}

async function runApiMatrix(report, transport) {
  report.target.apiBase = transport.apiBase;
  report.target.mode = transport.kind;

  const beforeStatus = await getStatus(report, transport, 'status-before');
  const beforeProviderEvents = statusProviderEventTotal(beforeStatus);
  const exactResult = await runSuggestScenario(report, transport, {
    expect: 'owned-k-louzi-1258-12',
    id: 'k-louzi-exact-owned-suggestion',
    limit: 5,
    matches: isOwnedKLouzi1258Slash12,
    query: 'K Louži 1258/12',
  });
  const partialResult = await runSuggestScenario(report, transport, {
    expect: 'owned-k-louzi-1258-12',
    id: 'k-louzi-partial-owned-suggestion',
    limit: 5,
    matches: isOwnedKLouzi1258Slash12,
    query: 'K Louzi 1258',
  });
  await runSuggestScenario(report, transport, {
    expect: 'minimum-suggestion-count',
    failSummary: 'Street prefix returned fewer than four K Louzi suggestions.',
    id: 'k-louzi-street-prefix-cluster',
    limit: 5,
    matches: isOwnedKLouziStreetSuggestion,
    minimumCount: 4,
    passSummary: 'Street prefix returned multiple real K Louzi owned suggestions.',
    query: 'K Lou',
  });
  await runSuggestScenario(report, transport, {
    expect: 'empty',
    id: 'weak-query-collapse',
    limit: 5,
    query: 'K L',
  });
  await runSuggestScenario(report, transport, {
    expect: 'empty',
    failSummary: 'Unmatched manual-entry address unexpectedly required a suggestion.',
    id: 'manual-entry-unmatched-address',
    limit: 5,
    passSummary: 'Unmatched manual-entry address can continue without a suggestion.',
    query: 'Manualni neznama 999',
  });
  await runValidationMatrix(report, transport);
  const afterStatus =
    (await runAcceptMatrix(report, transport, beforeStatus, [exactResult, partialResult])) ??
    (await getStatus(report, transport, 'status-after-matrix'));
  const afterProviderEvents = statusProviderEventTotal(afterStatus);

  if (beforeProviderEvents === undefined || afterProviderEvents === undefined) {
    skip(
      report,
      'provider-event-status-delta',
      'Status response did not expose provider-event totals for delta proof.',
    );
    return;
  }

  check(
    report,
    afterProviderEvents === beforeProviderEvents,
    'provider-event-status-delta',
    'Provider-event status total stayed flat during owned demo proof.',
    'Provider-event status total changed during owned demo proof.',
    {
      afterProviderEvents,
      beforeProviderEvents,
      delta: afterProviderEvents - beforeProviderEvents,
      mode: transport.kind,
    },
  );
}

async function runHttpProof(report, args) {
  const baseUrl = normalizeBaseUrl(args.url);
  const root = await fetchRootLocaleRedirect(joinOriginRoute(baseUrl, '/'), args.timeoutMs);
  validateRootLocaleRedirect(report, root);

  const demo = await fetchText(joinOriginRoute(baseUrl, '/sdk/demo.html'), args.timeoutMs);
  validateDemoHtml(report, demo, 'public');

  const sdk = await fetchText(
    joinOriginRoute(baseUrl, '/sdk/techsio-smart-suggest.js'),
    args.timeoutMs,
  );
  validateSdk(report, sdk, 'public');

  const transport = await detectApiBase(report, baseUrl, args);

  if (transport !== undefined) {
    await runApiMatrix(report, transport);
  }
}

function runStaticSourceProof(report) {
  const demoSource = readSource('apps/shell-super-app/sdk/demo.html');
  const sdkSource = readSource('apps/shell-super-app/sdk/techsio-smart-suggest.js');
  const vanillaSource = readRepositorySource('libs/smart-suggest/vanilla/src/vanilla.ts');
  const validationPhoneSource = readRepositorySource(
    'libs/smart-suggest/validation/src/phone-lite.ts',
  );

  report.target.mode = 'static-source';
  check(
    report,
    sourceRendersCheckoutDemo(),
    'static-localized-demo-entry',
    'Source localized route renders the checkout demo.',
    'Source localized route does not render the checkout demo.',
  );
  validateDemoHtml(
    report,
    {
      body: demoSource,
      contentType: 'text/html; charset=utf-8',
      ok: true,
      status: 200,
    },
    'static',
  );
  validateSdk(
    report,
    {
      body: sdkSource,
      contentType: 'text/javascript; charset=utf-8',
      ok: true,
      status: 200,
    },
    'static-public',
  );

  const missingSourceModes = phoneValidationModes.filter(
    (mode) => !validationPhoneSource.includes(mode),
  );
  check(
    report,
    vanillaSource.includes('phoneValidationMode') &&
      vanillaSource.includes('DEFAULT_PHONE_VALIDATION_MODE') &&
      validationPhoneSource.includes('PHONE_VALIDATION_MODES') &&
      missingSourceModes.length === 0,
    'static-vanilla-phone-validation-modes',
    'Vanilla source uses the validation package phone mode contract.',
    'Vanilla or validation source does not expose the full phone validation mode contract.',
    { missingPhoneModes: missingSourceModes },
  );
}

async function runFallbackProof(report) {
  runStaticSourceProof(report);
  const directTransport = await createDirectApiTransport(report);

  if (directTransport !== undefined) {
    try {
      await runApiMatrix(report, directTransport);
    } finally {
      await directTransport.close?.();
    }
  }
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return 0;
  }

  const report = createReport(args);

  try {
    await runHttpProof(report, args);
  } catch (error) {
    const isDefaultLocalTarget = !args.urlWasExplicit && args.url === defaultLocalUrl;

    if (args.requireLive || !isDefaultLocalTarget) {
      fail(report, 'http-target-reachable', 'Demo URL was not reachable.', {
        error: error instanceof Error ? error.message : String(error),
        url: args.url,
      });
    } else {
      skip(
        report,
        'http-target-reachable',
        'Default localhost demo URL was not reachable; running static/direct fallback proof.',
        {
          error: error instanceof Error ? error.message : String(error),
          url: args.url,
        },
      );
      await runFallbackProof(report);
    }
  }

  summarizeReport(report);
  writeReport(report, args.out);
  printReportSummary(report, args.out);

  return report.status === 'fail' ? 1 : 0;
}

main().then(
  (exitCode) => {
    process.exitCode = exitCode;
  },
  (error) => {
    process.stderr.write(
      `[smart-suggest-public-demo-proof] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  },
);

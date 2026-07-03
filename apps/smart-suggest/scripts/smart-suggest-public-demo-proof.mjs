#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultReportPath = '.codex/reports/smart-suggest-public-demo-proof/public-demo-proof.json';
const defaultLocalUrl = 'http://localhost:3020';
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

function validateDemoEntrypoint(report, demo, source) {
  const contentType = demo.contentType ?? '';
  const isHtml = contentType.toLowerCase().includes('text/html') || demo.body.includes('<html');
  const servesDemo =
    htmlHasDemoForm(demo.body) &&
    (demo.body.includes('/sdk/techsio-smart-suggest.js') || htmlHasSdkModuleScript(demo.body));
  const linksCanonicalDemo = demo.body.includes('/sdk/demo.html');
  const redirectsToCanonicalDemo =
    linksCanonicalDemo &&
    (demo.body.includes('http-equiv') || demo.body.includes('window.location.replace'));

  check(
    report,
    demo.ok,
    `${source}-demo-entrypoint-http`,
    'Extensionless demo entrypoint returned HTTP success.',
    'Extensionless demo entrypoint did not return HTTP success.',
    {
      statusCode: demo.status,
    },
  );
  check(
    report,
    isHtml,
    `${source}-demo-entrypoint-html`,
    'Extensionless demo entrypoint is HTML.',
    'Extensionless demo entrypoint was not recognizable HTML.',
    {
      contentType,
    },
  );
  check(
    report,
    servesDemo || redirectsToCanonicalDemo,
    `${source}-demo-entrypoint-target`,
    'Extensionless demo entrypoint exposes the SDK demo.',
    'Extensionless demo entrypoint does not expose the SDK demo.',
    {
      linksCanonicalDemo,
      redirectsToCanonicalDemo,
      servesDemo,
    },
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

function isOwnedJavorovaSuggestion(suggestion) {
  const address = suggestion?.address ?? {};
  const streetText = normalizeText(address.street ?? address.line1 ?? suggestion?.displayLabel);

  return (
    suggestion?.source?.kind === 'owned-dataset' &&
    address.countryCode === 'CZ' &&
    streetText.includes('javorova')
  );
}

function isOwnedPostal101Suggestion(suggestion) {
  return (
    suggestion?.source?.kind === 'owned-dataset' &&
    suggestion?.kind === 'postal' &&
    suggestion?.address?.countryCode === 'CZ' &&
    normalizeText(suggestion?.address?.postalCode ?? suggestion?.displayLabel).includes('101 00')
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
  params.set('countryCode', scenario.countryCode ?? 'CZ');
  params.set('kind', scenario.kind ?? 'address');
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
    expect: 'owned-address',
    failSummary: 'Javo prefix did not return real owned Javorova suggestions.',
    id: 'javo-prefix-owned-suggestion',
    limit: 5,
    matches: isOwnedJavorovaSuggestion,
    passSummary: 'Javo prefix returned real owned Javorova suggestions.',
    query: 'Javo',
  });
  await runSuggestScenario(report, transport, {
    expect: 'owned-address',
    failSummary: 'Javorova diacritic query did not return real owned suggestions.',
    id: 'javorova-diacritic-owned-suggestion',
    limit: 5,
    matches: isOwnedJavorovaSuggestion,
    passSummary: 'Javorova diacritic query returned real owned suggestions.',
    query: 'Javorová',
  });
  await runSuggestScenario(report, transport, {
    expect: 'owned-address',
    failSummary: 'Postal prefix 101 did not return owned postal suggestions.',
    id: 'postal-101-prefix-owned-suggestion',
    kind: 'postal',
    limit: 5,
    matches: isOwnedPostal101Suggestion,
    passSummary: 'Postal prefix 101 returned owned postal suggestions.',
    query: '101',
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

  const demoEntrypoint = await fetchText(joinOriginRoute(baseUrl, '/sdk/demo'), args.timeoutMs);
  validateDemoEntrypoint(report, demoEntrypoint, 'public-extensionless');

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
        'Default localhost demo URL was not reachable; HTTP/browser proof skipped.',
        {
          error: error instanceof Error ? error.message : String(error),
          url: args.url,
        },
      );
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

/* eslint-disable no-console */
import fs from "node:fs";
import process from "node:process";
import { chromium } from "@playwright/test";

const BASE_URL = process.env.HERBATIKA_BASE_URL ?? "http://localhost:3001";
const OUTPUT_PATH =
  process.env.HERBATIKA_AUDIT_OUTPUT ?? "/tmp/fetch-audit-spa.json";
const STEP_IDLE_TIMEOUT_MS = Number.parseInt(
  process.env.HERBATIKA_AUDIT_IDLE_TIMEOUT_MS ?? "7000",
  10,
);
const STEP_IDLE_QUIET_WINDOW_MS = Number.parseInt(
  process.env.HERBATIKA_AUDIT_IDLE_QUIET_MS ?? "450",
  10,
);
const STEP_MIN_SETTLE_MS = Number.parseInt(
  process.env.HERBATIKA_AUDIT_STEP_SETTLE_MS ?? "350",
  10,
);

const networkEvents = [];
let currentStep = "init";
const trackedPendingRequestIds = new Set();
const requestIdByRequest = new WeakMap();
let requestIdSequence = 0;

const toUrl = (input) => {
  try {
    return new URL(input);
  } catch {
    return null;
  }
};

const getTrackedApiKind = (url) => {
  const parsed = toUrl(url);
  if (!parsed) {
    return null;
  }

  const path = parsed.pathname;
  if (parsed.pathname.startsWith("/store/")) {
    return "store";
  }

  if (path === "/api/storefront-search" || path.startsWith("/api/storefront-search/")) {
    return "search";
  }

  return null;
};

const getRequestId = (request) => {
  const existing = requestIdByRequest.get(request);
  if (existing) {
    return existing;
  }

  requestIdSequence += 1;
  requestIdByRequest.set(request, requestIdSequence);
  return requestIdSequence;
};

const requestKey = (url, method = "GET") => {
  const parsed = toUrl(url);
  if (!parsed) {
    return `${method} ${url}`;
  }

  const sortedParams = [...parsed.searchParams.entries()]
    .sort((a, b) => `${a[0]}=${a[1]}`.localeCompare(`${b[0]}=${b[1]}`))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `${method.toUpperCase()} ${parsed.pathname}${sortedParams ? `?${sortedParams}` : ""}`;
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isAbortLikeFailure = (failure) => {
  if (!failure || typeof failure !== "object") {
    return false;
  }

  const message = String(failure.errorText ?? "");
  return (
    message.toLowerCase().includes("aborted") ||
    message.toUpperCase().includes("ERR_ABORTED")
  );
};

const waitForStepSettle = async () => {
  const startedAt = Date.now();
  const minimumSettledAt = startedAt + STEP_MIN_SETTLE_MS;
  let lastBusyAt = startedAt;

  while (Date.now() - startedAt < STEP_IDLE_TIMEOUT_MS) {
    const hasPending = trackedPendingRequestIds.size > 0;
    if (hasPending) {
      lastBusyAt = Date.now();
      await wait(100);
      continue;
    }

    const now = Date.now();
    const afterMinimum = now >= minimumSettledAt;
    const quietLongEnough = now - lastBusyAt >= STEP_IDLE_QUIET_WINDOW_MS;
    if (afterMinimum && quietLongEnough) {
      return {
        timedOut: false,
        settleMs: now - startedAt,
      };
    }

    await wait(100);
  }

  return {
    timedOut: true,
    settleMs: Date.now() - startedAt,
  };
};

const getMonitorSnapshot = async (page) => {
  return page.evaluate(() => {
    const api = window.__HERBATIKA_STOREFRONT_MONITOR__;
    if (!api || typeof api.getSnapshot !== "function") {
      return {
        available: false,
        snapshot: null,
      };
    }
    return {
      available: true,
      snapshot: api.getSnapshot(),
    };
  });
};

const getMonitorDelta = async (page, beforeSnapshot) => {
  return page.evaluate((before) => {
    const api = window.__HERBATIKA_STOREFRONT_MONITOR__;
    if (
      !api ||
      typeof api.getSnapshot !== "function" ||
      typeof api.diffSnapshots !== "function"
    ) {
      return {
        available: false,
        after: null,
        diff: null,
      };
    }

    const after = api.getSnapshot();
    if (!before) {
      return {
        available: true,
        after,
        diff: null,
      };
    }

    return {
      available: true,
      after,
      diff: api.diffSnapshots(before, after),
    };
  }, beforeSnapshot);
};

const runStep = async (page, name, action) => {
  currentStep = name;
  const startIdx = networkEvents.length;
  const before = await getMonitorSnapshot(page);
  const startedAt = Date.now();
  const actionResult = await action();

  const settle = await waitForStepSettle();
  const after = await getMonitorDelta(page, before.snapshot);

  const stepNetworkEvents = networkEvents.slice(startIdx);
  const byKey = {};
  for (const event of stepNetworkEvents) {
    byKey[event.key] = (byKey[event.key] ?? 0) + 1;
  }

  return {
    name,
    durationMs: Date.now() - startedAt,
    result: actionResult,
    events: stepNetworkEvents,
    byKey,
    before,
    after,
    monitorDelta: after.diff,
    settle,
  };
};

const printStepSummary = (step) => {
  console.log(`--- ${step.name}`);
  console.log(
    `settle ${step.settle.settleMs}ms${step.settle.timedOut ? " (timeout)" : ""}`,
  );

  if (step.monitorDelta) {
    console.log(`monitorMode ${step.monitorDelta.mode}`);
    console.log(`network ${JSON.stringify(step.monitorDelta.network)}`);
    console.log(`query ${JSON.stringify(step.monitorDelta.query)}`);
    console.log(`prefetch ${JSON.stringify(step.monitorDelta.prefetch)}`);
  } else {
    console.log("monitorMode unavailable");
  }

  const topRequests = Object.entries(step.byKey)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  for (const [request, count] of topRequests) {
    console.log(`${count}x ${request}`);
  }
};

const assertNoNegativeDelta = (step) => {
  const delta = step.monitorDelta;
  if (!delta || delta.mode !== "delta") {
    return null;
  }

  const sections = ["network", "query", "prefetch"];
  for (const sectionName of sections) {
    const section = delta[sectionName];
    for (const [metric, value] of Object.entries(section)) {
      if (typeof value === "number" && value < 0) {
        return `${sectionName}.${metric} is negative (${value})`;
      }
    }
  }

  return null;
};

const runAudit = async () => {
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    totals: {
      storeResponses: 0,
      searchResponses: 0,
      storeRequestFailed: 0,
      searchRequestFailed: 0,
      storeRequestAborted: 0,
      searchRequestAborted: 0,
      store4xx5xx: 0,
      search4xx5xx: 0,
      consoleWarningsOrErrors: 0,
      stepModeDelta: 0,
      stepModeReset: 0,
      stepModeUnknown: 0,
      stepSettleTimeouts: 0,
    },
    steps: [],
    consoleEvents: [],
    assertions: {
      negativeDeltaFindings: [],
    },
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.HERBATIKA_AUDIT_BROWSER_PATH || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      report.totals.consoleWarningsOrErrors += 1;
      report.consoleEvents.push({
        type,
        text: msg.text(),
        location: msg.location(),
        step: currentStep,
      });
    }
  });

  page.on("request", (request) => {
    const apiKind = getTrackedApiKind(request.url());
    if (!apiKind) {
      return;
    }

    trackedPendingRequestIds.add(getRequestId(request));
  });

  page.on("requestfinished", (request) => {
    const requestId = requestIdByRequest.get(request);
    if (requestId) {
      trackedPendingRequestIds.delete(requestId);
    }
  });

  page.on("response", (response) => {
    const url = response.url();
    const apiKind = getTrackedApiKind(url);
    if (!apiKind) {
      return;
    }

    const req = response.request();
    const status = response.status();
    networkEvents.push({
      type: "response",
      step: currentStep,
      apiKind,
      method: req.method(),
      status,
      url,
      key: requestKey(url, req.method()),
    });
    if (apiKind === "store") {
      report.totals.storeResponses += 1;
    } else {
      report.totals.searchResponses += 1;
    }
    if (status >= 400) {
      if (apiKind === "store") {
        report.totals.store4xx5xx += 1;
      } else {
        report.totals.search4xx5xx += 1;
      }
    }
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    const apiKind = getTrackedApiKind(url);
    if (!apiKind) {
      return;
    }

    const requestId = requestIdByRequest.get(request);
    if (requestId) {
      trackedPendingRequestIds.delete(requestId);
    }

    const failure = request.failure();
    const aborted = isAbortLikeFailure(failure);

    networkEvents.push({
      type: "requestfailed",
      step: currentStep,
      apiKind,
      method: request.method(),
      failure,
      aborted,
      url,
      key: requestKey(url, request.method()),
    });
    if (apiKind === "store") {
      if (aborted) {
        report.totals.storeRequestAborted += 1;
      } else {
        report.totals.storeRequestFailed += 1;
      }
    } else {
      if (aborted) {
        report.totals.searchRequestAborted += 1;
      } else {
        report.totals.searchRequestFailed += 1;
      }
    }
  });

  await page.goto(`${BASE_URL}/`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await wait(2_000);

  report.steps.push(
    await runStep(page, "home_hover_prefetch", async () => {
      await page.locator('a[href^="/p/"]').first().hover();
      return { hovered: true };
    }),
  );

  report.steps.push(
    await runStep(page, "home_to_category_click", async () => {
      await page.locator('a[href="/c/trapi-ma"]').first().click();
      await page.waitForURL("**/c/trapi-ma**", { timeout: 30_000 });
      return { url: page.url() };
    }),
  );

  report.steps.push(
    await runStep(page, "category_hover_prefetch", async () => {
      await page.locator('a[href^="/p/"]').first().hover();
      return { hovered: true };
    }),
  );

  report.steps.push(
    await runStep(page, "category_to_pdp_click", async () => {
      await page.locator('a[href^="/p/"]').first().click();
      await page.waitForURL("**/p/**", { timeout: 30_000 });
      return { url: page.url() };
    }),
  );

  report.steps.push(
    await runStep(page, "pdp_to_home_click", async () => {
      await page.locator('a[href="/"]').first().click();
      await page.waitForURL((url) => url.pathname === "/", { timeout: 30_000 });
      return { url: page.url() };
    }),
  );

  report.steps.push(
    await runStep(page, "home_to_search_submit", async () => {
      const searchInput = page.locator('input[name="q"]').first();
      await searchInput.fill("krem");
      await searchInput.press("Enter");
      await page.waitForURL("**/search**q=krem**", { timeout: 30_000 });
      return { url: page.url() };
    }),
  );

  report.steps.push(
    await runStep(page, "search_to_checkout_direct", async () => {
      await page.goto(`${BASE_URL}/checkout`, {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      return { url: page.url() };
    }),
  );

  for (const step of report.steps) {
    const mode = step.monitorDelta?.mode;
    if (mode === "delta") {
      report.totals.stepModeDelta += 1;
    } else if (mode === "reset") {
      report.totals.stepModeReset += 1;
    } else {
      report.totals.stepModeUnknown += 1;
    }

    const finding = assertNoNegativeDelta(step);
    if (finding) {
      report.assertions.negativeDeltaFindings.push({
        step: step.name,
        finding,
      });
    }

    if (step.settle.timedOut) {
      report.totals.stepSettleTimeouts += 1;
    }
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report.totals, null, 2));
  if (report.assertions.negativeDeltaFindings.length > 0) {
    console.log("negativeDeltaFindings");
    for (const finding of report.assertions.negativeDeltaFindings) {
      console.log(`- ${finding.step}: ${finding.finding}`);
    }
  }
  for (const step of report.steps) {
    printStepSummary(step);
  }

  await browser.close();

  if (report.assertions.negativeDeltaFindings.length > 0) {
    process.exitCode = 1;
  }
};

runAudit().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

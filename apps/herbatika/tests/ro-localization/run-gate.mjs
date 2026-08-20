import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"
import { verifyCutoverReceiptArtifacts } from "./cutover-receipt.mjs"
import {
  assertGlobalReadiness,
  assertNoServerErrors,
  assertPageEvidence,
  assertSeoEvidence,
  normalizeBaseUrl,
  publicUrl,
} from "./gate-core.mjs"
import {
  assertLiveReportIntegrity,
  generateLiveReadiness,
} from "./live-readiness.mjs"

const defaults = {
  backendReadinessReport: process.env.HERBATIKA_BACKEND_READINESS_REPORT,
  demoOmissionLedger: process.env.HERBATIKA_RO_DEMO_OMISSION_LEDGER,
  fixture: fileURLToPath(new URL("./expected.fixture.json", import.meta.url)),
  crawlConcurrency: Number(process.env.HERBATIKA_RO_CRAWL_CONCURRENCY ?? 4),
  crawlDelayMs: Number(process.env.HERBATIKA_RO_CRAWL_DELAY_MS ?? 75),
  cutoverEvidenceDirectory: process.env.HERBATIKA_RO_CUTOVER_EVIDENCE_DIRECTORY,
  cutoverReceipt: process.env.HERBATIKA_RO_CUTOVER_RECEIPT,
  expectedScopePlan: process.env.HERBATIKA_RO_EXPECTED_SCOPE_PLAN,
  liveReportOutput: process.env.HERBATIKA_RO_LIVE_REPORT_OUTPUT,
  proofHmacKey: process.env.HERBATIKA_READINESS_PROOF_HMAC_KEY,
  proofMaxAgeMs: Number(
    process.env.HERBATIKA_READINESS_PROOF_MAX_AGE_MS ?? 900_000
  ),
  readinessMode: process.env.HERBATIKA_RO_READINESS_MODE ?? "production",
  roBaseUrl:
    process.env.HERBATIKA_RO_BASE_URL ??
    "https://test-engine-herbatika-ro-zane.web-revolution.cz",
  skBaseUrl:
    process.env.HERBATIKA_SK_BASE_URL ??
    "https://test-engine-herbatika-zane.web-revolution.cz",
  skBaseline: process.env.HERBATIKA_SK_PUBLICATION_BASELINE,
  timeoutMs: 45_000,
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: explicit CLI option parsing rejects incomplete and unknown release-gate inputs
const parseArguments = (values) => {
  const options = { ...defaults }
  for (let index = 0; index < values.length; index += 1) {
    const rawName = values[index]
    const separator = rawName.indexOf("=")
    const name = separator === -1 ? rawName : rawName.slice(0, separator)
    const inlineValue =
      separator === -1 ? undefined : rawName.slice(separator + 1)
    const value = inlineValue ?? values[index + 1]
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Unknown or incomplete option: ${name}`)
    }
    if (name === "--sk-base-url") {
      options.skBaseUrl = value
    } else if (name === "--ro-base-url") {
      options.roBaseUrl = value
    } else if (name === "--fixture") {
      options.fixture = value
    } else if (name === "--live-report-output") {
      options.liveReportOutput = value
    } else if (name === "--backend-readiness-report") {
      options.backendReadinessReport = value
    } else if (name === "--expected-scope-plan") {
      options.expectedScopePlan = value
    } else if (name === "--cutover-evidence-directory") {
      options.cutoverEvidenceDirectory = value
    } else if (name === "--cutover-receipt") {
      options.cutoverReceipt = value
    } else if (name === "--readiness-mode") {
      options.readinessMode = value
    } else if (name === "--demo-omission-ledger") {
      options.demoOmissionLedger = value
    } else if (name === "--sk-baseline") {
      options.skBaseline = value
    } else if (name === "--crawl-concurrency") {
      options.crawlConcurrency = Number(value)
    } else if (name === "--crawl-delay-ms") {
      options.crawlDelayMs = Number(value)
    } else if (name === "--timeout-ms") {
      options.timeoutMs = Number(value)
    } else if (name === "--proof-max-age-ms") {
      options.proofMaxAgeMs = Number(value)
    } else {
      throw new Error(`Unknown or incomplete option: ${name}`)
    }
    if (inlineValue === undefined) {
      index += 1
    }
  }
  return options
}

const inspectPage = async ({ context, serverErrorSink, timeoutMs, url }) => {
  const page = await context.newPage()
  const recordResponse = (response) => {
    if (
      response.status() >= 500 &&
      response.url().startsWith(new URL(url).origin)
    ) {
      serverErrorSink.push({
        status: response.status(),
        url: response.url(),
      })
    }
  }
  page.on("response", recordResponse)
  try {
    const response = await page.goto(url, {
      timeout: timeoutMs,
      waitUntil: "domcontentloaded",
    })
    await page.locator("body").waitFor({ state: "visible", timeout: timeoutMs })
    await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {
      // Streaming and analytics may keep connections open after the UI is ready.
    })
    const documentEvidence = await page.evaluate(() => {
      const priceCurrencies = []
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: recursive JSON-LD traversal must cover arrays and nested graph objects
      const visitJson = (value) => {
        if (Array.isArray(value)) {
          for (const item of value) {
            visitJson(item)
          }
        } else if (value && typeof value === "object") {
          for (const [key, item] of Object.entries(value)) {
            if (key === "priceCurrency" && typeof item === "string") {
              priceCurrencies.push(item)
            } else {
              visitJson(item)
            }
          }
        }
      }
      for (const script of document.querySelectorAll(
        'script[type="application/ld+json"]'
      )) {
        try {
          visitJson(JSON.parse(script.textContent ?? "null"))
        } catch {
          // Invalid JSON-LD cannot be accepted as currency evidence.
        }
      }
      for (const element of document.querySelectorAll(
        '[itemprop="priceCurrency"], [data-currency], [data-price-currency], meta[property="product:price:currency"]'
      )) {
        const value =
          element.getAttribute("content") ??
          element.getAttribute("data-currency") ??
          element.getAttribute("data-price-currency") ??
          element.textContent
        if (value?.trim()) {
          priceCurrencies.push(value.trim())
        }
      }
      return {
        alternates: Object.fromEntries(
          [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(
            (link) => [link.getAttribute("hreflang")?.toLowerCase(), link.href]
          )
        ),
        canonical:
          document
            .querySelector('link[rel="canonical"]')
            ?.getAttribute("href") ?? "",
        htmlLang: document.documentElement.lang,
        priceCurrencies: [...new Set(priceCurrencies)],
        title: document.title,
      }
    })
    return {
      ...documentEvidence,
      bodyText: await page.locator("body").innerText(),
      status: response?.status() ?? 0,
      url: page.url(),
    }
  } finally {
    page.off("response", recordResponse)
    await page.close()
  }
}

const options = parseArguments(process.argv.slice(2))
const fixtureDocument = JSON.parse(await readFile(options.fixture, "utf8"))
if (fixtureDocument.schemaVersion !== 1) {
  throw new Error(
    `Unsupported fixture schema: ${fixtureDocument.schemaVersion}`
  )
}

const fixture = fixtureDocument.markets
const baseUrls = {
  ro: normalizeBaseUrl(options.roBaseUrl, "RO base URL"),
  sk: normalizeBaseUrl(options.skBaseUrl, "SK base URL"),
}
const observedServerErrors = []
const failures = []
const browser = await chromium.launch({ headless: true })

try {
  try {
    if (
      !(
        options.backendReadinessReport &&
        options.cutoverEvidenceDirectory &&
        options.cutoverReceipt &&
        options.expectedScopePlan &&
        options.skBaseline &&
        options.proofHmacKey
      )
    ) {
      throw new Error(
        "Signed --backend-readiness-report, --cutover-evidence-directory, --cutover-receipt, --expected-scope-plan, pre-deploy --sk-baseline, and HERBATIKA_READINESS_PROOF_HMAC_KEY are required"
      )
    }
    if (
      !["production", "demo"].includes(options.readinessMode) ||
      (options.readinessMode === "demo" && !options.demoOmissionLedger) ||
      (options.readinessMode === "production" && options.demoOmissionLedger)
    ) {
      throw new Error(
        "Use --readiness-mode production without a ledger, or demo with --demo-omission-ledger"
      )
    }
    const [
      backendReadiness,
      cutoverEvidence,
      skBaseline,
      scopePlanArtifact,
      demoOmissionLedgerArtifact,
    ] = await Promise.all([
      readFile(options.backendReadinessReport, "utf8").then(JSON.parse),
      verifyCutoverReceiptArtifacts({
        directoryPath: options.cutoverEvidenceDirectory,
        receiptPath: options.cutoverReceipt,
      }),
      readFile(options.skBaseline, "utf8").then(JSON.parse),
      readFile(options.expectedScopePlan, "utf8").then(JSON.parse),
      options.demoOmissionLedger
        ? readFile(options.demoOmissionLedger, "utf8").then(JSON.parse)
        : undefined,
    ])
    const liveReport = await generateLiveReadiness({
      backendReadiness,
      baseUrls,
      concurrency: options.crawlConcurrency,
      cutoverChainProof: cutoverEvidence.cutoverChainProof,
      demoOmissionLedgerArtifact,
      fixture,
      proofHmacKey: options.proofHmacKey,
      proofMaxAgeMs: options.proofMaxAgeMs,
      readinessMode: options.readinessMode,
      releaseIdentity: cutoverEvidence.receipt.releaseIdentity,
      requestDelayMs: options.crawlDelayMs,
      scopePlanArtifact,
      skBaseline,
    })
    assertLiveReportIntegrity(liveReport, baseUrls)
    assertGlobalReadiness(liveReport)
    if (options.liveReportOutput) {
      await writeFile(
        options.liveReportOutput,
        `${JSON.stringify(liveReport, null, 2)}\n`,
        "utf8"
      )
    }
    console.log(`PASS global.live-readiness ${liveReport.evidenceHash}`)
  } catch (error) {
    failures.push(error)
    console.error(`FAIL ${error.message}`)
  }
  for (const market of ["sk", "ro"]) {
    const context = await browser.newContext({ locale: fixture[market].locale })
    try {
      for (const pageKey of ["root", "category", "product"]) {
        try {
          const pageFixture =
            pageKey === "root" ? { path: "/" } : fixture[market][pageKey]
          const evidence = await inspectPage({
            context,
            serverErrorSink: observedServerErrors,
            timeoutMs: options.timeoutMs,
            url: publicUrl(baseUrls[market], pageFixture.path),
          })
          assertPageEvidence({
            evidence,
            marketFixture: fixture[market],
            pageKey,
          })
          assertSeoEvidence({ baseUrls, evidence, fixture, market, pageKey })
          console.log(`PASS ${market}.${pageKey} ${evidence.url}`)
        } catch (error) {
          const failure = new Error(`${market}.${pageKey}: ${error.message}`, {
            cause: error,
          })
          failures.push(failure)
          console.error(`FAIL ${failure.message}`)
        }
      }
    } finally {
      await context.close()
    }
  }
  try {
    assertNoServerErrors(observedServerErrors)
  } catch (error) {
    failures.push(error)
    console.error(`FAIL ${error.message}`)
  }
  if (failures.length > 0) {
    throw new AggregateError(
      failures,
      `${failures.length} release checks failed`
    )
  }
  console.log("PASS Herbatika SK/RO localization release gate")
} finally {
  await browser.close()
}

import { readFile, writeFile } from "node:fs/promises"
import {
  parseRoCatalogReadinessReportArtifact,
  parseRoCatalogScopePlanArtifact,
} from "../../../medusa-be/src/scripts/ro-catalog-readiness-contract.ts"
import {
  canonicalCutoverValue,
  verifyCutoverReceiptArtifacts,
} from "./cutover-receipt.mjs"
import { signBackendReadinessProof } from "./live-readiness.mjs"

const values = Object.fromEntries(
  process.argv.slice(2).reduce((entries, value, index, arguments_) => {
    if (value.startsWith("--")) {
      entries.push([value.slice(2), arguments_[index + 1]])
    }
    return entries
  }, [])
)
const reportPath = values["backend-readiness-report"]
const scopePlanPath = values["expected-scope-plan"]
const cutoverEvidenceDirectory = values["cutover-evidence-directory"]
const cutoverReceiptPath = values["cutover-receipt"]
const output = values.output
const secret = process.env.HERBATIKA_READINESS_PROOF_HMAC_KEY
if (
  !(
    reportPath &&
    scopePlanPath &&
    cutoverEvidenceDirectory &&
    cutoverReceiptPath &&
    output &&
    secret
  )
) {
  throw new Error(
    "--backend-readiness-report, --expected-scope-plan, --cutover-evidence-directory, --cutover-receipt, --output, and HERBATIKA_READINESS_PROOF_HMAC_KEY are required"
  )
}

const origins = {
  ro: new URL(
    values["ro-base-url"] ??
      process.env.HERBATIKA_RO_BASE_URL ??
      "https://test-engine-herbatika-ro-zane.web-revolution.cz"
  ).origin,
  sk: new URL(
    values["sk-base-url"] ??
      process.env.HERBATIKA_SK_BASE_URL ??
      "https://test-engine-herbatika-zane.web-revolution.cz"
  ).origin,
}
const [
  unparsedReport,
  unparsedScopePlan,
  cutoverEvidence,
  skResponse,
  roResponse,
] = await Promise.all([
  readFile(reportPath, "utf8").then(JSON.parse),
  readFile(scopePlanPath, "utf8").then(JSON.parse),
  verifyCutoverReceiptArtifacts({
    directoryPath: cutoverEvidenceDirectory,
    receiptPath: cutoverReceiptPath,
  }),
  fetch(new URL("/sitemap.xml", origins.sk), { redirect: "follow" }),
  fetch(new URL("/sitemap.xml", origins.ro), { redirect: "follow" }),
])
const report = parseRoCatalogReadinessReportArtifact(unparsedReport)
const scopePlan = parseRoCatalogScopePlanArtifact(unparsedScopePlan)
if (
  canonicalCutoverValue(report.cutoverChainProof) !==
    canonicalCutoverValue(cutoverEvidence.cutoverChainProof) ||
  scopePlan.planHash !== cutoverEvidence.cutoverChainProof.catalogPlanHash ||
  scopePlan.hash !== cutoverEvidence.cutoverChainProof.scopeSha256 ||
  report.scopePlanProof?.matched !== true ||
  report.scopePlanProof.importPlanHash !== scopePlan.planHash ||
  report.scopePlanProof.expectedDataHash !== scopePlan.hash ||
  report.scopePlanProof.observedDataHash !== scopePlan.hash
) {
  throw new Error(
    "Backend readiness report is not bound to expected scope plan"
  )
}
if (skResponse.status !== 200 || roResponse.status !== 200) {
  throw new Error(
    "Both sitemap roots must return HTTP 200 before proof signing"
  )
}
const deployment = {
  ro: {
    hash: roResponse.headers.get("x-zane-dpl-hash") ?? "",
    slot: roResponse.headers.get("x-zane-dpl-slot") ?? "",
  },
  sk: {
    hash: skResponse.headers.get("x-zane-dpl-hash") ?? "",
    slot: skResponse.headers.get("x-zane-dpl-slot") ?? "",
  },
}
const releaseIdentity = cutoverEvidence.receipt.releaseIdentity
if (
  !(deployment.sk.hash && deployment.ro.hash) ||
  deployment.sk.hash !== deployment.ro.hash ||
  !["blue", "green"].includes(deployment.sk.slot) ||
  deployment.ro.slot !== deployment.sk.slot ||
  deployment.sk.hash !== releaseIdentity.storefrontBuildHash ||
  deployment.sk.slot !== releaseIdentity.storefrontSlot ||
  origins.sk !== releaseIdentity.skOrigin ||
  origins.ro !== releaseIdentity.roOrigin
) {
  throw new Error("SK and RO sitemap roots must expose one shared Zane deploy")
}
const proof = signBackendReadinessProof({
  environment: {
    cutoverChainProof: cutoverEvidence.cutoverChainProof,
    databaseFingerprint: releaseIdentity.databaseFingerprint,
    deploymentHash: deployment.sk.hash,
    deploymentSlot: deployment.sk.slot,
    importPlanHash: scopePlan.planHash,
    roOrigin: origins.ro,
    releaseIdentity,
    scopePlanHash: scopePlan.hash,
    skOrigin: origins.sk,
  },
  issuedAt: new Date().toISOString(),
  report,
  secret,
})
await writeFile(output, `${JSON.stringify(proof, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
})
console.log(`Wrote signed backend readiness proof ${proof.reportHash}`)

import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { captureSkPublicationBaseline } from "./live-readiness.mjs"

const values = Object.fromEntries(
  process.argv.slice(2).reduce((entries, value, index, arguments_) => {
    if (value.startsWith("--")) {
      entries.push([value.slice(2), arguments_[index + 1]])
    }
    return entries
  }, [])
)
const output = values.output
if (!output) {
  throw new Error("--output is required for the trusted pre-deploy SK baseline")
}
const fixturePath =
  values.fixture ??
  fileURLToPath(new URL("./expected.fixture.json", import.meta.url))
const fixture = JSON.parse(await readFile(fixturePath, "utf8"))
const baseline = await captureSkPublicationBaseline({
  backendSkBaseline: {
    count: Number(values["backend-sk-count"]),
    sha256: values["backend-sk-hash"],
  },
  baseUrl:
    values["sk-base-url"] ??
    process.env.HERBATIKA_SK_BASE_URL ??
    "https://test-engine-herbatika-zane.web-revolution.cz",
  concurrency: Number(values.concurrency ?? 4),
  fixture: fixture.markets.sk,
  requestDelayMs: Number(values["delay-ms"] ?? 75),
})
await writeFile(output, `${JSON.stringify(baseline, null, 2)}\n`, {
  encoding: "utf8",
  flag: "wx",
})
console.log(`Wrote trusted SK publication baseline ${baseline.publicationHash}`)

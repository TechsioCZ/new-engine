import { runImportFromFile } from "./import-articles"

const [filePath, locale, mediaManifestPath, mode = "dry-run"] =
  process.argv.slice(2)

if (!(filePath && locale && mediaManifestPath)) {
  throw new Error(
    "Usage: <xlsx-file> <locale> <media-manifest> [dry-run|apply]"
  )
}
if (mode !== "dry-run" && mode !== "apply") {
  throw new Error(`Invalid mode: ${mode}`)
}

const result = await runImportFromFile({
  filePath,
  locale,
  status: "published",
  overwrite: true,
  dryRun: mode === "dry-run",
  mediaManifestPath,
})

console.log(JSON.stringify(result))
if (result.skipped > 0 || result.imported !== result.total) {
  process.exitCode = 1
}

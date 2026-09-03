import { runCzechCatalogSourceCli } from "./cli"

runCzechCatalogSourceCli(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${(error as Error).message}\n`)
  process.exitCode = 1
})

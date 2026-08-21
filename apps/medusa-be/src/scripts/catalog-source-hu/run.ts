import { runHungarianCatalogSourceCli } from "./cli"

runHungarianCatalogSourceCli()
  .then((authority) => {
    process.stdout.write(`${JSON.stringify(authority)}\n`)
  })
  .catch((error) => {
    process.stderr.write(`${(error as Error).message}\n`)
    process.exitCode = 1
  })

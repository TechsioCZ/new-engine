import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { buildMarketStaticContentDrafts } from "./generator"
import { DRAFT_MARKETS, type DraftMarket } from "./types"
import { writeMarketStaticContentDraftBuild } from "./writer"

export type DraftGeneratorCliArgs = Readonly<{
  markets: readonly DraftMarket[]
  outputDirectory: string
}>

type ParsedArgument =
  | Readonly<{ kind: "market"; value: DraftMarket }>
  | Readonly<{ kind: "output-directory"; value: string }>

const parseArgument = (
  flag: string | undefined,
  value: string | undefined
): ParsedArgument => {
  if (!value) {
    throw new Error(`incomplete argument: ${flag ?? "<missing>"}`)
  }
  if (flag === "--market") {
    if (!DRAFT_MARKETS.includes(value as DraftMarket)) {
      throw new Error(`unsupported draft market: ${value}`)
    }
    return { kind: "market", value: value as DraftMarket }
  }
  if (flag === "--output-dir") {
    return { kind: "output-directory", value: resolve(value) }
  }
  throw new Error(`unknown argument: ${flag}`)
}

export const parseDraftGeneratorCliArgs = (
  argv: readonly string[]
): DraftGeneratorCliArgs => {
  const markets: DraftMarket[] = []
  let outputDirectory: string | undefined
  for (let index = 0; index < argv.length; index += 1) {
    const argument = parseArgument(argv[index], argv[index + 1])
    if (argument.kind === "market") {
      markets.push(argument.value)
    } else {
      if (outputDirectory) {
        throw new Error("--output-dir may only be provided once")
      }
      outputDirectory = argument.value
    }
    index += 1
  }
  if (!outputDirectory) {
    throw new Error("--output-dir is required")
  }
  const selectedMarkets = markets.length > 0 ? markets : [...DRAFT_MARKETS]
  if (new Set(selectedMarkets).size !== selectedMarkets.length) {
    throw new Error("--market values must be unique")
  }
  return { markets: selectedMarkets, outputDirectory }
}

export const runDraftGeneratorCli = async (argv: readonly string[]) => {
  const args = parseDraftGeneratorCliArgs(argv)
  const results: Readonly<{
    market: DraftMarket
    outputs: readonly string[]
  }>[] = []
  for (const market of args.markets) {
    const build = buildMarketStaticContentDrafts(market)
    const outputs = await writeMarketStaticContentDraftBuild(
      args.outputDirectory,
      build
    )
    results.push({ market, outputs })
  }
  return results
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isEntrypoint) {
  runDraftGeneratorCli(process.argv.slice(2))
    .then((results) => process.stdout.write(`${JSON.stringify(results)}\n`))
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`
      )
      process.exitCode = 1
    })
}

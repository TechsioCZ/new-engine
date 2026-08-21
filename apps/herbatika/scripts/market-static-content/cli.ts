import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { buildMarketStaticContentPlan } from "./plan"
import { writeStaticContentPlanNoClobber } from "./writer"

export type MarketStaticContentCliArgs = Readonly<{
  manifestPaths: readonly string[]
  outputPath: string
}>

const requiredArgumentValue = (
  argv: readonly string[],
  index: number,
  flag: string
): string => {
  const value = argv[index + 1]
  if (!value?.trim()) {
    throw new Error(`incomplete argument: ${flag}`)
  }
  return value
}

export const parseMarketStaticContentCliArgs = (
  argv: readonly string[]
): MarketStaticContentCliArgs => {
  const manifestPaths: string[] = []
  let outputPath: string | undefined
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === "--manifest") {
      manifestPaths.push(
        resolve(requiredArgumentValue(argv, index, "--manifest"))
      )
      index += 1
      continue
    }
    if (flag === "--output") {
      if (outputPath) {
        throw new Error("--output may only be provided once")
      }
      outputPath = resolve(requiredArgumentValue(argv, index, "--output"))
      index += 1
      continue
    }
    throw new Error(`unknown or incomplete argument: ${flag ?? "<missing>"}`)
  }
  if (manifestPaths.length !== 4) {
    throw new Error("exactly four --manifest arguments are required")
  }
  if (new Set(manifestPaths).size !== manifestPaths.length) {
    throw new Error("manifest paths must be unique")
  }
  if (!outputPath) {
    throw new Error("--output is required")
  }
  if (manifestPaths.includes(outputPath)) {
    throw new Error("output path must differ from every input manifest")
  }
  return { manifestPaths, outputPath }
}

export const runMarketStaticContentCli = async (
  argv: readonly string[]
): Promise<
  Readonly<{ outputPath: string; planSha256: string; sha256: string }>
> => {
  const args = parseMarketStaticContentCliArgs(argv)
  const inputs = await Promise.all(
    args.manifestPaths.map(async (path) => ({
      contents: await readFile(path, "utf8"),
      label: path,
    }))
  )
  const build = buildMarketStaticContentPlan(inputs)
  await writeStaticContentPlanNoClobber(args.outputPath, build.canonicalJson)
  return {
    outputPath: args.outputPath,
    planSha256: build.plan.planSha256,
    sha256: build.sha256,
  }
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isEntrypoint) {
  runMarketStaticContentCli(process.argv.slice(2))
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`
      )
      process.exitCode = 1
    })
}

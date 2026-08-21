import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { parseMarketStaticContentPlan } from "../market-static-content/plan-parser"
import { buildSegmentRegistryPublicationArtifacts } from "./build"

type CliArgs = Readonly<{ outputDirectory: string; sourcePlanPath: string }>

const valueAfter = (argv: readonly string[], index: number, flag: string) => {
  const value = argv[index + 1]
  if (!value?.trim()) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

export const parseSegmentRegistryPublicationArgs = (
  argv: readonly string[]
): CliArgs => {
  let outputDirectory: string | undefined
  let sourcePlanPath: string | undefined
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index]
    if (flag === "--plan" && !sourcePlanPath) {
      sourcePlanPath = resolve(valueAfter(argv, index, flag))
      index += 1
      continue
    }
    if (flag === "--output-dir" && !outputDirectory) {
      outputDirectory = resolve(valueAfter(argv, index, flag))
      index += 1
      continue
    }
    throw new Error(`unknown, duplicate, or incomplete argument: ${flag}`)
  }
  if (!(sourcePlanPath && outputDirectory)) {
    throw new Error("--plan and --output-dir are required")
  }
  if (sourcePlanPath === outputDirectory) {
    throw new Error("source plan and output directory must differ")
  }
  return { outputDirectory, sourcePlanPath }
}

export const runSegmentRegistryPublicationCli = async (
  argv: readonly string[]
) => {
  const args = parseSegmentRegistryPublicationArgs(argv)
  const contents = await readFile(args.sourcePlanPath, "utf8")
  const parsed = parseMarketStaticContentPlan(contents, args.sourcePlanPath)
  const builds = buildSegmentRegistryPublicationArtifacts(
    parsed,
    args.sourcePlanPath
  )
  const parent = dirname(args.outputDirectory)
  await mkdir(parent, { recursive: true, mode: 0o700 })
  const temporary = await mkdtemp(
    join(parent, `.${basename(args.outputDirectory)}-`)
  )
  try {
    await Promise.all(
      builds.map((build) =>
        writeFile(
          join(temporary, `${build.market}.json`),
          build.canonicalJson,
          { encoding: "utf8", flag: "wx", mode: 0o600 }
        )
      )
    )
    await rename(temporary, args.outputDirectory)
  } catch (error) {
    await rm(temporary, { force: true, recursive: true })
    throw error
  }
  return builds.map(({ market, ref, sha256 }) => ({ market, ref, sha256 }))
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])

if (isEntrypoint) {
  runSegmentRegistryPublicationCli(process.argv.slice(2))
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error: unknown) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`
      )
      process.exitCode = 1
    })
}

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import type { TaxonomyApproval } from "../../src/lib/url-registry/population/manifest-contracts"
import {
  assemblePopulationManifest,
  writePopulationManifestOutput,
} from "./population-manifest-assembler"
import { fetchAllPopulationSourceExports } from "./population-manifest-source-client"
import { PopulationSourceExportError } from "./population-manifest-source-contracts"

export const POPULATION_SOURCE_TOKEN_ENV = "HERBATIKA_POPULATION_SOURCE_TOKEN"

export type PopulationManifestCliOptions = Readonly<{
  generatedAt: string
  outputPath: string
  sourceBaseUrl: string
  taxonomyApprovalPath: string
}>

const usage = () =>
  [
    "Usage:",
    "  tsx tests/ro-localization/population-manifest-cli.ts \\",
    "    --source-base-url https://population-export.internal \\",
    "    --taxonomy-approval /absolute/path/to/taxonomy-approval.json \\",
    "    --generated-at 2026-08-20T18:00:00.000Z \\",
    "    --output /absolute/path/to/population-manifest.json",
    "",
    `Reads the authenticated bearer token from ${POPULATION_SOURCE_TOKEN_ENV}.`,
    "Never pass the token as a CLI argument; it is never logged.",
    "The output path must not already exist; it is written privately (0600).",
  ].join("\n")

const requiredOptionValue = (
  argv: readonly string[],
  index: number,
  argument: string
): string => {
  const value = argv[index + 1]
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${argument}`)
  }
  return value
}

export const parsePopulationManifestCliOptions = (
  argv: readonly string[]
): PopulationManifestCliOptions => {
  let generatedAt: string | undefined
  let outputPath: string | undefined
  let sourceBaseUrl: string | undefined
  let taxonomyApprovalPath: string | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    switch (argument) {
      case "--":
        break
      case "--source-base-url":
        sourceBaseUrl = requiredOptionValue(argv, index, argument)
        index += 1
        break
      case "--taxonomy-approval":
        taxonomyApprovalPath = resolve(
          requiredOptionValue(argv, index, argument)
        )
        index += 1
        break
      case "--output":
        outputPath = resolve(requiredOptionValue(argv, index, argument))
        index += 1
        break
      case "--generated-at":
        generatedAt = requiredOptionValue(argv, index, argument)
        index += 1
        break
      case "--help":
        process.stdout.write(`${usage()}\n`)
        process.exit(0)
        break
      default:
        throw new Error(
          `Unknown or incomplete argument: ${argument ?? "<missing>"}`
        )
    }
  }
  if (!sourceBaseUrl) {
    throw new Error("--source-base-url is required")
  }
  if (!taxonomyApprovalPath) {
    throw new Error("--taxonomy-approval is required")
  }
  if (!outputPath) {
    throw new Error("--output is required")
  }
  if (!generatedAt) {
    throw new Error("--generated-at is required")
  }
  return { generatedAt, outputPath, sourceBaseUrl, taxonomyApprovalPath }
}

const readSourceToken = (env: NodeJS.ProcessEnv): string => {
  const token = env[POPULATION_SOURCE_TOKEN_ENV]
  if (!token) {
    throw new Error(`${POPULATION_SOURCE_TOKEN_ENV} must be set`)
  }
  return token
}

/**
 * Assembles and privately writes the authoritative four-market URLR
 * PopulationManifest from live authenticated population-source exports.
 * Only issues GET requests, never mutates any live system, and never
 * logs the bearer token (it flows only into the Authorization header).
 */
export const runPopulationManifestAssemblerCli = async (
  argv: readonly string[] = process.argv.slice(2),
  env: NodeJS.ProcessEnv = process.env
): Promise<void> => {
  const options = parsePopulationManifestCliOptions(argv)
  const token = readSourceToken(env)
  const taxonomyApproval = JSON.parse(
    await readFile(options.taxonomyApprovalPath, "utf8")
  ) as TaxonomyApproval
  const groups = await fetchAllPopulationSourceExports({
    baseUrl: options.sourceBaseUrl,
    token,
  })
  const assembled = assemblePopulationManifest({
    generatedAt: options.generatedAt,
    groups,
    taxonomyApproval,
  })
  await writePopulationManifestOutput(options.outputPath, assembled.manifest)
  process.stdout.write(
    `${JSON.stringify(
      {
        manifestHash: assembled.manifestHash,
        roPublicationScope: assembled.roPublicationScope,
      },
      null,
      2
    )}\n`
  )
}

const entrypoint = process.argv[1]
const isEntrypoint =
  entrypoint !== undefined &&
  pathToFileURL(resolve(entrypoint)).href ===
    pathToFileURL(fileURLToPath(import.meta.url)).href

if (isEntrypoint) {
  runPopulationManifestAssemblerCli().catch((error: unknown) => {
    const details: Record<string, unknown> = {}
    if (error instanceof PopulationSourceExportError) {
      details.sourceError = error.message
    }
    process.stderr.write(
      `${JSON.stringify(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unknown population manifest assembly failure",
          ...details,
        },
        null,
        2
      )}\n`
    )
    process.exitCode = 1
  })
}

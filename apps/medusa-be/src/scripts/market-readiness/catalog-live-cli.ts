import { readFile } from "node:fs/promises"
import type {
  ExecArgs,
  ITranslationModuleService,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { STOREFRONT_URL_ASSIGNMENT_MODULE } from "../../modules/storefront-url-assignment"
import type StorefrontUrlAssignmentModuleService from "../../modules/storefront-url-assignment/service"
import {
  type FourMarketCatalogLiveReader,
  parseFourMarketCatalogLiveCliOptions,
  runFourMarketCatalogLiveCollection,
  writeFourMarketCatalogLiveArtifact,
} from "./catalog-live"

const PAGE_SIZE = 500

type QueryService = Readonly<{
  graph: <Value>(
    request: Readonly<{
      entity: string
      fields: readonly string[]
      filters?: Readonly<Record<string, unknown>>
      pagination: Readonly<{ skip: number; take: number }>
    }>
  ) => Promise<Readonly<{ data?: Value[] }>>
}>

const readAllGraphRows = async (
  query: QueryService,
  request: Parameters<FourMarketCatalogLiveReader["listGraphRows"]>[0]
): Promise<readonly unknown[]> => {
  const rows: unknown[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const { data = [] } = await query.graph<unknown>({
      ...request,
      pagination: { skip, take: PAGE_SIZE },
    })
    rows.push(...data)
    if (data.length < PAGE_SIZE) {
      return rows
    }
  }
}

const readAllTranslations = async (
  service: ITranslationModuleService,
  request: Parameters<FourMarketCatalogLiveReader["listTranslations"]>[0]
): Promise<readonly unknown[]> => {
  const rows: unknown[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listTranslations(
      { locale_code: request.localeCode, reference: request.reference },
      { skip, take: PAGE_SIZE }
    )
    rows.push(...page)
    if (page.length < PAGE_SIZE) {
      return rows
    }
  }
}

const readAllAssignments = async (
  service: StorefrontUrlAssignmentModuleService
): Promise<readonly unknown[]> => {
  const rows: unknown[] = []
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await service.listStorefrontUrlAssignments(
      {},
      { skip, take: PAGE_SIZE }
    )
    rows.push(...page)
    if (page.length < PAGE_SIZE) {
      return rows
    }
  }
}

export const createFourMarketCatalogLiveReader = (
  container: ExecArgs["container"]
): FourMarketCatalogLiveReader => {
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const translationService = container.resolve<ITranslationModuleService>(
    Modules.TRANSLATION
  )
  const assignmentService =
    container.resolve<StorefrontUrlAssignmentModuleService>(
      STOREFRONT_URL_ASSIGNMENT_MODULE
    )
  return {
    listAssignments: () => readAllAssignments(assignmentService),
    listGraphRows: (request) => readAllGraphRows(query, request),
    listTranslations: (request) =>
      readAllTranslations(translationService, request),
  }
}

export default async function collectFourMarketCatalogLiveReadiness({
  args,
  container,
}: ExecArgs) {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const options = parseFourMarketCatalogLiveCliOptions(args)
  const { buildRoDemoDatabaseInstanceFingerprint } = await import(
    "../ro-demo-commerce/runtime.js"
  )
  logger.info("[four-market catalog] starting read-only live collection")
  const artifact = await runFourMarketCatalogLiveCollection(options, {
    buildDatabaseInstanceFingerprint: buildRoDemoDatabaseInstanceFingerprint,
    environment: process.env,
    now: () => new Date(),
    readTextFile: (path) => readFile(path, "utf8"),
    reader: createFourMarketCatalogLiveReader(container),
    writeArtifact: writeFourMarketCatalogLiveArtifact,
  })
  if (!artifact.audit.ready) {
    throw new Error(
      `FOUR_MARKET_CATALOG_NOT_READY: ${artifact.audit.issues
        .map((issue) => issue.code)
        .join(",")}`
    )
  }
  logger.info(`[four-market catalog] READY artifact=${options.outputPath}`)
  return artifact
}

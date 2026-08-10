import type { ExecArgs, Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"

interface ApiKeyFilters {
  token?: string | undefined
  type: "publishable"
}

interface ApiKeyQuery {
  entity: "api_key"
  fields: string[]
  filters: ApiKeyFilters
  pagination: { skip: number; take: number }
}

interface ProductSalesChannelQuery {
  entity: "product_sales_channel"
  fields: string[]
  filters: { sales_channel_id: string[] }
}

interface ProductGraphQuery {
  entity: "product"
  fields: string[]
  filters: { id: string[]; status: "published" }
  pagination: { skip: number; take: number }
}

interface ProductIndexQuery {
  entity: "product"
  fields: string[]
  filters: {
    sales_channels: { id: string[] }
    status: "published"
  }
  pagination: { skip: number; take: number }
}

type GraphQuery = ApiKeyQuery | ProductSalesChannelQuery | ProductGraphQuery

interface QueryService {
  graph: (config: GraphQuery) => Promise<unknown>
  index: (config: ProductIndexQuery) => Promise<unknown>
}

interface PgConnection {
  raw: (sql: string, bindings?: unknown[]) => Promise<unknown>
}

interface SnapshotContext {
  label: string
  logger: Logger
  pg: PgConnection
  query: QueryService
  salesChannelIds: string[]
  take: number
}

const apiKeyQueryResultSchema = z.object({
  data: z
    .array(
      z.object({
        id: z.string().optional(),
        revoked_at: z.union([z.string(), z.date()]).nullable().optional(),
        sales_channels_link: z
          .array(z.object({ sales_channel_id: z.string().optional() }))
          .optional(),
        token: z.string().optional(),
      }),
    )
    .optional(),
})

const countValueSchema = z.union([z.number(), z.string()])
const exactCountResultSchema = z.object({
  rows: z
    .array(
      z.object({
        product_sales_channel_products: countValueSchema.optional(),
        product_sales_channel_rows: countValueSchema.optional(),
        published_products: countValueSchema.optional(),
      }),
    )
    .optional(),
})

const indexQueryResultSchema = z.object({
  data: z.array(z.object({ id: z.string().optional() })).optional(),
  metadata: z
    .object({
      estimate_count: z.number().optional(),
      skip: z.number().optional(),
      take: z.number().optional(),
    })
    .optional(),
})

const productLinkQueryResultSchema = z.object({
  data: z.array(z.object({ product_id: z.string().optional() })).optional(),
})

const productGraphQueryResultSchema = z.object({
  data: z.array(z.object({ id: z.string().optional() })).optional(),
  metadata: z
    .object({
      count: z.number().optional(),
      skip: z.number().optional(),
      take: z.number().optional(),
    })
    .optional(),
})

type ApiKeyQueryResult = z.infer<typeof apiKeyQueryResultSchema>
type ExactCountResult = z.infer<typeof exactCountResultSchema>
type IndexQueryResult = z.infer<typeof indexQueryResultSchema>
type ProductLinkQueryResult = z.infer<typeof productLinkQueryResultSchema>
type ProductGraphQueryResult = z.infer<typeof productGraphQueryResultSchema>

const parseBoundaryResult = <Schema extends z.ZodType>(
  value: unknown,
  schema: Schema,
  description: string,
): z.infer<Schema> => {
  const parsed = schema.safeParse(value)
  if (!parsed.success) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${description} returned invalid data`,
    )
  }
  return parsed.data
}

const getCountValue = (value: number | string | undefined): number => {
  if (typeof value === "number") {
    return value
  }
  if (value !== undefined) {
    return Math.trunc(Number(value))
  }
  return 0
}

const resolvePublishableKey = async (query: QueryService) => {
  const explicitToken = process.env["PUBLISHABLE_KEY"]?.trim()
  const filters: ApiKeyFilters = {
    type: "publishable",
  }

  if (explicitToken !== undefined && explicitToken.length > 0) {
    filters.token = explicitToken
  }

  const result: ApiKeyQueryResult = parseBoundaryResult(
    await query.graph({
      entity: "api_key",
      fields: [
        "id",
        "token",
        "revoked_at",
        "sales_channels_link.sales_channel_id",
      ],
      filters,
      pagination: {
        skip: 0,
        take: 50,
      },
    }),
    apiKeyQueryResultSchema,
    "Publishable API key query",
  )

  const now = new Date()
  const apiKey = (result.data ?? []).find((candidate) => {
    const revokedAt =
      candidate.revoked_at === undefined || candidate.revoked_at === null
        ? undefined
        : new Date(candidate.revoked_at)

    return (
      candidate.token !== undefined &&
      (revokedAt === undefined || revokedAt > now) &&
      (candidate.sales_channels_link ?? []).some(
        (link) => link.sales_channel_id !== undefined,
      )
    )
  })

  const token = apiKey?.token
  const salesChannelIds = (apiKey?.sales_channels_link ?? [])
    .map((link) => link.sales_channel_id)
    .filter((id): id is string => typeof id === "string")

  if (
    token === undefined ||
    token.length === 0 ||
    salesChannelIds.length === 0
  ) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "No publishable API key with sales channels found",
    )
  }

  return {
    salesChannelIds,
    token,
  }
}

const getExactCounts = async (pg: PgConnection, salesChannelIds: string[]) => {
  const result: ExactCountResult = parseBoundaryResult(
    await pg.raw(
      `
        select
          count(distinct p.id)::int as published_products,
          count(psc.product_id)::int as product_sales_channel_rows,
          count(distinct psc.product_id)::int as product_sales_channel_products
        from product p
        join product_sales_channel psc on psc.product_id = p.id
        where p.status = 'published'
          and p.deleted_at is null
          and psc.sales_channel_id = any(?::text[])
      `,
      [salesChannelIds],
    ),
    exactCountResultSchema,
    "Exact product count query",
  )
  const [row] = result.rows ?? []

  return {
    productSalesChannelProducts: getCountValue(
      row?.product_sales_channel_products,
    ),
    productSalesChannelRows: getCountValue(row?.product_sales_channel_rows),
    publishedProducts: getCountValue(row?.published_products),
  }
}

const getIndexCounts = async (
  query: QueryService,
  salesChannelIds: string[],
  take: number,
) => {
  const result: IndexQueryResult = parseBoundaryResult(
    await query.index({
      entity: "product",
      fields: ["id", "handle"],
      filters: {
        sales_channels: {
          id: salesChannelIds,
        },
        status: "published",
      },
      pagination: {
        skip: 0,
        take,
      },
    }),
    indexQueryResultSchema,
    "Product index query",
  )

  const productIds = new Set(
    (result.data ?? [])
      .map((product) => product.id)
      .filter((id): id is string => typeof id === "string"),
  )

  return {
    estimateCount: result.metadata?.estimate_count ?? null,
    returnedProducts: result.data?.length ?? 0,
    uniqueReturnedProducts: productIds.size,
  }
}

const getGraphCounts = async (
  query: QueryService,
  salesChannelIds: string[],
  take: number,
) => {
  const linkResult: ProductLinkQueryResult = parseBoundaryResult(
    await query.graph({
      entity: "product_sales_channel",
      fields: ["product_id"],
      filters: {
        sales_channel_id: salesChannelIds,
      },
    }),
    productLinkQueryResultSchema,
    "Product sales channel link query",
  )
  const linkedProductIds = (linkResult.data ?? [])
    .map((link) => link.product_id)
    .filter((id): id is string => typeof id === "string")

  const result: ProductGraphQueryResult = parseBoundaryResult(
    await query.graph({
      entity: "product",
      fields: ["id", "handle"],
      filters: {
        id: linkedProductIds,
        status: "published",
      },
      pagination: {
        skip: 0,
        take,
      },
    }),
    productGraphQueryResultSchema,
    "Product graph query",
  )

  const productIds = new Set(
    (result.data ?? [])
      .map((product) => product.id)
      .filter((id): id is string => typeof id === "string"),
  )

  return {
    count: result.metadata?.count ?? null,
    returnedProducts: result.data?.length ?? 0,
    uniqueReturnedProducts: productIds.size,
  }
}

const logSnapshot = async ({
  label,
  logger,
  pg,
  query,
  salesChannelIds,
  take,
}: SnapshotContext) => {
  const [exactCounts, indexCounts, graphCounts] = await Promise.all([
    getExactCounts(pg, salesChannelIds),
    getIndexCounts(query, salesChannelIds, take),
    getGraphCounts(query, salesChannelIds, take),
  ])

  logger.info(`[Product count debug] ${label}`)
  logger.info(
    `[Product count debug] exact published products: ${exactCounts.publishedProducts}`,
  )
  logger.info(
    `[Product count debug] product_sales_channel rows/products: ${exactCounts.productSalesChannelRows}/${exactCounts.productSalesChannelProducts}`,
  )
  logger.info(
    `[Product count debug] query.index returned/unique/estimate: ${indexCounts.returnedProducts}/${indexCounts.uniqueReturnedProducts}/${indexCounts.estimateCount}`,
  )
  logger.info(
    `[Product count debug] query.graph returned/unique/count: ${graphCounts.returnedProducts}/${graphCounts.uniqueReturnedProducts}/${graphCounts.count}`,
  )
}

const debugProductCount = async ({ container }: ExecArgs) => {
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  const pg = container.resolve<PgConnection>(
    ContainerRegistrationKeys.PG_CONNECTION,
  )
  const query = container.resolve<QueryService>(ContainerRegistrationKeys.QUERY)
  const runAnalyze = process.env["RUN_ANALYZE"] === "1"
  const take = Math.trunc(Number(process.env["PRODUCT_COUNT_TAKE"] ?? "1500"))

  const { token, salesChannelIds } = await resolvePublishableKey(query)
  logger.info(`[Product count debug] publishable key: ${token}`)
  logger.info(
    `[Product count debug] sales channels: ${salesChannelIds.join(", ")}`,
  )

  await logSnapshot({
    label: "before ANALYZE",
    logger,
    pg,
    query,
    salesChannelIds,
    take,
  })

  if (!runAnalyze) {
    logger.info(
      "[Product count debug] RUN_ANALYZE is not set; skipping ANALYZE",
    )
    return
  }

  logger.info("[Product count debug] running ANALYZE")
  await pg.raw("ANALYZE")
  await logSnapshot({
    label: "after ANALYZE",
    logger,
    pg,
    query,
    salesChannelIds,
    take,
  })
}

export default debugProductCount

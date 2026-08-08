import type { ExecArgs, Logger } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

interface QueryService {
  graph: (config: {
    entity: string
    fields: string[]
    filters?: Record<string, unknown>
    pagination?: { skip: number; take: number }
  }) => Promise<{
    data?: {
      id?: string
      token?: string
      revoked_at?: string | Date | null
      sales_channels_link?: { sales_channel_id?: string }[]
      product_id?: string
    }[]
    metadata?: {
      count?: number
      skip?: number
      take?: number
    }
  }>
  index: (config: {
    entity: string
    fields: string[]
    filters: Record<string, unknown>
    pagination: { skip: number; take: number }
  }) => Promise<{
    data?: { id?: string }[]
    metadata?: {
      estimate_count?: number
      skip?: number
      take?: number
    }
  }>
}

interface PgConnection {
  raw: (
    sql: string,
    bindings?: unknown[],
  ) => Promise<{ rows?: Record<string, unknown>[] }>
}

interface SnapshotContext {
  label: string
  logger: Logger
  pg: PgConnection
  query: QueryService
  salesChannelIds: string[]
  take: number
}

const toRows = (result: { rows?: Record<string, unknown>[] }) =>
  result.rows ?? []

const getFirstNumber = (
  row: Record<string, unknown> | undefined,
  key: string,
): number => {
  const value = row?.[key]
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    return Math.trunc(Number(value))
  }
  return 0
}

const resolvePublishableKey = async (query: QueryService) => {
  const explicitToken = process.env["PUBLISHABLE_KEY"]?.trim()
  const filters: Record<string, unknown> = {
    type: "publishable",
  }

  if (explicitToken !== undefined && explicitToken.length > 0) {
    filters["token"] = explicitToken
  }

  const result = await query.graph({
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
  })

  const now = new Date()
  const apiKey = (result.data ?? []).find((candidate) => {
    const revokedAt =
      candidate.revoked_at === undefined || candidate.revoked_at === null
        ? undefined
        : new Date(candidate.revoked_at)

    return (
      typeof candidate.token === "string" &&
      (revokedAt === undefined || revokedAt > now) &&
      (candidate.sales_channels_link ?? []).some(
        (link) => typeof link.sales_channel_id === "string",
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
  const result = await pg.raw(
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
  )

  const [row] = toRows(result)

  return {
    productSalesChannelProducts: getFirstNumber(
      row,
      "product_sales_channel_products",
    ),
    productSalesChannelRows: getFirstNumber(row, "product_sales_channel_rows"),
    publishedProducts: getFirstNumber(row, "published_products"),
  }
}

const getIndexCounts = async (
  query: QueryService,
  salesChannelIds: string[],
  take: number,
) => {
  const result = await query.index({
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
  })

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
  const linkResult = await query.graph({
    entity: "product_sales_channel",
    fields: ["product_id"],
    filters: {
      sales_channel_id: salesChannelIds,
    },
  })
  const linkedProductIds = (linkResult.data ?? [])
    .map((link) => link.product_id)
    .filter((id): id is string => typeof id === "string")

  const result = await query.graph({
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
  })

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

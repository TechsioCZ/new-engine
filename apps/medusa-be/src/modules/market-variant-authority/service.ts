import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  InjectTransactionManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import {
  canonicalizeMarketVariantAuthorityProvenance,
  type MarketVariantAuthorityEnvelopeInput,
  type MarketVariantAuthorityRecord,
  type NormalizedMarketVariantAuthorityEntry,
  normalizeMarketVariantAuthorityEnvelope,
  type ResolveExactMarketVariantAuthorityInput,
  resolveExactMarketVariantAuthority as resolveExactAuthority,
} from "./contracts"
import MarketVariantAuthority from "./models/market-variant-authority"

export type RetireMarketVariantAuthorityInput = {
  identities: Array<{ productId: string; variantId: string }>
  marketCode: string
}

const lockMarketAuthority = async (
  marketCode: string,
  sharedContext: Context<SqlEntityManager>
) => {
  const manager = sharedContext.transactionManager
  if (!manager) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "Market variant authority mutation requires an active transaction"
    )
  }
  await manager.execute(
    "select pg_advisory_xact_lock(hashtextextended(?, 0))",
    [`market-variant-authority:${marketCode}`]
  )
}

const activeRecordsByIdentity = (records: MarketVariantAuthorityRecord[]) => {
  const result = new Map<string, MarketVariantAuthorityRecord>()
  for (const record of records) {
    const key = `${record.product_id}\u0000${record.variant_id}`
    if (result.has(key)) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Duplicate current market variant authority for ${record.market_code}/${record.product_id}/${record.variant_id}`
      )
    }
    result.set(key, record)
  }
  return result
}

const canonicalProvenance = (value: Record<string, unknown>) =>
  JSON.stringify(canonicalizeMarketVariantAuthorityProvenance(value))

const exactAuthoritySetMatches = (
  current: MarketVariantAuthorityRecord[],
  desired: NormalizedMarketVariantAuthorityEntry[]
) => {
  if (current.length !== desired.length) {
    return false
  }
  const currentByIdentity = activeRecordsByIdentity(current)
  return desired.every((entry) => {
    const existing = currentByIdentity.get(
      `${entry.product_id}\u0000${entry.variant_id}`
    )
    return (
      existing?.market_code === entry.market_code &&
      existing.availability === entry.availability &&
      existing.authority_sha256 === entry.authority_sha256 &&
      existing.source_version === entry.source_version &&
      canonicalProvenance(existing.approval_provenance) ===
        canonicalProvenance(entry.approval_provenance) &&
      canonicalProvenance(existing.source_provenance) ===
        canonicalProvenance(entry.source_provenance)
    )
  })
}

const MarketVariantAuthorityBaseService = MedusaService({
  MarketVariantAuthority,
})

type MarketVariantAuthorityBaseServiceInstance = InstanceType<
  typeof MarketVariantAuthorityBaseService
>

const rawMutationRejected = (): never => {
  throw new MedusaError(
    MedusaError.Types.NOT_ALLOWED,
    "Market variant authority rows can only be mutated through the authority facade"
  )
}

export class MarketVariantAuthorityModuleService extends MarketVariantAuthorityBaseService {
  private readonly createMarketVariantAuthorityRows_: MarketVariantAuthorityBaseServiceInstance["createMarketVariantAuthorities"]
  private readonly updateMarketVariantAuthorityRows_: MarketVariantAuthorityBaseServiceInstance["updateMarketVariantAuthorities"]
  private readonly softDeleteMarketVariantAuthorityRows_: MarketVariantAuthorityBaseServiceInstance["softDeleteMarketVariantAuthorities"]

  constructor(
    ...args: ConstructorParameters<typeof MarketVariantAuthorityBaseService>
  ) {
    super(...args)
    this.createMarketVariantAuthorityRows_ =
      this.createMarketVariantAuthorities.bind(this)
    this.updateMarketVariantAuthorityRows_ =
      this.updateMarketVariantAuthorities.bind(this)
    this.softDeleteMarketVariantAuthorityRows_ =
      this.softDeleteMarketVariantAuthorities.bind(this)

    const rejectedMutation = async () => rawMutationRejected()
    Object.defineProperties(this, {
      createMarketVariantAuthorities: {
        configurable: false,
        value: rejectedMutation,
        writable: false,
      },
      deleteMarketVariantAuthorities: {
        configurable: false,
        value: rejectedMutation,
        writable: false,
      },
      restoreMarketVariantAuthorities: {
        configurable: false,
        value: rejectedMutation,
        writable: false,
      },
      softDeleteMarketVariantAuthorities: {
        configurable: false,
        value: rejectedMutation,
        writable: false,
      },
      updateMarketVariantAuthorities: {
        configurable: false,
        value: rejectedMutation,
        writable: false,
      },
    })
  }

  @InjectManager()
  async replaceMarketVariantAuthorities(
    input: MarketVariantAuthorityEnvelopeInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    const normalized = normalizeMarketVariantAuthorityEnvelope(input)
    return await this.replaceMarketVariantAuthorities_(
      normalized,
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async replaceMarketVariantAuthorities_(
    input: ReturnType<typeof normalizeMarketVariantAuthorityEnvelope>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    await lockMarketAuthority(input.marketCode, sharedContext)
    const current = (await this.listMarketVariantAuthorities(
      { market_code: input.marketCode },
      {},
      sharedContext
    )) as MarketVariantAuthorityRecord[]
    activeRecordsByIdentity(current)

    if (exactAuthoritySetMatches(current, input.entries)) {
      return current
    }

    const currentIds = current.flatMap((record) =>
      record.id ? [record.id] : []
    )
    if (currentIds.length !== current.length) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Current market variant authority row is missing its persistence id"
      )
    }
    if (currentIds.length) {
      await this.softDeleteMarketVariantAuthorityRows_(
        currentIds,
        {},
        sharedContext
      )
    }
    if (!input.entries.length) {
      return []
    }
    return await this.createMarketVariantAuthorityRows_(
      input.entries,
      sharedContext
    )
  }

  @InjectManager()
  async upsertMarketVariantAuthorities(
    input: MarketVariantAuthorityEnvelopeInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    const normalized = normalizeMarketVariantAuthorityEnvelope(input)
    return await this.upsertMarketVariantAuthorities_(normalized, sharedContext)
  }

  @InjectTransactionManager()
  protected async upsertMarketVariantAuthorities_(
    input: ReturnType<typeof normalizeMarketVariantAuthorityEnvelope>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    await lockMarketAuthority(input.marketCode, sharedContext)
    if (!input.entries.length) {
      return []
    }
    const productIds = [
      ...new Set(input.entries.map((entry) => entry.product_id)),
    ]
    const current = (await this.listMarketVariantAuthorities(
      {
        market_code: input.marketCode,
        product_id: { $in: productIds },
      },
      {},
      sharedContext
    )) as MarketVariantAuthorityRecord[]
    const currentByIdentity = activeRecordsByIdentity(current)
    const requestedIdentities = new Set(
      input.entries.map(
        (entry) => `${entry.product_id}\u0000${entry.variant_id}`
      )
    )
    const omittedCurrent = current.find(
      (record) =>
        !requestedIdentities.has(
          `${record.product_id}\u0000${record.variant_id}`
        )
    )
    if (omittedCurrent) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Market variant authority upsert must include every current variant for touched product ${omittedCurrent.product_id}`
      )
    }
    const create: NormalizedMarketVariantAuthorityEntry[] = []
    const update: Array<
      NormalizedMarketVariantAuthorityEntry & { id: string }
    > = []

    for (const entry of input.entries) {
      const existing = currentByIdentity.get(
        `${entry.product_id}\u0000${entry.variant_id}`
      )
      if (existing?.id) {
        update.push({ id: existing.id, ...entry })
      } else {
        create.push(entry)
      }
    }

    const updated = update.length
      ? await this.updateMarketVariantAuthorityRows_(update, sharedContext)
      : []
    const created = create.length
      ? await this.createMarketVariantAuthorityRows_(create, sharedContext)
      : []
    return [...updated, ...created]
  }

  @InjectManager()
  async retireMarketVariantAuthorities(
    input: RetireMarketVariantAuthorityInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    if (input.identities.length === 0) {
      return []
    }
    const normalized = normalizeMarketVariantAuthorityEnvelope({
      authoritySha256: "0".repeat(64),
      entries: input.identities.map((identity) => ({
        approvalProvenance: { operation: "retire" },
        availability: "unavailable",
        productId: identity.productId,
        sourceProvenance: { operation: "retire" },
        variantId: identity.variantId,
      })),
      marketCode: input.marketCode,
      sourceVersion: "retire",
    })
    return await this.retireMarketVariantAuthorities_(
      {
        identities: normalized.entries.map((entry) => ({
          productId: entry.product_id,
          variantId: entry.variant_id,
        })),
        marketCode: normalized.marketCode,
      },
      sharedContext
    )
  }

  @InjectTransactionManager()
  protected async retireMarketVariantAuthorities_(
    input: RetireMarketVariantAuthorityInput,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    await lockMarketAuthority(input.marketCode, sharedContext)
    if (!input.identities.length) {
      return []
    }
    const current = (await this.listMarketVariantAuthorities(
      {
        market_code: input.marketCode,
        product_id: {
          $in: [...new Set(input.identities.map(({ productId }) => productId))],
        },
      },
      {},
      sharedContext
    )) as MarketVariantAuthorityRecord[]
    const currentByIdentity = activeRecordsByIdentity(current)
    const ids = input.identities.flatMap(({ productId, variantId }) => {
      const id = currentByIdentity.get(`${productId}\u0000${variantId}`)?.id
      return id ? [id] : []
    })
    if (ids.length) {
      await this.softDeleteMarketVariantAuthorityRows_(ids, {}, sharedContext)
    }
    return ids
  }

  @InjectManager()
  async resolveExactMarketVariantAuthority(
    input: Omit<ResolveExactMarketVariantAuthorityInput, "records">,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ) {
    const records = (await this.listMarketVariantAuthorities(
      {
        market_code: input.marketCode.trim().toLowerCase(),
        product_id: input.productId.trim(),
      },
      {},
      sharedContext
    )) as MarketVariantAuthorityRecord[]

    return resolveExactAuthority({ ...input, records })
  }
}

export default MarketVariantAuthorityModuleService

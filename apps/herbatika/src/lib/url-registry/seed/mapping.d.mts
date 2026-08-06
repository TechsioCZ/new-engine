import type { Market } from "../../url/types"
import type { CreateUrlRecordInput } from "../contracts"

export type SeedSourceEntity = {
  id: string | number
  slug?: string | null
  handle?: string | null
}

export type MarketSeedSource = {
  market: Market
  products?: readonly SeedSourceEntity[]
  categories?: readonly SeedSourceEntity[]
  brands?: readonly SeedSourceEntity[]
  collections?: readonly SeedSourceEntity[]
  articles?: readonly SeedSourceEntity[]
  pages?: readonly SeedSourceEntity[]
}

export function mapSeedSources(
  sources: readonly MarketSeedSource[]
): CreateUrlRecordInput[]

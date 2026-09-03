import { STATIC_CONTENT_LOCALE_BY_MARKET } from "../../types"
import type { DraftMarket, DraftSourcePage } from "../types"
import { CS_CZ_DRAFT_PAGES } from "./cs-cz"
import { HU_HU_DRAFT_PAGES } from "./hu-hu"
import { RO_RO_DRAFT_PAGES } from "./ro-ro"

const PAGES_BY_MARKET = {
  cz: CS_CZ_DRAFT_PAGES,
  hu: HU_HU_DRAFT_PAGES,
  ro: RO_RO_DRAFT_PAGES,
} as const satisfies Readonly<Record<DraftMarket, readonly DraftSourcePage[]>>

export const draftPagesForMarket = (
  market: DraftMarket
): readonly DraftSourcePage[] => PAGES_BY_MARKET[market]

export const draftLocaleForMarket = (market: DraftMarket) =>
  STATIC_CONTENT_LOCALE_BY_MARKET[market]

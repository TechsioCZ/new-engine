import type {
  StorefrontTextMarket,
  StorefrontTextStatus,
} from "../../modules/storefront-text/configuration"

export type ImportStorefrontTextCatalogWorkflowInput = {
  catalog: unknown
  market: StorefrontTextMarket
}

export type SyncStorefrontTextsWorkflowInput = {
  market?: StorefrontTextMarket
}

export type UpdateStorefrontTextWorkflowInput = {
  id: string
  update: {
    override_value?: null | string
    status?: StorefrontTextStatus
  }
}

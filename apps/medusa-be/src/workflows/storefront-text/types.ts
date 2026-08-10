import type {
  StorefrontTextMarket,
  StorefrontTextStatus,
} from "../../modules/storefront-text/configuration"

export interface ImportStorefrontTextCatalogWorkflowInput {
  catalog: unknown
  market: StorefrontTextMarket
}

export interface SyncStorefrontTextsWorkflowInput {
  market?: StorefrontTextMarket
}

export interface UpdateStorefrontTextWorkflowInput {
  id: string
  update: {
    override_value?: null | string
    status?: StorefrontTextStatus
  }
}

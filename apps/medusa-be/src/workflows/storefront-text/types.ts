import type { StorefrontTextStatus } from "../../modules/storefront-text/registry"

export type UpdateStorefrontTextWorkflowInput = {
  id: string
  update: {
    status?: StorefrontTextStatus
    value?: string
  }
}

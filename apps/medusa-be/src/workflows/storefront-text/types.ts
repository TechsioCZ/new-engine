import type { StorefrontTextStatus } from "../../modules/storefront-text/registry"

export type UpdateStorefrontTextWorkflowInput = {
  id: string
  update: {
    override_value?: null | string
    status?: StorefrontTextStatus
  }
}

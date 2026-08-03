import type { IAuthModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type DeleteAuthIdentityInput = {
  auth_identity_id?: string
}

export const deleteAuthIdentityStep = createStep(
  "delete-auth-identity",
  async (
    input: DeleteAuthIdentityInput,
    { container }
  ): Promise<StepResponse<{ deleted: boolean }>> => {
    if (!input.auth_identity_id) {
      return new StepResponse({ deleted: false })
    }

    const authModuleService = container.resolve<IAuthModuleService>(Modules.AUTH)

    await authModuleService.deleteAuthIdentities([input.auth_identity_id])

    return new StepResponse({ deleted: true })
  }
)

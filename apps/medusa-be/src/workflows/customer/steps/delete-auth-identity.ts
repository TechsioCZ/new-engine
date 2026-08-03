import type { IAuthModuleService } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"

type DeleteAuthIdentityInput = {
  auth_identity_id?: string
}

const isAuthIdentityAlreadyDeletedError = (error: unknown) => {
  if (!(error instanceof MedusaError)) {
    return false
  }

  return error.type === MedusaError.Types.NOT_FOUND
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

    const authModuleService = container.resolve<IAuthModuleService>(
      Modules.AUTH
    )

    try {
      await authModuleService.deleteAuthIdentities([input.auth_identity_id])
    } catch (error) {
      if (!isAuthIdentityAlreadyDeletedError(error)) {
        throw error
      }
    }

    return new StepResponse({ deleted: true })
  }
)

import type { ExecArgs, IApiKeyModuleService, ILockingModule } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { provisionPublishableKey } from "../utils/publishable-key"

export default async function myScript({ container, args }: ExecArgs) {
  const apiKeyService = container.resolve<IApiKeyModuleService>(Modules.API_KEY)
  const lockingModule = container.resolve<ILockingModule>(Modules.LOCKING)

  const { apiKey } = await provisionPublishableKey({
    apiKeyService,
    lockingModule,
    title: args?.[0],
  })

  process.stdout.write(`<PK_TOKEN>${apiKey.token}</PK_TOKEN>`)
}

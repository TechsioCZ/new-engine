import type { ExecArgs, IApiKeyModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const DEFAULT_PUBLISHABLE_KEY_TITLE = "Storefront Publishable Key"

export default async function myScript({ container, args }: ExecArgs) {
  const service = container.resolve<IApiKeyModuleService>(Modules.API_KEY)
  const keyTitle =
    args?.[0]?.trim() ||
    process.env.INITIAL_PUBLISHABLE_KEY_NAME?.trim() ||
    process.env.PUBLISHABLE_KEY_NAME?.trim() ||
    DEFAULT_PUBLISHABLE_KEY_TITLE

  const existingKeys = await service.listApiKeys({
    title: keyTitle,
    type: "publishable",
  })

  const existingActiveKey = existingKeys.find((key) => !key.revoked_at)

  if (existingActiveKey) {
    process.stdout.write(`<PK_TOKEN>${existingActiveKey.token}</PK_TOKEN>`)
    return
  }

  const createdKey = await service.createApiKeys({
    title: keyTitle,
    type: "publishable",
    created_by: "",
  })

  process.stdout.write(`<PK_TOKEN>${createdKey.token}</PK_TOKEN>`)
}

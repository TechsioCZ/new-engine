import type { ExecArgs } from "@medusajs/framework/types"
import { syncStorefrontTextsWorkflow } from "../workflows/storefront-text/workflows/sync-storefront-texts"

export default async function syncHerbatikaFooterText({ container }: ExecArgs) {
  const { result } = await syncStorefrontTextsWorkflow(container).run({
    input: {},
  })

  process.stdout.write(`${JSON.stringify(result)}\n`)
}

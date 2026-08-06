import { defineLink } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import CartModule from "@medusajs/medusa/cart"
import { omitUndefined } from "@techsio/std/object"

import ApprovalModule from "../modules/approval"

const cartLinkable: unknown = CartModule.linkable["cart"]
const cartSource = omitUndefined(
  z
    .object({
      id: z.object({
        entity: z.string().optional(),
        field: z.string(),
        linkable: z.string(),
        primaryKey: z.string(),
        serviceName: z.string(),
      }),
    })
    .parse(cartLinkable).id,
)

export default defineLink(cartSource, {
  deleteCascade: true,
  linkable: ApprovalModule.linkable.approvalStatus,
})

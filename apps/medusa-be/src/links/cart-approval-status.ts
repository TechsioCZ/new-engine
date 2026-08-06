import { defineLink } from "@medusajs/framework/utils"
import { z } from "@medusajs/framework/zod"
import CartModule from "@medusajs/medusa/cart"

import ApprovalModule from "../modules/approval"
import { definedProperties } from "../utils/defined-properties"

const cartLinkable: unknown = CartModule.linkable["cart"]
const cartSource = definedProperties(
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

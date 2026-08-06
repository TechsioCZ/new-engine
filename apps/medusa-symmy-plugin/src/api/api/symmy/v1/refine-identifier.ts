import type { z } from "@medusajs/framework/zod"

type IdentifiedValue = Record<string, unknown> & {
  identifier_type: string
}

export const requireIdentifierField = (
  value: IdentifiedValue,
  ctx: z.RefinementCtx,
): void => {
  const identifierType = value.identifier_type
  const identifier = value[identifierType]
  if (typeof identifier === "string" && identifier.length > 0) {
    return
  }

  ctx.addIssue({
    code: "custom",
    message: `${identifierType} is required when identifier_type is '${identifierType}'`,
    path: [identifierType],
  })
}

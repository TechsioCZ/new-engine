import { z } from "@medusajs/framework/zod"

type IdentifiedValue = Record<string, unknown> & {
  identifier_type: string
}

export function requireIdentifierField(
  value: IdentifiedValue,
  ctx: z.RefinementCtx
): void {
  const identifierType = value.identifier_type
  if (value[identifierType]) {
    return
  }

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: `${identifierType} is required when identifier_type is '${identifierType}'`,
    path: [identifierType],
  })
}

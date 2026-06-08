import { MedusaError } from "@medusajs/framework/utils"
import type { z } from "@medusajs/framework/zod"

export const parseInvalidData = <T>(
  schema: z.ZodType<T>,
  value: unknown,
  fallbackMessage = "Invalid input"
) => {
  const result = schema.safeParse(value)

  if (result.success) {
    return result.data
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    result.error.issues[0]?.message ?? fallbackMessage
  )
}

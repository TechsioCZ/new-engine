import { z } from "zod"

export function requireLiveZaneCredentials(
  value: { apiToken: string; baseUrl: string; dryRun: boolean },
  ctx: z.RefinementCtx
): void {
  if (!(value.dryRun || value.baseUrl)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["baseUrl"],
      message: "Zane operator base URL is required.",
    })
  }

  if (!(value.dryRun || value.apiToken)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["apiToken"],
      message: "Zane operator API token is required.",
    })
  }
}

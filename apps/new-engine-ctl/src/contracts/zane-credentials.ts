import type { z } from "zod"

export const requireLiveZaneCredentials = (
  value: { apiToken: string; baseUrl: string; dryRun: boolean },
  ctx: z.RefinementCtx,
): void => {
  if (!(value.dryRun || value.baseUrl)) {
    ctx.addIssue({
      code: "custom",
      message: "Zane operator base URL is required.",
      path: ["baseUrl"],
    })
  }

  if (!(value.dryRun || value.apiToken)) {
    ctx.addIssue({
      code: "custom",
      message: "Zane operator API token is required.",
      path: ["apiToken"],
    })
  }
}

import { readFile } from "node:fs/promises"

import { z } from "zod"

import { resolveTargetsResponseSchema } from "./resolve-targets.js"
const triggeredDeploymentSchema = z.looseObject({
  service_id: z.string().min(1),
  service_slug: z.string().min(1),
  service_type: z.string().nullable().optional(),
  deployment_hash: z.string().min(1),
  status: z.string().min(1),
})

export const triggerResponseSchema = z.object({
  project_slug: z.string().min(1),
  environment_name: z.string().min(1),
  git_commit_sha: z.string().nullable(),
  triggered_service_ids: z.array(z.string()),
  services: z.array(triggeredDeploymentSchema),
})

const targetsEnvelopeSchema = z.object({
  services: resolveTargetsResponseSchema.shape.services,
})

export type TriggerResponse = z.infer<typeof triggerResponseSchema>

export async function resolveTriggerTargets(
  targetsJsonPath: string
): Promise<z.infer<typeof targetsEnvelopeSchema>["services"]> {
  const raw = await readFile(targetsJsonPath, "utf8")

  return targetsEnvelopeSchema.parse(JSON.parse(raw)).services
}

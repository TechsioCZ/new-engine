import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  type ResolveTargetsCommandInput,
  type ResolveTargetsPayload,
  type ResolveTargetsResponse,
  resolvePlanServices,
  resolveTargetsResponseSchema,
} from "../contracts/resolve-targets.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export function executeResolveTargetsPayload(input: {
  payload: ResolveTargetsPayload
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<ResolveTargetsResponse> {
  if (input.dryRun) {
    return Promise.resolve(
      resolveTargetsResponseSchema.parse({
        project_slug: input.payload.project_slug,
        environment_name: input.payload.environment_name,
        services: input.payload.services,
      })
    )
  }

  return new ZaneOperatorClient(input.baseUrl, input.apiToken).resolveTargets(
    input.payload
  )
}

export async function executeResolveTargets(
  input: ResolveTargetsCommandInput
): Promise<ResolveTargetsResponse> {
  const services = await resolvePlanServices(input.planJsonPath)
  const response = await executeResolveTargetsPayload({
    payload: {
      lane: input.lane,
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      services,
    },
    baseUrl: input.baseUrl,
    apiToken: input.apiToken,
    dryRun: input.dryRun,
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

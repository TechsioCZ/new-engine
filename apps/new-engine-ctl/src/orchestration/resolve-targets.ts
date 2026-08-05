import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  resolvePlanServices,
  resolveTargetsResponseSchema,
} from "../contracts/resolve-targets.js"
import type {
  ResolveTargetsCommandInput,
  ResolveTargetsPayload,
  ResolveTargetsResponse,
} from "../contracts/resolve-targets.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export async function executeResolveTargetsPayload(input: {
  payload: ResolveTargetsPayload
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<ResolveTargetsResponse> {
  if (input.dryRun) {
    return Promise.resolve(
      resolveTargetsResponseSchema.parse({
        environment_name: input.payload.environment_name,
        project_slug: input.payload.project_slug,
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
    apiToken: input.apiToken,
    baseUrl: input.baseUrl,
    dryRun: input.dryRun,
    payload: {
      environment_name: input.environmentName,
      lane: input.lane,
      project_slug: input.projectSlug,
      services,
    },
  })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

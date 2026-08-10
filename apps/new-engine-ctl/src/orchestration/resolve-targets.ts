import { mkdir, writeFile } from "node:fs/promises"
import nodePath from "node:path"

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

const writeJsonFile = async (path: string, value: unknown): Promise<void> => {
  await mkdir(nodePath.dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf-8")
}

export const executeResolveTargetsPayload = async (input: {
  payload: ResolveTargetsPayload
  baseUrl: string
  apiToken: string
  dryRun: boolean
}): Promise<ResolveTargetsResponse> => {
  if (input.dryRun) {
    return resolveTargetsResponseSchema.parse({
      environment_name: input.payload.environment_name,
      project_slug: input.payload.project_slug,
      services: input.payload.services,
    })
  }

  return await new ZaneOperatorClient(
    input.baseUrl,
    input.apiToken,
  ).resolveTargets(input.payload)
}

export const executeResolveTargets = async (
  input: ResolveTargetsCommandInput,
): Promise<ResolveTargetsResponse> => {
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

  if (input.outputJson !== undefined && input.outputJson !== "") {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"

import {
  type ResolveTargetsCommandInput,
  type ResolveTargetsResponse,
  resolvePlanServices,
  resolveTargetsResponseSchema,
} from "../contracts/resolve-targets.js"
import { ZaneOperatorClient } from "../zane-operator-client/client.js"

async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value)}\n`, "utf8")
}

export async function executeResolveTargets(
  input: ResolveTargetsCommandInput
): Promise<ResolveTargetsResponse> {
  const services = await resolvePlanServices(input.planJsonPath)
  const response = input.dryRun
    ? resolveTargetsResponseSchema.parse({
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        services,
      })
    : await new ZaneOperatorClient(
        input.baseUrl,
        input.apiToken
      ).resolveTargets({
        lane: input.lane,
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        services,
      })

  if (input.outputJson) {
    await writeJsonFile(input.outputJson, response)
  }

  return response
}

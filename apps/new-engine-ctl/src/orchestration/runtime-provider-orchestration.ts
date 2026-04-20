import type { StackInputs } from "../contracts/stack-inputs.js"
import {
  runtimeProviderOutputKey,
  type RuntimeProviderOutputs,
} from "../contracts/runtime-provider-outputs.js"
import {
  getRuntimeProviderLaneBehavior,
  listActiveRuntimeProviderIdsForLane,
  listRuntimeProviderOutputIds,
  listRuntimeProviderOutputTargets,
  type RuntimeProviderLaneBehavior,
} from "../contracts/stack-inputs.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
import type { ResolveTargetsPayload } from "../contracts/resolve-targets.js"
import { executeResolveTargetsPayload } from "./resolve-targets.js"
import {
  getMedusaPublishableKeyProviderSourceService,
  provisionMedusaPublishableKey,
  reusePersistedMedusaPublishableKeyFromTargets,
} from "./medusa-publishable-key.js"
import {
  getMeiliApiCredentialsProviderSourceService,
  provisionMeiliKeys,
  reusePersistedMeiliKeysFromTargets,
} from "./preview-meili.js"

export type RuntimeProviderState = {
  outputValues: Record<string, string>
  outputEnvVars: Record<string, string>
  meili: {
    backendCreated: boolean
    backendUpdated: boolean
    frontendCreated: boolean
    frontendUpdated: boolean
    verified: boolean
  }
}

export type RuntimeProviderNeed = {
  providerId: string
  label: string
  laneBehavior: RuntimeProviderLaneBehavior
  sourceServiceId: string
  sourceServiceSlug: string
  outputConsumerIds: Record<string, string[]>
}

type RuntimeProviderAdapter = {
  providerId: string
  label: string
  resolveSourceService(input: {
    manifest: StackManifest
    stackInputs: StackInputs
  }): {
    serviceId: string
    serviceSlug: string
  }
  reusePersisted(input: {
    need: RuntimeProviderNeed
    stackInputs: StackInputs
    targets: Awaited<ReturnType<typeof executeResolveTargetsPayload>>["services"]
    state: RuntimeProviderState
  }): void
  provision(input: {
    need: RuntimeProviderNeed
    outputIds: string[]
    projectSlug: string
    environmentName: string
    stackInputs: StackInputs
    baseUrl: string
    apiToken: string
    dryRun: boolean
    state: RuntimeProviderState
  }): Promise<void>
}

function outputStateKey(providerId: string, outputId: string): string {
  return runtimeProviderOutputKey(providerId, outputId)
}

function setRuntimeProviderOutput(input: {
  state: RuntimeProviderState
  providerId: string
  outputId: string
  value: string
  envVar: string
}): void {
  input.state.outputValues[outputStateKey(input.providerId, input.outputId)] =
    input.value
  input.state.outputEnvVars[outputStateKey(input.providerId, input.outputId)] =
    input.envVar
}

function getRuntimeProviderOutputValue(
  state: RuntimeProviderState,
  providerId: string,
  outputId: string
): string {
  return state.outputValues[outputStateKey(providerId, outputId)] ?? ""
}

export function getRuntimeProviderOutputEnvVar(
  state: RuntimeProviderState,
  providerId: string,
  outputId: string
): string {
  return state.outputEnvVars[outputStateKey(providerId, outputId)] ?? ""
}

function missingOutputIds(
  need: RuntimeProviderNeed,
  state: RuntimeProviderState
): string[] {
  return Object.entries(need.outputConsumerIds)
    .filter(([, consumerIds]) => consumerIds.length > 0)
    .map(([outputId]) => outputId)
    .filter(
      (outputId) =>
        !getRuntimeProviderOutputValue(state, need.providerId, outputId)
    )
}

function missingStageOutputIds(input: {
  need: RuntimeProviderNeed
  stageServiceIds: string[]
  state: RuntimeProviderState
}): string[] {
  return Object.entries(input.need.outputConsumerIds)
    .filter(([, consumerIds]) =>
      consumerIds.some((serviceId) => input.stageServiceIds.includes(serviceId))
    )
    .map(([outputId]) => outputId)
    .filter(
      (outputId) =>
        !getRuntimeProviderOutputValue(
          input.state,
          input.need.providerId,
          outputId
        )
    )
}

function stageNeedsProvider(input: {
  need: RuntimeProviderNeed
  stageServiceIds: string[]
}): boolean {
  return Object.values(input.need.outputConsumerIds).some((consumerIds) =>
    consumerIds.some((serviceId) => input.stageServiceIds.includes(serviceId))
  )
}

function buildRuntimeProviderAdapters(
  meiliApiCredentialsProviderId: string
): RuntimeProviderAdapter[] {
  return [
    {
      providerId: meiliApiCredentialsProviderId,
      label: "Meili API credentials",
      resolveSourceService: ({ manifest, stackInputs }) =>
        getMeiliApiCredentialsProviderSourceService(
          manifest,
          stackInputs,
          meiliApiCredentialsProviderId
        ),
      reusePersisted: ({ need, stackInputs, targets, state }) => {
        const reused = reusePersistedMeiliKeysFromTargets({
          targets,
          stackInputs,
          providerId: need.providerId,
          backendConsumerIds: need.outputConsumerIds.backend_key ?? [],
          frontendConsumerIds: need.outputConsumerIds.frontend_key ?? [],
        })
        setRuntimeProviderOutput({
          state,
          providerId: need.providerId,
          outputId: "backend_key",
          value: reused.backendKey,
          envVar: getRuntimeProviderOutputEnvVar(
            state,
            need.providerId,
            "backend_key"
          ) || "MEILISEARCH_API_KEY",
        })
        setRuntimeProviderOutput({
          state,
          providerId: need.providerId,
          outputId: "frontend_key",
          value: reused.frontendKey,
          envVar: reused.frontendEnvVar,
        })
      },
      provision: async ({
        need,
        outputIds,
        projectSlug,
        environmentName,
        stackInputs,
        baseUrl,
        apiToken,
        dryRun,
        state,
      }) => {
        const provisioned = await provisionMeiliKeys({
          projectSlug,
          environmentName,
          serviceSlug: need.sourceServiceSlug,
          stackInputs,
          providerId: need.providerId,
          baseUrl,
          apiToken,
          dryRun,
          needBackendKey: outputIds.includes("backend_key"),
          needFrontendKey: outputIds.includes("frontend_key"),
        })
        if (provisioned.backend_key) {
          setRuntimeProviderOutput({
            state,
            providerId: need.providerId,
            outputId: "backend_key",
            value: provisioned.backend_key,
            envVar: provisioned.backend_env_var,
          })
          state.meili.backendCreated = provisioned.backend_created
          state.meili.backendUpdated = provisioned.backend_updated
        }
        if (provisioned.frontend_key) {
          setRuntimeProviderOutput({
            state,
            providerId: need.providerId,
            outputId: "frontend_key",
            value: provisioned.frontend_key,
            envVar: provisioned.frontend_env_var,
          })
          state.meili.frontendCreated = provisioned.frontend_created
          state.meili.frontendUpdated = provisioned.frontend_updated
        }
        state.meili.verified = true
      },
    },
    {
      providerId: "medusa_publishable_key",
      label: "Medusa publishable key",
      resolveSourceService: ({ manifest, stackInputs }) =>
        getMedusaPublishableKeyProviderSourceService(
          manifest,
          stackInputs,
          "medusa_publishable_key"
        ),
      reusePersisted: ({ need, stackInputs, targets, state }) => {
        const reused = reusePersistedMedusaPublishableKeyFromTargets({
          targets,
          stackInputs,
          providerId: need.providerId,
          consumerIds: need.outputConsumerIds.frontend_key ?? [],
        })
        setRuntimeProviderOutput({
          state,
          providerId: need.providerId,
          outputId: "frontend_key",
          value: reused.frontendKey,
          envVar: reused.frontendEnvVar,
        })
      },
      provision: async ({
        need,
        outputIds,
        projectSlug,
        environmentName,
        stackInputs,
        baseUrl,
        apiToken,
        dryRun,
        state,
      }) => {
        const provisioned = await provisionMedusaPublishableKey({
          projectSlug,
          environmentName,
          serviceSlug: need.sourceServiceSlug,
          stackInputs,
          providerId: need.providerId,
          baseUrl,
          apiToken,
          dryRun,
          needFrontendKey: outputIds.includes("frontend_key"),
        })
        if (provisioned.frontend_key) {
          setRuntimeProviderOutput({
            state,
            providerId: need.providerId,
            outputId: "frontend_key",
            value: provisioned.frontend_key,
            envVar: provisioned.frontend_env_var,
          })
        }
      },
    },
  ]
}

function resolveRuntimeProviderNeeds(input: {
  lane: ResolveTargetsPayload["lane"]
  manifest: StackManifest
  stackInputs: StackInputs
  providerIds: string[]
  serviceIds: string[]
  meiliApiCredentialsProviderId: string
}): RuntimeProviderNeed[] {
  const adaptersById = new Map(
    buildRuntimeProviderAdapters(input.meiliApiCredentialsProviderId).map(
      (adapter) => [adapter.providerId, adapter]
    )
  )

  return input.providerIds.flatMap((providerId) => {
    const adapter = adaptersById.get(providerId)
    if (!adapter) {
      return []
    }

    const outputConsumerIds = Object.fromEntries(
      listRuntimeProviderOutputIds(input.stackInputs, providerId)
        .map((outputId) => [
          outputId,
          listRuntimeProviderOutputTargets(input.stackInputs, providerId, outputId)
            .filter((target) => input.serviceIds.includes(target.service_id))
            .map((target) => target.service_id),
        ])
        .filter(
          (entry): entry is [string, string[]] =>
            Array.isArray(entry[1]) && entry[1].length > 0
        )
    ) as Record<string, string[]>

    if (Object.keys(outputConsumerIds).length === 0) {
      return []
    }

    const sourceService = adapter.resolveSourceService({
      manifest: input.manifest,
      stackInputs: input.stackInputs,
    })
    const laneBehavior = getRuntimeProviderLaneBehavior(
      input.stackInputs,
      providerId,
      input.lane
    )

    return [
      {
        providerId,
        label: adapter.label,
        laneBehavior,
        sourceServiceId: sourceService.serviceId,
        sourceServiceSlug: sourceService.serviceSlug,
        outputConsumerIds,
      },
    ]
  })
}

export function createRuntimeProviderState(
  outputs: RuntimeProviderOutputs
): RuntimeProviderState {
  const state: RuntimeProviderState = {
    outputValues: {},
    outputEnvVars: {},
    meili: {
      backendCreated: false,
      backendUpdated: false,
      frontendCreated: false,
      frontendUpdated: false,
      verified: false,
    },
  }

  for (const [key, output] of Object.entries(outputs)) {
    state.outputValues[key] = output.value
    state.outputEnvVars[key] = output.env_var
  }

  return state
}

export function buildRuntimeProviderOutputs(
  state: RuntimeProviderState
): RuntimeProviderOutputs {
  return Object.fromEntries(
    Object.keys(state.outputValues).map((key) => [
      key,
      {
        value: state.outputValues[key] ?? "",
        env_var: state.outputEnvVars[key] ?? "",
      },
    ])
  )
}

export function getRuntimeProviderOutputValueByRef(input: {
  state: RuntimeProviderState
  providerId: string
  outputId: string
}): string {
  return getRuntimeProviderOutputValue(input.state, input.providerId, input.outputId)
}

export function buildRuntimeProviderRenderContext(state: RuntimeProviderState) {
  return {
    runtimeProviderOutputs: buildRuntimeProviderOutputs(state),
  }
}

export function collectConfiguredRuntimeProviderNeeds(input: {
  lane: ResolveTargetsPayload["lane"]
  manifest: StackManifest
  stackInputs: StackInputs
  services: Array<{ id: string }>
  meiliApiCredentialsProviderId: string
}): RuntimeProviderNeed[] {
  return resolveRuntimeProviderNeeds({
    lane: input.lane,
    manifest: input.manifest,
    stackInputs: input.stackInputs,
    providerIds: listActiveRuntimeProviderIdsForLane(
      input.stackInputs,
      input.lane
    ),
    serviceIds: input.services.map((service) => service.id),
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
  })
}

export async function reuseRuntimeProviderOutputs(input: {
  lane: ResolveTargetsPayload["lane"]
  projectSlug: string
  environmentName: string
  planServices: Array<{ id: string; service_slug: string }>
  needs: RuntimeProviderNeed[]
  stackInputs: StackInputs
  baseUrl: string
  apiToken: string
  dryRun: boolean
  state: RuntimeProviderState
  meiliApiCredentialsProviderId: string
  onProgress: (message: string) => void
}): Promise<void> {
  const adaptersById = new Map(
    buildRuntimeProviderAdapters(input.meiliApiCredentialsProviderId).map(
      (adapter) => [adapter.providerId, adapter]
    )
  )

  for (const need of input.needs) {
    const adapter = adaptersById.get(need.providerId)
    if (!adapter) {
      continue
    }

    const sourceInPlan = input.planServices.some(
      (service) => service.id === need.sourceServiceId
    )
    if (sourceInPlan || input.dryRun) {
      continue
    }

    if (!need.laneBehavior.reuse_persisted_outputs) {
      continue
    }

    const consumerServiceIds = [
      ...new Set(Object.values(need.outputConsumerIds).flat()),
    ]
    const targets = await executeResolveTargetsPayload({
      payload: {
        lane: input.lane,
        project_slug: input.projectSlug,
        environment_name: input.environmentName,
        services: input.planServices
          .filter((service) => consumerServiceIds.includes(service.id))
          .map((service) => ({
            service_id: service.id,
            service_slug: service.service_slug,
          })),
      },
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: false,
    })
    adapter.reusePersisted({
      need,
      stackInputs: input.stackInputs,
      targets: targets.services,
      state: input.state,
    })

    if (missingOutputIds(need, input.state).length === 0) {
      input.onProgress(
        `Reusing persisted ${need.label} from current healthy ${input.lane} consumer deployments.`
      )
      continue
    }

    if (!need.laneBehavior.reconcile_when_source_not_in_plan) {
      continue
    }

    input.onProgress(
      `${need.label} source service ${need.sourceServiceId} is not in this deploy plan and persisted consumer envs are incomplete; reconciling required outputs before deploy stages.`
    )
    await adapter.provision({
      need,
      outputIds: missingOutputIds(need, input.state),
      projectSlug: input.projectSlug,
      environmentName: input.environmentName,
      stackInputs: input.stackInputs,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
      state: input.state,
    })
    input.onProgress(`${need.label} resolved for ${input.lane} consumers.`)
  }
}

export async function ensureStageRuntimeProviderOutputs(input: {
  lane: ResolveTargetsPayload["lane"]
  stage: number
  stageServices: Array<{ id: string; service_slug: string }>
  fullPlanServices: Array<{ id: string; service_slug: string; deploy_stage: number }>
  needs: RuntimeProviderNeed[]
  projectSlug: string
  environmentName: string
  stackInputs: StackInputs
  baseUrl: string
  apiToken: string
  dryRun: boolean
  state: RuntimeProviderState
  meiliApiCredentialsProviderId: string
  onProgress: (message: string) => void
}): Promise<void> {
  const adaptersById = new Map(
    buildRuntimeProviderAdapters(input.meiliApiCredentialsProviderId).map(
      (adapter) => [adapter.providerId, adapter]
    )
  )

  for (const need of input.needs) {
    const adapter = adaptersById.get(need.providerId)
    if (!adapter) {
      continue
    }

    if (
      !stageNeedsProvider({
        need,
        stageServiceIds: input.stageServices.map((service) => service.id),
      })
    ) {
      continue
    }

    const stageMissingOutputIds = missingStageOutputIds({
      need,
      stageServiceIds: input.stageServices.map((service) => service.id),
      state: input.state,
    })
    if (stageMissingOutputIds.length === 0) {
      continue
    }

    const sourceStage = input.fullPlanServices.find(
      (service) => service.id === need.sourceServiceId
    )?.deploy_stage
    if (sourceStage != null && sourceStage >= input.stage) {
      throw new Error(
        `${need.label} source service ${need.sourceServiceId} must be healthy before consumer stage ${input.stage}.`
      )
    }

    input.onProgress(
      `Stage ${input.stage} consumes ${need.label}; reconciling only the required outputs before env overrides.`
    )
    await adapter.provision({
      need,
      outputIds: stageMissingOutputIds,
      projectSlug: input.projectSlug,
      environmentName: input.environmentName,
      stackInputs: input.stackInputs,
      baseUrl: input.baseUrl,
      apiToken: input.apiToken,
      dryRun: input.dryRun,
      state: input.state,
    })
    input.onProgress(`${need.label} resolved for stage ${input.stage}.`)
  }
}

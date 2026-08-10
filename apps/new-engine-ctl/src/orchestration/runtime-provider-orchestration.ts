import type { ResolveTargetsPayload } from "../contracts/resolve-targets.js"
import { runtimeProviderOutputKey } from "../contracts/runtime-provider-outputs.js"
import type { RuntimeProviderOutputs } from "../contracts/runtime-provider-outputs.js"
import {
  getRuntimeProviderLaneBehavior,
  listActiveRuntimeProviderIdsForLane,
  listRuntimeProviderOutputIds,
  listRuntimeProviderOutputTargets,
} from "../contracts/stack-inputs.js"
import type {
  StackInputs,
  RuntimeProviderLaneBehavior,
} from "../contracts/stack-inputs.js"
import type { StackManifest } from "../contracts/stack-manifest.js"
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
import { executeResolveTargetsPayload } from "./resolve-targets.js"

export interface RuntimeProviderState {
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

export interface RuntimeProviderNeed {
  providerId: string
  label: string
  laneBehavior: RuntimeProviderLaneBehavior
  sourceServiceId: string
  sourceServiceSlug: string
  outputConsumerIds: Record<string, string[]>
}

interface RuntimeProviderAdapter {
  providerId: string
  label: string
  resolveSourceService: (input: {
    manifest: StackManifest
    stackInputs: StackInputs
  }) => {
    serviceId: string
    serviceSlug: string
  }
  reusePersisted: (input: {
    need: RuntimeProviderNeed
    stackInputs: StackInputs
    targets: Awaited<
      ReturnType<typeof executeResolveTargetsPayload>
    >["services"]
    state: RuntimeProviderState
  }) => void
  provision: (input: {
    need: RuntimeProviderNeed
    outputIds: string[]
    projectSlug: string
    environmentName: string
    stackInputs: StackInputs
    baseUrl: string
    apiToken: string
    dryRun: boolean
    state: RuntimeProviderState
  }) => Promise<void>
}

interface ReuseRuntimeProviderOutputsContext {
  apiToken: string
  baseUrl: string
  dryRun: boolean
  environmentName: string
  lane: ResolveTargetsPayload["lane"]
  onProgress: (message: string) => void
  planServices: { id: string; service_slug: string }[]
  projectSlug: string
  stackInputs: StackInputs
  state: RuntimeProviderState
}

interface StageRuntimeProviderOutputsContext {
  apiToken: string
  baseUrl: string
  deployStagesByServiceId: ReadonlyMap<string, number>
  dryRun: boolean
  environmentName: string
  onProgress: (message: string) => void
  projectSlug: string
  stackInputs: StackInputs
  stage: number
  stageServiceIds: ReadonlySet<string>
  state: RuntimeProviderState
}

const outputStateKey = (providerId: string, outputId: string): string =>
  runtimeProviderOutputKey(providerId, outputId)

const setRuntimeProviderOutput = (input: {
  state: RuntimeProviderState
  providerId: string
  outputId: string
  value: string
  envVar: string
}): void => {
  input.state.outputValues[outputStateKey(input.providerId, input.outputId)] =
    input.value
  input.state.outputEnvVars[outputStateKey(input.providerId, input.outputId)] =
    input.envVar
}

const getRuntimeProviderOutputValue = (
  state: RuntimeProviderState,
  providerId: string,
  outputId: string,
): string => state.outputValues[outputStateKey(providerId, outputId)] ?? ""

const getRuntimeProviderOutputEnvVar = (
  state: RuntimeProviderState,
  providerId: string,
  outputId: string,
): string => state.outputEnvVars[outputStateKey(providerId, outputId)] ?? ""

const missingOutputIds = (
  need: RuntimeProviderNeed,
  state: RuntimeProviderState,
): string[] => {
  const outputIds: string[] = []

  for (const [outputId, consumerIds] of Object.entries(
    need.outputConsumerIds,
  )) {
    if (
      consumerIds.length > 0 &&
      !getRuntimeProviderOutputValue(state, need.providerId, outputId)
    ) {
      outputIds.push(outputId)
    }
  }

  return outputIds
}

const missingStageOutputIds = (input: {
  need: RuntimeProviderNeed
  stageServiceIds: ReadonlySet<string>
  state: RuntimeProviderState
}): string[] => {
  const outputIds: string[] = []

  for (const [outputId, consumerIds] of Object.entries(
    input.need.outputConsumerIds,
  )) {
    const consumedByStage = consumerIds.some((serviceId) =>
      input.stageServiceIds.has(serviceId),
    )
    if (
      consumedByStage &&
      !getRuntimeProviderOutputValue(
        input.state,
        input.need.providerId,
        outputId,
      )
    ) {
      outputIds.push(outputId)
    }
  }

  return outputIds
}

const stageNeedsProvider = (input: {
  need: RuntimeProviderNeed
  stageServiceIds: ReadonlySet<string>
}): boolean =>
  Object.values(input.need.outputConsumerIds).some((consumerIds) =>
    consumerIds.some((serviceId) => input.stageServiceIds.has(serviceId)),
  )

const buildRuntimeProviderAdapters = (
  meiliApiCredentialsProviderId: string,
): RuntimeProviderAdapter[] => [
  {
    label: "Meili API credentials",
    providerId: meiliApiCredentialsProviderId,
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
        apiToken,
        baseUrl,
        dryRun,
        environmentName,
        needBackendKey: outputIds.includes("backend_key"),
        needFrontendKey: outputIds.includes("frontend_key"),
        projectSlug,
        providerId: need.providerId,
        serviceSlug: need.sourceServiceSlug,
        stackInputs,
      })
      if (provisioned.backend_key) {
        setRuntimeProviderOutput({
          envVar: provisioned.backend_env_var,
          outputId: "backend_key",
          providerId: need.providerId,
          state,
          value: provisioned.backend_key,
        })
        state.meili.backendCreated = provisioned.backend_created
        state.meili.backendUpdated = provisioned.backend_updated
      }
      if (provisioned.frontend_key) {
        setRuntimeProviderOutput({
          envVar: provisioned.frontend_env_var,
          outputId: "frontend_key",
          providerId: need.providerId,
          state,
          value: provisioned.frontend_key,
        })
        state.meili.frontendCreated = provisioned.frontend_created
        state.meili.frontendUpdated = provisioned.frontend_updated
      }
      state.meili.verified = true
    },
    resolveSourceService: ({ manifest, stackInputs }) =>
      getMeiliApiCredentialsProviderSourceService(
        manifest,
        stackInputs,
        meiliApiCredentialsProviderId,
      ),
    reusePersisted: ({ need, stackInputs, targets, state }) => {
      const reused = reusePersistedMeiliKeysFromTargets({
        backendConsumerIds: need.outputConsumerIds["backend_key"] ?? [],
        frontendConsumerIds: need.outputConsumerIds["frontend_key"] ?? [],
        providerId: need.providerId,
        stackInputs,
        targets,
      })
      setRuntimeProviderOutput({
        envVar:
          getRuntimeProviderOutputEnvVar(
            state,
            need.providerId,
            "backend_key",
          ) || "MEILISEARCH_API_KEY",
        outputId: "backend_key",
        providerId: need.providerId,
        state,
        value: reused.backendKey,
      })
      setRuntimeProviderOutput({
        envVar: reused.frontendEnvVar,
        outputId: "frontend_key",
        providerId: need.providerId,
        state,
        value: reused.frontendKey,
      })
    },
  },
  {
    label: "Medusa publishable key",
    providerId: "medusa_publishable_key",
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
        apiToken,
        baseUrl,
        dryRun,
        environmentName,
        needFrontendKey: outputIds.includes("frontend_key"),
        projectSlug,
        providerId: need.providerId,
        serviceSlug: need.sourceServiceSlug,
        stackInputs,
      })
      if (provisioned.frontend_key) {
        setRuntimeProviderOutput({
          envVar: provisioned.frontend_env_var,
          outputId: "frontend_key",
          providerId: need.providerId,
          state,
          value: provisioned.frontend_key,
        })
      }
    },
    resolveSourceService: ({ manifest, stackInputs }) =>
      getMedusaPublishableKeyProviderSourceService(
        manifest,
        stackInputs,
        "medusa_publishable_key",
      ),
    reusePersisted: ({ need, stackInputs, targets, state }) => {
      const reused = reusePersistedMedusaPublishableKeyFromTargets({
        consumerIds: need.outputConsumerIds["frontend_key"] ?? [],
        providerId: need.providerId,
        stackInputs,
        targets,
      })
      setRuntimeProviderOutput({
        envVar: reused.frontendEnvVar,
        outputId: "frontend_key",
        providerId: need.providerId,
        state,
        value: reused.frontendKey,
      })
    },
  },
]

const buildRuntimeProviderAdaptersById = (
  meiliApiCredentialsProviderId: string,
): ReadonlyMap<string, RuntimeProviderAdapter> =>
  new Map(
    buildRuntimeProviderAdapters(meiliApiCredentialsProviderId).map(
      (adapter) => [adapter.providerId, adapter],
    ),
  )

const collectOutputConsumerIds = (input: {
  stackInputs: StackInputs
  providerId: string
  serviceIds: ReadonlySet<string>
}): Record<string, string[]> => {
  const outputConsumerIds: Record<string, string[]> = {}

  for (const outputId of listRuntimeProviderOutputIds(
    input.stackInputs,
    input.providerId,
  )) {
    const consumerIds: string[] = []
    for (const target of listRuntimeProviderOutputTargets(
      input.stackInputs,
      input.providerId,
      outputId,
    )) {
      if (input.serviceIds.has(target.service_id)) {
        consumerIds.push(target.service_id)
      }
    }

    if (consumerIds.length > 0) {
      outputConsumerIds[outputId] = consumerIds
    }
  }

  return outputConsumerIds
}

const resolveRuntimeProviderNeeds = (input: {
  lane: ResolveTargetsPayload["lane"]
  manifest: StackManifest
  stackInputs: StackInputs
  providerIds: string[]
  serviceIds: string[]
  meiliApiCredentialsProviderId: string
}): RuntimeProviderNeed[] => {
  const adaptersById = buildRuntimeProviderAdaptersById(
    input.meiliApiCredentialsProviderId,
  )
  const serviceIds = new Set(input.serviceIds)

  return input.providerIds.flatMap((providerId) => {
    const adapter = adaptersById.get(providerId)
    if (!adapter) {
      return []
    }

    const outputConsumerIds = collectOutputConsumerIds({
      providerId,
      serviceIds,
      stackInputs: input.stackInputs,
    })

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
      input.lane,
    )

    return [
      {
        label: adapter.label,
        laneBehavior,
        outputConsumerIds,
        providerId,
        sourceServiceId: sourceService.serviceId,
        sourceServiceSlug: sourceService.serviceSlug,
      },
    ]
  })
}

export const createRuntimeProviderState = (
  outputs: RuntimeProviderOutputs,
): RuntimeProviderState => {
  const state: RuntimeProviderState = {
    meili: {
      backendCreated: false,
      backendUpdated: false,
      frontendCreated: false,
      frontendUpdated: false,
      verified: false,
    },
    outputEnvVars: {},
    outputValues: {},
  }

  for (const [key, output] of Object.entries(outputs)) {
    state.outputValues[key] = output.value
    state.outputEnvVars[key] = output.env_var
  }

  return state
}

const buildRuntimeProviderOutputs = (
  state: RuntimeProviderState,
): RuntimeProviderOutputs =>
  Object.fromEntries(
    Object.keys(state.outputValues).map((key) => [
      key,
      {
        env_var: state.outputEnvVars[key] ?? "",
        value: state.outputValues[key] ?? "",
      },
    ]),
  )

export const buildRuntimeProviderRenderContext = (
  state: RuntimeProviderState,
) => ({
  runtimeProviderOutputs: buildRuntimeProviderOutputs(state),
})

export const collectConfiguredRuntimeProviderNeeds = (input: {
  lane: ResolveTargetsPayload["lane"]
  manifest: StackManifest
  stackInputs: StackInputs
  services: { id: string }[]
  meiliApiCredentialsProviderId: string
}): RuntimeProviderNeed[] =>
  resolveRuntimeProviderNeeds({
    lane: input.lane,
    manifest: input.manifest,
    meiliApiCredentialsProviderId: input.meiliApiCredentialsProviderId,
    providerIds: listActiveRuntimeProviderIdsForLane(
      input.stackInputs,
      input.lane,
    ),
    serviceIds: input.services.map((service) => service.id),
    stackInputs: input.stackInputs,
  })

const buildConsumerResolveTargets = (
  planServices: readonly { id: string; service_slug: string }[],
  consumerServiceIds: ReadonlySet<string>,
): { service_id: string; service_slug: string }[] => {
  const services: { service_id: string; service_slug: string }[] = []

  for (const service of planServices) {
    if (consumerServiceIds.has(service.id)) {
      services.push({
        service_id: service.id,
        service_slug: service.service_slug,
      })
    }
  }

  return services
}

const reuseRuntimeProviderOutputForNeed = async (input: {
  adapter: RuntimeProviderAdapter
  context: ReuseRuntimeProviderOutputsContext
  need: RuntimeProviderNeed
}): Promise<void> => {
  const { adapter, context, need } = input

  const sourceInPlan = context.planServices.some(
    (service) => service.id === need.sourceServiceId,
  )
  if (sourceInPlan || context.dryRun) {
    return
  }

  if (!need.laneBehavior.reuse_persisted_outputs) {
    return
  }

  const consumerServiceIds = new Set(
    Object.values(need.outputConsumerIds).flat(),
  )
  const targets = await executeResolveTargetsPayload({
    apiToken: context.apiToken,
    baseUrl: context.baseUrl,
    dryRun: false,
    payload: {
      environment_name: context.environmentName,
      lane: context.lane,
      project_slug: context.projectSlug,
      services: buildConsumerResolveTargets(
        context.planServices,
        consumerServiceIds,
      ),
    },
  })
  adapter.reusePersisted({
    need,
    stackInputs: context.stackInputs,
    state: context.state,
    targets: targets.services,
  })

  if (missingOutputIds(need, context.state).length === 0) {
    context.onProgress(
      `Reusing persisted ${need.label} from current healthy ${context.lane} consumer deployments.`,
    )
    return
  }

  if (!need.laneBehavior.reconcile_when_source_not_in_plan) {
    return
  }

  context.onProgress(
    `${need.label} source service ${need.sourceServiceId} is not in this deploy plan and persisted consumer envs are incomplete; reconciling required outputs before deploy stages.`,
  )
  await adapter.provision({
    apiToken: context.apiToken,
    baseUrl: context.baseUrl,
    dryRun: context.dryRun,
    environmentName: context.environmentName,
    need,
    outputIds: missingOutputIds(need, context.state),
    projectSlug: context.projectSlug,
    stackInputs: context.stackInputs,
    state: context.state,
  })
  context.onProgress(`${need.label} resolved for ${context.lane} consumers.`)
}

// Needs are reconciled one at a time because every need mutates the shared
// runtime provider state and issues operator calls whose ordering matches the
// emitted progress messages, so the queue is walked through recursion instead
// of being fanned out, and it terminates when the remaining queue is empty.
const reuseRuntimeProviderOutputsSequentially = async (input: {
  adaptersById: ReadonlyMap<string, RuntimeProviderAdapter>
  context: ReuseRuntimeProviderOutputsContext
  needs: readonly RuntimeProviderNeed[]
}): Promise<void> => {
  const [need, ...remainingNeeds] = input.needs
  if (need === undefined) {
    return
  }

  const adapter = input.adaptersById.get(need.providerId)
  if (adapter !== undefined) {
    await reuseRuntimeProviderOutputForNeed({
      adapter,
      context: input.context,
      need,
    })
  }

  await reuseRuntimeProviderOutputsSequentially({
    adaptersById: input.adaptersById,
    context: input.context,
    needs: remainingNeeds,
  })
}

export const reuseRuntimeProviderOutputs = async (input: {
  lane: ResolveTargetsPayload["lane"]
  projectSlug: string
  environmentName: string
  planServices: { id: string; service_slug: string }[]
  needs: RuntimeProviderNeed[]
  stackInputs: StackInputs
  baseUrl: string
  apiToken: string
  dryRun: boolean
  state: RuntimeProviderState
  meiliApiCredentialsProviderId: string
  onProgress: (message: string) => void
}): Promise<void> => {
  await reuseRuntimeProviderOutputsSequentially({
    adaptersById: buildRuntimeProviderAdaptersById(
      input.meiliApiCredentialsProviderId,
    ),
    context: {
      apiToken: input.apiToken,
      baseUrl: input.baseUrl,
      dryRun: input.dryRun,
      environmentName: input.environmentName,
      lane: input.lane,
      onProgress: input.onProgress,
      planServices: input.planServices,
      projectSlug: input.projectSlug,
      stackInputs: input.stackInputs,
      state: input.state,
    },
    needs: input.needs,
  })
}

// The first plan entry wins for a duplicated service id so the lookup keeps the
// exact result the previous per-need `Array.prototype.find` scan returned.
const buildDeployStagesByServiceId = (
  fullPlanServices: readonly {
    id: string
    service_slug: string
    deploy_stage: number
  }[],
): ReadonlyMap<string, number> => {
  const deployStagesByServiceId = new Map<string, number>()

  for (const service of fullPlanServices) {
    if (!deployStagesByServiceId.has(service.id)) {
      deployStagesByServiceId.set(service.id, service.deploy_stage)
    }
  }

  return deployStagesByServiceId
}

const ensureStageRuntimeProviderOutputForNeed = async (input: {
  adapter: RuntimeProviderAdapter
  context: StageRuntimeProviderOutputsContext
  need: RuntimeProviderNeed
}): Promise<void> => {
  const { adapter, context, need } = input

  if (
    !stageNeedsProvider({
      need,
      stageServiceIds: context.stageServiceIds,
    })
  ) {
    return
  }

  const stageMissingOutputIds = missingStageOutputIds({
    need,
    stageServiceIds: context.stageServiceIds,
    state: context.state,
  })
  if (stageMissingOutputIds.length === 0) {
    return
  }

  const sourceStage = context.deployStagesByServiceId.get(need.sourceServiceId)
  if (
    sourceStage !== null &&
    sourceStage !== undefined &&
    sourceStage >= context.stage
  ) {
    throw new Error(
      `${need.label} source service ${need.sourceServiceId} must be healthy before consumer stage ${context.stage}.`,
    )
  }

  context.onProgress(
    `Stage ${context.stage} consumes ${need.label}; reconciling only the required outputs before env overrides.`,
  )
  await adapter.provision({
    apiToken: context.apiToken,
    baseUrl: context.baseUrl,
    dryRun: context.dryRun,
    environmentName: context.environmentName,
    need,
    outputIds: stageMissingOutputIds,
    projectSlug: context.projectSlug,
    stackInputs: context.stackInputs,
    state: context.state,
  })
  context.onProgress(`${need.label} resolved for stage ${context.stage}.`)
}

// Stage needs are reconciled one at a time because every need mutates the
// shared runtime provider state and a failing need must abort before the next
// one runs, so the queue is walked through recursion instead of being fanned
// out, and it terminates when the remaining queue is empty.
const ensureStageRuntimeProviderOutputsSequentially = async (input: {
  adaptersById: ReadonlyMap<string, RuntimeProviderAdapter>
  context: StageRuntimeProviderOutputsContext
  needs: readonly RuntimeProviderNeed[]
}): Promise<void> => {
  const [need, ...remainingNeeds] = input.needs
  if (need === undefined) {
    return
  }

  const adapter = input.adaptersById.get(need.providerId)
  if (adapter !== undefined) {
    await ensureStageRuntimeProviderOutputForNeed({
      adapter,
      context: input.context,
      need,
    })
  }

  await ensureStageRuntimeProviderOutputsSequentially({
    adaptersById: input.adaptersById,
    context: input.context,
    needs: remainingNeeds,
  })
}

export const ensureStageRuntimeProviderOutputs = async (input: {
  lane: ResolveTargetsPayload["lane"]
  stage: number
  stageServices: { id: string; service_slug: string }[]
  fullPlanServices: {
    id: string
    service_slug: string
    deploy_stage: number
  }[]
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
}): Promise<void> => {
  await ensureStageRuntimeProviderOutputsSequentially({
    adaptersById: buildRuntimeProviderAdaptersById(
      input.meiliApiCredentialsProviderId,
    ),
    context: {
      apiToken: input.apiToken,
      baseUrl: input.baseUrl,
      deployStagesByServiceId: buildDeployStagesByServiceId(
        input.fullPlanServices,
      ),
      dryRun: input.dryRun,
      environmentName: input.environmentName,
      onProgress: input.onProgress,
      projectSlug: input.projectSlug,
      stackInputs: input.stackInputs,
      stage: input.stage,
      stageServiceIds: new Set(
        input.stageServices.map((service) => service.id),
      ),
      state: input.state,
    },
    needs: input.needs,
  })
}

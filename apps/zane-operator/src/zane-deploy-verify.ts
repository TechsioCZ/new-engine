import { BadRequestError } from "./db"
import { UpstreamHttpError } from "./zane-errors"
import { assertEnvironmentMatchesLane } from "./zane-lane-environment"
import type { ZaneSession } from "./zane-upstream"

interface VerifyEnvOverrideInput {
  service_id: string
  service_slug: string
  env: Record<string, string>
}

interface VerifyPersistedEnvRequirement {
  service_id: string
  service_slug: string
  env_keys: string[]
}

interface VerifyForbiddenEnvRequirement {
  service_id: string
  service_slug: string
  env_keys: string[]
}

interface VerifySharedEnvRequirement {
  key: string
}

interface VerifyDeploymentRefInput {
  service_id: string
  service_slug: string
  deployment_hash: string
}

interface VerifyDeployRequest {
  lane: "preview" | "main"
  projectSlug: string
  environmentName: string
  requestedServiceIds: string[]
  deployServiceIds: string[]
  triggeredServiceIds: string[]
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
  expectedEnvOverrides: VerifyEnvOverrideInput[]
  requiredPersistedEnv: VerifyPersistedEnvRequirement[]
  requiredSharedEnv: VerifySharedEnvRequirement[]
  forbiddenEnv: VerifyForbiddenEnvRequirement[]
  deployments: VerifyDeploymentRefInput[]
}

interface VerifyEnvironmentLookup {
  is_preview: boolean
  name: string
  variables?: {
    key: string
    value: string
  }[]
}

interface VerifyServiceCard {
  slug: string
}

interface VerifyEnvVariable {
  key: string
  value: string
}

interface VerifyDeployment {
  hash: string
  status: string
  status_reason?: string | null
  is_current_production?: boolean
  service_snapshot?: {
    env_variables?: VerifyEnvVariable[]
  }
}

interface VerifyDeps {
  authenticate: () => Promise<ZaneSession>
  getEnvironment: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ) => Promise<VerifyEnvironmentLookup | null>
  listServiceCards: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ) => Promise<VerifyServiceCard[]>
  getDeployment: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    deploymentHash: string,
  ) => Promise<VerifyDeployment>
  listDeployments: (
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ) => Promise<VerifyDeployment[]>
}

interface CheckedDeploymentResult {
  service_id: string
  service_slug: string
  deployment_hash: string
  status: string
  status_reason: string | null
}

const sortUnique = (values: string[]): string[] =>
  [...new Set(values)].toSorted((left, right) => left.localeCompare(right))

const assertRepoServiceIdSubset = (
  values: string[],
  allowed: Set<string>,
  label: string,
  parentLabel: string,
): void => {
  for (const value of values) {
    if (!allowed.has(value)) {
      throw new BadRequestError(
        `${parentLabel} contains ${label} outside deploy_service_ids: ${value}`,
      )
    }
  }
}

const buildVerifyServiceSlugByRepoId = (
  expectedEnvOverrides: VerifyEnvOverrideInput[],
  requiredPersistedEnv: VerifyPersistedEnvRequirement[],
  forbiddenEnv: VerifyForbiddenEnvRequirement[],
  deployments: VerifyDeploymentRefInput[],
): Map<string, string> => {
  const mapping = new Map<string, string>()
  const register = (
    repoServiceId: string,
    upstreamServiceSlug: string,
    label: string,
  ): void => {
    const existing = mapping.get(repoServiceId)
    if (
      existing !== undefined &&
      existing !== "" &&
      existing !== upstreamServiceSlug
    ) {
      throw new BadRequestError(
        `${label} maps repo service_id ${repoServiceId} to conflicting service_slug values: ${existing} vs ${upstreamServiceSlug}`,
      )
    }
    mapping.set(repoServiceId, upstreamServiceSlug)
  }

  for (const override of expectedEnvOverrides) {
    register(
      override.service_id,
      override.service_slug,
      "expected_env_overrides",
    )
  }

  for (const requirement of requiredPersistedEnv) {
    register(
      requirement.service_id,
      requirement.service_slug,
      "required_persisted_env",
    )
  }

  for (const requirement of forbiddenEnv) {
    register(requirement.service_id, requirement.service_slug, "forbidden_env")
  }

  for (const deployment of deployments) {
    register(deployment.service_id, deployment.service_slug, "deployments")
  }

  return mapping
}

const verifyPreviewServiceSet = (input: {
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
  presentServiceSlugs: string[]
  projectSlug: string
  environmentName: string
}): {
  checkedPreviewClonedServiceSlugs: string[]
  warningOnlyPreviewServiceSlugs: string[]
} => {
  const expectedPreviewServiceSlugs = sortUnique(
    input.expectedPreviewServiceSlugs,
  )
  const excludedPreviewServiceSlugs = sortUnique(
    input.excludedPreviewServiceSlugs,
  )
  const presentServiceSlugs = sortUnique(input.presentServiceSlugs)
  const presentSet = new Set(presentServiceSlugs)
  const expectedSet = new Set(expectedPreviewServiceSlugs)
  const excludedSet = new Set(excludedPreviewServiceSlugs)
  const missingPreviewServiceSlugs = expectedPreviewServiceSlugs.filter(
    (slug) => !presentSet.has(slug),
  )

  if (missingPreviewServiceSlugs.length > 0) {
    throw new UpstreamHttpError(
      409,
      "zane_verify_preview_service_missing",
      `Preview environment ${input.projectSlug}/${input.environmentName} is missing expected cloned services: ${missingPreviewServiceSlugs.join(", ")}`,
    )
  }

  const excludedPresentServiceSlugs = excludedPreviewServiceSlugs.filter(
    (slug) => presentSet.has(slug),
  )
  const extraPresentServiceSlugs = presentServiceSlugs.filter(
    (slug) => !expectedSet.has(slug) && !excludedSet.has(slug),
  )

  return {
    checkedPreviewClonedServiceSlugs: expectedPreviewServiceSlugs,
    warningOnlyPreviewServiceSlugs: sortUnique([
      ...excludedPresentServiceSlugs,
      ...extraPresentServiceSlugs,
    ]),
  }
}

interface PreviewServiceVerification {
  checkedPreviewClonedServiceSlugs: string[]
  warningOnlyPreviewServiceSlugs: string[]
}

interface VerifyDeployResult {
  lane: "preview" | "main"
  project_slug: string
  environment_name: string
  verified: boolean
  requested_service_ids: string[]
  deploy_service_ids: string[]
  triggered_service_ids: string[]
  checked_preview_cloned_service_slugs: string[]
  warning_only_preview_service_slugs: string[]
  checked_env_override_service_ids: string[]
  checked_persisted_env_service_ids: string[]
  checked_shared_env_keys: string[]
  checked_forbidden_env_service_ids: string[]
  checked_deployment_service_ids: string[]
  checked_deployments: CheckedDeploymentResult[]
}

interface ResolvedDeployment {
  checkedServiceSlug: string
  deployment: VerifyDeployment
  repoServiceId: string
}

const verifyRequiredSharedEnvironment = (
  input: VerifyDeployRequest,
  environment: VerifyEnvironmentLookup,
): void => {
  const sharedEnvVariables = new Map(
    (environment.variables ?? []).map((envVar) => [envVar.key, envVar.value]),
  )

  for (const requirement of input.requiredSharedEnv) {
    const value = sharedEnvVariables.get(requirement.key)
    if (typeof value !== "string" || value.length === 0) {
      throw new UpstreamHttpError(
        409,
        "zane_verify_shared_env_missing",
        `Environment ${input.projectSlug}/${input.environmentName} is missing required shared env key ${requirement.key}`,
      )
    }
  }
}

const getPreviewServiceVerification = (
  input: VerifyDeployRequest,
  services: VerifyServiceCard[],
): PreviewServiceVerification =>
  input.lane === "preview"
    ? verifyPreviewServiceSet({
        environmentName: input.environmentName,
        excludedPreviewServiceSlugs: input.excludedPreviewServiceSlugs,
        expectedPreviewServiceSlugs: input.expectedPreviewServiceSlugs,
        presentServiceSlugs: services.map((service) => service.slug),
        projectSlug: input.projectSlug,
      })
    : {
        checkedPreviewClonedServiceSlugs: [],
        warningOnlyPreviewServiceSlugs: [],
      }

const assertVerifyServiceIdSubsets = (
  input: VerifyDeployRequest,
  deployRepoServiceIdSet: Set<string>,
): void => {
  assertRepoServiceIdSubset(
    input.requestedServiceIds,
    deployRepoServiceIdSet,
    "requested_service_id",
    "requested_service_ids",
  )
  assertRepoServiceIdSubset(
    input.triggeredServiceIds,
    deployRepoServiceIdSet,
    "triggered_service_id",
    "triggered_service_ids",
  )
  assertRepoServiceIdSubset(
    input.expectedEnvOverrides.map((item) => item.service_id),
    deployRepoServiceIdSet,
    "expected_env_override.service_id",
    "expected_env_overrides",
  )
  assertRepoServiceIdSubset(
    input.requiredPersistedEnv.map((item) => item.service_id),
    deployRepoServiceIdSet,
    "required_persisted_env.service_id",
    "required_persisted_env",
  )
  assertRepoServiceIdSubset(
    input.deployments.map((item) => item.service_id),
    deployRepoServiceIdSet,
    "deployment.service_id",
    "deployments",
  )
  assertRepoServiceIdSubset(
    input.forbiddenEnv.map((item) => item.service_id),
    deployRepoServiceIdSet,
    "forbidden_env.service_id",
    "forbidden_env",
  )
}

const buildDeploymentRefByServiceId = (
  deployments: VerifyDeploymentRefInput[],
): Map<string, VerifyDeploymentRefInput> => {
  const deploymentRefByServiceId = new Map<string, VerifyDeploymentRefInput>()
  for (const deploymentRef of deployments) {
    if (deploymentRefByServiceId.has(deploymentRef.service_id)) {
      throw new BadRequestError(
        `deployments contains duplicate service_id: ${deploymentRef.service_id}`,
      )
    }
    deploymentRefByServiceId.set(deploymentRef.service_id, deploymentRef)
  }
  return deploymentRefByServiceId
}

const assertDeployServicesExist = (
  input: VerifyDeployRequest,
  serviceCardBySlug: Map<string, VerifyServiceCard>,
  verifyServiceSlugByRepoId: Map<string, string>,
): void => {
  for (const repoServiceId of input.deployServiceIds) {
    const upstreamServiceSlug =
      verifyServiceSlugByRepoId.get(repoServiceId) ?? repoServiceId
    if (!serviceCardBySlug.has(upstreamServiceSlug)) {
      throw new UpstreamHttpError(
        404,
        "zane_service_not_found",
        `Expected deploy target ${repoServiceId} (resolved as ${upstreamServiceSlug}) was not found in ${input.projectSlug}/${input.environmentName}`,
      )
    }
  }
}

const resolveDeployment = async (options: {
  deps: VerifyDeps
  input: VerifyDeployRequest
  session: ZaneSession
  repoServiceId: string
  serviceCardBySlug: Map<string, VerifyServiceCard>
  verifyServiceSlugByRepoId: Map<string, string>
  deploymentRefByServiceId: Map<string, VerifyDeploymentRefInput>
  triggeredRepoServiceIdSet: Set<string>
}): Promise<ResolvedDeployment> => {
  const upstreamServiceSlug =
    options.verifyServiceSlugByRepoId.get(options.repoServiceId) ??
    options.repoServiceId
  const serviceCard = options.serviceCardBySlug.get(upstreamServiceSlug)
  if (serviceCard === undefined) {
    throw new UpstreamHttpError(
      404,
      "zane_service_not_found",
      `Expected deploy target ${options.repoServiceId} (resolved as ${upstreamServiceSlug}) was not found in ${options.input.projectSlug}/${options.input.environmentName}`,
    )
  }

  const deploymentRef = options.deploymentRefByServiceId.get(
    options.repoServiceId,
  )
  if (deploymentRef !== undefined) {
    return {
      checkedServiceSlug: deploymentRef.service_slug,
      deployment: await options.deps.getDeployment(
        options.session,
        options.input.projectSlug,
        options.input.environmentName,
        serviceCard.slug,
        deploymentRef.deployment_hash,
      ),
      repoServiceId: options.repoServiceId,
    }
  }

  if (
    options.input.lane === "preview" &&
    options.triggeredRepoServiceIdSet.has(options.repoServiceId)
  ) {
    throw new UpstreamHttpError(
      409,
      "zane_verify_deployment_missing",
      `No checked deployment was provided for ${serviceCard.slug}`,
    )
  }

  const deployments = await options.deps.listDeployments(
    options.session,
    options.input.projectSlug,
    options.input.environmentName,
    serviceCard.slug,
  )
  const currentHealthy = deployments.find(
    (candidate) =>
      candidate.is_current_production === true &&
      candidate.status.toUpperCase() === "HEALTHY",
  )
  if (currentHealthy === undefined) {
    throw new UpstreamHttpError(
      409,
      "zane_verify_deployment_missing",
      options.input.lane === "main"
        ? `No checked deployment or current healthy production deployment was found for ${serviceCard.slug}`
        : `No checked deployment or current healthy deployment was found for ${serviceCard.slug}`,
    )
  }

  return {
    checkedServiceSlug: serviceCard.slug,
    deployment: currentHealthy,
    repoServiceId: options.repoServiceId,
  }
}

const resolveDeployments = async (
  options: {
    deps: VerifyDeps
    input: VerifyDeployRequest
    session: ZaneSession
    serviceCardBySlug: Map<string, VerifyServiceCard>
    verifyServiceSlugByRepoId: Map<string, string>
    deploymentRefByServiceId: Map<string, VerifyDeploymentRefInput>
    triggeredRepoServiceIdSet: Set<string>
  },
  index = 0,
  resolvedDeployments: ResolvedDeployment[] = [],
): Promise<ResolvedDeployment[]> => {
  const repoServiceId = options.input.deployServiceIds[index]
  if (repoServiceId === undefined) {
    return resolvedDeployments
  }

  const resolvedDeployment = await resolveDeployment({
    ...options,
    repoServiceId,
  })
  resolvedDeployments.push(resolvedDeployment)
  return await resolveDeployments(options, index + 1, resolvedDeployments)
}

const verifyExpectedEnvOverride = (
  expectedOverride: VerifyEnvOverrideInput | undefined,
  envVariables: Map<string, string>,
  deployment: VerifyDeployment,
  checkedServiceSlug: string,
): void => {
  if (expectedOverride === undefined) {
    return
  }

  for (const [key, value] of Object.entries(expectedOverride.env)) {
    if (envVariables.get(key) !== value) {
      throw new UpstreamHttpError(
        409,
        "zane_verify_env_mismatch",
        `Deployment ${deployment.hash} for ${checkedServiceSlug} is missing expected ${key} value`,
      )
    }
  }
}

const verifyPersistedEnv = (
  requirement: VerifyPersistedEnvRequirement | undefined,
  envVariables: Map<string, string>,
  deployment: VerifyDeployment,
  checkedServiceSlug: string,
): void => {
  if (requirement === undefined) {
    return
  }

  for (const key of requirement.env_keys) {
    const value = envVariables.get(key)
    if (typeof value !== "string" || value.length === 0) {
      throw new UpstreamHttpError(
        409,
        "zane_verify_persisted_env_missing",
        `Deployment ${deployment.hash} for ${checkedServiceSlug} is missing required persisted env key ${key}`,
      )
    }
  }
}

const verifyForbiddenEnv = (
  requirement: VerifyForbiddenEnvRequirement | undefined,
  envVariables: Map<string, string>,
  deployment: VerifyDeployment,
  checkedServiceSlug: string,
): void => {
  if (requirement === undefined) {
    return
  }

  for (const key of requirement.env_keys) {
    if (envVariables.has(key)) {
      throw new UpstreamHttpError(
        409,
        "zane_verify_forbidden_env_present",
        `Deployment ${deployment.hash} for ${checkedServiceSlug} still contains preview-only env key ${key}`,
      )
    }
  }
}

const verifyResolvedDeployment = (
  resolved: ResolvedDeployment,
  expectedOverrideByServiceId: Map<string, VerifyEnvOverrideInput>,
  requiredPersistedEnvByServiceId: Map<string, VerifyPersistedEnvRequirement>,
  forbiddenEnvByServiceId: Map<string, VerifyForbiddenEnvRequirement>,
): CheckedDeploymentResult => {
  const envVariables = new Map(
    (resolved.deployment.service_snapshot?.env_variables ?? []).map(
      (envVar) => [envVar.key, envVar.value],
    ),
  )
  verifyExpectedEnvOverride(
    expectedOverrideByServiceId.get(resolved.repoServiceId),
    envVariables,
    resolved.deployment,
    resolved.checkedServiceSlug,
  )
  verifyPersistedEnv(
    requiredPersistedEnvByServiceId.get(resolved.repoServiceId),
    envVariables,
    resolved.deployment,
    resolved.checkedServiceSlug,
  )
  verifyForbiddenEnv(
    forbiddenEnvByServiceId.get(resolved.repoServiceId),
    envVariables,
    resolved.deployment,
    resolved.checkedServiceSlug,
  )

  return {
    deployment_hash: resolved.deployment.hash,
    service_id: resolved.repoServiceId,
    service_slug: resolved.checkedServiceSlug,
    status: resolved.deployment.status,
    status_reason:
      resolved.deployment.status.toUpperCase() === "HEALTHY"
        ? null
        : (resolved.deployment.status_reason ?? null),
  }
}

export class ZaneDeployVerifier {
  readonly #deps: VerifyDeps

  constructor(deps: VerifyDeps) {
    this.#deps = deps
  }

  async verify(input: VerifyDeployRequest): Promise<VerifyDeployResult> {
    const session = await this.#deps.authenticate()
    const environment = await this.#deps.getEnvironment(
      session,
      input.projectSlug,
      input.environmentName,
    )
    if (environment === null) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }
    assertEnvironmentMatchesLane(environment, input.lane)
    verifyRequiredSharedEnvironment(input, environment)

    const services = await this.#deps.listServiceCards(
      session,
      input.projectSlug,
      input.environmentName,
    )
    const previewServiceVerification = getPreviewServiceVerification(
      input,
      services,
    )
    const serviceCardBySlug = new Map(
      services.map((service) => [service.slug, service]),
    )
    const deployRepoServiceIdSet = new Set(input.deployServiceIds)
    const verifyServiceSlugByRepoId = buildVerifyServiceSlugByRepoId(
      input.expectedEnvOverrides,
      input.requiredPersistedEnv,
      input.forbiddenEnv,
      input.deployments,
    )
    assertVerifyServiceIdSubsets(input, deployRepoServiceIdSet)
    assertDeployServicesExist(
      input,
      serviceCardBySlug,
      verifyServiceSlugByRepoId,
    )

    const expectedOverrideByServiceId = new Map(
      input.expectedEnvOverrides.map((item) => [item.service_id, item]),
    )
    const requiredPersistedEnvByServiceId = new Map(
      input.requiredPersistedEnv.map((item) => [item.service_id, item]),
    )
    const forbiddenEnvByServiceId = new Map(
      input.forbiddenEnv.map((item) => [item.service_id, item]),
    )
    const deploymentRefByServiceId = buildDeploymentRefByServiceId(
      input.deployments,
    )
    const resolvedDeployments = await resolveDeployments({
      deploymentRefByServiceId,
      deps: this.#deps,
      input,
      serviceCardBySlug,
      session,
      triggeredRepoServiceIdSet: new Set(input.triggeredServiceIds),
      verifyServiceSlugByRepoId,
    })
    const checkedDeployments = resolvedDeployments.map((resolved) =>
      verifyResolvedDeployment(
        resolved,
        expectedOverrideByServiceId,
        requiredPersistedEnvByServiceId,
        forbiddenEnvByServiceId,
      ),
    )

    if (input.deployServiceIds.length > 0 && checkedDeployments.length === 0) {
      throw new UpstreamHttpError(
        409,
        "zane_verify_no_deployments_checked",
        "Deploy verification did not check any deployments for the requested deploy_service_ids",
      )
    }

    return {
      checked_deployment_service_ids: checkedDeployments.map(
        (item) => item.service_id,
      ),
      checked_deployments: checkedDeployments,
      checked_env_override_service_ids: input.expectedEnvOverrides.map(
        (item) => item.service_id,
      ),
      checked_forbidden_env_service_ids: input.forbiddenEnv.map(
        (item) => item.service_id,
      ),
      checked_persisted_env_service_ids: input.requiredPersistedEnv.map(
        (item) => item.service_id,
      ),
      checked_preview_cloned_service_slugs:
        previewServiceVerification.checkedPreviewClonedServiceSlugs,
      checked_shared_env_keys: input.requiredSharedEnv.map((item) => item.key),
      deploy_service_ids: input.deployServiceIds,
      environment_name: input.environmentName,
      lane: input.lane,
      project_slug: input.projectSlug,
      requested_service_ids: input.requestedServiceIds,
      triggered_service_ids: input.triggeredServiceIds,
      verified: true,
      warning_only_preview_service_slugs:
        previewServiceVerification.warningOnlyPreviewServiceSlugs,
    }
  }
}

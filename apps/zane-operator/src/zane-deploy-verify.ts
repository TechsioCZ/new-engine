import { BadRequestError } from "./db"
import { UpstreamHttpError } from "./zane-errors"
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
  forbiddenEnv: VerifyForbiddenEnvRequirement[]
  deployments: VerifyDeploymentRefInput[]
}

interface VerifyEnvironmentLookup {
  is_preview: boolean
  name: string
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
  authenticate(): Promise<ZaneSession>
  getEnvironment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<VerifyEnvironmentLookup | null>
  listServiceCards(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
  ): Promise<VerifyServiceCard[]>
  getDeployment(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
    deploymentHash: string,
  ): Promise<VerifyDeployment>
  listDeployments(
    session: ZaneSession,
    projectSlug: string,
    environmentName: string,
    serviceSlug: string,
  ): Promise<VerifyDeployment[]>
}

interface CheckedDeploymentResult {
  service_id: string
  service_slug: string
  deployment_hash: string
  status: string
  status_reason: string | null
}

function sortUnique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}

function assertRepoServiceIdSubset(
  values: string[],
  allowed: Set<string>,
  label: string,
  parentLabel: string,
): void {
  for (const value of values) {
    if (!allowed.has(value)) {
      throw new BadRequestError(`${parentLabel} contains ${label} outside deploy_service_ids: ${value}`)
    }
  }
}

function buildVerifyServiceSlugByRepoId(
  expectedEnvOverrides: VerifyEnvOverrideInput[],
  requiredPersistedEnv: VerifyPersistedEnvRequirement[],
  forbiddenEnv: VerifyForbiddenEnvRequirement[],
  deployments: VerifyDeploymentRefInput[],
): Map<string, string> {
  const mapping = new Map<string, string>()
  const register = (repoServiceId: string, upstreamServiceSlug: string, label: string): void => {
    const existing = mapping.get(repoServiceId)
    if (existing && existing !== upstreamServiceSlug) {
      throw new BadRequestError(
        `${label} maps repo service_id ${repoServiceId} to conflicting service_slug values: ${existing} vs ${upstreamServiceSlug}`,
      )
    }
    mapping.set(repoServiceId, upstreamServiceSlug)
  }

  for (const override of expectedEnvOverrides) {
    register(override.service_id, override.service_slug, "expected_env_overrides")
  }

  for (const requirement of requiredPersistedEnv) {
    register(requirement.service_id, requirement.service_slug, "required_persisted_env")
  }

  for (const requirement of forbiddenEnv) {
    register(requirement.service_id, requirement.service_slug, "forbidden_env")
  }

  for (const deployment of deployments) {
    register(deployment.service_id, deployment.service_slug, "deployments")
  }

  return mapping
}

function assertEnvironmentMatchesLane(environment: VerifyEnvironmentLookup, lane: "preview" | "main"): void {
  if (lane === "main" && environment.is_preview) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} is a preview environment and cannot be used for main lane operations`,
    )
  }

  if (lane === "preview" && !environment.is_preview) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} is not a preview environment and cannot be used for preview lane operations`,
    )
  }
}

function verifyPreviewServiceSet(input: {
  expectedPreviewServiceSlugs: string[]
  excludedPreviewServiceSlugs: string[]
  presentServiceSlugs: string[]
  projectSlug: string
  environmentName: string
}): {
  checkedPreviewClonedServiceSlugs: string[]
  warningOnlyPreviewServiceSlugs: string[]
} {
  const expectedPreviewServiceSlugs = sortUnique(input.expectedPreviewServiceSlugs)
  const excludedPreviewServiceSlugs = sortUnique(input.excludedPreviewServiceSlugs)
  const presentServiceSlugs = sortUnique(input.presentServiceSlugs)
  const presentSet = new Set(presentServiceSlugs)
  const expectedSet = new Set(expectedPreviewServiceSlugs)
  const excludedSet = new Set(excludedPreviewServiceSlugs)
  const missingPreviewServiceSlugs = expectedPreviewServiceSlugs.filter(
    (slug) => !presentSet.has(slug)
  )

  if (missingPreviewServiceSlugs.length > 0) {
    throw new UpstreamHttpError(
      409,
      "zane_verify_preview_service_missing",
      `Preview environment ${input.projectSlug}/${input.environmentName} is missing expected cloned services: ${missingPreviewServiceSlugs.join(", ")}`,
    )
  }

  const excludedPresentServiceSlugs = excludedPreviewServiceSlugs.filter((slug) =>
    presentSet.has(slug)
  )
  const extraPresentServiceSlugs = presentServiceSlugs.filter(
    (slug) => !expectedSet.has(slug) && !excludedSet.has(slug)
  )

  return {
    checkedPreviewClonedServiceSlugs: expectedPreviewServiceSlugs,
    warningOnlyPreviewServiceSlugs: sortUnique([
      ...excludedPresentServiceSlugs,
      ...extraPresentServiceSlugs,
    ]),
  }
}

export class ZaneDeployVerifier {
  readonly #deps: VerifyDeps

  constructor(deps: VerifyDeps) {
    this.#deps = deps
  }

  async verify(input: VerifyDeployRequest): Promise<{
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
    checked_forbidden_env_service_ids: string[]
    checked_deployment_service_ids: string[]
    checked_deployments: CheckedDeploymentResult[]
  }> {
    const session = await this.#deps.authenticate()
    const environment = await this.#deps.getEnvironment(session, input.projectSlug, input.environmentName)
    if (!environment) {
      throw new UpstreamHttpError(
        404,
        "zane_environment_not_found",
        `Environment ${input.environmentName} does not exist in project ${input.projectSlug}`,
      )
    }
    assertEnvironmentMatchesLane(environment, input.lane)

    const services = await this.#deps.listServiceCards(session, input.projectSlug, input.environmentName)
    const previewServiceVerification =
      input.lane === "preview"
        ? verifyPreviewServiceSet({
      expectedPreviewServiceSlugs: input.expectedPreviewServiceSlugs,
      excludedPreviewServiceSlugs: input.excludedPreviewServiceSlugs,
      presentServiceSlugs: services.map((service) => service.slug),
            projectSlug: input.projectSlug,
            environmentName: input.environmentName,
          })
        : {
            checkedPreviewClonedServiceSlugs: [] as string[],
            warningOnlyPreviewServiceSlugs: [] as string[],
          }
    const serviceCardBySlug = new Map(services.map((service) => [service.slug, service]))
    const deployRepoServiceIdSet = new Set(input.deployServiceIds)
    const verifyServiceSlugByRepoId = buildVerifyServiceSlugByRepoId(
      input.expectedEnvOverrides,
      input.requiredPersistedEnv,
      input.forbiddenEnv,
      input.deployments,
    )

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

    const expectedOverrideByServiceId = new Map(input.expectedEnvOverrides.map((item) => [item.service_id, item]))
    const requiredPersistedEnvByServiceId = new Map(input.requiredPersistedEnv.map((item) => [item.service_id, item]))
    const forbiddenEnvByServiceId = new Map(input.forbiddenEnv.map((item) => [item.service_id, item]))
    const deploymentRefByServiceId = new Map<string, VerifyDeploymentRefInput>()
    for (const deploymentRef of input.deployments) {
      if (deploymentRefByServiceId.has(deploymentRef.service_id)) {
        throw new BadRequestError(`deployments contains duplicate service_id: ${deploymentRef.service_id}`)
      }
      deploymentRefByServiceId.set(deploymentRef.service_id, deploymentRef)
    }

    for (const repoServiceId of input.deployServiceIds) {
      const upstreamServiceSlug = verifyServiceSlugByRepoId.get(repoServiceId) ?? repoServiceId
      if (!serviceCardBySlug.has(upstreamServiceSlug)) {
        throw new UpstreamHttpError(
          404,
          "zane_service_not_found",
          `Expected deploy target ${repoServiceId} (resolved as ${upstreamServiceSlug}) was not found in ${input.projectSlug}/${input.environmentName}`,
        )
      }
    }

    const checkedDeployments: CheckedDeploymentResult[] = []
    const checkedServiceIds = new Set<string>()

    for (const repoServiceId of input.deployServiceIds) {
      const upstreamServiceSlug = verifyServiceSlugByRepoId.get(repoServiceId) ?? repoServiceId
      const serviceCard = serviceCardBySlug.get(upstreamServiceSlug)
      if (!serviceCard) {
        continue
      }

      const expectedOverride = expectedOverrideByServiceId.get(repoServiceId)
      const persistedEnvRequirement = requiredPersistedEnvByServiceId.get(repoServiceId)
      const forbiddenEnvRequirement = forbiddenEnvByServiceId.get(repoServiceId)
      const deploymentRef = deploymentRefByServiceId.get(repoServiceId)

      let deployment: VerifyDeployment
      let checkedServiceSlug = serviceCard.slug

      if (deploymentRef) {
        deployment = await this.#deps.getDeployment(
          session,
          input.projectSlug,
          input.environmentName,
          serviceCard.slug,
          deploymentRef.deployment_hash,
        )
        checkedServiceSlug = deploymentRef.service_slug
      } else if (input.lane === "main") {
        const deployments = await this.#deps.listDeployments(
          session,
          input.projectSlug,
          input.environmentName,
          serviceCard.slug,
        )
        const currentHealthy = deployments.find(
          (candidate) =>
            candidate.is_current_production === true && (candidate.status ?? "").toUpperCase() === "HEALTHY",
        )
        if (!currentHealthy) {
          throw new UpstreamHttpError(
            409,
            "zane_verify_deployment_missing",
            `No checked deployment or current healthy production deployment was found for ${serviceCard.slug}`,
          )
        }
        deployment = currentHealthy
      } else {
        throw new UpstreamHttpError(
          409,
          "zane_verify_deployment_missing",
          `No checked deployment was provided for ${serviceCard.slug}`,
        )
      }

      checkedServiceIds.add(repoServiceId)
      checkedDeployments.push({
        service_id: repoServiceId,
        service_slug: checkedServiceSlug,
        deployment_hash: deployment.hash,
        status: deployment.status,
        status_reason:
          deployment.status.toUpperCase() === "HEALTHY"
            ? null
            : (deployment.status_reason ?? null),
      })

      if (!expectedOverride && !persistedEnvRequirement && !forbiddenEnvRequirement) {
        continue
      }

      const envVariables = new Map(
        (deployment.service_snapshot?.env_variables ?? []).map((envVar) => [envVar.key, envVar.value]),
      )

      if (expectedOverride) {
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

      if (persistedEnvRequirement) {
        for (const key of persistedEnvRequirement.env_keys) {
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

      if (forbiddenEnvRequirement) {
        for (const key of forbiddenEnvRequirement.env_keys) {
          if (envVariables.has(key)) {
            throw new UpstreamHttpError(
              409,
              "zane_verify_forbidden_env_present",
              `Deployment ${deployment.hash} for ${checkedServiceSlug} still contains preview-only env key ${key}`,
            )
          }
        }
      }
    }

    if (input.deployServiceIds.length > 0 && checkedDeployments.length === 0) {
      throw new UpstreamHttpError(
        409,
        "zane_verify_no_deployments_checked",
        "Deploy verification did not check any deployments for the requested deploy_service_ids",
      )
    }

    if (checkedServiceIds.size !== deployRepoServiceIdSet.size) {
      const uncheckedServiceIds = input.deployServiceIds.filter((serviceId) => !checkedServiceIds.has(serviceId))
      throw new UpstreamHttpError(
        409,
        "zane_verify_service_coverage_incomplete",
        `Deploy verification did not cover all deploy_service_ids: ${uncheckedServiceIds.join(", ")}`,
      )
    }

    return {
      lane: input.lane,
      project_slug: input.projectSlug,
      environment_name: input.environmentName,
      verified: true,
      requested_service_ids: input.requestedServiceIds,
      deploy_service_ids: input.deployServiceIds,
      triggered_service_ids: input.triggeredServiceIds,
      checked_preview_cloned_service_slugs:
        previewServiceVerification.checkedPreviewClonedServiceSlugs,
      warning_only_preview_service_slugs:
        previewServiceVerification.warningOnlyPreviewServiceSlugs,
      checked_env_override_service_ids: input.expectedEnvOverrides.map((item) => item.service_id),
      checked_persisted_env_service_ids: input.requiredPersistedEnv.map((item) => item.service_id),
      checked_forbidden_env_service_ids: input.forbiddenEnv.map((item) => item.service_id),
      checked_deployment_service_ids: checkedDeployments.map((item) => item.service_id),
      checked_deployments: checkedDeployments,
    }
  }
}

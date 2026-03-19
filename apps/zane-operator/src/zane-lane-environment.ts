import { UpstreamHttpError } from "./zane-errors"

const REPO_PREVIEW_ENVIRONMENT_NAME = /^pr-\d+$/

interface LaneEnvironment {
  is_preview: boolean
  name: string
}

export function isRepoPreviewEnvironmentName(environmentName: string): boolean {
  return REPO_PREVIEW_ENVIRONMENT_NAME.test(environmentName)
}

export function assertEnvironmentMatchesLane(
  environment: LaneEnvironment,
  lane: "preview" | "main"
): void {
  const isRepoPreview = isRepoPreviewEnvironmentName(environment.name)

  if (lane === "main" && (environment.is_preview || isRepoPreview)) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} is reserved for preview lane operations and cannot be used for main lane operations`
    )
  }

  if (lane === "preview" && !isRepoPreview) {
    throw new UpstreamHttpError(
      409,
      "zane_environment_lane_mismatch",
      `Environment ${environment.name} does not match the required preview environment naming rule pr-<number>`
    )
  }
}

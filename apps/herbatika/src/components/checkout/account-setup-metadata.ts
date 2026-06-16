const ACCOUNT_SETUP_REQUESTED_METADATA_KEY = "account_setup_requested"

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const readAccountSetupRequested = (metadata: unknown): boolean => {
  if (!isRecord(metadata)) {
    return false
  }

  return metadata[ACCOUNT_SETUP_REQUESTED_METADATA_KEY] === true
}

export const buildAccountSetupRequestedMetadata = (
  metadata: unknown,
  requested: boolean
): Record<string, unknown> => ({
  ...(isRecord(metadata) ? metadata : {}),
  [ACCOUNT_SETUP_REQUESTED_METADATA_KEY]: requested,
})

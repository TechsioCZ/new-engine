import { getRecordValue, isRecord } from "@techsio/std/object"

const ACCOUNT_SETUP_REQUESTED_METADATA_KEY = "account_setup_requested"

export const readAccountSetupRequested = (metadata: unknown): boolean => {
  if (!isRecord(metadata)) {
    return false
  }

  return getRecordValue(metadata, ACCOUNT_SETUP_REQUESTED_METADATA_KEY) === true
}

export const buildAccountSetupRequestedMetadata = (
  metadata: unknown,
  requested: boolean,
) => ({
  ...(isRecord(metadata) ? metadata : {}),
  [ACCOUNT_SETUP_REQUESTED_METADATA_KEY]: requested,
})

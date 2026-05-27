import {
  createQueryKey,
  normalizeQueryKeyPart,
  type QueryNamespace,
} from "../shared/query-keys"
import type {
  ActionRequiredListParams,
  ActionRequiredQueryKeys,
  ActionRequiredSummaryParams,
} from "./types"

export function createActionRequiredQueryKeys(
  namespace: QueryNamespace
): ActionRequiredQueryKeys {
  return {
    all: () => createQueryKey(namespace, "action-required"),
    customers: (params: ActionRequiredListParams) =>
      createQueryKey(
        namespace,
        "action-required",
        "customers",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    orders: (params: ActionRequiredListParams) =>
      createQueryKey(
        namespace,
        "action-required",
        "orders",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
    summary: (params: ActionRequiredSummaryParams) =>
      createQueryKey(
        namespace,
        "action-required",
        "summary",
        normalizeQueryKeyPart(params, { omitKeys: ["enabled"] })
      ),
  }
}

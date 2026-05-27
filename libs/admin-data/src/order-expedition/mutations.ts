import type {
  MutationFactoryOptions,
  WriteMutationOptions,
} from "../shared/hook-types"
import type {
  BulkOrderBusinessStatusUpdateInput,
  BulkOrderBusinessStatusUpdateResponse,
  OrderBusinessStatusUpdateInput,
  OrderBusinessStatusUpdateResponse,
  OrderExpeditionPdfInput,
  OrderExpeditionService,
  OrderExpeditionStatusUpdateInput,
  OrderExpeditionStatusUpdateResult,
} from "./types"

type MutationOptionsInput<TData, TVariables> = {
  mutationOptions?: WriteMutationOptions<TData, TVariables>
}

export type OrderExpeditionMutationOptionsFactory = {
  bulkUpdateBusinessStatusMutationOptions: (
    options?: MutationOptionsInput<
      BulkOrderBusinessStatusUpdateResponse,
      BulkOrderBusinessStatusUpdateInput
    >
  ) => MutationFactoryOptions<
    BulkOrderBusinessStatusUpdateResponse,
    BulkOrderBusinessStatusUpdateInput
  >
  createPdfMutationOptions: (
    options?: MutationOptionsInput<Blob, OrderExpeditionPdfInput>
  ) => MutationFactoryOptions<Blob, OrderExpeditionPdfInput>
  updateBusinessStatusMutationOptions: (
    options?: MutationOptionsInput<
      OrderBusinessStatusUpdateResponse,
      OrderBusinessStatusUpdateInput
    >
  ) => MutationFactoryOptions<
    OrderBusinessStatusUpdateResponse,
    OrderBusinessStatusUpdateInput
  >
  updateStatusMutationOptions: (
    options?: MutationOptionsInput<
      OrderExpeditionStatusUpdateResult,
      OrderExpeditionStatusUpdateInput
    >
  ) => MutationFactoryOptions<
    OrderExpeditionStatusUpdateResult,
    OrderExpeditionStatusUpdateInput
  >
}

export type CreateOrderExpeditionMutationOptionsFactoryConfig = {
  service: OrderExpeditionService
}

export function createOrderExpeditionMutationOptionsFactory({
  service,
}: CreateOrderExpeditionMutationOptionsFactoryConfig): OrderExpeditionMutationOptionsFactory {
  return {
    bulkUpdateBusinessStatusMutationOptions(options = {}) {
      return {
        mutationFn: (input) => service.bulkUpdateBusinessStatus(input),
        ...options.mutationOptions,
      }
    },
    createPdfMutationOptions(options = {}) {
      return {
        mutationFn: (input) => service.createPdf(input),
        ...options.mutationOptions,
      }
    },
    updateBusinessStatusMutationOptions(options = {}) {
      return {
        mutationFn: (input) => service.updateBusinessStatus(input),
        ...options.mutationOptions,
      }
    },
    updateStatusMutationOptions(options = {}) {
      return {
        mutationFn: (input) => service.updateStatus(input),
        ...options.mutationOptions,
      }
    },
  }
}

import type { Context } from "@medusajs/framework/types"
import { MedusaService } from "@medusajs/framework/utils"
import StorefrontText from "./models/storefront-text"

type TransactionRepository = {
  transaction: <Result>(
    task: (transactionManager: unknown) => Promise<Result>,
    options?: {
      enableNestedTransactions?: boolean
      isolationLevel?: string
      transaction?: unknown
    }
  ) => Promise<Result>
}

type StorefrontTextModuleDependencies = {
  baseRepository: TransactionRepository
}

class StorefrontTextModuleService extends MedusaService({
  StorefrontText,
}) {
  private readonly transactionRepository_: TransactionRepository

  constructor(
    dependencies: StorefrontTextModuleDependencies & Record<string, unknown>
  ) {
    super(dependencies)
    this.transactionRepository_ = dependencies.baseRepository
  }

  async runInTransaction<Result>(
    taskWithContext: (context: Context) => Promise<Result>,
    sharedContext: Context = {}
  ): Promise<Result> {
    if (sharedContext.transactionManager) {
      return await taskWithContext(sharedContext)
    }

    return await this.transactionRepository_.transaction(
      async (transactionManager) =>
        await taskWithContext({
          ...sharedContext,
          transactionManager,
        }),
      {
        enableNestedTransactions:
          sharedContext.enableNestedTransactions ?? false,
        isolationLevel: sharedContext.isolationLevel,
        transaction: sharedContext.transactionManager,
      }
    )
  }
}

export default StorefrontTextModuleService

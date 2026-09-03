import type { SqlEntityManager } from "@medusajs/framework/mikro-orm/knex"
import type { Context } from "@medusajs/framework/types"
import {
  InjectManager,
  MedusaContext,
  MedusaError,
  MedusaService,
} from "@medusajs/framework/utils"
import type { StorefrontUrlAssignmentEntityKind } from "./contracts"
import StorefrontUrlAssignment from "./models/storefront-url-assignment"

type TransactionRepository = {
  transaction<Result>(
    task: (transactionManager: SqlEntityManager) => Promise<Result>,
    options?: {
      enableNestedTransactions?: boolean
      isolationLevel?: string
      transaction?: SqlEntityManager
    }
  ): Promise<Result>
}

type StorefrontUrlAssignmentModuleDependencies = {
  baseRepository: TransactionRepository
}

class StorefrontUrlAssignmentModuleService extends MedusaService({
  StorefrontUrlAssignment,
}) {
  private readonly transactionRepository_: TransactionRepository

  constructor(
    dependencies: StorefrontUrlAssignmentModuleDependencies &
      Record<string, unknown>
  ) {
    super(dependencies)
    this.transactionRepository_ = dependencies.baseRepository
  }

  @InjectManager()
  async runInTransaction<Result>(
    taskWithContext: (context: Context<SqlEntityManager>) => Promise<Result>,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<Result> {
    if (sharedContext.transactionManager) {
      return await taskWithContext(sharedContext)
    }
    return await this.transactionRepository_.transaction(
      async (transactionManager) =>
        await taskWithContext({ ...sharedContext, transactionManager }),
      {
        enableNestedTransactions:
          sharedContext.enableNestedTransactions ?? false,
        isolationLevel: sharedContext.isolationLevel,
        transaction: sharedContext.transactionManager,
      }
    )
  }

  @InjectManager()
  async lockCatalogEntityAssignments(
    entityKind: StorefrontUrlAssignmentEntityKind,
    entityId: string,
    @MedusaContext() sharedContext: Context<SqlEntityManager> = {}
  ): Promise<void> {
    const manager = sharedContext.transactionManager
    if (!manager) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        "Catalog assignment lock requires an active transaction"
      )
    }
    await manager.execute(
      "select pg_advisory_xact_lock(hashtextextended(?, 0))",
      [`storefront-url-assignment:${entityKind}:${entityId}`]
    )
  }
}

export default StorefrontUrlAssignmentModuleService

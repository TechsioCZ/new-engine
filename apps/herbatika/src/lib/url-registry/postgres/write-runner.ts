import type {
  EntityRouteMutationResult,
  StaticRouteMutationResult,
  UrlRegistryCommand,
  UrlRegistryCommandRequest,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import { type CommandDraft, finalizeCommand } from "./command-finalizer"
import { claimCommand } from "./command-store"
import { translatePostgresWriteError } from "./error-mapping"
import { assertEnvelope } from "./input-validation"
import { assertCommandRequest } from "./request-validation"
import type { SqlClient, SqlPool } from "./sql"
import {
  executeRetriableTransaction,
  type TransactionRetryOptions,
} from "./transaction"
import { acquireStaticMarketLock, discoverStaticMarket } from "./write-context"

export type Mutation = (
  executor: SqlClient,
  command: UrlRegistryCommand
) => Promise<CommandDraft>

export const asEntityResult = (value: unknown): EntityRouteMutationResult => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("snapshot" in value) ||
    (value as EntityRouteMutationResult).snapshot.projectionType !== "entity"
  ) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Entity command returned a non-entity result"
    )
  }
  return value as EntityRouteMutationResult
}

export const asStaticResult = (value: unknown): StaticRouteMutationResult => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("snapshot" in value) ||
    (value as StaticRouteMutationResult).snapshot.projectionType !== "static"
  ) {
    throw new UrlRegistryError(
      "INVARIANT_VIOLATION",
      "Static command returned a non-static result"
    )
  }
  return value as StaticRouteMutationResult
}

export class PostgresCommandRunner {
  private readonly pool: SqlPool
  private readonly transactionOptions: TransactionRetryOptions

  constructor(pool: SqlPool, transactionOptions: TransactionRetryOptions) {
    this.pool = pool
    this.transactionOptions = transactionOptions
  }

  async run(
    command: UrlRegistryCommand,
    expectedType: UrlRegistryCommandRequest["commandType"],
    mutate: Mutation,
    beforeMutation?: (executor: SqlClient) => Promise<void>
  ) {
    assertEnvelope(command, expectedType)
    assertCommandRequest(command, expectedType)
    try {
      return await executeRetriableTransaction(
        this.pool,
        async (executor) => {
          const claim = await claimCommand(executor, command)
          if (claim.kind === "replay") {
            return claim.result
          }
          await beforeMutation?.(executor)
          const draft = await mutate(executor, command)
          return finalizeCommand(executor, command, draft)
        },
        this.transactionOptions
      )
    } catch (error) {
      return translatePostgresWriteError(error)
    }
  }

  async lockStaticTargetMarket(executor: SqlClient, routeId: string) {
    const market = await discoverStaticMarket(executor, routeId)
    await acquireStaticMarketLock(executor, market)
  }

  lockStaticMarket(executor: SqlClient, market: "sk" | "cz" | "hu" | "ro") {
    return acquireStaticMarketLock(executor, market)
  }
}

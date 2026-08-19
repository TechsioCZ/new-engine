import { randomUUID } from "node:crypto"
import type {
  ChangeSlugRequest,
  ChangeStaticPathRequest,
  CreateEntityRouteRequest,
  CreateStaticRouteRequest,
  EntityRouteIdentity,
  EntityRouteMutationResult,
  GoneMutationResult,
  RegisterGoneRequest,
  RetireRouteRequest,
  StaticRouteIdentity,
  StaticRouteMutationResult,
  SupersedeEntityRouteRequest,
  SupersedeRouteRequest,
  SupersedeStaticRouteRequest,
  UpdateRouteRequest,
  UrlRegistry,
  UrlRegistryCommand,
  UrlRouteIdentity,
} from "../contracts"
import { UrlRegistryError } from "../errors"
import {
  changeEntitySlug,
  createEntityRoute as insertEntityRoute,
} from "./entity-writes"
import { registerGoneSlug } from "./gone-write"
import {
  retireRoute as retire,
  supersedeRoute as supersede,
} from "./lifecycle-writes"
import { updateRouteMetadata } from "./metadata-write"
import { PostgresRegistryReads } from "./read-facade"
import type { SqlPool } from "./sql"
import {
  changeStaticPath as changePath,
  createStaticRoute as insertStaticRoute,
} from "./static-writes"
import type { TransactionRetryOptions } from "./transaction"
import {
  asEntityResult,
  asStaticResult,
  PostgresCommandRunner,
} from "./write-runner"

export type PostgresUrlRegistryOptions = Readonly<{
  createId?: () => string
  transaction?: TransactionRetryOptions
}>

export class PostgresUrlRegistry
  extends PostgresRegistryReads
  implements UrlRegistry
{
  private readonly createId: () => string
  private readonly commands: PostgresCommandRunner

  constructor(pool: SqlPool, options: PostgresUrlRegistryOptions = {}) {
    super(pool)
    this.createId = options.createId ?? randomUUID
    this.commands = new PostgresCommandRunner(pool, options.transaction ?? {})
  }

  async createEntityRoute(
    command: UrlRegistryCommand<CreateEntityRouteRequest>
  ): Promise<EntityRouteMutationResult> {
    return asEntityResult(
      await this.commands.run(
        command,
        "create-entity-route",
        (executor) => insertEntityRoute(executor, command, this.createId),
        (executor) =>
          this.commands.lockEntityIdentity(executor, {
            market: command.request.route.market,
            sourceSystem: command.request.route.identity.sourceSystem,
            sourceType: command.request.route.identity.sourceType,
            sourceId: command.request.route.identity.sourceId,
          })
      )
    )
  }

  async createStaticRoute(
    command: UrlRegistryCommand<CreateStaticRouteRequest>
  ): Promise<StaticRouteMutationResult> {
    return asStaticResult(
      await this.commands.run(
        command,
        "create-static-route",
        (executor) => insertStaticRoute(executor, command, this.createId),
        (executor) =>
          this.commands.lockStaticMarket(executor, command.request.route.market)
      )
    )
  }

  async changeSlug(
    command: UrlRegistryCommand<ChangeSlugRequest>
  ): Promise<EntityRouteMutationResult> {
    return asEntityResult(
      await this.commands.run(command, "change-slug", (executor) =>
        changeEntitySlug(executor, command, this.createId)
      )
    )
  }

  async changeStaticPath(
    command: UrlRegistryCommand<ChangeStaticPathRequest>
  ): Promise<StaticRouteMutationResult> {
    return asStaticResult(
      await this.commands.run(
        command,
        "change-static-path",
        (executor) => changePath(executor, command, this.createId),
        (executor) =>
          this.commands.lockStaticTargetMarket(
            executor,
            command.request.target.routeId
          )
      )
    )
  }

  updateRoute(
    command: UrlRegistryCommand<UpdateRouteRequest<EntityRouteIdentity>>
  ): Promise<EntityRouteMutationResult>
  updateRoute(
    command: UrlRegistryCommand<UpdateRouteRequest<StaticRouteIdentity>>
  ): Promise<StaticRouteMutationResult>
  async updateRoute(
    command: UrlRegistryCommand<UpdateRouteRequest>
  ): Promise<EntityRouteMutationResult | StaticRouteMutationResult> {
    const result = await this.commands.run(
      command,
      "update-route",
      (executor) =>
        updateRouteMetadata(
          executor,
          command as UrlRegistryCommand<UpdateRouteRequest<UrlRouteIdentity>>
        ),
      async (executor) => {
        if (command.request.target.identity.targetType === "static") {
          await this.commands.lockStaticTargetMarket(
            executor,
            command.request.target.routeId
          )
        }
      }
    )
    return command.request.target.identity.targetType === "entity"
      ? asEntityResult(result)
      : asStaticResult(result)
  }

  retireRoute(
    command: UrlRegistryCommand<RetireRouteRequest<EntityRouteIdentity>>
  ): Promise<EntityRouteMutationResult>
  retireRoute(
    command: UrlRegistryCommand<RetireRouteRequest<StaticRouteIdentity>>
  ): Promise<StaticRouteMutationResult>
  async retireRoute(
    command: UrlRegistryCommand<RetireRouteRequest>
  ): Promise<EntityRouteMutationResult | StaticRouteMutationResult> {
    const result = await this.commands.run(
      command,
      "retire-route",
      (executor) =>
        retire(
          executor,
          command as UrlRegistryCommand<RetireRouteRequest<UrlRouteIdentity>>
        ),
      async (executor) => {
        if (command.request.target.identity.targetType === "static") {
          await this.commands.lockStaticTargetMarket(
            executor,
            command.request.target.routeId
          )
        }
      }
    )
    return command.request.target.identity.targetType === "entity"
      ? asEntityResult(result)
      : asStaticResult(result)
  }

  supersedeRoute(
    command: UrlRegistryCommand<SupersedeEntityRouteRequest>
  ): Promise<EntityRouteMutationResult>
  supersedeRoute(
    command: UrlRegistryCommand<SupersedeStaticRouteRequest>
  ): Promise<StaticRouteMutationResult>
  async supersedeRoute(
    command: UrlRegistryCommand<SupersedeRouteRequest>
  ): Promise<EntityRouteMutationResult | StaticRouteMutationResult> {
    const result = await this.commands.run(
      command,
      "supersede-route",
      (executor) => supersede(executor, command),
      async (executor) => {
        if (command.request.target.identity.targetType === "static") {
          await this.commands.lockStaticTargetMarket(
            executor,
            command.request.target.routeId
          )
        }
      }
    )
    return command.request.target.identity.targetType === "entity"
      ? asEntityResult(result)
      : asStaticResult(result)
  }

  async registerGone(
    command: UrlRegistryCommand<RegisterGoneRequest>
  ): Promise<GoneMutationResult> {
    const result = await this.commands.run(
      command,
      "register-gone",
      (executor) => registerGoneSlug(executor, command, this.createId)
    )
    if (!("slug" in result)) {
      throw new UrlRegistryError(
        "INVARIANT_VIOLATION",
        "Register-gone returned a route result"
      )
    }
    return result
  }
}

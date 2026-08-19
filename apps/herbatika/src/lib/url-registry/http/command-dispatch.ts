import type {
  ChangeSlugRequest,
  ChangeStaticPathRequest,
  CreateEntityRouteRequest,
  CreateStaticRouteRequest,
  RegisterGoneRequest,
  RetireRouteRequest,
  RouteMutationResult,
  SupersedeRouteRequest,
  UpdateRouteRequest,
  UrlRegistry,
  UrlRegistryCommand,
  UrlRegistryCommandRequest,
} from "../contracts"

export const URL_REGISTRY_COMMAND_TYPES = new Set<
  UrlRegistryCommandRequest["commandType"]
>([
  "change-slug",
  "change-static-path",
  "create-entity-route",
  "create-static-route",
  "register-gone",
  "retire-route",
  "supersede-route",
  "update-route",
])

type GenericRouteMutation = (
  command: UrlRegistryCommand<
    UpdateRouteRequest | RetireRouteRequest | SupersedeRouteRequest
  >
) => Promise<RouteMutationResult>

const callGenericRouteMutation = (
  method: UrlRegistry["updateRoute" | "retireRoute" | "supersedeRoute"],
  registry: UrlRegistry,
  command: UrlRegistryCommand<
    UpdateRouteRequest | RetireRouteRequest | SupersedeRouteRequest
  >
) => (method as unknown as GenericRouteMutation).call(registry, command)

export const dispatchUrlRegistryCommand = (
  registry: UrlRegistry,
  command: UrlRegistryCommand
) => {
  switch (command.request.commandType) {
    case "create-entity-route":
      return registry.createEntityRoute(
        command as UrlRegistryCommand<CreateEntityRouteRequest>
      )
    case "create-static-route":
      return registry.createStaticRoute(
        command as UrlRegistryCommand<CreateStaticRouteRequest>
      )
    case "change-slug":
      return registry.changeSlug(
        command as UrlRegistryCommand<ChangeSlugRequest>
      )
    case "change-static-path":
      return registry.changeStaticPath(
        command as UrlRegistryCommand<ChangeStaticPathRequest>
      )
    case "update-route":
      return callGenericRouteMutation(
        registry.updateRoute,
        registry,
        command as UrlRegistryCommand<UpdateRouteRequest>
      )
    case "retire-route":
      return callGenericRouteMutation(
        registry.retireRoute,
        registry,
        command as UrlRegistryCommand<RetireRouteRequest>
      )
    case "supersede-route":
      return callGenericRouteMutation(
        registry.supersedeRoute,
        registry,
        command as UrlRegistryCommand<SupersedeRouteRequest>
      )
    case "register-gone":
      return registry.registerGone(
        command as UrlRegistryCommand<RegisterGoneRequest>
      )
    default:
      throw new TypeError("Unsupported URL registry command")
  }
}

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

const get = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const id = req.auth_context.actor_id
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  if (id.length === 0) {
    throw new MedusaError(MedusaError.Types.UNAUTHORIZED, "User ID not found")
  }

  const query = remoteQueryObjectFromString({
    entryPoint: "user",
    fields: req.queryConfig.fields,
    variables: { id },
  })

  const result: unknown = await remoteQuery(query)
  if (!Array.isArray(result) || result.length === 0) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `User with id: ${id} was not found`,
    )
  }

  const user: unknown = result[0]
  res.status(200).json({ user })
}

export { get as GET }

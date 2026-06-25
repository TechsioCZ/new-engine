import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  remoteQueryObjectFromString,
} from "@medusajs/framework/utils"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const id = req.auth_context.actor_id
  const remoteQuery = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY)

  if (!id) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "User ID not found")
  }

  const query = remoteQueryObjectFromString({
    entryPoint: "user",
    variables: { id },
    fields: req.queryConfig.fields,
  })

  const [user] = await remoteQuery(query)

  if (!user) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `User with id: ${id} was not found`
    )
  }

  res.status(200).json({ user })
}

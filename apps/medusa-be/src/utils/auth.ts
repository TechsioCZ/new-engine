import type { MedusaRequest } from "@medusajs/framework/http"

export const getAuthenticatedCustomerId = (req: MedusaRequest) => {
  const authContext = "auth_context" in req ? req.auth_context : undefined

  if (
    typeof authContext === "object" &&
    authContext !== null &&
    "actor_id" in authContext &&
    typeof authContext.actor_id === "string"
  ) {
    return authContext.actor_id
  }

  return
}

import {
  handleStorefrontMedusaRequest,
  type StorefrontMedusaRouteContext,
} from "./_proxy"

export const GET = (request: Request, context: StorefrontMedusaRouteContext) =>
  handleStorefrontMedusaRequest(request, context)

export const POST = (request: Request, context: StorefrontMedusaRouteContext) =>
  handleStorefrontMedusaRequest(request, context)

export const DELETE = (
  request: Request,
  context: StorefrontMedusaRouteContext
) => handleStorefrontMedusaRequest(request, context)

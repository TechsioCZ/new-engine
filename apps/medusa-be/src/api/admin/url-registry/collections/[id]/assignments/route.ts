import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { AdminUpsertCollectionUrlAssignment } from "../../../../../../modules/storefront-url-assignment/contracts"
import {
  type AdminAssignmentListResponse,
  type AdminAssignmentMutationResponse,
  handleAdminAssignmentGET,
  handleAdminAssignmentPOST,
} from "../../../utils"

export const GET = (
  request: AuthenticatedMedusaRequest,
  response: MedusaResponse<AdminAssignmentListResponse | { message: string }>
) => handleAdminAssignmentGET(request, response, "collection")

export const POST = (
  request: AuthenticatedMedusaRequest<AdminUpsertCollectionUrlAssignment>,
  response: MedusaResponse<
    AdminAssignmentMutationResponse | { message: string }
  >
) => handleAdminAssignmentPOST(request, response, "collection")

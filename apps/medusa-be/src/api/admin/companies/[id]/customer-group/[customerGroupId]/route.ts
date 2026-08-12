import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { requirePathParam } from "../../../../../../utils/path-params"
import { removeCompanyFromCustomerGroupWorkflow } from "../../../../../../workflows/company/workflows/remove-company-from-customer-group"
import type { AdminRemoveCompanyFromCustomerGroupType } from "../../../validators"

export const DELETE = async (
  req: AuthenticatedMedusaRequest<AdminRemoveCompanyFromCustomerGroupType>,
  res: MedusaResponse
) => {
  const id = requirePathParam(req.params.id, "Company id")
  const customerGroupId = requirePathParam(
    req.params.customerGroupId,
    "Customer group id"
  )

  await removeCompanyFromCustomerGroupWorkflow(req.scope).run({
    input: { company_id: id, group_id: customerGroupId },
  })

  res.status(200).send()
}

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { requirePathParam } from "../../../../../utils/path-params"
import { updateCompanyApplicationStatusWorkflow } from "../../../../../workflows/company/workflows"
import type {
  AdminGetCompanyParamsType,
  AdminUpdateCompanyApplicationStatusType,
} from "../../validators"

export const POST = async (
  req: AuthenticatedMedusaRequest<
    AdminUpdateCompanyApplicationStatusType,
    AdminGetCompanyParamsType
  >,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params.id, "Company id")

  await updateCompanyApplicationStatusWorkflow(req.scope).run({
    input: {
      id,
      status: req.validatedBody.status,
    },
  })

  const {
    data: [company],
  } = await query.graph(
    {
      entity: "companies",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ company })
}

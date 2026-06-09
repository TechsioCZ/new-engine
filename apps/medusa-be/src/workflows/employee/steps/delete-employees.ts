import type { IAuthModuleService } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"

type DeleteEmployeesStepInput =
  | string
  | string[]
  | {
      company_id?: string
      id: string | string[]
    }

type DeletedEmployee = {
  customer?: {
    email?: string | null
  } | null
  id: string
  is_admin?: boolean
}

type ProviderIdentity = {
  id?: string
}

type DeleteEmployeesCompensation = {
  employee_ids: string[]
  provider_identity_ids: string[]
}

const normalizeInput = (input: DeleteEmployeesStepInput) =>
  typeof input === "string" || Array.isArray(input) ? { id: input } : input

export const deleteEmployeesStep = createStep(
  "delete-employees",
  async (
    input: DeleteEmployeesStepInput,
    { container }
  ): Promise<StepResponse<string[], DeleteEmployeesCompensation>> => {
    const { company_id: companyId, id } = normalizeInput(input)
    const ids = Array.isArray(id) ? id : [id]
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    const {
      data: employees,
    }: {
      data: DeletedEmployee[]
    } = await query.graph(
      {
        entity: "employee",
        fields: ["id", "is_admin", "customer.email"],
        filters: {
          id: ids,
          ...(companyId ? { company_id: companyId } : {}),
        },
      },
      { throwIfKeyNotFound: true }
    )

    if (employees.length !== ids.length) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "One or more employees were not found for the requested company."
      )
    }

    const adminEmails = employees
      .filter((employee) => employee.is_admin)
      .map((employee) => employee.customer?.email)
      .filter((email): email is string => Boolean(email))
    const { data: providerIdentities }: { data: ProviderIdentity[] } =
      adminEmails.length
        ? await query.graph({
            entity: "provider_identity",
            fields: ["id"],
            filters: {
              entity_id: adminEmails,
              provider: "emailpass",
            },
          })
        : { data: [] }
    const providerIdentityIds = providerIdentities
      .map((providerIdentity) => providerIdentity.id)
      .filter((providerIdentityId): providerIdentityId is string =>
        Boolean(providerIdentityId)
      )

    if (providerIdentityIds.length) {
      const authModuleService = container.resolve<IAuthModuleService>(
        Modules.AUTH
      )

      await authModuleService.updateProviderIdentities(
        providerIdentityIds.map((providerIdentityId) => ({
          id: providerIdentityId,
          user_metadata: {
            role: null,
          },
        }))
      )
    }

    await companyModuleService.softDeleteEmployees(ids)

    return new StepResponse(ids, {
      employee_ids: ids,
      provider_identity_ids: providerIdentityIds,
    })
  },
  async (input: DeleteEmployeesCompensation | undefined, { container }) => {
    if (!input) {
      return
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    await companyModuleService.restoreEmployees(input.employee_ids)

    if (input.provider_identity_ids.length) {
      const authModuleService = container.resolve<IAuthModuleService>(
        Modules.AUTH
      )

      await authModuleService.updateProviderIdentities(
        input.provider_identity_ids.map((providerIdentityId) => ({
          id: providerIdentityId,
          user_metadata: {
            role: "company_admin",
          },
        }))
      )
    }
  }
)

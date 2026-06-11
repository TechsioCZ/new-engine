import type { DeleteEntityInput, Link } from "@medusajs/framework/modules-sdk"
import type {
  IAuthModuleService,
  ICustomerModuleService,
} from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { COMPANY_MODULE } from "../../../modules/company"
import type { ICompanyModuleService } from "../../../types"
import { getProviderIdentityIdsWithoutActiveAdminRole } from "../utils/admin-auth-metadata"

type DeleteEmployeesStepInput =
  | string
  | string[]
  | {
      company_id?: string
      id: string | string[]
    }

type DeletedEmployee = {
  company?: {
    customer_group?: {
      id?: string | null
    } | null
  } | null
  customer?: {
    email?: string | null
    id?: string | null
  } | null
  id: string
  is_admin?: boolean
}

type DeleteEmployeesCompensation = {
  employee_link_delete_input: DeleteEntityInput
  employee_ids: string[]
  provider_identity_ids: string[]
  removed_customer_groups: Array<{
    customer_group_id: string
    customer_id: string
  }>
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
    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    const {
      data: employees,
    }: {
      data: DeletedEmployee[]
    } = await query.graph(
      {
        entity: "employee",
        fields: [
          "id",
          "is_admin",
          "company.customer_group.id",
          "customer.email",
          "customer.id",
        ],
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

    const removedCustomerGroups = employees.flatMap((employee) => {
      if (!(employee.customer?.id && employee.company?.customer_group?.id)) {
        return []
      }

      return [
        {
          customer_group_id: employee.company.customer_group.id,
          customer_id: employee.customer.id,
        },
      ]
    })
    const adminCandidates = employees
      .filter((employee) => employee.is_admin)
      .map((employee) => ({
        customer_id: employee.customer?.id,
        email: employee.customer?.email,
      }))
    const providerIdentityIds =
      await getProviderIdentityIdsWithoutActiveAdminRole({
        candidates: adminCandidates,
        excludedEmployeeIds: ids,
        query,
      })

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

    if (removedCustomerGroups.length) {
      const customerModuleService = container.resolve<ICustomerModuleService>(
        Modules.CUSTOMER
      )

      await customerModuleService.removeCustomerFromGroup(removedCustomerGroups)
    }

    const employeeLinkDeleteInput: DeleteEntityInput = {
      [COMPANY_MODULE]: {
        employee_id: ids,
      },
    }

    await link.delete(employeeLinkDeleteInput)
    await companyModuleService.softDeleteEmployees(ids)

    return new StepResponse(ids, {
      employee_link_delete_input: employeeLinkDeleteInput,
      employee_ids: ids,
      provider_identity_ids: providerIdentityIds,
      removed_customer_groups: removedCustomerGroups,
    })
  },
  async (input: DeleteEmployeesCompensation | undefined, { container }) => {
    if (!input) {
      return
    }

    const companyModuleService =
      container.resolve<ICompanyModuleService>(COMPANY_MODULE)
    await companyModuleService.restoreEmployees(input.employee_ids)

    const link = container.resolve<Link>(ContainerRegistrationKeys.LINK)
    await link.restore(input.employee_link_delete_input)

    if (input.removed_customer_groups.length) {
      const customerModuleService = container.resolve<ICustomerModuleService>(
        Modules.CUSTOMER
      )

      await customerModuleService.addCustomerToGroup(
        input.removed_customer_groups
      )
    }

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

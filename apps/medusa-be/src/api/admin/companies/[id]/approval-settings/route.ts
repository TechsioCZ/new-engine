import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework"
import type { Query } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { isRecord, getRecordValue } from "@techsio/std/object"

import { requirePathParam } from "../../../../../utils/path-params"
import { ensureApprovalSettingsWorkflow } from "../../../../../workflows/approval/workflows/ensure-approval-settings"
import { updateApprovalSettingsWorkflow } from "../../../../../workflows/approval/workflows/update-approval-settings"
import { adminApprovalSettingsFields } from "../../query-config"
import type { AdminUpdateApprovalSettingsType } from "../../validators"

const getDataRecords = (response: unknown): object[] => {
  if (!isRecord(response)) {
    return []
  }
  const data = getRecordValue(response, "data")
  return Array.isArray(data) ? data.filter(isRecord) : []
}

const getWorkflowResult = (response: unknown): unknown =>
  isRecord(response) ? getRecordValue(response, "result") : undefined

const get = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Company id")
  const response: unknown = await query.graph({
    entity: "approval_settings",
    fields: adminApprovalSettingsFields,
    filters: {
      ...req.filterableFields,
      company_id: id,
    },
    pagination: {
      ...req.queryConfig.pagination,
    },
  })
  const approvalSettings = getDataRecords(response)
  const metadata = isRecord(response)
    ? getRecordValue(response, "metadata")
    : undefined
  const count =
    isRecord(metadata) && typeof getRecordValue(metadata, "count") === "number"
      ? getRecordValue(metadata, "count")
      : approvalSettings.length
  const limit =
    isRecord(metadata) && typeof getRecordValue(metadata, "take") === "number"
      ? getRecordValue(metadata, "take")
      : approvalSettings.length
  const offset =
    isRecord(metadata) && typeof getRecordValue(metadata, "skip") === "number"
      ? getRecordValue(metadata, "skip")
      : 0

  res.json({ approvalSettings, count, limit, offset })
}

const post = async (
  req: AuthenticatedMedusaRequest<AdminUpdateApprovalSettingsType>,
  res: MedusaResponse,
) => {
  const query = req.scope.resolve<Query>(ContainerRegistrationKeys.QUERY)
  const id = requirePathParam(req.params["id"], "Company id")
  const { requires_admin_approval, requires_sales_manager_approval } =
    req.validatedBody
  const currentResponse: unknown = await query.graph({
    entity: "approval_settings",
    fields: ["id"],
    filters: { company_id: id },
  })
  const [currentRecord] = getDataRecords(currentResponse)
  const currentId =
    currentRecord === undefined
      ? undefined
      : getRecordValue(currentRecord, "id")
  let currentApprovalSettingsId =
    typeof currentId === "string" && currentId !== "" ? currentId : undefined

  if (currentApprovalSettingsId === undefined) {
    const creationResponse: unknown = await ensureApprovalSettingsWorkflow(
      req.scope,
    ).run({ input: [id] })
    const createdResult = getWorkflowResult(creationResponse)
    const createdId =
      Array.isArray(createdResult) && isRecord(createdResult[0])
        ? getRecordValue(createdResult[0], "id")
        : undefined
    currentApprovalSettingsId =
      typeof createdId === "string" && createdId !== "" ? createdId : undefined
  }

  if (currentApprovalSettingsId === undefined) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Approval settings for company ${id} were not found`,
    )
  }

  const updateResponse: unknown = await updateApprovalSettingsWorkflow(
    req.scope,
  ).run({
    input: {
      company_id: id,
      id: currentApprovalSettingsId,
      requires_admin_approval,
      requires_sales_manager_approval,
    },
  })
  const updatedResult = getWorkflowResult(updateResponse)
  const updatedId = isRecord(updatedResult)
    ? getRecordValue(updatedResult, "id")
    : undefined
  if (typeof updatedId !== "string" || updatedId === "") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Approval settings update for company ${id} returned no id`,
    )
  }

  const response: unknown = await query.graph(
    {
      entity: "approval_settings",
      fields: adminApprovalSettingsFields,
      filters: { id: updatedId },
    },
    { throwIfKeyNotFound: true },
  )
  res.json({ approvalSettings: getDataRecords(response) })
}

export { get as GET, post as POST }

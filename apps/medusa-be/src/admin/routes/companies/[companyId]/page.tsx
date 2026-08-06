import { ExclamationCircle } from "@medusajs/icons"
import {
  Avatar,
  Badge,
  Container,
  Heading,
  StatusBadge,
  Table,
  Text,
  Toaster,
} from "@medusajs/ui"
import { isRecord } from "@techsio/std/object"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import type { LoaderFunctionArgs, UIMatch } from "react-router-dom"

import type {
  AdminCompanyResponse,
  QueryCompany,
  QueryEmployee,
} from "../../../../types"
import { adminCompanyDisplayFieldsQuery } from "../../../../types/company/admin-fields"
import { useCompany } from "../../../hooks/api/companies"
import { translateBreadcrumb } from "../../../lib/breadcrumb"
import { sdk } from "../../../lib/sdk"
import { formatAmount } from "../../../utils/format-amount"
import { CompanyActionsMenu } from "../components/company-actions-menu"
import { EmployeesActionsMenu } from "../components/employees/employees-actions-menu"
import { EmployeeCreateDrawer } from "../components/employees/employees-create-drawer"

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { companyId } = params

  if (companyId === undefined || companyId === "") {
    return { company: null }
  }

  return await sdk.client.fetch<AdminCompanyResponse>(
    `/admin/companies/${companyId}`,
    {
      query: {
        fields: "id,name,deleted_at",
        with_deleted: "true",
      },
    },
  )
}

export const handle = {
  breadcrumb: (match: UIMatch<AdminCompanyResponse>) =>
    match.data?.company?.name ??
    match.data?.company?.id ??
    translateBreadcrumb("companies:columns.company", "Company"),
}

const getCustomerGroupName = (value: unknown): string | null => {
  if (!isRecord(value)) {
    return null
  }

  const { name } = value
  return typeof name === "string" && name.length > 0 ? name : null
}

const EmployeeActionCell = ({
  company,
  employee,
  isDeleted,
}: {
  company: QueryCompany
  employee: QueryEmployee
  isDeleted: boolean
}) => {
  if (isDeleted) {
    return (
      <Table.Cell
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        -
      </Table.Cell>
    )
  }

  return (
    <Table.Cell
      onClick={(e) => {
        e.stopPropagation()
      }}
    >
      <EmployeesActionsMenu company={company} employee={employee} />
    </Table.Cell>
  )
}

const ApprovalSettingsBadges = ({
  adminLabel,
  noneLabel,
  requiresAdminApproval,
  requiresSalesManagerApproval,
  salesManagerLabel,
}: {
  adminLabel: string
  noneLabel: string
  requiresAdminApproval: boolean | undefined
  requiresSalesManagerApproval: boolean | undefined
  salesManagerLabel: string
}) => {
  const hasAdminApproval = requiresAdminApproval === true
  const hasSalesManagerApproval = requiresSalesManagerApproval === true

  return (
    <div className="flex gap-2">
      {hasAdminApproval && (
        <Badge color="purple" size="small">
          {adminLabel}
        </Badge>
      )}
      {hasSalesManagerApproval && (
        <Badge color="purple" size="small">
          {salesManagerLabel}
        </Badge>
      )}
      {!hasAdminApproval && !hasSalesManagerApproval && (
        <Badge color="grey" size="small">
          {noneLabel}
        </Badge>
      )}
    </div>
  )
}

const CompanyDetails = () => {
  const { t } = useTranslation("companies")
  const navigate = useNavigate()
  const { companyId } = useParams()
  const { data, isPending } = useCompany(
    companyId ?? "",
    {
      fields: adminCompanyDisplayFieldsQuery,
      with_deleted: "true",
    },
    { enabled: Boolean(companyId) },
  )

  const company = data?.company

  const openCustomer = (employee: QueryEmployee) => {
    const customerId = employee.customer?.id
    if (customerId !== undefined && customerId !== "") {
      navigate(`/customers/${customerId}`)
    }
  }

  if (isPending) {
    return (
      <Container>
        <Text>{t("status.loading")}</Text>
      </Container>
    )
  }

  if (company === undefined) {
    return <div>{t("errors.companyNotFound")}</div>
  }

  const customerGroupName = getCustomerGroupName(company.customer_group)
  const isDeleted =
    company.deleted_at !== null && company.deleted_at !== undefined
  const activeEmployees =
    company.employees?.filter(
      (employee) =>
        employee.deleted_at === null || employee.deleted_at === undefined,
    ) ?? []

  return (
    <div className="flex flex-col gap-4">
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-ui-border-base border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Avatar
              fallback={company.name?.charAt(0)}
              src={company.logo_url ?? ""}
            />
            <Heading className="h1-core font-medium font-sans">
              {company.name}
            </Heading>
            <StatusBadge color={company.deleted_at ? "red" : "green"}>
              {company.deleted_at ? t("status.deleted") : t("status.active")}
            </StatusBadge>
          </div>
          <CompanyActionsMenu company={company} />
        </div>
        <Table>
          <Table.Body>
            <Table.Row>
              <Table.Cell className="txt-compact-small max-w-fit font-medium font-sans">
                {t("columns.phone")}
              </Table.Cell>
              <Table.Cell>{company.phone}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="txt-compact-small font-medium font-sans">
                {t("columns.email")}
              </Table.Cell>
              <Table.Cell>{company.email}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="txt-compact-small font-medium font-sans">
                {t("columns.address")}
              </Table.Cell>
              <Table.Cell>{company.address}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="txt-compact-small font-medium font-sans">
                {t("columns.city")}
              </Table.Cell>
              <Table.Cell>{company.city}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="txt-compact-small font-medium font-sans">
                {t("columns.state")}
              </Table.Cell>
              <Table.Cell>{company.state}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="txt-compact-small font-medium font-sans">
                {t("columns.currency")}
              </Table.Cell>
              <Table.Cell>{company.currency_code?.toUpperCase()}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="txt-compact-small font-medium font-sans">
                {t("columns.customerGroup")}
              </Table.Cell>
              <Table.Cell>
                {customerGroupName === null ? (
                  "-"
                ) : (
                  <Badge color="blue" size="small">
                    {customerGroupName}
                  </Badge>
                )}
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="txt-compact-small font-medium font-sans">
                {t("columns.approvalSettings")}
              </Table.Cell>
              <Table.Cell>
                <ApprovalSettingsBadges
                  adminLabel={t("approvalSettings.badgeAdmin")}
                  noneLabel={t("approvalSettings.badgeNone")}
                  requiresAdminApproval={
                    company.approval_settings?.requires_admin_approval
                  }
                  requiresSalesManagerApproval={
                    company.approval_settings?.requires_sales_manager_approval
                  }
                  salesManagerLabel={t("approvalSettings.badgeSalesManager")}
                />
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table>
      </Container>
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between gap-2 border-ui-border-base border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <Heading className="h1-core font-medium font-sans">
              {t("employees.title")}
            </Heading>
          </div>
          {!isDeleted && <EmployeeCreateDrawer company={company} />}
        </div>
        {activeEmployees.length > 0 ? (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell />
                <Table.HeaderCell>{t("columns.name")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.email")}</Table.HeaderCell>
                <Table.HeaderCell>
                  {t("columns.spendingLimit")}
                </Table.HeaderCell>
                <Table.HeaderCell>{t("columns.actions")}</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {activeEmployees.map((employee: QueryEmployee) => (
                <Table.Row key={employee.id}>
                  <Table.Cell className="h-6 w-6 items-center justify-center">
                    <Avatar
                      fallback={employee.customer?.first_name?.charAt(0) ?? ""}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <button
                      aria-label={
                        employee.customer?.email !== undefined &&
                        employee.customer.email !== ""
                          ? employee.customer.email
                          : employee.id
                      }
                      className="flex w-fit items-center gap-2 text-left"
                      onClick={() => {
                        openCustomer(employee)
                      }}
                      type="button"
                    >
                      {employee.customer?.first_name}{" "}
                      {employee.customer?.last_name}
                      {employee.is_admin && (
                        <Badge color="green" size="2xsmall">
                          {t("employees.adminBadge")}
                        </Badge>
                      )}
                    </button>
                  </Table.Cell>
                  <Table.Cell>{employee.customer?.email}</Table.Cell>
                  <Table.Cell>
                    {formatAmount(
                      employee.spending_limit,
                      company.currency_code ?? "USD",
                    )}
                  </Table.Cell>
                  <EmployeeActionCell
                    company={company}
                    employee={employee}
                    isDeleted={isDeleted}
                  />
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : (
          <div className="flex h-[400px] w-full flex-col items-center justify-center gap-y-4">
            <div className="flex flex-col items-center gap-y-3">
              <ExclamationCircle />
              <div className="flex flex-col items-center gap-y-1">
                <Text className="txt-compact-small font-medium font-sans">
                  {t("employees.emptyTitle")}
                </Text>
                <Text className="txt-small text-ui-fg-muted">
                  {t("employees.emptyMessage")}
                </Text>
              </div>
            </div>
          </div>
        )}
      </Container>
      <Toaster />
    </div>
  )
}

export default CompanyDetails

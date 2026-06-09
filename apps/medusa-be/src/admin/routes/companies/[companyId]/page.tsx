import { ExclamationCircle } from "@medusajs/icons"
import {
  Avatar,
  Badge,
  Container,
  Heading,
  Table,
  Text,
  Toaster,
} from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { useParams } from "react-router-dom"
import type { QueryEmployee } from "../../../../types"
import { useAdminCustomerGroups, useCompany } from "../../../hooks/api"
import { formatAmount } from "../../../utils"
import { CompanyActionsMenu } from "../components"
import {
  EmployeeCreateDrawer,
  EmployeesActionsMenu,
} from "../components/employees"

const CompanyDetails = () => {
  const { t } = useTranslation("companies")
  const { companyId } = useParams()
  const { data, isPending } = useCompany(
    companyId ?? "",
    {
      fields:
        "*employees,*employees.customer,*employees.company,*customer_group,*approval_settings",
    },
    { enabled: Boolean(companyId) }
  )

  const { data: customerGroups } = useAdminCustomerGroups()

  const company = data?.company

  if (!company) {
    return <div>{t("errors.companyNotFound")}</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <Container className="flex flex-col overflow-hidden p-0">
        {!isPending && (
          <>
            <div className="flex items-center justify-between gap-2 border-gray-200 border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <Avatar
                  fallback={company?.name?.charAt(0)}
                  src={company?.logo_url || undefined}
                />
                <Heading className="h1-core font-medium font-sans">
                  {company?.name}
                </Heading>
              </div>
              <CompanyActionsMenu
                company={company}
                customerGroups={customerGroups}
              />
            </div>
            <Table>
              <Table.Body>
                <Table.Row>
                  <Table.Cell className="txt-compact-small max-w-fit font-medium font-sans">
                    {t("columns.phone")}
                  </Table.Cell>
                  <Table.Cell>{company?.phone}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell className="txt-compact-small font-medium font-sans">
                    {t("columns.email")}
                  </Table.Cell>
                  <Table.Cell>{company?.email}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell className="txt-compact-small font-medium font-sans">
                    {t("columns.address")}
                  </Table.Cell>
                  <Table.Cell>{company?.address}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell className="txt-compact-small font-medium font-sans">
                    {t("columns.city")}
                  </Table.Cell>
                  <Table.Cell>{company?.city}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell className="txt-compact-small font-medium font-sans">
                    {t("columns.state")}
                  </Table.Cell>
                  <Table.Cell>{company?.state}</Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell className="txt-compact-small font-medium font-sans">
                    {t("columns.currency")}
                  </Table.Cell>
                  <Table.Cell>
                    {company?.currency_code?.toUpperCase()}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell className="txt-compact-small font-medium font-sans">
                    {t("columns.customerGroup")}
                  </Table.Cell>
                  <Table.Cell>
                    {company?.customer_group ? (
                      <Badge color="blue" size="small">
                        {company?.customer_group?.name}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </Table.Cell>
                </Table.Row>
                <Table.Row>
                  <Table.Cell className="txt-compact-small font-medium font-sans">
                    {t("columns.approvalSettings")}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-2">
                      {company?.approval_settings?.requires_admin_approval && (
                        <Badge color="purple" size="small">
                          {t("approvalSettings.badgeAdmin")}
                        </Badge>
                      )}
                      {company?.approval_settings
                        ?.requires_sales_manager_approval && (
                        <Badge color="purple" size="small">
                          {t("approvalSettings.badgeSalesManager")}
                        </Badge>
                      )}
                      {!(
                        company?.approval_settings?.requires_admin_approval ||
                        company?.approval_settings
                          ?.requires_sales_manager_approval
                      ) && (
                        <Badge color="grey" size="small">
                          {t("approvalSettings.badgeNone")}
                        </Badge>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              </Table.Body>
            </Table>
          </>
        )}
      </Container>
      <Container className="flex flex-col overflow-hidden p-0">
        {!isPending && (
          <>
            <div className="flex items-center justify-between gap-2 border-gray-200 border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <Heading className="h1-core font-medium font-sans">
                  {t("employees.title")}
                </Heading>
              </div>
              <EmployeeCreateDrawer company={company} />
            </div>
            {company?.employees && company?.employees.length > 0 ? (
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
                  {company?.employees.map((employee: QueryEmployee) => (
                    <Table.Row
                      className="cursor-pointer"
                      key={employee.id}
                      onClick={() => {
                        window.location.href = `/app/customers/${
                          employee?.customer?.id
                        }`
                      }}
                    >
                      <Table.Cell className="h-6 w-6 items-center justify-center">
                        <Avatar
                          fallback={
                            employee.customer?.first_name?.charAt(0) || ""
                          }
                        />
                      </Table.Cell>
                      <Table.Cell className="flex w-fit items-center gap-2">
                        {employee.customer?.first_name}{" "}
                        {employee.customer?.last_name}
                        {employee.is_admin && (
                          <Badge
                            color={employee.is_admin ? "green" : "grey"}
                            size="2xsmall"
                          >
                            {t("employees.adminBadge")}
                          </Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell>{employee.customer?.email}</Table.Cell>
                      <Table.Cell>
                        {formatAmount(
                          employee.spending_limit,
                          company?.currency_code || "USD"
                        )}
                      </Table.Cell>
                      <Table.Cell onClick={(e) => e.stopPropagation()}>
                        <EmployeesActionsMenu
                          company={company}
                          employee={employee}
                        />
                      </Table.Cell>
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
          </>
        )}
      </Container>
      <Toaster />
    </div>
  )
}

export default CompanyDetails

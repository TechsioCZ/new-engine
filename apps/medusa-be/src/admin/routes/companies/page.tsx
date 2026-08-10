import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import {
  Avatar,
  Badge,
  Container,
  Heading,
  Input,
  Select,
  StatusBadge,
  Table,
  Text,
  Toaster,
} from "@medusajs/ui"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import type { QueryCompany } from "../../../types"
import { adminCompanyDisplayFieldsQuery } from "../../../types/company/admin-fields"
import { useCompanies } from "../../hooks/api"
import { translateBreadcrumb } from "../../lib/breadcrumb"
import {
  getPaginationTranslations,
  onRowKeyboardActivate,
} from "../../lib/table"
import { useDebouncedValue } from "../../lib/use-debounced-value"
import {
  CompanyActionsMenu,
  CompanyApplicationStatusButton,
  CompanyCreateDrawer,
} from "./components"

const PAGE_SIZE = 20
const COMPANY_STATUS_OPTIONS = ["active", "deleted", "all"] as const
type CompanyStatusFilter = (typeof COMPANY_STATUS_OPTIONS)[number]
const COMPANY_APPLICATION_STATUS_OPTIONS = [
  "all",
  "pending",
  "approved",
  "rejected",
] as const
type CompanyApplicationStatusFilter =
  (typeof COMPANY_APPLICATION_STATUS_OPTIONS)[number]
const ORDER_OPTIONS = [
  { labelKey: "nameAsc", value: "name" },
  { labelKey: "nameDesc", value: "-name" },
  { labelKey: "newest", value: "-created_at" },
  { labelKey: "recentlyUpdated", value: "-updated_at" },
] as const
type CompanyOrder = (typeof ORDER_OPTIONS)[number]["value"]

type CompanyApplicationStatus = "pending" | "approved" | "rejected" | undefined

const getCompanyStatusBadgeColor = (
  company: QueryCompany
): "green" | "orange" | "red" => {
  if (company.deleted_at || company.application_status === "rejected") {
    return "red"
  }

  return company.application_status === "approved" ? "green" : "orange"
}

const getCompanyStatusLabelKey = (company: QueryCompany) => {
  if (company.deleted_at) {
    return "deleted"
  }

  return (company.application_status ?? "pending") as Exclude<
    CompanyApplicationStatus,
    undefined
  >
}

export const handle = {
  breadcrumb: () => translateBreadcrumb("companies:menuItem", "Companies"),
}

const formatCompanyAddress = (company: QueryCompany) => {
  const addressParts = [
    company.address,
    company.city,
    [company.state, company.zip].filter(Boolean).join(" "),
  ].filter(Boolean)

  return addressParts.length ? addressParts.join(", ") : "-"
}

const getActiveEmployeeCount = (company: QueryCompany) =>
  company.employees?.filter((employee) => !employee.deleted_at).length ?? 0

const Companies = () => {
  const { t } = useTranslation("companies")
  const navigate = useNavigate()
  const [pageIndex, setPageIndex] = useState(0)
  const [orderBy, setOrderBy] = useState<CompanyOrder>("name")
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<CompanyStatusFilter>("active")
  const [applicationStatus, setApplicationStatus] =
    useState<CompanyApplicationStatusFilter>("all")
  const debouncedQ = useDebouncedValue(q)
  const companiesQuery = {
    fields: adminCompanyDisplayFieldsQuery,
    limit: String(PAGE_SIZE),
    offset: String(pageIndex * PAGE_SIZE),
    application_status: applicationStatus,
    order_by: orderBy,
    q: debouncedQ,
    status,
  }
  const { data, isPending } = useCompanies(companiesQuery)
  const companies = data?.companies ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  const renderCompanyRows = () => {
    if (isPending) {
      return (
        <Table.Row>
          <Table.Cell>{t("status.loading")}</Table.Cell>
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
        </Table.Row>
      )
    }

    if (!companies.length) {
      return (
        <Table.Row>
          <Table.Cell>{t("status.empty")}</Table.Cell>
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
        </Table.Row>
      )
    }

    return companies.map((company: QueryCompany) => {
      const displayName = company.name || company.id

      return (
        <Table.Row
          aria-label={displayName}
          className="cursor-pointer"
          key={company.id}
          onClick={() => navigate(`/companies/${company.id}`)}
          onKeyDown={onRowKeyboardActivate(() =>
            navigate(`/companies/${company.id}`)
          )}
          role="button"
          tabIndex={0}
        >
          <Table.Cell className="h-6 w-6 items-center justify-center">
            <Avatar
              fallback={displayName.charAt(0)}
              src={company.logo_url || undefined}
            />
          </Table.Cell>
          <Table.Cell>{displayName}</Table.Cell>
          <Table.Cell>{company.phone}</Table.Cell>
          <Table.Cell>{company.email}</Table.Cell>
          <Table.Cell>
            <StatusBadge color={getCompanyStatusBadgeColor(company)}>
              {t(`status.${getCompanyStatusLabelKey(company)}`)}
            </StatusBadge>
          </Table.Cell>
          <Table.Cell>{formatCompanyAddress(company)}</Table.Cell>
          <Table.Cell>{getActiveEmployeeCount(company)}</Table.Cell>
          <Table.Cell>
            {company.customer_group?.name ? (
              <Badge color="blue" size="small">
                {company.customer_group.name}
              </Badge>
            ) : (
              "-"
            )}
          </Table.Cell>
          <Table.Cell onClick={(e) => e.stopPropagation()}>
            <CompanyApplicationStatusButton company={company} />
          </Table.Cell>
          <Table.Cell onClick={(e) => e.stopPropagation()}>
            <CompanyActionsMenu company={company} />
          </Table.Cell>
        </Table.Row>
      )
    })
  }

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex justify-between p-6">
          <Heading className="h1-core font-medium font-sans">
            {t("menuItem")}
          </Heading>
          <CompanyCreateDrawer />
        </div>
        <div className="grid grid-cols-1 gap-3 border-ui-border-base border-t px-6 py-4 md:grid-cols-[minmax(0,1fr)_220px_180px_220px]">
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("search.companies")}
            value={q}
          />
          <Select
            onValueChange={(value) => {
              setPageIndex(0)
              setOrderBy(value as CompanyOrder)
            }}
            value={orderBy}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {ORDER_OPTIONS.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {t(`orderOptions.${option.labelKey}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Select
            onValueChange={(value) => {
              setPageIndex(0)
              setStatus(value as CompanyStatusFilter)
            }}
            value={status}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {COMPANY_STATUS_OPTIONS.map((option) => (
                <Select.Item key={option} value={option}>
                  {t(`filters.status.${option}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Select
            onValueChange={(value) => {
              setPageIndex(0)
              setApplicationStatus(value as CompanyApplicationStatusFilter)
            }}
            value={applicationStatus}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {COMPANY_APPLICATION_STATUS_OPTIONS.map((option) => (
                <Select.Item key={option} value={option}>
                  {t(`filters.applicationStatus.${option}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        {isPending && <Text>{t("status.loading")}</Text>}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell />
              <Table.HeaderCell>{t("columns.name")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.phone")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.email")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.address")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.employees")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.customerGroup")}</Table.HeaderCell>
              <Table.HeaderCell>
                {t("columns.applicationState")}
              </Table.HeaderCell>
              <Table.HeaderCell>{t("columns.actions")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>{renderCompanyRows()}</Table.Body>
        </Table>
        <Table.Pagination
          canNextPage={pageIndex + 1 < pageCount}
          canPreviousPage={pageIndex > 0}
          count={count}
          nextPage={() => setPageIndex((current) => current + 1)}
          pageCount={pageCount}
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          previousPage={() =>
            setPageIndex((current) => Math.max(current - 1, 0))
          }
          translations={getPaginationTranslations(t)}
        />
      </Container>
      <Toaster />
    </>
  )
}

export const config = defineRouteConfig({
  label: "menuItem",
  icon: BuildingStorefront,
  translationNs: "companies",
})

export default Companies

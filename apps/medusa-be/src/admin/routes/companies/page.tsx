import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import {
  Avatar,
  Badge,
  Container,
  Heading,
  Input,
  StatusBadge,
  Table,
  Text,
  Toaster,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
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
import { CompanyActionsMenu, CompanyCreateDrawer } from "./components"

const PAGE_SIZE = 20

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

const Companies = () => {
  const { t } = useTranslation("companies")
  const navigate = useNavigate()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q)
  const companiesQuery = useMemo(
    () => ({
      fields: adminCompanyDisplayFieldsQuery,
      limit: String(PAGE_SIZE),
      offset: String(pageIndex * PAGE_SIZE),
      q: debouncedQ,
      with_deleted: "true",
    }),
    [debouncedQ, pageIndex]
  )
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
            <StatusBadge color={company.deleted_at ? "red" : "green"}>
              {company.deleted_at ? t("status.deleted") : t("status.active")}
            </StatusBadge>
          </Table.Cell>
          <Table.Cell>{formatCompanyAddress(company)}</Table.Cell>
          <Table.Cell>{company.employees?.length || 0}</Table.Cell>
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
        <div className="border-ui-border-base border-t px-6 py-4">
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("search.companies")}
            value={q}
          />
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

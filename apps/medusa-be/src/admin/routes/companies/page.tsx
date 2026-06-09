import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
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
import type { QueryCompany } from "../../../types"
import { useAdminCustomerGroups, useCompanies } from "../../hooks/api"
import { CompanyActionsMenu, CompanyCreateDrawer } from "./components"

const Companies = () => {
  const { t } = useTranslation("companies")
  const { data, isPending } = useCompanies({
    fields:
      "*employees,*employees.customer,*employees.company,*customer_group,*approval_settings",
  })

  const { data: customerGroups } = useAdminCustomerGroups()

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex justify-between p-6">
          <Heading className="h1-core font-medium font-sans">
            {t("menuItem")}
          </Heading>
          <CompanyCreateDrawer />
        </div>
        {isPending && <Text>{t("status.loading")}</Text>}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell />
              <Table.HeaderCell>{t("columns.name")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.phone")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.email")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.address")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.employees")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.customerGroup")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.actions")}</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          {data?.companies && (
            <Table.Body>
              {data.companies.map((company: QueryCompany) => (
                <Table.Row
                  className="cursor-pointer hover:bg-gray-50"
                  key={company.id}
                  onClick={() => {
                    window.location.href = `/app/companies/${company.id}`
                  }}
                >
                  <Table.Cell className="h-6 w-6 items-center justify-center">
                    <Avatar
                      fallback={company.name.charAt(0)}
                      src={company.logo_url || undefined}
                    />
                  </Table.Cell>
                  <Table.Cell>{company.name}</Table.Cell>
                  <Table.Cell>{company.phone}</Table.Cell>
                  <Table.Cell>{company.email}</Table.Cell>
                  <Table.Cell>{`${company.address}, ${company.city}, ${company.state} ${company.zip}`}</Table.Cell>
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
                    <CompanyActionsMenu
                      company={company}
                      customerGroups={customerGroups}
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          )}
        </Table>
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

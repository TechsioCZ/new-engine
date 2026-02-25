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
import type { QueryCompany } from "../../../types"
import { useAdminCustomerGroups, useCompanies } from "../../hooks/api"
import { CompanyActionsMenu, CompanyCreateDrawer } from "./components"

const Companies = () => {
  const { data, isPending } = useCompanies({
    fields:
      "*employees,*employees.customer,*employees.company,*customer_group,*approval_settings",
  })

  const { data: customerGroups } = useAdminCustomerGroups()

  return (
    <>
      <Container className="flex flex-col overflow-hidden p-0">
        <div className="flex justify-between p-6">
          <Heading className="h1-core font-medium font-sans">Companies</Heading>
          <CompanyCreateDrawer />
        </div>
        {isPending && <Text>Loading...</Text>}
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell />
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Phone</Table.HeaderCell>
              <Table.HeaderCell>Email</Table.HeaderCell>
              <Table.HeaderCell>Address</Table.HeaderCell>
              <Table.HeaderCell>Employees</Table.HeaderCell>
              <Table.HeaderCell>Customer Group</Table.HeaderCell>
              <Table.HeaderCell>Actions</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          {data?.companies && (
            <Table.Body>
              {data.companies.map((company: QueryCompany) => (
                <Table.Row
                  className="cursor-pointer hover:bg-gray-50"
                  key={company.id}
                  onClick={() =>
                    (window.location.href = `/app/companies/${company.id}`)
                  }
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
  label: "Companies",
  icon: BuildingStorefront,
})

export default Companies

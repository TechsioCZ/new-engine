import type { HttpTypes } from "@medusajs/types"
import { Button, Drawer, Hint, Table, toast } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import type { QueryCompany } from "../../../../types"
import {
  useAddCompanyToCustomerGroup,
  useRemoveCompanyFromCustomerGroup,
} from "../../../hooks/api"

export function CompanyCustomerGroupDrawer({
  company,
  customerGroups,
  open,
  setOpen,
}: {
  company: QueryCompany
  customerGroups?: HttpTypes.AdminCustomerGroup[]
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const { t } = useTranslation("companies")
  const { mutateAsync: addMutate, isPending: addLoading } =
    useAddCompanyToCustomerGroup(company.id)

  const { mutateAsync: removeMutate, isPending: removeLoading } =
    useRemoveCompanyFromCustomerGroup(company.id)

  const handleAdd = async (groupId: string) => {
    await addMutate(groupId, {
      onSuccess: async () => {
        setOpen(false)
        toast.success(t("toasts.companyAddedToCustomerGroup"))
      },
      onError: (_error) => {
        toast.error(t("errors.updateCustomerGroupFailed"))
      },
    })
  }

  const handleRemove = async (groupId: string) => {
    await removeMutate(groupId, {
      onSuccess: async () => {
        toast.success(t("toasts.companyRemovedFromCustomerGroup"))
      },
      onError: (error) => {
        console.log(error)
        toast.error(t("errors.removeCustomerGroupFailed"))
      },
    })
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Content className="z-50">
        <Drawer.Header>
          <Drawer.Title>
            {company.name
              ? t("customerGroup.title", { name: company.name })
              : t("customerGroup.titleFallback")}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="h-full space-y-4 overflow-y-hidden">
          <Hint variant="info">
            {t("customerGroup.hint", {
              count: company.employees?.length ?? 0,
              name: company.name,
            })}
          </Hint>
          <div className="h-full overflow-y-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>
                    {t("columns.customerGroup")}
                  </Table.HeaderCell>
                  <Table.HeaderCell className="text-right">
                    {t("columns.actions")}
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {customerGroups ? (
                  customerGroups.map((group) => (
                    <Table.Row key={group.id}>
                      <Table.Cell>{group.name}</Table.Cell>
                      <Table.Cell className="text-right">
                        {company.customer_group?.id &&
                        company.customer_group.id === group.id ? (
                          <Button
                            isLoading={removeLoading}
                            onClick={() => handleRemove(group.id)}
                            variant="danger"
                          >
                            {t("customerGroup.remove")}
                          </Button>
                        ) : (
                          <Button
                            disabled={
                              (company.customer_group?.id &&
                                company.customer_group.id !== group.id) ||
                              addLoading
                            }
                            isLoading={addLoading}
                            onClick={() => handleAdd(group.id)}
                          >
                            {t("customerGroup.add")}
                          </Button>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))
                ) : (
                  <Table.Row>
                    <Table.Cell>{t("customerGroup.empty")}</Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table>
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}

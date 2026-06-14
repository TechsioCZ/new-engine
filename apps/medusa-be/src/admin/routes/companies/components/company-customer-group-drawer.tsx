import type { HttpTypes } from "@medusajs/types"
import {
  Button,
  Drawer,
  Hint,
  Input,
  Table,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { QueryCompany } from "../../../../types"
import {
  useAddCompanyToCustomerGroup,
  useAdminCustomerGroups,
  useCustomerGroupCompanyOwners,
  useRemoveCompanyFromCustomerGroup,
} from "../../../hooks/api"
import { getPaginationTranslations } from "../../../lib/table"
import { useDebouncedValue } from "../../../lib/use-debounced-value"

const PAGE_SIZE = 20

const getActiveEmployeeCount = (company: QueryCompany) =>
  company.employees?.filter((employee) => !employee.deleted_at).length ?? 0

export function CompanyCustomerGroupDrawer({
  company,
  open,
  setOpen,
}: {
  company: QueryCompany
  open: boolean
  setOpen: (open: boolean) => void
}) {
  const { t } = useTranslation("companies")
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debouncedQ = useDebouncedValue(q)
  const customerGroupsQuery = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      q: debouncedQ,
    }),
    [debouncedQ, pageIndex]
  )
  const {
    data,
    error: customerGroupsError,
    isError: isCustomerGroupsError,
    isLoading,
  } = useAdminCustomerGroups(customerGroupsQuery, {
    enabled: open,
    placeholderData: (previousData) => previousData,
  })
  const { mutateAsync: addMutate, isPending: addLoading } =
    useAddCompanyToCustomerGroup(company.id)

  const { mutateAsync: removeMutate, isPending: removeLoading } =
    useRemoveCompanyFromCustomerGroup(company.id)

  const handleAdd = async (groupId: string) => {
    await addMutate(groupId, {
      onSuccess: async () => {
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
      onError: () => {
        toast.error(t("errors.removeCustomerGroupFailed"))
      },
    })
  }

  const customerGroups =
    (data?.customer_groups as HttpTypes.AdminCustomerGroup[] | undefined) ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  const customerGroupIds = useMemo(
    () => customerGroups.map((group) => group.id),
    [customerGroups]
  )
  const {
    data: ownerData,
    error: ownersError,
    isError: isOwnersError,
    isLoading: isOwnersLoading,
  } = useCustomerGroupCompanyOwners(customerGroupIds, {
    enabled: open && customerGroupIds.length > 0,
    placeholderData: (previousData) => previousData,
  })
  const ownersByGroupId = useMemo(() => {
    const ownerMap = new Map<string, QueryCompany[]>()

    for (const link of ownerData?.customer_group_links ?? []) {
      const owners = ownerMap.get(link.customer_group_id) ?? []
      owners.push(link.company as QueryCompany)
      ownerMap.set(link.customer_group_id, owners)
    }

    return ownerMap
  }, [ownerData])

  const getActiveLinkedCompany = (group: HttpTypes.AdminCustomerGroup) =>
    (ownersByGroupId.get(group.id) ?? []).find(
      (linkedCompany) =>
        linkedCompany.id !== company.id && !linkedCompany.deleted_at
    )

  const renderGroupName = (group: HttpTypes.AdminCustomerGroup) => {
    const activeLinkedCompany = getActiveLinkedCompany(group)

    if (!activeLinkedCompany) {
      return group.name
    }

    return (
      <Tooltip
        className="z-[60]"
        content={t("customerGroup.linkedToCompanyTooltip", {
          name: activeLinkedCompany.name,
        })}
        side="right"
      >
        <span>{group.name}</span>
      </Tooltip>
    )
  }

  const renderGroupAction = (group: HttpTypes.AdminCustomerGroup) => {
    const activeLinkedCompany = getActiveLinkedCompany(group)
    const isCurrentCompanyGroup = company.customer_group?.id === group.id

    if (isCurrentCompanyGroup) {
      return (
        <Button
          isLoading={removeLoading}
          onClick={() => handleRemove(group.id)}
          variant="danger"
        >
          {t("customerGroup.remove")}
        </Button>
      )
    }

    const addDisabled = Boolean(activeLinkedCompany) || addLoading
    return (
      <Button
        disabled={addDisabled}
        isLoading={addLoading}
        onClick={() => handleAdd(group.id)}
      >
        {t("customerGroup.set")}
      </Button>
    )
  }

  const renderGroupRows = () => {
    if (isLoading || isOwnersLoading) {
      return (
        <Table.Row>
          <Table.Cell>{t("status.loading")}</Table.Cell>
          <Table.Cell />
        </Table.Row>
      )
    }

    if (isCustomerGroupsError || isOwnersError) {
      return (
        <Table.Row>
          <Table.Cell className="text-ui-fg-error">
            {customerGroupsError?.message ||
              ownersError?.message ||
              t("errors.loadCustomerGroupsFailed")}
          </Table.Cell>
          <Table.Cell />
        </Table.Row>
      )
    }

    if (!customerGroups.length) {
      return (
        <Table.Row>
          <Table.Cell>{t("customerGroup.empty")}</Table.Cell>
          <Table.Cell />
        </Table.Row>
      )
    }

    return customerGroups.map((group) => {
      const activeLinkedCompany = getActiveLinkedCompany(group)

      return (
        <Table.Row
          className={
            activeLinkedCompany ? "cursor-not-allowed opacity-60" : undefined
          }
          key={group.id}
        >
          <Table.Cell>{renderGroupName(group)}</Table.Cell>
          <Table.Cell className="text-right">
            {renderGroupAction(group)}
          </Table.Cell>
        </Table.Row>
      )
    })
  }

  return (
    <Drawer onOpenChange={setOpen} open={open}>
      <Drawer.Content
        className="z-50"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          searchInputRef.current?.focus()
        }}
      >
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
              count: getActiveEmployeeCount(company),
              name: company.name,
            })}
          </Hint>
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("search.customerGroups")}
            ref={searchInputRef}
            value={q}
          />
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

              <Table.Body>{renderGroupRows()}</Table.Body>
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
          </div>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}

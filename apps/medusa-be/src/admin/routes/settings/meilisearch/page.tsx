import { defineRouteConfig } from "@medusajs/admin-sdk"
import { MagnifyingGlass, PencilSquare, Plus, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  StatusBadge,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { translateBreadcrumb } from "../../../lib/breadcrumb"
import {
  createSearchProfile,
  deleteSearchProfile,
  getMeilisearchStatus,
  listSalesChannels,
  listSearchProfiles,
  searchProfileQueryKeys,
  synchronizeSearchProfiles,
  updateSearchProfile,
} from "../../../lib/search-profiles"
import type {
  MeilisearchStatus,
  SearchProfile,
  SearchProfileInput,
  SearchSyncMode,
  SearchSyncStatus,
} from "../../../lib/search-profiles"
import { SearchProfileFormModal } from "./components/search-profile-form"
import { SearchTestPanel } from "./components/search-test-panel"

export const handle = {
  breadcrumb: () => translateBreadcrumb("meilisearch:menuItem", "Meilisearch"),
}

const STATUS_COLOR = {
  failed: "red",
  never: "grey",
  running: "orange",
  succeeded: "green",
} satisfies Record<SearchSyncStatus, "green" | "grey" | "orange" | "red">

const formatDate = (
  value: string | null,
  neverLabel: string,
  locale: string | undefined,
): string =>
  value === null || value === ""
    ? neverLabel
    : new Intl.DateTimeFormat(locale, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))

const ProfileBadges = ({ profile }: { profile: SearchProfile }) => {
  const { t } = useTranslation("meilisearch")

  return (
    <div className="flex flex-wrap gap-1">
      <Badge color={profile.strict ? "purple" : "grey"}>
        {profile.strict ? t("badges.strict") : t("badges.loose")}
      </Badge>
      <Badge color={profile.separate_variant_results ? "green" : "grey"}>
        {profile.separate_variant_results
          ? t("badges.separateVariants")
          : t("badges.groupedVariants")}
      </Badge>
    </div>
  )
}

const SettingsHeader = ({
  actionsDisabled,
  assignedProfileCount,
  onCreate,
  onSync,
  status,
  statusLoading,
  syncMode,
  syncPending,
  syncTarget,
}: {
  actionsDisabled: boolean
  assignedProfileCount: number
  onCreate: () => void
  onSync: (mode: SearchSyncMode) => void
  status?: MeilisearchStatus | undefined
  statusLoading: boolean
  syncMode?: SearchSyncMode | undefined
  syncPending: boolean
  syncTarget?: string | undefined
}) => {
  const { t } = useTranslation("meilisearch")
  let statusBadge: {
    color: "green" | "grey" | "red"
    label: string
  }

  if (statusLoading) {
    statusBadge = { color: "grey", label: t("connection.checking") }
  } else if (status?.connected === true) {
    statusBadge = { color: "green", label: t("connection.connected") }
  } else if (status?.enabled === true) {
    statusBadge = { color: "red", label: t("connection.unavailable") }
  } else {
    statusBadge = { color: "grey", label: t("connection.disabled") }
  }

  const syncDisabled =
    actionsDisabled || assignedProfileCount === 0 || syncPending

  return (
    <Container className="p-0">
      <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
        <div>
          <div className="flex items-center gap-2">
            <MagnifyingGlass />
            <Heading level="h1">{t("page.title")}</Heading>
          </div>
          <Text className="mt-1 text-ui-fg-subtle" size="small">
            {t("page.description")}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge color={statusBadge.color}>
            {statusBadge.label}
          </StatusBadge>
          {status?.error === undefined || status.error === "" ? null : (
            <Text className="text-ui-fg-error" size="xsmall">
              {status.error}
            </Text>
          )}
          <Button
            disabled={syncDisabled}
            isLoading={
              syncPending && syncTarget === "all" && syncMode === "normal"
            }
            variant="secondary"
            onClick={() => {
              onSync("normal")
            }}
          >
            {t("actions.syncAll")}
          </Button>
          <Button
            disabled={syncDisabled}
            isLoading={
              syncPending && syncTarget === "all" && syncMode === "full"
            }
            variant="secondary"
            onClick={() => {
              onSync("full")
            }}
          >
            {t("actions.fullRebuildAll")}
          </Button>
          <Button disabled={actionsDisabled} onClick={onCreate}>
            <Plus />
            {t("actions.addProfile")}
          </Button>
        </div>
      </div>
    </Container>
  )
}

const SearchProfileRow = ({
  actionsDisabled,
  isSyncing,
  onDelete,
  onEdit,
  onSync,
  profile,
  salesChannelNames,
}: {
  actionsDisabled: boolean
  isSyncing: (mode: SearchSyncMode) => boolean
  onDelete: () => void
  onEdit: () => void
  onSync: (mode: SearchSyncMode) => void
  profile: SearchProfile
  salesChannelNames: Map<string, string>
}) => {
  const { i18n, t } = useTranslation("meilisearch")

  return (
    <Table.Row>
      <Table.Cell>
        <Text size="small" weight="plus">
          {profile.key}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <div className="flex max-w-xs flex-wrap gap-1">
          {profile.sales_channel_ids.length === 0
            ? t("table.notAssigned")
            : profile.sales_channel_ids.map((id) => (
                <Badge color="grey" key={id}>
                  {salesChannelNames.get(id) ?? id}
                </Badge>
              ))}
        </div>
      </Table.Cell>
      <Table.Cell>
        <ProfileBadges profile={profile} />
      </Table.Cell>
      <Table.Cell>
        <div className="flex flex-col gap-1">
          <StatusBadge color={STATUS_COLOR[profile.last_sync_status]}>
            {t(`statuses.${profile.last_sync_status}`)}
          </StatusBadge>
          <Text className="text-ui-fg-subtle" size="xsmall">
            {formatDate(
              profile.last_synced_at,
              t("statuses.never"),
              i18n.resolvedLanguage,
            )}
          </Text>
          {profile.last_sync_error === null ||
          profile.last_sync_error === "" ? null : (
            <Text className="max-w-xs text-ui-fg-error" size="xsmall">
              {profile.last_sync_error}
            </Text>
          )}
        </div>
      </Table.Cell>
      <Table.Cell>
        <div className="flex justify-end gap-1">
          <Button
            disabled={actionsDisabled || profile.sales_channel_ids.length === 0}
            isLoading={isSyncing("normal")}
            size="small"
            variant="secondary"
            onClick={() => {
              onSync("normal")
            }}
          >
            {t("actions.sync")}
          </Button>
          <Button
            disabled={actionsDisabled || profile.sales_channel_ids.length === 0}
            isLoading={isSyncing("full")}
            size="small"
            variant="secondary"
            onClick={() => {
              onSync("full")
            }}
          >
            {t("actions.full")}
          </Button>
          <IconButton
            aria-label={t("actions.editProfile", { key: profile.key })}
            disabled={actionsDisabled}
            size="small"
            variant="transparent"
            onClick={onEdit}
          >
            <PencilSquare />
          </IconButton>
          <IconButton
            aria-label={t("actions.deleteProfile", { key: profile.key })}
            disabled={actionsDisabled}
            size="small"
            variant="transparent"
            onClick={onDelete}
          >
            <Trash />
          </IconButton>
        </div>
      </Table.Cell>
    </Table.Row>
  )
}

const SearchProfilesTable = ({
  actionsDisabled,
  error,
  loading,
  onDelete,
  onEdit,
  onSync,
  profiles,
  salesChannelNames,
  syncMode,
  syncPending,
  syncTarget,
}: {
  actionsDisabled: boolean
  error: Error | null
  loading: boolean
  onDelete: (profile: SearchProfile) => void
  onEdit: (profile: SearchProfile) => void
  onSync: (mode: SearchSyncMode, id: string) => void
  profiles: SearchProfile[]
  salesChannelNames: Map<string, string>
  syncMode?: SearchSyncMode | undefined
  syncPending: boolean
  syncTarget?: string | undefined
}) => {
  const { t } = useTranslation("meilisearch")

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-5">
        <Heading level="h2">{t("table.title")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("table.description")}
        </Text>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[1000px]">
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("columns.profile")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.salesChannels")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.behavior")}</Table.HeaderCell>
              <Table.HeaderCell>
                {t("columns.lastSynchronization")}
              </Table.HeaderCell>
              <Table.HeaderCell className="text-right">
                {t("columns.actions")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {loading ? (
              <Table.Row>
                <Table.Cell>{t("table.loading")}</Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            ) : null}
            {error === null ? null : (
              <Table.Row>
                <Table.Cell className="text-ui-fg-error">
                  {error.message}
                </Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            )}
            {!loading && error === null && profiles.length === 0 ? (
              <Table.Row>
                <Table.Cell>{t("table.empty")}</Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            ) : null}
            {profiles.map((profile) => (
              <SearchProfileRow
                actionsDisabled={actionsDisabled || syncPending}
                isSyncing={(mode) =>
                  syncPending && syncTarget === profile.id && syncMode === mode
                }
                key={profile.id}
                profile={profile}
                salesChannelNames={salesChannelNames}
                onDelete={() => {
                  onDelete(profile)
                }}
                onEdit={() => {
                  onEdit(profile)
                }}
                onSync={(mode) => {
                  onSync(mode, profile.id)
                }}
              />
            ))}
          </Table.Body>
        </Table>
      </div>
    </Container>
  )
}

const MeilisearchSettingsPage = () => {
  const { t } = useTranslation("meilisearch")
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [formOpen, setFormOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<SearchProfile>()
  const [syncTarget, setSyncTarget] = useState<string>()
  const profilesQuery = useQuery({
    queryFn: listSearchProfiles,
    queryKey: searchProfileQueryKeys.list(),
  })
  const salesChannelsQuery = useQuery({
    queryFn: listSalesChannels,
    queryKey: searchProfileQueryKeys.salesChannels(),
  })
  const statusQuery = useQuery({
    queryFn: getMeilisearchStatus,
    queryKey: searchProfileQueryKeys.status(),
    retry: 1,
  })

  const refreshProfiles = async () => {
    await queryClient.invalidateQueries({
      queryKey: searchProfileQueryKeys.all,
    })
  }

  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id?: string
      input: SearchProfileInput
    }) =>
      await (id === undefined
        ? createSearchProfile(input)
        : updateSearchProfile(id, input)),
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveProfile"),
      )
    },
    onSuccess: async (_profile, variables) => {
      await refreshProfiles()
      toast.success(
        variables.id === undefined ? t("toasts.created") : t("toasts.updated"),
      )
      setFormOpen(false)
      setEditingProfile(undefined)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSearchProfile,
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.deleteProfile"),
      )
    },
    onSuccess: async () => {
      await refreshProfiles()
      toast.success(t("toasts.deleted"))
    },
  })

  const syncMutation = useMutation({
    mutationFn: async ({
      id,
      mode,
    }: {
      id?: string | undefined
      mode: SearchSyncMode
    }) => await synchronizeSearchProfiles(mode, id),
    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.synchronization"),
      )
    },
    onSettled: async () => {
      setSyncTarget(undefined)
      await refreshProfiles()
    },
    onSuccess: ({ result }) => {
      if (result.status === "skipped_lock_contended") {
        toast.warning(t("toasts.syncSkippedLockContended"))
        return
      }
      if (result.status === "skipped_disabled") {
        toast.warning(t("toasts.syncSkippedDisabled"))
        return
      }
      toast.success(
        t("toasts.syncCompleted", {
          deleted: result.deleted,
          indexed: result.indexed,
          mode: t(`syncModes.${result.mode}`),
        }),
      )
    },
  })

  const mutationPending =
    saveMutation.isPending || deleteMutation.isPending || syncMutation.isPending
  const profiles = profilesQuery.data ?? []
  const assignedProfileCount = profiles.filter(
    (profile) => profile.sales_channel_ids.length > 0,
  ).length
  const salesChannels = salesChannelsQuery.data ?? []
  const salesChannelNames = new Map(
    salesChannels.map((channel) => [channel.id, channel.name]),
  )

  const startSync = (mode: SearchSyncMode, id?: string) => {
    if (mutationPending) {
      return
    }
    setSyncTarget(id ?? "all")
    syncMutation.mutate({ id, mode })
  }

  const requestDelete = async (profile: SearchProfile) => {
    const confirmed = await prompt({
      cancelText: t("actions.cancel"),
      confirmText: t("actions.delete"),
      description: t("prompts.deleteProfile.description"),
      title: t("prompts.deleteProfile.title", { key: profile.key }),
    })

    if (confirmed && !mutationPending) {
      deleteMutation.mutate(profile.id)
    }
  }

  const handleDelete = async (profile: SearchProfile) => {
    try {
      await requestDelete(profile)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("errors.confirmDeletion"),
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <SettingsHeader
        actionsDisabled={mutationPending}
        assignedProfileCount={assignedProfileCount}
        status={statusQuery.data}
        statusLoading={statusQuery.isLoading}
        syncMode={syncMutation.variables?.mode}
        syncPending={syncMutation.isPending}
        syncTarget={syncTarget}
        onCreate={() => {
          setEditingProfile(undefined)
          setFormOpen(true)
        }}
        onSync={startSync}
      />
      <SearchProfilesTable
        actionsDisabled={mutationPending}
        error={profilesQuery.error}
        loading={profilesQuery.isLoading}
        profiles={profiles}
        salesChannelNames={salesChannelNames}
        syncMode={syncMutation.variables?.mode}
        syncPending={syncMutation.isPending}
        syncTarget={syncTarget}
        onDelete={(profile) => {
          void handleDelete(profile)
        }}
        onEdit={(profile) => {
          setEditingProfile(profile)
          setFormOpen(true)
        }}
        onSync={startSync}
      />
      <Container className="p-0">
        <SearchTestPanel profiles={profiles} />
      </Container>
      <SearchProfileFormModal
        key={formOpen ? (editingProfile?.id ?? "create") : "closed"}
        open={formOpen}
        profile={editingProfile}
        salesChannels={salesChannels}
        submitting={saveMutation.isPending}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditingProfile(undefined)
          }
        }}
        onSubmit={(input) => {
          saveMutation.mutate({
            ...(editingProfile === undefined ? {} : { id: editingProfile.id }),
            input,
          })
        }}
      />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "menuItem",
  translationNs: "meilisearch",
})

export default MeilisearchSettingsPage

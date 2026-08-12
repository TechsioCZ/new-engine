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
import {
  createSearchProfile,
  deleteSearchProfile,
  getMeilisearchStatus,
  listSalesChannels,
  listSearchProfiles,
  type SearchProfile,
  type SearchProfileInput,
  type SearchSyncMode,
  searchProfileQueryKeys,
  synchronizeSearchProfiles,
  updateSearchProfile,
} from "../../../lib/search-profiles"
import { SearchProfileFormModal } from "./components/search-profile-form"
import { SearchTestPanel } from "./components/search-test-panel"

export const handle = {
  breadcrumb: () => "Meilisearch",
}

const formatDate = (value: string | null): string => {
  if (!value) {
    return "Never"
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

const syncStatusColor = (
  status: SearchProfile["last_sync_status"]
): "green" | "red" | "orange" | "grey" => {
  if (status === "succeeded") {
    return "green"
  }

  if (status === "failed") {
    return "red"
  }

  if (status === "running") {
    return "orange"
  }

  return "grey"
}

const ProfileBadges = ({ profile }: { profile: SearchProfile }) => (
  <div className="flex flex-wrap gap-1">
    <Badge color={profile.strict ? "purple" : "grey"}>
      {profile.strict ? "Strict" : "Loose"}
    </Badge>

    <Badge color={profile.separate_variant_results ? "green" : "grey"}>
      {profile.separate_variant_results
        ? "Separate variants"
        : "Grouped variants"}
    </Badge>
  </div>
)

const getMeilisearchStatusBadge = (options: {
  connected?: boolean
  enabled?: boolean
  loading: boolean
}): {
  color: "green" | "red" | "grey"
  label: string
} => {
  if (options.loading) {
    return { color: "grey", label: "Checking" }
  }

  if (options.connected) {
    return { color: "green", label: "Connected" }
  }

  if (options.enabled) {
    return { color: "red", label: "Unavailable" }
  }

  return { color: "grey", label: "Disabled" }
}

const MeilisearchSettingsPage = () => {
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

  const saveMutationOptions = {
    mutationFn: (input: SearchProfileInput) =>
      editingProfile
        ? updateSearchProfile(editingProfile.id, input)
        : createSearchProfile(input),

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to save profile."
      )
    },

    onSuccess: async () => {
      await refreshProfiles()

      toast.success(
        editingProfile ? "Search profile updated." : "Search profile created."
      )

      setFormOpen(false)
      setEditingProfile(undefined)
    },
  }

  const saveMutation = useMutation(saveMutationOptions)

  const deleteMutationOptions = {
    mutationFn: deleteSearchProfile,

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete profile."
      )
    },

    onSuccess: async () => {
      await refreshProfiles()

      toast.success("Search profile deleted. Existing indexes were preserved.")
    },
  }

  const deleteMutation = useMutation(deleteMutationOptions)

  const syncMutationOptions = {
    mutationFn: ({ id, mode }: { id?: string; mode: SearchSyncMode }) =>
      synchronizeSearchProfiles(mode, id),

    onError: (error: unknown) => {
      toast.error(
        error instanceof Error ? error.message : "Synchronization failed."
      )
    },

    onSettled: async () => {
      setSyncTarget(undefined)

      await refreshProfiles()
    },

    onSuccess: ({
      result,
    }: Awaited<ReturnType<typeof synchronizeSearchProfiles>>) => {
      toast.success(
        `${result.mode === "full" ? "Full rebuild" : "Normal synchronization"} completed: ${result.indexed} indexed, ${result.deleted} deleted.`
      )
    },
  }

  const syncMutation = useMutation(syncMutationOptions)
  const profiles = profilesQuery.data ?? []
  const assignedProfiles = profiles.filter(
    (profile) => profile.sales_channel_ids.length > 0
  )
  const salesChannels = salesChannelsQuery.data ?? []
  const salesChannelNames = new Map(
    salesChannels.map((channel) => [channel.id, channel.name])
  )
  const meilisearchStatusBadge = getMeilisearchStatusBadge({
    connected: statusQuery.data?.connected,
    enabled: statusQuery.data?.enabled,
    loading: statusQuery.isLoading,
  })

  const startSync = (mode: SearchSyncMode, id?: string) => {
    setSyncTarget(id ?? "all")

    syncMutation.mutate({ id, mode })
  }

  const requestDelete = async (profile: SearchProfile) => {
    const confirmed = await prompt({
      title: `Delete ${profile.key}?`,
      description:
        "The profile will stop resolving and synchronizing. Existing Meilisearch indexes are deliberately preserved for rollback.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })

    if (confirmed) {
      deleteMutation.mutate(profile.id)
    }
  }

  const openCreate = () => {
    setEditingProfile(undefined)
    setFormOpen(true)
  }

  const openEdit = (profile: SearchProfile) => {
    setEditingProfile(profile)
    setFormOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <Container className="p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <MagnifyingGlass />

              <Heading level="h1">Meilisearch Configuration</Heading>
            </div>

            <Text className="mt-1 text-ui-fg-subtle" size="small">
              Domain-scoped search profiles are stored in Medusa and applied to
              storefront search, autocomplete, and synchronization.
            </Text>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge color={meilisearchStatusBadge.color}>
              {meilisearchStatusBadge.label}
            </StatusBadge>
            {statusQuery.data?.error && (
              <Text className="text-ui-fg-error" size="xsmall">
                {statusQuery.data.error}
              </Text>
            )}

            <Button
              disabled={assignedProfiles.length === 0}
              isLoading={
                syncMutation.isPending &&
                syncTarget === "all" &&
                syncMutation.variables?.mode === "normal"
              }
              onClick={() => startSync("normal")}
              variant="secondary"
            >
              Sync all
            </Button>

            <Button
              disabled={assignedProfiles.length === 0}
              isLoading={
                syncMutation.isPending &&
                syncTarget === "all" &&
                syncMutation.variables?.mode === "full"
              }
              onClick={() => startSync("full")}
              variant="secondary"
            >
              Full rebuild all
            </Button>

            <Button onClick={openCreate}>
              <Plus />
              Add profile
            </Button>
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="px-6 py-5">
          <Heading level="h2">Search profiles</Heading>

          <Text className="text-ui-fg-subtle" size="small">
            One profile represents a unique Shop + Domain ID + Language
            combination and maps it to Medusa Sales Channels.
          </Text>
        </div>

        <div className="overflow-x-auto">
          <Table className="min-w-[1000px]">
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Profile</Table.HeaderCell>

                <Table.HeaderCell>Sales Channels</Table.HeaderCell>

                <Table.HeaderCell>Behavior</Table.HeaderCell>

                <Table.HeaderCell>Last synchronization</Table.HeaderCell>

                <Table.HeaderCell className="text-right">
                  Actions
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {profilesQuery.isLoading && (
                <Table.Row>
                  <Table.Cell>Loading profiles…</Table.Cell>

                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                </Table.Row>
              )}
              {profilesQuery.error && (
                <Table.Row>
                  <Table.Cell className="text-ui-fg-error">
                    {profilesQuery.error.message}
                  </Table.Cell>

                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                </Table.Row>
              )}
              {!(
                profilesQuery.isLoading ||
                profilesQuery.error ||
                profiles.length
              ) && (
                <Table.Row>
                  <Table.Cell>No search profiles configured.</Table.Cell>

                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                  <Table.Cell />
                </Table.Row>
              )}
              {profiles.map((profile) => (
                <Table.Row key={profile.id}>
                  <Table.Cell>
                    <div>
                      <Text size="small" weight="plus">
                        {profile.key}
                      </Text>
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {profile.sales_channel_ids.length
                        ? profile.sales_channel_ids.map((id) => (
                            <Badge color="grey" key={id}>
                              {salesChannelNames.get(id) ?? id}
                            </Badge>
                          ))
                        : "Not assigned"}
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <ProfileBadges profile={profile} />
                  </Table.Cell>

                  <Table.Cell>
                    <div className="flex flex-col gap-1">
                      <StatusBadge
                        color={syncStatusColor(profile.last_sync_status)}
                      >
                        {profile.last_sync_status}
                      </StatusBadge>

                      <Text className="text-ui-fg-subtle" size="xsmall">
                        {formatDate(profile.last_synced_at)}
                      </Text>
                      {profile.last_sync_error && (
                        <Text
                          className="max-w-xs text-ui-fg-error"
                          size="xsmall"
                        >
                          {profile.last_sync_error}
                        </Text>
                      )}
                    </div>
                  </Table.Cell>

                  <Table.Cell>
                    <div className="flex justify-end gap-1">
                      <Button
                        disabled={profile.sales_channel_ids.length === 0}
                        isLoading={
                          syncMutation.isPending &&
                          syncTarget === profile.id &&
                          syncMutation.variables?.mode === "normal"
                        }
                        onClick={() => startSync("normal", profile.id)}
                        size="small"
                        variant="secondary"
                      >
                        Sync
                      </Button>

                      <Button
                        disabled={profile.sales_channel_ids.length === 0}
                        isLoading={
                          syncMutation.isPending &&
                          syncTarget === profile.id &&
                          syncMutation.variables?.mode === "full"
                        }
                        onClick={() => startSync("full", profile.id)}
                        size="small"
                        variant="secondary"
                      >
                        Full
                      </Button>

                      <IconButton
                        aria-label={`Edit ${profile.key}`}
                        onClick={() => openEdit(profile)}
                        size="small"
                        variant="transparent"
                      >
                        <PencilSquare />
                      </IconButton>

                      <IconButton
                        aria-label={`Delete ${profile.key}`}
                        onClick={() => requestDelete(profile)}
                        size="small"
                        variant="transparent"
                      >
                        <Trash />
                      </IconButton>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </div>
      </Container>

      <Container className="p-0">
        <SearchTestPanel profiles={profiles} />
      </Container>

      <SearchProfileFormModal
        onOpenChange={(open) => {
          setFormOpen(open)

          if (!open) {
            setEditingProfile(undefined)
          }
        }}
        onSubmit={(input) => saveMutation.mutate(input)}
        open={formOpen}
        profile={editingProfile}
        salesChannels={salesChannels}
        submitting={saveMutation.isPending}
      />
    </div>
  )
}

export const config = defineRouteConfig({ label: "Meilisearch" })

export default MeilisearchSettingsPage

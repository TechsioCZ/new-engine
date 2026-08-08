import {
  Button,
  Heading,
  Input,
  Label,
  Select,
  Table,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation } from "@tanstack/react-query"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  SEARCH_INDEX_TYPES,
  testSearchProfile,
} from "../../../../lib/search-profiles"
import type {
  SearchIndexType,
  SearchProfile,
  SearchTestResult,
} from "../../../../lib/search-profiles"

const SEARCH_INDEX_TYPE_SET = new Set<string>(SEARCH_INDEX_TYPES)

interface SearchTestSubmission {
  profileId: string
  query: string
  result: SearchTestResult
  type: SearchIndexType
}

interface SearchTestVariables {
  profileId: string
  query: string
  type: SearchIndexType
}

const isSearchIndexType = (value: string): value is SearchIndexType =>
  SEARCH_INDEX_TYPE_SET.has(value)

const hitLabel = (
  hit: Record<string, unknown>,
  untitledLabel: string,
): string => {
  for (const field of ["title", "name", "handle", "href", "id"]) {
    const value = hit[field]

    if (typeof value === "string" && value !== "") {
      return value
    }
  }

  return untitledLabel
}

const hitId = (hit: Record<string, unknown>, index: number): string => {
  const value = hit["id"]

  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : `result-${index}`
}

const SearchResultTable = ({ result }: { result: SearchTestResult }) => {
  const { t } = useTranslation("meilisearch")
  const processingTime =
    result.processing_time_ms === null
      ? ""
      : t("test.processingTime", { time: result.processing_time_ms })
  const minimumScore =
    result.minimum_ranking_score === null
      ? ""
      : t("test.minimumScore", { score: result.minimum_ranking_score })

  return (
    <div className="overflow-hidden rounded-lg border border-ui-border-base">
      <div className="flex flex-wrap items-center justify-between gap-2 border-ui-border-base border-b px-4 py-3">
        <Text size="small" weight="plus">
          {t("test.acceptedSummary", {
            accepted: result.hits.length,
            raw: result.raw_hit_count,
          })}
        </Text>
        <Text className="text-ui-fg-subtle" size="xsmall">
          {processingTime}
          {processingTime !== "" && minimumScore !== "" ? " · " : null}
          {minimumScore}
        </Text>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("columns.result")}</Table.HeaderCell>
            <Table.HeaderCell>ID</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.rankingScore")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.document")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {result.hits.length === 0 ? (
            <Table.Row>
              <Table.Cell>{t("test.empty")}</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
          ) : (
            result.hits.map((hit, index) => (
              <Table.Row key={hitId(hit, index)}>
                <Table.Cell>
                  {hitLabel(hit, t("test.untitledResult"))}
                </Table.Cell>
                <Table.Cell className="text-ui-fg-subtle">
                  {hitId(hit, index)}
                </Table.Cell>
                <Table.Cell>
                  {typeof hit["_rankingScore"] === "number"
                    ? hit["_rankingScore"].toFixed(4)
                    : "—"}
                </Table.Cell>
                <Table.Cell>
                  <details>
                    <summary className="cursor-pointer text-ui-fg-interactive">
                      {t("actions.inspect")}
                    </summary>
                    <pre className="mt-2 max-h-72 max-w-xl overflow-auto whitespace-pre-wrap rounded bg-ui-bg-subtle p-3 text-xs">
                      {JSON.stringify(hit, null, 2)}
                    </pre>
                  </details>
                </Table.Cell>
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table>
    </div>
  )
}

export const SearchTestPanel = ({
  profiles,
}: {
  profiles: SearchProfile[]
}) => {
  const { t } = useTranslation("meilisearch")
  const assignedProfiles = profiles.filter(
    (profile) => profile.sales_channel_ids.length > 0,
  )
  const [firstAssignedProfile] = assignedProfiles
  const [selectedProfileId, setSelectedProfileId] = useState("")
  const [type, setType] = useState<SearchIndexType>("product")
  const [query, setQuery] = useState("")
  const [submission, setSubmission] = useState<SearchTestSubmission>()
  const requestPending = useRef(false)
  const selectedProfileIsAvailable = assignedProfiles.some(
    (profile) => profile.id === selectedProfileId,
  )
  const profileId = selectedProfileIsAvailable
    ? selectedProfileId
    : (firstAssignedProfile?.id ?? "")

  const mutation = useMutation({
    mutationFn: async (variables: SearchTestVariables) =>
      await testSearchProfile(variables.profileId, {
        limit: 10,
        query: variables.query,
        type: variables.type,
      }),
    onError: (error: unknown) => {
      setSubmission(undefined)
      toast.error(
        error instanceof Error ? error.message : t("errors.searchTest"),
      )
    },
    onMutate: () => {
      setSubmission(undefined)
    },
    onSettled: () => {
      requestPending.current = false
    },
    onSuccess: (result, variables) => {
      setSubmission({ ...variables, result })
      toast.success(t("toasts.searchResults", { count: result.hits.length }))
    },
  })
  const visibleResult =
    submission?.profileId === profileId &&
    submission.query === query &&
    submission.type === type
      ? submission.result
      : undefined
  const runSearchTest = () => {
    if (requestPending.current || profileId === "") {
      return
    }
    requestPending.current = true
    mutation.mutate({ profileId, query, type })
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      <div>
        <Heading level="h2">{t("test.title")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("test.description")}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_180px_2fr_auto] md:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-test-profile">
            {t("fields.searchProfile")}
          </Label>
          <Select value={profileId} onValueChange={setSelectedProfileId}>
            <Select.Trigger
              disabled={mutation.isPending}
              id="search-test-profile"
            >
              <Select.Value placeholder={t("placeholders.selectProfile")} />
            </Select.Trigger>
            <Select.Content>
              {assignedProfiles.map((profile) => (
                <Select.Item key={profile.id} value={profile.id}>
                  {profile.key}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-test-type">
            {t("fields.searchIndexType")}
          </Label>
          <Select
            value={type}
            onValueChange={(value) => {
              if (isSearchIndexType(value)) {
                setType(value)
              }
            }}
          >
            <Select.Trigger disabled={mutation.isPending} id="search-test-type">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {SEARCH_INDEX_TYPES.map((indexType) => (
                <Select.Item key={indexType} value={indexType}>
                  {t(`indexTypes.${indexType}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-test-query">{t("fields.query")}</Label>
          <Input
            disabled={mutation.isPending}
            id="search-test-query"
            placeholder={t("placeholders.query")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && profileId !== "") {
                runSearchTest()
              }
            }}
          />
        </div>
        <Button
          disabled={profileId === "" || mutation.isPending}
          isLoading={mutation.isPending}
          type="button"
          onClick={() => {
            runSearchTest()
          }}
        >
          {t("actions.testSearch")}
        </Button>
      </div>
      {visibleResult === undefined ? null : (
        <SearchResultTable result={visibleResult} />
      )}
    </div>
  )
}

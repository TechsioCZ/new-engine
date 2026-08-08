import {
  Button,
  Checkbox,
  FocusModal,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
} from "@medusajs/ui"
import { useId, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { useTranslation } from "react-i18next"

import {
  SEARCH_INDEX_TYPES,
  toSearchProfileInput,
} from "../../../../lib/search-profiles"
import type {
  SalesChannelOption,
  SearchIndexType,
  SearchProfile,
  SearchProfileInput,
} from "../../../../lib/search-profiles"

const PROFILE_FIELD_ID_PREFIX = "search-profile-"

type AutocompleteLimitField =
  | "autocomplete_product_limit"
  | "autocomplete_category_limit"
  | "autocomplete_brand_limit"
  | "autocomplete_content_limit"

const AUTOCOMPLETE_LIMIT_FIELD_BY_TYPE: Record<
  SearchIndexType,
  AutocompleteLimitField
> = {
  brand: "autocomplete_brand_limit",
  category: "autocomplete_category_limit",
  content: "autocomplete_content_limit",
  product: "autocomplete_product_limit",
}

interface FormFieldsProps {
  form: SearchProfileInput
  setForm: Dispatch<SetStateAction<SearchProfileInput>>
}

const NumberField = ({
  description,
  id,
  label,
  max,
  min = 1,
  onChange,
  value,
}: {
  description: string
  id: string
  label: string
  max: number
  min?: number
  onChange: (value: number) => void
  value: number
}) => {
  const descriptionId = `${id}-description`

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        aria-describedby={descriptionId}
        id={id}
        max={max}
        min={min}
        required
        type="number"
        value={value}
        onChange={(event) => {
          onChange(Number(event.target.value))
        }}
      />
      <Text className="text-ui-fg-subtle" id={descriptionId} size="xsmall">
        {description}
      </Text>
    </div>
  )
}

const ToggleField = ({
  checked,
  description,
  label,
  onCheckedChange,
}: {
  checked: boolean
  description: string
  label: string
  onCheckedChange: (checked: boolean) => void
}) => {
  const id = useId()
  const descriptionId = `${id}-description`

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-ui-border-base p-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <Text className="text-ui-fg-subtle" id={descriptionId} size="small">
          {description}
        </Text>
      </div>
      <Switch
        aria-describedby={descriptionId}
        checked={checked}
        id={id}
        onCheckedChange={onCheckedChange}
      />
    </div>
  )
}

const normalizeProfileKeySegment = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .replaceAll(/[^a-z0-9_-]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replaceAll(/^-|-$/gu, "")

const generatedProfileKey = (form: SearchProfileInput) =>
  [form.shop, form.domain, form.locale]
    .map(normalizeProfileKeySegment)
    .filter((segment) => segment !== "")
    .join("-")

const StorefrontScopeFields = ({ form, setForm }: FormFieldsProps) => {
  const { t } = useTranslation("meilisearch")

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Heading level="h2">{t("form.storefrontScope.title")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("form.storefrontScope.description")}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-profile-key">{t("fields.profileKey")}</Label>
          <Input
            id="search-profile-key"
            placeholder="herbatika-1-sk"
            readOnly
            required
            value={generatedProfileKey(form)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-profile-shop">{t("fields.shop")}</Label>
          <Input
            id="search-profile-shop"
            placeholder="herbatika"
            required
            value={form.shop}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                shop: event.target.value.toLowerCase(),
              }))
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-profile-domain">{t("fields.domain")}</Label>
          <Input
            id="search-profile-domain"
            placeholder="1"
            required
            value={form.domain}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                domain: event.target.value.toLowerCase(),
              }))
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-profile-locale">{t("fields.language")}</Label>
          <Input
            id="search-profile-locale"
            placeholder="sk"
            required
            value={form.locale}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                locale: event.target.value.toLowerCase(),
              }))
            }}
          />
        </div>
      </div>
    </section>
  )
}

const SalesChannelFields = ({
  form,
  salesChannels,
  setForm,
}: FormFieldsProps & { salesChannels: SalesChannelOption[] }) => {
  const { t } = useTranslation("meilisearch")
  const selectedChannelIds = new Set(form.sales_channel_ids)
  const toggleSalesChannel = (id: string, checked: boolean) => {
    setForm((current) => ({
      ...current,
      sales_channel_ids: checked
        ? [...new Set([...current.sales_channel_ids, id])]
        : current.sales_channel_ids.filter((entry) => entry !== id),
    }))
  }

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Heading level="h2">{t("form.salesChannels.title")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("form.salesChannels.description")}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {salesChannels.length === 0 ? (
          <Text className="text-ui-fg-subtle">
            {t("form.salesChannels.empty")}
          </Text>
        ) : (
          salesChannels.map((channel) => (
            <label
              className="flex cursor-pointer items-center gap-3 rounded-lg border border-ui-border-base p-3"
              htmlFor={`${PROFILE_FIELD_ID_PREFIX}channel-${channel.id}`}
              key={channel.id}
            >
              <Checkbox
                checked={selectedChannelIds.has(channel.id)}
                id={`${PROFILE_FIELD_ID_PREFIX}channel-${channel.id}`}
                onCheckedChange={(checked) => {
                  toggleSalesChannel(channel.id, checked === true)
                }}
              />
              <span>
                <Text weight="plus">{channel.name}</Text>
                <Text className="text-ui-fg-subtle" size="xsmall">
                  {channel.id}
                </Text>
              </span>
            </label>
          ))
        )}
      </div>
    </section>
  )
}

const isAvailability = (
  value: string,
): value is SearchProfileInput["availability"] =>
  value === "all" || value === "in-stock"

const SearchBehaviorFields = ({ form, setForm }: FormFieldsProps) => {
  const { t } = useTranslation("meilisearch")
  const effectiveScore =
    form.minimum_ranking_score ?? (form.strict ? 0.98 : 0.55)

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Heading level="h2">{t("form.searchBehavior.title")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("form.searchBehavior.description")}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ToggleField
          checked={form.strict}
          description={t("form.strictSearch.description")}
          label={t("form.strictSearch.label")}
          onCheckedChange={(strict) => {
            setForm((current) => {
              const previousDefault = current.strict ? 0.98 : 0.55
              const scoreFollowedPreviousDefault =
                current.minimum_ranking_score === previousDefault

              return {
                ...current,
                minimum_ranking_score: scoreFollowedPreviousDefault
                  ? null
                  : current.minimum_ranking_score,
                strict,
              }
            })
          }}
        />
        <ToggleField
          checked={form.separate_variant_results}
          description={t("form.separateVariants.description")}
          label={t("form.separateVariants.label")}
          onCheckedChange={(separateVariantResults) => {
            setForm((current) => ({
              ...current,
              separate_variant_results: separateVariantResults,
            }))
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-profile-availability">
            {t("fields.availability")}
          </Label>
          <Select
            value={form.availability}
            onValueChange={(availability) => {
              if (isAvailability(availability)) {
                setForm((current) => ({ ...current, availability }))
              }
            }}
          >
            <Select.Trigger id="search-profile-availability">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">{t("availability.all")}</Select.Item>
              <Select.Item value="in-stock">
                {t("availability.inStock")}
              </Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="search-profile-ranking-score">
            {t("fields.minimumRankingScore")}
          </Label>
          <Input
            aria-describedby="search-profile-ranking-score-description"
            id="search-profile-ranking-score"
            max={1}
            min={0}
            placeholder={t("form.rankingScore.automatic", {
              score: form.strict ? "0.98" : "0.55",
            })}
            step="0.01"
            type="number"
            value={form.minimum_ranking_score ?? ""}
            onChange={(event) => {
              const { value } = event.target
              setForm((current) => ({
                ...current,
                minimum_ranking_score: value === "" ? null : Number(value),
              }))
            }}
          />
          <Text
            className="text-ui-fg-subtle"
            id="search-profile-ranking-score-description"
            size="xsmall"
          >
            {t("form.rankingScore.effective", { score: effectiveScore })}
          </Text>
        </div>
      </div>
    </section>
  )
}

const ResultLimitFields = ({ form, setForm }: FormFieldsProps) => {
  const { t } = useTranslation("meilisearch")

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Heading level="h2">{t("form.resultLimits.title")}</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          {t("form.resultLimits.description")}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NumberField
          description={t("resultLimitDescriptions.resultsPerPage")}
          id="search-profile-results-per-page"
          label={t("fields.resultsPerPage")}
          max={100}
          value={form.max_results_per_page}
          onChange={(value) => {
            setForm((current) => ({
              ...current,
              max_results_per_page: value,
            }))
          }}
        />
        <NumberField
          description={t("resultLimitDescriptions.fullSearchCandidates")}
          id="search-profile-full-search-candidates"
          label={t("fields.fullSearchCandidates")}
          max={1000}
          value={form.full_search_limit}
          onChange={(value) => {
            setForm((current) => ({ ...current, full_search_limit: value }))
          }}
        />
        <NumberField
          description={t("resultLimitDescriptions.popularProducts")}
          id="search-profile-popular-products"
          label={t("fields.popularProducts")}
          max={48}
          value={form.popular_limit}
          onChange={(value) => {
            setForm((current) => ({ ...current, popular_limit: value }))
          }}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {SEARCH_INDEX_TYPES.map((type) => {
          const field = AUTOCOMPLETE_LIMIT_FIELD_BY_TYPE[type]
          const translatedType = t(`indexTypes.${type}`)

          return (
            <NumberField
              description={t("form.autocomplete.description", {
                type: translatedType,
              })}
              id={`search-profile-autocomplete-${type}`}
              key={type}
              label={t("form.autocomplete.label", { type: translatedType })}
              max={24}
              value={form[field]}
              onChange={(value) => {
                setForm((current) => ({ ...current, [field]: value }))
              }}
            />
          )
        })}
      </div>
    </section>
  )
}

const SearchProfileFields = ({
  form,
  salesChannels,
  setForm,
}: FormFieldsProps & { salesChannels: SalesChannelOption[] }) => (
  <div className="flex flex-col gap-8 pb-8">
    <StorefrontScopeFields form={form} setForm={setForm} />
    <SalesChannelFields
      form={form}
      salesChannels={salesChannels}
      setForm={setForm}
    />
    <SearchBehaviorFields form={form} setForm={setForm} />
    <ResultLimitFields form={form} setForm={setForm} />
  </div>
)

const isValidProfileInput = (form: SearchProfileInput): boolean => {
  const scopeIsValid = [
    generatedProfileKey(form),
    form.shop,
    form.domain,
    form.locale,
  ].every((value) => value.trim().length > 0)
  const limitsAreValid = [
    form.autocomplete_product_limit,
    form.autocomplete_category_limit,
    form.autocomplete_brand_limit,
    form.autocomplete_content_limit,
    form.full_search_limit,
    form.max_results_per_page,
    form.popular_limit,
  ].every((value) => Number.isInteger(value) && value > 0)
  const score = form.minimum_ranking_score
  const scoreIsValid = score === null || (score >= 0 && score <= 1)

  return scopeIsValid && limitsAreValid && scoreIsValid
}

export const SearchProfileFormModal = ({
  onOpenChange,
  onSubmit,
  open,
  profile,
  salesChannels,
  submitting,
}: {
  onOpenChange: (open: boolean) => void
  onSubmit: (input: SearchProfileInput) => void
  open: boolean
  profile?: SearchProfile | undefined
  salesChannels: SalesChannelOption[]
  submitting: boolean
}) => {
  const { t } = useTranslation("meilisearch")
  const [form, setForm] = useState<SearchProfileInput>(() =>
    toSearchProfileInput(profile),
  )
  const valid = isValidProfileInput(form)

  return (
    <FocusModal
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) {
          onOpenChange(nextOpen)
        }
      }}
    >
      <FocusModal.Content>
        <form
          className="flex h-full flex-col overflow-hidden"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit({
              ...form,
              domain: form.domain.trim(),
              key: generatedProfileKey(form),
              locale: form.locale.trim(),
              shop: form.shop.trim(),
            })
          }}
        >
          <FocusModal.Header>
            <FocusModal.Title>
              {profile === undefined
                ? t("form.title.create")
                : t("form.title.edit", { key: profile.key })}
            </FocusModal.Title>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            <div className="mx-auto w-full max-w-5xl px-6 py-8">
              <SearchProfileFields
                form={form}
                salesChannels={salesChannels}
                setForm={setForm}
              />
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <div className="flex w-full justify-end gap-2">
              <Button
                disabled={submitting}
                type="button"
                variant="secondary"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                {t("actions.cancel")}
              </Button>
              <Button
                disabled={!valid || submitting}
                isLoading={submitting}
                type="submit"
              >
                {t("actions.saveProfile")}
              </Button>
            </div>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}

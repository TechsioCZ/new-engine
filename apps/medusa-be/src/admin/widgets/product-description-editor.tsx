import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Button,
  Container,
  Heading,
  Label,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { RichHtmlEditor } from "../components/rich-html-editor"
import {
  getAdminProductContent,
  productContentQueryKeys,
  updateAdminProductContent,
} from "../lib/product-content"
import {
  getProductContentSectionHtml,
  PRODUCT_CONTENT_SECTIONS,
  type ProductContentSectionHtml,
} from "../lib/product-content-sections"
import {
  getProductContentTranslationValues,
  listProductContentTranslations,
  PRODUCT_CONTENT_LOCALES,
  PRODUCT_CONTENT_SOURCE_LOCALE,
  type ProductContentLocale,
  type ProductContentTranslationPair,
  productContentTranslationQueryKeys,
  saveProductContentTranslations,
} from "../lib/product-content-translations"

type ProductDescriptionEditorProps = Partial<DetailWidgetProps<AdminProduct>>

type UpdateProductContentInput = {
  changeVersion: number
  editorKey: string
  productId: string
  sectionsHtml: ProductContentSectionHtml
}

type UpdateProductContentTranslationInput = {
  changeVersion: number
  contentId: string
  editorKey: string
  existing: ProductContentTranslationPair
  locale: ProductContentLocale
  productId: string
  sectionsHtml: ProductContentSectionHtml
}

type ProductContentEditorDraft = {
  changeVersion: number
  dirty: boolean
  values: ProductContentSectionHtml
}

const EMPTY_SECTION_HTML: ProductContentSectionHtml = {
  composition: "",
  description: "",
  other: "",
  usage: "",
  warning: "",
}

const createEditorKey = (productId: string, locale: ProductContentLocale) =>
  `${productId}:${locale}`

const ProductContentEditorSections = ({
  hasLoadError,
  isLoading,
  locale,
  onChange,
  values,
}: {
  hasLoadError: boolean
  isLoading: boolean
  locale: ProductContentLocale
  onChange: (key: keyof ProductContentSectionHtml, html: string) => void
  values: ProductContentSectionHtml
}) => {
  const { t } = useTranslation()

  if (isLoading) {
    return (
      <Text className="px-6 py-4" size="small">
        {t("productContentSections.loading")}
      </Text>
    )
  }

  if (hasLoadError) {
    return (
      <Text className="px-6 py-4 text-ui-fg-error" size="small">
        {t("productContentSections.errors.loadFailed")}
      </Text>
    )
  }

  return (
    <div className="divide-y">
      {PRODUCT_CONTENT_SECTIONS.map((section) => (
        <section key={`${locale}-${section.key}`}>
          <div className="px-6 py-4">
            <Text leading="compact" size="small" weight="plus">
              {t(`productContentSections.sections.${section.key}.title`)}
            </Text>
          </div>
          <RichHtmlEditor
            ariaLabel={`${t(
              `productContentSections.sections.${section.key}.ariaLabel`
            )} - ${t(`productContentSections.locale.options.${locale}`)}`}
            onChangeHtml={(html) => onChange(section.key, html)}
            onError={(message) => toast.error(message)}
            valueHtml={values[section.key]}
          />
        </section>
      ))}
    </div>
  )
}

const PRODUCT_DETAIL_ROUTE_PATTERN = /\/products\/[^/]+(?:\/edit)?\/?$/
const PRODUCT_EDIT_ROUTE_PATTERN = /\/products\/[^/]+\/edit\/?$/
const PRODUCT_DETAIL_DESCRIPTION_ROW_SELECTOR = "div.grid.grid-cols-2"
const PRODUCT_DESCRIPTION_LABEL = "Description"
const DETAIL_DESCRIPTION_ROW_HIDDEN_ATTRIBUTE =
  "data-product-description-editor-detail-row-hidden"
const DETAIL_DESCRIPTION_ROW_DISPLAY_ATTRIBUTE =
  "data-product-description-editor-detail-row-display"
const NATIVE_DESCRIPTION_FIELD_SELECTOR = 'form textarea[name="description"]'
const NATIVE_DESCRIPTION_FIELD_WRAPPER_SELECTOR = ".flex.flex-col.space-y-2"
const NATIVE_DESCRIPTION_FIELD_HIDDEN_ATTRIBUTE =
  "data-product-description-editor-hidden"
const NATIVE_DESCRIPTION_FIELD_DISPLAY_ATTRIBUTE =
  "data-product-description-editor-display"
const PRODUCT_DESCRIPTION_EDITOR_MODAL_OPEN_CLASS =
  "product-description-editor-modal-open"

const setStoredDisplay = (
  element: HTMLElement,
  displayAttribute: string,
  hiddenAttribute: string
) => {
  if (!element.hasAttribute(displayAttribute)) {
    element.setAttribute(displayAttribute, element.style.display)
  }

  element.style.display = "none"
  element.hidden = true
  element.setAttribute(hiddenAttribute, "true")
}

const restoreStoredDisplay = (
  selector: string,
  displayAttribute: string,
  hiddenAttribute: string
) => {
  const elements = document.querySelectorAll<HTMLElement>(selector)

  for (const element of elements) {
    element.hidden = false
    element.style.display = element.getAttribute(displayAttribute) ?? ""
    element.removeAttribute(hiddenAttribute)
    element.removeAttribute(displayAttribute)
  }
}

const restoreProductDescriptionDetailRow = () => {
  restoreStoredDisplay(
    `[${DETAIL_DESCRIPTION_ROW_HIDDEN_ATTRIBUTE}="true"]`,
    DETAIL_DESCRIPTION_ROW_DISPLAY_ATTRIBUTE,
    DETAIL_DESCRIPTION_ROW_HIDDEN_ATTRIBUTE
  )
}

const hideProductDescriptionDetailRow = () => {
  if (!PRODUCT_DETAIL_ROUTE_PATTERN.test(window.location.pathname)) {
    restoreProductDescriptionDetailRow()
    return
  }

  const rows = document.querySelectorAll<HTMLElement>(
    PRODUCT_DETAIL_DESCRIPTION_ROW_SELECTOR
  )

  for (const row of rows) {
    const label = row.firstElementChild?.textContent?.trim()

    if (label === PRODUCT_DESCRIPTION_LABEL) {
      setStoredDisplay(
        row,
        DETAIL_DESCRIPTION_ROW_DISPLAY_ATTRIBUTE,
        DETAIL_DESCRIPTION_ROW_HIDDEN_ATTRIBUTE
      )
    }
  }
}

const restoreNativeProductDescriptionField = () => {
  document.body.classList.remove(PRODUCT_DESCRIPTION_EDITOR_MODAL_OPEN_CLASS)
  restoreStoredDisplay(
    `[${NATIVE_DESCRIPTION_FIELD_HIDDEN_ATTRIBUTE}="true"]`,
    NATIVE_DESCRIPTION_FIELD_DISPLAY_ATTRIBUTE,
    NATIVE_DESCRIPTION_FIELD_HIDDEN_ATTRIBUTE
  )
}

const hideNativeProductDescriptionField = () => {
  if (!PRODUCT_EDIT_ROUTE_PATTERN.test(window.location.pathname)) {
    restoreNativeProductDescriptionField()
    return
  }

  document.body.classList.add(PRODUCT_DESCRIPTION_EDITOR_MODAL_OPEN_CLASS)

  const textarea = document.querySelector<HTMLTextAreaElement>(
    NATIVE_DESCRIPTION_FIELD_SELECTOR
  )
  const field = textarea?.closest<HTMLElement>(
    NATIVE_DESCRIPTION_FIELD_WRAPPER_SELECTOR
  )

  if (!(textarea && field)) {
    return
  }

  textarea.readOnly = true
  textarea.tabIndex = -1
  textarea.setAttribute("aria-readonly", "true")
  setStoredDisplay(
    field,
    NATIVE_DESCRIPTION_FIELD_DISPLAY_ATTRIBUTE,
    NATIVE_DESCRIPTION_FIELD_HIDDEN_ATTRIBUTE
  )
}

const syncNativeProductDescriptionUi = () => {
  hideProductDescriptionDetailRow()
  hideNativeProductDescriptionField()
}

const ProductDescriptionEditor = ({
  data: product,
}: ProductDescriptionEditorProps) => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const productId = product?.id ?? ""
  const [selectedLocale, setSelectedLocale] = useState<ProductContentLocale>(
    PRODUCT_CONTENT_SOURCE_LOCALE
  )
  const contentQuery = useQuery({
    enabled: Boolean(productId),
    queryFn: () => getAdminProductContent(productId),
    queryKey: productContentQueryKeys.detail(productId),
  })
  const contentId = contentQuery.data?.product_content.id ?? ""
  const isSourceLocale = selectedLocale === PRODUCT_CONTENT_SOURCE_LOCALE
  const translationQueryKey = productContentTranslationQueryKeys.detail({
    contentId,
    locale: selectedLocale,
    productId,
  })
  const translationsQuery = useQuery({
    enabled: Boolean(productId && contentId && !isSourceLocale),
    queryFn: () =>
      listProductContentTranslations({
        contentId,
        locale: selectedLocale,
        productId,
      }),
    queryKey: translationQueryKey,
  })
  const [savedSectionHtml, setSavedSectionHtml] = useState(() =>
    getProductContentSectionHtml(product, null)
  )
  const sectionHtmlRef = useRef(savedSectionHtml)
  const sectionHtmlDirtyRef = useRef(false)
  const sectionHtmlChangeVersionRef = useRef(0)
  const editorDraftsRef = useRef(new Map<string, ProductContentEditorDraft>())
  const activeEditorKeyRef = useRef(
    createEditorKey(productId, PRODUCT_CONTENT_SOURCE_LOCALE)
  )
  const selectedLocaleRef = useRef<ProductContentLocale>(
    PRODUCT_CONTENT_SOURCE_LOCALE
  )
  const productIdRef = useRef(product?.id ?? null)

  useEffect(() => {
    const nextProductId = product?.id ?? null
    const productChanged = productIdRef.current !== nextProductId
    const effectiveLocale = productChanged
      ? PRODUCT_CONTENT_SOURCE_LOCALE
      : selectedLocale

    if (productChanged) {
      productIdRef.current = nextProductId
      editorDraftsRef.current.clear()
      selectedLocaleRef.current = PRODUCT_CONTENT_SOURCE_LOCALE
      setSelectedLocale(PRODUCT_CONTENT_SOURCE_LOCALE)
      sectionHtmlDirtyRef.current = false
      sectionHtmlChangeVersionRef.current = 0
    }

    const editorKey = createEditorKey(productId, effectiveLocale)
    const existingDraft = editorDraftsRef.current.get(editorKey)

    if (existingDraft?.dirty) {
      return
    }

    let nextSectionHtml: ProductContentSectionHtml

    if (effectiveLocale === PRODUCT_CONTENT_SOURCE_LOCALE) {
      nextSectionHtml = getProductContentSectionHtml(
        product,
        contentQuery.data?.product_content
      )
    } else {
      if (!(effectiveLocale === selectedLocale && translationsQuery.data)) {
        return
      }

      nextSectionHtml = getProductContentTranslationValues(
        translationsQuery.data
      )
    }

    const nextDraft: ProductContentEditorDraft = {
      changeVersion: existingDraft?.changeVersion ?? 0,
      dirty: false,
      values: nextSectionHtml,
    }

    editorDraftsRef.current.set(editorKey, nextDraft)
    activeEditorKeyRef.current = editorKey
    sectionHtmlRef.current = nextSectionHtml
    sectionHtmlDirtyRef.current = false
    sectionHtmlChangeVersionRef.current = nextDraft.changeVersion
    setSavedSectionHtml(nextSectionHtml)
  }, [
    contentQuery.data?.product_content,
    product,
    productId,
    selectedLocale,
    translationsQuery.data,
  ])

  useEffect(() => {
    let animationFrameId: number | null = null
    const scheduleSync = () => {
      if (animationFrameId !== null) {
        return
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null
        syncNativeProductDescriptionUi()
      })
    }

    const observer = new MutationObserver(scheduleSync)

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })

    syncNativeProductDescriptionUi()

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId)
      }

      observer.disconnect()
      restoreProductDescriptionDetailRow()
      restoreNativeProductDescriptionField()
    }
  }, [])

  const sourceMutation = useMutation({
    mutationFn: ({
      productId: targetProductId,
      sectionsHtml,
    }: UpdateProductContentInput) =>
      updateAdminProductContent({
        productId: targetProductId,
        sectionsHtml,
      }),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("productContentSections.errors.saveFailed")
      )
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["product", variables.productId],
      })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      queryClient.setQueryData(
        productContentQueryKeys.detail(variables.productId),
        { product_content: response.product_content }
      )

      if (productIdRef.current !== variables.productId) {
        return
      }

      const draft = editorDraftsRef.current.get(variables.editorKey)

      if (draft?.changeVersion !== variables.changeVersion) {
        return
      }

      const nextSectionHtml = getProductContentSectionHtml(
        response.product,
        response.product_content
      )
      const nextDraft: ProductContentEditorDraft = {
        changeVersion: variables.changeVersion,
        dirty: false,
        values: nextSectionHtml,
      }

      editorDraftsRef.current.set(variables.editorKey, nextDraft)

      if (activeEditorKeyRef.current === variables.editorKey) {
        sectionHtmlDirtyRef.current = false
        sectionHtmlRef.current = nextSectionHtml
        setSavedSectionHtml(nextSectionHtml)
      }

      toast.success(t("productContentSections.toasts.saved"))
    },
  })

  const translationMutation = useMutation({
    mutationFn: ({
      contentId: targetContentId,
      existing,
      locale,
      productId: targetProductId,
      sectionsHtml,
    }: UpdateProductContentTranslationInput) =>
      saveProductContentTranslations({
        contentId: targetContentId,
        existing,
        locale,
        productId: targetProductId,
        values: sectionsHtml,
      }),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("productContentSections.errors.saveFailed")
      )
    },
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: productContentTranslationQueryKeys.detail({
          contentId: variables.contentId,
          locale: variables.locale,
          productId: variables.productId,
        }),
      })

      const draft = editorDraftsRef.current.get(variables.editorKey)

      if (draft?.changeVersion !== variables.changeVersion) {
        return
      }

      const nextDraft: ProductContentEditorDraft = {
        changeVersion: variables.changeVersion,
        dirty: false,
        values: variables.sectionsHtml,
      }

      editorDraftsRef.current.set(variables.editorKey, nextDraft)

      if (activeEditorKeyRef.current === variables.editorKey) {
        sectionHtmlDirtyRef.current = false
        sectionHtmlRef.current = variables.sectionsHtml
        setSavedSectionHtml(variables.sectionsHtml)
      }

      toast.success(t("productContentSections.toasts.saved"))
    },
  })

  const handleLocaleChange = (value: string) => {
    const nextLocale = PRODUCT_CONTENT_LOCALES.find(
      (locale) => locale === value
    )

    if (!nextLocale || nextLocale === selectedLocaleRef.current) {
      return
    }

    editorDraftsRef.current.set(activeEditorKeyRef.current, {
      changeVersion: sectionHtmlChangeVersionRef.current,
      dirty: sectionHtmlDirtyRef.current,
      values: sectionHtmlRef.current,
    })

    const nextEditorKey = createEditorKey(productId, nextLocale)
    const existingDraft = editorDraftsRef.current.get(nextEditorKey)
    let nextValues = existingDraft?.values

    if (!nextValues && nextLocale === PRODUCT_CONTENT_SOURCE_LOCALE) {
      nextValues = getProductContentSectionHtml(
        product,
        contentQuery.data?.product_content
      )
    }

    if (!nextValues && contentId) {
      const cachedTranslations =
        queryClient.getQueryData<ProductContentTranslationPair>(
          productContentTranslationQueryKeys.detail({
            contentId,
            locale: nextLocale,
            productId,
          })
        )

      if (cachedTranslations) {
        nextValues = getProductContentTranslationValues(cachedTranslations)
      }
    }

    const nextDraft: ProductContentEditorDraft = existingDraft ?? {
      changeVersion: 0,
      dirty: false,
      values: nextValues ?? EMPTY_SECTION_HTML,
    }

    editorDraftsRef.current.set(nextEditorKey, nextDraft)
    activeEditorKeyRef.current = nextEditorKey
    selectedLocaleRef.current = nextLocale
    sectionHtmlRef.current = nextDraft.values
    sectionHtmlDirtyRef.current = nextDraft.dirty
    sectionHtmlChangeVersionRef.current = nextDraft.changeVersion
    setSavedSectionHtml(nextDraft.values)
    setSelectedLocale(nextLocale)
  }

  const handleSave = () => {
    if (!product?.id) {
      return
    }

    const input = {
      changeVersion: sectionHtmlChangeVersionRef.current,
      editorKey: activeEditorKeyRef.current,
      productId: product.id,
      sectionsHtml: sectionHtmlRef.current,
    }

    if (isSourceLocale) {
      sourceMutation.mutate(input)
      return
    }

    if (contentId && translationsQuery.data) {
      translationMutation.mutate({
        ...input,
        contentId,
        existing: translationsQuery.data,
        locale: selectedLocale,
      })
    }
  }

  if (!product?.id) {
    return null
  }

  const contentIsMissing = Boolean(contentQuery.isSuccess && !contentId)
  const translationHasLoadError = Boolean(
    !isSourceLocale &&
      (contentQuery.isError || translationsQuery.isError || contentIsMissing)
  )
  const translationIsLoading = Boolean(
    !isSourceLocale &&
      (contentQuery.isLoading || (contentId && translationsQuery.isLoading))
  )
  const isSaving = sourceMutation.isPending || translationMutation.isPending
  const targetLocaleIsReady = Boolean(
    isSourceLocale ||
      (contentId && translationsQuery.data && !translationHasLoadError)
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <Heading level="h2">{t("productContentSections.title")}</Heading>
        <div className="flex items-center gap-2">
          <Label htmlFor="product-content-locale">
            {t("productContentSections.locale.label")}
          </Label>
          <Select
            disabled={isSaving}
            onValueChange={handleLocaleChange}
            value={selectedLocale}
          >
            <Select.Trigger className="w-[200px]" id="product-content-locale">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {PRODUCT_CONTENT_LOCALES.map((locale) => (
                <Select.Item key={locale} value={locale}>
                  {t(`productContentSections.locale.options.${locale}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Button
            disabled={!targetLocaleIsReady}
            isLoading={isSaving}
            onClick={handleSave}
            size="small"
            type="button"
          >
            {t("productContentSections.actions.save")}
          </Button>
        </div>
      </div>
      <ProductContentEditorSections
        hasLoadError={translationHasLoadError}
        isLoading={translationIsLoading}
        locale={selectedLocale}
        onChange={(key, html) => {
          sectionHtmlDirtyRef.current = true
          sectionHtmlChangeVersionRef.current += 1
          sectionHtmlRef.current = {
            ...sectionHtmlRef.current,
            [key]: html,
          }
          editorDraftsRef.current.set(activeEditorKeyRef.current, {
            changeVersion: sectionHtmlChangeVersionRef.current,
            dirty: true,
            values: sectionHtmlRef.current,
          })
        }}
        values={savedSectionHtml}
      />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductDescriptionEditor

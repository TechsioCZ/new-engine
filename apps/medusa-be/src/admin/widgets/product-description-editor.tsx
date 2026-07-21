import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { RichHtmlEditor } from "../components/rich-html-editor"
import {
  buildContentSections,
  buildContentSectionsMap,
  CONTENT_SECTIONS_MAP_METADATA_KEY,
  CONTENT_SECTIONS_METADATA_KEY,
  getProductSectionHtml,
  getSavedSectionHtml,
  PRODUCT_CONTENT_SECTIONS,
  type ProductContentSectionHtml,
} from "../lib/product-content-sections"
import { sdk } from "../lib/sdk"

type ProductDescriptionEditorProps = Partial<DetailWidgetProps<AdminProduct>>

type UpdateProductContentInput = {
  changeVersion: number
  productId: string
  sectionsHtml: ProductContentSectionHtml
}

type UpdateProductResponse = {
  product: AdminProduct
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
  const [savedSectionHtml, setSavedSectionHtml] = useState(() =>
    getProductSectionHtml(product)
  )
  const sectionHtmlRef = useRef(savedSectionHtml)
  const sectionHtmlDirtyRef = useRef(false)
  const sectionHtmlChangeVersionRef = useRef(0)
  const productIdRef = useRef(product?.id ?? null)

  useEffect(() => {
    const nextProductId = product?.id ?? null
    const productChanged = productIdRef.current !== nextProductId

    if (productChanged) {
      productIdRef.current = nextProductId
      sectionHtmlDirtyRef.current = false
      sectionHtmlChangeVersionRef.current = 0
    }

    if (sectionHtmlDirtyRef.current) {
      return
    }

    const nextSectionHtml = getProductSectionHtml(product)

    sectionHtmlRef.current = nextSectionHtml
    setSavedSectionHtml(nextSectionHtml)
  }, [product])

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

  const mutation = useMutation({
    mutationFn: ({ productId, sectionsHtml }: UpdateProductContentInput) =>
      sdk.client.fetch<UpdateProductResponse>(`/admin/products/${productId}`, {
        body: {
          description:
            sectionsHtml.description.length > 0
              ? sectionsHtml.description
              : null,
          metadata: {
            [CONTENT_SECTIONS_METADATA_KEY]: buildContentSections(sectionsHtml),
            [CONTENT_SECTIONS_MAP_METADATA_KEY]: buildContentSectionsMap(
              product?.metadata,
              sectionsHtml
            ),
          },
        },
        method: "POST",
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

      if (productIdRef.current !== variables.productId) {
        return
      }

      if (sectionHtmlChangeVersionRef.current !== variables.changeVersion) {
        return
      }

      const nextSectionHtml = getSavedSectionHtml(
        response.product,
        variables.sectionsHtml
      )

      sectionHtmlDirtyRef.current = false
      sectionHtmlRef.current = nextSectionHtml
      setSavedSectionHtml(nextSectionHtml)
      toast.success(t("productContentSections.toasts.saved"))
    },
  })

  const handleSave = () => {
    if (!product?.id) {
      return
    }

    mutation.mutate({
      changeVersion: sectionHtmlChangeVersionRef.current,
      productId: product.id,
      sectionsHtml: sectionHtmlRef.current,
    })
  }

  if (!product?.id) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("productContentSections.title")}</Heading>
        <Button
          isLoading={mutation.isPending}
          onClick={handleSave}
          size="small"
          type="button"
        >
          {t("productContentSections.actions.save")}
        </Button>
      </div>
      <div className="divide-y">
        {PRODUCT_CONTENT_SECTIONS.map((section) => (
          <section key={section.key}>
            <div className="px-6 py-4">
              <Text leading="compact" size="small" weight="plus">
                {t(`productContentSections.sections.${section.key}.title`)}
              </Text>
            </div>
            <RichHtmlEditor
              ariaLabel={t(
                `productContentSections.sections.${section.key}.ariaLabel`
              )}
              onChangeHtml={(html) => {
                sectionHtmlDirtyRef.current = true
                sectionHtmlChangeVersionRef.current += 1
                sectionHtmlRef.current = {
                  ...sectionHtmlRef.current,
                  [section.key]: html,
                }
              }}
              onError={(message) => toast.error(message)}
              valueHtml={savedSectionHtml[section.key]}
            />
          </section>
        ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductDescriptionEditor

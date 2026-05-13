import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import { sdk } from "../lib/sdk"
import { RichHtmlEditor } from "./rich-html-editor"

type ProductDescriptionEditorProps = Partial<DetailWidgetProps<AdminProduct>>

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
  const queryClient = useQueryClient()
  const [savedDescriptionHtml, setSavedDescriptionHtml] = useState(
    () => product?.description ?? ""
  )
  const descriptionHtmlRef = useRef(product?.description ?? "")

  useEffect(() => {
    const nextDescriptionHtml = product?.description ?? ""

    descriptionHtmlRef.current = nextDescriptionHtml
    setSavedDescriptionHtml(nextDescriptionHtml)
  }, [product?.description])

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
    mutationFn: (description: string) =>
      sdk.client.fetch<UpdateProductResponse>(
        `/admin/products/${product?.id}`,
        {
          body: {
            description: description.length > 0 ? description : null,
          },
          method: "POST",
        }
      ),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save product description"
      )
    },
    onSuccess: (response) => {
      const nextDescriptionHtml = response.product.description ?? ""

      descriptionHtmlRef.current = nextDescriptionHtml
      setSavedDescriptionHtml(nextDescriptionHtml)
      queryClient.invalidateQueries({ queryKey: ["product", product?.id] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Product description saved")
    },
  })

  const handleSave = useCallback(() => {
    mutation.mutate(descriptionHtmlRef.current)
  }, [mutation])

  if (!product?.id) {
    return null
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Product description</Heading>
        <Button
          isLoading={mutation.isPending}
          onClick={handleSave}
          size="small"
          type="button"
        >
          Save
        </Button>
      </div>
      <RichHtmlEditor
        ariaLabel="Product description"
        onChangeHtml={(html) => {
          descriptionHtmlRef.current = html
        }}
        onError={(message) => toast.error(message)}
        valueHtml={savedDescriptionHtml}
      />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductDescriptionEditor

import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  codeBlockPlugin,
  headingsPlugin,
  InsertThematicBreak,
  ListsToggle,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  MDXEditor,
  type MDXEditorMethods,
  markdownShortcutPlugin,
  quotePlugin,
  Separator,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor"
import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Button, Container, Heading, toast } from "@medusajs/ui"
import "@mdxeditor/editor/style.css"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { marked } from "marked"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { sdk } from "../lib/sdk"
import "./product-description-editor.css"

type ProductDescriptionEditorProps = Partial<DetailWidgetProps<AdminProduct>>

type UpdateProductResponse = {
  product: AdminProduct
}

const HEADING_TAG_PATTERN = /^h[1-6]$/
const PRODUCT_DETAIL_ROUTE_PATTERN = /\/products\/[^/]+(?:\/edit)?\/?$/
const PRODUCT_EDIT_ROUTE_PATTERN = /\/products\/[^/]+\/edit\/?$/
const BACKTICK_RUN_PATTERN = /`+/g
const CLASS_NAME_SEPARATOR_PATTERN = /\s+/
const TABLE_CELL_LINE_BREAK_PATTERN = /\s*\n+\s*/g
const TABLE_CELL_PIPE_PATTERN = /\|/g
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

const getLongestBacktickRun = (value: string) =>
  Math.max(
    ...(value.match(BACKTICK_RUN_PATTERN)?.map((match) => match.length) ?? [0])
  )

const getInlineCodeMarkdown = (value: string) => {
  const delimiter = "`".repeat(getLongestBacktickRun(value) + 1)
  const needsPadding = value.startsWith("`") || value.endsWith("`")

  return needsPadding
    ? `${delimiter} ${value} ${delimiter}`
    : `${delimiter}${value}${delimiter}`
}

const getCodeBlockMarkdown = (value: string, language = "") => {
  const delimiter = "`".repeat(Math.max(3, getLongestBacktickRun(value) + 1))
  const code = value.endsWith("\n") ? value : `${value}\n`

  return `${delimiter}${language}\n${code}${delimiter}\n\n`
}

const getCodeLanguage = (element: HTMLElement | null) =>
  element?.className
    .split(CLASS_NAME_SEPARATOR_PATTERN)
    .find((className) => className.startsWith("language-"))
    ?.replace("language-", "") ?? ""

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

const htmlToMarkdown = (html: string) => {
  if (!html.trim()) {
    return ""
  }

  const document = new DOMParser().parseFromString(html, "text/html")

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Small local fallback for importing existing HTML product descriptions into MDXEditor.
  const renderNode = (node: ChildNode): string => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent ?? ""
    }

    if (!(node instanceof HTMLElement)) {
      return ""
    }

    const tag = node.tagName.toLowerCase()

    if (tag === "br") {
      return "\n"
    }

    if (tag === "hr") {
      return "---\n\n"
    }

    if (tag === "code" && node.parentElement?.tagName.toLowerCase() !== "pre") {
      return getInlineCodeMarkdown(node.textContent ?? "")
    }

    if (tag === "pre") {
      const codeElement = node.querySelector<HTMLElement>("code")

      return getCodeBlockMarkdown(
        codeElement?.textContent ?? node.textContent ?? "",
        getCodeLanguage(codeElement)
      )
    }

    if (tag === "table") {
      const renderTableCell = (cell: Element) =>
        Array.from(cell.childNodes)
          .map(renderNode)
          .join("")
          .trim()
          .replace(TABLE_CELL_LINE_BREAK_PATTERN, " ")
          .replace(TABLE_CELL_PIPE_PATTERN, "\\|")

      const renderTableRow = (row: Element) =>
        Array.from(row.children).map(renderTableCell)

      const renderTableLine = (cells: string[], columnTotal: number) =>
        `| ${Array.from(
          { length: columnTotal },
          (_, index) => cells[index] ?? ""
        ).join(" | ")} |`

      if (!(node instanceof HTMLTableElement)) {
        return ""
      }

      const headerRow = node.tHead?.rows[0]
      const bodyRows = Array.from(node.tBodies).flatMap((body) =>
        Array.from(body.rows)
      )
      const rows = headerRow ? [headerRow, ...bodyRows] : Array.from(node.rows)

      if (rows.length === 0) {
        return ""
      }

      const renderedRows = rows.map(renderTableRow)
      const columnCount = Math.max(...renderedRows.map((row) => row.length), 1)
      const [headerCells, ...contentRows] = renderedRows

      return `${[
        renderTableLine(headerCells, columnCount),
        renderTableLine(
          Array.from({ length: columnCount }, () => "---"),
          columnCount
        ),
        ...contentRows.map((row) => renderTableLine(row, columnCount)),
      ].join("\n")}\n\n`
    }

    const children = Array.from(node.childNodes).map(renderNode).join("")

    if (HEADING_TAG_PATTERN.test(tag)) {
      return `${"#".repeat(Number(tag.slice(1)))} ${children.trim()}\n\n`
    }

    if (tag === "p" || tag === "div") {
      return `${children.trim()}\n\n`
    }

    if (tag === "strong" || tag === "b") {
      return `**${children}**`
    }

    if (tag === "em" || tag === "i") {
      return `*${children}*`
    }

    if (tag === "del" || tag === "s" || tag === "strike") {
      return `~~${children}~~`
    }

    if (tag === "a") {
      const href = node.getAttribute("href")
      return href ? `[${children}](${href})` : children
    }

    if (tag === "blockquote") {
      return `${children
        .trim()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`
    }

    if (tag === "ul") {
      return `${Array.from(node.children)
        .map((item) => `- ${renderNode(item).trim()}`)
        .join("\n")}\n\n`
    }

    if (tag === "ol") {
      return `${Array.from(node.children)
        .map((item, index) => `${index + 1}. ${renderNode(item).trim()}`)
        .join("\n")}\n\n`
    }

    if (tag === "li") {
      return children
    }

    return children
  }

  return Array.from(document.body.childNodes)
    .map(renderNode)
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const markdownToHtml = (markdown: string) =>
  String(marked.parse(markdown, { async: false, gfm: true })).trim()

const ProductDescriptionEditor = ({
  data: product,
}: ProductDescriptionEditorProps) => {
  const editorRef = useRef<MDXEditorMethods>(null)
  const queryClient = useQueryClient()
  const [markdown, setMarkdown] = useState(() =>
    htmlToMarkdown(product?.description ?? "")
  )

  useEffect(() => {
    const nextMarkdown = htmlToMarkdown(product?.description ?? "")
    setMarkdown(nextMarkdown)
    editorRef.current?.setMarkdown(nextMarkdown)
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
      const nextMarkdown = htmlToMarkdown(response.product.description ?? "")
      setMarkdown(nextMarkdown)
      editorRef.current?.setMarkdown(nextMarkdown)
      queryClient.invalidateQueries({ queryKey: ["product", product?.id] })
      queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success("Product description saved")
    },
  })

  const handleSave = useCallback(() => {
    const currentMarkdown = editorRef.current?.getMarkdown() ?? markdown
    mutation.mutate(markdownToHtml(currentMarkdown))
  }, [markdown, mutation])

  const plugins = useMemo(
    () => [
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <BoldItalicUnderlineToggles options={["Bold", "Italic"]} />
            <StrikeThroughSupSubToggles options={["Strikethrough"]} />
            <Separator />
            <ListsToggle />
            <Separator />
            <CreateLink />
            <InsertThematicBreak />
          </>
        ),
      }),
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      tablePlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: "html" }),
      markdownShortcutPlugin(),
    ],
    []
  )

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
      <div className="p-0">
        <MDXEditor
          className="product-description-mdx-editor"
          contentEditableClassName="product-description-mdx-content"
          markdown={markdown}
          onChange={(nextMarkdown) => setMarkdown(nextMarkdown)}
          onError={({ error }) => toast.error(error)}
          plugins={plugins}
          ref={editorRef}
        />
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductDescriptionEditor

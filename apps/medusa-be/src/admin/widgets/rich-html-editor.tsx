import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  codeBlockPlugin,
  headingsPlugin,
  InsertTable,
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
import "@mdxeditor/editor/style.css"
import { marked } from "marked"
import { useEffect, useMemo, useRef, useState } from "react"
import "./rich-html-editor.css"

const HEADING_TAG_PATTERN = /^h[1-6]$/
const BACKTICK_RUN_PATTERN = /`+/g
const CLASS_NAME_SEPARATOR_PATTERN = /\s+/
const TABLE_CELL_LINE_BREAK_PATTERN = /\s*\n+\s*/g
const TABLE_CELL_PIPE_PATTERN = /\|/g

type RichHtmlEditorProps = {
  ariaLabel: string
  onChangeHtml?: (html: string) => void
  onError?: (message: string) => void
  valueHtml: string
}

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

export const htmlToMarkdown = (html: string) => {
  if (!html.trim()) {
    return ""
  }

  const document = new DOMParser().parseFromString(html, "text/html")

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Local HTML import keeps legacy Medusa descriptions editable in the WYSIWYG editor.
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

export const markdownToHtml = (markdown: string) =>
  String(marked.parse(markdown, { async: false, gfm: true })).trim()

export const RichHtmlEditor = ({
  ariaLabel,
  onChangeHtml,
  onError,
  valueHtml,
}: RichHtmlEditorProps) => {
  const editorRef = useRef<MDXEditorMethods>(null)
  const [markdown, setMarkdown] = useState(() => htmlToMarkdown(valueHtml))

  useEffect(() => {
    const nextMarkdown = htmlToMarkdown(valueHtml)

    setMarkdown(nextMarkdown)
    editorRef.current?.setMarkdown(nextMarkdown)
  }, [valueHtml])

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
            <InsertTable />
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

  return (
    <MDXEditor
      aria-label={ariaLabel}
      className="rich-html-editor"
      contentEditableClassName="rich-html-editor-content"
      markdown={markdown}
      onChange={(nextMarkdown) => {
        setMarkdown(nextMarkdown)
        onChangeHtml?.(markdownToHtml(nextMarkdown))
      }}
      onError={({ error }) => onError?.(String(error))}
      plugins={plugins}
      ref={editorRef}
    />
  )
}

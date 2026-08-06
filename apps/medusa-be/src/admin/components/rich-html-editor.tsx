import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  MDXEditor,
  markdownShortcutPlugin,
  quotePlugin,
  Separator,
  StrikeThroughSupSubToggles,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor"
import type { MDXEditorMethods } from "@mdxeditor/editor"

import "@mdxeditor/editor/style.css"
import { marked } from "marked"
import { useEffect, useRef } from "react"

import "./rich-html-editor.css"

const HEADING_TAG_PATTERN = /^h[1-6]$/u
const TABLE_CELL_LINE_BREAK_PATTERN = /\s*\n+\s*/gu
const TABLE_CELL_PIPE_PATTERN = /\|/gu
const EXCESS_LINE_BREAK_PATTERN = /\n{3,}/gu

interface RichHtmlEditorProps {
  ariaLabel: string
  onChangeHtml?: (html: string) => void
  onError?: (message: string) => void
  valueHtml: string
}

const renderTableLine = (cells: string[], columnTotal: number) =>
  `| ${Array.from(
    { length: columnTotal },
    (_, index) => cells[index] ?? "",
  ).join(" | ")} |`

type NodeRenderer = (node: ChildNode) => string

const renderTableNode = (
  node: HTMLTableElement,
  renderChild: NodeRenderer,
): string => {
  const renderTableCell = (cell: Element) =>
    [...cell.childNodes]
      .map(renderChild)
      .join("")
      .trim()
      .replace(TABLE_CELL_LINE_BREAK_PATTERN, " ")
      .replace(TABLE_CELL_PIPE_PATTERN, "\\|")
  const renderedRows = (
    node.tHead?.rows[0] === undefined
      ? [...node.rows]
      : [
          node.tHead.rows[0],
          ...[...node.tBodies].flatMap((body) => [...body.rows]),
        ]
  ).map((row) => [...row.children].map(renderTableCell))

  if (renderedRows.length === 0) {
    return ""
  }

  const columnCount = Math.max(...renderedRows.map((row) => row.length), 1)
  const [headerCells, ...contentRows] = renderedRows
  return `${[
    renderTableLine(headerCells ?? [], columnCount),
    renderTableLine(
      Array.from({ length: columnCount }, () => "---"),
      columnCount,
    ),
    ...contentRows.map((row) => renderTableLine(row, columnCount)),
  ].join("\n")}\n\n`
}

const renderListNode = (
  node: HTMLElement,
  ordered: boolean,
  renderChild: NodeRenderer,
): string =>
  `${[...node.children]
    .map((item, index) => {
      const marker = ordered ? `${index + 1}.` : "-"
      return `${marker} ${renderChild(item).trim()}`
    })
    .join("\n")}\n\n`

const renderElementMarkup = (
  node: HTMLElement,
  tag: string,
  children: string,
  renderChild: NodeRenderer,
): string => {
  switch (tag) {
    case "a": {
      const href = node.getAttribute("href")
      return href === null || href === "" ? children : `[${children}](${href})`
    }
    case "b":
    case "strong": {
      return `**${children}**`
    }
    case "blockquote": {
      return `${children
        .trim()
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n\n`
    }
    case "del":
    case "s":
    case "strike": {
      return `~~${children}~~`
    }
    case "div":
    case "p": {
      return `${children.trim()}\n\n`
    }
    case "em":
    case "i": {
      return `*${children}*`
    }
    case "li": {
      return children
    }
    case "ol": {
      return renderListNode(node, true, renderChild)
    }
    case "ul": {
      return renderListNode(node, false, renderChild)
    }
    default: {
      return HEADING_TAG_PATTERN.test(tag)
        ? `${"#".repeat(Number(tag.slice(1)))} ${children.trim()}\n\n`
        : children
    }
  }
}

const renderNode: NodeRenderer = (node) => {
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
  if (tag === "pre") {
    return `${(node.textContent ?? "").trim()}\n\n`
  }
  if (tag === "table") {
    return node instanceof HTMLTableElement
      ? renderTableNode(node, renderNode)
      : ""
  }

  const children = [...node.childNodes].map(renderNode).join("")
  return renderElementMarkup(node, tag, children, renderNode)
}

export const htmlToMarkdown = (html: string) => {
  if (html.trim() === "") {
    return ""
  }

  const document = new DOMParser().parseFromString(html, "text/html")
  return [...document.body.childNodes]
    .map(renderNode)
    .join("")
    .replace(EXCESS_LINE_BREAK_PATTERN, "\n\n")
    .trim()
}

export const markdownToHtml = (markdown: string) =>
  marked.parse(markdown, { async: false, gfm: true }).trim()

const RichHtmlEditorToolbar = () => (
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
)

const richHtmlEditorPlugins = [
  toolbarPlugin({ toolbarContents: RichHtmlEditorToolbar }),
  headingsPlugin(),
  listsPlugin(),
  quotePlugin(),
  thematicBreakPlugin(),
  linkPlugin(),
  linkDialogPlugin(),
  tablePlugin(),
  markdownShortcutPlugin(),
]

export const RichHtmlEditor = ({
  ariaLabel,
  onChangeHtml,
  onError,
  valueHtml,
}: RichHtmlEditorProps) => {
  const editorRef = useRef<MDXEditorMethods>(null)
  const markdown = htmlToMarkdown(valueHtml)

  useEffect(() => {
    editorRef.current?.setMarkdown(markdown)
  }, [markdown])

  return (
    <MDXEditor
      aria-label={ariaLabel}
      className="rich-html-editor"
      contentEditableClassName="rich-html-editor-content"
      markdown={markdown}
      onChange={(nextMarkdown) => {
        onChangeHtml?.(markdownToHtml(nextMarkdown))
      }}
      onError={({ error }) => {
        onError?.(error)
      }}
      plugins={richHtmlEditorPlugins}
      ref={editorRef}
    />
  )
}

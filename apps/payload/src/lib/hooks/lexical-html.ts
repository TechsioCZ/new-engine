import {
  convertLexicalToHTMLAsync,
  defaultHTMLConvertersAsync,
  type HTMLConvertersFunctionAsync,
} from "@payloadcms/richtext-lexical/html-async"
import type { PayloadRequest } from "payload"

type UnknownRecord = Record<string, unknown>
type SerializedEditorStateLike = {
  root: UnknownRecord
}

const SUPPORTED_STOREFRONT_BLOCK_TYPES = ["productCarousel"] as const

type SupportedStorefrontBlockType =
  (typeof SUPPORTED_STOREFRONT_BLOCK_TYPES)[number]

const createBlockMarker = (blockType: SupportedStorefrontBlockType) =>
  `<div data-cms-block="${blockType}"></div>`

export const storefrontHTMLConverters: HTMLConvertersFunctionAsync = ({
  defaultConverters,
}) => ({
  ...defaultConverters,
  blocks: {
    ...defaultConverters.blocks,
    productCarousel: createBlockMarker("productCarousel"),
  },
  unknown: async ({ node, nodesToHTML }) => {
    const children = (node as { children?: unknown }).children
    return Array.isArray(children)
      ? (await nodesToHTML({ nodes: children as never })).join("")
      : ""
  },
})

/** Narrow unknown values to a Lexical serialized editor state. */
const isLexicalState = (value: unknown): value is SerializedEditorStateLike => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false
  }

  return "root" in value
}

/**
 * Recursively convert Lexical editor state values to HTML strings.
 */
export const convertLexicalValueToHTML = async (
  value: unknown,
  _req?: PayloadRequest | null
): Promise<unknown> => {
  if (isLexicalState(value)) {
    return convertLexicalToHTMLAsync({
      data: value as never,
      converters: storefrontHTMLConverters({
        defaultConverters: defaultHTMLConvertersAsync,
      }),
    })
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const entries = await Promise.all(
      Object.entries(value as UnknownRecord).map(async ([key, entryValue]) => [
        key,
        await convertLexicalValueToHTML(entryValue, _req),
      ])
    )

    return Object.fromEntries(entries)
  }

  return value
}

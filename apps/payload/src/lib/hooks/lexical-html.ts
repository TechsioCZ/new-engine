import {
  convertLexicalToHTMLAsync,
  defaultHTMLConvertersAsync,
} from "@payloadcms/richtext-lexical/html-async"
import type { PayloadRequest } from "payload"

type UnknownRecord = Record<string, unknown>
type SerializedEditorStateLike = {
  root: UnknownRecord
}

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
      converters: defaultHTMLConvertersAsync,
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

import type { SerializedEditorState } from 'lexical'
import type { PayloadRequest } from 'payload'
import {
  convertLexicalToHTMLAsync,
  defaultHTMLConvertersAsync,
} from '@payloadcms/richtext-lexical/html-async'

type UnknownRecord = Record<string, unknown>

/** Narrow unknown values to a Lexical serialized editor state. */
const isLexicalState = (value: unknown): value is SerializedEditorState => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return 'root' in value
}

/**
 * Recursively convert Lexical editor state values to HTML strings.
 */
export const convertLexicalValueToHTML = async (
  value: unknown,
  req?: PayloadRequest | null
): Promise<unknown> => {
  if (isLexicalState(value)) {
    return convertLexicalToHTMLAsync({
      data: value,
      converters: defaultHTMLConvertersAsync,
    })
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const entries = await Promise.all(
      Object.entries(value as UnknownRecord).map(async ([key, entryValue]) => [
        key,
        await convertLexicalValueToHTML(entryValue, req),
      ])
    )

    return Object.fromEntries(entries)
  }

  return value
}

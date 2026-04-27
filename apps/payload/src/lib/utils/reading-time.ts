import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'

const DEFAULT_WORDS_PER_MINUTE = 200

/** Estimate reading time in minutes for Lexical editor content. */
export const estimateReadingTime = (
  content?: SerializedEditorState | null,
  wordsPerMinute: number = DEFAULT_WORDS_PER_MINUTE,
): number => {
  if (!content) {
    return 0
  }

  const plainText = convertLexicalToPlaintext({ data: content })
  const trimmedText = plainText.trim()
  const wordCount = trimmedText ? trimmedText.split(/\s+/).length : 0

  if (!wordsPerMinute || wordsPerMinute <= 0) {
    return 0
  }

  return Math.ceil(wordCount / wordsPerMinute)
}

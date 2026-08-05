import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical"
import { convertLexicalToPlaintext } from "@payloadcms/richtext-lexical/plaintext"
import { describe, expect, it, vi } from "vitest"

import { estimateReadingTime } from "@/lib/utils/reading-time"

vi.mock(import("@payloadcms/richtext-lexical/plaintext"), () => ({
  convertLexicalToPlaintext: vi.fn<typeof convertLexicalToPlaintext>(),
}))

const convertLexicalToPlaintextMock = vi.mocked(convertLexicalToPlaintext)

const createEmptyContent = (): SerializedEditorState => ({
  root: {
    children: [],
    direction: null,
    format: "",
    indent: 0,
    type: "root",
    version: 1,
  },
})

describe("readingTime utilities", () => {
  describe(estimateReadingTime, () => {
    it("returns 0 for null content", () => {
      expect(estimateReadingTime(null)).toBe(0)
    })

    it("returns 0 for undefined content", () => {
      expect(estimateReadingTime()).toBe(0)
    })

    it("calculates reading time based on word count", () => {
      const words = Array.from({ length: 200 }, () => "word").join(" ")
      convertLexicalToPlaintextMock.mockReturnValue(words)

      expect(estimateReadingTime(createEmptyContent())).toBe(1)
    })

    it("uses default 200 words per minute", () => {
      const words = Array.from({ length: 400 }, () => "word").join(" ")
      convertLexicalToPlaintextMock.mockReturnValue(words)

      expect(estimateReadingTime(createEmptyContent())).toBe(2)
    })

    it("accepts custom words per minute", () => {
      const words = Array.from({ length: 300 }, () => "word").join(" ")
      convertLexicalToPlaintextMock.mockReturnValue(words)

      expect(estimateReadingTime(createEmptyContent(), 100)).toBe(3)
    })

    it("rounds up to nearest minute", () => {
      const words = Array.from({ length: 201 }, () => "word").join(" ")
      convertLexicalToPlaintextMock.mockReturnValue(words)

      expect(estimateReadingTime(createEmptyContent())).toBe(2)
    })

    it("returns 0 for empty content", () => {
      convertLexicalToPlaintextMock.mockReturnValue("")

      expect(estimateReadingTime(createEmptyContent())).toBe(0)
    })

    it("returns 0 for whitespace-only content", () => {
      convertLexicalToPlaintextMock.mockReturnValue("   \n\t   ")

      expect(estimateReadingTime(createEmptyContent())).toBe(0)
    })

    it("returns 0 when wordsPerMinute is 0", () => {
      const words = Array.from({ length: 200 }, () => "word").join(" ")
      convertLexicalToPlaintextMock.mockReturnValue(words)

      expect(estimateReadingTime(createEmptyContent(), 0)).toBe(0)
    })

    it("returns 0 when wordsPerMinute is negative", () => {
      const words = Array.from({ length: 200 }, () => "word").join(" ")
      convertLexicalToPlaintextMock.mockReturnValue(words)

      expect(estimateReadingTime(createEmptyContent(), -100)).toBe(0)
    })

    it("handles single word content", () => {
      convertLexicalToPlaintextMock.mockReturnValue("hello")

      expect(estimateReadingTime(createEmptyContent())).toBe(1)
    })

    it("handles content with multiple whitespace between words", () => {
      convertLexicalToPlaintextMock.mockReturnValue(
        "word1   word2\t\tword3\n\nword4",
      )

      expect(estimateReadingTime(createEmptyContent())).toBe(1)
    })

    it("passes content to convertLexicalToPlaintext correctly", () => {
      convertLexicalToPlaintextMock.mockReturnValue("test content")

      const content: SerializedEditorState = {
        root: {
          children: [{ type: "paragraph", version: 1 }],
          direction: null,
          format: "",
          indent: 0,
          type: "root",
          version: 1,
        },
      }
      estimateReadingTime(content)

      expect(convertLexicalToPlaintextMock).toHaveBeenCalledWith({
        data: content,
      })
    })

    it("handles large content efficiently", () => {
      const words = Array.from({ length: 10_000 }, () => "word").join(" ")
      convertLexicalToPlaintextMock.mockReturnValue(words)

      expect(estimateReadingTime(createEmptyContent())).toBe(50)
    })
  })
})

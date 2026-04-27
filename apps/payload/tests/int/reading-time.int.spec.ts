import { describe, it, expect, vi } from 'vitest'

vi.mock('@payloadcms/richtext-lexical/plaintext', () => ({
  convertLexicalToPlaintext: vi.fn(),
}))

import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { estimateReadingTime } from '@/lib/utils/reading-time'

const convertLexicalToPlaintextMock = vi.mocked(convertLexicalToPlaintext)

describe('readingTime utilities', () => {
  describe('estimateReadingTime', () => {
    it('returns 0 for null content', () => {
      expect(estimateReadingTime(null)).toBe(0)
    })

    it('returns 0 for undefined content', () => {
      expect(estimateReadingTime(undefined)).toBe(0)
    })

    it('calculates reading time based on word count', () => {
      const words = Array(200).fill('word').join(' ')
      convertLexicalToPlaintextMock.mockReturnValue(words)

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content)).toBe(1)
    })

    it('uses default 200 words per minute', () => {
      const words = Array(400).fill('word').join(' ')
      convertLexicalToPlaintextMock.mockReturnValue(words)

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content)).toBe(2)
    })

    it('accepts custom words per minute', () => {
      const words = Array(300).fill('word').join(' ')
      convertLexicalToPlaintextMock.mockReturnValue(words)

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content, 100)).toBe(3)
    })

    it('rounds up to nearest minute', () => {
      const words = Array(201).fill('word').join(' ')
      convertLexicalToPlaintextMock.mockReturnValue(words)

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content)).toBe(2)
    })

    it('returns 0 for empty content', () => {
      convertLexicalToPlaintextMock.mockReturnValue('')

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content)).toBe(0)
    })

    it('returns 0 for whitespace-only content', () => {
      convertLexicalToPlaintextMock.mockReturnValue('   \n\t   ')

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content)).toBe(0)
    })

    it('returns 0 when wordsPerMinute is 0', () => {
      const words = Array(200).fill('word').join(' ')
      convertLexicalToPlaintextMock.mockReturnValue(words)

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content, 0)).toBe(0)
    })

    it('returns 0 when wordsPerMinute is negative', () => {
      const words = Array(200).fill('word').join(' ')
      convertLexicalToPlaintextMock.mockReturnValue(words)

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content, -100)).toBe(0)
    })

    it('handles single word content', () => {
      convertLexicalToPlaintextMock.mockReturnValue('hello')

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content)).toBe(1)
    })

    it('handles content with multiple whitespace between words', () => {
      convertLexicalToPlaintextMock.mockReturnValue('word1   word2\t\tword3\n\nword4')

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content)).toBe(1)
    })

    it('passes content to convertLexicalToPlaintext correctly', () => {
      convertLexicalToPlaintextMock.mockReturnValue('test content')

      const content = { root: { children: [{ type: 'paragraph' }] } } as any
      estimateReadingTime(content)

      expect(convertLexicalToPlaintextMock).toHaveBeenCalledWith({ data: content })
    })

    it('handles large content efficiently', () => {
      const words = Array(10000).fill('word').join(' ')
      convertLexicalToPlaintextMock.mockReturnValue(words)

      const content = { root: { children: [] } } as any
      expect(estimateReadingTime(content)).toBe(50)
    })
  })
})

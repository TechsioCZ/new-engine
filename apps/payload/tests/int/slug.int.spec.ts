import { describe, it, expect } from 'vitest'
import { generateSlug, generateSlugFromTitle } from '@/lib/hooks/slug'

describe('slug utilities', () => {
  describe('generateSlug', () => {
    it('converts string to lowercase', () => {
      expect(generateSlug('Hello World')).toBe('hello-world')
    })

    it('replaces spaces with hyphens', () => {
      expect(generateSlug('hello world test')).toBe('hello-world-test')
    })

    it('removes special characters', () => {
      expect(generateSlug('hello@world#test!')).toBe('helloworldtest')
    })

    it('collapses multiple hyphens into one', () => {
      expect(generateSlug('hello   world')).toBe('hello-world')
      expect(generateSlug('hello---world')).toBe('hello-world')
    })

    it('trims leading and trailing whitespace', () => {
      expect(generateSlug('  hello world  ')).toBe('hello-world')
    })

    it('normalizes Unicode characters (NFKD)', () => {
      expect(generateSlug('Příliš')).toBe('prilis')
      expect(generateSlug('Žluťoučký')).toBe('zlutoucky')
      expect(generateSlug('café')).toBe('cafe')
    })

    it('handles accented characters correctly', () => {
      expect(generateSlug('résumé')).toBe('resume')
      expect(generateSlug('naïve')).toBe('naive')
      expect(generateSlug('über')).toBe('uber')
    })

    it('preserves numbers', () => {
      expect(generateSlug('test123')).toBe('test123')
      expect(generateSlug('Article 2024')).toBe('article-2024')
    })

    it('handles empty string', () => {
      expect(generateSlug('')).toBe('')
    })

    it('handles string with only special characters', () => {
      expect(generateSlug('!@#$%^&*()')).toBe('')
    })

    it('handles mixed content', () => {
      expect(generateSlug('Top 10 Důvodů pro Nákup!')).toBe('top-10-duvodu-pro-nakup')
    })
  })

  describe('generateSlugFromTitle', () => {
    it('generates slug from string title', () => {
      expect(generateSlugFromTitle('Hello World')).toBe('hello-world')
    })

    it('returns fallback for null title', () => {
      expect(generateSlugFromTitle(null, { fallback: 'default' })).toBe('default')
    })

    it('returns fallback for undefined title', () => {
      expect(generateSlugFromTitle(undefined, { fallback: 'default' })).toBe('default')
    })

    it('returns empty string as default fallback', () => {
      expect(generateSlugFromTitle(null)).toBe('')
      expect(generateSlugFromTitle(undefined)).toBe('')
    })

    it('extracts localized title from object with matching locale', () => {
      const title = { en: 'English Title', cs: 'Český Titulek' }
      expect(generateSlugFromTitle(title, { locale: 'cs' })).toBe('cesky-titulek')
    })

    it('falls back to first available title when locale not found', () => {
      const title = { en: 'English Title', cs: 'Český Titulek' }
      expect(generateSlugFromTitle(title, { locale: 'de' })).toBe('english-title')
    })

    it('uses first available title when no locale specified', () => {
      const title = { en: 'English Title', cs: 'Český Titulek' }
      expect(generateSlugFromTitle(title)).toBe('english-title')
    })

    it('returns fallback when localized value is empty string', () => {
      const title = { en: '', cs: 'Český Titulek' }
      expect(generateSlugFromTitle(title, { locale: 'en', fallback: 'default' })).toBe(
        'cesky-titulek'
      )
    })

    it('returns fallback when localized value is whitespace only', () => {
      const title = { en: '   ', cs: 'Český Titulek' }
      expect(generateSlugFromTitle(title, { locale: 'en', fallback: 'default' })).toBe(
        'cesky-titulek'
      )
    })

    it('returns fallback when all values are empty', () => {
      const title = { en: '', cs: '' }
      expect(generateSlugFromTitle(title, { fallback: 'default' })).toBe('default')
    })

    it('returns fallback when all values are whitespace', () => {
      const title = { en: '   ', cs: '   ' }
      expect(generateSlugFromTitle(title, { fallback: 'default' })).toBe('default')
    })

    it('ignores non-string values in title object', () => {
      const title = { en: 123, cs: 'Český Titulek' } as unknown
      expect(generateSlugFromTitle(title, { locale: 'en' })).toBe('cesky-titulek')
    })

    it('returns fallback when object contains only non-string values', () => {
      const title = { en: 123, cs: null } as unknown
      expect(generateSlugFromTitle(title, { fallback: 'default' })).toBe('default')
    })

    it('handles empty object', () => {
      expect(generateSlugFromTitle({}, { fallback: 'default' })).toBe('default')
    })

    it('handles title with only whitespace', () => {
      expect(generateSlugFromTitle('   ', { fallback: 'default' })).toBe('default')
    })
  })
})

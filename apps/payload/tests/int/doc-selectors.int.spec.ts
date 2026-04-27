import { describe, it, expect } from 'vitest'
import { getCategoryDoc, getMediaUrl } from '@/lib/utils/doc-selectors'

describe('doc selector utilities', () => {
  it('getCategoryDoc returns null for invalid values', () => {
    expect(getCategoryDoc(null)).toBeNull()
    expect(getCategoryDoc('category')).toBeNull()
    expect(getCategoryDoc({ id: '1' })).toBeNull()
  })

  it('getCategoryDoc extracts category data', () => {
    const category = { id: 1, title: 'News', slug: 'news' }
    expect(getCategoryDoc(category)).toEqual({
      id: 1,
      title: 'News',
      slug: 'news',
    })
  })

  it('getMediaUrl returns url when present', () => {
    expect(getMediaUrl(null)).toBeNull()
    expect(getMediaUrl({ url: 123 })).toBeNull()
    expect(getMediaUrl({ url: 'https://example.com/image.jpg' })).toBe(
      'https://example.com/image.jpg'
    )
  })
})

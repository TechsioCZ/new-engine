import { describe, it, expect, vi } from 'vitest'

vi.mock('payload', () => ({
  headersWithCors: vi.fn(({ headers }: { headers: Headers }) => headers),
}))

import { headersWithCors } from 'payload'
import { articleCategoriesWithArticlesEndpoint } from '@/lib/endpoints/article-categories-with-articles'
import { pageCategoriesWithPagesEndpoint } from '@/lib/endpoints/page-categories-with-pages'

const headersWithCorsMock = vi.mocked(headersWithCors)

const createBaseReq = () => ({
  headers: new Headers(),
  payload: {
    config: {
      localization: { localeCodes: ['en'] },
    },
    find: vi.fn(),
  },
})

describe('category endpoints', () => {
  it('groups articles by category and applies filters', async () => {
    const docs = [
      {
        title: 'Article 1',
        slug: 'article-1',
        excerpt: 'Intro',
        featuredImage: { url: '/img-1.png' },
        category: { id: 1, title: 'News', slug: 'news' },
      },
      {
        title: 'Article 2',
        slug: 'article-2',
        excerpt: null,
        featuredImage: null,
        category: { id: 1, title: 'News', slug: 'news' },
      },
      {
        title: 'Article 3',
        slug: 'article-3',
        excerpt: 'Other',
        featuredImage: { url: '/img-3.png' },
        category: { id: 2, title: 'Updates', slug: 'updates' },
      },
      {
        title: 'No Category',
        slug: 'no-category',
        category: null,
      },
    ]

    const req = {
      ...createBaseReq(),
      url: 'http://localhost?locale=en&categorySlug=news',
    } as any
    req.payload.find.mockResolvedValue({ docs })

    const response = await articleCategoriesWithArticlesEndpoint.handler(req)
    const body = await response.json()

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'articles',
        locale: 'en',
        where: expect.objectContaining({
          status: { equals: 'published' },
          'category.slug': { equals: 'news' },
        }),
        req,
      })
    )

    expect(body.categories).toEqual([
      {
        id: 1,
        title: 'News',
        slug: 'news',
        articles: [
          {
            title: 'Article 1',
            slug: 'article-1',
            excerpt: 'Intro',
            featuredImage: '/img-1.png',
          },
          {
            title: 'Article 2',
            slug: 'article-2',
            excerpt: null,
            featuredImage: null,
          },
        ],
      },
      {
        id: 2,
        title: 'Updates',
        slug: 'updates',
        articles: [
          {
            title: 'Article 3',
            slug: 'article-3',
            excerpt: 'Other',
            featuredImage: '/img-3.png',
          },
        ],
      },
    ])
  })

  it('groups pages by category', async () => {
    const docs = [
      {
        title: 'Page 1',
        slug: 'page-1',
        category: { id: 10, title: 'Docs', slug: 'docs' },
      },
      {
        title: 'Page 2',
        slug: 'page-2',
        category: { id: 10, title: 'Docs', slug: 'docs' },
      },
      {
        title: 'Page 3',
        slug: 'page-3',
        category: { id: 11, title: 'Guides', slug: 'guides' },
      },
    ]

    const req = {
      ...createBaseReq(),
      url: 'http://localhost?locale=en',
    } as any
    req.payload.find.mockResolvedValue({ docs })

    const response = await pageCategoriesWithPagesEndpoint.handler(req)
    const body = await response.json()

    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'pages',
        locale: 'en',
        where: expect.objectContaining({
          status: { equals: 'published' },
        }),
        req,
      })
    )

    expect(body.categories).toEqual([
      {
        id: 10,
        title: 'Docs',
        slug: 'docs',
        pages: [
          { title: 'Page 1', slug: 'page-1' },
          { title: 'Page 2', slug: 'page-2' },
        ],
      },
      {
        id: 11,
        title: 'Guides',
        slug: 'guides',
        pages: [{ title: 'Page 3', slug: 'page-3' }],
      },
    ])
  })
})

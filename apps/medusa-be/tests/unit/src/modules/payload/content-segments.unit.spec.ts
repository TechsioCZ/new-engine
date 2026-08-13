import { describe, expect, it } from "vitest"
import {
  buildCmsArticleContentSegments,
  buildCmsArticleTableOfContents,
} from "../../../../../src/modules/payload/content-segments"

const createContent = (...fields: Record<string, unknown>[]) => ({
  root: {
    type: "root",
    children: fields.map((blockFields) => ({
      type: "block",
      version: 2,
      fields: blockFields,
    })),
    direction: null,
    format: "",
    indent: 0,
    version: 1,
  },
})

describe("buildCmsArticleContentSegments", () => {
  it("preserves HTML and supported block order", () => {
    const content = createContent(
      {
        blockType: "productCarousel",
        products: [{ productExternalId: "4428", privateValue: "removed" }],
      },
      {
        blockType: "productCarousel",
        products: [{ productSlug: "legacy-product" }],
      }
    )

    expect(
      buildCmsArticleContentSegments(
        content,
        [
          '<div class="payload-richtext">',
          "<p>Before</p>",
          '<div data-cms-block="productCarousel"></div>',
          "<p>Between</p>",
          '<div data-cms-block="productCarousel"></div>',
          "<p>After</p>",
          "</div>",
        ].join("")
      )
    ).toEqual([
      { type: "html", html: "<p>Before</p>" },
      {
        type: "productCarousel",
        products: [{ productExternalId: "4428" }],
      },
      { type: "html", html: "<p>Between</p>" },
      {
        type: "productCarousel",
        products: [{ productSlug: "legacy-product" }],
      },
      { type: "html", html: "<p>After</p>" },
    ])
  })

  it("fails closed to marker-free HTML when markers do not match blocks", () => {
    expect(
      buildCmsArticleContentSegments(
        createContent(),
        '<p>Before</p><div data-cms-block="productCarousel"></div><p>After</p>'
      )
    ).toEqual([{ type: "html", html: "<p>Before</p><p>After</p>" }])
  })

  it("fails closed when a product marker is missing", () => {
    const content = createContent(
      {
        blockType: "productCarousel",
        products: [{ productExternalId: "4428" }],
      },
      {
        blockType: "productCarousel",
        products: [{ productExternalId: "13577" }],
      }
    )

    expect(
      buildCmsArticleContentSegments(
        content,
        [
          "<p>Before</p>",
          '<div data-cms-block="productCarousel"></div>',
          "<p>After</p>",
        ].join("")
      )
    ).toEqual([{ type: "html", html: "<p>Before</p><p>After</p>" }])
  })

  it("returns no segments when generated HTML is absent", () => {
    expect(buildCmsArticleContentSegments(createContent(), null)).toEqual([])
  })

  it("builds stable heading anchors and a table of contents from Lexical", () => {
    const content = {
      root: {
        type: "root",
        version: 1,
        children: [
          {
            type: "heading",
            tag: "h2",
            children: [{ type: "text", text: "Čo sú elektrolyty?" }],
          },
          {
            type: "heading",
            tag: "h3",
            children: [{ type: "text", text: "Praktické použitie" }],
          },
          {
            type: "heading",
            tag: "h2",
            children: [{ type: "text", text: "Čo sú elektrolyty?" }],
          },
        ],
      },
    }

    expect(buildCmsArticleTableOfContents(content)).toEqual([
      { id: "co-su-elektrolyty", level: 2, title: "Čo sú elektrolyty?" },
      { id: "prakticke-pouzitie", level: 3, title: "Praktické použitie" },
      { id: "co-su-elektrolyty-2", level: 2, title: "Čo sú elektrolyty?" },
    ])
    expect(
      buildCmsArticleContentSegments(
        content,
        "<h2>Čo sú elektrolyty?</h2><h3>Praktické použitie</h3><h2>Čo sú elektrolyty?</h2>"
      )
    ).toEqual([
      {
        type: "html",
        html: '<h2 id="co-su-elektrolyty">Čo sú elektrolyty?</h2><h3 id="prakticke-pouzitie">Praktické použitie</h3><h2 id="co-su-elektrolyty-2">Čo sú elektrolyty?</h2>',
      },
    ])
  })

  it("keeps later heading anchors aligned after an unmatched heading", () => {
    const content = {
      root: {
        type: "root",
        version: 1,
        children: [
          {
            type: "heading",
            tag: "h2",
            children: [{ type: "text", text: "First chapter" }],
          },
          {
            type: "heading",
            tag: "h2",
            children: [{ type: "text", text: "Second chapter" }],
          },
        ],
      },
    }

    expect(
      buildCmsArticleContentSegments(
        content,
        "<h3>Nested block heading</h3><h2>First chapter</h2><h2>Second chapter</h2>"
      )
    ).toEqual([
      {
        type: "html",
        html: '<h3>Nested block heading</h3><h2 id="first-chapter">First chapter</h2><h2 id="second-chapter">Second chapter</h2>',
      },
    ])
  })
})

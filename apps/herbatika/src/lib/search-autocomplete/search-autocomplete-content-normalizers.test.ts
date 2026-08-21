import { describe, expect, it } from "vitest"
import { createContentSuggestions } from "./search-autocomplete-content-normalizers"

describe("content autocomplete URL projections", () => {
  it("ignores backend hrefs and builds localized URLR paths", () => {
    expect(
      createContentSuggestions(
        [
          {
            href: "/blog/legacy-slug",
            id: "article_1",
            title: "Bylinky",
            type: "article",
          },
          {
            href: "https://attacker.invalid/page",
            id: "page_1",
            title: "Doprava",
            type: "page",
          },
        ],
        "cz",
        { "1": "bylinky" },
        { "1": "doprava" }
      )
    ).toEqual([
      {
        href: "/blog/bylinky",
        id: "article_1",
        sourceId: "article_1",
        subtitle: "Článok",
        title: "Bylinky",
        type: "content",
      },
      {
        href: "/informace/doprava",
        id: "page_1",
        sourceId: "page_1",
        subtitle: "Informačná stránka",
        title: "Doprava",
        type: "content",
      },
    ])
  })

  it("omits unsupported or unprojected content", () => {
    expect(
      createContentSuggestions(
        [
          { href: "/legacy", id: "missing", title: "Missing", type: "article" },
          { href: "/legacy", id: "other", title: "Other", type: "campaign" },
        ],
        "sk",
        {},
        {}
      )
    ).toEqual([])
  })
})

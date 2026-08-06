import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SafeHtml } from "../src/atoms/safe-html"
import type { SafeHtmlPolicy } from "../src/atoms/safe-html"

const MALICIOUS_HTML =
  '<script>alert(1)</script><p style="color:red" onclick="alert(1)">Safe</p><img src="javascript:alert(1)" onerror="alert(1)" alt=""><img src="//cdn.example.test/image.png" srcset="//cdn.example.test/image.png 1x, javascript:alert(1) 2x" alt="Safe image"><a href="java&#x73;cript:alert(1)" target="_blank" style="color:red">Bad entity link</a><a href="jav&#10;ascript:alert(1)">Bad control link</a><a href="//example.test/path" target="_blank">Safe link</a>'

const ARTICLE_POLICY: SafeHtmlPolicy = {
  allowedAttributes: {
    a: ["href", "rel", "target", "style", "onclick"],
    img: ["alt", "onerror", "src", "srcset"],
  },
  allowedTags: ["a", "em", "img", "p", "strong"],
}

describe(SafeHtml, () => {
  it("preserves sanitized rich-text markup during SSR", () => {
    const markup = renderToStaticMarkup(
      <div className="content">
        <SafeHtml
          html="<p>Hello <strong>world</strong> and <em>friends</em>.</p>"
          policy={ARTICLE_POLICY}
        />
      </div>,
    )

    expect(markup).toBe(
      '<div class="content"><p>Hello <strong>world</strong> and <em>friends</em>.</p></div>',
    )
  })

  it("removes scripts, event handlers, styles, and unsafe URLs", () => {
    const markup = renderToStaticMarkup(
      <SafeHtml html={MALICIOUS_HTML} policy={ARTICLE_POLICY} />,
    )

    expect(markup).toBe(
      '<link rel="preload" as="image" href="//cdn.example.test/image.png"/><p>Safe</p><img alt=""/><img src="//cdn.example.test/image.png" alt="Safe image"/><a target="_blank" rel="noopener noreferrer">Bad entity link</a><a>Bad control link</a><a href="//example.test/path" target="_blank" rel="noopener noreferrer">Safe link</a>',
    )
  })

  it("applies an app sanitizer before the shared fail-closed policy", () => {
    const markup = renderToStaticMarkup(
      <SafeHtml
        html="<h1>Title</h1><p>Body</p>"
        policy={{
          ...ARTICLE_POLICY,
          sanitize: (html) =>
            html.replace("<h1>", "<p>").replace("</h1>", "</p>"),
        }}
      />,
    )

    expect(markup).toBe("<p>Title</p><p>Body</p>")
  })
})

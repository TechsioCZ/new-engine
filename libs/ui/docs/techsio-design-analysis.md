# Techsio website — design analysis (for the `neo` theme)

Source: https://techsio-web-git-nick-techsio-web-new-xhemalovs-projects.vercel.app/
Method: computed styles + `:root` CSS variables + color tallies, scraped in-browser across
`/`, `/ecommerce`, `/integrace`, `/portfolio` (all uniform).

## Aesthetic in one line

Dark-first, high-contrast site with **one vivid red brand accent (`#e60000`)**, bold geometric
**uppercase Unbounded** display type, gray body text on near-black surfaces, **8px** rounded
corners (pills for tags), and an occasional neon-lime highlight.

## Colors (exact, by frequency)

| Role | Hex | Notes |
|------|-----|-------|
| **Brand red (primary)** | **`#e60000`** | rgb(230,0,0). Primary CTA bg + border, emphasized heading words, stats, links, logo dot. THE brand color. |
| On-primary text | `#ffffff` | White text on red buttons (weight 700). |
| Page bg (dark) | `#0a0a0a` / `#0d0d0d` | Near-black, pure gray (not blue-tinted). |
| Surface / card | `#1a1a1a`, `#2a2a2a`, `#2b2b2b`, `#4a4a4a` | Cards `#4a4a4a`, border `rgba(75,85,99,0.5)`. |
| Body text on dark | `#bfbfbf` | Lead paragraphs `#bfbfbf`. |
| Body text on light | `#0a0a0a` | |
| Muted text | `#9ca3af` | |
| Secondary accent | `#a9ff0a` | Neon lime, occasional highlight (rgb 169,255,10). |
| Warning | `#eab308` | Amber. |

Key point vs. current `neo`: the brand red must be the **deep `#e60000`** used at full strength
(buttons, icons, links), **not** the pale `/300` tint the theme currently shows.

## Typography

| Element | Family | Size / line-height | Weight |
|---------|--------|--------------------|--------|
| h1 (display) | **Unbounded** | 72px / 86.4px (1.2) | 700 |
| h2 | Unbounded | 48px / 57.6px (1.2) | 700 |
| h3 | Unbounded | 18px | 700 |
| Lead paragraph | Geist/Inter | 24px / 32px | 400 |
| Body | Geist/Inter | 16px / 24px (1.5) | 400 |
| Button | Geist/Inter | 14–16px | 700–900 |

`:root` vars: `--font-unbounded:"Unbounded"`, `--font-geist-sans:"Geist"`, `--font-inter:"Inter"`,
`--radius:.5rem`. Headings are **uppercase**. Display type is geometric and very bold.

> Fonts live in Figma **text styles**, not variables — so the font swap is a text-style change,
> separate from the variable work below. Documented here for completeness.

## Geometry

| Token | Value |
|-------|-------|
| Standard radius | **8px** (`0.5rem`) — buttons, cards, inputs |
| Pill radius | `9999px` — badges / tags |
| Button padding | `8px 16px` (sm), `12px 32px` (lg) |
| Card padding | `24px` |
| Border | 1–2px; cards `rgba(75,85,99,0.5)`, primary button `2px solid #e60000` |

## How this maps to our `neo` tokens (the update)

1. **Red ramp** anchored so the brand step (`primary/600`) = `#e60000`; lighter tints above,
   darker hovers below.
2. **Primary becomes a deep solid** (matching the site), not a pale tint:
   - `bg/primary/base → primary/600` (`#e60000`), `hover → 700`, `active → 800`.
   - The paired **on-primary foreground → white** (so red buttons read like the site).
   - `bg-light/primary` (subtle tinted bg) → `primary/100/200/300`.
3. **Links / icons / emphasis** (`fg-accent/primary`) → `primary/600` in light, slightly brighter
   (`primary/500`) in dark for contrast on near-black.
4. Radius already `8px`-class in our scale — keep. Spacing kept consistent.
5. Optional (high-fidelity): pure-gray dark surfaces + neon-lime secondary — noted, not applied by
   default to avoid disrupting status/secondary semantics.

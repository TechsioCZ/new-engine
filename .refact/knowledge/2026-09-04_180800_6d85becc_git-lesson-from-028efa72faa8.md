---
id: 11506e41-be1b-477c-a1e2-0bf51d384663
title: Git lesson from 028efa72faa8
tags:
- git
- lesson
created: 2026-09-04
updated: 2026-09-14
filenames:
- apps/herbatika/src/app/layout.tsx
- apps/herbatika/src/components/account-shell.tsx
- apps/herbatika/src/components/app-shell.tsx
- apps/herbatika/src/components/checkout/checkout-payment-return-panel.tsx
- apps/herbatika/src/components/header/herbatika-mobile-menu-nav.tsx
- apps/herbatika/src/components/product-detail/sections/product-detail-reviews.tsx
- apps/herbatika/src/components/product-lists/use-account-product-lists.ts
- apps/herbatika/src/i18n/request.ts
- apps/herbatika/src/lib/routing/public-page.ts
- apps/herbatika/src/lib/search-autocomplete/search-autocomplete.server.ts
- apps/herbatika/src/lib/server-guard.ts
- apps/herbatika/src/lib/storefront/brands.server.ts
links: []
kind: lesson
status: proposed
superseded_by: null
deprecated_at: null
review_after: 2026-09-14
source_chat_id: null
created_at: 2026-09-04T16:08:00.102406800+00:00
summary: null
description: null
entities: []
related_files: []
related_entities: []
content_hash: 79d6b18b1ebccdb4874429b7ee334ab94d8b03a144aa1bf1d7afe02b7de1fccd
source_tool: buddy_memory_lifecycle:git
source_confidence: 0.8600000143051147
source_trajectory_id: null
source_message_range: null
source_commit: 028efa72faa8fb686e0731e790baeada8b7f8c74
topic: null
last_used_at: null
use_count: 0
last_injected_at: null
dismissed_count: 0
source_content_hash: 79d6b18b1ebccdb4874429b7ee334ab94d8b03a144aa1bf1d7afe02b7de1fccd
review_needed: true
occurrences: 0
---

Git lesson from 028efa72faa8

Source commit: 028efa72faa8
Paths: apps/herbatika/src/app/layout.tsx, apps/herbatika/src/components/account-shell.tsx, apps/herbatika/src/components/app-shell.tsx, apps/herbatika/src/components/checkout/checkout-payment-return-panel.tsx, apps/herbatika/src/components/header/herbatika-mobile-menu-nav.tsx, apps/herbatika/src/components/product-detail/sections/product-detail-reviews.tsx, apps/herbatika/src/components/product-lists/use-account-product-lists.ts, apps/herbatika/src/i18n/request.ts, apps/herbatika/src/lib/routing/public-page.ts, apps/herbatika/src/lib/search-autocomplete/search-autocomplete.server.ts, apps/herbatika/src/lib/server-guard.ts, apps/herbatika/src/lib/storefront/brands.server.ts
Summary: fix(herbatika): add pages-compatible server request context seam Thread explicit market, host, and cookie context through Pages Router GSSP instead of App-only next/headers. Keep thin App adapters, enforce server-only runtime guards, and preserve secrets outside browser chunks. Production build, tsc, tests, Biome, and
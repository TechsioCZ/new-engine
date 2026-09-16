---
id: 6820bd88-d1da-4669-9be5-7981ed60d468
title: Git lesson from facfc5ad4bc3
tags:
- git
- lesson
created: 2026-09-04
updated: 2026-09-14
filenames:
- libs/ui/rslib.config.ts
- libs/ui/tsconfig.json
links: []
kind: lesson
status: proposed
superseded_by: null
deprecated_at: null
review_after: 2026-09-14
source_chat_id: null
created_at: 2026-09-04T16:08:02.501349300+00:00
summary: null
description: null
entities: []
related_files: []
related_entities: []
content_hash: 7e37506221fa7544b1c8bd1b81099b84f8d6a72f818934d17356e30733535b7b
source_tool: buddy_memory_lifecycle:git
source_confidence: 0.8600000143051147
source_trajectory_id: null
source_message_range: null
source_commit: facfc5ad4bc32bc5f6b75b13a1adcc35b0616c5b
topic: null
last_used_at: null
use_count: 0
last_injected_at: null
dismissed_count: 0
source_content_hash: 7e37506221fa7544b1c8bd1b81099b84f8d6a72f818934d17356e30733535b7b
review_needed: true
occurrences: 0
---

Git lesson from facfc5ad4bc3

Source commit: facfc5ad4bc3
Paths: libs/ui/rslib.config.ts, libs/ui/tsconfig.json
Summary: fix(ui-kit): exclude Code Connect templates from the library build The Vercel Storybook deployment failed on this branch: every *.figma.ts template raised TS2307 "Cannot find module 'figma'" during declaration generation. The v1 .figma.tsx files imported @figma/code-connect, a real package with types, so tsc resolved t
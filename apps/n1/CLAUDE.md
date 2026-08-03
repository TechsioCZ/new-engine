# N1 E-commerce Application

Next.js 16 e-commerce frontend for Medusa.js v2 backend.

## CRITICAL RULES

**ALWAYS:**

- Assume dev server running on `localhost:3000` - NEVER ask to start it
- Use spacing tokens `50-950` (NEVER `sm`/`md`/`lg`)
- Use semantic color tokens (NEVER `bg-gray-100`, `text-blue-500`)
- Read `local/docs/user/*.md` before cart/auth/checkout work

**NEVER:**

- Edit `package.json` manually - use `pnpm add <pkg>`
- Use `forwardRef` or `useCallback` (React 19)
- Create `tailwind.config.js` (Tailwind v4 uses CSS)
- Use arbitrary values like `p-[20px]` or `bg-[#fff]`
- Run `biome check --write .` - always specify files explicitly

---

## Tech Stack

- **Framework:** Next.js 16 + Turbopack
- **UI:** React 19 (ref as prop), Tailwind v4, react compiler
- **State:** @tanstack/react-query v5
- **Backend:** @medusajs/js-sdk
- **Components:** @libs/ui (atomic design)

---

## Commands

```bash
pnpm dev                         # Dev server (assume running on :3000)
pnpm build                       # Production build
bunx tsc --noEmit               # Type check
bunx biome check --write <files> # Lint + format (NEVER use `.`)
pnpm add <pkg>                   # Add dependency
pnpm add -D <pkg>                # Add dev dependency
```

---

## Token Quick Reference

### Spacing (ALWAYS 50-950)

```typescript
// ✅ CORRECT
className = "p-400 gap-600 m-200"

// ❌ WRONG - DOES NOT EXIST
className = "p-md gap-lg m-sm"
```

| Token | Value | Use      |
| ----- | ----- | -------- |
| `200` | 8px   | Tight    |
| `400` | 16px  | Standard |
| `600` | 24px  | Section  |
| `800` | 40px  | Large    |

### Colors (Semantic only)

```typescript
// ✅ CORRECT
className = "bg-primary text-fg-primary"
className = "bg-surface border-border-secondary"

// ❌ WRONG - DOES NOT EXIST
className = "bg-gray-100 text-blue-500"
```

| Type       | Tokens                                     |
| ---------- | ------------------------------------------ |
| Brand      | `primary`, `secondary`, `tertiary`         |
| Status     | `success`, `warning`, `danger`, `info`     |
| Text       | `fg-primary`, `fg-secondary`, `fg-reverse` |
| Background | `base`, `surface`, `overlay`               |
| Border     | `border-primary`, `border-secondary`       |

@./.claude/instructions/01-tokens.md

---

## Code Patterns

### React 19

```typescript
// ✅ ref as prop (no forwardRef)
function Button({ ref, onClick }: Props) {
  return <button ref={ref} onClick={onClick} />
}
```

### Imports

```typescript
// UI Library
import { Button } from "@libs/ui/atoms/button"
import { Dialog } from "@libs/ui/molecules/dialog"

// Hooks
import { useCart } from "@/hooks/use-cart"
import { useAuth } from "@/hooks/use-auth"

// Services
import { getProducts } from "@/services/product-service"
```

@./.claude/instructions/02-code-patterns.md

---

## User Data System

**REQUIRED READING before working on user features:**

| Feature               | Documentation                  |
| --------------------- | ------------------------------ |
| **Start here**        | `local/docs/user/index.md`     |
| Cart operations       | `local/docs/user/cart.md`      |
| Checkout flow         | `local/docs/user/checkout.md`  |
| Auth (login/register) | `local/docs/user/auth.md`      |
| Orders                | `local/docs/user/orders.md`    |
| Addresses             | `local/docs/user/addresses.md` |
| Cache/prefetch        | `local/docs/user/provider.md`  |
| Error handling        | `local/docs/user/utilities.md` |

**Key hooks:** `useCart`, `useAuth`, `useOrders`, `useAddresses`, `useCheckout`

---

## File Structure

```
src/
├── app/              # Next.js app router
├── components/       # App-specific components
├── hooks/           # React Query hooks
├── services/        # Medusa SDK services
├── lib/             # Utilities, config
└── tokens/          # Design tokens CSS
```

---

## DO / DON'T

| DO                              | DON'T                          |
| ------------------------------- | ------------------------------ |
| `p-400`, `gap-600`              | `p-md`, `gap-lg`               |
| `bg-primary`, `text-fg-primary` | `bg-gray-100`, `text-blue-500` |
| Read `local/docs/user/*` first  | Guess user data patterns       |
| `pnpm add <pkg>`                | Edit package.json              |
| ref as prop (React 19)          | forwardRef, useCallback        |

---

**Token files:** `src/tokens/_n1-*.css` **UI Library:** `../../libs/ui/CLAUDE.md` **Last Updated:** 2025-01-25

---
name: "Order dashboard plugin - i18n and UX polish"
overview: "Apply plugin Medusa Admin translations, canonical terminology, badge/action-required rules, visual state cleanup, and accessibility polish after table and action behavior land."
todos:
  - id: "create-i18n-namespace"
    content: "Keep a dedicated order dashboard namespace in plugin Admin i18n resources with Czech and English strings for every visible label."
    status: pending
  - id: "canonicalize-terminology"
    content: "Unify menu labels, page title, chips, tabs, statuses, carrier labels, payment labels, and actions so Czech/English and chip/tab wording do not conflict."
    status: pending
  - id: "apply-badge-rules"
    content: "Integrate or document Orders and Customers sidebar badge limits from admin-obecne-test.md using the same action-required semantics as the dashboard."
    status: pending
  - id: "fix-visual-polish"
    content: "Fix missing diacritics, disabled-looking controls, duplicate indicators, weak status separation, price alignment, and inconsistent category ordering."
    status: pending
  - id: "verify-accessibility"
    content: "Verify keyboard focus, row selection, table labels, filter/action grouping, disabled/loading states, and tooltip/help semantics."
    status: pending
isProject: false
---

# I18n And UX Polish

Use `src/admin/i18n/index.ts` and route-local translation resources. Every visible string must exist in Czech and English.

If Medusa Admin menu replacement limits prevent exact sidebar badge behavior, document the limitation and implement the closest native extension path without forking the admin shell.

Terminology must align with the dashboard workflow:

- use Czech labels with diacritics for the default Czech UI
- use consistent labels between menu, title, queue tabs, status chips, filters, and actions
- payment labels must be human-readable, for example karta, převod, dobírka, GoPay, Apple Pay, Google Pay, or QR převod, not raw provider ids
- queue labels such as Nevyřízené, Přijatá platba, Vyřízené, Storno, Čekáme interně, and Čekající na platbu must be mapped deliberately to backend business/payment states
- controls that are interactive must not look disabled, and disabled controls must explain the unavailable state where needed

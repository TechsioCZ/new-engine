import type { Meta, StoryObj } from "@storybook/react"
import { Link } from "../../src/atoms/link"

/**
 * Per-component changelog for `@techsio/ui-kit`, rendered in Storybook.
 *
 * Each `### <Component> vX.Y.Z` heading below is the source of truth the pre-commit gate
 * (`scripts/check-skill-sync.mjs`) checks: a component's `@componentVersion` and its usage skill's
 * `component_version` must both match an entry here. Keep the three in lock-step.
 *
 * Add newest entries under "Unreleased"; a release moves them under a dated version heading.
 */
const CHANGELOG = `
## @techsio/ui-kit — Unreleased

### Screenshot review fixes
- Bound StatusText, NumericInput, Popover, PhoneInput, RadioCard and CRM/Settings demonstrations to the viewport; make submenu and Slider captures deterministic.
- Share block padding and line-height floors across form controls so Select, Button, Input and Combobox heights match at every size.

### DataTable v1.4.2
- Keep the column-settings menu readable, stop mobile toolbar search and actions from overlapping, contain fixed-layout cell content, keep editor validation clear of sticky actions, center empty feedback in the visible scrollport and keep opposing pins from hiding middle columns.

### Menu v1.3.2
- Size menus to their content within the available viewport instead of locking them to the trigger width.

### CascadeSelect v1.1.5
- Reserve size-aware space for the clear action so long selected paths truncate before it, and share the growing control geometry with Select.

### DatePicker v1.3.4
- Wrap timed and zoned range endpoints on narrow fields with labeled start and end groups instead of hiding the end behind a scroll.

### ColorSelect v1.1.3
- Give large captions wider adaptive tracks so ordinary names stay on one line.

### Select v1.3.2
- Match the outer height of Button, Input and Combobox at every size through shared control geometry.

### ProductCard v1.3.2
- Stack row cards responsively to their container so ratings and primary actions keep their space.

### Tabs v1.2.2
- Keep the selected underline on its own tab row by preventing selected and focused triggers from competing for strip scrolling.

### Steps v1.2.1
- Align mobile connectors to indicator centers and keep step labels whole.

### Mobile fixes
- Make RadioGroup, RadioCard, Checkbox, FacetFilterPanel and DataTable reorder plays wait for real focus, args and drag completion under CPU load instead of racing timers.

### Combobox v1.6.3
- Keep every keystroke when a controlled query is acknowledged late by its parent; external replacement, selection, blur and reset stay authoritative.

### SearchSuggestions v1.0.3
- Never drop characters during rapid typing on slow devices.

### CascadeSelect v1.1.4
- Fit the open hierarchy within narrow viewports: two columns always sit side by side, deeper levels scroll with snapping and keep the active and focused columns visible.

### DataTable v1.4.1
- Keep resized column widths and fitting frozen identity columns on narrow screens, and batch virtualized measurement to avoid ResizeObserver loops.

### Suite fixes and testing
- Align DatePicker and other behavior specs with current control contracts; wait for real focus, validation, inert and popup states in stories, including Akros banner uploads and cart dialogs.
- Keep brand-locked visual stories in their authored brand, pin external image assets, wait for loaded media or visible fallbacks, and tile oversized screenshots without launching extra browser sessions.

### Button v0.6.1
- Keep consumer refs attached across rerenders instead of repeatedly detaching and restoring them.

### Carousel v1.3.4
- Preserve indicator focus and queued navigation while snap offsets settle, with vertical keyboard and finite-boundary regression coverage.

### CascadeSelect v1.1.3
- Preserve keyboard highlights during hierarchy reconciliation and match Select trigger hover text instead of using accent text.

### Combobox v1.6.2
- Preserve typed query text and caret during deferred result updates in WebKit while keeping controlled queries and reset authoritative.

### SearchSuggestions v1.0.2
- Inherit stable query text and caret while filtered result groups update, including deferred WebKit synchronization.

### FileUpload v1.1.3
- Return focus to a visible upload control after deletion rather than the hidden submission input.

### Slider v1.4.2
- Let read-only thumbs receive pointer focus without changing values or starting a drag.

### Tour v1.0.8
- Keep dialog and floating panels within their viewport inset even when a scrollbar gutter is reserved.

### Coherence pass
- Align focus return, visible values and native form submission across controls. Native reset never calls value-change callbacks or dispatches native input/change events: uncontrolled controls restore defaults, controlled controls retain parent values, and React tracking is resynchronized for the next identical user edit.
- Extend reset, controlled-refusal, nested-popup and displayOnly regression coverage; preserve authored Controls rows and harden typechecking, visual-tooling tests and large component-test reports.

### NumericInput v1.3.2
- Compose cancellable native handlers, preserve fractional drafts for domain validation, report clamped commits and restore controlled/reset authority without losing the next edit.

### Rating v1.3.1
- Suppress reset-driven native events and keep native tracking aligned with silent rating restoration; retain noninteractive displayOnly summaries.

### Checkbox v1.2.2
- Restore native checked state and React change tracking silently after form reset, including controlled and mixed values.

### Textarea v1.0.4
- Keep parent-owned text authoritative after reset and resynchronize React tracking without callbacks or native events.

### Input v1.1.2
- Preserve controlled native values on reset and resynchronize React tracking so the next identical edit notifies once.

### FormTextarea v1.1.3
- Inherit silent text restoration and post-reset React change tracking from Textarea.

### FormCheckbox v1.3.1
- Resynchronize native checked state and React tracking after silent reset through the shared choice lifecycle.

### FormNumericInput v1.2.2
- Inherit numeric draft, clamped-commit and silent-reset coherence, including native onChange after repeated edits.

### Slider v1.4.1
- Suppress reset-driven native input events while restoring defaults or parent-owned thumb values silently.

### RadioCard v1.1.3
- Inherit silent native radio reset and React tracker reconciliation from the shared radio machine.

### DatePicker v1.3.3
- Restore focus after keyboard calendar selection inside modal overlays and reconcile refused, blurred or reset segment drafts with authoritative date values.

### Drawer v1.0.4
- Preserve focus already inside nested popups during deferred trap activation and restore the opener after content and focus-trap teardown.

### Combobox v1.6.1
- Keep visible labels, selected-option ARIA and submitted keys aligned after refused selection, collection changes and silent reset while preserving active search drafts.

### Switch v1.2.1
- Keep controlled and uncontrolled reset projections silent and align React tracking for the next real toggle.

### RadioGroup v1.1.3
- Resynchronize native radio tracking after silent reset without duplicate or missing notifications on the next selection.

### FormInput v1.1.4
- Inherit controlled reset authority and React tracker reconciliation from Input without emitting reset callbacks or native events.

### QuantityField v1.0.2
- Preserve fractional quantity drafts for application integer validation and inherit authoritative, silent numeric resets.

### Select v1.3.1
- Restore native form defaults silently without dispatching change events; keep controlled selection authoritative.

### SearchSuggestions v1.0.1
- Inherit coherent query, selected-label and submitted-value restoration from Combobox without reset notifications.

### Wave 4 shared foundations and integration
- Consolidate native form ownership, inherited disabling, cancellation-safe resets, choice event/ref composition and modal-aware portal ownership into shared internal modules without adding public helper exports.
- Integrate cross-control native form and nested-overlay regression stories, maintained browser matrices, popup clipping checks and commerce workflow examples; document responsive compound-member contracts and complete public-import examples.

### Wave 4 documentation and tooling
- Render safe semantic changelog history with unique anchors and compact navigation; align shared gallery spacing and consumer/contributor guidance.
- Validate portable skill prerequisites, bundled resources, copied-plugin usage and public API examples; synchronize the canonical and generated skill bundle.
- Harden Figma token normalization, color validation and all-brand write safety; align canonical border-width utility validation, regenerate scheme scopes and consolidate source-linked Figma handoffs.

### Checkbox v1.2.1
- Internalize choice helpers and share native form lifecycles while preserving controlled and mixed state, React change tracking, silent resets and ref cleanup.

### LinkButton v1.2.1
- Preserve caller aria-disabled unless the disabled prop is authoritative.

### NumericInput v1.3.1
- Track actual owner-form resets, keep controlled values authoritative, restore defaults silently and compose cancellable native input handlers.

### Rating v1.3.0
- Add displayOnly aggregate summaries without form values or read-only tab stops; share inherited disabling and silent, constraint-normalized resets.

### Tooltip v1.1.1
- Use centralized internal modal-aware portal ownership without depending on Dialog.

### Carousel v1.3.3
- Compose shared image fallback while preserving image overrides and applying object-fit to the actual image.

### CascadeSelect v1.1.2
- Share inherited disabling, cancellation-safe owner-form resets and modal-aware popup portals.

### ColorSelect v1.1.2
- Share native disabled inheritance and recover focus among surviving choices or a named group fallback.

### Combobox v1.6.0
- Add defaultInputValue restoration; share native form lifecycles and modal-aware portals while preserving authoritative selection labels, query state and silent resets.

### DatePicker v1.3.2
- Share owner-form reset and disabled lifecycles, restore date/time/range defaults silently, discard popup drafts and use modal-aware portals.

### Dialog v1.2.1
- Move modal ownership and portal infrastructure into shared internals; cover nested control popups and supported inline rendering.

### Drawer v1.0.3
- Use internal modal-container ownership without depending on Dialog; document public anatomy and verify dismissal and focus return.

### FileUpload v1.1.2
- Share owner-form subscriptions, restore default FileList projections even while disabled or read-only, preserve controlled files and cancel accepted-reset transforms.

### FormCheckbox v1.3.0
- Expose native input refs and inputProps with cancellable event composition, explicit naming and merged descriptions; keep native resets silent and controlled state authoritative.

### Menu v1.3.1
- Use centralized internal overlay portals; keep long-label menus shrinkable and cover enlarged-text keyboard navigation and focus return.

### Pagination v1.1.2
- Own navigation typography, current-page emphasis and pressed feedback independently of Button defaults; provide a complete controlled public example.

### PhoneInput v1.1.2
- Share cancellation-safe, reassociation-aware native owner-form reset tracking while preserving controlled authority and country-selection suppression.

### Popover v1.1.1
- Use centralized internal modal-aware portal and container helpers; clarify floating-surface template controls.

### ProductCard v1.3.1
- Compose native and adapter media through ImageWithFallback and use displayOnly aggregate ratings without read-only tab stops.

### RadioCard v1.1.2
- Share reentrant silent-reset suppression and preserve cancellable activation, explicit group naming and consistent arrow-key wrapping.

### RadioGroup v1.1.2
- Preserve observational handlers and canceled activation, restore native checked state silently and keep arrow-key wrapping consistent across browsers.

### SearchForm v1.1.1
- Follow actual input form ownership for cancellation-safe query restoration and inherited disabling.

### Select v1.3.0
- Add inline Positioner rendering through portalled; share disabled/reset lifecycles and modal-aware portals, honor accessible names and reserve outlines for keyboard focus.

### Slider v1.4.0
- Add external form ownership and indexed thumb refs/focus events; share inherited disabling and deferred silent resets, and wrap label/value content.

### Switch v1.2.0
- Expose native input refs and inputProps with cancellable event composition, explicit naming and merged descriptions; keep accepted native resets silent and controlled state authoritative.

### Tabs v1.2.1
- Isolate trigger typography and pressed feedback from Button defaults while preserving selected emphasis; publish complete compound-member contracts.

### Toast v1.1.2
- Subscribe to centralized active-modal ownership for notification hosting without importing Dialog internals.

### VerticalNavigation v1.1.1
- Own link and disclosure styling independently of Button while preserving current-path emphasis; document public root metadata and controlled usage.

### Gallery v1.1.0
- Expose native refs with scrolling-ref cleanup, compose decorative thumbnails through shared fallback and always expose configured autoplay pause/restart controls.

### Wave 3 foundations and tooling
- Preserve requested themes, first paint and live OS/brand changes; improve contrast, focus, pressed states, scoped aliases and cancellable native form reset infrastructure.
- Validate active token graphs and executable utility usage; publish Tailwind utility discovery and selective React client boundaries. Require immutable-commit quality gates, exact reviewed visual baselines, and enforcing accessibility calibration. Improve standalone Docs themes, keyboard table scrolling, Controls, installation guidance and regression tooling.

### Wave 3 reference pages
- Repair responsive navigation and checkout, persisted catalog URLs, order accounting, shipping/payment validation, CMS/media/email/cart-sharing drafts and CRUD focus. Keep mobile matrices, variable references and media metadata locally contained.

### Accordion v1.2.0
- Keep long titles shrinkable with nonshrinking indicators; expose headingLevel on the template and correct Docs icon choices.

### ActionIcon v1.1.2
- Use a contrast-safe danger pressed pair and correct tone guidance and fixed-gallery Controls.

### Badge v1.1.0
- Support React 19 span refs for ordinary and dynamic badges; disable ineffective fixed-gallery Controls.

### Breadcrumb v1.0.4
- Inherit trail typography unless explicitly overridden and wrap long labels within bounded containers.

### Button v0.6.0
- Keep pending actions focusable with activation/submission guards, preserve native disabling, allow wrapped labels to grow, and add an internal composition styling opt-out.

### Carousel v1.3.2
- Observe keyed slides, isolate widget/editing keys, preserve interactive focus, and move outgoing-slide focus before inert. Always expose autoplay pause/start controls and preserve configured timing across reduced-motion suppression and explicit restart.

### CascadeSelect v1.1.1
- Reconcile paths, current nodes and highlights; complete read-only and linked-error behavior. Restore eligible defaults on uncancelled owner-form reset, including external forms, and document canonical sizes.

### Chart v1.2.0
- Add formatted dataset disclosure, empty/invalid-data feedback, stable seriesDomain colors, non-color line patterns, singleton markers, readable labels and Escape tooltip dismissal; normalize numeric polar domains across filtering.

### Checkbox v1.2.0
- Add canonical sm/md/lg sizing with md as the default, increasing default geometry from 16px to 24px; preserve authoritative mixed state after rejected activation.

### ColorSelect v1.1.1
- Preserve exact swatch fills in normal and forced colors; wrap captions and separate counts without clipping names.

### Combobox v1.5.0
- Add focusable refs, inputProps and root DOM passthrough, correctly typed array callbacks, and accessible per-selection removal; forward external form ownership to all submitted selections.

### DataTable v1.4.0
- Add unknown-total paging and localized status/validation labels; repair leaf widths, measured frozen offsets, virtual rows, detail/footer sequencing, async saves, DST-safe date filters, selection eligibility and RTL resizing. Correct empty server summaries, preserve busy pager focus, and resize from rendered widths.

### DatePicker v1.3.1
- Use timezone-consistent date-only calendar coordinates and bounds, preserve serialized values until confirmation, validate required/available commits, and handle inherited disabling, RTL, localized digits, React 19 ref cleanup and unique calendar identities.

### Dialog v1.2.0
- Expose shared modal-owned portal integration, align nested modal elevation, and bound long content while keeping dismissal and actions reachable.

### Drawer v1.0.2
- Keep partial-detent viewports and pinned footers usable, own descendant popups only while modal/open, and preserve touch-pointer interactions.

### FacetFilterPanel v1.2.0
- Add fallbackFocusEl and restore focus after controlled chip removal/reset; clarify filter ownership and pending/count semantics, and make rejected-dismissal examples recoverable.

### FileUpload v1.1.1
- Submit only committed files, coordinate async capacity/replacement, cancel stale batches at accepted clear/reset boundaries, preserve callback snapshots, and expose recoverable processing feedback; prevented resets retain pending transformations.

### FormCheckbox v1.2.1
- Keep native checked/mixed state authoritative after rejection and deferred or cancelled resets; stretch wrapping rich labels so counts remain aligned.

### FormErrorSummary v1.2.0
- Reveal native/custom hidden targets before focus, add async revealField support, preserve post-focus notification, and wrap long validation instructions.

### FormNumericInput v1.2.1
- Forward success/warning/error presentation into the compound numeric control.

### Gallery v1.0.4
- Keep active thumbnails visible, enforce single-image carousel pages, normalize fractional/nonfinite indexes, and repair compound usage guidance.

### Header v1.2.0
- Forward Hamburger button props, labels, handlers and refs; reconcile mobile-menu state and restore focus when transitioning to desktop.

### Icon v1.2.0
- Accept React 19 span refs, preserve system-color glyph paint, and use reduced-motion-safe CSS loading animation.

### Image v1.2.0
- Add adapter-aware refs and opt-in ImageWithFallback with neutral loading/error states, composed callbacks and source recovery; keep Image unwrapped. Reserve resilient media geometry from valid intrinsic dimensions and aspect overrides independently of delayed requests.

### Link v1.2.0
- Expose native and adapter-specific React 19 ref contracts without manufacturing ref support.

### LinkButton v1.2.0
- Derive refs from the selected adapter, keep disabled replacement spans out of adapter refs, and support independent internal composition styling.

### Menu v1.3.0
- Add native navigation items and disabled checkable options, inherit submenu policies, restore contextual focus, wrap long labels, and portal inside modal scopes.

### NumericInput v1.3.0
- Add success/warning/error validation presentation and render nonfinite numeric values as empty without changing legacy numeric callbacks; document string drafts and mobile-friendly callback contracts.

### Pagination v1.1.1
- Keep minimal selection visible, safely reconcile empty/shrinking collections and controlled corrections, preserve native modified/new-context links, and use RTL-aware glyphs.

### PhoneInput v1.1.1
- Preserve middle-edit positions and IME composition, synchronize native owner-form reset, retain consumer ref cleanup, and keep interaction surfaces and metadata readable.

### Popover v1.1.0
- Add explicit alternative template naming and useful untitled fallbacks; preserve close labels/sizes, own descendant portals, and bound scrolling inside persistent close/arrow chrome.

### ProductCard v1.3.0
- Preserve required image/adapter props and native refs; inherit Button loading/events/accessibility, forward complete badges, and add heading-contained native/router links with localized original/current price semantics.

### RadioCard v1.1.1
- Share corrected native radio/reset ownership, recover focus when cards disappear or disable, and provide a visible group fallback.

### RadioGroup v1.1.1
- Restore rejected native selections, follow actual form ownership during reset, and recover invalidated focused choices without changing selection.

### Rating v1.2.1
- Route accessible labels correctly, normalize scale/precision/reset targets, preserve fractional averages, and recover focus when stars disappear.

### Select v1.2.1
- Reconcile authoritative collections, prevent native fallback submission, compose cancellable consumer handlers, reserve logical clear-action space, and clarify template helper/trigger/indicator contracts.

### Skeleton v1.0.5
- Isolate loading descendants from interaction, withhold eventual Rectangle children, and give visible shapes one animation owner with local reduced-motion overrides.

### Slider v1.3.0
- Expose formatted per-thumb accessible values through getAriaValueText; preserve fractional step grids and effective native fieldset disabling, including first-legend exemptions and cancelled reset handling.

### StatusText v1.1.1
- Consume public line-height aliases directly while preserving first-line icon alignment and safe wrapping.

### Steps v1.2.0
- Forward complete machine options, reconcile dynamic counts/indices and bounded progress, use ordered workflow list semantics and matching refs, and focus accepted navigation destinations.

### Switch v1.1.1
- Repair rejected-change and imperative-reset synchronization; improve unchecked/invalid thumb contrast, forced-color boundaries and enlarged-label reflow.

### Table v1.3.1
- Isolate internal stacking and composite frozen-first-cell stripe, hover and selection surfaces without making ordinary body cells opaque.

### Tabs v1.2.0
- Add template tablistProps, recover dynamic enabled collections and focus without taking controlled ownership, compose handlers, scroll triggers locally, and keep vertical rails and long RTL labels contained.

### Toast v1.1.1
- Keep a stable manual top-layer notification host inside the active modal without restarting actors; preserve viewport-relative positioning and focus membership in partial Drawers, and synchronize timer demos with dismissal.

### Tooltip v1.1.0
- Forward the full Zag and positioning API, support custom portal roots, preserve content IDs and roles, and dismiss only the hint on Escape while yielding to unrelated focused popups and supporting shadow-root lookup.

### Tour v1.0.7
- Scroll long descriptions independently so titles, progress, close controls and actions remain reachable on mobile.

### TreeView v1.1.0
- Separate disclosure and eligible selection, add persistent selected styling and 24px disclosure targets, use constant logical indentation, and recover visible focus; disabled branches consistently disable descendants without mutating caller data.

### ActionIcon v1.1.1
- Disabled actions suppress hover/pressed treatments; added complete public stories and documented embedded hit-area sizing.

### Breadcrumb v1.0.3
- Preserve the explicitly current location before collapsing the path; normalize collapse limits and retain canonical ancestor-link typography.

### Button v0.5.0
- Readable borderless interactions, shared disabled styling, explicit action-button default type, loading busy state, inherited icon sizing and corrected treatment documentation.
- Make Playground responsive, including block-button demonstrations.

### Carousel v1.3.1
- Render template indicators from actual snap pages, including multi-slide layouts; preserve the existing compound navigation API.

### Chart v1.1.1
- Inspection tooltip adopts the shared opaque popup surface and managed elevation, overriding upstream inline styling.

### Checkbox v1.1.0
- Block native read-only pointer/Space toggles without disabling focus.
- Document behavioral native read-only support.
- Read-only checkboxes no longer invoke onChange or mutate controlled application state through activation.

### ColorSelect v1.1.0
- Add accessible group labels, roving radio focus, RTL-aware navigation, non-submitting buttons, read-only/validation support, working canonical sizes and contrast-safe selection badges.
- Resolve swatch caption, count and icon font sizes explicitly from component typography tokens.

### Combobox v1.4.0
- Restore keyboard focus rings, submit actual selected values, expose multiple selected labels, merge caller descriptions and suppress read-only mutation affordances/opening.
- Cancel selection-mode search drafts on read-only transitions, restore committed labels, validate required selections independently of query text, and inherit size-aware label typography.

### DataTable v1.3.0
- Add keyboard resizing/reset, contrasting loading rows, accessible scroll regions and hidden virtual spacers; order edit actions consistently.
- Accessible sized validation, minimum readable editor widths, canonical boolean sizing, and container-responsive action pinning; regression stories and usage prose updated.

### DatePicker v1.3.0
- Adopt compound feedback, shared control heights/popup layering and read-only draft cancellation; use secondary Cancel.
- Restore calendar focus to a surviving date segment when read-only closes the popup.

### FacetFilterPanel v1.1.0
- Give range thumbs distinct accessible names and propagate control sizes/read-only state.

### FileUpload v1.1.0
- Preserve focus after file deletion; add canonical sizing, inspectable read-only behavior and compound StatusText feedback.
- Cancel stale asynchronous processing at the commit boundary and synchronize preloaded selections with native submission.

### Footer v1.1.0
- Forward DOM props and improve semantic sections, readable hover states and narrow-screen layout.

### FormCheckbox v1.2.0
- Fix mixed/disabled visuals, scaled helper alignment and error ARIA.
- Add read-only foreground and scaled box/helper-offset aliases.
- Add canonical sizing, actionable feedback and behavioral regressions.
- Document mixed-state, sizing and feedback behavior.
- Mixed selection now initializes and synchronizes native indeterminate and accessible mixed state.

### FormErrorSummary v1.1.0
- Support documented ref focus, accessible heading association and real focus-moving field links.

### FormInput v1.1.3
- Keep padding size-driven and unify standard/Raw feedback association, icons and error-reference cleanup.
- Keep caller-owned error associations when wrapper validation clears; add lifecycle regressions and usage guidance.

### FormNumericInput v1.2.0
- Make IDs optional, merge helper descriptions onto the input, associate errors and preserve validation icons.
- Keep caller-owned error associations, remove fixed story IDs, hide internal controls, and add lifecycle regressions.

### FormTextarea v1.1.2
- Unify standard/Raw StatusText feedback with merged descriptions, stable IDs and error-reference cleanup; document native readOnly.
- Keep caller-owned error associations when wrapper validation clears; add lifecycle regressions and usage guidance.

### Gallery v1.0.3
- Name carousel regions and restore unitless inactive/hover/current thumbnail brightness; document the compound API correctly.

### Header v1.1.0
- Fix container-responsive navigation, mobile menu relationships, Escape dismissal and focus restoration.
- Current destination links expose aria-current=page.

### Hotkeys v1.1.0
- Added canonical display sizes, working size controls, usage guidance and a Playwright sizing regression.

### Icon v1.1.2
- Meaningful primary/status colors consume contrast-safe foreground aliases; preserved the existing gallery and documented decorative size compatibility.
- Document the canonical sm/md/lg story matrix separately from supported legacy sizes.

### Input v1.1.1
- Respect hideSearchClear=false without leaking a DOM prop; generate missing IDs and apply focusable, full-contrast read-only styling. Refresh stories and usage guidance.
- Wire component-specific read-only foreground/background overrides; normalize story formatting.

### Label v1.0.1
- Correct weight namespace, accessible required alternative, React 19 ref typing, canonical size/state stories and updated usage guidance.

### Link v1.1.0
- Added underlined, readable navigation styling, focus treatment and canonical text sizing with inherited-size compatibility.

### LinkButton v1.1.0
- Default md sizing and static disabled navigation placeholders, including routing-adapter safety and complete public stories.

### Menu v1.2.0
- Fixed disabled submenus, context activation, custom triggers, className, RTL nesting, viewport collision handling and popup elevation; rebuilt focused interactive documentation.

### NumericInput v1.2.0
- Support zero precision, adequately sized adjacent steppers, comprehensive read-only mutation guards and registered compound StatusText feedback.
- Preserve caller error references, forward inherited invalid state, support component-specific read-only colors, and repair numeric Playground controls and instance IDs.

### Pagination v1.1.0
- Unavailable links use static placeholders; canonical heights, responsive wrapping and stateful non-navigating stories now agree with regression tests.
- Align canonical page-control typography with Button, Menu and Tabs.

### PhoneInput v1.1.0
- Compact country prefixes and adopt unique registered error feedback with guarded read-only mutation paths.
- Provide a valid country label target and preserve the read-only text-selection cursor.

### Popover v1.0.3
- Shared popup layering, available-space bounds, preserved typography, canonical stories and local save/cancel behavior.
- Name custom-trigger and other heading-free example dialogs; cover accessible names, dismissal and restored focus.

### PriceBlock v1.0.1
- Normalize implementation formatting without changing the pricing API; document intent, display-state controls and alternatives.

### ProductCard v1.2.0
- Make aggregate ratings static, stabilize catalog geometry, preserve action-button attributes and correct pressed colors; keep templates and local demo actions in sync.

### QuantityField v1.0.1
- Link native input errors and remove read-only stepping affordances.
- Preserve the text-selection cursor for enabled read-only numeric values.

### RadioCard v1.1.0
- Expose rich content, register descriptions/addons and fix read-only inputs.
- Strengthen indicators, readable addon pairings and read-only content.
- Use realistic delivery cards, canonical matrices and lifecycle regressions.
- Document read-only operation and accessible compound content.
- Restore readable checked-outline hover descriptions/addons and accessible Business solid-addon text.

### RadioGroup v1.1.0
- Associate compound messages and preserve read-only focus/submission.
- Add contrasting checked foreground and border pairings.
- Standardize delivery examples and test feedback registration/cleanup.
- Document associated descriptions and immutable read-only groups.
- Use an accessible on-primary solid indicator pairing, including Business hover states.

### Rating v1.2.0
- Add accessible targets, feedback, numeric values and named-image display.
- Provide contrasting outlined/filled/half glyphs and target/focus tokens.
- Add complete documentation and interactive/read-only regressions.
- Document feedback API, targets and focusable read-only image semantics.
- Show zero for untouched ratings, announce precise half scores, respect disabled foregrounds, and wrap long scales within narrow layouts.

### SearchForm v1.1.0
- Preserve visible-label naming, restore focus after clearing, fix standalone input corners and add compound validation/read-only/disabled contracts.
- Reserve size-aware clear-action space instead of a generic 120px button gutter, preserving usable query width on narrow screens.

### Select v1.2.0
- Fix label-based typeahead, Zag prop forwarding, composed handlers, multi-value/static display, registered feedback, immutable read-only behavior and popup layering.

### Skeleton v1.0.4
- Align loading-region documentation/tests, consolidate canonical sizes, and normalize line counts.
- Make visibility-control regressions dynamic and constrain the product loading demo on mobile.

### Slider v1.2.0
- Fix value text for single/multiple thumbs, invalid-thumb ARIA, marker spacing, explicit thumb names and size/read-only consistency.

### Steps v1.1.0
- Added correctable, guarded validation with associated StatusText and a regression proving recovery; standardized size and workflow guidance.
- Adapt workflow lists, panels, navigation and progress tracks to narrow screens without changing step semantics.

### Switch v1.1.0
- Correct switch semantics, sizes, feedback and read-only behavior.
- Derive size-aware thumb travel and distinguish disabled/read-only thumbs.
- Replace inconsistent demos with controlled documentation and regressions.
- Document sizes, switch semantics and feedback/read-only contracts.

### Table v1.3.0
- Support keyboard row activation, visible focus and standard React object/callback refs.
- Selected rows expose accessible selection state; keyboard demonstration documentation and assertions corrected.

### Tabs v1.1.0
- Constrained narrow layouts, introduced scroll-safe focus treatment, corrected disabled attributes and replaced nested-tab documentation with sectioned content.
- Keep selected-tab indicators visible inside scrolling lists, provide a default underline cue, and preserve leading-tab access under center/end alignment.

### Textarea v1.0.3
- Unify native readOnly and legacy readonly behavior and styling; generate missing IDs and refresh accessible multiline examples.
- Wire component-specific read-only foreground/background overrides; normalize story formatting.

### Toast v1.1.0
- Added isolated stores/providers and unique regions; fixed loading titles, actions, closability, readable surfaces, multiline alignment and responsive width.
- Prevent Escape dismissal of non-closable notifications while retaining normal dismissal after completion.

### Tooltip v1.0.2
- Wrap long references within floating bounds, retain keyboard descriptions and replace interactive tooltip examples with appropriate guidance.

### TotalsSummary v1.0.1
- Normalize implementation token-class ordering without changing the summary API; constrain mobile examples, provide local recap actions and clarify prepared totals.

### Tour v1.0.6
- Simplify action-trigger accessible-name fallback without changing its result or public API.

### TreeView v1.0.3
- Split machine and DOM props so custom IDs and initial focus work without attribute leakage.
- Responsive comparison/activity examples and readable associated custom label.

### VerticalNavigation v1.1.0
- Add canonical lg navigation with shared control heights, typography, spacing and icons; show exactly one Small/Medium/Large comparison and retain keyboard disclosure/current-page behavior.

### Shared foundations — wave 2
- Keep read-only text cursors selectable in every state and non-text cursors neutral; improve Business solid-primary contrast and responsive detail/Docs layouts.
- Resolve nested scheme aliases, readable links, feedback hierarchy and corrected motion units through a documented Figma bridge; validate tokens independently of working directory.
- Complete accessible, responsive component documentation and safe local page workflows across the kit.

### Checkbox v1.0.4
- Fix mixed-state dash rendering, checked-mask conflicts and disabled styling; retain visible keyboard focus and distinguish rounded checkboxes from radios.
- Complete accessible Docs and selection examples, with one live Playground synchronized to Controls.

### Icon v1.1.1
- Route explicit colors through component tokens; add a searchable named gallery, full size scale and accessible examples with a recognizable Home default.

### Image v1.1.0
- Default to block display, container-bounded width and cover fitting; document sizing, aspect ratios, shapes and framework image adapters.

### StatusText v1.1.0
- Show decorative error, warning and success icons by default; align icons to the first line and keep wrapped messages in their own text column.
- Preserve showIcon and align overrides, expose data-status, and demonstrate correctly associated field feedback.

### Accordion v1.1.0
- Separate semibold triggers from inset, regular-weight panel text with comfortable spacing and dividers across sizes and themes.
- Give triggers their own styling and focus treatment, correct disabled states, and document realistic keyboard-operable compositions.

### AvailabilityStatus v1.0.1
- Clarify visible settled labels versus screen-reader-only loading descriptions; repair all-state Playground controls and retain a separate static gallery. Runtime behavior and the public API are unchanged.

### Breadcrumb v1.0.2
- Use component-owned focus tokens without changing keyboard appearance; keep demo links inside Storybook and clarify hierarchy and current-page examples.

### Carousel v1.3.0
- Add automatic vertical and RTL navigation, visible minimal controls, genuinely disabled boundary and single-page arrows, and hover/focus autoplay pause.
- Place standard vertical navigation beside the clipped slide viewport so short images cannot hide controls; preserve RTL-aware placement and inherited image adapters.
- Improve current-page semantics and indicator focus; make demos responsive, disclose public composition and cover navigation regressions.

### CascadeSelect v1.1.0
- Add numbered, divided hierarchy columns, a persistent expanded-path marker and configurable rootLabel.
- Correct tree relationships, read-only and validation semantics; retain linked helper/error descriptions and scroll active options into view on narrow screens.
- Explain category selection and form validation with realistic, accessible examples.

### Combobox v1.3.5
- Preserve first-character filtering regardless of how the popup opens, and keep rich-option foregrounds readable in selected and highlighted states.
- Expand behavior and contrast regressions, improve responsive documentation, and simplify internal rendering without changing the public API.

### Command v1.1.0
- Add a semibold highlighted-command cue that does not depend on color; explain command palettes and improve action, dialog and shortcut examples.
- Isolate Docs shortcuts to their owning preview so independent palettes do not compete; cover modal accessibility, Save ownership and focus restoration.

### DatePicker v1.2.0
- Allow valid neighboring-month day selection with range-panel navigation while preserving keyboard focus and the correct range endpoint.
- Add wrapping ArrowUp/ArrowDown and Home/End editing to time inputs without changing Confirm/Cancel transactions.
- Use opaque shared popup surfaces, readable selected-day foregrounds and explicit layering; clarify examples and expand calendar/time regressions.

### Dialog v1.1.0
- Add aria-label support, correct centered widths and modeless defaults, and improve viewport gutters, title clearance, typography and elevation.
- Wrap actions on narrow screens and demonstrate safe destructive focus, neutral Cancel actions and working forms; keep Drawer examples in Drawer Docs.

### Drawer v1.0.1
- Wrap footer actions on narrow screens to avoid clipped labels; replace multiple-trigger summaries with validated editable profiles and Save/Cancel feedback.
- Cover persisted saves, cancelled drafts, focus restoration and responsive footer behavior.

### FileUpload v1.0.3
- Correct accessible drop-zone names, Space-key handling and non-clickable group semantics; prevent disabled/read-only hover feedback and improve typography.
- Explain selection versus uploading, document five static states and an interactive selector, and show icon-backed, associated rejection feedback.

### Shared foundations — wave 1
- Distinguish read-only surfaces from disabled fields while preserving focus, text selection and contrast; hide explicitly marked mutation affordances.
- Keep floating panels opaque with shared elevation and readable checked-row foregrounds; distinguish Akros hover from filled selection.
- Stabilize description registration and deduplicate aria-describedby IDs; document canonical control sizes and shared accessibility, popup and Storybook contracts.
- Enable autodocs and component guidance for Menu and Comprehensive Form; improve Accordion, Breadcrumb and Carousel template examples.

### FormInput v1.1.2
- FormInput and FormInputRaw preserve the caller's input className and merge it after their existing responsive padding defaults. The wrapper, generated ids, labels, and validation associations are unchanged. Fixes #641.

### Checkbox v1.0.3
- The normal border uses the existing --border-width-checkbox token. Invalid styling still takes precedence through --border-width-validation. Fixes #642.

### FormCheckbox v1.1.3
- The visible control honors --border-width-checkbox, while error validation retains --border-width-validation precedence. Fixes #642.

### Button v0.4.0
- Button and LinkButton use --font-weight-button, aliased to --font-weight-medium by default. Adds independent component weight control without changing the default 500 weight. Implements #643.
- Migration: scopes overriding only --font-weight-medium must now set --font-weight-button there. An inherited alias resolves at its declaration scope. Explicit font classes still override the component default.

### Input v1.1.0
- Input uses independent --font-weight-input and --font-weight-input-placeholder tokens, each defaulting to --font-weight-normal (400). Input-based FormInput and NumericInput inherit them. Implements #643.
- Migration: scopes overriding only --font-weight-normal must now set the component weight tokens there. Input and placeholder weights remain independent.
- New font-weight aliases are code-owned in the component CSS pending shared Figma library synchronization. Generated Figma token files are unchanged.

### Accordion v1.0.3
- \`Accordion.Header\` props are typed as \`<h3>\` attributes (they were \`<header>\`), matching the heading it renders. No runtime change.

### NumericInput v1.1.3
- \`NumericInputTemplateProps\` is a type alias and documents \`aria-label\` / \`aria-labelledby\`. No runtime change.

### Textarea v1.0.2
- \`readonly\` keeps the muted surface and border but uses the normal text colour; it borrowed the disabled text colour (4.39 : 1 on the read-only fill, axe \`color-contrast\` in every brand). Read-only content is meant to be read, unlike disabled.

### Rating v1.1.1
- A read-only rating keeps its hidden input, so a \`name\`d rating still submits with its form (the v1.1.0 display mode had dropped it). It adds no tab stop.

### Carousel v1.2.3
- Previous / next ActionIcons keep the carousel trigger colour tokens (\`--color-carousel-trigger-bg|fg-base|hover\`), so apps that restyle the arrows (white circles over banners in herbatika) work again. The defaults match ActionIcon's neutral tone.

### Button v0.3.4
- \`lg\` uses the shared control height \`h-form-control-lg\` (56 px) like \`sm\` / \`md\` already did. It was padding-derived (56 px in code, 57.5 px in Figma). Buttons and form controls now share one 32 / 44 / 56 scale.

### Select v1.1.4
- \`lg\` trigger uses \`h-form-control-lg\` (56 px, was 60 px) and \`rounded-select-lg\`; \`xs\` trigger uses \`h-form-control-sm\` and \`rounded-select-sm\`, the same 32 px as \`sm\` (was 30 px). Small trigger text is 16 px like every other small field (token export 2026-10-09).

### Combobox v1.3.4
- \`lg\` control uses \`h-form-control-lg\` (56 px, was 60 px) and \`rounded-combobox-lg\`.

### CascadeSelect v1.0.3
- \`xs\` trigger is 32 px like \`sm\` (was 36 px); \`lg\` trigger uses \`h-form-control-lg\` and the new \`rounded-cascade-select-lg\`.

### Tabs v1.0.3
- Triggers use the control heights \`h-form-control-{sm,md,lg}\` (32 / 44 / 56 px, were 33 / 50 / 68 px), matching the Figma Tabs.Trigger set.

### Rating v1.1.0
- A \`readOnly\` rating is a display, not a control: it renders one \`role="img"\` named "<labelText>: 4.5 out of 5" with no radios and no tab stop. Before, Zag kept a focusable radiogroup of 20 px stars (axe \`target-size\`). The look is unchanged; interactive and disabled ratings are unchanged.

### ProductCard v1.1.0
- \`ProductCard.Name\` takes \`as\` (\`h2\`–\`h6\`, default \`h3\`) and \`ProductCardTemplate\` takes \`nameAs\`, so card names can follow the page outline (axe \`heading-order\` on the category page, where cards sat directly under the \`h1\`).

### Slider v1.1.0
- New \`aria-label\` prop (\`string[]\`, one per thumb) for sliders without a visible \`label\`. Before, such thumbs had no accessible name (axe \`aria-input-field-name\`, serious).

### Tabs v1.0.2
- A trigger only sets \`aria-controls\` when its \`Tabs.Content\` is mounted, so a tab strip used as sub-navigation without panels no longer references missing ids (axe \`aria-valid-attr-value\`, critical).

### Steps v1.0.5
- A trigger only sets \`aria-controls\` when its \`Steps.Content\` is mounted. Steps used as a progress indicator (no content panels) pointed every trigger at a missing id (axe \`aria-valid-attr-value\`, critical).

### Footer v1.0.3
- \`Footer.List\` wraps every child that is not already an \`<li>\` in one, so the documented \`<Footer.List><Footer.Link /></Footer.List>\` is valid list markup (axe \`list\`, serious). Explicit \`<li>\` children are left as they are. Fragments are flattened first, so items grouped in a fragment stay separate entries.

### DataTable v1.2.4
- The built-in row-reorder column and the single-select / capped selection column (no select-all checkbox) now have a screen-reader-only header, "Reorder rows" / "Select rows" (axe \`empty-table-header\`). Localise them with \`translations.reorderLabel\` and \`translations.selectionLabel\`.

### SearchForm v1.0.2
- An icon-only \`SearchForm.Button\` (no children) defaults to \`aria-label="Search"\`; pass your own \`aria-label\` to localise it. Before, it was an unnamed submit button (axe \`button-name\`, critical).

### Pagination v1.0.3
- A caller's \`aria-label\` now names the \`<nav>\`; Zag's default root label used to overwrite it, so two paginations on one page had the same name (axe \`landmark-unique\`).

### FormInput v1.1.1
- \`id\` is optional: when it is omitted or empty a generated id links the label to the input. Before, the label pointed at nothing (axe \`label-title-only\` on the Playground story).

### FormTextarea v1.1.1
- \`id\` is optional: when it is omitted or empty a generated id links the label to the textarea.

### Carousel v1.2.2
- \`autoplay\` no longer starts when the user prefers reduced motion (facelift C11); the autoplay control still starts it on request.

### Chart v1.1.0
- \`animate\` now defaults to false when the user prefers reduced motion (facelift C11). An explicit \`animate\` still wins.

### Footer v1.0.2
- Title and link hovers used \`transition-footer-*\` classes that resolved to no token; they now use \`transition-colors\` with \`motion-reduce:transition-none\` (facelift C11).

### ActionIcon v1.1.0
- The type now requires an accessible name (facelift C10): \`aria-label\` or \`aria-labelledby\`. An unlabelled \`<ActionIcon icon="…" />\` no longer compiles.

### Carousel v1.2.1
- Previous / next / autoplay pass Zag's \`aria-label\` explicitly (Zag's English default as fallback) to satisfy the stricter ActionIcon type. No runtime change.

### Combobox v1.3.3
- The clear trigger passes Zag's \`aria-label\` explicitly (fallback "Clear value") for the stricter ActionIcon type. No runtime change.

### FileUpload v1.0.2
- The item delete trigger passes Zag's \`aria-label\` explicitly (fallback "Delete file <name>") for the stricter ActionIcon type. No runtime change.

### Tour v1.0.5
- The close trigger falls back to "Close tour" when neither the caller nor Zag provides a name (stricter ActionIcon type).

### Icon v1.1.0
- New \`label\` prop (facelift C9): a meaningful standalone icon renders as \`role="img"\` with that accessible name. Without \`label\` the icon stays \`aria-hidden\` as before.

### PhoneInput v1.0.4
- The country trigger (a \`role="combobox"\`, which takes no name from its content) gets a default accessible name, the selected country and its calling code (e.g. \`Czechia (+420)\`) — axe \`button-name\` (critical) on every PhoneInput story (facelift C5). Pass \`aria-label\` or \`aria-labelledby\` on \`PhoneInput.CountryTrigger\` (or \`triggerProps\`) to localise it.

### Select v1.1.3
- \`Select.StatusText\` is linked to the trigger through \`aria-describedby\` while it is mounted (facelift C4), so screen readers read the helper or error text when the trigger is focused. A caller's own \`aria-describedby\` is kept. Several mounted messages (a hint and an error) are all linked, and removing one keeps the others.

### Switch v1.0.1
- \`helpText\` is linked to the switch input through \`aria-describedby\` (facelift C4).

### Slider v1.0.2
- \`helpText\` is linked to each thumb (the focusable \`role="slider"\`) through \`aria-describedby\` (facelift C4).

### RadioGroup v1.0.2
- \`RadioGroup.StatusText\` is linked to the \`radiogroup\` root through \`aria-describedby\` while it is mounted (facelift C4). Several mounted messages (a hint and an error) are all linked, and removing one keeps the others.

### PhoneInput v1.0.3
- \`PhoneInput.StatusText\` is linked to the phone input through \`aria-describedby\` while it is mounted (facelift C4). A caller's own \`aria-describedby\` is kept. Several mounted messages (a hint and an error) are all linked, and removing one keeps the others.

### StatusText v1.0.1
- Validation feedback is announced (facelift C4): \`status="error"\` renders \`role="alert"\`, \`warning\`/\`success\` render \`role="status"\`. Plain helper text has no live role; a \`role\` prop still wins.

### Carousel v1.2.0
- Off-screen slides are \`inert\`, not just \`aria-hidden\`: links or buttons on hidden slides left the tab order (facelift C5, axe \`aria-hidden-focus\`).
- New \`aria-label\` prop names the carousel region; give each carousel on a page its own name (axe \`landmark-unique\`). Stories with several carousels are labelled.

### Steps v1.0.4
- Fixed axe \`aria-required-children\` (critical): Zag's \`role="tablist"\` contained \`div[aria-current]\` items. Items are now \`role="presentation"\` and \`aria-current="step"\` moves to the tab. Separators are \`aria-hidden\`.
- \`Steps.Progress\` has a default accessible name (\`aria-label="Steps progress"\`, overridable) — axe \`aria-progressbar-name\`.

### Steps v1.0.3
- Contrast facelift (Figma 2026-10-08): indicators on the 24 / 32 / 40 px Action Icon scale; current number, complete check and complete title now pass WCAG AA in all six brand/mode combinations (were 1.81 / 2.46 / 2.46 : 1 in light).
- The \`solid\` variant's current title uses the new \`--color-steps-title-fg-solid-current\` (neutral foreground) instead of accent text on the accent tint.

### Carousel v1.1.0
- Prev / next / autoplay are now \`ActionIcon\`s (facelift B9) sized from the carousel \`size\`: \`sm\` 24 px, \`md\` 32 px, \`lg\`/\`full\` 40 px — matching the Figma CarouselControl.
- \`Carousel.Indicator\` is a 24 px target (WCAG 2.2 target size, was 16 px) with an 8 px dot inside; \`children\` still replace the dot. Inactive dots are now visible against the control bar (4.4 : 1 light, was 1 : 1).
- Autoplay keeps an opaque control surface because it sits over the slide image.

### DataTable v1.2.3
- \`tableLayout="fixed"\` now honours declared column widths with enum filters: the filter select no longer reserves a min-width wider than its column (it fills the cell instead), so long option labels cannot stretch the column or overflow into the next one.
- Under \`tableLayout="fixed"\` the built-in actions column is sized to its widest rendered actions cell instead of collapsing to 0 px.
- Akros Orders demo uses the fixed layout, so the shipping / pickup-point column keeps its 280 px at 1440 px instead of sliding under the pinned actions.

### FormNumericInput v1.1.2
- The label is always linked to the input: without an \`id\` the label pointed at nothing while Zag generated its own input id (axe \`label\`, critical). A generated id is now used when none is passed.

### Pagination v1.0.2
- Fixed axe \`aria-prohibited-attr\` on the disabled prev/next triggers: without a page to go to they now render as an \`aria-disabled\` \`<button type="button">\` instead of an \`<a>\` with no \`href\`, so the Zag \`aria-label\` is valid. Also fixes DataTable pagination, which composes Pagination.

### Skeleton v1.0.3
- Fixed axe \`aria-prohibited-attr\`: the root and standalone shapes are now \`role="status"\` (a role that permits \`aria-label\`), shapes inside \`<Skeleton>\` are \`aria-hidden\` so a group announces once, and a consumer-hidden shape (\`aria-hidden\`) gets no status semantics.

### LineItem v1.0.2
- Accept object and callback refs on the removal button after the Button props update.

### LineItem v1.0.1
- Mark the compound row as a client module for Next.js and document client-wrapper composition for read-only recaps.

### LineItem v1.0.0
- Added a compound cart and order row with composable image/title/price/quantity/actions parts, shared read-only/pending guards, product-specific removal labels and compact layout. Requests and inventory rules remain consumer-owned.

### TotalsSummary v1.0.0
- Added prepared label/value rows, notes, discounts, an explicit total and pending feedback. Unresolved fees remain caller-provided text; the component does not calculate totals.

### Checkbox v1.0.2
- Preserve callback ref cleanup with React 19 and current Tailwind utilities.

### NumericInput v1.1.2
- Keep explicit input IDs linked to labels with the current Zag number-input machine and forward template labels to the input.

### Skeleton v1.0.2
- Keep busy placeholders accessible without naming generic wrapper elements.

### Tooltip v1.0.1
- Preserve tooltip descriptions and interaction with the current Zag machine.

### Accordion v1.0.2
- Use a heading for accordion triggers and preserve forwarded heading refs.

### Breadcrumb v1.0.1
- Preserve all compound members in native TypeScript declarations.

### Carousel v1.0.1
- Preserve compound declarations and use current Tailwind scrollbar utilities.

### Chart v1.0.1
- Adapt chart definitions, scales and React imports to TanStack Charts 1.x while preserving Cartesian rendering.

### ColorSelect v1.0.2
- Update types and sizing utilities for the current toolchain.

### Combobox v1.3.2
- Normalize single-value strings for the current Zag machine while retaining multi-value support.

### Dialog v1.0.3
- Use the current Zag dismissal behavior and remove the obsolete Escape workaround.

### FormNumericInput v1.1.1
- Link labels and help text to the actual numeric input ID.

### Menu v1.1.1
- Use current Zag types and adapt navigation callbacks without changing their public shape.

### Pagination v1.0.1
- Mark unavailable pagination links as disabled for assistive technology.

### PhoneInput v1.0.2
- Preserve the Input compound member in native TypeScript declarations.

### Popover v1.0.2
- Keep lazily mounted titles and descriptions linked to content and preserve compound declarations.

### ProductCard v1.0.1
- Preserve Button and Rating compound members in native TypeScript declarations.

### RadioCard v1.0.2
- Preserve compound declarations and recognize compound hidden-input labels.

### RadioGroup v1.0.1
- Preserve compound declarations and recognize compound hidden-input labels.

### SearchForm v1.0.1
- Preserve compound declarations and use the current React submit-event type.

### Select v1.1.2
- Use current Zag types and preserve the StatusText compound declaration.

### Steps v1.0.2
- Keep current-step and progress semantics accessible and preserve compound declarations.

### Tabs v1.0.1
- Update logical positioning utilities and context types for the current toolchain.

### TreeView v1.0.2
- Use current Zag types and logical positioning utilities.

### DataTable v1.2.2
- Adapt row drag-and-drop and table integration to the current dependencies while retaining keyboard interaction.

### Footer v1.0.1
- Preserve Footer compound members in native TypeScript declarations.

### Gallery v1.0.2
- Preserve compound declarations and use current scrollbar utilities.

### Table v1.2.2
- Use current logical positioning utilities for sticky columns.

### Table v1.2.1
- Switched the border between header and cell columns from physical border-r to logical border-e for RTL.

### DataTable v1.2.1
- Switched the sortable header's text-left to the logical text-start for RTL.

### TreeView v1.0.1
- Replaced transition-all with the explicit transition property list to avoid animating unrelated properties.

### Tour v1.0.3
- Replaced outline-none with outline-hidden per the updated focus-ring guideline.

### Slider v1.0.1
- Switched the vertical thumb's physical left offset to the logical start for RTL.

### Select v1.1.1
- Switched text-left to text-start and the clear trigger's physical right offset to logical end for RTL.

### RadioCard v1.0.1
- Switched overflow-hidden to overflow-clip and text-left/text-right to text-start/text-end for RTL.

### Popover v1.0.1
- Replaced outline-none with outline-hidden and switched the close trigger's physical right offset to logical end for RTL.

### FormCheckbox v1.1.2
- Replaced transition-all with the explicit transition property list and switched the indented text's physical pl- offset to logical ps- for RTL.

### FileUpload v1.0.1
- Switched overflow-hidden to overflow-clip on the item preview.

### Dialog v1.0.2
- Switched the close trigger and side-panel borders from physical top/right/left offsets to logical end/start equivalents for RTL.

### CascadeSelect v1.0.2
- Switched text-left to text-start and the trigger icon's physical right offset to logical end for RTL.

### Accordion v1.0.1
- Replaced transition-all with the explicit transition property list and switched the icon's physical pr- offset to logical pe- for RTL.

### Textarea v1.0.1
- Replaced transition-all with the explicit transition property list and added user-invalid styling for native constraint validation once the field has been interacted with.

### Input v1.0.1
- Replaced transition-all with the explicit transition property list and added user-invalid styling for native constraint validation once the field has been interacted with.

### Checkbox v1.0.1
- Replaced transition-all with the explicit transition property list to avoid animating unrelated properties.

### Button v0.3.3
- Replaced transition-all with the explicit transition property list, added motion-safe active press feedback, and switched the loading spinner's physical mr- offset to logical me- for RTL.

### Gallery v1.0.1
- Added min-w-0 to the thumbnail trigger's overflow-clip class so it keeps clipping content correctly now that overflow-clip no longer creates a scroll container.

### Toast v1.0.1
- Added min-w-0 to the root's overflow-clip class so the toast keeps clipping content correctly now that overflow-clip no longer creates a scroll container.

### Steps v1.0.1
- Added min-w-0 to the progress track's overflow-clip class so it keeps clipping content correctly now that overflow-clip no longer creates a scroll container.

### PhoneInput v1.0.1
- Added min-w-0 to the control's overflow-clip class so it keeps clipping content correctly now that overflow-clip no longer creates a scroll container.

### DatePicker v1.1.2
- Switched the month panel and time group's divider border from physical border-l to logical border-s so it follows the ps- padding in RTL.

### Combobox v1.3.1
- Added min-w-0 to the control's overflow-clip class so it keeps clipping content correctly now that overflow-clip no longer creates a scroll container.

### ColorSelect v1.0.1
- Added min-w-0 to the atom's overflow-clip class so it keeps clipping content correctly now that overflow-clip no longer creates a scroll container.

### Skeleton v1.0.1
- Added min-w-0 to the root's overflow-clip class so it keeps clipping content correctly now that overflow-clip no longer creates a scroll container.

### NumericInput v1.1.1
- Added min-w-0 to the container's overflow-clip class so it keeps clipping content correctly now that overflow-clip no longer creates a scroll container.

### QuantityField v1.0.0
- Added a controlled quantity molecule with a visible unit, linked label/helper/error text and localized pending feedback over NumericInput. Validation, persistence and explicit removal stay consumer-owned.
- autoFocus, aria-label and aria-labelledby reach the editable input; native label and description bindings remain intact.
- Manual stories cover drafts, bounds, compact layouts and pending/read-only states; behavior regressions run separately.
- Figma authoring and Code Connect mapping are deferred; the handoff documents API and token ownership.

### NumericInput v1.1.0
- Synchronize input focus established during mount with Zag so autoFocus supports typing and keyboard stepping immediately.
- Added string value/defaultValue and Zag value/change/commit/invalid/focus callbacks while preserving numeric values, numeric onChange and legacy defaults.
- Route declared machine options to Zag and keep explicit controlled parent updates authoritative. NumericInputTemplate shares the compatible draft contract.

### AvailabilityStatus v1.0.0
- New props-driven availability molecule with explicit available, limited, preorder, unavailable, unknown and pending branches, app-owned localized copy, distinct decorative icons and optional delivery detail. Figma and Code Connect are deferred.
- Pending copy is readable by screen readers while the decorative skeleton is hidden; no implicit live region is added.

### PriceBlock v1.0.0
- New props-driven price molecule for known, from, discounted, on-request and pending presentation. It preserves semantic original-price markup, separate tax/unit metadata and app-owned formatting without pricing logic. Figma and Code Connect are deferred.
- Pending copy is readable by screen readers while the decorative skeleton is hidden; no implicit live region is added.
- Discounted prices require localized originalSrLabel copy so screen readers can identify the original amount even when no discount badge is shown.

### SearchSuggestions v1.0.0
- Added a thin grouped catalog-search template over Combobox with rich result content, native links, async states and a separate all-results footer. Data fetching and routing remain consumer-owned.
- Stories are manual examples; keyboard and navigation regressions run separately in Playwright.

### Combobox v1.3.0
- Added Zag item groups, explicit navigation mode, navigation callback and footer/portal options. Selection remains the default.
- Loading/error exclude hidden results from keyboard selection. Rich options retain their label, scalar values are normalized, and help/error text is connected to the input.
- Loading and retry labels are customizable; status and footer controls are outside listbox semantics.
- Input and trigger reference the scrollable listbox; Zag keeps highlighted options visible without moving input focus.
- Group headings and footer spacing follow the shared popup size scale; status text uses a component foreground token.

### FacetFilterPanel v1.0.1
- Newly loaded option groups open by default, and controlled drawer focus returns to the trigger only after the drawer closes.

### FacetFilterPanel v1.0.0
- Added a controlled catalog-facet template with generic option and range groups, active-filter removal, reset, overflow, pending/disabled states, and explicit inline or Dialog drawer presentation.
- Facet calculations, formatting, URL/query synchronization and responsive breakpoint selection remain consumer-owned. Stories are manual; interaction regressions run separately in Playwright.
### VerticalNavigation v1.0.1
- Unify split-row hover and current-page backgrounds across the link and disclosure. Highlight only the chevron on disclosure hover, preserving separate navigation, expansion and keyboard focus.

### VerticalNavigation v1.0.0
- Promote the compact catalog styling to component tokens and unify all stories: smaller section labels, flat subgroups, consistent indentation, optional guides and 280 px standalone examples.
- Accent subgroup surfaces support primary/secondary brand variants independently of the current page; the Akros catalog demonstrates two colored subgroups at 280 px.
- New standalone link-based navigation with Zag disclosure branches, independent subgroup tones, capped indentation for deep hierarchies, controlled expansion, RTL and Drawer/Sidebar composition. Includes usage guidance and behavior tests; Figma/Code Connect mapping is deferred.

### Hotkeys v1.0.2
- Export the Key and Separator compound members in native TypeScript declarations.

### Hotkeys v1.0.1
- Use named token utilities for keycap borders and shortcut-target focus styling while preserving the existing token values.

### Command v1.0.1
- Use a named component utility for the command border width while preserving the existing token value.

### Hotkeys v1.0.0
- New compound shortcut hints with native Zag formatting, independently usable explicit-store registration hooks, current callbacks, optional registration readback and hydration-safe labels.

### Command v1.0.0
- New compound action panel on Zag Combobox with label/keyword filtering, groups, empty and disabled states, repeated activation and existing Dialog composition. Application callbacks can be shared with Hotkeys without a second command registry.

### Tour v1.0.4
- Export the Context and Trigger compound members in native TypeScript declarations.

### Tour v1.0.2
- Keep the start trigger disabled throughout target resolution and wait steps, then enable it after the tour ends. Apply target inert before paint while preserving application ownership. Revalidate Zag 1.43.3 guidance and remove obsolete skip/effect-dismiss adapters.

### Tour v1.0.1
- Preserve application-owned inert state for existing and late targets when a step closes or changes. Tour removes only its own blocking; pre-existing inert and application writes during the tour survive cleanup. Includes browser regressions without public API or visual changes.

### Tour v1.0.0
- New single-machine guided-tour molecule with tooltip, dialog, floating and interactive wait steps; shared Button/ActionIcon controls, component token aliases, focus restoration, RTL navigation and bounded missing-target handling. Includes regression tests and tour-usage guidance. Figma migration and Code Connect are explicitly deferred.

### DatePicker v1.1.1
- Aligned field typography, read-only presentation, placeholder binding, and invalid border/focus behavior with the shared Input and form-control contracts. Calendar headings stay compact while retaining full accessible month labels, and required date segments now expose their ARIA requirement state.

### DatePicker v1.1.0
- Added date and date-time ranges to the existing compound DatePicker: complete typed tuples, indexed start/end segments and form values, coordinated two-month presentation, continuous range states, and one shared timed Cancel/Confirm transaction. Updated the paired date-picker-usage skill and component metadata.

### CascadeSelect v1.0.1
- Status text now automatically describes the interactive trigger, preserving custom status IDs and existing descriptions and removing the automatic reference when unmounted.

### CascadeSelect v1.0.0
- New Zag.js cascade-select molecule with a compound API, hierarchical path values, parent and multiple selection, and Select-aliased trigger tokens backed by the shared popup surface.

### FileUpload v1.0.0
- New Zag.js-backed FileUpload molecule for selecting, validating, previewing, and removing local accepted and rejected File objects through a compound API, native picker/form behavior, drag and drop, controlled state, clipboard input, directory selection, and media capture. It intentionally provides no network transport, progress, retry, or visual size/variant API.

### Drawer v1.0.0
- New Zag.js-powered Drawer molecule with compound anatomy, logical placements, controlled and uncontrolled state, snap points, dragging, edge swipes, multiple triggers, custom portals, non-modal behavior, presence-aware motion, and nested drawer stacks.

### Sidebar v1.0.0
- New responsive Sidebar organism with independent logical start/end state, Root-owned collapse policies, mobile Drawer composition, two-pane nested navigation, right and dual sidebars, sticky-header offsets, and breakpoint-safe focus transfer.

### Dialog v1.0.1
- Controlled dialogs now close on Escape immediately after their content mounts, including before Zag's deferred dismissable listener is registered.

### Button v0.3.2
- Introduced per-component versioning: the component now carries \`@componentVersion\` + \`@skill\`,
  paired 1:1 with the \`button-usage\` skill's \`component_version\` and this changelog entry,
  enforced by the \`check-skill-sync\` pre-commit gate.

### Chart v1.0.0
- New data-visualization molecule built on TanStack Charts (\`@tanstack/charts\` + \`@tanstack/react-charts\`). A single \`type\` prop switches between line, area, bar, horizontal bar, scatter, pie and donut charts from the same \`data\`/\`x\`/\`y\`/\`series\` channels. Series colors come from the new \`--color-chart-series-1..6\` tokens (validated for CVD separation and surface contrast in light and dark mode, bridged to TanStack's \`--ts-chart-*\` palette variables), chart chrome inherits \`--color-chart-fg\`, and the native tooltip is styled by the Tooltip-atom-aliased \`--*-chart-tooltip-*\` tokens. Paired 1:1 with the chart-usage skill and this changelog entry.

### Accordion v1.0.0
- Opted into per-component versioning; paired 1:1 with the accordion-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### DataTable v1.2.0
- Uses only DataTable component tokens. The last Table tokens it reached through to (border width, the small text size, header/footer/row backgrounds, striped rows, the drag-handle hover, the outline shadow) now each have a \`--*-data-table-*\` alias. Derived colour tokens follow the \`-bg\` / \`-fg\` naming rule (e.g. \`--color-data-table-sort-icon-fg\`, \`--color-data-table-row-bg-nested\`), and the border width is \`--border-width-data-table\`.
- Fixes the filter-row and pagination-bar backgrounds. Both shared the header's inline opaque-surface style, and because an inline \`style\` outranks a class it silently overrode their own \`bg-*\` classes, so neither token reached the browser. Each surface now composites its own token.

### DataTable v1.1.0
- Moved off the prototype styling onto its own \`--*-data-table-*\` component tokens, exported from the Figma \`data-table\` collection. Toolbar, filter row, pagination bar, empty state, sort icon, drag and resize handles, editor error and detail box each read a named token instead of a Table or semantic one. No visual change — every component token aliases what the slot used before — but each surface can now be retargeted without editing the component. \`--border-table-width\` and the \`text-table-*\` ramp stay on Table tokens, having no DataTable counterpart.

### DataTable v1.0.0
- New headless data-grid organism built on \`@tanstack/react-table\` v9, rendering into the presentational \`Table\` organism so it inherits the \`--color-table-*\` tokens. Covers sorting, conditional column filters, global search, row selection, column visibility/pinning/reorder, row reorder, tree/expanding rows, inline edit, colSpan/rowSpan, virtualization/infinite scroll and pagination. Every feature exposes a callback for Storybook interaction tests. Paired 1:1 with the data-table-usage skill and this changelog entry.

### ActionIcon v1.0.0
- Opted into per-component versioning; paired 1:1 with the action-icon-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Badge v1.0.0
- Opted into per-component versioning; paired 1:1 with the badge-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Breadcrumb v1.0.0
- Opted into per-component versioning; paired 1:1 with the breadcrumb-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Carousel v1.0.0
- Opted into per-component versioning; paired 1:1 with the carousel-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Checkbox v1.0.0
- Opted into per-component versioning; paired 1:1 with the checkbox-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### ColorSelect v1.0.0
- Opted into per-component versioning; paired 1:1 with the color-select-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Combobox v1.2.1
- Async loading and error states keep selected labels while preventing keyboard selection of options that are not rendered.

### Combobox v1.2.0
- Added external filtering mode (filterBehavior), async dropdown states (loading, error, onRetry) and custom item rendering (renderItem).

### Combobox v1.1.0
- Panel, item hover/selected colour, radius, shadow and z-index now come from the shared popup-surface tokens (also used by Select and Menu), so all three read as one system. Selected items get a real trailing check indicator (previously missing) in a reserved gutter that keeps the label from reflowing.

### Combobox v1.0.0
- Opted into per-component versioning; paired 1:1 with the combobox-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Dialog v1.0.0
- Opted into per-component versioning; paired 1:1 with the dialog-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Footer v1.0.0
- Opted into per-component versioning; paired 1:1 with the footer-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### FormCheckbox v1.1.1
- The public \`id\` now identifies the native checkbox input, so error-summary links can target it.

### FormCheckbox v1.1.0
- Help/error text is now linked to the control via \`aria-describedby\`; added an optional \`aria-describedby\` prop so apps can append their own description IDs.

### FormCheckbox v1.0.0
- Opted into per-component versioning; paired 1:1 with the form-checkbox-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### FormErrorSummary v1.0.1
- Focus-visible links now use component-specific ring aliases; their appearance is unchanged.

### FormErrorSummary v1.0.0
- New focusable error summary molecule that lists validation errors as links to the invalid fields via targetId; presentational and form-library-agnostic.

### FormInput v1.1.0
- Help/error text is now linked to the input via \`aria-describedby\`, and \`aria-invalid\` is set only for \`validateStatus="error"\`.

### FormInput v1.0.0
- Opted into per-component versioning; paired 1:1 with the form-input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### FormNumericInput v1.1.0
- Help/error text is now linked to the numeric input via \`describedBy\`.

### FormNumericInput v1.0.0
- Opted into per-component versioning; paired 1:1 with the form-numeric-input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### FormTextarea v1.1.0
- Help/error text is now linked to the textarea via \`aria-describedby\`, and \`aria-invalid\` is set only for \`validateStatus="error"\`.

### FormTextarea v1.0.0
- Opted into per-component versioning; paired 1:1 with the form-textarea-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Gallery v1.0.0
- Opted into per-component versioning; paired 1:1 with the gallery-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Header v1.0.0
- Opted into per-component versioning; paired 1:1 with the header-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Icon v1.0.0
- Opted into per-component versioning; paired 1:1 with the icon-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Image v1.0.0
- Opted into per-component versioning; paired 1:1 with the image-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Input v1.0.0
- Opted into per-component versioning; paired 1:1 with the input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Label v1.0.0
- Opted into per-component versioning; paired 1:1 with the label-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Link v1.0.0
- Opted into per-component versioning; paired 1:1 with the link-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### LinkButton v1.0.0
- Opted into per-component versioning; paired 1:1 with the link-button-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Menu v1.1.0
- Panel and item styling now come from the shared popup-surface tokens (see Select, Combobox). Added an \`xs\` size so parents whose own scale starts at \`xs\` (DataTable's column-settings menu) can forward \`size\` without it silently collapsing to \`md\`. Checkable rows reserve a trailing indicator gutter instead of shifting the label on toggle.

### Menu v1.0.0
- Opted into per-component versioning; paired 1:1 with the menu-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### NumericInput v1.0.1
- The public \`id\` now identifies the editable input, aligning external labels and error-summary links.

### NumericInput v1.0.0
- Opted into per-component versioning; paired 1:1 with the numeric-input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Pagination v1.0.0
- Opted into per-component versioning; paired 1:1 with the pagination-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### PhoneInput v1.0.0
- Opted into per-component versioning; paired 1:1 with the phone-input-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Popover v1.0.0
- Opted into per-component versioning; paired 1:1 with the popover-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### ProductCard v1.0.0
- Opted into per-component versioning; paired 1:1 with the product-card-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### RadioCard v1.0.0
- Opted into per-component versioning; paired 1:1 with the radio-card-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### RadioGroup v1.0.0
- Opted into per-component versioning; paired 1:1 with the radio-group-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Rating v1.0.0
- Opted into per-component versioning; paired 1:1 with the rating-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### SearchForm v1.0.0
- Opted into per-component versioning; paired 1:1 with the search-form-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Select v1.1.0
- Panel and item styling now come from the shared popup-surface tokens (see Combobox, Menu): consistent radius, shadow, hover/selected colour and z-index across all three. The panel height now caps at the measured available space instead of a fixed height, and the selected-item indicator sits in a reserved gutter so the label no longer reflows on selection.

### Select v1.0.0
- Opted into per-component versioning; paired 1:1 with the select-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Skeleton v1.0.0
- Opted into per-component versioning; paired 1:1 with the skeleton-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Slider v1.0.0
- Opted into per-component versioning; paired 1:1 with the slider-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### StatusText v1.0.0
- Opted into per-component versioning; paired 1:1 with the status-text-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Steps v1.0.0
- Opted into per-component versioning; paired 1:1 with the steps-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Switch v1.0.0
- Opted into per-component versioning; paired 1:1 with the switch-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Table v1.2.0
- Selected rows use a filled brand background (previously a light tint) with \`color-table-row-fg-selected\` so row text and \`currentColor\` glyphs invert correctly against it.

### Table v1.1.0
- Cells and column headers style horizontal alignment from \`data-align\` (\`start | center | end\`). Unlike \`numeric\`, which asserts the value *is* a number, \`data-align\` is a pure presentation choice, so icon/boolean columns can be centred. Set one or the other, not both.

### Table v1.0.0
- Opted into per-component versioning; paired 1:1 with the table-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Tabs v1.0.0
- Opted into per-component versioning; paired 1:1 with the tabs-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Textarea v1.0.0
- Opted into per-component versioning; paired 1:1 with the textarea-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Toast v1.0.0
- Opted into per-component versioning; paired 1:1 with the toast-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### Tooltip v1.0.0
- Opted into per-component versioning; paired 1:1 with the tooltip-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.

### TreeView v1.0.0
- Opted into per-component versioning; paired 1:1 with the tree-view-usage skill and this changelog entry, enforced by the check-skill-sync pre-commit gate.
`.trim()

type ChangelogBlock =
  | { kind: "heading"; level: 2 | 3; text: string; id: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string }

// Intentionally limited to the authored changelog grammar. React escapes all text;
// HTML and Markdown links are never interpreted as markup or executable URLs.
function parseChangelog(source: string): ChangelogBlock[] {
  const blocks: ChangelogBlock[] = []
  const usedIds = new Set<string>()
  for (const line of source.split("\n")) {
    const heading = /^(#{2,3}) (.+)$/.exec(line)
    if (heading) {
      const text = heading[2] ?? ""
      const slug =
        text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "section"
      const base = `changelog-${slug}`
      let id = base
      let occurrence = 1
      while (usedIds.has(id)) {
        occurrence += 1
        id = `${base}-${occurrence}`
      }
      usedIds.add(id)
      blocks.push({
        kind: "heading",
        level: heading[1]?.length === 2 ? 2 : 3,
        text,
        id,
      })
    } else if (line.startsWith("- ")) {
      const previous = blocks.at(-1)
      if (previous?.kind === "list") previous.items.push(line.slice(2))
      else blocks.push({ kind: "list", items: [line.slice(2)] })
    } else if (line.trim()) {
      const previous = blocks.at(-1)
      // Indented lines continue the preceding bullet without creating a second entry.
      if (/^\s+/.test(line) && previous?.kind === "list") {
        const index = previous.items.length - 1
        previous.items[index] += ` ${line.trim()}`
      } else blocks.push({ kind: "paragraph", text: line.trim() })
    }
  }
  return blocks
}

function InlineCode({ text }: { text: string }) {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith("`") && part.endsWith("`") ? (
      // The segments are immutable, positional tokens, not reorderable data.
      // biome-ignore lint/suspicious/noArrayIndexKey: repeated inline code needs a positional key.
      <code
        className="break-all rounded-sm bg-base px-50 font-mono"
        key={index}
      >
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    )
  )
}

function Changelog({ source = CHANGELOG }: { source?: string }) {
  const blocks = parseChangelog(source)
  const headings = blocks.filter((block) => block.kind === "heading")
  return (
    <article className="min-h-screen bg-base p-400 text-fg-primary">
      <div className="mx-auto min-w-0 max-w-container space-y-400 rounded-2xl bg-surface p-300 shadow-2">
        <h1 className="font-semibold text-2xl">Changelog</h1>
        <nav aria-label="Changelog contents">
          <details className="rounded-lg border border-border p-200">
            <summary className="cursor-pointer font-semibold">
              Jump to a component or version ({headings.length})
            </summary>
            <ul className="mt-200 max-h-(--container-sm) space-y-100 overflow-y-auto p-100 text-sm">
              {headings.map((heading) => (
                <li key={heading.id}>
                  <Link
                    className="break-words"
                    href={`#${heading.id}`}
                    size="current"
                    onClick={(event) =>
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open")
                    }
                  >
                    <InlineCode text={heading.text} />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </nav>
        <div className="space-y-400 break-words text-sm leading-relaxed">
          {blocks.map((block, index) => {
            if (block.kind === "heading") {
              const Heading = block.level === 2 ? "h2" : "h3"
              return (
                <Heading
                  className={
                    block.level === 2
                      ? "font-semibold text-xl"
                      : "font-semibold text-lg"
                  }
                  id={block.id}
                  key={block.id}
                  tabIndex={-1}
                >
                  <Link href={`#${block.id}`} size="current">
                    <InlineCode text={block.text} />
                  </Link>
                </Heading>
              )
            }
            if (block.kind === "list") {
              // biome-ignore lint/suspicious/noArrayIndexKey: source blocks and bullets retain their authored order.
              return (
                <ul className="list-disc space-y-100 pl-400" key={index}>
                  {block.items.map((item, itemIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: identical bullet text is legal in different entries.
                    <li key={itemIndex}>
                      <InlineCode text={item} />
                    </li>
                  ))}
                </ul>
              )
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: immutable source order.
            return (
              <p key={index}>
                <InlineCode text={block.text} />
              </p>
            )
          })}
        </div>
      </div>
    </article>
  )
}

const meta = {
  title: "Guide/Changelog",
  component: Changelog,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    docs: {
      description: {
        component:
          "Per-component version history for @techsio/ui-kit. Use the compact contents to jump to a release or component; headings link directly to stable entries.",
      },
    },
  },
} satisfies Meta<typeof Changelog>

export default meta

export const Playground: StoryObj<typeof Changelog> = {
  parameters: {
    docs: {
      description: {
        story:
          "Browse the authored component history with navigable headings, readable lists and inline API names.",
      },
    },
  },
}

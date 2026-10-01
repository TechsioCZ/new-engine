# Actions and feedback: where things live

The same kind of action must appear in the same place on every screen, so
users stop searching. Positions below are for LTR; the kit uses logical
properties (`start`/`end`), so RTL mirrors automatically.

## Where actions live

**Rule:** an action sits at the *end* (right) of the container it acts on.
It goes at the **top** when it acts on the whole page or collection and must
be reachable without scrolling; it goes at the **bottom** when it *completes*
something the user fills or reads top-to-bottom.

| Surface | Actions | Position | Order (start → end) |
| --- | --- | --- | --- |
| List page (collection) | `New <object>` (the page's only primary), `Import`, `Export` | top-right, in `PageHeader` actions | secondary/outlined … primary last |
| Full-page record editor | `Back to list`, `Preview`, `Save` / `Publish` | top-right, in the page header — kept visible (sticky) while the form scrolls | borderless back … primary last |
| Dialog, drawer (`Dialog placement="right"`) | `Cancel`, `Create <object>` / `Save changes` | bottom-right footer (`actions` prop, already `justify-end`) | `[Cancel] [Primary]` |
| Confirmation (`role="alertdialog"`) | `Cancel`, `Delete <object>` | bottom-right footer | `[Cancel] [Destructive]` |
| Settings section / inline form card | `Save changes` for that section | bottom-right of the section, after its last field | `[Reset]` … `[Save changes]` |
| Wizard / checkout step | `Back`, `Continue` (last step: the real action) | bottom: `Back` start, primary end | `[Back] ……… [Continue]` |
| Popover / filter panel | `Reset`, `Apply` | bottom-right of the panel | `[Reset] [Apply]` |
| Table rows | `Open`/`Edit`, `Duplicate`, `Delete` | end of the row (DataTable actions column), overflow in a Menu | destructive last, `tone: "danger"` |
| Bulk selection | actions for the selected rows | table toolbar, top, only while a selection exists | destructive last |
| Card (product, record) | one primary action | bottom of the card | — |
| Danger zone (delete record/workspace) | `Delete <object>` | its own section at the **bottom of the page**, never beside Save | — |

Hard rules:

- **One primary button per surface.** Everything else is `secondary`,
  `outlined` or `borderless`.
- **Primary is last** (right-most) in a button group; `Cancel` sits before it.
  Don't reorder by platform.
- **Destructive replaces the primary** in a confirmation; never show `Save`
  and `Delete` as neighbours.
- **Don't split one form's actions** between the header and the footer. A
  short form (dialog, drawer, settings section) → bottom; a long full-page
  editor → sticky header.
- On small screens footers stay at the bottom (full-width buttons are fine);
  the page header's actions collapse into a Menu before they wrap.

## Choosing the feedback surface

| What happened | Surface | Why |
| --- | --- | --- |
| A field is invalid | Inline on the field (`validateStatus`, `helpText`) | the fix happens there |
| Submit failed, 2+ errors | `FormErrorSummary` above the form + inline | one place to start, links to each field |
| Mutation succeeded and the change is visible in place | nothing, or a toast | don't congratulate every keystroke |
| Mutation succeeded, change not obvious (drawer closed, row moved, background save) | Toast `success` | the list alone doesn't prove the write |
| Reversible destructive action done (archive, remove) | Toast `success` with `Undo` | faster than a confirmation |
| Irreversible or expensive action requested | `Dialog role="alertdialog"` before acting | the user must decide |
| Background/async job result | Toast (`loading` → `success`/`error`) | the user may be elsewhere |
| Recoverable failure of an async action | Toast `error` with `Try again`, stays until dismissed | needs action, must not vanish |
| Persistent condition of this page (read-only mode, sync paused, trial ends) | inline StatusText/section at the top of the content | must stay visible while relevant |
| Whole page unavailable (404, 403, 500, offline) | system state screen inside the app shell | see Pages/System/States |
| Contextual hint about a control | Tooltip (icon buttons) or help text (fields) | on demand, next to it |

Never use a toast for: validation errors, information the user must act on
later, content they need to copy, or the only copy of an error message.

## Toasts

- **One `<Toaster />` per app**, mounted in the root layout. The kit's store
  places toasts **bottom-end (bottom-right)** with a 16 px gap and 24 px
  offset. Don't create other placements per page.
- **Why bottom-right:** page commands and the user menu live top-right —
  a top toast would cover the next action; form and dialog actions end
  bottom-right, so the confirmation appears where the user's attention already
  is, without covering content being read top-left.
- Mind sticky bottom bars (cookie bars, mobile checkout bars): offset the
  toaster so toasts never cover a primary action.
- **Duration:** `success`/`info` 5 s (the kit default in stories); `warning`
  8 s; `error` with an action and `loading` stay until resolved or dismissed.
  Never auto-dismiss something the user must read or act on.
- **Content:** title = `<Object> <past participle>` (see ux-writing);
  optional one-sentence description; at most one action (`Undo`, `View`,
  `Try again`).
- **Rate:** one toast per user action. Bulk operations produce one summary
  toast (`12 products archived`), not twelve.
- Toasts are announced politely and never steal focus; don't put the only way
  to reach something inside a toast.

## Destructive actions

| Action | Pattern |
| --- | --- |
| Reversible (archive, remove from a collection, soft delete) | act immediately → toast with `Undo` |
| Irreversible, one record | `alertdialog` naming the record and consequences → `[Cancel] [Delete <object>]` |
| Irreversible, high impact (workspace, all data, billing) | `alertdialog` + type the name to confirm; lives in a danger-zone section |
| Bulk irreversible | `alertdialog` with the count: `Delete 12 products?` |

- Destructive buttons use `variant="danger"`; row actions use `tone: "danger"`
  and sit last.
- The confirmation's description says what will be lost and what will not
  (`Orders that include it are kept.`).
- After deletion, return the user to a stable place (the list, with focus on
  the neighbour row) and confirm with a toast.

## Create / read / update / delete surfaces

| Operation | Default surface | Use a full page instead when |
| --- | --- | --- |
| Create | right drawer (`Dialog placement="right"`) over the list | the record is long, has media or several sections |
| Read | row click → right drawer with details | the record has its own sub-lists/tabs (order detail, customer) |
| Update (1–2 fields) | DataTable inline edit | never — inline edit is the light path |
| Update (full) | the same drawer as create | same as create |
| Delete | row action → `alertdialog` (or `Undo` toast if reversible) | — |

Create and update share **one form component** — a record has one shape.
Opening a record must not lose the list's scroll position, search or filters.

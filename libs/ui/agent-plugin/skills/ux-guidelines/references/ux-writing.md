# UX writing

Copy is part of the component API: the same action must be called the same
thing on every screen. Examples use English; the rules apply to every locale —
translate the pattern, not the words.

## Voice and mechanics

- **Sentence case** for everything: page titles, section titles, buttons, menu
  items, tabs, labels, toasts, column headers (`New product`, not `New Product`).
- **Plain and specific.** Name the object the user knows (`product`, `order`),
  never the implementation (`record`, `entity`, `row`, `item` when a real noun exists).
- **Present tense, active voice, second person** where a subject is needed:
  "You can change this later", not "This can be changed later by the user".
- **No blame, no drama.** No `Oops`, `Whoops`, `Error!`, exclamation marks or
  jokes in errors. Success needs no celebration either.
- **Numerals, not words** (`3 products`), and pluralise with `Intl.PluralRules`
  or the i18n library — never `product(s)`.
- **Ellipsis is one character (`…`)** and means "more is coming": in-progress
  labels (`Saving…`), search placeholders (`Search products…`) and menu items
  that open a dialog asking for more input (`Rename…`). Never three dots.
- **Quotes and names**: refer to user content by its name, in quotes only when
  it could be misread: `Delete “Summer sale”?`.
- **No trailing punctuation** on labels, buttons, titles, tabs or column headers.
  Full sentences (descriptions, help text, messages) end with a period.
- **No colons after labels**; the layout already pairs label and field.

## Button labels

A button says what happens when it is pressed. Use a verb, add the object
whenever the screen shows more than one kind of thing.

| Situation | Label | Not |
| --- | --- | --- |
| Open the create form | `New <object>` | `Add`, `+`, `Create new` |
| Submit a create form | `Create <object>` | `Save`, `Submit`, `OK` |
| Submit an edit form | `Save changes` | `Update`, `Submit`, `Apply` |
| Save a whole-page editor | `Save` (object is the page title) | `Save record` |
| Save a draft explicitly | `Save draft` | `Save as draft copy` |
| Make content live | `Publish` / `Unpublish` | `Go live`, `Activate` |
| Leave a form without saving | `Cancel` | `Close`, `Back`, `Discard` |
| Leave with unsaved changes (confirm dialog) | `Discard changes` + `Keep editing` | `Yes` / `No` |
| Confirm an irreversible delete | `Delete <object>` | `Yes`, `Confirm`, `OK` |
| Remove from a collection (item survives) | `Remove` / `Remove from <collection>` | `Delete` |
| Close something with no pending changes | `Close` | `Cancel`, `Done` |
| Apply filters / settings in a popover | `Apply` + `Reset` | `OK`, `Clear all settings` |
| Next step in a flow | `Continue` (last step: the real action, e.g. `Place order`) | `Next >`, `Submit` |
| Previous step | `Back` | `Previous`, `<` |
| Retry after failure | `Try again` | `Retry?`, `Reload` |

- Icon-only buttons (`ActionIcon`) need an `aria-label` written the same way
  (`Delete product`, `Close notification`).
- Keep the label when loading: `loadingText="Saving…"`, `Deleting…`,
  `Creating product…` — the button keeps its place and width.
- Never change a label into a question (`Delete?`) or a state (`Deleted`).

## Titles and descriptions

- **Page title** = the collection or record name (`Products`, `Order #10238`).
- **Dialog/drawer title** = the action or the record: `New product`,
  `Edit product`, or the record name for a read-only drawer.
- **Destructive confirmation title** = a question naming the action:
  `Delete this product?`, `Discard unsaved changes?`. The description names the
  record and the consequence: `“Linen shirt” (TS-0042) will be removed from the
  catalogue and from every collection that references it.`
- Descriptions say what the user gains or risks, in one or two sentences — not
  instructions on how to click.

## Form copy

- **Label** = the noun, no colon, no "Enter …": `Email`, `Price (€)`, `SKU`.
- **Placeholder** is an example, never the label and never required
  information: `e.g. TS-0042`. Many fields need no placeholder at all.
- **Help text** explains format or consequence, persistently under the field:
  `Uppercase, dash-separated. Must be unique across the catalogue.`
- **Required vs optional**: mark whichever is the minority; the kit's `required`
  marker is the default. Do not write "(required)" by hand as well.
- **Validation messages** say what is wrong *and* how to fix it, in the field's
  words: `Enter an SKU with at least 4 characters.` — not `Invalid input`.
- Validate on blur or submit, never on each keystroke of the first entry.

## Messages

### Success (toast title)

Pattern: `<Object> <past participle>` — the object first, so users scanning a
stack of toasts see *what* changed.

| Action | Title | Optional description |
| --- | --- | --- |
| Create | `Product created` | `Linen shirt is now in the catalogue.` |
| Edit form / inline edit / page save | `Product saved` | the record name |
| Settings section | `Settings saved` / `Workspace details saved` | — |
| Delete | `Product deleted` | `Linen shirt was removed.` + `Undo` action when reversible |
| Bulk | `3 products archived` | — |
| Send | `Invitation sent` | recipient |
| Copy | `Link copied` | — |

Never `Success!`, `Done`, `Saved` alone (saved what?), or a sentence that only
repeats the button label.

### Errors

Three parts, in this order: **what happened**, **why** (if known), **what to do**.

- `Product not saved` + `The SKU TS-0042 is already used by “Linen shirt”. Choose a different SKU.`
- `Couldn't load orders` + `Check your connection and try again.` + `Try again` action.
- Server errors carry a reference the user can quote: `Reference: 7F3A-21`.
  Never show stack traces, HTTP codes alone, or exception names.
- Permission errors name who can help: `Ask Nora Kessler (owner) for access.`

### Warnings and info

- Warning = the action will succeed but has a consequence worth knowing:
  `Stock is below 5 for 3 variants.`
- Info = neutral status the user did not ask for; use sparingly. Prefer inline
  text over a toast when the information belongs to a place on the page.

### Empty states

- **First use:** what goes here + the one action to fill it:
  `No products yet` / `Create your first product to start selling.` / `[New product]`.
- **No results:** say the filter is the cause and offer the way out:
  `No products match “linen”` / `[Clear filters]`.
- **Error:** see Errors. An empty state never lies about an error ("No orders"
  when loading failed).

## Status vocabulary

Use one word per state across the product and map it to the same Badge
variant everywhere:

| Meaning | Word | Badge `variant` |
| --- | --- | --- |
| Visible / completed successfully | `Active`, `Published`, `Paid` | `success` |
| Done, informational | `Fulfilled`, `Shipped` | `info` |
| Not visible yet / retired | `Draft`, `Archived` | `outline` |
| Waiting or needs attention | `Scheduled`, `Pending`, `Low stock`, `Overdue` | `warning` |
| Failed / blocked / ended badly | `Failed`, `Cancelled`, `Out of stock` | `danger` |

This is the mapping the page stories use (`StatusBadge` in
`stories/pages/shell.tsx`); keep one map per app and reuse it.

Do not mix synonyms (`Live` vs `Active` vs `Enabled`) for the same state.

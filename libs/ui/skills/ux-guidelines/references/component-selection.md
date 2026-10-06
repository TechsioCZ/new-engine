# Component selection

Pick by the user's intent, not by how the component looks. Every row links a
need to the kit component and names the look-alike you should *not* use.
Each `<component>-usage` skill repeats its own rows in its UX/UI section.

## Actions and navigation

| Intent | Use | Not |
| --- | --- | --- |
| Do something on this page (save, delete, open a dialog) | `Button` | `Link`, `LinkButton` |
| Go to another URL, styled as a button | `LinkButton` | `Button` with `onClick={() => router.push()}` |
| Go to another URL inside text or a list | `Link` | `LinkButton`, `Button` |
| Compact icon action in toolbars, rows, inputs | `ActionIcon` (with `aria-label`) | `Button` with an icon and no text, `Icon` with `onClick` |
| Several commands on one object | `Menu` | a row of five buttons, `Select` |
| Search and run app-wide commands (⌘K) | `Command` | `Combobox`, `SearchSuggestions` |
| Show a shortcut | `Hotkeys` | hand-written `<kbd>` |
| Where am I in the hierarchy | `Breadcrumb` | `Tabs`, `Steps` |
| App/site navigation, persistent on desktop | `Sidebar` + `VerticalNavigation` | `TreeView`, `Accordion` of links |
| Hierarchical selection with arrow keys (files, categories to pick) | `TreeView` | `VerticalNavigation` |
| Global top bar / footer | `Header` / `Footer` | custom flex divs |
| Move between pages of results | `Pagination` | `Steps`, infinite scroll in admin tables |

## Overlays

| Intent | Use | Not |
| --- | --- | --- |
| Focused task or decision that blocks the page | `Dialog` (center) | `Popover` |
| Irreversible confirmation | `Dialog role="alertdialog"` | `window.confirm`, `Popover` |
| Create/edit/read a record over a list | `Dialog placement="right"` (drawer) | a new page for a 5-field form |
| Transient edge panel (cart, filters on mobile, nav on mobile) | `Drawer` / `Sidebar` mobile mode | `Dialog` center |
| Small anchored content the user interacts with (filters, color, mini form) | `Popover` | `Dialog`, `Tooltip` |
| Short non-essential hint on hover/focus | `Tooltip` | `Popover`, `title` attribute |
| Teach an existing UI step by step | `Tour` | chained `Tooltip`s, `Dialog`s |

## Feedback and status

| Intent | Use | Not |
| --- | --- | --- |
| Confirm a finished action | `Toast` | `Dialog`, `alert()` |
| Message tied to a field or section | `StatusText` (or the Form* `helpText`/`validateStatus`) | `Toast` |
| List every error after submit | `FormErrorSummary` | a toast per error |
| Short label of a state or category | `Badge` | `Button`, `StatusText` |
| Content is loading | `Skeleton` | spinner in place of the layout |
| Button action in progress | `Button isLoading loadingText` | `Skeleton`, disabling the whole form |
| Rating value | `Rating` | star icons |

## Form inputs

| Intent | Use | Not |
| --- | --- | --- |
| Short text with label/help/error | `FormInput` | `Label` + `Input` + `StatusText` by hand |
| Long text | `FormTextarea` | `FormInput` |
| Exact number, price, quantity | `FormNumericInput` | `FormInput type="number"`, `Slider` |
| Approximate value in a range, visual feedback | `Slider` | `NumericInput` |
| Phone number | `PhoneInput` | `Select` + `Input` |
| Date / date-time | `DatePicker` | three `Select`s, `Input type="date"` in apps |
| One of 2–5 visible options | `RadioGroup` | `Select` |
| One of 2–4 options that need description/price | `RadioCard` | `RadioGroup` with long labels |
| One of many known options (6+) | `Select` | `RadioGroup` |
| One of many options, needs typing to find | `Combobox` | `Select` with 200 items |
| Option inside a hierarchy | `CascadeSelect` | nested `Select`s |
| Colour swatch choice | `ColorSelect` | `RadioGroup` of coloured dots |
| Agree / opt in / pick several | `FormCheckbox` (`Checkbox` in tables) | `Switch` |
| Setting that takes effect immediately | `Switch` | `Checkbox` |
| Attach files | `FileUpload` | bare `<input type="file">` |
| Site/catalog search that navigates | `SearchForm` / `SearchSuggestions` | `Combobox` |

## Structure and data

| Intent | Use | Not |
| --- | --- | --- |
| Peer views of the same object | `Tabs` | `Accordion`, `Steps` |
| Ordered multi-step task | `Steps` | `Tabs` |
| Optional/secondary content the user may expand; FAQs | `Accordion` | `Tabs` for sequential reading |
| Static tabular data | `Table` | div grids |
| Data the user sorts, filters, selects, edits, pages | `DataTable` | `Table` + hand-written sorting |
| Trends and comparisons | `Chart` (with a table alternative) | a table of 200 numbers |
| Product image with thumbnails / zoom | `Gallery` | `Carousel` |
| Horizontally browsable slides (banners, related products) | `Carousel` | `Gallery` |
| Product in a listing | `ProductCard` | custom card divs |
| Catalog facets | `FacetFilterPanel` | hand-built accordions of checkboxes |
| Images with fixed ratio / framework optimisation | `Image` (`as={NextImage}`) | `<img>` |
| Decorative or adjacent icon | `Icon` | emoji, inline SVG |

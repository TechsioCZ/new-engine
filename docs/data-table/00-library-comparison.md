# DataTable — porovnanie knižníc a obhajoba voľby

> Podklad k rozhodnutiu, na akej knižnici postaviť nový `DataTable` komponent v `libs/ui`.
> Dokumentácia každej knižnice bola stiahnutá cez **context7 MCP** (oficiálne zdroje) a zmapovaná na náš zoznam požiadaviek.
> Dátum analýzy: 2026-07-25.

## TL;DR

Tvrdá požiadavka bola: **headless, s otvorenými path cez propsy — upravovať DOM a pristupovať k nested vrstvám**, aby tabuľka zapadla do nášho DS (Zag.js + Tailwind, DOM-first, `data-[...]` stavy, design tokeny cez CSS).

Celé porovnanie rozhoduje **jediná os: canvas vs. DOM rendering.**

| Knižnica | Rendering | Headless | Tailwind na bunky | Integrácia do DS | Verdikt |
|---|---|---|---|:--:|---|
| **TanStack Table** v8/v9 | **DOM** (renderuješ ty) | **áno, 100 %** | **áno** | **1–2 / 5** | ✅ prirodzený fit pre DS |
| **VTable** (Bytedance) | **canvas** (VRender) | nie | nie | 5 / 5 | ⚠️ najviac featur out-of-the-box, ale mimo DS |
| **AntV S2** (Alibaba/Ant) | **canvas** (AntV/G) | nie | nie | 5 / 5 | ❌ pivot/analytika, nie stylovateľný grid |
| ali-react-table (Alibaba) | DOM | čiastočne | áno | 4 / 5 | ❌ mŕtvy projekt, čínske docs, žiadne context7 pokrytie |
| _(baseline)_ antd Table | DOM | nie (CSS-in-JS) | override vojny | 3 / 5 | ⚠️ nie headless |

> **Škála „Integrácia do DS" = náklad/úsilie integrácie (1 = najmenej, 5 = najviac), nie kvalita knižnice.** Preto TanStack skóruje `1–2 / 5` a vyhráva, kým canvas knižnice `5 / 5` a padajú.

**Upresnenie k „Table od Alibaby":** to, na čo sme mysleli (`ali-react-table`), je prakticky neudržiavané, dokumentácia len po čínsky, v context7 nulové pokrytie. Reálny živý „Alibaba/Ant Group" table je **AntV S2** — ale je to canvas pivot/analytická tabuľka. VTable (Bytedance) aj S2 (Alibaba) sú teda **oba canvas** a narážajú na ten istý problém.

## Prečo je canvas problém pre náš DS

VTable aj S2 kreslia bunky ako **pixely na jeden `<canvas>`**:

- **Žiadne per-cell DOM uzly** → žiadny `className`, žiadne `data-[validation=error]`, žiadne CSS premenné, žiadny Tailwind na obsahu tabuľky.
- Štýlovanie ide cez **paralelný JS „theme" objekt** (`themeCfg`, VRender style objekty) — museli by sme **duplikovať celý náš token systém** do druhého jazyka a udržiavať bridge adaptér.
- „Nested vrstvy cez propsy" reálne neexistujú — dostaneš len **overlay escape hatche** (absolútne polohovaný HTML/React nad canvasom pre editory, filter menu, popupy). To sa nedá škálovať na štýlovanie každej bunky.
- Bonus problém: prístupnosť (ARIA na elementoch) a debugging (S2 potrebuje špeciálny „G devtools" plugin).

To je filozofický opak Zag.js + Tailwind DS, ktorého celá premisa je „ty vlastníš DOM a štýl, my vlastníme správanie".

## Matica požiadaviek (natívna podpora)

Legenda: ✅ natívne · 🟡 logika áno / UI si postavíš (alebo cez plugin) · ⚙️ len cez custom/externú knižnicu · ❌ chýba

| # | Požiadavka | TanStack | VTable | AntV S2 |
|---|---|:--:|:--:|:--:|
| 1 | Filter nad stĺpcami s conditions | 🟡 logika, UI DIY | ✅ FilterPlugin (byCondition) | 🟡 pipeline `onFilter` |
| 2 | Template na header filter | ⚙️ postavíš v `<th>` | ✅ `headerCustomLayout` | ✅ `custom-header`/`colCell` |
| 3 | Fulltext search | ✅ `globalFilter` | 🟡 search plugin | ⚙️ prefiltruj dáta |
| 4 | Sorting | ✅ `getSortedRowModel` | ✅ `sort` + komparátor | ✅ `sortParams` |
| 5 | Empty data template | ⚙️ DIY | ✅ empty-tip | ✅ `placeholder` |
| 6 | Row actions | ⚙️ display column | ✅ `cellType:'button'`/icon | ⚙️ custom/overlay |
| 7 | Freeze columns L/R | 🟡 `columnPinning` (+CSS) | ✅ `frozenColCount`/`rightFrozenColCount` | ✅ `frozen{...}` |
| 8 | Sticky header | ⚙️ CSS `sticky` | ✅ natívne | ✅ `stickyHeader` |
| 9 | Striped rows | ⚙️ CSS `nth-child` | 🟡 cez theme | 🟡 cez theme |
| 10 | Infinite scroll / virtual | ⚙️ +`@tanstack/react-virtual` | ✅ natívne silné | ✅ natívne silné |
| 11 | ColSpan / RowSpan | ❌ len header groups | ✅ `customMergeCell` | ✅ `mergedCell` |
| 12 | onRowClick | ⚙️ `onClick` na `<tr>` | ✅ `click_cell`→row | ✅ `ROW_CELL_CLICK` |
| 13 | Selectable rows (checkbox) | 🟡 `rowSelection` state | ✅ `cellType:'checkbox'` | 🟡 cell selection |
| 14 | Column reorder | 🟡 `columnOrder` (drag=dnd-kit) | ✅ `dragOrder` | 🟡 cez API |
| 15 | Row reorder | ⚙️ dnd-kit + mutuj data | ✅ `rowSeriesNumber.dragOrder` | ⚙️ custom |
| 16 | Skryť/zobraziť stĺpce | ✅ `columnVisibility` | 🟡 `updateColumns` | ✅ `fields.columns` |
| 17 | Row custom content template | ✅ `cell` + `flexRender` | ✅ `customLayout`/VRender | ✅ subclass `DataCell` |
| 18 | Tree structure | ✅ `getExpandedRowModel` | ✅ `tree:true` silné | ✅ tree mode silné |
| 19 | Quick actions | ⚙️ display column | ✅ button/icon | ⚙️ interaction API |
| 20 | Inline row edit | ❌ DIY (`meta.updateData`) | ✅ `vtable-editors` | 🟡 editable-sheet/custom |
| 21 | Pagination (count, page size) | ✅ `getPaginationRowModel` | ✅ `pagination` | ✅ `pagination` |

**Čítanie:** VTable a S2 vyhrávajú na počte ✅ — sú „batteries-included". TanStack má viac 🟡/⚙️, lebo **zámerne nedodáva UI** — dá stavový stroj a markup si postavíš z vlastných atómov (čo je pre DS výhoda, nie nevýhoda).

## Náročnosť integrácie do DS (Zag.js + Tailwind)

- **TanStack — 1–2/5:** rovnaká filozofia ako Zag.js (len logika, nula markupu/CSS). Filter inputy, checkboxy, pager, sort ikony renderuješ cez naše existujúce Zag atómy → tabuľka zdedí naše tokeny a `data-[validation]` pattern zadarmo. Cena: každý kúsok UI postavíš sám; doplniť virtualizáciu (`@tanstack/react-virtual`), drag (`dnd-kit`), inline edit (ručne); **rowSpan/colSpan na dátových bunkách reálne chýba**.
- **VTable — 5/5:** canvas nevieš stylovať Tailwindom ani napojiť na tokeny. Splníš veľa featur out-of-the-box, ale stratíš celý DS — bunky nie sú členmi headless rodiny, len izolovaný widget s token→theme adaptérom. Zmysel dáva iba pri canvas-scale výkone (100k+ buniek, pivot).
- **AntV S2 — 5/5:** to isté + je to over-engineered na pivot analytiku, anglické docs sú tenký subset.
- **ali-react-table — 4/5 + vysoká neistota:** DOM a virtualizovaný, ale mŕtvy projekt, čínske docs, žiadne context7 pokrytie.

## Rozhodnutie (finálne)

**Zvolené: `@tanstack/react-table` v8.** Pre **headless, Tailwind-stylovateľný, DOM-prístupný** grid v Zag.js DS je architektonicky jediný čistý fit. VTable (Bytedance) aj AntV S2 (Alibaba) sú **canvas** → nevedia použiť náš stack (`--color-table-*` tokeny, `tailwind-variants` sloty, `data-[…]` stavy, Zag atómy), preto padli. Bonus: `@tanstack/react-table` už bol v repe (`apps/medusa-be`), takže žiadna nová cudzia platforma.

**Prečo nie VTable/S2, hoci majú viac featur out-of-the-box:** ich canvas rendering by znamenal paralelný JS theme systém (duplikát nášho token setu), žiadny prístup k per-cell DOM cez propsy, a stratu prístupnosti/testovateľnosti cez DOM. Dávajú zmysel len ako **izolovaný canvas analytics widget** mimo DS (canvas-scale 100k+ buniek, pivot).

**Ako sme pokryli slabé miesta TanStacku:**
- colSpan/rowSpan na dátových bunkách → vlastný `getCellSpan` prop (TanStack ho nemá).
- virtualizácia / infinite scroll → `@tanstack/react-virtual` (windowing so zachovaním native table alignmentu) + `onReachEnd`.
- column & row reorder → `@dnd-kit`.
- inline edit → `meta.updateData` → `onCellEditCommit`.

**Implementácia:** organizmus `DataTable` v `libs/ui/src/organisms/data-table.tsx`, renderuje cez existujúci prezentačný `Table` organizmus (dedí `--color-table-*` tokeny). Pokrýva všetkých 21 požiadaviek, každá funkcia má vystavený callback; 22 Storybook stories s `play` interaction testami; usage skill `data-table-usage`. MVP je štýlovaný existujúcimi + semantickými tokenmi; komponentové `--color-data-table-*` tokeny a export do Figmy sa spravia po odsúhlasení MVP vzhľadu.

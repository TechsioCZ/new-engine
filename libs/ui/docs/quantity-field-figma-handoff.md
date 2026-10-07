# QuantityField a NumericInput — Figma handoff

PR08, audit P04. Kód vlastní veřejné API, anatomii a tokenové identifikátory;
Figma vlastní statické hodnoty light/dark/brand módů. Toto je předání pro
`.agents/skills/component-to-figma/SKILL.md`. Komponenta je vytvořená na
[stránce 🔴 QuantityField](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3854-2).
Červený stav zůstává do kontroly designerem. Code Connect template je připravený;
jeho registraci MCP odmítlo, protože nový component set ještě není publikovaný.

## Anatomie a API

QuantityField je molecule přímo nad NumericInput, Label a StatusText.
NumericInput používá jediný Zag number-input machine. Ve Figmě použít
existující NumericInput control; nevytvářet další Akros theme.

| Část / prop | Figma předání | Runtime význam |
| --- | --- | --- |
| label / hideLabel | Text label a přepínač viditelnosti | Skrytí neodstraňuje přístupný název. |
| NumericInput.Control / Input | Existující atom instance | Geometrie, focus a invalid/disabled chrome atomu. |
| Increment / Decrement | Existující ovladače | Min/max blokují příslušný ovladač. |
| unitLabel | Text unit | Viditelná jednotka, možnost zalomení, ARIA popis. |
| helperText / error | Existující StatusText | Mohou být zobrazené současně. |
| pending / pendingLabel | Pending stav a lokalizovaný text | Zablokované editace, zachovaný draft. |
| size sm/md/lg | Existující velikostní osa | Bez nové značkové varianty. |
| disabled / readOnly | Samostatné stavy | Nezaměňovat s pending. |

Public import: `@techsio/ui-kit/molecules/quantity-field`. Ref míří na input;
id/name/form a callbacks patří runtime. Figma zobrazuje reprezentativní
hodnoty, nikoliv persistenci nebo druhý numeric engine.

## Token mapping

Zdroj: `src/tokens/components/molecules/_quantity-field.css`.

| CSS identifikátor | Figma variable | Alias |
| --- | --- | --- |
| --color-quantity-field-unit | color/quantity-field/unit | Semantic fg-primary, reference layer; enhanced text contrast. |
| --color-quantity-field-unit-fg | color/quantity-field/unit-fg | Alias reference layer; žádná raw barva. |
| --color-quantity-field-message | color/quantity-field/message | Semantic fg-primary; čitelná neutrální nápověda a pending text v obou módech. |
| --color-quantity-field-message-fg | color/quantity-field/message-fg | Alias reference layer; error zachovává StatusText severity. |
| --gap-quantity-field | spacing/quantity-field | Existující form-field spacing. |
| --gap-quantity-field-control | spacing/quantity-field/control | Existující spacing150. |
| --spacing-quantity-field-control-min-width | size/quantity-field/minimum | Existující dimension/120; input se vedle dlouhé jednotky nesmí zhroutit. |
| --text-quantity-field-unit-sm/md/lg | text/quantity-field/sm/md/lg | Existující velikostní škála. |

Zachovat primitive → semantic → component aliasy, explicitní scopes a WEB
syntax `var(--...)`. Sdílené statické hodnoty se kvůli skladbě nepřepisují.
NumericInput v1.1.0 přidává string draft a správné Zag callbacky. Jeho
současné číselné Code Connect příklady zůstávají platné; při následném
Figma kroku zkontrolovat i tuto veřejnou API změnu.

## Reprezentativní scénáře

- Editable s jednotkou a pokynem k balení.
- Empty draft a invalid draft s helper i error.
- Minimum/maximum a ručně psaný overflow bez tiché korekce.
- Lokalizovaný pending, samostatné disabled/readOnly.
- Kompaktní pole se skrytým vizuálním label a dlouhou jednotkou.
- České desetinné množství.

Draft a potvrzené množství, důvody chyb, sklad/balení pravidla, zaokrouhlování,
network timing a explicitní removal vlastní aplikace. Ve Figmě dokumentovat
anatomii a reprezentativní stavy, nikoliv obchodní procesy.

## Figma authoring a ověření

[Component set QuantityField](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3861-1334)
má 30 variant: size × state × hideLabel. Výchozí velikost je md.
unitLabel je TEXT property a showHelperText je BOOLEAN property. Label,
hodnota a zprávy jsou nested text overrides; required se nastavuje na
vnořené Label instanci. Kompaktní zalomení dlouhé jednotky má samostatný
statický preset na stejné stránce, responsive wrapping řídí runtime CSS.

Přehled obsahuje velikosti, editable/error/pending/disabled/readOnly,
prázdný draft, české desetinné množství, required, dlouhou jednotku a
minimum/maximum se zablokovanou příslušnou šipkou. Light/dark používají
existující Theme módy. Kolekce quantity-field má deset aliasů bez raw hodnot.
Sdílené komponenty, existující kolekce ani brand módy nebyly změněné.
Korekce dependency geometrie a token bindings jsou overrides nových instancí.

Storybook byl zkontrolovaný přes Chrome DevTools MCP a Figma přes screenshot
celé stránky i měření sekcí. Karty mají auto layout a nepřekrývají se.
Inter odpovídá existující Figmě; Storybook používá system-ui. Fluid hodnoty
kódu jsou ve Figmě reprezentované existujícími sudými tokeny, takže nejde
o přesnou shodu typografie a desetinných rozměrů ve všech viewportech.

`src/molecules/quantity-field.figma.ts` mapuje skutečný set, nested texty,
required a všechny varianty do controlled API se string hodnotou a callbackem.
Pending vždy emituje i lokalizovaný pendingLabel. Registrace přes MCP vrátila
„Published component not found“. Po publikaci nového QuantityField setu
do team library lze zaregistrovat připravený template. Hromadná publikace
ostatních komponent není součástí tohoto kroku.

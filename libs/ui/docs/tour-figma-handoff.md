# Tour — Figma předání, 2026-09-09

Tour je vložený do souboru **New Design System**, mezi overlay molekuly za
Popover. Stránka zůstává **🟠 Tour** kvůli navazujícímu problému sdílených
ovladačů, nikoli kvůli chybějícímu panelu. Publikace Code Connect neproběhla.

- [Stránka Tour](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3259-2)
- [Komponentová sada Tour](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3270-87)
- Lokální mapování: `src/molecules/tour.figma.ts`.
- Výchozí implementace: `0a7e52009`; původní předání: `61009ad7e`.

## Vytvořený obsah

- Jedna sada, 6 variant: `type=dialog|tooltip|floating` × `dir=ltr|rtl`.
- Reálné instance existujících Button a ActionIcon; jejich zdroje beze změn.
- Editovatelné `title`, `description`, `progressText`; přepínače viditelnosti
  popisu, progressu, akcí, close, šipky a jednotlivých tlačítek. Celkem 13
  properties včetně obou variantových os; vnořené ovladače jsou exposed.
- 6 light/dark ukázek: dialog s backdropem, tooltip s cílem, spotlightem
  a výřezem backdropu, floating bez backdropu. Tlačítka Back/Next/Finish
  odpovídají příslušným ukázkám.
- 3 úzké ukázky při 320 × 568: zalomené akce, dlouhý scrollovatelný obsah,
  RTL floating se skrytými částmi. Panel 288 px, limit výšky 536 px.
- Kolekce `tour` s 28 aliasy, explicitními scopes a skutečnou WEB syntaxí.
  Runtime `--z-tour` se do Figma variables nepřenáší.
- Styly `Tour/Title`, `Tour/Body`, `Tour/Shadow`; existující stínový styl
  jiných komponent se neměnil. Nový Tour stín odpovídá současným CSS tokenům.

## Schválené odchylky a hranice parity

1. Zachovat existující Theme/Semantic kolekce a brand režimy. Nebyl proveden
   globální refaktor ani mazání módů; Tour dědí jejich aktuální hodnoty.
2. Místo nedostupného Chrome DevTools MCP použít instalovaný Chrome přes
   Playwright/CDP. Měřený aktuální Storybook: `http://127.0.0.1:6008`.
3. Zachovat Inter ve Figmě. CDP v prohlížeči potvrdilo Segoe UI; šířky textu
   a tlačítek proto nejsou striktně pixelově totožné.

Existující Figma rozměry 6/10/30 px se exportují do CSS jako
6.08/10.08/30.08 px. Tyto zděděné rozdíly nejsou novými raw Tour tokeny.
Desktop panel má ve Figmě 384 × 230 px, v runtime 384 × 230.3125 px;
tooltip ukázka 384 × 206 oproti 384 × 206.3125 px.

Umístění vůči DOM, kolize, wait/effects, target lifecycle, fokus, inert,
scroll a navigace patří runtime. Figma obsahuje reprezentativní kompozice,
ne kopii celého Zag stroje nebo všech 13 floating umístění. Šipka je ve Figmě
uvnitř neclipovaného panelu; v kódu je sourozencem Content v Positioner.

## Ověření

| Kontrola | Výsledek |
| --- | --- |
| 28 tokenů, rekurzivní aliasový audit 52 proměnných | Bez chyb |
| Finální audit 254 Figma uzlů | Žádná chybějící vazba ani nenavázaná viditelná barva |
| Názvy | Jedna Tour sada; žádné duplicitní Tour tokeny |
| Light/dark a úzké ukázky | Screenshoty a computed CSS porovnány s výše popsanými rozdíly |
| Browser chyby při desktop/mobilním měření | Žádné page errors |
| Klávesnicový fokus na Skip | `:focus-visible`, 2px černý/bílý outline v light/dark |
| Figma text/panel kontrast | 16.22:1 light, 14.68:1 dark |
| Code Connect parse | PASS, 47 souborů; Tour je parserless, label React |
| Generované JSX | 60 kombinací: všechny osy, vypínání částí, upravené texty a vnořené ovladače; syntaktická i typová kontrola PASS |
| Biome | PASS v izolaci se stejnou sloučenou konfigurací Ultracite + repo; běžný workspace běh se zasekl |

Kontrola JSX používá skutečné lokální Button/ActionIcon šablony a React
helpers instalovaného Code Connect 2.0.0, ale mock Figma instance handles.
Není to důkaz vykreslení dosud nepublikované šablony v živém Dev Mode.
Původní behaviorální testy a zděděné a11y nálezy jsou v
[implementačním předání](tour-handoff.md); zde nebyl znovu spuštěn celý suite.

## Code Connect kontrakt

Použitý je stejný parserless `.figma.ts` + `figma.code` formát jako u Buttonu.
`type` se mapuje na `TourStep.type`, `dir` na Root. Viditelnost odpovídá
podmíněnému složení compound částí, nikoli vymyšleným Root props.

Ukázka přijímá aplikací vlastněné `steps` a existující `stepId`. U vybraného
kroku aplikuje vzhled z Figmy; target callback, placement, efekty a pořadí
ponechává aplikaci. Jde o počáteční konfiguraci, nikoli controlled API.
Text progressu a popisky ovladačů jsou explicitní Figma obsah; automatické
texty pro zbytek skutečného workflow musí sestavit aplikace.

Vnořené atomy se vyhodnocují přes `executeTemplate()`. Protože Tour triggery
nemají `asChild`, šablona mění pouze emitované značky Button/ActionIcon na
jejich Tour protějšky; ponechává dynamické atomové props a obsah. Next akce
se řídí `api.lastStep`. Změny atomových Code Connect šablon vyžadují opakovat
tuto kontrolu. Root aplikace ani existující atomová mapování nebyly měněny.

## Zbývající návaznosti

- **Sdílené Button varianty:** zdrojové instance odkazují na starší remote
  tokeny. Nové Tour instance byly přepojeny na současné lokální tokeny se
  stejnou WEB syntaxí (např. Button radius 12 místo původních 8). Přepnutí
  varianty/stavu může tyto overrides obnovit ze zdroje; po změně znovu
  zkontrolovat vazby. Trvalá oprava vyžaduje schválený zásah do sdíleného
  Buttonu, ne další privátní Tour komponentu. Proto není deklarovaná úplná
  parita všech následných změn vnořených stavů.
- **ActionIcon:** existující sada má pouze default/hover. Ostatní stavy
  zůstávají v runtime, nejsou fingované jako nově migrované varianty.
  Close má 32 × 32 px; větší doporučený cíl 44 px zde nebyl zaveden.
- **Přístupnost:** původní WCAG AA kontrola byla bez nálezů; sdílený AAA/APCA
  dluh Buttonu zůstává. Globální token validator nadále má známý nález
  `skeleton-text.figma.ts:55`. Tyto gates nejsou označeny za splněné.
- **Publikace:** lokální soubor je připravený a parsuje se; publish ani
  serverové zapsání Code Connect mappingu nebylo autorizováno ani spuštěno.
  Nejde o prokázaný blokátor plánu či oprávnění. Po schválení publikace
  ověřit živé vnořené šablony v Dev Mode.

Lokální důkazy a ledger: `.scratch/tour-figma/state.json`,
`browser-measurements.json`, `mobile-measurements.json`, `audit-figma.js`,
`check-mapping.cjs`, `check-focus.cjs` a screenshoty. Scratch artefakty nejsou
součástí commitu. Samotná Figma migrace nemění produkční Tour TSX, CSS ani
stories; navazující oprava inert v1.0.1 je oddělený runtime commit.

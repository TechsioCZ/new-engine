# Tour — předání

Stav 2026-09-09: implementace v kódu a následně schválený přenos do Figmy.
[Figma předání](tour-figma-handoff.md) obsahuje skutečné odkazy, vizuální
ověření, lokální Code Connect a zbývající omezení sdílených komponent.
Code Connect není publikovaný. Jeho publikace a oprava sdílených Button
vazeb zůstávají samostatnými navazujícími kroky.

Implementační audit níže zachycuje původní v1.0.0. Navazující v1.0.1 opravuje
zachování aplikačního inert u běžných i pozdních cílů; tehdejší Tour suite
prošel 21/21 testů. API, tokeny ani vzhled se touto opravou nezměnily.

Aktualizace kontraktu 2026-09-22 (v1.0.2): závislost je nyní Zag 1.43.3.
Start se řídí stavem stroje, zůstává disabled i při resolving/wait a povolí
se po ukončení. Blokování cíle probíhá v layout effectu před paintem.
Skip a effect.dismiss používají nativní implementaci nové verze. Níže uvedené
historické výsledky měření nepředstavují nový audit Figmy nebo přístupnosti.
Aktuální browser ověření na statickém Storybook buildu: 23/23 testů PASS,
včetně dostupnosti Start a inert při objevení panelu v DOM. Build knihovny,
Storybook build a validátory tokenů prošly; upozornění na potenciálně nepoužité
tokeny jsou neblokující.

Navazující [audit stories a vlastní logiky](tour-story-audit.md) z 2026-09-08
zredukoval katalog z 20 na 7 veřejných ukázek a jednu skrytou testovací
fixture. Obsahuje nálezy, důvody sloučení i přesný seznam zbývajících oprav
Zagu; wrapper není vydáván za čisté předání nativního API.

## Zdroje a kontrakt

- Komponenta: `src/molecules/tour.tsx`, import `@techsio/ui-kit/molecules/tour`.
- Tokeny: `src/tokens/components/molecules/_tour.css`.
- Ukázky: `stories/molecules/tour.stories.tsx`, Storybook `Molecules/Tour`.
- Testy: `test/tour.spec.ts`, `test/tour.typecheck.tsx`.
- Použití: `skills/tour-usage/SKILL.md` a shodná kopie v agent-plugin.
- Verze komponenty / usage skill / changelog: `1.0.2`.
- Jediný Zag stroj, `@zag-js/tour` připnutý na `1.43.3`; sdílené Button a ActionIcon.

Compound API: Root, Context, Trigger, Portal, Backdrop, Spotlight, Positioner,
Content, Arrow, ArrowTip, Title, Description, ProgressText, Actions,
ActionTrigger, CloseTrigger. Nejsou zavedené size ani variant props na Root.
Dialog/tooltip/floating jsou typy kroků, nikoli další vnořené overlay stroje.

`steps` slouží k inicializaci. Context umožňuje imperativní řízení; nejde o
controlled `stepId` nebo `open`. Při setSteps za běhu zachovat aktivní id.
Dismiss a skip se volají přes ActionTrigger nebo jeho callback action map,
nikoli přes přidané Context metody. Při nahrazení nesouvisející sadou nejdříve
dismiss, potom změna sady a start až po jejím vykreslení; nebatchovat nový
setSteps a setStep v jedné události.
Persistenci, routing a analytiku vlastní aplikace.

## Požadavek → ukázka → důkaz → budoucí Figma

| Požadavek | Storybook | Ověření | Figma / runtime |
| --- | --- | --- | --- |
| Tři viditelné typy | Tři kroky Playgroundu | navigates, completes and restores focus | Tři prezentační sestavy; sdílený panel a instance ovládání |
| Umístění floating v LTR/RTL | FloatingPlacements; dir Control | všech 13 umístění v obou směrech; RTL klávesy | Reprezentativní preview; skutečné souřadnice vlastní runtime |
| Next/Back/Finish/Skip/Close | Playground | navigace, skip, Escape, návrat fokusu, Tab trap | Button/ActionIcon instance; enabled/disabled podle reálných props |
| Vlastní ovládání | CustomControls | preventDefault, disabled, editace textu, goto, updateStep, setSteps, ref typy | Obsah/text a instance; callbacky pouze v kódu |
| Wait/effect | InteractiveWait; skrytá UnmountDuringWait fixture | čekání bez overlay, progress bez wait, cleanup při pokračování/dismiss/unmount | Pouze dokumentace; nevyrábět viditelný wait panel |
| Pozdní/chybějící cíl | LateTarget | zobrazení po přidání DOM; timeout a cleanup bez automatického skip | Pouze runtime |
| Blokování interakce | Playground a LateTarget; preventInteraction Control | inert pozdního cíle a jeho obnovení; interakce s povoleným cílem | Runtime; spotlight jako vizuální ukázka |
| Opt-out zavírání / kláves | Playground; příslušné Controls | Escape, outside click a šipky nic nezmění; Close funguje | Pouze runtime |
| Dlouhý obsah a viewport | LongContent, ScrollTarget | 320 × 568, scroll k ovládání, resize, scroll spotlightu | Auto-layout, text wrap, viewport preview; žádné pevné souřadnice |
| Přístupnost a témata | Playground a FloatingPlacements | původní body-wide sken base light/dark; pojmenovaný alertdialog | Textové styly a aliasy; zděděné kontrastní nálezy viz níže |

## Tokeny a vazby

29 deklarací Tour včetně runtime `--z-tour`. Všechny ostatní deklarace jsou
aliasy do vyšších vrstev, s ověřenou existencí referencí a bez cyklů.
Nevytvářet raw komponentové hodnoty ani duplicitní primitiva ve Figmě.

| Skupina | CSS zdroj | Vyšší vrstva / vlastnictví |
| --- | --- | --- |
| Panel a šipka | `--color-tour-surface` → `--color-tour-bg`, `--color-tour-arrow-bg` | `--color-fill-surface` |
| Text, popis, progress | `--color-tour-text` → odpovídající `*-fg` | `--color-fg-primary` |
| Okraj / spotlight / scrim | `--color-tour-outline`, `--color-tour-text`, `--color-tour-scrim` | `--color-border-primary`, `--color-fg-primary`, `--color-bg-scrim` |
| Radius / okraj / stín | `--radius-tour`, `--border-width-tour`, `--shadow-tour` | `--radius-sm`, `--border-width-sm`, `--shadow-primary` |
| Rozestupy | `--padding-tour*`, `--spacing-tour*` | `--dimension-6/10/16/20/30` podle role |
| Typografie | `--text-tour-title-size`, `--text-tour-body-size`, `--text-tour-progress-size`, `--font-weight-tour-title` | `--text-lg`, `--text-base`, `--font-weight-semibold` |
| Šířka a geometrie | `--container-tour` → `--container-sm`; viewport limity a Zag souřadnice | Rozměr panelu je token; umístění/scroll/z-index jsou runtime |
| Ovládání | Button a ActionIcon tokeny | Reuse existujících komponent, žádné soukromé Tour přebarvení |

Arrow je sourozenec Content v Positioner, aby jej scrollovací Content neřezal.
Šipka je nad stínem panelu. Zag 1.43.3 odvozuje inline z-index z Content;
ui-kit zachovává explicitní offsety vrstev. Animace vstupu/výstupu není součástí kontraktu.

## Známé limity a externí validační nálezy

- Zag 1.43.3 čeká na chybějící cíl nejvýše 3000 ms, potom not-found a konec;
  není přidaný konfigurovatelný timeout ani automatický skip.
- Aktivní cíl musí zůstat stabilní. Změny routy/DOM aplikace koordinuje přes wait.
- Dismiss posledního kroku podle Zagu emituje dismissed a completed; samotný
  onStepChange.complete znamená vybraný poslední krok, nikoli kliknutí na Finish.
  Callback indexy/progress používají raw seznam; pro UI používat getProgressText/Percent.
- Zbývající úpravy adaptéru: cleanup po not-found, návrat fokusu, RTL hranice
  a ochrana textových vstupů, vlastnictví inert a lifecycle spouštěcího tlačítka.
  Skip trigger a effect.dismiss jsou v 1.43.3 opravené nativně.
  Při upgradu Zagu znovu spustit tyto testy před odstraněním oprav.
- Sken šesti otevřených povrchů (base light/dark) nenašel WCAG AA violations.
  Přísnější AAA/APCA není zelené: sdílený borderless Button má ve světlém
  režimu kontrast 4.73:1 místo AAA 7:1; APCA gold minimum 80 Lc nesplňují
  některá sdílená tlačítka (např. solid 68.7/73.2 Lc light/dark).
  Identické nálezy reprodukovala původní SharedButtonContrastBaseline bez Tour
  (při auditu odstraněna z katalogu této komponenty).
  Žádné pravidlo nebylo vypnuté a sdílené Button tokeny nebyly změněné.
- `validate:tokens` naráží na existující `skeleton-text.figma.ts:55` (`w-4/5`).
  V Tour žádná chybějící tokenová třída. Definition validator na tomto Windows
  načítá 0 tokenů; jeho exit 0 proto není důkaz. Doplněn cílený aliasový audit.
- Standardní Biome běh nad workspace se zasekává. Plná sloučená pravidla
  Ultracite + repo byla spuštěna v izolaci nad přesnými kopiemi šesti Tour
  souborů; nejde jen o defaultní recommended pravidla. Root konfigurace nezměněna.
- Storybook test-runner na tomto Windows nenašel indexované testy. Behaviorální
  ověření používá vlastní úzký Playwright config s instalovaným Chrome.

## Reprodukce a zastavovací bod

Finální ověření 2026-09-08:

Následné zúžení API a předcommitové ověření z 2026-09-09 jsou zaznamenány
v [auditu stories](tour-story-audit.md#předcommitové-ověření-2026-09-09).

| Kontrola | Výsledek |
| --- | --- |
| TypeScript, včetně pozitivních/negativních API kontraktů | PASS |
| check:package | PASS: build + deklarace, Publint, ATTW, 167 export targets |
| Storybook build | PASS; existující upozornění na MDX/icon/volitelné vitest-axe matchers |
| Playwright na statickém buildu, Chrome, port 6007 | 15/15 PASS, 15.6 s |
| Plná lint pravidla nad šesti shodnými kopiemi souborů | PASS, bez zbývajících nálezů |
| Version/skill/bundle/changelog/routing a aliasy Tour | PASS, 29 deklarací |
| Přístupnost base light/dark, 6 povrchů + 2 baseline ukázky | Bez WCAG AA nálezů; zděděné AAA/APCA nálezy popsané výše |
| Celorepozitářový token validator | Existující nález skeleton-text; nulový scan definic není považovaný za PASS |

```powershell
pnpm --dir libs/ui exec tsc --noEmit --incremental false -p tsconfig.json
pnpm --dir libs/ui check:package
pnpm --dir libs/ui build:storybook --output-dir .scratch/tour-storybook
$env:TOUR_STORYBOOK_URL = 'http://127.0.0.1:6006'
$env:PLAYWRIGHT_CHANNEL = 'chrome'
pnpm exec playwright test -c libs/ui/test/tour.playwright.config.ts
```

Testy potřebují Storybook obsahující aktuální Tour. Port je přepsatelný;
nepřepisovat cizí běžící preview. Lokální důkazy tohoto průchodu jsou v
`.scratch/tour` v kořeni repozitáře a `libs/ui/.scratch`.

Navazující schválený přenos je popsaný ve [Figma předání](tour-figma-handoff.md).
Další rozhodnutí se týká sdílených Button vazeb a publikace Code Connect.
Strict a11y gate nadále není splněný kvůli zděděnému kontrastnímu dluhu Button.

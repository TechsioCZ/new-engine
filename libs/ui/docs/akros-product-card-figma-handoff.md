# Akros ProductCard composition — PR09

Audit P01: jedna skladba existujícího ProductCard s PriceBlock a
AvailabilityStatus z PR06. Výchozí karta nemá výběr množství; jedna story
ukazuje QuantityField z PR08 v existujícím Actions slotu.

Zdroj jsou `stories/templates/akros-product-card.stories.tsx` a doprovodné
story CSS. Nevzniká nový veřejný export ani migrace Akros aplikace.
Aplikace vlastní ceny, dostupnost, validaci množství a skutečné přidání
do košíku. Ukázková akce pouze předává množství a zobrazuje potvrzení.

## Figma

- [🔴 AkrosProductCardComposition](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3875-2388)
- [Přehled stories](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3880-362)
- [Set kompozičních presetů](https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3880-361)

Červená značka čeká na kontrolu designerem. Stránka používá existující
Theme/Akros; kód má Akros pouze ve světlém režimu. Existující Light/Dark
ani ostatní brand módy se nemění a nejsou přidané responzivní módy.

Set obsahuje 18 reprezentativních presetů, nikoli kartézský součin API.
Přehled má stejné scénáře jako sedm stories: Playground, States,
PriceStates, AvailabilityStates, LongContent, ResponsiveCatalog a
WithQuantityField. Responzivní přehled ukazuje více sloupců a jeden sloupec;
skutečné přelamování gridu ověřuje Storybook.

## Skladba a reuse

```text
ProductCard (column)
├─ linked Image / placeholder + optional Badge
├─ linked Name (max. dva řádky)
├─ AvailabilityStatus
├─ description (max. dva řádky)
├─ PriceBlock
└─ Actions
   ├─ optional QuantityField
   └─ Button / LinkButton
```

Existující Figma ProductCard má monolitický Content bez slotů pro tyto
molecules. Nový kompoziční preset proto vychází z kopie jeho rámu;
uvnitř používá instance existujících PriceBlock, AvailabilityStatus,
Button/LinkButton a Badge. Původní ProductCard ani jiné stránky se nemění.

Story nastavuje `--height-form-control-sm: var(--dimension-44)`.
Figma nepovoluje změnit výšku NumericInput uvnitř QuantityField instance,
proto je na nové stránce soukromá kopie QuantityField sm s tímto jedním
geometry override. NumericInput zůstává existující instancí. Tento helper
není nový veřejný QuantityField ani změna jeho sdílených tokenů.

## Tokeny a statická aproximace

Kolekce `akros-product-card` obsahuje 12 aliasů existujících semantic/core
proměnných, bez raw hodnot. Reprodukuje pouze story overrides: background,
foreground, zelenou dostupnost, padding/gap, radius, velikost názvu/ceny,
tučnou cenu a výšku ovladače. Ostatní vazby zůstávají z původních komponent.

Figma používá Inter a statickou celočíselnou škálu. Prohlížeč používá
system-ui a fluidní tokeny: například spacing/200 a text/sm jsou zde
14,08 px, ve Figmě 14 px. Výchozí karta má přibližně 457 px na výšku
v prohlížeči a 456 px ve Figmě; karta s množstvím přibližně 565/564 px.
Na hranici šířky se mohou lišit zalomení: dlouhá cena s původní cenou
a slevovým badge se v Inter může zalomit do dalšího řádku. Obě verze
zachovávají celý cenový obsah; název a popis se omezují na dva řádky.

Nejde o pixelově přesnou kopii současné karty v Akros aplikaci. Je to
ověřená kompozice UI kitu pro audit; její nasazení vlastní aplikace.

## Ověření a Code Connect

- Scoped Biome, TypeScript a build Storybooku prošly.
- Sedm stories ověřeno vizuálně na desktopu i mobilu (14 scénářů).
- Browser kontrola ověřila chybějící overflow, jeden mobilní sloupec,
  pending/disabled akce, string draft, prázdnou hodnotu, min/max, chybu,
  zotavení a předání množství do ukázkové akce.
- Axe našel pouze známý kontrast oranžové dostupnosti 3,49:1 z PR06;
  podle dohody není součástí tohoto PR jej měnit.
- Figma: zkontrolovaný celý přehled i jednotlivé karty, bez překryvů sekcí
  a přetékajícího obsahu; quantity control má 44 px. Ostatní komponenty
  a jejich proměnné zůstávají beze změn.

React helper je lokální ve stories, veřejné API ProductCard a dependencies
se nemění. Nový Code Connect soubor by sliboval neexistující veřejný
template, proto se pro tuto receptovou skladbu nevytváří. Použití v kódu
ukazuje přímo story; existující komponentové mappingy patří dependencies.
Publikace QuantityField do Figma knihovny zůstává samostatný krok PR08.

# Herbatika Test UI

Tahle složka je záměrně oddělený spike prostor pro ověřování `tokens-2/` nad current `libs/ui` contractem.

## Cíl

- nepřepisovat rovnou produkční komponenty
- neřešit business logiku
- postavit referenční Herbatika skin vedle
- ověřit, co jde řešit čistě přes app token chain a co je skutečný API gap

## Aktuální surface

- `app-specific/`
- `buttons/`
- `badges/`
- `header/`
- `footer/`
- `product-card/`
- `search-form/`
- `select/`
- `numeric-input/`
- `checkout/`
- `all/`

## Figma button inventory

V předloze se aktuálně vyskytují 4 základní button surface:

1. `Button - CTA`
   - label: `Zistiť viac`
   - doporučený mapping:
   - `Button theme="solid" variant="primary" size="md"`

2. `Button - Add to cart`
   - label: `Do košíka`
   - doporučený mapping:
   - `Button theme="solid" variant="primary" size="md" icon="token-icon-cart"`

3. `Button - View more`
   - label: `Zobraziť všetky`
   - doporučený mapping:
   - `LinkButton theme="unstyled" variant="secondary" size="current" icon="token-icon-chevron-right" iconPosition="right"`

4. `Button - CTA`
   - label: `Odporúčame`
   - doporučený mapping:
   - `Button theme="outlined" variant="primary" size="md"`

## Ready surfaces

Aktuálně mají první reálný showcase:

- `app-specific/`
- `buttons/`
- `badges/`
- `header/`
- `footer/`
- `product-card/`
- `search-form/`
- `select/`
- `numeric-input/`
- `checkout/`

Souhrnný kontrolní canvas:

- `all/`

## Pravidla

- nejdřív upravit `tokens-2/`, ne produkční JSX
- layout/composition `className` je v pořádku
- appearance drift má jít nejdřív do tokenů
- když to nejde přes props + tokeny, teprve potom se zapisuje API gap

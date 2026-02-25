# Zerops x Medusa.js

> [!CAUTION]
> Experimental recipe

<br/>

## Local DB schema note

When running this repository's Docker Compose stack:

- `DATABASE_URL` is generated from root `.env` (`DC_MEDUSA_APP_DB_*`)
- `MEDUSA_DATABASE_SCHEMA` must match the app schema grants (default `medusa`)

This repository sets both `MEDUSA_DATABASE_SCHEMA` and `DATABASE_SCHEMA` from `DC_MEDUSA_APP_DB_SCHEMA` to keep Medusa's shared PG connection and module connections aligned.

<br/>

## Medusa.js + Next.js ecommerce starter 

### Development / non highly available variant
[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/green/deploy-button.svg)](https://app.zerops.io/recipe/medusa-next-devel)

### Production / highly available variant
[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/green/deploy-button.svg)](https://app.zerops.io/recipe/medusa-next-prod)

<br/>
<br/>

## Medusa.js + Analog.js + spartan.ng ecommerce starter

### Development / non highly available variant (with Next.js storefront service for reference)
[![Deploy on Zerops](https://github.com/zeropsio/recipe-shared-assets/blob/main/deploy-button/green/deploy-button.svg)](https://app.zerops.io/recipe/medusa-analog-devel)

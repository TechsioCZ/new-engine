# @techsio/smart-suggest-validation

Validation and carrier policy package for Smart Suggest.

## Phone Validation Entrypoints

- `@techsio/smart-suggest-validation`: backwards-compatible strict entrypoint.
  `validatePhoneNumber` imports the full strict phone metadata.
- `@techsio/smart-suggest-validation/phone-lite`: browser-safe mode contract,
  phone input hints, shared phone types, and cheap shape validation. This
  entrypoint must stay free of strict phone metadata imports.
- `@techsio/smart-suggest-validation/phone-strict`: strict
  `validatePhoneNumber` for eager imports or lazy browser imports when callers
  accept the bundle cost.

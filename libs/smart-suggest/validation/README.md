# @techsio/smart-suggest-validation

Validation and carrier policy package for Smart Suggest.

## Phone Validation Entrypoints

- `@techsio/smart-suggest-validation`: browser-safe default entrypoint.
  `validatePhoneNumber` is the lite validator and does not import strict phone
  metadata. Strict phone callers must migrate to the strict subpath below.
- `@techsio/smart-suggest-validation/phone-lite`: browser-safe mode contract,
  phone input hints, shared phone types, and cheap shape validation. This
  entrypoint must stay free of strict phone metadata imports.
- `@techsio/smart-suggest-validation/phone-strict`: strict
  `validatePhoneNumber` for eager imports or lazy browser imports when callers
  accept the bundle cost.
- `@techsio/smart-suggest-validation/phone-strict-effect`: Effect-native strict
  `validatePhoneNumberEffect` and `validatePhoneNumberStrictEffect`. Invalid
  phones fail with `PhoneValidationError` instead of succeeding with an error
  result.
- `@techsio/smart-suggest-validation/effect`: browser-safe Effect validators for
  lite phone checks and postal codes.
- `@techsio/smart-suggest-validation/schemas`: Schema-backed validation request,
  result, and error contracts.
- `@techsio/smart-suggest-validation/packeta-strict`: strict Packeta contact
  validation for server or explicit strict frontend imports.

### Bundle Modes

- `server-only`: import root or `phone-lite`, run lite validation in the browser,
  then send the value to the server for strict validation.
- `frontend-lazy`: import `phone-lite` up front and dynamically import
  `phone-strict` after user interaction.
- `frontend-immediate`: explicitly import `phone-strict` up front when the caller
  accepts the strict metadata bundle.

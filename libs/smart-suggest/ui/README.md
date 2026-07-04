# @techsio/smart-suggest-ui

Smart Suggest domain UI wrappers built from Design System primitives.

## Phone Validation Modes

`PhoneValidationField` defaults to `validationMode="server-only"`, so the UI
package does not import strict `libphonenumber-js` validation at module load.
Callers can provide `validatePhoneNumber` for an async server validator, opt
into `frontend-lazy` to load strict validation after field interaction, or use
`frontend-immediate` to load strict validation as soon as the component mounts.

The default path imports only
`@techsio/smart-suggest-validation/phone-lite`. Frontend validation modes load
`@techsio/smart-suggest-validation/phone-strict` through a dynamic import
boundary so strict metadata stays out of server-only bundles.

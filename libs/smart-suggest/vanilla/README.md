# @techsio/smart-suggest-vanilla

Tiny optional JavaScript SDK for old PHP-core forms.

## Browser usage

The deployable Smart Suggest app serves the generated SDK at:

```html
<script type="module" src="/sdk/techsio-smart-suggest.js"></script>
```

Then attach it to existing PHP-rendered checkout fields:

```html
<script type="module">
  window.TechsioSmartSuggest?.attach({
    addressLine: "#address-line",
    city: "#city",
    country: "#country",
    phone: "#phone",
    postalCode: "#postal-code",
  });
</script>
```

The SDK calls only `/api/v1/*` endpoints and fails open. If the script, API, or
provider fails, the form remains a normal manual checkout form.

Expected field autocomplete attributes:

- `addressLine`: `autocomplete="address-line1"`
- `city`: `autocomplete="address-level2"`
- `postalCode`: `autocomplete="postal-code"`
- `country`: `autocomplete="country"`
- `phone`: `autocomplete="tel"`

Local old-core fixture: `/sdk/demo.html` in the Smart Suggest app.

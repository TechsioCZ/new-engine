import { useModernI18n } from '@modern-js/plugin-i18n/runtime';
import { PhoneValidationField } from '@techsio/smart-suggest-ui/phone-validation-field';
import { PostalValidationField } from '@techsio/smart-suggest-ui/postal-validation-field';
import type { AddressParts, SmartSuggestRequest } from '@techsio/smart-suggest-core';
import type { PhoneInputCountry } from '@techsio/ui-kit/molecules/phone-input';
import { Effect } from 'effect';
import { useMemo, useState } from 'react';
import { createSmartSuggestApiClient, runEffectRequest } from '../api/smart-suggest-client';
import { SmartSuggestAddressFieldRemote } from '../federation/smart-suggest-address-field';
import type { SmartSuggestAddressFieldRemoteProps } from '../federation/smart-suggest-address-field';
import { ultramodernUiMarker } from '../ultramodern-build';
import ShellFrame from './shell-frame';
import { UltramodernRouteHead } from './ultramodern-route-head';

type SupportedDemoCountry = 'CZ' | 'SK';

const supportedCountries: readonly SupportedDemoCountry[] = ['CZ', 'SK'];

type DemoSmartSuggestClient = NonNullable<SmartSuggestAddressFieldRemoteProps['client']>;

const toError = (error: unknown) =>
  error instanceof Error ? error : new Error('Smart Suggest request failed.');

const normalizeClientEffect = <TValue,>(
  effect: Effect.Effect<TValue, Error, never>,
): Effect.Effect<TValue, Error, never> => effect.pipe(Effect.mapError(toError));

const toSuggestQuery = (request: SmartSuggestRequest) => ({
  kind: request.kind,
  q: request.query,
  ...(request.countryCode === undefined ? {} : { countryCode: request.countryCode }),
  ...(request.language === undefined ? {} : { language: request.language }),
  ...(request.limit === undefined ? {} : { limit: request.limit }),
  ...(request.tenant?.tenantId === undefined ? {} : { tenantId: request.tenant.tenantId }),
  ...(request.tenant?.salesChannelId === undefined
    ? {}
    : { salesChannelId: request.tenant.salesChannelId }),
  ...(request.tenant?.cartId === undefined ? {} : { cartId: request.tenant.cartId }),
  ...(request.tenant?.sessionId === undefined ? {} : { sessionId: request.tenant.sessionId }),
});

const createDemoSmartSuggestClient = (): DemoSmartSuggestClient => {
  const apiClient = createSmartSuggestApiClient({ baseUrl: '/api' });

  return {
    accept: (event) =>
      normalizeClientEffect(
        apiClient.pipe(Effect.flatMap((client) => client.accept({ payload: event }))),
      ),
    suggest: (request) =>
      normalizeClientEffect(
        apiClient.pipe(
          Effect.flatMap((client) => client.suggest({ query: toSuggestQuery(request) })),
        ),
      ),
    validatePhone: (request) =>
      normalizeClientEffect(
        apiClient.pipe(Effect.flatMap((client) => client.validatePhone({ payload: request }))),
      ),
    validatePostal: (request) =>
      normalizeClientEffect(
        apiClient.pipe(Effect.flatMap((client) => client.validatePostal({ payload: request }))),
      ),
  };
};

const compact = (parts: readonly (string | undefined)[]) =>
  parts
    .map((part) => part?.trim())
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(' ');

const addressLineFromParts = (address: AddressParts) =>
  address.line1?.trim() ||
  compact([address.street, compact([address.houseNumber, address.orientationNumber])]);

const normalizeDemoCountry = (countryCode: string | undefined): SupportedDemoCountry =>
  countryCode === 'SK' ? 'SK' : 'CZ';

const renderAddressSuggestion = (suggestion: { displayLabel: string }) => (
  <span className="shell:block shell:min-w-0 shell:truncate shell:text-sm shell:font-semibold shell:text-stone-950">
    {suggestion.displayLabel}
  </span>
);

export default function SmartSuggestDemoPage() {
  const { i18nInstance, language } = useModernI18n();
  const t = i18nInstance['t'].bind(i18nInstance);
  const smartSuggestClient = useMemo(() => createDemoSmartSuggestClient(), []);
  const phoneCountries: PhoneInputCountry[] = supportedCountries.map((country) => {
    const name = t(`shell.demo.countries.${country}`);

    return { label: name, name, value: country };
  });
  const [countryCode, setCountryCode] = useState<SupportedDemoCountry>('CZ');
  const [addressInput, setAddressInput] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressParts | undefined>();
  const selectedLine = selectedAddress === undefined ? '' : addressLineFromParts(selectedAddress);
  const hasSelectedAddress = selectedLine.length > 0 || city.length > 0 || postalCode.length > 0;

  const handleAddressSelect = (address: AddressParts) => {
    const nextCountryCode = normalizeDemoCountry(address.countryCode);
    const nextLine = addressLineFromParts(address);

    setSelectedAddress(address);
    setCountryCode(nextCountryCode);
    setAddressInput(nextLine);
    setCity(address.city?.trim() ?? '');
    setPostalCode(address.postalCode?.trim() ?? '');
  };

  return (
    <ShellFrame>
      <UltramodernRouteHead />
      <section className="smart-suggest-demo-page shell:mx-auto shell:grid shell:min-w-0 shell:max-w-6xl shell:gap-6 shell:py-8 shell:lg:grid-cols-[minmax(0,1fr)_22rem]">
        <form
          className="smart-suggest-demo shell:grid shell:min-w-0 shell:gap-5 shell:rounded-lg shell:border shell:border-stone-900/10 shell:bg-white shell:p-5 shell:shadow-xl shell:shadow-stone-900/10 shell:sm:p-6"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="shell:grid shell:gap-2">
            <p className="shell:text-sm shell:font-semibold shell:text-emerald-800">
              {t('shell.demo.eyebrow')}
            </p>
            <h1 className="shell:break-words shell:text-3xl shell:font-black shell:leading-tight shell:tracking-normal shell:text-stone-950 shell:sm:text-5xl">
              {t('shell.demo.title')}
            </h1>
          </div>

          <div className="shell:grid shell:gap-4 shell:md:grid-cols-2">
            <label className="shell:grid shell:gap-2 shell:text-sm shell:font-bold shell:text-stone-800">
              {t('shell.demo.name')}
              <input
                autoComplete="name"
                className="shell:min-h-12 shell:rounded-lg shell:border shell:border-stone-900/15 shell:bg-white shell:px-4 shell:text-base shell:font-semibold shell:text-stone-950 shell:shadow-sm shell:shadow-stone-900/5 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
                name="name"
                required
                type="text"
              />
            </label>
            <label className="shell:grid shell:gap-2 shell:text-sm shell:font-bold shell:text-stone-800">
              {t('shell.demo.email')}
              <input
                autoComplete="email"
                className="shell:min-h-12 shell:rounded-lg shell:border shell:border-stone-900/15 shell:bg-white shell:px-4 shell:text-base shell:font-semibold shell:text-stone-950 shell:shadow-sm shell:shadow-stone-900/5 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
                name="email"
                required
                type="email"
              />
            </label>
          </div>

          <SmartSuggestAddressFieldRemote
            autoComplete="address-line1"
            client={smartSuggestClient}
            countryCode={countryCode}
            helpText={hasSelectedAddress ? t('shell.demo.addressSelected') : undefined}
            id="delivery-address"
            inputValue={addressInput}
            label={t('shell.demo.address')}
            language={language}
            name="address-line1"
            noResultsMessage={t('shell.demo.noAddress')}
            onAddressSelect={handleAddressSelect}
            onInputValueChange={(value) => {
              setAddressInput(value);
              setSelectedAddress(undefined);
            }}
            placeholder={t('shell.demo.addressPlaceholder')}
            renderSuggestion={renderAddressSuggestion}
            required
            size="md"
            suggestUnavailableMessage={t('shell.demo.addressUnavailable')}
          />

          <div className="shell:grid shell:gap-4 shell:md:grid-cols-[minmax(0,1fr)_10rem_8rem]">
            <label className="shell:grid shell:gap-2 shell:text-sm shell:font-bold shell:text-stone-800">
              {t('shell.demo.city')}
              <input
                autoComplete="address-level2"
                className="shell:min-h-12 shell:rounded-lg shell:border shell:border-stone-900/15 shell:bg-white shell:px-4 shell:text-base shell:font-semibold shell:text-stone-950 shell:shadow-sm shell:shadow-stone-900/5 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
                name="address-level2"
                onChange={(event) => setCity(event.currentTarget.value)}
                required
                type="text"
                value={city}
              />
            </label>
            <PostalValidationField
              countryCode={countryCode}
              id="delivery-postal-code"
              label={t('shell.demo.postalCode')}
              name="postal-code"
              onChange={(event) => setPostalCode(event.currentTarget.value)}
              required
              value={postalCode}
            />
            <label className="shell:grid shell:gap-2 shell:text-sm shell:font-bold shell:text-stone-800">
              {t('shell.demo.country')}
              <select
                autoComplete="country"
                className="shell:min-h-12 shell:rounded-lg shell:border shell:border-stone-900/15 shell:bg-white shell:px-4 shell:text-base shell:font-black shell:text-stone-950 shell:shadow-sm shell:shadow-stone-900/5 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
                name="country"
                onChange={(event) =>
                  setCountryCode(normalizeDemoCountry(event.currentTarget.value))
                }
                value={countryCode}
              >
                {supportedCountries.map((country) => (
                  <option key={country} value={country}>
                    {t(`shell.demo.countries.${country}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <PhoneValidationField
            allowedCountries={supportedCountries}
            countries={phoneCountries}
            country={countryCode}
            countryName="phone-country"
            label={t('shell.demo.phone')}
            name="phone"
            onCountryChange={(details) => setCountryCode(normalizeDemoCountry(details.country))}
            onValueChange={(details) => setPhone(details.value)}
            requireCountryMatch
            required
            validatePhoneNumber={(request) =>
              runEffectRequest(smartSuggestClient.validatePhone(request))
            }
            validationMode="server-only"
            value={phone}
          />

          <label className="shell:grid shell:gap-2 shell:text-sm shell:font-bold shell:text-stone-800">
            {t('shell.demo.note')}
            <textarea
              autoComplete="off"
              className="shell:min-h-24 shell:resize-y shell:rounded-lg shell:border shell:border-stone-900/15 shell:bg-white shell:px-4 shell:py-3 shell:text-base shell:font-semibold shell:text-stone-950 shell:shadow-sm shell:shadow-stone-900/5 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
              name="delivery-note"
            />
          </label>

          <button
            className="shell:min-h-12 shell:rounded-lg shell:bg-stone-950 shell:px-5 shell:text-base shell:font-black shell:text-white shell:shadow-lg shell:shadow-stone-900/15 shell:transition-colors shell:hover:bg-emerald-900 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/50 shell:motion-reduce:transition-none"
            type="submit"
          >
            {t('shell.demo.submit')}
          </button>
        </form>

        <aside className="shell:min-w-0 shell:rounded-lg shell:border shell:border-emerald-900/10 shell:bg-emerald-50 shell:p-5 shell:text-stone-950 shell:shadow-xl shell:shadow-stone-900/10">
          <h2 className="shell:text-xl shell:font-black shell:tracking-normal">
            {t('shell.demo.summaryTitle')}
          </h2>
          <dl className="shell:mt-5 shell:grid shell:gap-4">
            <div>
              <dt className="shell:text-xs shell:font-black shell:uppercase shell:tracking-normal shell:text-stone-500">
                {t('shell.demo.address')}
              </dt>
              <dd className="shell:mt-1 shell:text-base shell:font-bold shell:text-stone-950">
                {selectedLine || addressInput || t('shell.demo.emptyValue')}
              </dd>
            </div>
            <div>
              <dt className="shell:text-xs shell:font-black shell:uppercase shell:tracking-normal shell:text-stone-500">
                {t('shell.demo.city')}
              </dt>
              <dd className="shell:mt-1 shell:text-base shell:font-bold shell:text-stone-950">
                {city || t('shell.demo.emptyValue')}
              </dd>
            </div>
            <div>
              <dt className="shell:text-xs shell:font-black shell:uppercase shell:tracking-normal shell:text-stone-500">
                {t('shell.demo.postalCode')}
              </dt>
              <dd className="shell:mt-1 shell:text-base shell:font-bold shell:text-stone-950">
                {postalCode || t('shell.demo.emptyValue')}
              </dd>
            </div>
          </dl>
        </aside>
      </section>
      <span
        aria-hidden="true"
        data-build-marker={ultramodernUiMarker.build}
        data-testid="ultramodern-ui-marker"
        hidden
      />
    </ShellFrame>
  );
}

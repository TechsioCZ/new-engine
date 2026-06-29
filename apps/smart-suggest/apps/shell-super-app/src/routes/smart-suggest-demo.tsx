import { useModernI18n } from '@modern-js/plugin-i18n/runtime';
import { PhoneValidationField } from '@techsio/smart-suggest-ui/phone-validation-field';
import { PostalValidationField } from '@techsio/smart-suggest-ui/postal-validation-field';
import type { AddressParts, SmartSuggestRequest } from '@techsio/smart-suggest-core';
import type { PhoneInputCountry } from '@techsio/ui-kit/molecules/phone-input';
import { Effect } from 'effect';
import { type FormEvent, useMemo, useState } from 'react';
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
  error instanceof Error ? error : new Error('Address lookup failed.');

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
  <span className="shell:block shell:min-w-0 shell:truncate shell:text-sm shell:font-bold shell:text-stone-950">
    {suggestion.displayLabel}
  </span>
);

const formatDeliveryAddress = (line: string, city: string, postalCode: string) =>
  compact([line, compact([postalCode, city])]);

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
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const selectedLine = selectedAddress === undefined ? '' : addressLineFromParts(selectedAddress);
  const deliveryLine = selectedLine || addressInput.trim();
  const formattedDeliveryAddress = formatDeliveryAddress(deliveryLine, city, postalCode);
  const hasDeliveryAddress = formattedDeliveryAddress.length > 0;

  const markDeliveryChanged = () => setDeliveryConfirmed(false);

  const handleAddressSelect = (address: AddressParts) => {
    const nextCountryCode = normalizeDemoCountry(address.countryCode);
    const nextLine = addressLineFromParts(address);

    setSelectedAddress(address);
    setCountryCode(nextCountryCode);
    setAddressInput(nextLine);
    setCity(address.city?.trim() ?? '');
    setPostalCode(address.postalCode?.trim() ?? '');
    setDeliveryConfirmed(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!event.currentTarget.reportValidity()) {
      return;
    }

    setDeliveryConfirmed(true);
  };

  return (
    <ShellFrame>
      <UltramodernRouteHead />
      <section className="smart-suggest-demo-page shell:mx-auto shell:grid shell:min-w-0 shell:max-w-6xl shell:gap-6 shell:py-5 shell:lg:grid-cols-[minmax(0,1fr)_22rem] shell:lg:py-8">
        <form
          action="/checkout"
          className="smart-suggest-demo shell:grid shell:min-w-0 shell:gap-5 shell:rounded-lg shell:border shell:border-stone-900/10 shell:bg-white shell:p-5 shell:shadow-xl shell:shadow-stone-900/10 shell:sm:p-6"
          method="post"
          onSubmit={handleSubmit}
        >
          <div className="shell:grid shell:gap-2">
            <p className="shell:text-sm shell:font-black shell:text-teal-800">
              {t('shell.demo.eyebrow')}
            </p>
            <h1 className="shell:break-words shell:text-3xl shell:font-black shell:leading-tight shell:tracking-normal shell:text-stone-950 shell:sm:text-5xl">
              {t('shell.demo.title')}
            </h1>
            <p className="shell:max-w-2xl shell:text-base shell:font-semibold shell:leading-7 shell:text-stone-600">
              {t('shell.demo.subtitle')}
            </p>
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
            helpText={selectedAddress === undefined ? undefined : t('shell.demo.addressSelected')}
            id="address-line"
            inputValue={addressInput}
            label={t('shell.demo.address')}
            language={language}
            name="address-line1"
            noResultsMessage={t('shell.demo.noAddress')}
            onAddressSelect={handleAddressSelect}
            onInputValueChange={(value) => {
              setAddressInput(value);
              setSelectedAddress(undefined);
              markDeliveryChanged();
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
                id="city"
                name="address-level2"
                onChange={(event) => {
                  setCity(event.currentTarget.value);
                  markDeliveryChanged();
                }}
                required
                type="text"
                value={city}
              />
            </label>
            <PostalValidationField
              countryCode={countryCode}
              id="postal-code"
              label={t('shell.demo.postalCode')}
              name="postal-code"
              onChange={(event) => {
                setPostalCode(event.currentTarget.value);
                markDeliveryChanged();
              }}
              required
              value={postalCode}
            />
            <label className="shell:grid shell:gap-2 shell:text-sm shell:font-bold shell:text-stone-800">
              {t('shell.demo.country')}
              <select
                autoComplete="country"
                className="shell:min-h-12 shell:rounded-lg shell:border shell:border-stone-900/15 shell:bg-white shell:px-4 shell:text-base shell:font-black shell:text-stone-950 shell:shadow-sm shell:shadow-stone-900/5 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
                id="country"
                name="country"
                onChange={(event) => {
                  setCountryCode(normalizeDemoCountry(event.currentTarget.value));
                  markDeliveryChanged();
                }}
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
            id="phone"
            label={t('shell.demo.phone')}
            name="phone"
            onCountryChange={(details) => {
              setCountryCode(normalizeDemoCountry(details.country));
              markDeliveryChanged();
            }}
            onValueChange={(details) => {
              setPhone(details.value);
              markDeliveryChanged();
            }}
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
              onChange={markDeliveryChanged}
            />
          </label>

          <button
            className="shell:min-h-12 shell:rounded-lg shell:bg-stone-950 shell:px-5 shell:text-base shell:font-black shell:text-white shell:shadow-lg shell:shadow-stone-900/15 shell:transition-colors shell:hover:bg-teal-900 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/50 shell:motion-reduce:transition-none"
            type="submit"
          >
            {t('shell.demo.submit')}
          </button>
        </form>

        <aside className="shell:grid shell:min-w-0 shell:content-start shell:gap-4 shell:rounded-lg shell:border shell:border-stone-900/10 shell:bg-[#fff8e8] shell:p-5 shell:text-stone-950 shell:shadow-xl shell:shadow-stone-900/10">
          <div className="shell:grid shell:gap-1">
            <p className="shell:text-sm shell:font-black shell:text-rose-800">
              {t('shell.demo.order.eyebrow')}
            </p>
            <h2 className="shell:text-2xl shell:font-black shell:tracking-normal">
              {t('shell.demo.order.title')}
            </h2>
            <p className="shell:text-sm shell:font-semibold shell:leading-6 shell:text-stone-600">
              {t('shell.demo.order.window')}
            </p>
          </div>

          <ul className="shell:grid shell:list-none shell:gap-3 shell:p-0">
            <li className="shell:flex shell:items-start shell:justify-between shell:gap-4 shell:border-t shell:border-stone-900/10 shell:pt-3">
              <span className="shell:min-w-0 shell:text-sm shell:font-bold shell:text-stone-800">
                {t('shell.demo.order.items.tea')}
              </span>
              <span className="shell:shrink-0 shell:text-sm shell:font-black shell:text-stone-950">
                {t('shell.demo.order.prices.tea')}
              </span>
            </li>
            <li className="shell:flex shell:items-start shell:justify-between shell:gap-4 shell:border-t shell:border-stone-900/10 shell:pt-3">
              <span className="shell:min-w-0 shell:text-sm shell:font-bold shell:text-stone-800">
                {t('shell.demo.order.items.vitamins')}
              </span>
              <span className="shell:shrink-0 shell:text-sm shell:font-black shell:text-stone-950">
                {t('shell.demo.order.prices.vitamins')}
              </span>
            </li>
            <li className="shell:flex shell:items-start shell:justify-between shell:gap-4 shell:border-t shell:border-stone-900/10 shell:pt-3">
              <span className="shell:min-w-0 shell:text-sm shell:font-bold shell:text-stone-800">
                {t('shell.demo.order.delivery')}
              </span>
              <span className="shell:shrink-0 shell:text-sm shell:font-black shell:text-teal-800">
                {t('shell.demo.order.free')}
              </span>
            </li>
          </ul>

          <div className="shell:flex shell:items-center shell:justify-between shell:gap-4 shell:border-t shell:border-stone-950 shell:pt-4">
            <span className="shell:text-base shell:font-black">{t('shell.demo.order.total')}</span>
            <span className="shell:text-xl shell:font-black">
              {t('shell.demo.order.totalPrice')}
            </span>
          </div>

          <div className="shell:rounded-lg shell:border shell:border-stone-900/10 shell:bg-white shell:p-4">
            <p className="shell:text-xs shell:font-black shell:uppercase shell:tracking-normal shell:text-stone-500">
              {deliveryConfirmed
                ? t('shell.demo.order.confirmedLabel')
                : t('shell.demo.order.deliveryLabel')}
            </p>
            <p className="shell:mt-2 shell:text-base shell:font-black shell:leading-6 shell:text-stone-950">
              {hasDeliveryAddress ? formattedDeliveryAddress : t('shell.demo.order.waiting')}
            </p>
            {phone.trim().length > 0 ? (
              <p className="shell:mt-2 shell:text-sm shell:font-semibold shell:text-stone-600">
                {phone}
              </p>
            ) : null}
            {deliveryConfirmed ? (
              <p className="shell:mt-3 shell:text-sm shell:font-black shell:text-teal-800">
                {t('shell.demo.order.confirmed')}
              </p>
            ) : null}
          </div>
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

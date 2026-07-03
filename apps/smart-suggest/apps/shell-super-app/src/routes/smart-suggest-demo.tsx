import { useModernI18n } from '@modern-js/plugin-i18n/runtime';
import type { AddressParts } from '@techsio/smart-suggest-core';
import { Button } from '@techsio/ui-kit/atoms/button';
import { Label } from '@techsio/ui-kit/atoms/label';
import { StatusText } from '@techsio/ui-kit/atoms/status-text';
import { Textarea } from '@techsio/ui-kit/atoms/textarea';
import { FormInput } from '@techsio/ui-kit/molecules/form-input';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { ultramodernUiMarker } from '../ultramodern-build';
import ShellFrame from './shell-frame';
import {
  getAddressStatus,
  getCheckoutCopy,
  shouldOfferManualEntry,
  shouldShowAddressStatusIcon,
} from './smart-suggest-demo-state';
import type { DemoAddressSuggestState } from './smart-suggest-demo-state';
import { UltramodernRouteHead } from './ultramodern-route-head';

type SupportedDemoCountry = 'CZ' | 'SK';

interface SmartSuggestBrowserSuggestion {
  readonly address?: AddressParts;
  readonly displayLabel: string;
  readonly id: string;
}

interface SmartSuggestBrowserSelection {
  readonly requestId: string;
  readonly suggestion: SmartSuggestBrowserSuggestion;
}

type SmartSuggestBrowserSuggestState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly reason: 'country-scope'; readonly status: 'blocked' }
  | { readonly error: unknown; readonly status: 'error' }
  | {
      readonly requestId: string;
      readonly status: 'success';
      readonly suggestions: readonly SmartSuggestBrowserSuggestion[];
    };

interface SmartSuggestBrowserInstance {
  readonly destroy: () => void;
}

interface SmartSuggestBrowserGlobal {
  readonly attach: (config: {
    readonly addressLine: string;
    readonly apiBaseUrl: string;
    readonly city: string;
    readonly country: string;
    readonly countryCode: SupportedDemoCountry;
    readonly countryCodes: readonly SupportedDemoCountry[];
    readonly language: string;
    readonly limit: number;
    readonly minQueryLength: number;
    readonly onError?: (error: unknown) => void;
    readonly onSuggestStateChange: (state: SmartSuggestBrowserSuggestState) => void;
    readonly onSuggestionSelect: (selection: SmartSuggestBrowserSelection) => void;
    readonly optionClassName: string;
    readonly phone: string;
    readonly phoneValidationMode: 'server-only';
    readonly postalCode: string;
  }) => SmartSuggestBrowserInstance;
}

declare global {
  interface Window {
    TechsioSmartSuggest?: SmartSuggestBrowserGlobal;
  }
}

const ADDRESS_SUGGESTION_LIMIT = 20;
const SDK_ATTACH_MAX_ATTEMPTS = 100;
const SDK_ATTACH_RETRY_DELAY_MS = 25;
const supportedCountries: readonly SupportedDemoCountry[] = ['CZ'];
const smartSuggestOptionClassName =
  'shell:block shell:min-w-0 shell:whitespace-normal shell:break-words';

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

const formatDeliveryAddress = (line: string, city: string, postalCode: string) =>
  compact([line, compact([postalCode, city])]);

const mapSdkSuggestState = (state: SmartSuggestBrowserSuggestState): DemoAddressSuggestState => {
  switch (state.status) {
    case 'success': {
      return { data: { suggestions: state.suggestions }, status: 'success' };
    }
    case 'error': {
      return { status: 'error' };
    }
    case 'loading': {
      return { status: 'loading' };
    }
    case 'blocked': {
      return { status: 'blocked' };
    }
    case 'idle': {
      return { status: 'idle' };
    }
    default: {
      return { status: 'idle' };
    }
  }
};

export default function SmartSuggestDemoPage() {
  const { i18nInstance, language } = useModernI18n();
  const t = i18nInstance['t'].bind(i18nInstance);
  const copy = getCheckoutCopy(language);
  const [countryCode, setCountryCode] = useState<SupportedDemoCountry>('CZ');
  const [addressInput, setAddressInput] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<AddressParts | undefined>();
  const [postalLocalitySelected, setPostalLocalitySelected] = useState(false);
  const [manualAddress, setManualAddress] = useState(false);
  const [addressSuggestState, setAddressSuggestState] = useState<DemoAddressSuggestState>({
    status: 'idle',
  });
  const [submitMessage, setSubmitMessage] = useState<string | undefined>();
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const selectedLine = selectedAddress === undefined ? '' : addressLineFromParts(selectedAddress);
  const deliveryLine = selectedLine || addressInput.trim();
  const formattedDeliveryAddress = formatDeliveryAddress(deliveryLine, city, postalCode);
  const hasDeliveryAddress = formattedDeliveryAddress.length > 0;
  const canOfferManualEntry = shouldOfferManualEntry({
    addressInput,
    addressSuggestState,
    manualAddress,
    selectedAddress,
  });

  const markDeliveryChanged = useCallback(() => {
    setPostalLocalitySelected(false);
    setDeliveryConfirmed(false);
    setSubmitMessage(undefined);
  }, []);

  const handleAddressSelect = useCallback((address: AddressParts) => {
    const nextCountryCode = normalizeDemoCountry(address.countryCode);
    const nextLine = addressLineFromParts(address);
    const hasAddressLine = nextLine.length > 0;

    setSelectedAddress(hasAddressLine ? address : undefined);
    setPostalLocalitySelected(
      !hasAddressLine && (address.city !== undefined || address.postalCode !== undefined),
    );
    setManualAddress(false);
    setCountryCode(nextCountryCode);
    if (hasAddressLine) {
      setAddressInput(nextLine);
    }
    setCity(address.city?.trim() ?? '');
    setPostalCode(address.postalCode?.trim() ?? '');
    setDeliveryConfirmed(false);
    setSubmitMessage(undefined);
  }, []);

  useEffect(() => {
    let isActive = true;
    let sdkInstance: SmartSuggestBrowserInstance | undefined;
    let sdkAttachRetryId: number | undefined;
    let sdkAttachAttempts = 0;
    const attachSdkRef: { current?: () => void } = {};
    let sdkScript: HTMLScriptElement | null = document.querySelector(
      'script[data-smart-suggest-sdk]',
    );

    const clearSdkAttachRetry = () => {
      if (sdkAttachRetryId !== undefined) {
        window.clearTimeout(sdkAttachRetryId);
        sdkAttachRetryId = undefined;
      }
    };

    const handleSdkLoadError = () => {
      if (isActive) {
        setAddressSuggestState({ status: 'error' });
      }
    };

    const scheduleSdkAttachRetry = () => {
      if (!isActive || sdkInstance !== undefined) {
        return;
      }

      if (sdkAttachAttempts >= SDK_ATTACH_MAX_ATTEMPTS) {
        handleSdkLoadError();
        return;
      }

      sdkAttachAttempts += 1;
      clearSdkAttachRetry();
      sdkAttachRetryId = window.setTimeout(() => {
        attachSdkRef.current?.();
      }, SDK_ATTACH_RETRY_DELAY_MS);
    };

    const attachSdk = () => {
      if (!isActive || sdkInstance !== undefined) {
        return;
      }

      const smartSuggest = window.TechsioSmartSuggest;
      if (smartSuggest === undefined) {
        scheduleSdkAttachRetry();
        return;
      }

      clearSdkAttachRetry();
      sdkInstance = smartSuggest.attach({
        addressLine: '#address-line',
        apiBaseUrl: '/api',
        city: '#city',
        country: '#country',
        countryCode,
        countryCodes: supportedCountries,
        language,
        limit: ADDRESS_SUGGESTION_LIMIT,
        minQueryLength: 1,
        onSuggestStateChange: (state) => {
          setAddressSuggestState(mapSdkSuggestState(state));
        },
        onSuggestionSelect: ({ suggestion }) => {
          if (suggestion.address !== undefined) {
            handleAddressSelect(suggestion.address);
          }
        },
        optionClassName: smartSuggestOptionClassName,
        phone: '#phone',
        phoneValidationMode: 'server-only',
        postalCode: '#postal-code',
      });
    };
    attachSdkRef.current = attachSdk;

    if (window.TechsioSmartSuggest === undefined) {
      if (sdkScript === null) {
        sdkScript = document.createElement('script');
        sdkScript.dataset['smartSuggestSdk'] = 'true';
        sdkScript.src = '/sdk/techsio-smart-suggest.js';
        sdkScript.type = 'module';
      }

      sdkScript.addEventListener('load', attachSdk);
      sdkScript.addEventListener('error', handleSdkLoadError);
      if (!sdkScript.isConnected) {
        document.head.append(sdkScript);
      }
      scheduleSdkAttachRetry();
    } else {
      attachSdk();
    }

    return () => {
      isActive = false;
      clearSdkAttachRetry();
      sdkInstance?.destroy();
      sdkScript?.removeEventListener('load', attachSdk);
      sdkScript?.removeEventListener('error', handleSdkLoadError);
    };
  }, [countryCode, handleAddressSelect, language]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (event.defaultPrevented) {
      return;
    }

    event.preventDefault();

    const formIsValid = event.currentTarget.reportValidity();

    if (formIsValid === false) {
      setSubmitMessage(copy.formInvalid);
      setDeliveryConfirmed(false);
      return;
    }

    setSubmitMessage(copy.saved);
    setDeliveryConfirmed(true);
  };

  const addressStatus = getAddressStatus({
    addressInput,
    addressSuggestState,
    copy,
    manualAddress,
    postalLocalitySelected,
    selectedAddress,
  });

  return (
    <ShellFrame>
      <UltramodernRouteHead />
      <section
        aria-labelledby="smart-suggest-demo-title"
        className="shell:mx-auto shell:grid shell:min-w-0 shell:max-w-6xl shell:gap-6 shell:py-5 shell:lg:grid-cols-[minmax(0,1fr)_22rem] shell:lg:py-8"
      >
        <form
          action="/checkout"
          className="shell:grid shell:min-w-0 shell:gap-5 shell:rounded-lg shell:border shell:border-stone-900/10 shell:bg-white shell:p-5 shell:shadow-xl shell:shadow-stone-900/10 shell:sm:p-6"
          data-smart-suggest-countries={supportedCountries.join(',')}
          method="post"
          onSubmit={handleSubmit}
        >
          <div className="shell:grid shell:gap-2">
            <p className="shell:text-sm shell:font-black shell:text-teal-800">
              {t('shell.demo.eyebrow')}
            </p>
            <h1
              className="shell:break-words shell:text-3xl shell:font-black shell:leading-tight shell:tracking-normal shell:text-stone-950 shell:sm:text-4xl"
              id="smart-suggest-demo-title"
            >
              {t('shell.demo.title')}
            </h1>
            <p className="shell:max-w-2xl shell:text-base shell:font-semibold shell:leading-7 shell:text-stone-600">
              {t('shell.demo.subtitle')}
            </p>
            <nav
              aria-label={t('shell.demo.variant.label')}
              className="shell:flex shell:flex-wrap shell:gap-2 shell:pt-2"
            >
              <span
                aria-current="page"
                className="shell:rounded-md shell:bg-stone-950 shell:px-3 shell:py-2 shell:text-sm shell:font-black shell:text-white"
              >
                {t('shell.demo.variant.react')}
              </span>
              <a
                className="shell:rounded-md shell:border shell:border-stone-900/15 shell:bg-white shell:px-3 shell:py-2 shell:text-sm shell:font-black shell:text-stone-800 shell:shadow-sm shell:shadow-stone-900/5 shell:hover:border-teal-700/40 shell:hover:text-teal-800 shell:focus-visible:outline-3 shell:focus-visible:outline-offset-2 shell:focus-visible:outline-emerald-700/40"
                href="/sdk/demo"
              >
                {t('shell.demo.variant.html')}
              </a>
            </nav>
          </div>

          <div className="shell:grid shell:gap-4 shell:md:grid-cols-2">
            <FormInput
              autoComplete="name"
              id="full-name"
              label={t('shell.demo.name')}
              name="name"
              required
              type="text"
            />
            <FormInput
              autoComplete="email"
              id="email"
              label={t('shell.demo.email')}
              name="email"
              required
              type="email"
            />
          </div>

          <div className="shell:grid shell:gap-3">
            <FormInput
              autoComplete="street-address"
              id="address-line"
              label={t('shell.demo.address')}
              name="address-line1"
              onChange={(event) => {
                setAddressInput(event.currentTarget.value);
                setSelectedAddress(undefined);
                setManualAddress(false);
                markDeliveryChanged();
              }}
              placeholder={t('shell.demo.addressPlaceholder')}
              required
              type="text"
              validateStatus={selectedAddress === undefined ? 'default' : 'success'}
              value={addressInput}
            />

            <div className="shell:flex shell:flex-wrap shell:items-center shell:gap-3">
              {addressStatus === undefined ? null : (
                <StatusText
                  aria-live="polite"
                  showIcon={shouldShowAddressStatusIcon(addressStatus.status)}
                  size="sm"
                  status={addressStatus.status}
                >
                  {addressStatus.text}
                </StatusText>
              )}
              {canOfferManualEntry ? (
                <Button
                  icon="token-icon-clipboard"
                  size="sm"
                  theme="outlined"
                  type="button"
                  variant="secondary"
                  aria-pressed={manualAddress}
                  onClick={() => {
                    setManualAddress(true);
                    setSelectedAddress(undefined);
                    setAddressSuggestState({ status: 'idle' });
                    markDeliveryChanged();
                  }}
                >
                  {copy.addressManualAction}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="shell:grid shell:gap-4 shell:md:grid-cols-[minmax(0,1fr)_10rem_10rem]">
            <FormInput
              autoComplete="address-level2"
              id="city"
              label={t('shell.demo.city')}
              name="address-level2"
              onChange={(event) => {
                setCity(event.currentTarget.value);
                setPostalLocalitySelected(false);
                markDeliveryChanged();
              }}
              required
              type="text"
              value={city}
            />
            <FormInput
              autoComplete="postal-code"
              id="postal-code"
              inputMode="numeric"
              label={t('shell.demo.postalCode')}
              name="postal-code"
              onChange={(event) => {
                setPostalCode(event.currentTarget.value);
                setPostalLocalitySelected(false);
                markDeliveryChanged();
              }}
              required
              type="text"
              value={postalCode}
            />
            <div className="shell:grid shell:min-w-0 shell:gap-1.5">
              <Label htmlFor="country" required size="md">
                {t('shell.demo.country')}
              </Label>
              <select
                autoComplete="country"
                className="shell:form-control-base shell:h-form-control-md shell:w-full shell:rounded-select-md shell:border-select-trigger-border shell:bg-select-trigger-bg-base shell:p-select-trigger-md shell:text-select-trigger-md shell:text-input-fg"
                id="country"
                name="country"
                onChange={(event) => {
                  setCountryCode(normalizeDemoCountry(event.currentTarget.value));
                  markDeliveryChanged();
                }}
                required
                value={countryCode}
              >
                {supportedCountries.map((country) => (
                  <option key={country} value={country}>
                    {t(`shell.demo.countries.${country}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormInput
            autoComplete="tel"
            id="phone"
            inputMode="tel"
            label={t('shell.demo.phone')}
            name="phone"
            onChange={(event) => {
              setPhone(event.currentTarget.value);
              markDeliveryChanged();
            }}
            required
            type="tel"
            value={phone}
          />

          <div className="shell:grid shell:gap-2">
            <Label htmlFor="delivery-note" size="md">
              {t('shell.demo.note')}
            </Label>
            <Textarea
              autoComplete="off"
              id="delivery-note"
              name="delivery-note"
              onChange={markDeliveryChanged}
              resize="y"
              rows={3}
            />
          </div>

          {submitMessage === undefined ? null : (
            <StatusText
              aria-live="polite"
              showIcon
              status={deliveryConfirmed ? 'success' : 'error'}
            >
              {submitMessage}
            </StatusText>
          )}

          <Button
            block
            icon="token-icon-chevron-right"
            iconPosition="right"
            size="md"
            type="submit"
            variant="primary"
          >
            {t('shell.demo.submit')}
          </Button>
        </form>

        <aside className="shell:grid shell:min-w-0 shell:content-start shell:gap-4 shell:rounded-lg shell:border shell:border-stone-900/10 shell:bg-um-surface shell:p-5 shell:text-stone-950 shell:shadow-xl shell:shadow-stone-900/10">
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
              <span className="shell:min-w-0 shell:break-words shell:text-sm shell:font-bold shell:text-stone-800">
                {t('shell.demo.order.items.tea')}
              </span>
              <span className="shell:shrink-0 shell:text-sm shell:font-black shell:text-stone-950">
                {t('shell.demo.order.prices.tea')}
              </span>
            </li>
            <li className="shell:flex shell:items-start shell:justify-between shell:gap-4 shell:border-t shell:border-stone-900/10 shell:pt-3">
              <span className="shell:min-w-0 shell:break-words shell:text-sm shell:font-bold shell:text-stone-800">
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
            <p className="shell:mt-2 shell:break-words shell:text-base shell:font-black shell:leading-6 shell:text-stone-950">
              {hasDeliveryAddress ? formattedDeliveryAddress : t('shell.demo.order.waiting')}
            </p>
            {phone.trim().length > 0 ? (
              <p className="shell:mt-2 shell:break-all shell:text-sm shell:font-semibold shell:text-stone-600">
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

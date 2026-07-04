import { describe, expect, it } from 'vitest';
import routeSource from './smart-suggest-demo.tsx?raw';

describe('SmartSuggestDemoPage SDK integration contract', () => {
  it('does not map unrelated SDK errors to address suggestion availability', () => {
    const attachBlock = routeSource.slice(
      routeSource.indexOf('sdkInstance = smartSuggest.attach({'),
      routeSource.indexOf('});', routeSource.indexOf('sdkInstance = smartSuggest.attach({')),
    );

    expect(attachBlock).not.toContain('onError');
    expect(attachBlock).toContain('onSuggestStateChange');
    expect(attachBlock).toContain('setAddressSuggestState(mapSdkSuggestState(state))');
  });

  it('retries SDK attach while the module global is being installed', () => {
    expect(routeSource).toContain('SDK_ATTACH_MAX_ATTEMPTS');
    expect(routeSource).toContain('scheduleSdkAttachRetry()');
    expect(routeSource).toContain('window.setTimeout(() =>');
    expect(routeSource).toContain('attachSdkRef.current?.()');
    expect(routeSource).toContain('if (!sdkScript.isConnected)');
  });

  it('advertises only countries backed by the deployed owned demo dataset', () => {
    expect(routeSource).toContain(
      "const supportedCountries: readonly SupportedDemoCountry[] = ['CZ'];",
    );
    expect(routeSource).not.toContain("['CZ', 'SK']");
  });
});

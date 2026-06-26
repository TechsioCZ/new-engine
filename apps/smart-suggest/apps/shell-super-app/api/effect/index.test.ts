import type { SmartSuggestResponse } from '@techsio/smart-suggest-core';
import { describe, expect, it } from 'vitest';
import { handler } from './index';

interface HealthPayload {
  db: {
    ok: boolean;
  };
  service: string;
}

interface StatusPayload {
  imports: {
    recentRuns: unknown[];
  };
  metrics: {
    accept: {
      total: number;
    };
    suggest: {
      cacheHitRate: number;
      cacheStatus: {
        disabled: number;
        hit: number;
        miss: number;
      };
      total: number;
    };
  };
  service: string;
}

interface PhoneValidationPayload {
  e164?: string;
  isValid: boolean;
}

interface PostalValidationPayload {
  displayValue: string;
  isValid: boolean | 'unknown';
}

const requestFor = (path: string, init?: RequestInit) =>
  new Request(`https://smart-suggest.test${path}`, init);

const readJson = async <TResponse>(response: Response) => (await response.json()) as TResponse;

describe('Smart Suggest effect API', () => {
  it('reports health with storage connectivity', async () => {
    const response = await handler(requestFor('/v1/health'));
    const body = await readJson<HealthPayload>(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      db: { ok: true },
      service: 'smart-suggest',
    });
  });

  it('serves CZ and SK owned-data suggestions through repository search and cache', async () => {
    const firstResponse = await handler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
    );
    const firstBody = await readJson<SmartSuggestResponse>(firstResponse);

    expect(firstBody).toMatchObject({
      cacheStatus: 'miss',
      suggestions: [
        {
          address: { city: 'Praha', countryCode: 'CZ' },
          id: 'cz-ruian-vaclavske-namesti-832-19',
          source: {
            attribution: { label: 'RUIAN sample' },
            kind: 'owned-dataset',
          },
        },
      ],
    });

    const secondResponse = await handler(
      requestFor('/v1/suggest?kind=address&countryCode=CZ&q=vaclavske%20namesti&limit=1'),
    );
    const secondBody = await readJson<SmartSuggestResponse>(secondResponse);

    expect(secondBody).toMatchObject({
      cacheStatus: 'hit',
      suggestions: [{ cacheStatus: 'hit' }],
    });

    const skResponse = await handler(
      requestFor('/v1/suggest?kind=address&countryCode=SK&q=zizkova&limit=1'),
    );
    const skBody = await readJson<SmartSuggestResponse>(skResponse);

    expect(skBody.suggestions[0]).toMatchObject({
      address: { city: 'Žilina', countryCode: 'SK' },
      id: 'sk-register-adries-zizkova-45',
      source: {
        attribution: { label: 'Register adries sample' },
        kind: 'owned-dataset',
      },
    });
  });

  it('keeps unsupported suggest kinds fail-open with disabled cache status', async () => {
    const response = await handler(requestFor('/v1/suggest?kind=postal&q=12345'));
    const body = await readJson<SmartSuggestResponse>(response);

    expect(body).toMatchObject({
      cacheStatus: 'disabled',
      suggestions: [],
    });
  });

  it('validates phone and postal requests through API endpoints', async () => {
    const phoneResponse = await handler(
      requestFor('/v1/validate/phone', {
        body: JSON.stringify({ defaultCountry: 'CZ', rawInput: '777 123 456' }),
        method: 'POST',
      }),
    );
    const phoneBody = await readJson<PhoneValidationPayload>(phoneResponse);

    expect(phoneBody).toMatchObject({
      e164: '+420777123456',
      isValid: true,
    });

    const postalResponse = await handler(
      requestFor('/v1/validate/postal', {
        body: JSON.stringify({ countryCode: 'PL', rawInput: '12345' }),
        method: 'POST',
      }),
    );
    const postalBody = await readJson<PostalValidationPayload>(postalResponse);

    expect(postalBody).toMatchObject({
      displayValue: '12-345',
      isValid: true,
    });
  });

  it('records accept telemetry and exposes safe runtime status', async () => {
    const acceptResponse = await handler(
      requestFor('/v1/accept', {
        body: JSON.stringify({
          requestId: 'request-status-test',
          source: { id: 'ruian-cz-sample', kind: 'owned-dataset', name: 'RUIAN CZ sample' },
          suggestionId: 'cz-ruian-vaclavske-namesti-832-19',
        }),
        method: 'POST',
      }),
    );

    await expect(readJson<{ accepted: true }>(acceptResponse)).resolves.toEqual({
      accepted: true,
    });

    const statusResponse = await handler(requestFor('/v1/status'));
    const statusBody = await readJson<StatusPayload>(statusResponse);

    expect(statusBody).toMatchObject({
      imports: { recentRuns: expect.any(Array) },
      service: 'smart-suggest',
    });
    expect(statusBody.metrics.accept.total).toBeGreaterThanOrEqual(1);
    expect(statusBody.metrics.suggest.total).toBeGreaterThanOrEqual(3);
    expect(statusBody.metrics.suggest.cacheStatus.hit).toBeGreaterThanOrEqual(1);
    expect(statusBody.metrics.suggest.cacheStatus.disabled).toBeGreaterThanOrEqual(1);
    expect(statusBody.metrics.suggest.cacheHitRate).toBeGreaterThan(0);
  });
});

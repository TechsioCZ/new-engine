import { SmartSuggestHttpApi, SmartSuggestInternalError } from '../../shared/api';
import {
  createInMemorySmartSuggestRepositories,
  SmartSuggestStorageError,
} from '@techsio/smart-suggest-storage';
import type { SmartSuggestRepositories } from '@techsio/smart-suggest-storage';
import { describe, expect, layer } from '@effect/vitest';
import { HttpServer, Layer } from '@modern-js/plugin-bff/effect-edge';
import { isFailReason } from 'effect/Cause';
import { exit as effectExit, fail, gen } from 'effect/Effect';
import { isFailure } from 'effect/Exit';
import { HttpApiTest } from 'effect/unstable/httpapi';
import { createSmartSuggestApiGroupLayer } from '../../api/index';

const createSmartSuggestApiTestLayer = (repositories: SmartSuggestRepositories) =>
  Layer.mergeAll(HttpServer.layerServices, createSmartSuggestApiGroupLayer(repositories));

describe('Smart Suggest HttpApi', () => {
  layer(createSmartSuggestApiTestLayer(createInMemorySmartSuggestRepositories()))(
    'success paths',
    (it) => {
      it.effect('runs success paths through the generated Effect client', () =>
        gen(function* program() {
          const client = yield* HttpApiTest.groups(SmartSuggestHttpApi, ['smartSuggest'] as const);
          const suggest = yield* client.suggest({
            query: {
              countryCode: 'CZ',
              kind: 'address',
              limit: 1,
              q: 'K Louži',
            },
          });
          const phone = yield* client.validatePhone({
            payload: {
              defaultCountry: 'CZ',
              rawInput: '777 123 456',
            },
          });

          expect(suggest.suggestions).toEqual([
            expect.objectContaining({
              id: 'cz-ruian-k-louzi-1258-12',
              kind: 'address',
            }),
          ]);
          expect(phone).toMatchObject({
            e164: '+420777123456',
            isValid: true,
          });
        }),
      );
    },
  );

  const storageFailureRepositories = createInMemorySmartSuggestRepositories();
  storageFailureRepositories.acceptEvents.recordAcceptEvent = () =>
    fail(new SmartSuggestStorageError('storage-unavailable', 'storage unavailable'));

  layer(createSmartSuggestApiTestLayer(storageFailureRepositories))('failure paths', (it) => {
    it.effect('keeps storage failures in the typed Effect error channel', () =>
      gen(function* program() {
        const client = yield* HttpApiTest.groups(SmartSuggestHttpApi, ['smartSuggest'] as const);

        const exit = yield* effectExit(
          client.accept({
            payload: {
              requestId: 'request-storage-failure',
              source: {
                id: 'ruian-cz-sample',
                kind: 'owned-dataset',
                name: 'RUIAN CZ sample',
              },
              suggestionId: 'cz-ruian-vaclavske-namesti-832-19',
            },
          }),
        );

        expect(isFailure(exit)).toBe(true);

        if (!isFailure(exit)) {
          return;
        }

        const failReason = exit.cause.reasons.find(isFailReason);

        expect(failReason?.error).toBeInstanceOf(SmartSuggestInternalError);
        expect(failReason?.error).toMatchObject({
          errors: [expect.objectContaining({ code: 'internal-error' })],
          message: 'Smart Suggest request failed.',
        });
      }),
    );
  });
});

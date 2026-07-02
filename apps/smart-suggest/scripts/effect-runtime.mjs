import { squash } from 'effect/Cause';
import { runCallback } from 'effect/Effect';
import { isFailure } from 'effect/Exit';

export const runCliEffectAsPromise = (effect) =>
  new Promise((resolve, reject) => {
    runCallback(effect, {
      onExit: (result) => {
        if (isFailure(result)) {
          reject(squash(result.cause));
          return;
        }

        resolve(result.value);
      },
    });
  });

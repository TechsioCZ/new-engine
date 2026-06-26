export const ultramodernVerticalIdentity = {
  appId: 'shell-super-app',
  build: 'c0d035315dc76f9c',
  deployProfile: 'cloudflare-ssr-mf-effect-v1',
  packageName: '@smart-suggest/shell-super-app',
  version: '0.1.0',
} as const;

export const ultramodernUiMarker = {
  ...ultramodernVerticalIdentity,
  surface: 'ui',
} as const;

export const ultramodernApiMarker = {
  ...ultramodernVerticalIdentity,
  surface: 'effect-bff',
} as const;

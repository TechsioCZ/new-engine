// @effect-diagnostics processEnv:off
import { appTools, defineConfig, presetUltramodern } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';
import { i18nPlugin } from '@modern-js/plugin-i18n';
import { tanstackRouterPlugin } from '@modern-js/plugin-tanstack';
import { moduleFederationPlugin } from '@module-federation/modern-js-v3';
import { withZephyr as withZephyrRspack } from 'zephyr-rspack-plugin';
import { ultramodernLocalisedUrls } from './src/routes/ultramodern-route-metadata';

type ZephyrRspackConfig = Parameters<ReturnType<typeof withZephyrRspack>>[0];
type ModernModuleType = 'module' | 'commonjs';

interface ModernAppContext {
  readonly moduleType: ModernModuleType;
  readonly [key: string]: unknown;
}

interface ModernPluginApi {
  getAppContext: () => ModernAppContext;
  updateAppContext: (context: ModernAppContext) => void;
}

const zephyrEnabled = process.env['ULTRAMODERN_ZEPHYR'] !== 'false';
const cloudflareDeployEnabled = process.env['MODERNJS_DEPLOY'] === 'cloudflare';
const workspaceRoot = decodeURIComponent(
  new URL('../../../..', import.meta.url).pathname.replace(/\/$/u, ''),
);

const forceServerTsgoEsmPlugin = () => ({
  name: 'ultramodern-server-tsgo-esm-plugin',
  setup(api: ModernPluginApi) {
    const appContext = api.getAppContext();
    if (appContext.moduleType === 'module') {
      return;
    }
    api.updateAppContext({ ...appContext, moduleType: 'module' });
  },
});

const zephyrRspackPlugin = () => ({
  name: 'ultramodern-zephyr-rspack-plugin',
  pre: ['@modern-js/plugin-module-federation-config'],
  setup(api: {
    modifyRspackConfig: (
      handler: (config: ZephyrRspackConfig) => ZephyrRspackConfig | Promise<ZephyrRspackConfig>,
    ) => void;
  }) {
    if (!zephyrEnabled) {
      return;
    }
    api.modifyRspackConfig((config) => withZephyrRspack()(config));
  },
});

const appId = 'shell-super-app';
const cloudflareWorkerName = 'smart-suggest-shell-super-app';
const port = Number(process.env['SHELL_SUPER_APP_PORT'] ?? 3020);
const envValue = (name: string) => {
  const value = process.env[name]?.trim();
  return value !== undefined && value.length > 0 ? value : undefined;
};
const configuredSiteUrl = envValue('MODERN_PUBLIC_SITE_URL');
const configuredCloudflareUrl = envValue('ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP');
const configuredUltramodernAssetPrefix = envValue('ULTRAMODERN_ASSET_PREFIX');
const configuredModernAssetPrefix = envValue('MODERN_ASSET_PREFIX');
const cloudflareWorkersDevSubdomain = envValue('ULTRAMODERN_CLOUDFLARE_WORKERS_DEV_SUBDOMAIN');
const inferredCloudflareUrl =
  cloudflareDeployEnabled && cloudflareWorkersDevSubdomain !== undefined
    ? `https://${cloudflareWorkerName}.${cloudflareWorkersDevSubdomain}.workers.dev`
    : undefined;
// Site origin (SEO: canonical/hreflang URLs) prefers the site-wide public URL;
// the per-app deployment URL only fills in when no site origin is configured.
const siteUrl =
  configuredSiteUrl ||
  configuredCloudflareUrl ||
  inferredCloudflareUrl ||
  `http://localhost:${port}`;
// Asset loading is intentionally independent from the canonical site URL and
// deployment public URL. Without an explicit asset prefix, assets stay
// origin-relative so self-hosted apps, tunnels, and reverse proxies never leak
// localhost URLs into production HTML.
const assetPrefix = configuredModernAssetPrefix || configuredUltramodernAssetPrefix || '/';

if (
  cloudflareDeployEnabled &&
  process.env['ULTRAMODERN_CLOUDFLARE_REQUIRE_PUBLIC_URLS'] === 'true' &&
  configuredCloudflareUrl === undefined &&
  configuredSiteUrl === undefined &&
  inferredCloudflareUrl === undefined
) {
  throw new Error(
    `Cloudflare deploy for ${appId} needs ULTRAMODERN_PUBLIC_URL_SHELL_SUPER_APP, MODERN_PUBLIC_SITE_URL, or ULTRAMODERN_CLOUDFLARE_WORKERS_DEV_SUBDOMAIN.`,
  );
}

export default defineConfig(
  presetUltramodern(
    {
      ...(cloudflareDeployEnabled
        ? {
            deploy: {
              worker: {
                compatibilityDate: '2026-06-02',
                name: cloudflareWorkerName,
                security: {
                  contentSecurityPolicy: {
                    directives: {
                      'base-uri': ["'self'"],
                      'connect-src': ["'self'", 'https:', 'http:', 'wss:', 'ws:'],
                      'default-src': ["'self'"],
                      'font-src': ["'self'", 'data:', 'https:', 'http:'],
                      'form-action': ["'self'"],
                      'frame-ancestors': ["'self'"],
                      'img-src': ["'self'", 'data:', 'blob:', 'https:', 'http:'],
                      'manifest-src': ["'self'", 'https:', 'http:'],
                      'object-src': ["'none'"],
                      'script-src': [
                        "'self'",
                        "'unsafe-inline'",
                        "'unsafe-eval'",
                        'https:',
                        'http:',
                        'blob:',
                      ],
                      'style-src': ["'self'", "'unsafe-inline'", 'https:', 'http:'],
                      'worker-src': ["'self'", 'blob:'],
                    },
                    mode: 'report-only',
                    reason:
                      'Report-only by default so Cloudflare Module Federation SSR can prove remote script, style, and connect compatibility before enforcement.',
                  },
                  enabled: true,
                  headers: {
                    contentTypeOptions: 'nosniff',
                    permissionsPolicy:
                      'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
                    referrerPolicy: 'strict-origin-when-cross-origin',
                  },
                  noindex: {
                    localhost: true,
                    previewHostnames: [],
                    workersDev: true,
                  },
                },
                ssr: true,
              },
            },
          }
        : {}),
      bff: {
        effect: {
          entry: './api/index',
          strictEffectApproach: true,
        },
        prefix: '/api',
        runtimeFramework: 'effect',
      },
      dev: {
        // Keep dev assets origin-relative too; the default absolute
        // http://localhost:<port> prefix breaks pages served through tunnels.
        assetPrefix: '/',
      },
      html: {
        outputStructure: 'flat',
      },
      output: {
        assetPrefix,
        disableTsChecker: false,
        distPath: {
          html: './',
        },
        polyfill: 'off',
        splitRouteChunks: true,
      },
      performance: {
        rsdoctor: {
          disableClientServer: true,
          enabled: process.env['ULTRAMODERN_RSDOCTOR'] === 'true',
        },
      },
      plugins: [
        appTools(),
        forceServerTsgoEsmPlugin(),
        bffPlugin(),
        tanstackRouterPlugin(),
        i18nPlugin({
          backend: {
            enabled: true,
            loadPath: '/locales/{{lng}}/{{ns}}.json',
          },
          localeDetection: {
            fallbackLanguage: 'en',
            ignoreRedirectRoutes: [
              '/@mf-types',
              '/api',
              '/assets',
              '/bundles',
              '/shell-super-app-api',
              '/locales',
              '/mf-manifest.json',
              '/mf-stats.json',
              '/remoteEntry.js',
              '/robots.txt',
              '/site.webmanifest',
              '/sitemap.xml',
              '/static',
              '/zephyr-manifest.json',
            ],
            languages: ['en', 'cs'],
            localePathRedirect: true,
            localisedUrls: ultramodernLocalisedUrls as Record<string, Record<string, string>>,
          },
          reactI18next: false,
        }),
        moduleFederationPlugin(),
        zephyrRspackPlugin(),
      ],
      server: {
        port,
        publicDir: ['./locales', './assets', './sdk'],
        ssr: {
          mode: 'string',
          moduleFederationAppSSR: true,
        },
        tsconfigPath: './tsconfig.server.json',
      },
      source: {
        alias: {
          '@modern-js/plugin-i18n/runtime': '@modern-js/plugin-i18n/runtime/no-react-i18next',
          '@techsio/smart-suggest-react': `${workspaceRoot}/libs/smart-suggest/react/dist/react.js`,
          '@techsio/smart-suggest-ui/address-suggest-field': `${workspaceRoot}/libs/smart-suggest/ui/dist/address-suggest-field.js`,
          '@techsio/smart-suggest-ui/phone-validation-field': `${workspaceRoot}/libs/smart-suggest/ui/dist/phone-validation-field.js`,
          '@techsio/smart-suggest-ui/postal-validation-field': `${workspaceRoot}/libs/smart-suggest/ui/dist/postal-validation-field.js`,
        },
        globalVars: {
          ULTRAMODERN_SITE_URL: siteUrl,
        },
        mainEntryName: 'index',
      },
      tools: {
        autoprefixer: {
          overrideBrowserslist: ['defaults'],
        },
        bundlerChain: (chain) => {
          chain.output
            .uniqueName('shellSuperApp')
            .chunkLoadingGlobal('__ULTRAMODERN_SHELL_SUPER_APP_LOADED_CHUNKS__');
          chain.ignoreWarnings([
            {
              message: /the request of a dependency is an expression/u,
              module: /modern-js-plugin-i18n/u,
            },
          ]);
        },
      },
    },
    {
      appId,
      enableBffRequestId: true,
      enableModuleFederationSSR: true,
      enableTelemetryExporters: true,
      telemetryFailLoudStartup: false,
    },
  ),
);

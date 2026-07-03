// @effect-diagnostics processEnv:off
import { appTools, defineConfig, presetUltramodern } from '@modern-js/app-tools';
import { bffPlugin } from '@modern-js/plugin-bff';
import { i18nPlugin } from '@modern-js/plugin-i18n';
import { tanstackRouterPlugin } from '@modern-js/plugin-tanstack';
import { moduleFederationPlugin } from '@module-federation/modern-js-v3';
import { withZephyr as withZephyrRspack } from 'zephyr-rspack-plugin';
import { ultramodernLocalisedUrls } from './src/routes/ultramodern-route-metadata';

type ZephyrRspackConfig = Parameters<ReturnType<typeof withZephyrRspack>>[0];

const zephyrEnabled = process.env['ULTRAMODERN_ZEPHYR'] !== 'false';
const cloudflareDeployEnabled = process.env['MODERNJS_DEPLOY'] === 'cloudflare';

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
const moduleFederationDevServerOrigin =
  envValue('ULTRAMODERN_MF_DEV_ORIGIN') || 'http://localhost:3020';
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
const smartSuggestArtifactPublicPath = 'smart-suggest-owned-data';
const smartSuggestArtifactManifestUrl =
  envValue('SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL') ||
  `${siteUrl.replace(/\/+$/u, '')}/${smartSuggestArtifactPublicPath}/manifest.json`;
interface CloudflareD1Database {
  binding: string;
  databaseId: string;
  databaseName: string;
  previewDatabaseId?: string;
  remote?: boolean;
}
const envFlag = (name: string) => {
  const value = envValue(name)?.toLowerCase();

  return value === '1' || value === 'true' || value === 'yes';
};
const smartSuggestFreeTierShardGroups = [
  { index: '01', regionCodes: ['19'] },
  { index: '02', regionCodes: ['27'] },
  { index: '03', regionCodes: ['35', '43'] },
  { index: '04', regionCodes: ['51', '78'] },
  { index: '05', regionCodes: ['60'] },
  { index: '06', regionCodes: ['86', '94', '108'] },
  { index: '07', regionCodes: ['116'] },
  { index: '08', regionCodes: ['124', '132'] },
  { index: '09', regionCodes: ['141'] },
] as const;
const smartSuggestCzVuscCodes = [
  '19',
  '27',
  '35',
  '43',
  '51',
  '60',
  '78',
  '86',
  '94',
  '108',
  '116',
  '124',
  '132',
  '141',
] as const;
const d1DatabaseFromEnv = ({
  binding,
  databaseIdEnv,
  databaseName,
  previewDatabaseIdEnv,
}: {
  binding: string;
  databaseIdEnv: string;
  databaseName: string;
  previewDatabaseIdEnv?: string;
}): CloudflareD1Database | undefined => {
  const databaseId = envValue(databaseIdEnv);

  if (databaseId === undefined) {
    return;
  }

  const database: CloudflareD1Database = {
    binding,
    databaseId,
    databaseName,
    remote: true,
  };
  const previewDatabaseId =
    previewDatabaseIdEnv === undefined ? undefined : envValue(previewDatabaseIdEnv);

  if (previewDatabaseId !== undefined) {
    database.previewDatabaseId = previewDatabaseId;
  }

  return database;
};
const parseSmartSuggestShardD1Databases = (): CloudflareD1Database[] => {
  const rawJson = envValue('SMART_SUGGEST_D1_SHARDS_JSON');

  if (rawJson === undefined) {
    return [];
  }

  const parsed = JSON.parse(rawJson) as unknown;

  if (!Array.isArray(parsed)) {
    throw new TypeError('SMART_SUGGEST_D1_SHARDS_JSON must be a JSON array.');
  }

  return parsed.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new Error(`SMART_SUGGEST_D1_SHARDS_JSON[${index}] must be an object.`);
    }

    const record = entry as Record<string, unknown>;
    const readStringProperty = (primaryKey: string, fallbackKey?: string) => {
      const primaryValue = record[primaryKey];

      if (typeof primaryValue === 'string') {
        return primaryValue;
      }

      if (fallbackKey === undefined) {
        return;
      }

      const fallbackValue = record[fallbackKey];

      return typeof fallbackValue === 'string' ? fallbackValue : undefined;
    };
    const binding = readStringProperty('binding');
    const databaseName = readStringProperty('databaseName', 'database_name');
    const databaseId = readStringProperty('databaseId', 'database_id');
    const previewDatabaseId = readStringProperty('previewDatabaseId', 'preview_database_id');

    if (binding === undefined || databaseName === undefined || databaseId === undefined) {
      throw new Error(
        `SMART_SUGGEST_D1_SHARDS_JSON[${index}] needs binding, databaseName/database_name, and databaseId/database_id.`,
      );
    }

    return {
      binding,
      databaseId,
      databaseName,
      ...(previewDatabaseId === undefined ? {} : { previewDatabaseId }),
      remote: true,
    };
  });
};
const uniqueD1Databases = (databases: readonly (CloudflareD1Database | undefined)[]) => {
  const byBinding = new Map<string, CloudflareD1Database>();

  for (const database of databases) {
    if (database !== undefined) {
      byBinding.set(database.binding, database);
    }
  }

  return [...byBinding.values()];
};
const smartSuggestPrimaryD1Binding = envValue('SMART_SUGGEST_D1_BINDING') ?? 'SMART_SUGGEST_D1';
const smartSuggestRouterD1Binding =
  envValue('SMART_SUGGEST_D1_ROUTER_BINDING') ?? 'SMART_SUGGEST_ROUTER_D1';
const createSmartSuggestD1Databases = () => {
  const topology = envValue('SMART_SUGGEST_D1_TOPOLOGY');
  const freeTierEnabled =
    topology === 'free-tier' || envFlag('SMART_SUGGEST_D1_FREE_TIER_MAX_SHARDS_ENABLED');
  const czVuscEnabled =
    topology === 'paid-vusc' || envFlag('SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED');
  const primaryDatabase = d1DatabaseFromEnv({
    binding: smartSuggestPrimaryD1Binding,
    databaseIdEnv: 'SMART_SUGGEST_D1_DATABASE_ID',
    databaseName: envValue('SMART_SUGGEST_D1_DATABASE_NAME') ?? 'smart-suggest',
    previewDatabaseIdEnv: 'SMART_SUGGEST_D1_PREVIEW_DATABASE_ID',
  });
  const routerDatabase = d1DatabaseFromEnv({
    binding: smartSuggestRouterD1Binding,
    databaseIdEnv: 'SMART_SUGGEST_ROUTER_D1_DATABASE_ID',
    databaseName: envValue('SMART_SUGGEST_ROUTER_D1_DATABASE_NAME') ?? 'smart-suggest-router',
    previewDatabaseIdEnv: 'SMART_SUGGEST_ROUTER_D1_PREVIEW_DATABASE_ID',
  });
  const freeTierBindingPrefix =
    envValue('SMART_SUGGEST_D1_FREE_TIER_SHARD_BINDING_PREFIX') ?? 'SMART_SUGGEST_FREE_TIER_';
  const freeTierDatabaseNamePrefix =
    envValue('SMART_SUGGEST_D1_FREE_TIER_SHARD_DATABASE_NAME_PREFIX') ?? 'smart-suggest-free-tier-';
  const freeTierDatabases = freeTierEnabled
    ? smartSuggestFreeTierShardGroups.map((group) =>
        d1DatabaseFromEnv({
          binding: `${freeTierBindingPrefix}${group.index}`,
          databaseIdEnv: `${freeTierBindingPrefix}${group.index}_DATABASE_ID`,
          databaseName: `${freeTierDatabaseNamePrefix}${group.index}`,
          previewDatabaseIdEnv: `${freeTierBindingPrefix}${group.index}_PREVIEW_DATABASE_ID`,
        }),
      )
    : [];
  const czVuscBindingPrefix =
    envValue('SMART_SUGGEST_D1_CZ_VUSC_SHARD_BINDING_PREFIX') ?? 'SMART_SUGGEST_CZ_VUSC_';
  const czVuscDatabaseNamePrefix =
    envValue('SMART_SUGGEST_D1_CZ_VUSC_SHARD_DATABASE_NAME_PREFIX') ?? 'smart-suggest-cz-vusc-';
  const czVuscDatabases = czVuscEnabled
    ? smartSuggestCzVuscCodes.map((code) =>
        d1DatabaseFromEnv({
          binding: `${czVuscBindingPrefix}${code}`,
          databaseIdEnv: `${czVuscBindingPrefix}${code}_DATABASE_ID`,
          databaseName: `${czVuscDatabaseNamePrefix}${code}`,
          previewDatabaseIdEnv: `${czVuscBindingPrefix}${code}_PREVIEW_DATABASE_ID`,
        }),
      )
    : [];

  return uniqueD1Databases([
    primaryDatabase,
    routerDatabase,
    ...parseSmartSuggestShardD1Databases(),
    ...freeTierDatabases,
    ...czVuscDatabases,
  ]);
};
const smartSuggestD1Databases = createSmartSuggestD1Databases();
const smartSuggestD1ShardBindings =
  envValue('SMART_SUGGEST_D1_SHARD_BINDINGS') ??
  smartSuggestD1Databases
    .map((database) => database.binding)
    .filter(
      (binding) =>
        binding !== smartSuggestPrimaryD1Binding && binding !== smartSuggestRouterD1Binding,
    )
    .join(',');
const optionalSmartSuggestWorkerVars = Object.fromEntries(
  [
    'SMART_SUGGEST_D1_BINDING',
    'SMART_SUGGEST_D1_ROUTER_BINDING',
    'SMART_SUGGEST_D1_SHARD_REGION_MAP_JSON',
    'SMART_SUGGEST_D1_SHARDS_JSON',
    'SMART_SUGGEST_D1_SHARD_ROUTE_STRATEGY',
    'SMART_SUGGEST_D1_TOPOLOGY',
  ].flatMap((name) => {
    const value = envValue(name);

    return value === undefined ? [] : [[name, value]];
  }),
);
const smartSuggestD1WorkerVars =
  smartSuggestD1Databases.length === 0
    ? {}
    : {
        ...optionalSmartSuggestWorkerVars,
        SMART_SUGGEST_D1_SHARD_BINDINGS: smartSuggestD1ShardBindings,
      };
// Asset loading is intentionally independent from the canonical site URL.
// Module Federation remotes must publish an absolute publicPath so browsers
// load remoteEntry.js and exposed chunks from the remote origin, not the host.
const assetPrefix = configuredModernAssetPrefix || configuredUltramodernAssetPrefix || '/';
const buildTarget = cloudflareDeployEnabled ? 'cloudflare' : 'web';
const buildOutputRoot = cloudflareDeployEnabled ? 'dist-cloudflare' : 'dist';
const buildTempDirectory = `node_modules/.modern-js-${appId}-${buildTarget}`;
const buildCacheDirectory = `node_modules/.cache/rspack-${appId}-${buildTarget}`;

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
                publicAssetExcludes: ['api', 'shared'],
                publicAssets: [
                  {
                    from: smartSuggestArtifactPublicPath,
                    to: smartSuggestArtifactPublicPath,
                  },
                  {
                    from: 'public',
                    to: '.',
                  },
                ],
                ...(smartSuggestD1Databases.length === 0
                  ? {}
                  : { d1Databases: smartSuggestD1Databases }),
                security: {
                  contentSecurityPolicy: {
                    directives: {
                      'base-uri': ["'self'"],
                      'connect-src': ["'self'", 'https:', 'wss:'],
                      'default-src': ["'self'"],
                      'font-src': ["'self'", 'data:', 'https:'],
                      'form-action': ["'self'"],
                      'frame-ancestors': ["'self'"],
                      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
                      'manifest-src': ["'self'", 'https:'],
                      'object-src': ["'none'"],
                      'script-src': ["'self'", "'unsafe-inline'", 'https:', 'blob:'],
                      'style-src': ["'self'", "'unsafe-inline'", 'https:'],
                      'worker-src': ["'self'", 'blob:'],
                    },
                    mode: 'enforce',
                    reason:
                      'Enforced Cloudflare CSP blocks mixed-content and eval sources while permitting Modern SSR and Module Federation assets from self, HTTPS, WSS, and blob workers.',
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
                wrangler: {
                  assets: {
                    html_handling: 'none',
                  },
                  vars: {
                    SMART_SUGGEST_OWNED_ARTIFACT_ALLOW_INCOMPLETE: 'false',
                    SMART_SUGGEST_OWNED_ARTIFACT_MANIFEST_URL: smartSuggestArtifactManifestUrl,
                    SMART_SUGGEST_OWNED_ARTIFACT_READ_FALLBACK_ADDRESS_RECORDS: 'false',
                    ...smartSuggestD1WorkerVars,
                  },
                },
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
        // Keep shell dev assets origin-relative so the shell works through
        // tunnels and local previews without rewriting its own chunks.
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
          root: buildOutputRoot,
        },
        polyfill: 'off',
        splitRouteChunks: true,
        tempDir: buildTempDirectory,
      },
      performance: {
        buildCache: {
          cacheDigest: [appId, buildTarget],
          cacheDirectory: buildCacheDirectory,
        },
        rsdoctor: {
          disableClientServer: true,
          enabled: process.env['ULTRAMODERN_RSDOCTOR'] === 'true',
        },
      },
      plugins: [
        appTools(),
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
              '/api',
              '/@mf-types',
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
      },
      source: {
        alias: {
          '@modern-js/plugin-i18n/runtime': '@modern-js/plugin-i18n/runtime/no-react-i18next',
        },
        globalVars: {
          ULTRAMODERN_SITE_URL: siteUrl,
        },
        mainEntryName: 'index',
      },
      splitChunks: {
        chunks: 'async',
      },
      tools: {
        autoprefixer: {
          overrideBrowserslist: ['defaults'],
        },
        bundlerChain: (chain) => {
          chain.output
            .uniqueName('shellSuperApp')
            .chunkLoadingGlobal('__ULTRAMODERN_SHELL_SUPER_APP_LOADED_CHUNKS__');
        },
        devServer: {
          headers: {
            'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Origin': moduleFederationDevServerOrigin,
          },
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

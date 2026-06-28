#!/usr/bin/env node
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultWranglerConfigPath = 'apps/shell-super-app/.output/wrangler.json';
const defaultBackupPrefix = '.codex/reports/smart-suggest-d1-backup-plan';
const defaultShardSizeWarnBytes = 5 * 1024 * 1024 * 1024;
const defaultShardSizeBlockBytes = 6 * 1024 * 1024 * 1024;
const defaultMaxImportAgeHours = 48;
const defaultMaxFailedRows = 0;
const expectedCzVuscCodes = [
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
];
const defaultShardBindingPrefix = 'SMART_SUGGEST_CZ_VUSC_';
const canonicalExportTables = [
  'smart_suggest_accept_events',
  'smart_suggest_address_records',
  'smart_suggest_address_search_tokens',
  'smart_suggest_address_tombstones',
  'smart_suggest_api_keys',
  'smart_suggest_cache_entries',
  'smart_suggest_data_sources',
  'smart_suggest_import_runs',
  'smart_suggest_provider_events',
  'smart_suggest_shard_registry',
  'smart_suggest_tenants',
];

function localD1DatabaseIdForBinding(binding) {
  const hash = crypto.createHash('sha1').update(binding).digest('hex');

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    hash.slice(12, 16),
    hash.slice(16, 20),
    hash.slice(20, 32),
  ].join('-');
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/smart-suggest-d1-operations.mjs preflight [options]
  node scripts/smart-suggest-d1-operations.mjs backup-plan [options]
  node scripts/smart-suggest-d1-operations.mjs provision-plan [options]
  node scripts/smart-suggest-d1-operations.mjs optimize [options] [--execute]
  node scripts/smart-suggest-d1-operations.mjs status [options] --execute-readonly

Non-mutating Smart Suggest D1 operations helper. It reads generated Wrangler D1
configuration, validates router/shard bindings, emits canonical-table export
commands, plans D1 creation/provisioning commands, plans post-import
optimization, and can run read-only status SQL.

Options:
  --wrangler-config path        Defaults to apps/shell-super-app/.output/wrangler.json
  --d1-target local|remote      Target for generated commands. Defaults to remote.
  --router-d1-binding value     Router binding. Defaults to config var or SMART_SUGGEST_ROUTER_D1.
  --shard-bindings a,b          Comma-separated address shard bindings.
  --shard-binding-prefix value  Defaults to SMART_SUGGEST_CZ_VUSC_.
  --require-14-cz-shards        Fail preflight unless all 14 expected VUSC shards exist.
  --require-cloudflare-ids      Fail preflight when any planned DB lacks database_id.
  --backup-prefix path          App-relative backup output prefix.
  --persist-to path             Optional local Wrangler D1 state for read-only status.
  --warn-size-bytes value       Shard size warning threshold. Defaults to 5 GiB.
  --block-size-bytes value      Shard size error threshold. Defaults to 6 GiB.
  --require-size-estimates      Treat missing shard size estimates as errors.
  --max-import-age-hours value  Latest import/freshness age error threshold. Defaults to 48.
  --max-failed-rows value       Failed-row error threshold. Defaults to 0.
  --execute                     Run mutating D1 optimize SQL for the optimize command.
  --execute-readonly            Run read-only D1 status SQL. Never writes data.
  --json-out path               Write public-safe JSON report.
`);
}

function envValue(name) {
  const value = process.env[name]?.trim();

  return value === undefined || value === '' ? undefined : value;
}

function parseCommaSeparated(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function readRequiredOption(argv, index, arg) {
  const value = argv[index + 1];

  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${arg} requires a value.`);
  }

  return value;
}

function defaultArgs(command) {
  return {
    backupPrefix: defaultBackupPrefix,
    blockSizeBytes: defaultShardSizeBlockBytes,
    command,
    d1Target: 'remote',
    execute: false,
    executeReadonly: false,
    jsonOut: undefined,
    maxFailedRows: defaultMaxFailedRows,
    maxImportAgeHours: defaultMaxImportAgeHours,
    persistTo: undefined,
    require14CzShards: false,
    requireCloudflareIds: false,
    requireSizeEstimates: false,
    routerD1Binding:
      envValue('SMART_SUGGEST_D1_ROUTER_BINDING') ??
      envValue('SMART_SUGGEST_ROUTER_D1_BINDING') ??
      undefined,
    shardBindingPrefix: defaultShardBindingPrefix,
    shardBindings:
      envValue('SMART_SUGGEST_D1_SHARD_BINDINGS') ??
      envValue('SMART_SUGGEST_SHARD_BINDINGS') ??
      undefined,
    warnSizeBytes: defaultShardSizeWarnBytes,
    wranglerConfig: defaultWranglerConfigPath,
  };
}

function parseNonNegativeNumber(value, label) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }

  return parsed;
}

function parseArgs(argv) {
  const [command = 'preflight', ...rest] = argv;
  const parsed = defaultArgs(command);

  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
      continue;
    }
    if (arg === '--wrangler-config') {
      parsed.wranglerConfig = readRequiredOption(rest, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--d1-target') {
      parsed.d1Target = readRequiredOption(rest, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--router-d1-binding') {
      parsed.routerD1Binding = readRequiredOption(rest, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--shard-bindings') {
      parsed.shardBindings = readRequiredOption(rest, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--shard-binding-prefix') {
      parsed.shardBindingPrefix = readRequiredOption(rest, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--backup-prefix') {
      parsed.backupPrefix = readRequiredOption(rest, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--persist-to') {
      parsed.persistTo = readRequiredOption(rest, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--warn-size-bytes') {
      parsed.warnSizeBytes = parseNonNegativeNumber(readRequiredOption(rest, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--block-size-bytes') {
      parsed.blockSizeBytes = parseNonNegativeNumber(readRequiredOption(rest, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--max-import-age-hours') {
      parsed.maxImportAgeHours = parseNonNegativeNumber(readRequiredOption(rest, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--max-failed-rows') {
      parsed.maxFailedRows = parseNonNegativeNumber(readRequiredOption(rest, index, arg), arg);
      index += 1;
      continue;
    }
    if (arg === '--json-out') {
      parsed.jsonOut = readRequiredOption(rest, index, arg);
      index += 1;
      continue;
    }
    if (arg === '--require-14-cz-shards') {
      parsed.require14CzShards = true;
      continue;
    }
    if (arg === '--require-cloudflare-ids') {
      parsed.requireCloudflareIds = true;
      continue;
    }
    if (arg === '--require-size-estimates') {
      parsed.requireSizeEstimates = true;
      continue;
    }
    if (arg === '--execute') {
      parsed.execute = true;
      continue;
    }
    if (arg === '--execute-readonly') {
      parsed.executeReadonly = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (parsed.help) {
    return parsed;
  }
  if (
    !['backup-plan', 'optimize', 'preflight', 'provision-plan', 'status'].includes(parsed.command)
  ) {
    throw new Error('Command must be preflight, backup-plan, provision-plan, optimize, or status.');
  }
  if (!['local', 'remote'].includes(parsed.d1Target)) {
    throw new Error('--d1-target must be local or remote.');
  }
  if (parsed.command === 'status' && !parsed.executeReadonly) {
    throw new Error('status requires --execute-readonly.');
  }
  if (parsed.command !== 'status' && parsed.executeReadonly) {
    throw new Error('--execute-readonly is only valid for status.');
  }
  if (parsed.command !== 'optimize' && parsed.execute) {
    throw new Error('--execute is only valid for optimize.');
  }
  if (parsed.warnSizeBytes > parsed.blockSizeBytes) {
    throw new Error('--warn-size-bytes must be less than or equal to --block-size-bytes.');
  }

  return parsed;
}

function resolveWorkspacePath(inputPath) {
  const absolutePath = path.isAbsolute(inputPath)
    ? inputPath
    : path.resolve(workspaceRoot, inputPath);

  if (absolutePath !== workspaceRoot && !absolutePath.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error(`Path must stay inside apps/smart-suggest: ${inputPath}`);
  }

  return absolutePath;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function relativeWorkspacePath(filePath) {
  const absolutePath = path.resolve(filePath);
  const relativePath = path.relative(workspaceRoot, absolutePath);

  return relativePath === '' || relativePath.startsWith('..') || path.isAbsolute(relativePath)
    ? path.basename(absolutePath)
    : relativePath.split(path.sep).join('/');
}

function outputPathForBackup(prefix, database) {
  const safeName = database.databaseName.replaceAll(/[^a-z0-9_.-]+/giu, '-').toLowerCase();

  return `${prefix.replaceAll(/\/+$/gu, '')}/${safeName}.canonical.sql`;
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:=-]+$/u.test(value)) {
    return value;
  }

  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}

function commandToShell(args) {
  return args.map((arg) => shellQuote(arg)).join(' ');
}

function databaseEntries(config) {
  return Array.isArray(config.d1_databases) ? config.d1_databases.filter(isRecord) : [];
}

function findDatabase(config, bindingOrName) {
  return databaseEntries(config).find(
    (entry) =>
      entry.binding === bindingOrName ||
      entry.database_name === bindingOrName ||
      entry.database_id === bindingOrName ||
      entry.preview_database_id === bindingOrName,
  );
}

function readConfigVar(config, name) {
  return isRecord(config.vars) && typeof config.vars[name] === 'string'
    ? config.vars[name]
    : undefined;
}

function inferRouterBinding(config, args) {
  return (
    args.routerD1Binding ??
    readConfigVar(config, 'SMART_SUGGEST_D1_ROUTER_BINDING') ??
    'SMART_SUGGEST_ROUTER_D1'
  );
}

function inferShardBindings(config, args) {
  if (args.shardBindings !== undefined) {
    return parseCommaSeparated(args.shardBindings);
  }

  const configured = readConfigVar(config, 'SMART_SUGGEST_D1_SHARD_BINDINGS');

  if (configured !== undefined) {
    return parseCommaSeparated(configured);
  }

  return databaseEntries(config)
    .map((entry) => entry.binding)
    .filter((binding) => typeof binding === 'string' && binding.startsWith(args.shardBindingPrefix))
    .toSorted((left, right) => left.localeCompare(right));
}

function regionCodeFromBinding(binding, prefix) {
  if (!binding.startsWith(prefix)) {
    return undefined;
  }

  const suffix = binding.slice(prefix.length);

  return /^\d+$/u.test(suffix) ? suffix : undefined;
}

function normalizeDatabasePlan({ binding, configEntry, role, vuscCode }) {
  return {
    binding,
    databaseId: typeof configEntry?.database_id === 'string' ? configEntry.database_id : null,
    databaseName:
      typeof configEntry?.database_name === 'string' ? configEntry.database_name : binding,
    migrationsDir:
      typeof configEntry?.migrations_dir === 'string' ? configEntry.migrations_dir : null,
    previewDatabaseId:
      typeof configEntry?.preview_database_id === 'string' ? configEntry.preview_database_id : null,
    role,
    vuscCode,
  };
}

function createPlans(config, args) {
  const routerBinding = inferRouterBinding(config, args);
  const shardBindings = inferShardBindings(config, args);
  const routerConfig = findDatabase(config, routerBinding);
  const router =
    routerConfig === undefined
      ? undefined
      : normalizeDatabasePlan({
          binding: routerBinding,
          configEntry: routerConfig,
          role: 'router',
          vuscCode: null,
        });
  const shards = shardBindings.map((binding) =>
    normalizeDatabasePlan({
      binding,
      configEntry: findDatabase(config, binding),
      role: 'address-shard',
      vuscCode: regionCodeFromBinding(binding, args.shardBindingPrefix) ?? null,
    }),
  );

  return {
    databases: [...(router === undefined ? [] : [router]), ...shards],
    router,
    routerBinding,
    shardBindings,
    shards,
  };
}

function checkMigrationsDir(configPath, database) {
  if (database.migrationsDir === null) {
    return { ok: false, reason: 'missing-migrations-dir' };
  }

  const absolutePath = path.isAbsolute(database.migrationsDir)
    ? database.migrationsDir
    : path.resolve(path.dirname(configPath), database.migrationsDir);

  if (!fs.existsSync(absolutePath)) {
    return { ok: false, reason: 'migrations-dir-not-found' };
  }

  const sqlFiles = fs
    .readdirSync(absolutePath)
    .filter((entry) => entry.endsWith('.sql'))
    .toSorted((left, right) => left.localeCompare(right));

  return {
    ok: sqlFiles.length > 0,
    reason: sqlFiles.length === 0 ? 'migrations-dir-empty' : undefined,
    sqlFileCount: sqlFiles.length,
  };
}

function validatePlans(configPath, plans, args) {
  const checks = [];
  const pushCheck = (check) => checks.push(check);

  pushCheck({
    id: 'router-binding-configured',
    ok: plans.router !== undefined,
    severity: args.require14CzShards ? 'error' : 'warning',
  });
  pushCheck({
    actual: plans.shards.length,
    expected: args.require14CzShards ? expectedCzVuscCodes.length : undefined,
    id: 'address-shard-count',
    ok: !args.require14CzShards || plans.shards.length === expectedCzVuscCodes.length,
    severity: args.require14CzShards ? 'error' : 'warning',
  });

  const presentVuscCodes = new Set(
    plans.shards.map((shard) => shard.vuscCode).filter((code) => code !== null),
  );
  const missingVuscCodes = expectedCzVuscCodes.filter((code) => !presentVuscCodes.has(code));

  pushCheck({
    id: 'expected-cz-vusc-shards',
    missingVuscCodes,
    ok: !args.require14CzShards || missingVuscCodes.length === 0,
    severity: args.require14CzShards ? 'error' : 'warning',
  });

  for (const database of plans.databases) {
    const hasProductionDatabaseId =
      database.databaseId !== null &&
      database.databaseId !== localD1DatabaseIdForBinding(database.binding);

    pushCheck({
      binding: database.binding,
      id: `${database.binding}:database-id`,
      ok: !args.requireCloudflareIds || hasProductionDatabaseId,
      reason:
        database.databaseId === null
          ? 'missing-database-id'
          : hasProductionDatabaseId
            ? undefined
            : 'deterministic-local-placeholder-id',
      severity: args.requireCloudflareIds ? 'error' : 'warning',
    });
    pushCheck({
      binding: database.binding,
      id: `${database.binding}:migrations`,
      ...checkMigrationsDir(configPath, database),
      severity: 'error',
    });
  }

  return checks;
}

function exportArgsForDatabase(args, configPath, database) {
  const targetFlag = args.d1Target === 'remote' ? '--remote' : '--local';
  const outputPath = outputPathForBackup(args.backupPrefix, database);
  const command = [
    'wrangler',
    'd1',
    'export',
    database.databaseName,
    targetFlag,
    '--skip-confirmation',
    '--config',
    relativeWorkspacePath(configPath),
    '--output',
    outputPath,
  ];

  for (const table of canonicalExportTables) {
    command.push('--table', table);
  }

  return {
    binding: database.binding,
    command,
    shell: commandToShell(command),
    targetOutput: outputPath,
  };
}

function databaseIdEnvName(database) {
  if (database.role === 'router') {
    return 'SMART_SUGGEST_ROUTER_D1_DATABASE_ID';
  }

  if (database.role === 'address-shard' && database.vuscCode !== null) {
    return `SMART_SUGGEST_CZ_VUSC_${database.vuscCode}_DATABASE_ID`;
  }

  return `${database.binding}_DATABASE_ID`;
}

function provisionArgsForDatabase(database) {
  const command = ['wrangler', 'd1', 'create', database.databaseName];

  return {
    binding: database.binding,
    command,
    databaseName: database.databaseName,
    envName: databaseIdEnvName(database),
    role: database.role,
    shell: commandToShell(command),
    vuscCode: database.vuscCode,
  };
}

function provisionEnvTemplate(plans) {
  const lines = [];

  if (plans.router !== undefined) {
    lines.push('export SMART_SUGGEST_ROUTER_D1_ENABLED=true');
    lines.push(`export ${databaseIdEnvName(plans.router)}="<paste-router-database-id>"`);
  }
  if (plans.shards.length > 0) {
    lines.push('export SMART_SUGGEST_D1_CZ_VUSC_SHARDS_ENABLED=true');

    for (const shard of plans.shards.toSorted(
      (left, right) => Number(left.vuscCode ?? 0) - Number(right.vuscCode ?? 0),
    )) {
      lines.push(`export ${databaseIdEnvName(shard)}="<paste-${shard.databaseName}-database-id>"`);
    }

    lines.push(
      `export SMART_SUGGEST_D1_SHARD_BINDINGS="${plans.shards
        .map((shard) => shard.binding)
        .join(',')}"`,
    );
  }

  return lines;
}

function readonlyQueryPlans(databases) {
  return databases.flatMap((database) => {
    if (database.role === 'router') {
      return [
        {
          database,
          id: 'router-shards',
          sql: "select shard_id,binding_name,country_code,region_kind,region_code,state,import_version,row_count,estimated_size_bytes,source_freshness_at,last_import_completed_at from smart_suggest_shard_registry where country_code = 'CZ' order by cast(region_code as integer)",
        },
        {
          database,
          id: 'router-shard-summary',
          sql: "select state,count(*) as shard_count,sum(row_count) as row_count,max(coalesce(estimated_size_bytes,0)) as max_estimated_size_bytes,min(last_import_completed_at) as oldest_completed_at,max(last_import_completed_at) as newest_completed_at from smart_suggest_shard_registry where country_code = 'CZ' group by state",
        },
      ];
    }

    return [
      {
        database,
        id: 'latest-import-runs',
        sql: 'select id,status,import_kind,source_id,source_feed_id,source_version,source_valid_at,total_rows,inserted_rows,upserted_rows,tombstoned_rows,skipped_rows,failed_rows,completed_at from smart_suggest_import_runs order by started_at desc limit 5',
      },
      {
        database,
        id: 'active-address-records',
        sql: "select count(*) as active_records from smart_suggest_address_records where search_visible = 1 and replication_status = 'active'",
      },
      {
        database,
        id: 'source-provenance',
        sql: 'select id,source_kind,dataset_version,attribution_label,attribution_license,attribution_url,modification_note_sha256 from smart_suggest_data_sources order by id',
      },
    ];
  });
}

function optimizeQueryPlans(databases) {
  return databases.flatMap((database) => {
    const plans = [
      {
        database,
        id: 'sqlite-planner-optimize',
        sql: 'PRAGMA optimize;',
      },
    ];

    if (database.role === 'address-shard') {
      plans.push({
        database,
        id: 'address-fts-optimize',
        sql: "INSERT INTO smart_suggest_address_search_fts(smart_suggest_address_search_fts) VALUES('optimize');",
      });
    }

    return plans;
  });
}

function wranglerExecuteArgs(args, configPath, database, sql) {
  const commandArgs = [
    'd1',
    'execute',
    database.databaseName,
    '--config',
    relativeWorkspacePath(configPath),
    args.d1Target === 'remote' ? '--remote' : '--local',
    '--json',
    '--command',
    sql,
  ];

  if (args.d1Target === 'local' && args.persistTo !== undefined) {
    commandArgs.splice(6, 0, '--persist-to', args.persistTo);
  }

  return commandArgs;
}

function publicOperationPlan(query) {
  return {
    binding: query.database.binding,
    databaseName: query.database.databaseName,
    id: query.id,
    role: query.database.role,
    sql: query.sql,
    vuscCode: query.database.vuscCode,
  };
}

function runOptimizeQueries(args, configPath, databases) {
  const results = [];

  for (const query of optimizeQueryPlans(databases)) {
    const commandArgs = wranglerExecuteArgs(args, configPath, query.database, query.sql);
    const result = spawnSync('wrangler', commandArgs, {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error !== undefined) {
      results.push({
        ...publicOperationPlan(query),
        error: result.error.message,
        ok: false,
      });
      continue;
    }

    if (result.status !== 0) {
      results.push({
        ...publicOperationPlan(query),
        error: (result.stderr || result.stdout).trim().replaceAll(/\s+/gu, ' ').slice(0, 500),
        ok: false,
      });
      continue;
    }

    results.push({
      ...publicOperationPlan(query),
      ok: true,
    });
  }

  return results;
}

function runReadonlyQueries(args, configPath, databases) {
  const results = [];

  for (const query of readonlyQueryPlans(databases)) {
    const commandArgs = wranglerExecuteArgs(args, configPath, query.database, query.sql);
    const result = spawnSync('wrangler', commandArgs, {
      cwd: workspaceRoot,
      encoding: 'utf8',
      env: { ...process.env, NO_COLOR: '1' },
      maxBuffer: 10 * 1024 * 1024,
    });

    if (result.error !== undefined) {
      results.push({
        binding: query.database.binding,
        error: result.error.message,
        id: query.id,
        ok: false,
      });
      continue;
    }

    if (result.status !== 0) {
      results.push({
        binding: query.database.binding,
        error: (result.stderr || result.stdout).trim().replaceAll(/\s+/gu, ' ').slice(0, 500),
        id: query.id,
        ok: false,
      });
      continue;
    }

    try {
      const parsed = JSON.parse(result.stdout.trim());

      results.push({
        binding: query.database.binding,
        id: query.id,
        ok: true,
        results: Array.isArray(parsed) ? (parsed[0]?.results ?? []) : [],
      });
    } catch (error) {
      results.push({
        binding: query.database.binding,
        error: error instanceof Error ? error.message : String(error),
        id: query.id,
        ok: false,
      });
    }
  }

  return results;
}

function asNumber(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseTimestampMs(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function hoursSince(timestampMs, nowMs) {
  return Math.max(0, (nowMs - timestampMs) / (60 * 60 * 1000));
}

function createAlert({ binding, id, message, metric, severity, value }) {
  return {
    binding,
    id,
    message,
    metric,
    severity,
    value,
  };
}

function alertsFromRouterShards(result, args, nowMs) {
  const alerts = [];

  for (const row of result.results ?? []) {
    const binding = typeof row.binding_name === 'string' ? row.binding_name : result.binding;
    const estimatedSizeBytes = asNumber(row.estimated_size_bytes);
    const freshnessTimestamp =
      parseTimestampMs(row.source_freshness_at) ?? parseTimestampMs(row.last_import_completed_at);

    if (estimatedSizeBytes === undefined) {
      alerts.push(
        createAlert({
          binding,
          id: 'missing-shard-size-estimate',
          message: 'Shard registry does not expose estimated D1 size headroom.',
          metric: 'estimated_size_bytes',
          severity: args.requireSizeEstimates ? 'error' : 'warning',
          value: null,
        }),
      );
    } else if (estimatedSizeBytes >= args.blockSizeBytes) {
      alerts.push(
        createAlert({
          binding,
          id: 'shard-size-block',
          message: 'Shard estimated size is at or above the import block threshold.',
          metric: 'estimated_size_bytes',
          severity: 'error',
          value: estimatedSizeBytes,
        }),
      );
    } else if (estimatedSizeBytes !== undefined && estimatedSizeBytes >= args.warnSizeBytes) {
      alerts.push(
        createAlert({
          binding,
          id: 'shard-size-warn',
          message: 'Shard estimated size is at or above the warning threshold.',
          metric: 'estimated_size_bytes',
          severity: 'warning',
          value: estimatedSizeBytes,
        }),
      );
    }

    if (freshnessTimestamp !== undefined) {
      const ageHours = hoursSince(freshnessTimestamp, nowMs);

      if (ageHours > args.maxImportAgeHours) {
        alerts.push(
          createAlert({
            binding,
            id: 'shard-freshness-stale',
            message: 'Shard source freshness/import timestamp is stale.',
            metric: 'freshness_age_hours',
            severity: 'error',
            value: Math.round(ageHours * 1000) / 1000,
          }),
        );
      }
    }
  }

  return alerts;
}

function alertsFromImportRuns(result, args, nowMs) {
  const alerts = [];
  const [latestRun] = result.results ?? [];

  if (latestRun === undefined) {
    alerts.push(
      createAlert({
        binding: result.binding,
        id: 'missing-import-run',
        message: 'No import run metadata was found for this shard.',
        metric: 'import_runs',
        severity: 'error',
        value: 0,
      }),
    );
    return alerts;
  }

  const failedRows = asNumber(latestRun.failed_rows) ?? 0;
  const completedAt = parseTimestampMs(latestRun.completed_at);

  if (latestRun.status !== 'completed') {
    alerts.push(
      createAlert({
        binding: result.binding,
        id: 'latest-import-not-completed',
        message: 'Latest import run is not completed.',
        metric: 'import_status',
        severity: 'error',
        value: String(latestRun.status ?? 'unknown'),
      }),
    );
  }

  if (failedRows > args.maxFailedRows) {
    alerts.push(
      createAlert({
        binding: result.binding,
        id: 'failed-rows',
        message: 'Latest import run has too many failed rows.',
        metric: 'failed_rows',
        severity: 'error',
        value: failedRows,
      }),
    );
  }

  if (completedAt !== undefined) {
    const ageHours = hoursSince(completedAt, nowMs);

    if (ageHours > args.maxImportAgeHours) {
      alerts.push(
        createAlert({
          binding: result.binding,
          id: 'latest-import-stale',
          message: 'Latest completed import run is stale.',
          metric: 'import_age_hours',
          severity: 'error',
          value: Math.round(ageHours * 1000) / 1000,
        }),
      );
    }
  }

  return alerts;
}

function alertsFromSourceProvenance(result) {
  const alerts = [];
  const rows = result.results ?? [];
  const ruianSource = rows.find((row) => row.id === 'ruian-cz');

  if (ruianSource === undefined) {
    alerts.push(
      createAlert({
        binding: result.binding,
        id: 'missing-ruian-source-provenance',
        message: 'RUIAN source provenance was not found in shard data sources.',
        metric: 'data_sources',
        severity: 'error',
        value: 0,
      }),
    );

    return alerts;
  }

  const expected = {
    attribution_label: 'CUZK RUIAN',
    attribution_license: 'CC BY 4.0',
    attribution_url: 'https://ruian.cuzk.cz/',
  };

  for (const [field, expectedValue] of Object.entries(expected)) {
    if (ruianSource[field] !== expectedValue) {
      alerts.push(
        createAlert({
          binding: result.binding,
          id: 'ruian-source-attribution-mismatch',
          message: `RUIAN source ${field} does not match the source catalog contract.`,
          metric: field,
          severity: 'error',
          value: ruianSource[field] ?? null,
        }),
      );
    }
  }

  if (
    typeof ruianSource.modification_note_sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(ruianSource.modification_note_sha256)
  ) {
    alerts.push(
      createAlert({
        binding: result.binding,
        id: 'missing-source-modification-note-hash',
        message: 'RUIAN source provenance is missing the Smart Suggest modification-note hash.',
        metric: 'modification_note_sha256',
        severity: 'error',
        value: null,
      }),
    );
  }

  return alerts;
}

function createOperationalAlerts(readonlyResults, args) {
  const nowMs = Date.now();
  const alerts = [];

  for (const result of readonlyResults) {
    if (result.ok !== true) {
      continue;
    }
    if (result.id === 'router-shards') {
      alerts.push(...alertsFromRouterShards(result, args, nowMs));
    }
    if (result.id === 'latest-import-runs') {
      alerts.push(...alertsFromImportRuns(result, args, nowMs));
    }
    if (result.id === 'source-provenance') {
      alerts.push(...alertsFromSourceProvenance(result));
    }
  }

  return alerts;
}

function reportStatus(checks, readonlyResults, optimizeResults, alerts) {
  return checks.some((check) => check.severity === 'error' && check.ok !== true) ||
    readonlyResults.some((result) => result.ok !== true) ||
    optimizeResults.some((result) => result.ok !== true) ||
    alerts.some((alert) => alert.severity === 'error')
    ? 'failed'
    : 'ok';
}

function writeJson(filePath, value) {
  if (filePath === undefined) {
    return;
  }

  const outputPath = resolveWorkspacePath(filePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`);
}

function renderSummary(report) {
  const lines = [
    `Smart Suggest D1 operations ${report.command}: ${report.status}`,
    `Config: ${report.configPath}`,
    `Target: ${report.target}`,
    `Databases: ${report.databases.length}`,
    `Checks: ${report.checks.filter((check) => check.ok === true).length}/${report.checks.length} passing`,
  ];
  const failedChecks = report.checks.filter((check) => check.ok !== true);

  if (failedChecks.length > 0) {
    lines.push('Failed checks:');

    for (const check of failedChecks) {
      lines.push(`- ${check.id}${check.binding === undefined ? '' : ` (${check.binding})`}`);
    }
  }

  if (report.backupCommands.length > 0) {
    lines.push('Backup/export commands:');

    for (const entry of report.backupCommands) {
      lines.push(`- ${entry.shell}`);
    }
  }
  if (report.provisionCommands.length > 0) {
    lines.push('D1 create commands:');

    for (const entry of report.provisionCommands) {
      lines.push(`- ${entry.shell}`);
    }
  }
  if (report.provisionEnvTemplate.length > 0) {
    lines.push('Provision env template:');

    for (const line of report.provisionEnvTemplate) {
      lines.push(`- ${line}`);
    }
  }

  if (report.readonlyResults.length > 0) {
    lines.push(
      `Read-only queries: ${report.readonlyResults.filter((entry) => entry.ok).length}/${report.readonlyResults.length} passing`,
    );
  }
  if (report.optimizeOperations.length > 0) {
    lines.push(
      `Optimize operations: ${report.optimizeResults.length > 0 ? `${report.optimizeResults.filter((entry) => entry.ok).length}/${report.optimizeResults.length} executed` : `${report.optimizeOperations.length} planned`}`,
    );
  }
  if (report.alerts.length > 0) {
    lines.push(
      `Alerts: ${report.alerts.filter((alert) => alert.severity === 'error').length} error(s), ${report.alerts.filter((alert) => alert.severity === 'warning').length} warning(s)`,
    );
  }

  return `${lines.join('\n')}\n`;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);

  if (args.help) {
    printHelp();
    return;
  }

  const configPath = resolveWorkspacePath(args.wranglerConfig);
  const config = readJson(configPath);
  const plans = createPlans(config, args);
  const checks = validatePlans(configPath, plans, args);
  const backupCommands =
    args.command === 'backup-plan'
      ? plans.databases.map((database) => exportArgsForDatabase(args, configPath, database))
      : [];
  const provisionCommands =
    args.command === 'provision-plan'
      ? plans.databases.map((database) => provisionArgsForDatabase(database))
      : [];
  const provisionEnv = args.command === 'provision-plan' ? provisionEnvTemplate(plans) : [];
  const optimizeOperations =
    args.command === 'optimize'
      ? optimizeQueryPlans(plans.databases).map((query) => publicOperationPlan(query))
      : [];
  const optimizeResults =
    args.command === 'optimize' && args.execute
      ? runOptimizeQueries(args, configPath, plans.databases)
      : [];
  const readonlyResults = args.executeReadonly
    ? runReadonlyQueries(args, configPath, plans.databases)
    : [];
  const alerts = createOperationalAlerts(readonlyResults, args);
  const report = {
    alerts,
    backupCommands,
    checks,
    command: args.command,
    configPath: relativeWorkspacePath(configPath),
    databases: plans.databases,
    expectedCzVuscCodes,
    mutatingExecution: args.command === 'optimize' ? args.execute : false,
    optimizeOperations,
    optimizeResults,
    provisionCommands,
    provisionEnvTemplate: provisionEnv,
    readonlyResults,
    schemaVersion: 'smart-suggest-d1-operations/v1',
    status: reportStatus(checks, readonlyResults, optimizeResults, alerts),
    target: args.d1Target,
    thresholds: {
      blockSizeBytes: args.blockSizeBytes,
      maxFailedRows: args.maxFailedRows,
      maxImportAgeHours: args.maxImportAgeHours,
      requireSizeEstimates: args.requireSizeEstimates,
      warnSizeBytes: args.warnSizeBytes,
    },
  };

  writeJson(args.jsonOut, report);
  process.stdout.write(renderSummary(report));

  if (report.status !== 'ok') {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const sqlPlaceholder = '?';

function wranglerExecutable() {
  return process.platform === 'win32' ? 'wrangler.cmd' : 'wrangler';
}

function formatSqlLiteral(value) {
  if (value === null) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('D1 SQL parameter must be a finite number.');
    }

    return String(value);
  }
  if (typeof value === 'bigint') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0';
  }
  if (typeof value === 'string') {
    return `'${value.replaceAll("'", "''")}'`;
  }
  if (value instanceof Uint8Array) {
    return `X'${[...value].map((byte) => byte.toString(16).padStart(2, '0')).join('')}'`;
  }

  throw new Error(`Unsupported D1 SQL parameter type: ${typeof value}.`);
}

function bindSqlParameters(sql, params) {
  if (params.length === 0) {
    return sql;
  }

  let boundSql = '';
  let paramIndex = 0;
  let state = 'normal';

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (state === 'normal') {
      if (char === "'") {
        state = 'single-quote';
        boundSql += char;
        continue;
      }
      if (char === '"') {
        state = 'double-quote';
        boundSql += char;
        continue;
      }
      if (char === '-' && next === '-') {
        state = 'line-comment';
        boundSql += char + next;
        index += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        state = 'block-comment';
        boundSql += char + next;
        index += 1;
        continue;
      }
      if (char === sqlPlaceholder) {
        if (paramIndex >= params.length) {
          throw new Error('D1 SQL has more placeholders than bound parameters.');
        }

        boundSql += formatSqlLiteral(params[paramIndex]);
        paramIndex += 1;
        continue;
      }

      boundSql += char;
      continue;
    }

    if (state === 'single-quote') {
      boundSql += char;
      if (char === "'" && next === "'") {
        boundSql += next;
        index += 1;
      } else if (char === "'") {
        state = 'normal';
      }
      continue;
    }

    if (state === 'double-quote') {
      boundSql += char;
      if (char === '"' && next === '"') {
        boundSql += next;
        index += 1;
      } else if (char === '"') {
        state = 'normal';
      }
      continue;
    }

    if (state === 'line-comment') {
      boundSql += char;
      if (char === '\n') {
        state = 'normal';
      }
      continue;
    }

    boundSql += char;
    if (char === '*' && next === '/') {
      boundSql += next;
      index += 1;
      state = 'normal';
    }
  }

  if (paramIndex !== params.length) {
    throw new Error('D1 SQL has fewer placeholders than bound parameters.');
  }

  return boundSql;
}

function targetArgs({ persistTo, target }) {
  if (target === 'local') {
    const args = ['--local'];

    if (persistTo !== undefined) {
      args.push('--persist-to', persistTo);
    }

    return args;
  }
  if (target === 'remote') {
    return ['--remote'];
  }
  if (target === 'preview') {
    return ['--remote', '--preview'];
  }

  throw new Error(`Unsupported D1 target: ${target}.`);
}

function compactOutput(value) {
  const normalized = value.trim().replaceAll(/\s+/gu, ' ');

  return normalized.length > 800 ? `${normalized.slice(0, 800)}...` : normalized;
}

function parseWranglerJson(stdout) {
  const text = stdout.trim();

  if (text.length === 0) {
    throw new Error('wrangler d1 execute returned no JSON output.');
  }

  const parsed = JSON.parse(text);

  if (!Array.isArray(parsed)) {
    throw new Error('wrangler d1 execute returned an unexpected JSON shape.');
  }

  return parsed;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function resolveProcessPath(cwd, inputPath) {
  return path.isAbsolute(inputPath) ? inputPath : path.resolve(cwd, inputPath);
}

function findD1DatabaseConfig(config, database) {
  const databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];

  return databases.find(
    (entry) =>
      isRecord(entry) &&
      (entry.binding === database ||
        entry.database_name === database ||
        entry.database_id === database ||
        entry.preview_database_id === database),
  );
}

function listSqlMigrations(directory) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Smart Suggest D1 migrations directory is missing: ${directory}`);
  }

  const sqlFiles = fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right));

  if (sqlFiles.length === 0) {
    throw new Error(`Smart Suggest D1 migrations directory has no SQL files: ${directory}`);
  }

  return sqlFiles;
}

function syncConfiguredD1Migrations(options) {
  if (options.migrationsSource === undefined) {
    return;
  }

  const configPath = resolveProcessPath(options.cwd, options.configPath);
  const migrationsSource = resolveProcessPath(options.cwd, options.migrationsSource);
  const config = readJson(configPath);
  const databaseConfig = findD1DatabaseConfig(config, options.database);

  if (databaseConfig === undefined) {
    throw new Error(`D1 database "${options.database}" was not found in ${options.configPath}.`);
  }
  if (typeof databaseConfig.migrations_dir !== 'string') {
    throw new Error(
      `D1 database "${options.database}" in ${options.configPath} has no migrations_dir.`,
    );
  }

  const outputPath = path.isAbsolute(databaseConfig.migrations_dir)
    ? databaseConfig.migrations_dir
    : path.resolve(path.dirname(configPath), databaseConfig.migrations_dir);
  const sourceSqlFiles = listSqlMigrations(migrationsSource);

  if (path.resolve(outputPath) !== path.resolve(migrationsSource)) {
    fs.rmSync(outputPath, { force: true, recursive: true });
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.cpSync(migrationsSource, outputPath, { recursive: true });
  }

  const outputSqlFiles = listSqlMigrations(outputPath);
  if (sourceSqlFiles.join('\n') !== outputSqlFiles.join('\n')) {
    throw new Error(
      `Configured D1 migrations at ${outputPath} do not match source migrations at ${migrationsSource}.`,
    );
  }

  process.stdout.write(
    `Synced Smart Suggest D1 migrations to ${outputPath} (${outputSqlFiles.length} SQL file(s))\n`,
  );
}

class WranglerD1Runner {
  constructor(options) {
    this.configPath = options.configPath;
    this.cwd = options.cwd;
    this.database = options.database;
    this.persistTo = options.persistTo;
    this.target = options.target;
  }

  execute(sql, params) {
    const command = bindSqlParameters(sql, params);
    const result = spawnSync(
      wranglerExecutable(),
      [
        'd1',
        'execute',
        this.database,
        '--config',
        this.configPath,
        ...targetArgs({ persistTo: this.persistTo, target: this.target }),
        '--json',
        '--command',
        command,
      ],
      {
        cwd: this.cwd,
        encoding: 'utf8',
        env: { ...process.env, NO_COLOR: '1' },
        maxBuffer: 10 * 1024 * 1024,
      },
    );

    if (result.error !== undefined) {
      throw result.error;
    }
    if (result.status !== 0) {
      const detail = compactOutput(result.stderr || result.stdout);
      const suffix = detail.length === 0 ? '' : `: ${detail}`;

      throw new Error(`wrangler d1 execute failed with exit code ${result.status ?? 1}${suffix}`);
    }

    const results = parseWranglerJson(result.stdout);

    if (results.length !== 1) {
      throw new Error(
        `wrangler d1 execute returned ${results.length} result sets for one command.`,
      );
    }

    const [queryResult] = results;

    if (queryResult?.success !== true) {
      throw new Error('wrangler d1 execute reported an unsuccessful query.');
    }

    return {
      meta: queryResult.meta ?? {},
      results: Array.isArray(queryResult.results) ? queryResult.results : [],
      success: true,
    };
  }
}

class WranglerD1PreparedStatement {
  constructor(runner, sql, params = []) {
    this.params = params;
    this.runner = runner;
    this.sql = sql;
  }

  bind(...params) {
    return new WranglerD1PreparedStatement(this.runner, this.sql, params);
  }

  async run() {
    return this.runner.execute(this.sql, this.params);
  }

  async all() {
    return this.runner.execute(this.sql, this.params);
  }

  async raw() {
    const result = this.runner.execute(this.sql, this.params);

    return result.results.map((row) => Object.values(row));
  }

  async first(columnName) {
    const result = this.runner.execute(this.sql, this.params);
    const [row] = result.results;

    if (row === undefined || columnName === undefined) {
      return row;
    }

    return row[columnName];
  }
}

export function createWranglerD1Binding(options) {
  const runner = new WranglerD1Runner(options);

  return {
    batch: async (statements) => {
      const results = [];

      for (const statement of statements) {
        results.push(await statement.run());
      }

      return results;
    },
    prepare: (sql) => new WranglerD1PreparedStatement(runner, sql),
  };
}

export function applyWranglerD1Migrations(options) {
  syncConfiguredD1Migrations(options);

  const result = spawnSync(
    wranglerExecutable(),
    [
      'd1',
      'migrations',
      'apply',
      options.database,
      '--config',
      options.configPath,
      ...targetArgs({ persistTo: options.persistTo, target: options.target }),
    ],
    {
      cwd: options.cwd,
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`wrangler d1 migrations apply failed with exit code ${result.status ?? 1}.`);
  }
}

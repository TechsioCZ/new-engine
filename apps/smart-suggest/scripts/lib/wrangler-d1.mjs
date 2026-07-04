const databaseNameOf = (database) =>
  typeof database === 'string' ? database : database.databaseName;

export function wranglerExecuteArgs(args, configPath, database, sql) {
  const commandArgs = [
    'd1',
    'execute',
    databaseNameOf(database),
    '--config',
    configPath,
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

export function smartSuggestD1ScriptArgs(args) {
  const command = [
    '--d1-target',
    args.d1Target,
    '--wrangler-config',
    args.wranglerConfig,
    '--router-d1-binding',
    args.routerD1Binding,
    '--shard-bindings',
    args.shardBindings,
    '--shard-route-strategy',
    args.shardRouteStrategy,
  ];

  if (args.shardRouteStrategy !== 'hash' && args.shardRegionMapJson !== undefined) {
    command.push('--shard-region-map-json', args.shardRegionMapJson);
  }

  if (args.persistTo !== undefined) {
    command.push('--persist-to', args.persistTo);
  }

  return command;
}

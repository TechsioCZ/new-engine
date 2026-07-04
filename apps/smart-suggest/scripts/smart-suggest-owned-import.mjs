#!/usr/bin/env node
import { pathToFileURL } from 'node:url';

import {
  loadSmartSuggestModules,
  parseArgs,
  printHelp,
  runBuildArtifacts,
  runImportD1,
  runImportLocal,
  runImportShardedD1,
  runProofOffline,
  sanitizeCliErrorMessage,
} from './lib/owned-import/commands.mjs';

export * from './lib/owned-import/commands.mjs';

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return 0;
  }
  const modules = await loadSmartSuggestModules();
  if (args.command === 'import-local') {
    await runImportLocal(args, modules);
    return 0;
  }
  if (args.command === 'import-d1') {
    await runImportD1(args, modules);
    return 0;
  }
  if (args.command === 'import-sharded-d1') {
    await runImportShardedD1(args, modules);
    return 0;
  }
  if (args.command === 'build-artifacts') {
    await runBuildArtifacts(args, modules);
    return 0;
  }
  await runProofOffline(args, modules);
  return 0;
}

const isCliEntrypoint =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCliEntrypoint) {
  main().catch((error) => {
    process.stderr.write(`${sanitizeCliErrorMessage(error)}\n`);
    process.exitCode = 1;
  });
}

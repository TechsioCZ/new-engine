#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutDir = '/tmp/smart-suggest-ruian-source';
const defaultEnvOut = '/tmp/smart-suggest-ruian-source-env.sh';
const defaultJsonOut = '.codex/reports/smart-suggest-ruian-source-bootstrap/summary.json';
const defaultSnapshotUriPrefix = 'operator-retained://smart-suggest/ruian';
const modificationNote =
  'Smart Suggest normalizes RUIAN source rows into runtime address suggestions.';
const feeds = {
  address: {
    envPrefix: 'SMART_SUGGEST_RUIAN',
    feedId: 'RUIAN-CSV-ADR-ST',
    fileName: 'ruian-csv-adr-st.atom.xml',
    url: 'https://atom.cuzk.gov.cz/RUIAN-CSV-ADR-ST/datasetFeeds/CZ-00025712-CUZK_RUIAN-CSV-ADR-ST_1.xml',
  },
  hierarchy: {
    feedId: 'RUIAN-S-ZA-U',
    fileName: 'ruian-s-za-u-st.atom.xml',
    url: 'https://atom.cuzk.gov.cz/RUIAN-S-ZA-U/datasetFeeds/CZ-00025712-CUZK_RUIAN-S-ZA-U_1.xml',
  },
};

function readOption(argv, optionName, defaultValue) {
  const index = argv.indexOf(optionName);

  if (index < 0) {
    return defaultValue;
  }
  if (argv[index + 1] === undefined || argv[index + 1].startsWith('--')) {
    throw new Error(`${optionName} requires a value.`);
  }

  return argv[index + 1];
}

function parseArgs(argv) {
  return {
    envOut: readOption(argv, '--env-out', defaultEnvOut),
    executeDownload: argv.includes('--execute-download'),
    force: argv.includes('--force'),
    jsonOut: readOption(argv, '--json-out', defaultJsonOut),
    outDir: readOption(argv, '--out-dir', defaultOutDir),
    snapshotUriPrefix: readOption(argv, '--snapshot-uri-prefix', defaultSnapshotUriPrefix),
  };
}

function resolveAppPath(filePath) {
  return path.isAbsolute(filePath) ? filePath : path.resolve(appRoot, filePath);
}

function writeJson(filePath, value) {
  const absolutePath = resolveAppPath(filePath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`);
}

function assert(condition, message, details = {}) {
  if (!condition) {
    const error = new Error(message);
    Object.assign(error, { details });
    throw error;
  }
}

function toArray(value) {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/atom+xml, application/xml;q=0.9, text/xml;q=0.8',
      'user-agent': 'SmartSuggestRuianBootstrap/1.0',
    },
  });

  assert(response.ok, `Failed to fetch Atom feed: ${url}`, {
    status: response.status,
    statusText: response.statusText,
  });

  return response.text();
}

function parseXml(xml) {
  return new XMLParser({
    attributeNamePrefix: '@_',
    ignoreAttributes: false,
    parseAttributeValue: false,
    parseTagValue: false,
    removeNSPrefix: true,
    trimValues: true,
  }).parse(xml);
}

function firstText(value) {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number') {
    return String(value);
  }

  return undefined;
}

function selectAlternateLink(entry) {
  const links = toArray(entry.link);
  const alternateLinks = links.filter((link) => link?.['@_rel'] === 'alternate');
  const [selected] = alternateLinks.length > 0 ? alternateLinks : links;

  assert(selected !== undefined, 'Atom entry does not contain a download link.');
  assert(
    typeof selected['@_href'] === 'string' && selected['@_href'].trim().length > 0,
    'Atom entry download link is missing href.',
  );

  return selected;
}

function deriveSourceVersion(downloadUrl) {
  const fileName = path.basename(new URL(downloadUrl).pathname);
  const match = /(\d{8})/u.exec(fileName);

  assert(match !== null, 'RUIAN download file name does not contain YYYYMMDD source version.', {
    fileName,
  });

  return match[1];
}

function sourceVersionToDate(sourceVersion) {
  return `${sourceVersion.slice(0, 4)}-${sourceVersion.slice(4, 6)}-${sourceVersion.slice(6, 8)}`;
}

function parseAtomFeed(xml, feedConfig) {
  const parsed = parseXml(xml);
  const feed = parsed.feed;

  assert(feed !== undefined && typeof feed === 'object', 'Atom XML does not contain feed.');
  const entries = toArray(feed.entry);

  assert(entries.length > 0, `Atom feed ${feedConfig.feedId} does not contain entries.`);
  const sortedEntries = entries.toSorted((left, right) =>
    String(firstText(right.updated) ?? '').localeCompare(String(firstText(left.updated) ?? '')),
  );
  const [entry] = sortedEntries;
  const link = selectAlternateLink(entry);
  const downloadUrl = link['@_href'].trim();
  const sourceVersion = deriveSourceVersion(downloadUrl);

  return {
    atomEntryId: firstText(entry.id) ?? downloadUrl,
    downloadFileName: path.basename(new URL(downloadUrl).pathname),
    downloadLength: link['@_length'] === undefined ? null : Number(link['@_length']),
    downloadType: typeof link['@_type'] === 'string' ? link['@_type'] : null,
    downloadUrl,
    feedId: feedConfig.feedId,
    feedTitle: firstText(feed.title) ?? null,
    feedUpdated: firstText(feed.updated) ?? null,
    sourceGeneratedAt: firstText(entry.updated) ?? firstText(feed.updated),
    sourceValidAt: sourceVersionToDate(sourceVersion),
    sourceVersion,
  };
}

async function writeAtomSnapshot(outDir, feedConfig) {
  const xml = await fetchText(feedConfig.url);
  const atomPath = path.join(outDir, feedConfig.fileName);

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(atomPath, xml);

  return {
    atomPath,
    parsed: parseAtomFeed(xml, feedConfig),
    sha256: hashBuffer(Buffer.from(xml)),
  };
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function hashFileSha256(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk);
  }

  return hash.digest('hex');
}

async function downloadFile(url, filePath, options) {
  if (fs.existsSync(filePath) && !options.force) {
    return { downloaded: false };
  }

  const response = await fetch(url, {
    headers: {
      'user-agent': 'SmartSuggestRuianBootstrap/1.0',
    },
  });

  assert(response.ok, `Failed to download retained RUIAN artifact: ${url}`, {
    status: response.status,
    statusText: response.statusText,
  });
  assert(response.body !== null, `Download response body was empty: ${url}`);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(filePath));

  return { downloaded: true };
}

function retainedSnapshotUri(prefix, fileName) {
  return `${prefix.replaceAll(/\/+$/gu, '')}/${fileName}`;
}

async function resolveArtifact(feedSnapshot, args) {
  const artifactPath = path.join(args.outDir, feedSnapshot.parsed.downloadFileName);

  if (!fs.existsSync(artifactPath) || args.force) {
    assert(
      args.executeDownload,
      'RUIAN artifact is missing. Re-run with --execute-download to retain it outside git.',
      {
        fileName: feedSnapshot.parsed.downloadFileName,
      },
    );

    await downloadFile(feedSnapshot.parsed.downloadUrl, artifactPath, args);
  }

  const stat = fs.statSync(artifactPath);

  return {
    fileName: feedSnapshot.parsed.downloadFileName,
    path: artifactPath,
    retainedUri: retainedSnapshotUri(args.snapshotUriPrefix, feedSnapshot.parsed.downloadFileName),
    sha256: await hashFileSha256(artifactPath),
    sizeBytes: stat.size,
  };
}

function shellQuote(value) {
  return `'${String(value).replaceAll("'", "'\"'\"'")}'`;
}

function envLines({ addressArtifact, addressFeed, hierarchyArtifact }) {
  return [
    '# Generated by Smart Suggest RUIAN source bootstrap. Keep this file outside git.',
    `export SMART_SUGGEST_RUIAN_SNAPSHOT_PATH=${shellQuote(addressArtifact.path)}`,
    `export SMART_SUGGEST_RUIAN_SNAPSHOT_CHECKSUM_SHA256=${shellQuote(addressArtifact.sha256)}`,
    `export SMART_SUGGEST_RUIAN_SNAPSHOT_URI=${shellQuote(addressArtifact.retainedUri)}`,
    `export SMART_SUGGEST_RUIAN_SOURCE_URI=${shellQuote(addressFeed.parsed.downloadUrl)}`,
    `export SMART_SUGGEST_RUIAN_DATASET_VERSION=${shellQuote(
      `ruian-cz-${addressFeed.parsed.sourceValidAt}`,
    )}`,
    `export SMART_SUGGEST_RUIAN_SOURCE_VERSION=${shellQuote(addressFeed.parsed.sourceVersion)}`,
    `export SMART_SUGGEST_RUIAN_SOURCE_GENERATED_AT=${shellQuote(
      addressFeed.parsed.sourceGeneratedAt,
    )}`,
    `export SMART_SUGGEST_RUIAN_SOURCE_VALID_AT=${shellQuote(addressFeed.parsed.sourceValidAt)}`,
    `export SMART_SUGGEST_RUIAN_ATOM_ENTRY_ID=${shellQuote(addressFeed.parsed.atomEntryId)}`,
    `export SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_PATH=${shellQuote(hierarchyArtifact.path)}`,
    `export SMART_SUGGEST_RUIAN_REGION_MAP_SNAPSHOT_CHECKSUM_SHA256=${shellQuote(
      hierarchyArtifact.sha256,
    )}`,
    "export SMART_SUGGEST_RUIAN_ATTRIBUTION_LABEL='CUZK RUIAN'",
    "export SMART_SUGGEST_RUIAN_ATTRIBUTION_LICENSE='CC BY 4.0'",
    "export SMART_SUGGEST_RUIAN_ATTRIBUTION_URL='https://ruian.cuzk.cz/'",
    `export SMART_SUGGEST_RUIAN_MODIFICATION_NOTE=${shellQuote(modificationNote)}`,
    "export SMART_SUGGEST_RUIAN_CSV_ENCODING='windows-1250'",
    "export SMART_SUGGEST_RUIAN_CSV_DELIMITER=';'",
  ];
}

function writeEnvFile(envOut, lines) {
  fs.mkdirSync(path.dirname(envOut), { recursive: true });
  fs.writeFileSync(envOut, `${lines.join('\n')}\n`);
  fs.chmodSync(envOut, 0o600);
}

function publicArtifactReport(feedSnapshot, artifact) {
  return {
    atomEntryId: feedSnapshot.parsed.atomEntryId,
    downloadFileName: feedSnapshot.parsed.downloadFileName,
    downloadLength: feedSnapshot.parsed.downloadLength,
    downloadType: feedSnapshot.parsed.downloadType,
    feedId: feedSnapshot.parsed.feedId,
    retainedFileName: artifact.fileName,
    retainedPathRedacted: true,
    retainedUri: artifact.retainedUri,
    sha256: artifact.sha256,
    sizeBytes: artifact.sizeBytes,
    sourceGeneratedAt: feedSnapshot.parsed.sourceGeneratedAt,
    sourceUri: feedSnapshot.parsed.downloadUrl,
    sourceValidAt: feedSnapshot.parsed.sourceValidAt,
    sourceVersion: feedSnapshot.parsed.sourceVersion,
  };
}

function writeExternalManifest(args, value) {
  const manifestPath = path.join(args.outDir, 'smart-suggest-ruian-source-manifest.json');

  writeJson(manifestPath, value);

  return manifestPath;
}

async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const addressFeed = await writeAtomSnapshot(args.outDir, feeds.address);
  const hierarchyFeed = await writeAtomSnapshot(args.outDir, feeds.hierarchy);
  const addressArtifact = await resolveArtifact(addressFeed, args);
  const hierarchyArtifact = await resolveArtifact(hierarchyFeed, args);
  const lines = envLines({
    addressArtifact,
    addressFeed,
    hierarchyArtifact,
  });

  writeEnvFile(args.envOut, lines);

  const externalManifest = {
    address: publicArtifactReport(addressFeed, addressArtifact),
    generatedAt: new Date().toISOString(),
    hierarchy: publicArtifactReport(hierarchyFeed, hierarchyArtifact),
    paths: {
      addressSnapshotPath: addressArtifact.path,
      atomDirectory: args.outDir,
      envOut: args.envOut,
      hierarchySnapshotPath: hierarchyArtifact.path,
    },
  };
  const externalManifestPath = writeExternalManifest(args, externalManifest);
  const report = {
    address: publicArtifactReport(addressFeed, addressArtifact),
    envFileName: path.basename(args.envOut),
    envPathRedacted: true,
    externalDirectoryRedacted: true,
    externalManifestFileName: path.basename(externalManifestPath),
    generatedAt: new Date().toISOString(),
    hierarchy: publicArtifactReport(hierarchyFeed, hierarchyArtifact),
    status: 'ok',
  };

  writeJson(args.jsonOut, report);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  if (error?.details !== undefined) {
    process.stderr.write(`${JSON.stringify(error.details, null, 2)}\n`);
  }
  process.exitCode = 1;
}

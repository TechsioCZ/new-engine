#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const DEFAULT_CONFIG_PATH = "scripts/ui-primitives.config.mjs";
const BASE_EXCLUDE_PATTERNS = [
  "**/node_modules/**",
  "**/.next/**",
  "**/.git/**",
];

function parseArgs(argv) {
  const args = { configPath: DEFAULT_CONFIG_PATH, json: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      args.json = true;
      continue;
    }

    if (arg === "--config") {
      const nextValue = argv[index + 1];
      if (nextValue) {
        args.configPath = nextValue;
        index += 1;
      }
      continue;
    }

    if (arg.startsWith("--config=")) {
      args.configPath = arg.slice("--config=".length);
    }
  }

  return args;
}

function normalizePath(value) {
  return value.replaceAll(path.sep, "/");
}

function globToRegExp(globPattern) {
  const normalized = normalizePath(globPattern);
  const withMarkers = normalized
    .replaceAll("**", "__DOUBLE_STAR__")
    .replaceAll("*", "__SINGLE_STAR__");
  const escaped = withMarkers
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replaceAll("__DOUBLE_STAR__", ".*")
    .replaceAll("__SINGLE_STAR__", "[^/]*");
  return new RegExp(`^${escaped}$`);
}

function listSourceFiles(rootDir, config) {
  const extensions = new Set(config.fileExtensions ?? [".ts", ".tsx"]);
  const excludeRegexes = [
    ...BASE_EXCLUDE_PATTERNS,
    ...(config.exclude ?? []),
  ].map(globToRegExp);
  const scanDirectories = config.scanDirectories ?? [];
  const files = [];

  const walk = (absoluteDir) => {
    if (!fs.existsSync(absoluteDir)) {
      return;
    }

    const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(absoluteDir, entry.name);
      const relativePath = normalizePath(path.relative(rootDir, absolutePath));

      if (excludeRegexes.some((regex) => regex.test(relativePath))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (!(entry.isFile() && extensions.has(path.extname(entry.name)))) {
        continue;
      }

      files.push(relativePath);
    }
  };

  for (const relativeDir of scanDirectories) {
    walk(path.resolve(rootDir, relativeDir));
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function parseRuleConfig(config) {
  const rules = config.rules ?? {};
  const bannedJsxTags = rules.bannedJsxTags ?? { enabled: false };
  const bannedImports = rules.bannedImports ?? { enabled: false };

  const allowByFile = (bannedJsxTags.allowByFile ?? []).map((item) => ({
    tag: String(item.tag ?? "").toLowerCase(),
    fileRegex: globToRegExp(String(item.filePattern ?? "")),
  }));

  return {
    bannedJsxTags: {
      enabled: Boolean(bannedJsxTags.enabled),
      tags: new Set(
        (bannedJsxTags.tags ?? []).map((tag) => String(tag).toLowerCase()),
      ),
      suggestions: bannedJsxTags.suggestions ?? {},
      allowByFile,
    },
    bannedImports: {
      enabled: Boolean(bannedImports.enabled),
      modulePatterns: (bannedImports.modulePatterns ?? []).map((pattern) => {
        if (pattern instanceof RegExp) {
          return pattern;
        }
        return new RegExp(String(pattern));
      }),
      message:
        bannedImports.message ??
        "Nepovoleny import knihovny. Pouzij komponentu z @techsio/ui-kit.",
    },
  };
}

function getLineAndColumn(sourceFile, position) {
  const { line, character } = ts.getLineAndCharacterOfPosition(
    sourceFile,
    position,
  );
  return { line: line + 1, column: character + 1 };
}

function isIntrinsicTagName(tagNameNode) {
  if (ts.isIdentifier(tagNameNode)) {
    const text = tagNameNode.text;
    return text.length > 0 && text[0] === text[0].toLowerCase();
  }

  if (ts.isJsxNamespacedName(tagNameNode)) {
    return true;
  }

  return false;
}

function normalizedTagName(tagNameNode, sourceFile) {
  if (ts.isIdentifier(tagNameNode)) {
    return tagNameNode.text.toLowerCase();
  }

  if (ts.isJsxNamespacedName(tagNameNode)) {
    return `${tagNameNode.namespace.text}:${tagNameNode.name.text}`.toLowerCase();
  }

  return tagNameNode.getText(sourceFile).toLowerCase();
}

function isTagAllowedForFile(relativeFilePath, tagName, allowByFile) {
  return allowByFile.some(
    (item) =>
      item.tag === tagName &&
      item.fileRegex.test(normalizePath(relativeFilePath)),
  );
}

function collectFileFindings(relativeFilePath, content, rulesConfig) {
  const sourceFile = ts.createSourceFile(
    relativeFilePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    relativeFilePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const findings = [];
  const dedupe = new Set();

  const pushFinding = (finding) => {
    const key = `${finding.rule}:${finding.line}:${finding.column}:${finding.detail}`;
    if (dedupe.has(key)) {
      return;
    }
    dedupe.add(key);
    findings.push(finding);
  };

  const visit = (node) => {
    if (
      rulesConfig.bannedImports.enabled &&
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const moduleName = node.moduleSpecifier.text;
      const isBannedModule = rulesConfig.bannedImports.modulePatterns.some(
        (pattern) => pattern.test(moduleName),
      );

      if (isBannedModule) {
        const { line, column } = getLineAndColumn(
          sourceFile,
          node.moduleSpecifier.getStart(sourceFile),
        );
        pushFinding({
          rule: "no-banned-ui-imports",
          line,
          column,
          detail: moduleName,
          message: rulesConfig.bannedImports.message,
        });
      }
    }

    if (
      rulesConfig.bannedJsxTags.enabled &&
      (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node))
    ) {
      const tagNode = node.tagName;
      if (isIntrinsicTagName(tagNode)) {
        const tagName = normalizedTagName(tagNode, sourceFile);

        if (
          rulesConfig.bannedJsxTags.tags.has(tagName) &&
          !isTagAllowedForFile(
            relativeFilePath,
            tagName,
            rulesConfig.bannedJsxTags.allowByFile,
          )
        ) {
          const { line, column } = getLineAndColumn(
            sourceFile,
            tagNode.getStart(sourceFile),
          );
          const suggestion = rulesConfig.bannedJsxTags.suggestions[tagName];
          const message = suggestion
            ? `Nepouzivej nativni <${tagName}>. ${suggestion}`
            : `Nepouzivej nativni <${tagName}>. Pouzij komponentu z libs/ui.`;

          pushFinding({
            rule: "no-native-jsx-primitives",
            line,
            column,
            detail: `<${tagName}>`,
            message,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return findings;
}

function printSummary(findings, scannedFileCount) {
  const byRule = new Map();
  for (const finding of findings) {
    byRule.set(finding.rule, (byRule.get(finding.rule) ?? 0) + 1);
  }

  console.log(`Scanned files: ${scannedFileCount}`);
  if (findings.length === 0) {
    console.log("No UI primitives violations found.");
    return;
  }

  console.log(`Total violations: ${findings.length}`);
  for (const [rule, count] of [...byRule.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    console.log(`- ${rule}: ${count}`);
  }

  const groupedByFile = new Map();
  for (const finding of findings) {
    if (!groupedByFile.has(finding.file)) {
      groupedByFile.set(finding.file, []);
    }
    groupedByFile.get(finding.file).push(finding);
  }

  for (const [file, fileFindings] of [...groupedByFile.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    console.log(`\n${file}`);
    for (const finding of fileFindings) {
      console.log(`  L${finding.line}:${finding.column} ${finding.detail}`);
      console.log(`    ${finding.message}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = process.cwd();
  const configPath = path.resolve(rootDir, args.configPath);

  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(2);
  }

  const configModule = await import(pathToFileURL(configPath).href);
  const config = configModule.default ?? configModule;
  const rulesConfig = parseRuleConfig(config);
  const sourceFiles = listSourceFiles(rootDir, config);

  const findings = [];

  for (const relativeFilePath of sourceFiles) {
    const absoluteFilePath = path.resolve(rootDir, relativeFilePath);
    const content = fs.readFileSync(absoluteFilePath, "utf8");
    const fileFindings = collectFileFindings(
      relativeFilePath,
      content,
      rulesConfig,
    );

    for (const finding of fileFindings) {
      findings.push({
        file: relativeFilePath,
        ...finding,
      });
    }
  }

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          scannedFiles: sourceFiles.length,
          violationCount: findings.length,
          findings,
        },
        null,
        2,
      ),
    );
  } else {
    printSummary(findings, sourceFiles.length);
  }

  process.exit(findings.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("UI primitives validation failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

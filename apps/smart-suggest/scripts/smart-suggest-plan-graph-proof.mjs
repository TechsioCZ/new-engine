#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(appRoot, '../..');
const contractPath = path.join(appRoot, 'scripts/fixtures/smart-suggest-plan-graph-contract.json');
const contract = readJson(contractPath);
const graphId = contract.graphId;
const graphDir = path.join(repoRoot, '.codex/plan-graphs', graphId);
const snapshotPath = path.join(graphDir, 'snapshot.json');
const subagentGraphPath = path.join(graphDir, 'subagent-graph.md');
const expectedSelectionHash = contract.selectionHash;
const expectedPlanGlob = contract.planGlob;
const expectedEdges = contract.edges;

function assert(condition, message, details) {
  if (!condition) {
    const suffix = details === undefined ? '' : `\n${JSON.stringify(details, null, 2)}`;

    throw new Error(`${message}${suffix}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertSameStringSet(label, actual, expected) {
  const actualSorted = sorted(actual);
  const expectedSorted = sorted(expected);
  const missing = expectedSorted.filter((value) => !actualSorted.includes(value));
  const extra = actualSorted.filter((value) => !expectedSorted.includes(value));

  assert(
    missing.length === 0 && extra.length === 0,
    `${label} does not match the expected graph overlay.`,
    { extra, missing },
  );
}

function parseDocumentedEdges(markdown) {
  const match = markdown.match(/## Dependency Overlay\s+```text\s+([\s\S]*?)\s+```/u);

  assert(match !== null, 'subagent graph must include a Dependency Overlay text block.');

  return match[1]
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function snapshotEdgeToText(edge) {
  assert(
    typeof edge?.source === 'string' && typeof edge?.target === 'string',
    'snapshot edges must use source and target strings.',
    { edge },
  );

  return `${edge.source} -> ${edge.target}`;
}

function findFrontier(snapshot, planSlug) {
  const entry = snapshot.frontier.find((item) => item.plan_slug === planSlug);

  assert(entry !== undefined, `missing frontier entry for ${planSlug}.`);

  return entry;
}

function activeTodoId(entry) {
  const active = Array.isArray(entry.active) ? entry.active : [];

  return active[0]?.id ?? null;
}

function assertFrontierEntry(frontier, expected) {
  const entry = findFrontier({ frontier }, expected.plan);

  assert(entry.state === expected.state, `${expected.plan} frontier state drifted.`, {
    actual: entry.state,
    expected: expected.state,
  });
  assert(activeTodoId(entry) === expected.activeTodo, `${expected.plan} active todo drifted.`, {
    actual: activeTodoId(entry),
    expected: expected.activeTodo,
  });
  assert(
    Array.isArray(entry.blocked_by),
    `${expected.plan} frontier entry must include blocked_by.`,
  );
  assertSameStringSet(`${expected.plan} blockers`, entry.blocked_by, expected.blockedBy);
}

function assertFrontier(frontier) {
  for (const expected of contract.frontier) {
    assertFrontierEntry(frontier, expected);
  }
}

function assertContract() {
  assert(graphId === 'smart-suggest-owned-data-production-v1', 'graph contract id drifted.', {
    graphId,
  });
  assert(expectedSelectionHash === '344308f484', 'graph contract selection hash drifted.', {
    expectedSelectionHash,
  });
  assert(expectedPlanGlob === 'smart-suggest-*.plan.md', 'graph contract plan glob drifted.', {
    expectedPlanGlob,
  });
  assert(expectedEdges.length === 20, 'graph contract must contain the explicit 20-edge overlay.');
  assertSameStringSet('graph contract dependency overlay uniqueness', expectedEdges, [
    ...new Set(expectedEdges),
  ]);
  assert(
    Array.isArray(contract.frontier) && contract.frontier.length === 3,
    'graph contract must record the three critical frontier lanes.',
  );
  assertFrontier(
    contract.frontier.map((entry) => ({
      active: entry.activeTodo === null ? [] : [{ id: entry.activeTodo }],
      blocked_by: entry.blockedBy,
      plan_slug: entry.plan,
      state: entry.state,
    })),
  );
}

function assertSavedGraphState() {
  const snapshot = readJson(snapshotPath);
  const subagentGraph = fs.readFileSync(subagentGraphPath, 'utf8');
  const documentedEdges = parseDocumentedEdges(subagentGraph);
  const snapshotEdges = snapshot.edges.map(snapshotEdgeToText);

  assert(snapshot.graph_id === graphId, 'saved graph id drifted.', { actual: snapshot.graph_id });
  assert(snapshot.selection_hash === expectedSelectionHash, 'saved graph selection hash drifted.', {
    actual: snapshot.selection_hash,
    expected: expectedSelectionHash,
  });
  assert(snapshot.graph_source === 'explicit', 'saved graph must be built from explicit edges.');
  assert(snapshot.plan_count === 11, 'saved graph must include the 11 Smart Suggest plans.');
  assert(snapshot.edge_count === expectedEdges.length, 'saved graph edge count drifted.');
  assert(
    snapshot.selected_globs?.includes(expectedPlanGlob) === true,
    'saved graph must use the Smart Suggest plan glob.',
    { selectedGlobs: snapshot.selected_globs },
  );
  assert(
    Array.isArray(snapshot.errors) && snapshot.errors.length === 0,
    'saved graph has errors.',
    {
      errors: snapshot.errors,
    },
  );
  assert(
    Array.isArray(snapshot.warnings) && snapshot.warnings.length === 0,
    'saved graph has warnings.',
    { warnings: snapshot.warnings },
  );

  assertSameStringSet('documented dependency overlay', documentedEdges, expectedEdges);
  assertSameStringSet('saved snapshot dependency overlay', snapshotEdges, expectedEdges);
  assertSameStringSet('documented and saved overlays', documentedEdges, snapshotEdges);
  assertFrontier(snapshot.frontier);
}

function savedGraphStateStatus() {
  const hasSnapshot = fs.existsSync(snapshotPath);
  const hasSubagentGraph = fs.existsSync(subagentGraphPath);

  assert(
    hasSnapshot === hasSubagentGraph,
    'operator graph state is partial; expected snapshot and subagent graph together.',
    { hasSnapshot, hasSubagentGraph },
  );

  return hasSnapshot ? 'validated' : 'not-present';
}

function run() {
  assertContract();

  const graphStateStatus = savedGraphStateStatus();

  if (graphStateStatus === 'validated') {
    assertSavedGraphState();
  }

  process.stdout.write(
    `Smart Suggest plan graph proof passed: graph=${graphId} edges=${expectedEdges.length} graphState=${graphStateStatus} ready=seed-cz-production-dataset blocked=benchmark-owned-search,produce-comparison-report\n`,
  );
}

run();

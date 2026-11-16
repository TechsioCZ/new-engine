import assert from "node:assert/strict"
import { execFileSync, spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"
import {
  AUTHORED_PREREQUISITES,
  AUTHORED_SKILLS,
  BUNDLED_RESOURCES,
  readSkillField,
  splitSkill,
  toAuthoredPortableSkill,
  toPortableResource,
  toPortableSkill,
  validatePortableSkill,
  validateSkillPrerequisites,
} from "./skill-frontmatter.mjs"

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), "../..")
const ui = resolve(plugin, "..")
const canonical = (name) =>
  readFileSync(join(ui, "skills", name, "SKILL.md"), "utf8")
// Run locally through owned-temp-dir; CI/standalone runs retain finally-based cleanup.
function withScratch(script, args = []) {
  const scratch = mkdtempSync(
    join(process.env.OWNED_TEMP_DIR ?? tmpdir(), "ui-plugin-test-")
  )
  try {
    return execFileSync(
      process.execPath,
      ["--input-type=module", "--eval", script, ...args],
      {
        encoding: "utf8",
        env: { ...process.env, OWNED_TEMP_DIR: scratch },
      }
    )
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

test("portable conversion separates evidence and rewrites required resources idempotently", () => {
  const source = canonical("component-usage-ux")
  const result = toPortableSkill(source)
  assert.equal(toPortableSkill(result), result)
  assert.deepEqual(validatePortableSkill(result, "component-usage-ux"), [])
  assert.match(
    readSkillField(result, "sources"),
    /\.\.\/\.\.\/references\/consumer_app_usage_rules\.md/
  )
  assert.doesNotMatch(readSkillField(result, "sources"), /libs\/ui/)
  const contributor = toPortableSkill(canonical("select-usage"))
  assert.match(
    readSkillField(contributor, "contributor_sources"),
    /libs\/ui\/src/
  )
  assert.doesNotMatch(readSkillField(contributor, "sources"), /libs\/ui/)
  for (const resource of BUNDLED_RESOURCES) {
    assert.ok(
      readSkillField(result, "resources").includes(`../../${resource.path}`)
    )
    assert.ok(!splitSkill(result).body.includes(resource.evidence))
  }
  assert.match(splitSkill(result).body, /Installed consumer \(default\)/)
  assert.doesNotMatch(
    splitSkill(result).body,
    /rg --files libs\/ui\/src|-> read libs\/ui\/src/
  )
  assert.deepEqual(
    validateSkillPrerequisites(result, "component-usage-ux", () => true),
    []
  )
  assert.ok(
    validateSkillPrerequisites(result, "component-usage-ux", () => false).some(
      (problem) => problem.includes("missing bundled prerequisite")
    )
  )
  assert.ok(
    validateSkillPrerequisites(result, "component-usage-ux", () => false).some(
      (problem) => problem.includes("missing or invalid bundled resource")
    )
  )
})

test("required local and sibling references are declared, preserved and validated", () => {
  for (const [name, resources] of [
    [
      "component-usage-ux",
      ["../ux-guidelines/references/component-selection.md"],
    ],
    [
      "ux-guidelines",
      [
        "references/component-selection.md",
        "references/feedback-and-actions.md",
        "references/formatting.md",
        "references/states.md",
        "references/ux-writing.md",
      ],
    ],
  ]) {
    const result = toPortableSkill(canonical(name))
    assert.equal(toPortableSkill(result), result)
    const declared = readSkillField(result, "resources").split(/\s+/)
    for (const resource of resources) {
      assert.ok(declared.includes(resource), `${name} must declare ${resource}`)
      assert.deepEqual(
        validateSkillPrerequisites(result, name, () => true),
        []
      )
      assert.deepEqual(
        validateSkillPrerequisites(result, name, (path) => path !== resource),
        [`missing or invalid bundled resource "${resource}"`]
      )
    }
    for (const invalid of [
      "../outside.md",
      "references/../../outside.md",
      "../ux-guidelines/references/../../outside.md",
      "/references/absolute.md",
      "https://example.com/reference.md",
    ]) {
      const unsafe = result.replace(
        /^( {2}resources:).*$/m,
        (_, key) =>
          `${key} ${JSON.stringify(`${declared.join(" ")} ${invalid}`)}`
      )
      assert.deepEqual(
        validateSkillPrerequisites(unsafe, name, () => true),
        [`missing or invalid bundled resource "${invalid}"`]
      )
    }
  }
})

test("CMS editor guidance lists only the implemented PageHeader action", () => {
  for (const base of [join(ui, "skills"), join(plugin, "skills")]) {
    const source = readFileSync(join(base, "ux-guidelines/SKILL.md"), "utf8")
    const editor = source
      .split("### Full-page record editor")[1]
      .split("### Feedback surface decision")[0]
    assert.match(
      editor,
      /Editor-scoped sticky row: dirty\/saved status \+ \[Save\]/
    )
    assert.match(
      editor,
      /PageHeader actions top-right: \[Back to list\] \(the PageHeader scrolls normally\)/
    )
    assert.doesNotMatch(editor, /\[Preview\]/)
  }
})

test("bundled consumer rules refer to installed exports, with deterministic resource conversion", () => {
  for (const resource of BUNDLED_RESOURCES) {
    const source = readFileSync(join(ui, resource.source), "utf8")
    const result = toPortableResource(source, resource.path)
    assert.equal(toPortableResource(result, resource.path), result)
    if (resource.path.endsWith("consumer_app_usage_rules.md")) {
      assert.doesNotMatch(result, /libs\/ui\/src/)
      assert.match(result, /@techsio\/ui-kit\/molecules\/combobox/)
    } else {
      assert.equal(result, source)
    }
  }
})

test("authored workflow prerequisites are generated without replacing authored content", () => {
  for (const name of AUTHORED_SKILLS) {
    const source = readFileSync(
      join(plugin, "skills", name, "SKILL.md"),
      "utf8"
    )
    const result = toAuthoredPortableSkill(source, name)
    assert.ok(splitSkill(result).body.endsWith(splitSkill(source).body))
    assert.equal(toAuthoredPortableSkill(result, name), result)
    assert.equal(
      readSkillField(result, "requires"),
      AUTHORED_PREREQUISITES[name].join(" ")
    )
    assert.deepEqual(
      validateSkillPrerequisites(result, name, () => true),
      []
    )
  }
})

test("portable validation fails on undeclared authored prerequisites and resources", () => {
  const source = toAuthoredPortableSkill(
    readFileSync(join(plugin, "skills/ui-component-usage/SKILL.md"), "utf8"),
    "ui-component-usage"
  )
  const missing = source
    .replace(/^ {2}requires:.*\n/m, "")
    .replace(/^ {2}resources:.*\n/m, "")
  const problems = validateSkillPrerequisites(
    missing,
    "ui-component-usage",
    () => true
  )
  assert.ok(
    problems.some((problem) =>
      problem.includes("missing authored workflow prerequisite")
    )
  )
  assert.ok(
    problems.some((problem) =>
      problem.includes("missing bundled resource declaration")
    )
  )
})

const checks = [
  {
    skill: "select-usage",
    index: 0,
    bad: [
      "<select><option>Country</option></select>",
      '<Select value="CZ" items={items} />',
      '<Select.Trigger className="bg-white" />',
    ],
    good: [
      '<Select value={["CZ"]} items={items}>',
      "<Select.Trigger><Select.ValueText /></Select.Trigger>",
      '<SelectTemplate label="Country" items={items} />',
    ],
  },
  {
    skill: "select-usage",
    index: 2,
    bad: [
      '<Select validateStatus="danger" />',
      '<Select validateStatus="invalid" />',
    ],
    good: [
      '<Select validateStatus="error" />',
      '<Select.StatusText validateStatus="invalid" />',
    ],
  },
  {
    skill: "phone-input-usage",
    index: 0,
    bad: ['<input type="tel" />', '<PhoneInput className="border-red-500" />'],
    good: [
      '<PhoneInput label="Phone" />',
      "<PhoneInput.Input />",
      '<PhoneInput className="grid" />',
    ],
  },
  {
    skill: "phone-input-usage",
    index: 2,
    bad: [
      '<PhoneInput validateStatus="danger" />',
      '<PhoneInput validateStatus="invalid" />',
    ],
    good: [
      '<PhoneInput validateStatus="error" />',
      '<PhoneInput.Input validateStatus="invalid" />',
    ],
  },
  {
    skill: "form-error-summary-usage",
    index: 0,
    bad: ["<FormErrorSummary />", "<ul>{errors.map(renderError)}</ul>"],
    good: [
      "<FormErrorSummary errors={errors} />",
      "<FormErrorSummary errors={[]} />",
      "<FormErrorSummaryLink />",
      "<FormErrorSummary.Link />",
      "<ul>{items.map(renderItem)}</ul>",
    ],
  },
]

for (const { skill, index, bad, good } of checks) {
  test(`${skill} documented lookahead check ${index + 1} parses and isolates misuse`, () => {
    const command = canonical(skill)
      .split("\n")
      .filter((line) => line.startsWith("rg "))[index]
    assert.ok(command)
    // Preserve the documented quoting/flags; stream fixtures instead of scanning apps.
    const fixtureCommand = command.replace(/ apps$/, " -")
    assert.notEqual(fixtureCommand, command)
    for (const [lines, expected] of [
      [bad, 0],
      [good, 1],
    ]) {
      const run = spawnSync("/bin/sh", ["-c", fixtureCommand], {
        input: `${lines.join("\n")}\n`,
        encoding: "utf8",
      })
      assert.equal(run.status, expected, run.stderr || run.stdout)
      if (expected === 0) {
        assert.equal(
          run.stdout.trim().split("\n").length,
          lines.length,
          run.stdout
        )
      }
    }
  })
}

test("focus and controlled-ownership examples typecheck against the public component APIs", async () => {
  const { default: ts } = await import("typescript")
  const sections = {
    "color-select-usage": "## Controlled selection and focus recovery",
    "slider-usage": "## Focus refs and native form lifecycle",
    "form-checkbox-usage": "## Native input ref and cancellation-safe forms",
    "switch-usage": "## Native input ref and cancellation-safe forms",
    "numeric-input-usage": "## Input refs and cancellation-safe native reset",
    "radio-group-usage": "## Focus refs and cancellation-safe native forms",
    "radio-card-usage": "## Focus refs and cancellation-safe native forms",
  }
  const virtual = new Map()
  for (const [skill, heading] of Object.entries(sections)) {
    const section = canonical(skill).split(heading)[1]
    const example = section?.match(/```tsx\n([\s\S]*?)```/)?.[1]
    assert.ok(example, `${skill} must keep a complete public-API example`)
    virtual.set(join(ui, "test", `__docs-${skill}.tsx`), example)
  }
  virtual.set(
    join(ui, "test", "__docs-rating.tsx"),
    `
    import { Rating } from "@techsio/ui-kit/atoms/rating"
    const display = <Rating value={4.6} displayOnly labelText="Average product rating" />
    const formValue = <Rating name="score" value={4.5} readOnly labelText="Your rating" />
  `
  )
  const config = ts.readConfigFile(join(ui, "tsconfig.json"), ts.sys.readFile)
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, ui)
  const options = {
    ...parsed.options,
    noEmit: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    paths: {
      ...parsed.options.paths,
      "@techsio/ui-kit/*": [join(ui, "src", "*")],
    },
  }
  const host = ts.createCompilerHost(options)
  const original = host.getSourceFile.bind(host)
  host.getSourceFile = (file, languageVersion, ...rest) =>
    virtual.has(file)
      ? ts.createSourceFile(
          file,
          virtual.get(file),
          languageVersion,
          true,
          ts.ScriptKind.TSX
        )
      : original(file, languageVersion, ...rest)
  const program = ts.createProgram([...virtual.keys()], options, host)
  const errors = ts
    .getPreEmitDiagnostics(program)
    .filter(
      (diagnostic) =>
        diagnostic.file &&
        virtual.has(diagnostic.file.fileName) &&
        diagnostic.category === ts.DiagnosticCategory.Error
    )
  assert.equal(
    errors.length,
    0,
    ts.formatDiagnosticsWithColorAndContext(errors, {
      getCurrentDirectory: () => ui,
      getNewLine: () => "\n",
      getCanonicalFileName: (file) => file,
    })
  )
})

test("standalone copied plugin validates and rejects missing skills and resources without monorepo", () => {
  withScratch(
    `
    import assert from 'node:assert/strict';
    import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
    import { join } from 'node:path';
    import { spawnSync } from 'node:child_process';
    const root = join(process.env.OWNED_TEMP_DIR, 'plugin');
    cpSync(process.argv[1], root, { recursive: true, filter: (path) => !path.split('/').includes('node_modules') });
    assert.equal(existsSync(join(root, '../skills')), false);
    const validate = () => spawnSync(process.execPath, [join(root, 'scripts/validate-plugin.mjs')], { cwd: process.env.OWNED_TEMP_DIR, encoding: 'utf8' });
    const valid = validate();
    assert.equal(valid.status, 0, valid.stderr);
    for (const path of ['references/component-contracts.md', 'references/consumer_app_usage_rules.md', 'skills/ux-guidelines/SKILL.md', 'skills/ux-guidelines/references/component-selection.md', 'skills/ux-guidelines/references/ux-writing.md']) {
      const file = join(root, path);
      const content = readFileSync(file);
      rmSync(file);
      const invalid = validate();
      assert.equal(invalid.status, 1, invalid.stdout);
      assert.match(invalid.stderr, /missing.*bundled|directory has no SKILL/);
      writeFileSync(file, content);
    }
  `,
    [plugin]
  )
})

test("obsolete build target does not appear in canonical or bundled assigned skills", () => {
  for (const name of [
    "component-consistency-validation",
    "zag-compound-components",
    "ui-kit-workflow-orchestrator",
  ]) {
    for (const base of [join(ui, "skills"), join(plugin, "skills")]) {
      const source = readFileSync(join(base, name, "SKILL.md"), "utf8")
      assert.doesNotMatch(source, /\bui:build\b/)
      assert.match(source, /pnpm --dir libs\/ui build/)
    }
  }
})

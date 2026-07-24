import type { Meta, StoryObj } from '@storybook/react'

/**
 * Per-component changelog for `@techsio/ui-kit`, rendered in Storybook.
 *
 * Each `### <Component> vX.Y.Z` heading below is the source of truth the pre-commit gate
 * (`scripts/check-skill-sync.mjs`) checks: a component's `@componentVersion` and its usage skill's
 * `component_version` must both match an entry here. Keep the three in lock-step.
 *
 * Add newest entries under "Unreleased"; a release moves them under a dated version heading.
 */
const CHANGELOG = `
## @techsio/ui-kit — Unreleased

### Button v0.3.2
- Introduced per-component versioning: the component now carries \`@componentVersion\` + \`@skill\`,
  paired 1:1 with the \`button-usage\` skill's \`component_version\` and this changelog entry,
  enforced by the \`check-skill-sync\` pre-commit gate.
`.trim()

function Changelog() {
  return (
    <div className="min-h-screen bg-base p-400">
      <div className="mx-auto max-w-container rounded-2xl bg-surface p-300 shadow-2">
        <pre className="whitespace-pre-wrap font-sans text-fg-primary text-sm leading-relaxed">
          {CHANGELOG}
        </pre>
      </div>
    </div>
  )
}

const meta: Meta<typeof Changelog> = {
  title: 'Guide/Changelog',
  component: Changelog,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta

export const Playground: StoryObj<typeof Changelog> = {}

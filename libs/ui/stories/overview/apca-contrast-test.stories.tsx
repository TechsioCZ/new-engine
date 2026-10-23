import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
  title: 'Overview/APCA Contrast Test',
  tags: ['diagnostic', '!autodocs'],
  parameters: {
    layout: 'centered',
    // The runner asserts these known calibration IDs separately, without
    // adding expected violations to the product report. Keep them executable.
    a11yDiagnostic: true,
    docs: { description: { component: 'Diagnostic fixtures for the contrast reporter, intentionally including low-contrast text. These fixed colors test the reporter, not the selected brand; use Color Palette for active theme tokens.' } },
    a11y: {
      context: '#apca-test-root',
    },
  },
}

export default meta
type Story = StoryObj

export const Default: Story = {
  parameters: { docs: { description: { story: "Gold-level diagnostic fixtures intentionally include failures to verify that the contrast reporter detects them." } } },
  render: () => (
    <div className="flex flex-col gap-4" id="apca-test-root">
      <div style={{ backgroundColor: 'rgb(255, 255, 255)', padding: '16px' }}>
        <p
          style={{
            color: 'rgb(170, 170, 170)',
            fontSize: '16px',
            fontWeight: 400,
          }}
        >
          Low contrast text (should fail APCA)
        </p>
        <p
          style={{
            color: 'rgb(0, 0, 0)',
            fontSize: '16px',
            fontWeight: 600,
            marginTop: '8px',
          }}
        >
          High contrast text (should pass)
        </p>
        <p
          data-apca-usecase="sub-fluent"
          style={{
            color: 'rgb(90, 90, 90)',
            fontSize: '12px',
            fontWeight: 400,
            marginTop: '6px',
          }}
        >
          Sub-fluent label (should fail size at gold/silver)
        </p>
      </div>
    </div>
  ),
}

export const Silver: Story = {
  parameters: {
    docs: { description: { story: "The same diagnostic fixtures evaluated at the silver reporting threshold." } },
    a11y: {
      apca: {
        level: 'silver',
        useCase: 'body',
      },
    },
  },
  render: Default.render,
}

export const Bronze: Story = {
  parameters: {
    docs: { description: { story: "The same diagnostic fixtures evaluated at the bronze reporting threshold." } },
    a11y: {
      apca: {
        level: 'bronze',
        useCase: 'body',
      },
    },
  },
  render: Default.render,
}

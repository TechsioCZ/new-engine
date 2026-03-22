import fs from 'node:fs'

const containerMarkers = ['docker', 'containerd', 'kubepods', 'podman']

const hasContainerMarkers = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8').toLowerCase()
    return containerMarkers.some((marker) => content.includes(marker))
  } catch {
    return false
  }
}

const runningInContainer = () => {
  if (process.platform !== 'linux') {
    return false
  }

  const containerEnv = (process.env.CONTAINER ?? process.env.container ?? '').toLowerCase()
  if (containerEnv && containerEnv !== '0' && containerEnv !== 'false') {
    return true
  }

  if (fs.existsSync('/.dockerenv')) {
    return true
  }

  return (
    hasContainerMarkers('/proc/1/cgroup') ||
    hasContainerMarkers('/proc/self/mountinfo')
  )
}

export default async function dockerOnlyGlobalSetup() {
  const dockerRunnerFlag = process.env.PLAYWRIGHT_DOCKER === '1'
  if (!dockerRunnerFlag || !runningInContainer()) {
    throw new Error(
      [
        'Component visual tests must run inside Docker for reproducible snapshots.',
        '',
        'Use one of:',
        '- bunx nx run ui-kit:test:components',
        '- bunx nx run ui-kit:test:components:update',
        '- pnpm -C libs/ui test:components',
      ].join('\n'),
    )
  }
}

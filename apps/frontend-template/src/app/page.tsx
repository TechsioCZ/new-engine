import { Badge } from "@techsio/ui-kit/atoms/badge"

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center gap-300 p-400 text-center">
      <Badge variant="primary">Frontend template</Badge>
      <h1 className="text-4xl font-bold">Hello from TechSio Design System</h1>
      <p className="text-lg text-fg-secondary">
        Edit <code>src/app/page.tsx</code> to start building.
      </p>
    </main>
  )
}

import type { ReactNode } from "react"

const StaticLayout = ({ children }: { children: ReactNode }) => (
  <main className="mx-auto my-800 grid w-full max-w-max-w px-800">
    {children}
  </main>
)

export default StaticLayout

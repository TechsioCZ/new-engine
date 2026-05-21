import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  plugins: [react()],
  server: {
    port: 3001,
    strictPort: false,
  },
})

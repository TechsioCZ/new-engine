if (process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("Releases are restricted to run inside GitHub Actions")
}

const config = {
  branches: ["master", "main"],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
    "@semantic-release/npm",
  ],
  releaseRules: [{ breaking: true, release: "minor" }],
  tagFormat: `ui-kit-v\${version}`,
}

export default config

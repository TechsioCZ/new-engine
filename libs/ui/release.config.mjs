if (process.env.GITHUB_ACTIONS !== "true") {
  throw new Error("Releases are restricted to run inside GitHub Actions")
}

const config = {
  branches: ["master", "main"],
  // biome-ignore lint/suspicious/noTemplateCurlyInString: semantic-release replaces this placeholder.
  tagFormat: "ui-kit-v${version}",
  releaseRules: [{ breaking: true, release: "minor" }],
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/github",
    "@semantic-release/npm",
  ],
}

export default config

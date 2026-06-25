export type SmartSuggestAppBoundary = {
  readonly appName: "smart-suggest"
  readonly runtime: "cloudflare-worker"
}

export const smartSuggestAppBoundary = {
  appName: "smart-suggest",
  runtime: "cloudflare-worker",
} satisfies SmartSuggestAppBoundary

export default {
  scanDirectories: ["src/app", "src/components"],
  fileExtensions: [".ts", ".tsx"],
  exclude: [
    "**/*.stories.tsx",
    "**/*.test.tsx",
    "**/*.spec.tsx",
    "src/app/theme/**",
    "src/components/storefront-query-monitor-panel.tsx",
    "src/components/storefront-query-monitor-bridge.tsx",
    "src/components/storefront-data-smoke-panel.tsx",
  ],
  rules: {
    bannedJsxTags: {
      enabled: true,
      tags: ["img", "button", "input", "select", "textarea", "svg", "i"],
      suggestions: {
        img: "Pouzij <Image /> z @techsio/ui-kit/atoms/image nebo next/image.",
        button: "Pouzij <Button /> z @techsio/ui-kit/atoms/button.",
        input: "Pouzij <FormInput /> nebo <NumericInput /> z @techsio/ui-kit.",
        select: "Pouzij <Select /> z @techsio/ui-kit/molecules/select.",
        textarea: "Pouzij textarea wrapper z libs/ui (molecule/atom).",
        svg: "Pouzij <Icon /> z @techsio/ui-kit/atoms/icon.",
        i: "Pouzij <Icon /> z @techsio/ui-kit/atoms/icon.",
      },
      allowByFile: [],
    },
    bannedImports: {
      enabled: true,
      modulePatterns: [
        /^react-icons(?:\/|$)/,
        /^lucide-react$/,
        /^@heroicons\/react(?:\/|$)/,
        /^@tabler\/icons-react$/,
        /^@iconify\/react$/,
        /^@fortawesome\//,
        /^phosphor-react$/,
        /^@phosphor-icons\/react$/,
      ],
      message:
        "Nepouzivej primo icon knihovny, pouzij @techsio/ui-kit/atoms/icon.",
    },
  },
};

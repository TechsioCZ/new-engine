export default {
  exclude: ["**/*.stories.tsx", "**/*.test.tsx", "**/*.spec.tsx"],
  fileExtensions: [".ts", ".tsx"],
  rules: {
    bannedImports: {
      enabled: true,
      message:
        "Nepouzivej primo icon knihovny, pouzij @techsio/ui-kit/atoms/icon.",
      modulePatterns: [
        /^react-icons(?:\/|$)/u,
        /^lucide-react$/u,
        /^@heroicons\/react(?:\/|$)/u,
        /^@tabler\/icons-react$/u,
        /^@iconify\/react$/u,
        /^@fortawesome\//u,
        /^phosphor-react$/u,
        /^@phosphor-icons\/react$/u,
      ],
    },
    bannedJsxTags: {
      enabled: true,
      suggestions: {
        button: "Pouzij <Button /> z @techsio/ui-kit/atoms/button.",
        i: "Pouzij <Icon /> z @techsio/ui-kit/atoms/icon.",
        img: "Pouzij <Image /> z @techsio/ui-kit/atoms/image nebo next/image.",
        input: "Pouzij <FormInput /> nebo <NumericInput /> z @techsio/ui-kit.",
        select: "Pouzij <Select /> z @techsio/ui-kit/molecules/select.",
        svg: "Pouzij <Icon /> z @techsio/ui-kit/atoms/icon.",
        textarea: "Pouzij textarea wrapper z libs/ui (molecule/atom).",
      },
      tags: ["img", "button", "input", "select", "textarea", "svg", "i"],
    },
  },
  scanDirectories: ["src/app", "src/components"],
}

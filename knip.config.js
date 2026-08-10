import baseConfig from "./knip.base.json" with { type: "json" }

const linuxOnlyUnresolved =
  process.platform === "linux" ? [] : ["^/usr/bin/mount$", "^/usr/bin/umount$"]

export default {
  ...baseConfig,
  workspaces: {
    ...baseConfig.workspaces,
    "apps/medusa-be": {
      ...baseConfig.workspaces["apps/medusa-be"],
      ignoreUnresolved: linuxOnlyUnresolved,
    },
  },
}

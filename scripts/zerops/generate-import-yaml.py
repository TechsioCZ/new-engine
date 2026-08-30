#!/usr/bin/env python3
"""Build the ready-to-import Zerops YAML for the herbatica-demo project.

The repository copy of ``zerops-herbatica-demo-import.yml`` deliberately holds no
market bindings. The publishable keys, key IDs, region IDs and sales-channel IDs
must match the data inside the dump that gets restored, and those values live
only in ``apps/herbatika/.env.local``.

This script merges the two into a generated file that is written OUTSIDE the
repository (default: the session scratchpad) so the secrets are never committed
and never printed. It reports key NAMES only.

Usage:
    python3 scripts/zerops/generate-import-yaml.py [--out PATH] [--env-file PATH]

Then:
    zcli project project-import <generated path> --org-id <org id>
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_TEMPLATE = REPO_ROOT / "zerops-herbatica-demo-import.yml"
DEFAULT_ENV_FILE = REPO_ROOT / "apps" / "herbatika" / ".env.local"

MARKETS = ("SK", "CZ", "HU", "RO")

# Runtime-only market authority. The storefront Dockerfile documents why these
# must never become build arguments: only ALLOWED_MARKETS and
# MARKET_ACCEPTED_HOSTS_* are baked into the image.
REQUIRED_KEYS: tuple[str, ...] = tuple(
    f"MARKET_{suffix}_{market}"
    for suffix in ("PUBLISHABLE_KEY", "PUBLISHABLE_KEY_ID", "REGION", "SALES_CHANNEL")
    for market in MARKETS
) + ("HERBATIKA_CMS_STATIC_PAGE_IDS",)

INJECT_ANCHOR = "      HERBATIKA_READINESS_TOKEN:"


def read_env_file(path: Path) -> dict[str, str]:
    """Parse a dotenv file into a mapping, tolerating quotes and comments."""
    if not path.is_file():
        sys.exit(f"ERROR: env file not found: {path}")

    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, _, value = line.partition("=")
        name = name.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        values[name] = value
    return values


def yaml_single_quoted(value: str) -> str:
    """Render a value as a YAML single-quoted scalar.

    Quoting is required because HERBATIKA_CMS_STATIC_PAGE_IDS is a JSON object
    literal, which YAML would otherwise read as a flow mapping.

    Single quotes specifically: Zerops' import parser rejects a double-quoted
    scalar containing backslash-escaped quotes (`projectImportInvalidYaml`,
    "did not find expected key"). A single-quoted scalar needs no backslashes at
    all -- only an embedded apostrophe is escaped, by doubling it.
    """
    return "'" + value.replace("'", "''") + "'"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE)
    parser.add_argument("--env-file", type=Path, default=DEFAULT_ENV_FILE)
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Destination path. Defaults to the scratchpad, never the repo.",
    )
    args = parser.parse_args()

    out_path = args.out
    if out_path is None:
        scratch = os.environ.get("CLAUDE_SCRATCHPAD") or "/tmp"
        out_path = Path(scratch) / "zerops-herbatica-demo-import.generated.yml"

    if out_path.resolve().is_relative_to(REPO_ROOT):
        sys.exit(
            "ERROR: refusing to write the generated file inside the repository; "
            "it contains market publishable keys."
        )

    template = args.template.read_text(encoding="utf-8")
    env_values = read_env_file(args.env_file)

    missing = [key for key in REQUIRED_KEYS if not env_values.get(key)]
    if missing:
        sys.exit(
            "ERROR: missing or empty in "
            f"{args.env_file}:\n  " + "\n  ".join(missing)
        )

    if INJECT_ANCHOR not in template:
        sys.exit(f"ERROR: could not find the sf envSecrets anchor in {args.template}")

    injected = "\n".join(
        f"      {key}: {yaml_single_quoted(env_values[key])}" for key in REQUIRED_KEYS
    )
    generated = template.replace(
        INJECT_ANCHOR,
        f"{injected}\n{INJECT_ANCHOR}",
        1,
    )

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(generated, encoding="utf-8")
    out_path.chmod(0o600)

    print(f"Wrote {out_path}")
    print(f"Injected {len(REQUIRED_KEYS)} sf envSecrets (names only):")
    for key in REQUIRED_KEYS:
        print(f"  {key}")
    print()
    print("Import with:")
    print(f"  zcli project project-import {out_path} --org-id <org id>")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

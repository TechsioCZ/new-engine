#!/usr/bin/env sh

new_engine_project_name() {
  : "${ROOT_DIR:?ROOT_DIR must be set before calling new_engine_project_name (see scripts/dev/project-env.sh)}"
  node "$ROOT_DIR/scripts/dev/project-name.mjs" "$ROOT_DIR"
}

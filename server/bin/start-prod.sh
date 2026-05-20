#!/usr/bin/env bash
# Start the server under pm2 from the current working directory.
#
# Designed for the multi-instance deploy where the code lives at a shared
# path (e.g. /opt/photo-diary/<version>/) and each instance has its own
# directory containing `.env`, photos, and the SQLite DB. Sourced from the
# CWD's `.env`, so the pm2 process name derives from `INSTANCE_NAME` and
# the server's own `process.env` reflects this instance.
#
# Usage (invoked via the instance's `code` symlink so it picks up the right
# version):
#   cd /var/photo-diary/<instance>
#   ./code/server/bin/start-prod.sh
#
# In a single-instance setup, run from the server directory itself; if
# there's no `.env` or `INSTANCE_NAME` set, the pm2 process is named
# `photo-diary-server`.

set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

script_dir="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
# `tsx` is hoisted to the workspace root's node_modules/.bin/ under npm
# workspaces. Add both the root and the server's local node_modules/.bin
# so pm2 finds tsx regardless of hoisting.
export PATH="$script_dir/../node_modules/.bin:$script_dir/node_modules/.bin:$PATH"

NODE_ENV=prod pm2 start "$script_dir/index.ts" \
  --interpreter tsx \
  --name "${INSTANCE_NAME:-photo-diary-server}"

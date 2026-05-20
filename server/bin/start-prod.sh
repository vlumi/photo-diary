#!/usr/bin/env bash
# Start the server under pm2 from the current working directory.
#
# Designed for the multi-instance deploy where the code lives once at a
# shared path (e.g. /opt/photo-diary) and each instance has its own
# directory containing `.env`, photos, and the SQLite DB. Sourced from the
# CWD's `.env`, so the pm2 process name derives from `INSTANCE_NAME` and
# the server's own `process.env` reflects this instance.
#
# Usage:
#   cd /var/photo-diary/<instance>
#   /opt/photo-diary/server/bin/start-prod.sh
#
# Or via npm:
#   cd /var/photo-diary/<instance>
#   npm --prefix /opt/photo-diary/server run prod
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

NODE_ENV=prod pm2 start "$script_dir/index.ts" \
  --interpreter tsx \
  --name "${INSTANCE_NAME:-photo-diary-server}"

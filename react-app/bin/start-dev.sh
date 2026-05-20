#!/usr/bin/env bash
# Start the Vite dev server in the foreground. Mirrors the server/converter
# start-dev.sh wrappers so the instance-directory dev layout works for the
# frontend too.
#
# Usage (typically from a per-instance dev directory containing the `code`
# symlink to the repo root):
#   cd <repo>/dev
#   ./code/react-app/bin/start-dev.sh
#
# Vite reads its own config from the react-app directory, so the script
# changes into it before exec'ing. The `.env` from CWD is sourced first
# (harmless if absent — the frontend reads instance config via /api/v1/meta
# at boot, not from build-time env vars).

set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

script_dir="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
# `vite` is hoisted to the workspace root's node_modules/.bin/ under npm
# workspaces. Add both the root and the react-app's local node_modules/.bin.
export PATH="$script_dir/../node_modules/.bin:$script_dir/node_modules/.bin:$PATH"

cd "$script_dir"
exec vite

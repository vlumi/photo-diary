#!/usr/bin/env bash
# Start the server in dev mode (tsx watch, no pm2) from the current working
# directory. Mirrors `start-prod.sh` so the same instance-directory layout
# can be used for development.
#
# Usage (typically from a per-instance dev directory containing .env,
# photos/, and a `code` symlink to the repo root):
#   cd <repo>/dev
#   ./code/server/bin/start-dev.sh
#
# In a single-package dev setup (no instance dir, no .env), running from
# the server directory works too — defaults take over.

set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

script_dir="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
# `tsx` is hoisted to the workspace root's node_modules/.bin/ under npm
# workspaces. Add both the root and the server's local node_modules/.bin.
export PATH="$script_dir/../node_modules/.bin:$script_dir/node_modules/.bin:$PATH"

NODE_ENV=dev exec tsx watch "$script_dir/index.ts"

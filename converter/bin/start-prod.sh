#!/usr/bin/env bash
# Start the converter under pm2 from the current working directory.
#
# Designed for the multi-instance deploy where the code lives at a shared
# path (e.g. /opt/photo-diary/<version>/) and each instance has its own
# directory containing `.env` and the photo-repository tree. Sourced from
# the CWD's `.env`, so the pm2 process name derives from `INSTANCE_NAME`
# (suffixed with `-converter`) and the converter watches the
# `photos/` subdirectory of CWD for new files in `photos/inbox/`.
#
# Usage (invoked via the instance's `code` symlink so it picks up the right
# version):
#   cd /var/photo-diary/<instance>
#   ./code/converter/bin/start-prod.sh
#
# In a single-instance setup with no `.env` or `INSTANCE_NAME`, the pm2
# process is named `photo-diary-converter`.

set -euo pipefail

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

script_dir="$(cd "$(dirname "$(readlink -f "$0")")/.." && pwd)"
# `tsx` is hoisted to the workspace root's node_modules/.bin/ under npm
# workspaces. Add both the root and the converter's local node_modules/.bin
# so pm2 finds tsx regardless of hoisting.
export PATH="$script_dir/../node_modules/.bin:$script_dir/node_modules/.bin:$PATH"
instance_name="${INSTANCE_NAME:-photo-diary}"

NODE_ENV=prod pm2 start "$script_dir/index.ts" \
  --interpreter tsx \
  --name "${instance_name}-converter"

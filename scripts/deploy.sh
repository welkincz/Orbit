#!/usr/bin/env bash
set -euo pipefail

# Deploy Orbit to Cloudflare.
#
# The build runs inside a throwaway clone, never in the working tree. Only
# committed files exist there, so real records sitting in a local
# data/people/ cannot reach the public site — .gitignore is the only gate
# that has to hold, and it is the one already under review in code.
#
# This is the same guarantee a CI build gives, without handing a build
# service access to the repository.

command -v wrangler >/dev/null || { echo "wrangler missing: npm i -g wrangler"; exit 1; }

ROOT=$(git rev-parse --show-toplevel)
BRANCH=$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)

if [ -n "$(git -C "$ROOT" status --porcelain --untracked-files=no)" ]; then
  echo "Working tree has uncommitted changes. They will NOT be deployed."
  echo "Commit them first if they are meant to ship."
  echo
fi

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

git -C "$ROOT" clone --quiet --no-hardlinks --branch "$BRANCH" . "$STAGE/orbit"
cd "$STAGE/orbit"

echo "Vault being published ($(ls data/people | wc -l | tr -d ' ') files):"
ls data/people | sed 's/^/  /'
echo

npm ci --silent
ORBIT_STATIC_EXPORT=1 npm run build
wrangler deploy

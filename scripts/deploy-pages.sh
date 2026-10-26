#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
REMOTE_URL="$(git -C "$ROOT_DIR" remote get-url origin)"

touch "$DIST_DIR/.nojekyll"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cp -R "$DIST_DIR"/. "$TMP_DIR"/
git -C "$TMP_DIR" init -b gh-pages >/dev/null
git -C "$TMP_DIR" add -A
git -C "$TMP_DIR" commit -m "deploy: publish dist to gh-pages" >/dev/null
git -C "$TMP_DIR" -c credential.helper='!gh auth git-credential' push -f "$REMOTE_URL" gh-pages:gh-pages

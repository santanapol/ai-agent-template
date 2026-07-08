#!/usr/bin/env bash
# Create and push an annotated git tag for a platform release (after deploy smoke).
#
# Usage:
#   ./scripts/release/release-tag.sh v0.4.0              # tag current HEAD
#   ./scripts/release/release-tag.sh v0.4.0 <commit-sha>
#
# Prerequisite: smoke passed on the environment for this release.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <version> [commit-sha]" >&2
  echo "  version: v0.4.0 (must start with v)" >&2
  exit 1
fi

VERSION="$1"
TARGET_SHA="${2:-}"

if [[ ! "$VERSION" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: version must look like v0.4.0 (got: $VERSION)" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ -n "$TARGET_SHA" ]]; then
  git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null || {
    echo "Error: commit not found: $TARGET_SHA" >&2
    exit 1
  }
  TAG_SHA="$TARGET_SHA"
else
  TAG_SHA="$(git rev-parse HEAD)"
fi

if git rev-parse "$VERSION" >/dev/null 2>&1; then
  echo "Error: tag $VERSION already exists at $(git rev-parse "$VERSION")" >&2
  exit 1
fi

PLAIN="${VERSION#v}"
if ! grep -q "^## \\[$PLAIN\\]" CHANGELOG.md; then
  echo "Warning: CHANGELOG.md has no section ## [$PLAIN] — add it before tagging" >&2
fi

DATE="$(date -u +%Y-%m-%d)"
git tag -a "$VERSION" "$TAG_SHA" -m "Release $VERSION — $DATE"
echo "Created tag $VERSION → $TAG_SHA"
echo "Push: git push origin $VERSION"

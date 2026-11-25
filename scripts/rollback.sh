#!/usr/bin/env bash
# Redeploys the last image that passed a health check (tagged "stable").
#
# needs: IMAGE, RENDER_BACKEND_DEPLOY_HOOK, BACKEND_URL

set -e

if ! docker buildx imagetools inspect "$IMAGE:stable" > /dev/null 2>&1; then
  echo "No stable image exists yet, so there is nothing to roll back to."
  exit 1
fi

echo "Rolling back to $IMAGE:stable"
curl -fsS -G "$RENDER_BACKEND_DEPLOY_HOOK" --data-urlencode "imgURL=$IMAGE:stable" > /dev/null

bash scripts/wait-for-health.sh "$BACKEND_URL" "" 40
echo "Rollback finished"

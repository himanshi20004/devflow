#!/usr/bin/env bash
# Polls <base-url>/health until it returns 200.
# If an expected version (git sha) is given, also waits until the app reports that version.
#
# usage: wait-for-health.sh <base-url> [expected-version] [max-attempts]

base_url="${1%/}"
expected="$2"
attempts="${3:-40}"
pause="${SLEEP:-15}"

if [ -z "$base_url" ]; then
  echo "usage: $0 <base-url> [expected-version] [max-attempts]"
  exit 2
fi

for i in $(seq 1 "$attempts"); do
  response=$(curl -s -m 15 -w '\n%{http_code}' "$base_url/health" || true)
  code=$(echo "$response" | tail -n 1)
  body=$(echo "$response" | sed '$d')

  if [ "$code" = "200" ]; then
    if [ -z "$expected" ] || echo "$body" | grep -q "\"version\":\"$expected\""; then
      echo "Healthy: $body"
      exit 0
    fi
    echo "attempt $i/$attempts: app is up but not running version $expected yet"
  else
    echo "attempt $i/$attempts: got HTTP $code, waiting ${pause}s"
  fi
  sleep "$pause"
done

echo "Health check failed after $attempts attempts"
exit 1

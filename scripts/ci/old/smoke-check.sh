#!/usr/bin/env bash
set -euo pipefail

url=""
retries="20"
delay_seconds="6"
expected_status=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --url)
      url="${2:-}"
      shift 2
      ;;
    --retries)
      retries="${2:-}"
      shift 2
      ;;
    --delay)
      delay_seconds="${2:-}"
      shift 2
      ;;
    --expected-status)
      expected_status="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$url" ]]; then
  echo "--url is required" >&2
  exit 1
fi

attempt=1
while (( attempt <= retries )); do
  http_code="$(curl --silent --show-error -o /dev/null -w '%{http_code}' "$url" || true)"

  if [[ -n "$expected_status" ]]; then
    if [[ "$http_code" == "$expected_status" ]]; then
      echo "Smoke check passed for $url with HTTP $http_code on attempt $attempt/$retries"
      exit 0
    fi
  elif [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
    echo "Smoke check passed for $url with HTTP $http_code on attempt $attempt/$retries"
    exit 0
  fi

  echo "Smoke check attempt $attempt/$retries failed for $url (HTTP $http_code)"
  sleep "$delay_seconds"
  attempt=$((attempt + 1))
done

echo "Smoke check failed for $url after $retries attempts" >&2
exit 1

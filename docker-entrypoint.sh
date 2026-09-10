#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

# The local .env points to localhost for host-side development. Inside the
# application container, PostgreSQL is reached through Docker Desktop's host
# gateway without duplicating credentials in Compose or image layers.
case "$DATABASE_URL" in
  *"@localhost:"*)
    DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed 's/@localhost:/@host.docker.internal:/')"
    export DATABASE_URL
    ;;
  *"@127.0.0.1:"*)
    DATABASE_URL="$(printf '%s' "$DATABASE_URL" | sed 's/@127.0.0.1:/@host.docker.internal:/')"
    export DATABASE_URL
    ;;
esac

exec ./node_modules/.bin/next start -p 3010 -H 0.0.0.0

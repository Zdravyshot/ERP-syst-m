#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
BACKUP_DIR=${BACKUP_DIR:-"$PROJECT_DIR/backups"}
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/zdravy-shot-$TIMESTAMP.dump"

mkdir -p "$BACKUP_DIR"
cd "$PROJECT_DIR"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "Chýba pg_dump. Na macOS ho nainštalujte: brew install libpq" >&2
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "Chýba Railway CLI. Nainštalujte ho: npm install -g @railway/cli" >&2
  exit 1
fi

railway run --service web --no-local sh -c 'pg_dump --format=custom "$DATABASE_URL"' > "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"
find "$BACKUP_DIR" -type f -name 'zdravy-shot-*.dump' -mtime +30 -delete
echo "Záloha uložená: $BACKUP_FILE"

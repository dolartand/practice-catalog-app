#!/usr/bin/env sh
# Заполняет БД каталогом Добрушского фарфорового завода из seed_catalog.sql.
# Требует: docker-compose поднят (catalog-postgres), Flyway-миграции применены
# (один раз запустить бэкенд). Идемпотентно (ON CONFLICT DO NOTHING).
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
SEED_FILE="$ROOT_DIR/src/main/resources/db/seed/seed_catalog.sql"
PG_CONTAINER=catalog-postgres

[ -f "$SEED_FILE" ] || { echo "error: $SEED_FILE not found" >&2; exit 1; }

echo "Waiting for postgres ..."
for i in $(seq 1 60); do
  if docker exec "$PG_CONTAINER" pg_isready -U catalog -d catalog >/dev/null 2>&1; then
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "error: $PG_CONTAINER is not ready. Run 'docker compose up -d' first." >&2
    exit 1
  fi
  sleep 1
done

echo "Applying $SEED_FILE ..."
docker exec -i "$PG_CONTAINER" psql -v ON_ERROR_STOP=1 -U catalog -d catalog <"$SEED_FILE"
echo "Done."
#!/usr/bin/env sh
# Заливает seed-изображения каталога из scripts/seed/catalog-images
# в бакет MinIO catalog-images (должен существовать — создаётся minio-init).
# Идемпотентно: повторный запуск безопасен (mc mirror --overwrite).
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

if ! docker compose version >/dev/null 2>&1; then
  echo "error: docker compose is required" >&2
  exit 1
fi

if [ ! -d "$ROOT_DIR/scripts/seed/catalog-images/products" ]; then
  echo "error: $ROOT_DIR/scripts/seed/catalog-images/products not found" >&2
  exit 1
fi

cd "$ROOT_DIR"
echo "Mirroring scripts/seed/catalog-images -> MinIO catalog-images ..."
docker compose run --rm minio-upload-images
echo "Done."
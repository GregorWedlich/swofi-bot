#!/bin/sh
set -euo pipefail

export PGPASSWORD="${DB_PASSWORD}"
TIMESTAMP="$(date +'%Y%m%d-%H%M%S')"
OUT="/backups/${DB_NAME}-${TIMESTAMP}.dump.gz"

# Dump + Kompression
pg_dump -h db-goewage -U "${DB_USER}" -Fc "${DB_NAME}" | gzip > "${OUT}"

# Rotation (>7 Tage)
find /backups -type f -name "${DB_NAME}-*.dump.gz" -mtime +7 -delete

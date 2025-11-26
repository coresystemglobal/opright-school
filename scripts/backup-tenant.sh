# !/bin/bash

# Backup script for single tenant data
TENANT_ID=$1
BACKUP_DIR="backups/$(date +%Y%m%d)"

if [ -z "$TENANT_ID" ]; then
  echo "Usage: $0 <tenant-id>"
  exit 1
fi

mkdir -p $BACKUP_DIR

# Export tenant-specific data
psql $DATABASE_URL -c "
COPY (SELECT * FROM \"User\" WHERE \"tenantId\" = '$TENANT_ID') TO STDOUT WITH CSV HEADER
" > $BACKUP_DIR/users_$TENANT_ID.csv

psql $DATABASE_URL -c "
COPY (SELECT * FROM \"Student\" WHERE \"tenantId\" = '$TENANT_ID') TO STDOUT WITH CSV HEADER
" > $BACKUP_DIR/students_$TENANT_ID.csv

psql $DATABASE_URL -c "
COPY (SELECT * FROM \"Teacher\" WHERE \"tenantId\" = '$TENANT_ID') TO STDOUT WITH CSV HEADER
" > $BACKUP_DIR/teachers_$TENANT_ID.csv

echo "Backup completed for tenant $TENANT_ID in $BACKUP_DIR"
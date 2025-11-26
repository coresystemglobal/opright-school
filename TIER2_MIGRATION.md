# Tier 2 Modules - Migration Guide

## Pre-Migration Checklist

- [ ] Backup current database
- [ ] Note current schema version
- [ ] Stop all running instances
- [ ] Verify Node.js and npm versions
- [ ] Check disk space for database growth

## Migration Steps

### Step 1: Backup Database

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_before_tier2_$(date +%Y%m%d).sql

# Or use the backup script
./scripts/backup-tenant.sh
```

### Step 2: Pull Latest Code

```bash
git pull origin main
npm install
```

### Step 3: Generate Prisma Client

```bash
# Generate new Prisma client with Tier 2 models
npm run db:generate
```

Expected output:
```
✔ Generated Prisma Client
```

### Step 4: Push Schema Changes

```bash
# Push schema to database
npm run db:push
```

This will create:
- 13 new tables
- 2 new enums
- Foreign key constraints
- Indexes

### Step 5: Apply RLS Policies

```bash
# Apply Row Level Security policies
psql $DATABASE_URL -f scripts/setup-tier2.sql
```

Expected output:
```
ALTER TABLE
CREATE POLICY
(repeated for each table)
```

### Step 6: Verify Migration

```bash
# Check tables exist
psql $DATABASE_URL -c "\dt" | grep -E "Book|Bus|Asset|Event|Disciplinary|Health"
```

Expected tables:
- Book
- BookTransaction
- Bus
- BusRoute
- BusAssignment
- Asset
- AssetTransaction
- Event
- EventParticipant
- DisciplinaryRecord
- HealthRecord
- MedicalIncident
- Vaccination

### Step 7: Test Endpoints

```bash
# Start server
npm run dev

# Test library endpoint
curl http://localhost:3000/library/books \
  -H "Authorization: Bearer $TOKEN"

# Should return: []
```

### Step 8: Seed Initial Data (Optional)

Create a seed script for initial data:

```javascript
// scripts/seed-tier2.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTier2(tenantId: string) {
  // Seed library categories
  await prisma.book.createMany({
    data: [
      {
        tenantId,
        title: "Sample Book 1",
        author: "Author 1",
        genre: "Fiction",
        totalCopies: 1,
        available: 1
      }
    ]
  });

  // Seed asset categories
  await prisma.asset.createMany({
    data: [
      {
        tenantId,
        name: "Sample Asset",
        category: "Equipment",
        quantity: 1
      }
    ]
  });

  console.log('Tier 2 seed data created');
}

// Run: ts-node scripts/seed-tier2.ts
```

## Rollback Procedure

If migration fails:

### Option 1: Restore from Backup

```bash
# Drop current database
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Restore backup
psql $DATABASE_URL < backup_before_tier2_YYYYMMDD.sql
```

### Option 2: Revert Schema Changes

```bash
# Checkout previous version
git checkout HEAD~1

# Regenerate client
npm run db:generate

# Push old schema
npm run db:push
```

## Post-Migration Tasks

### 1. Update Permissions

Add new permissions to existing roles:

```sql
-- Connect to database
psql $DATABASE_URL

-- Add library permissions
INSERT INTO "Permission" (id, resource, action, description)
VALUES 
  (gen_random_uuid(), 'library', 'read', 'View library'),
  (gen_random_uuid(), 'library', 'create', 'Add books'),
  (gen_random_uuid(), 'library', 'update', 'Update books');

-- Repeat for other modules
```

### 2. Configure Role Access

```javascript
// Example: Grant library access to ADMIN and TEACHER roles
const adminRole = await prisma.role.findFirst({
  where: { tenantId, name: 'ADMIN' }
});

const libraryPermissions = await prisma.permission.findMany({
  where: { resource: 'library' }
});

for (const permission of libraryPermissions) {
  await prisma.rolePermission.create({
    data: {
      roleId: adminRole.id,
      permissionId: permission.id
    }
  });
}
```

### 3. Update Documentation

- [ ] Update internal wiki
- [ ] Train staff on new features
- [ ] Create user guides
- [ ] Update API documentation

### 4. Monitor Performance

```bash
# Check slow queries
psql $DATABASE_URL -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE query LIKE '%Book%' OR query LIKE '%Asset%'
ORDER BY mean_exec_time DESC
LIMIT 10;
"
```

## Troubleshooting

### Issue: "Table already exists"

**Solution:**
```bash
# Drop conflicting tables
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"Book\" CASCADE;"

# Re-run migration
npm run db:push
```

### Issue: "Foreign key constraint violation"

**Solution:**
```bash
# Check for orphaned records
psql $DATABASE_URL -c "
SELECT * FROM \"BookTransaction\" 
WHERE \"tenantId\" NOT IN (SELECT id FROM \"Tenant\");
"

# Clean up orphaned records
psql $DATABASE_URL -c "
DELETE FROM \"BookTransaction\" 
WHERE \"tenantId\" NOT IN (SELECT id FROM \"Tenant\");
"
```

### Issue: "RLS policy already exists"

**Solution:**
```bash
# Drop existing policies
psql $DATABASE_URL -c "
DROP POLICY IF EXISTS tenant_isolation_book ON \"Book\";
"

# Re-run RLS setup
psql $DATABASE_URL -f scripts/setup-tier2.sql
```

### Issue: "Prisma client out of sync"

**Solution:**
```bash
# Clear Prisma cache
rm -rf node_modules/.prisma

# Regenerate
npm run db:generate
```

## Verification Checklist

After migration, verify:

- [ ] All 13 new tables exist
- [ ] RLS policies are active
- [ ] Foreign keys are in place
- [ ] Indexes are created
- [ ] API endpoints respond
- [ ] Authentication works
- [ ] Tenant isolation works
- [ ] No data loss in existing tables
- [ ] Application starts without errors
- [ ] Logs show no warnings

## Performance Optimization

### Add Indexes (if needed)

```sql
-- Add composite indexes for common queries
CREATE INDEX idx_book_tenant_genre ON "Book"("tenantId", "genre");
CREATE INDEX idx_event_tenant_date ON "Event"("tenantId", "startDate");
CREATE INDEX idx_health_student ON "HealthRecord"("tenantId", "studentId");
```

### Analyze Tables

```sql
-- Update statistics
ANALYZE "Book";
ANALYZE "BookTransaction";
ANALYZE "Asset";
ANALYZE "Event";
ANALYZE "DisciplinaryRecord";
ANALYZE "HealthRecord";
```

## Monitoring

### Set Up Alerts

Monitor these metrics:
- API response times for new endpoints
- Database query performance
- Error rates
- Transaction failures

### Log Analysis

```bash
# Check for errors
tail -f logs/app.log | grep -i "error\|library\|transport\|inventory"
```

## Support

If you encounter issues:

1. Check logs: `tail -f logs/app.log`
2. Verify database connection: `psql $DATABASE_URL -c "SELECT 1"`
3. Check Prisma client: `npm run db:generate`
4. Review migration steps above
5. Restore from backup if necessary

## Timeline

Estimated migration time:
- Small database (<1000 records): 5-10 minutes
- Medium database (1000-10000 records): 10-20 minutes
- Large database (>10000 records): 20-30 minutes

## Success Criteria

Migration is successful when:
- ✅ All new tables created
- ✅ RLS policies applied
- ✅ API endpoints accessible
- ✅ No errors in logs
- ✅ Existing functionality intact
- ✅ Test requests succeed

## Next Steps

After successful migration:
1. Test all new endpoints
2. Create sample data
3. Train users
4. Monitor performance
5. Gather feedback
6. Plan enhancements

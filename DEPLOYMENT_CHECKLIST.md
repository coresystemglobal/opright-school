# Deployment Checklist - Tier 1 Features

## Pre-Deployment

### Code Review
- [ ] All TypeScript files compile without errors
- [ ] No console.log statements in production code
- [ ] All imports are correct
- [ ] No unused variables or imports
- [ ] Error handling is comprehensive
- [ ] Input validation is in place

### Database
- [ ] Backup existing database
- [ ] Review schema changes in `prisma/schema.prisma`
- [ ] Test migrations on staging database
- [ ] Verify all indexes are created
- [ ] Check foreign key constraints
- [ ] Test cascade deletes

### Environment
- [ ] `DATABASE_URL` is set correctly
- [ ] `REDIS_URL` is configured
- [ ] `JWT_SECRET` is secure and set
- [ ] `PORT` is configured
- [ ] All AWS credentials are set (if using S3)
- [ ] Payment provider keys are set (if using)

### Dependencies
- [ ] Run `npm install` to ensure all dependencies are installed
- [ ] Check for security vulnerabilities: `npm audit`
- [ ] Update outdated packages if needed: `npm outdated`

## Deployment Steps

### 1. Database Migration
```bash
# Backup current database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
npm run db:setup

# Verify tables created
psql $DATABASE_URL -c "\dt"
```

- [ ] Database backup created
- [ ] Migrations executed successfully
- [ ] All new tables exist
- [ ] Indexes created
- [ ] No errors in migration logs

### 2. Build Application
```bash
# Build TypeScript
npm run build

# Verify build output
ls -la dist/
```

- [ ] Build completed without errors
- [ ] All files compiled to `dist/` directory
- [ ] No TypeScript errors

### 3. Test on Staging
```bash
# Start server
npm run dev

# Or for production build
npm start
```

- [ ] Server starts without errors
- [ ] All routes are registered
- [ ] Authentication works
- [ ] Tenant isolation works

### 4. API Testing
Use the examples from `TIER1_API_GUIDE.md`:

- [ ] Academic year endpoints work
- [ ] Term endpoints work
- [ ] Subject endpoints work
- [ ] Timetable endpoints work (including conflict detection)
- [ ] Attendance endpoints work (single and bulk)
- [ ] Gradebook endpoints work
- [ ] Report card generation works
- [ ] Exam management works

### 5. Data Seeding (Optional)
```bash
# Get tenant ID
psql $DATABASE_URL -c "SELECT id, name FROM \"Tenant\";"

# Seed test data
npm run seed:tier1 <tenant-id>
```

- [ ] Seed script runs successfully
- [ ] Test data created
- [ ] Relationships are correct

## Post-Deployment

### Verification
- [ ] All API endpoints respond correctly
- [ ] Authentication is working
- [ ] Tenant isolation is enforced
- [ ] Error responses are consistent
- [ ] Logging is working
- [ ] Performance is acceptable

### Monitoring
- [ ] Set up error monitoring (e.g., Sentry)
- [ ] Set up performance monitoring
- [ ] Set up database monitoring
- [ ] Configure alerts for errors
- [ ] Monitor API response times

### Documentation
- [ ] Update API documentation
- [ ] Notify team of new features
- [ ] Provide training materials
- [ ] Update user guides
- [ ] Document any known issues

### Security
- [ ] SSL/TLS is enabled
- [ ] CORS is configured correctly
- [ ] Rate limiting is in place
- [ ] Input validation is working
- [ ] SQL injection protection verified
- [ ] XSS protection verified

### Performance
- [ ] Database queries are optimized
- [ ] Indexes are being used
- [ ] Response times are acceptable
- [ ] Memory usage is normal
- [ ] No memory leaks detected

## Rollback Plan

If issues are encountered:

### 1. Stop the Application
```bash
# Stop the server
pm2 stop school-saas
# or
kill <process-id>
```

### 2. Restore Database
```bash
# Restore from backup
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

### 3. Revert Code
```bash
# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild
npm run build

# Restart
npm start
```

### 4. Verify Rollback
- [ ] Application is running
- [ ] Database is restored
- [ ] All existing features work
- [ ] No data loss

## Production Deployment

### Before Going Live
- [ ] All staging tests passed
- [ ] Performance tests completed
- [ ] Security audit completed
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Team trained on new features

### Deployment Window
- [ ] Schedule maintenance window
- [ ] Notify users of downtime
- [ ] Prepare rollback plan
- [ ] Have team on standby

### During Deployment
1. [ ] Put application in maintenance mode
2. [ ] Backup database
3. [ ] Run migrations
4. [ ] Deploy new code
5. [ ] Run smoke tests
6. [ ] Take out of maintenance mode
7. [ ] Monitor for errors

### After Deployment
- [ ] Verify all features work
- [ ] Monitor error logs
- [ ] Monitor performance metrics
- [ ] Check database performance
- [ ] Verify tenant isolation
- [ ] Test critical workflows

## Feature-Specific Checks

### Academic Year Management
- [ ] Can create academic year
- [ ] Can set current year
- [ ] Only one year is current
- [ ] Can list all years
- [ ] Can update year
- [ ] Can delete year (with cascade)

### Term Management
- [ ] Can create terms
- [ ] Can set current term
- [ ] Only one term per year is current
- [ ] Terms belong to correct year
- [ ] Can list terms
- [ ] Can filter by academic year

### Subject Management
- [ ] Can create subjects
- [ ] Can assign teachers
- [ ] Subjects linked to classes
- [ ] Can filter by class/teacher
- [ ] Subject codes are unique
- [ ] Can update subjects

### Timetable Management
- [ ] Can create schedule entries
- [ ] Conflict detection works for classes
- [ ] Conflict detection works for teachers
- [ ] Conflict detection works for rooms
- [ ] Can view class schedules
- [ ] Can view teacher schedules

### Attendance Tracking
- [ ] Can mark single attendance
- [ ] Can bulk mark attendance
- [ ] One record per student per day
- [ ] Can view attendance records
- [ ] Statistics calculation works
- [ ] Class reports work

### Gradebook
- [ ] Can create assignments
- [ ] Can record grades
- [ ] Can bulk record grades
- [ ] Weighted calculations work
- [ ] Subject averages calculate correctly
- [ ] Report cards generate correctly
- [ ] Can create examinations
- [ ] Can record exam results

## Performance Benchmarks

Target metrics:
- [ ] API response time < 200ms (average)
- [ ] Database query time < 50ms (average)
- [ ] Report card generation < 2s
- [ ] Bulk operations < 5s for 100 records
- [ ] Memory usage < 512MB
- [ ] CPU usage < 50% (average)

## Support Preparation

### Documentation
- [ ] API documentation updated
- [ ] User guides created
- [ ] Training materials prepared
- [ ] FAQ document created
- [ ] Troubleshooting guide ready

### Team Readiness
- [ ] Support team trained
- [ ] Development team on standby
- [ ] Escalation process defined
- [ ] Contact list updated

### Communication
- [ ] Release notes prepared
- [ ] User notification sent
- [ ] Stakeholders informed
- [ ] Social media updated (if applicable)

## Success Criteria

Deployment is successful when:
- [ ] All API endpoints respond correctly
- [ ] No critical errors in logs
- [ ] Performance meets benchmarks
- [ ] All features work as expected
- [ ] Users can access the system
- [ ] Data integrity is maintained
- [ ] Tenant isolation is enforced
- [ ] Security measures are active

## Sign-Off

- [ ] Technical Lead approval
- [ ] QA approval
- [ ] Product Owner approval
- [ ] Security approval
- [ ] Operations approval

## Notes

Date: _______________
Deployed by: _______________
Version: _______________
Environment: _______________

Issues encountered:
_______________________________________
_______________________________________
_______________________________________

Resolution:
_______________________________________
_______________________________________
_______________________________________

## Emergency Contacts

- Technical Lead: _______________
- DevOps: _______________
- Database Admin: _______________
- Security: _______________
- Product Owner: _______________

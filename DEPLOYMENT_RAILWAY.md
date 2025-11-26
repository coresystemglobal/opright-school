# Railway Deployment Guide

## Prerequisites
- Railway account (https://railway.app)
- GitHub repository with your code
- Backblaze B2 account for file storage

## Step 1: Prepare Your Application

### 1.1 Update Environment Variables
Ensure your `.env` file has all required variables (don't commit this file):

```env
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
S3_BUCKET="your-bucket-name"
S3_ENDPOINT="https://s3.us-west-000.backblazeb2.com"
S3_ACCESS_KEY_ID="your-backblaze-key-id"
S3_SECRET_ACCESS_KEY="your-backblaze-application-key"
S3_REGION="us-west-000"
JWT_SECRET="your-production-secret"
STRIPE_SECRET_KEY="sk_live_..."
PAYSTACK_SECRET_KEY="sk_live_..."
NODE_ENV="production"
PORT=3000
```

### 1.2 Build Configuration
Railway will automatically detect your Node.js app. Ensure `package.json` has:

```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc && npm run db:generate"
  }
}
```

## Step 2: Set Up Backblaze B2

### 2.1 Create Bucket
1. Log in to Backblaze B2
2. Create a new bucket (e.g., `school-saas-files`)
3. Set bucket to "Private" for security

### 2.2 Create Application Key
1. Go to "App Keys" in Backblaze
2. Create new application key with access to your bucket
3. Save the `keyID` and `applicationKey`

### 2.3 Configure S3-Compatible Access
- Endpoint: `https://s3.us-west-000.backblazeb2.com` (adjust region)
- Use the keyID as `S3_ACCESS_KEY_ID`
- Use the applicationKey as `S3_SECRET_ACCESS_KEY`

## Step 3: Deploy to Railway

### 3.1 Create New Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select your repository

### 3.2 Add PostgreSQL Database
1. In your Railway project, click "New"
2. Select "Database" → "PostgreSQL"
3. Railway will automatically create a database and set `DATABASE_URL`

### 3.3 Add Redis (Optional)
1. Click "New" → "Database" → "Redis"
2. Railway will automatically set `REDIS_URL`

### 3.4 Configure Environment Variables
In Railway project settings, add these variables:

```
S3_BUCKET=your-bucket-name
S3_ENDPOINT=https://s3.us-west-000.backblazeb2.com
S3_ACCESS_KEY_ID=your-backblaze-key-id
S3_SECRET_ACCESS_KEY=your-backblaze-application-key
S3_REGION=us-west-000
JWT_SECRET=your-production-secret-key
STRIPE_SECRET_KEY=sk_live_...
PAYSTACK_SECRET_KEY=sk_live_...
NODE_ENV=production
```

### 3.5 Run Database Migrations
In Railway's project settings:
1. Go to "Settings" → "Deploy"
2. Add build command: `npm run build`
3. Add start command: `npm start`

Or run migrations manually via Railway CLI:
```bash
railway run npm run db:push
```

## Step 4: Configure Custom Domain (Optional)

### 4.1 Add Domain in Railway
1. Go to project "Settings" → "Domains"
2. Click "Generate Domain" for a Railway subdomain
3. Or add your custom domain

### 4.2 Update DNS
If using custom domain:
- Add CNAME record pointing to Railway's domain
- Wait for DNS propagation

## Step 5: Post-Deployment

### 5.1 Verify Deployment
1. Check Railway logs for any errors
2. Visit your deployed URL
3. Test database connection

### 5.2 Create Initial Tenant
Use Railway CLI or API to create first tenant:

```bash
railway run node -e "
const { TenantService } = require('./dist/services/tenantService');
TenantService.createTenant({
  name: 'Demo School',
  subdomain: 'demo',
  adminEmail: 'admin@demo.com',
  adminPassword: 'ChangeMe123!',
  adminName: 'Admin User'
}).then(() => console.log('Tenant created'));
"
```

## Step 6: Monitoring & Maintenance

### 6.1 View Logs
```bash
railway logs
```

### 6.2 Database Backups
Railway automatically backs up PostgreSQL databases. Configure backup retention in settings.

### 6.3 Scale Resources
In Railway project settings:
- Adjust memory/CPU limits
- Enable autoscaling if needed

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is set correctly
- Check if database is running in Railway dashboard
- Ensure SSL mode is enabled: `?sslmode=require`

### File Upload Issues
- Verify Backblaze credentials are correct
- Check bucket permissions
- Ensure S3_ENDPOINT matches your region

### Build Failures
- Check Railway build logs
- Verify all dependencies in `package.json`
- Ensure TypeScript compiles: `npm run build`

### Environment Variables Not Loading
- Verify all variables are set in Railway dashboard
- Restart the deployment after adding variables
- Check for typos in variable names

## Cost Optimization

### Railway Pricing
- Free tier: $5 credit/month
- Pro plan: $20/month + usage
- Monitor usage in Railway dashboard

### Backblaze B2 Pricing
- First 10GB storage: Free
- Storage: $0.005/GB/month
- Downloads: First 1GB/day free, then $0.01/GB

### Tips
- Use Redis caching to reduce database queries
- Optimize file uploads (compress images)
- Monitor bandwidth usage
- Set up CDN for static assets

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Use production API keys (Stripe, Paystack)
- [ ] Enable HTTPS (automatic on Railway)
- [ ] Set secure CORS policies
- [ ] Enable rate limiting
- [ ] Regular security updates
- [ ] Monitor error logs
- [ ] Set up backup strategy

## Useful Commands

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to project
railway link

# Run commands in Railway environment
railway run npm run db:push

# View logs
railway logs

# Open project in browser
railway open
```

## Support

- Railway Docs: https://docs.railway.app
- Backblaze B2 Docs: https://www.backblaze.com/b2/docs/
- Project Issues: [Your GitHub Issues URL]

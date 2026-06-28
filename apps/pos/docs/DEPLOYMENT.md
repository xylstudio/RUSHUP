# Deployment Guide

## Prerequisites

- Node.js 20.x or higher
- PostgreSQL database (Supabase recommended)
- Domain name (optional)
- SSL certificate (Let's Encrypt recommended)

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME="Xylem Landscape"

# Stripe Payment Gateway
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxxxx
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key

# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Security
WEBHOOK_SECRET=generate-a-random-secret

# Monitoring (optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

## Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Configure Environment Variables**:
   - Go to Vercel Dashboard
   - Select your project
   - Go to Settings > Environment Variables
   - Add all variables from `.env.local`

5. **Configure Custom Domain** (optional):
   - Go to Settings > Domains
   - Add your domain
   - Update DNS records as instructed

### Option 2: Railway

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**:
   ```bash
   railway login
   ```

3. **Initialize Project**:
   ```bash
   railway init
   ```

4. **Add Environment Variables**:
   ```bash
   railway variables set VARIABLE_NAME=value
   ```

5. **Deploy**:
   ```bash
   railway up
   ```

### Option 3: Docker + Self-Hosted

1. **Build Docker Image**:
   ```bash
   docker build -t xylem-landscape .
   ```

2. **Run Container**:
   ```bash
   docker run -d \
     --name xylem-landscape \
     -p 3000:3000 \
     --env-file .env.local \
     xylem-landscape
   ```

3. **Setup Reverse Proxy** (Nginx):
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

4. **Setup SSL** (Let's Encrypt):
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### Option 4: DigitalOcean App Platform

1. Create a new app in DigitalOcean
2. Connect your GitHub repository
3. Configure build settings:
   - Build Command: `npm run build`
   - Run Command: `npm start`
4. Add environment variables
5. Deploy

## Database Migration

1. **Run Database Schema**:
   ```bash
   # In Supabase SQL Editor, run:
   psql -h your-supabase-host -U postgres -f schema-all-in-one.sql
   ```

2. **Verify Tables**:
   - Check Supabase dashboard
   - Ensure all tables are created
   - Verify RLS policies are active

## Post-Deployment

### 1. Verify Application

- Test login/registration
- Test payment flow
- Test email notifications
- Check error logs

### 2. Setup Monitoring

**Sentry**:
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**Uptime Monitoring**:
- Use UptimeRobot or similar
- Monitor main endpoints
- Set up alerts

### 3. Performance Optimization

- Enable CDN for static assets
- Configure caching headers
- Enable compression (gzip/brotli)
- Optimize images (WebP format)

### 4. Security

- Enable HTTPS
- Configure security headers (done via middleware)
- Setup rate limiting
- Regular security audits

### 5. Backup Strategy

**Database**:
- Daily automated backups (Supabase does this)
- Weekly manual backups
- Test restore procedures

**Files**:
- Backup uploaded files
- Use cloud storage (S3, GCS)

## Continuous Deployment

GitHub Actions workflow is already configured in `.github/workflows/ci.yml`.

**Setup**:
1. Add secrets to GitHub repository:
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. Push to `main` branch to trigger deployment

## Troubleshooting

### Build Fails

Check:
- Node.js version (must be 20.x)
- All dependencies installed
- Environment variables set
- TypeScript errors

### Runtime Errors

Check:
- Application logs
- Sentry error reports
- Database connectivity
- API rate limits

### Performance Issues

- Enable caching
- Optimize database queries
- Use CDN for static assets
- Check server resources

## Rollback

### Vercel
```bash
vercel rollback
```

### Railway
```bash
railway rollback
```

### Docker
```bash
docker stop xylem-landscape
docker rm xylem-landscape
docker run -d --name xylem-landscape previous-image:tag
```

## Support

For deployment issues:
- Check logs first
- Review this guide
- Open GitHub issue
- Contact support team

## Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrated and tested
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Monitoring setup (Sentry, Uptime)
- [ ] Backup strategy implemented
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Error tracking working
- [ ] Email sending tested
- [ ] Payment gateway tested
- [ ] Load testing completed
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Team trained on production access

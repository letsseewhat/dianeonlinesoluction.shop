# Deployment Guide

This guide covers deploying the Diane Online Solution platform to various hosting platforms.

## Prerequisites

- Node.js application packaged and ready
- Environment variables configured
- Stripe account and API keys
- Domain name (optional but recommended)

## Deployment Options

### 1. Heroku

#### Setup
```bash
# Install Heroku CLI
brew install heroku/brew/heroku  # macOS
# or download from https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create app
heroku create dianeonlinesoluction-shop

# Add environment variables
heroku config:set STRIPE_PUBLIC_KEY=pk_live_...
heroku config:set STRIPE_SECRET_KEY=sk_live_...
heroku config:set NODE_ENV=production
```

#### Deploy
```bash
git push heroku main
```

#### Monitor
```bash
heroku logs --tail
```

### 2. AWS (Elastic Beanstalk)

#### Setup
```bash
# Install AWS CLI and EB CLI
pip install awsebcli

# Initialize
eb init -p node.js dianeonlinesoluction-shop

# Create environment
eb create production
```

#### Configure Environment
```bash
eb setenv STRIPE_PUBLIC_KEY=pk_live_...
eb setenv STRIPE_SECRET_KEY=sk_live_...
```

#### Deploy
```bash
eb deploy
```

### 3. DigitalOcean

#### Using App Platform
1. Connect GitHub repository
2. Set environment variables in dashboard
3. Configure auto-deploy on push

#### Using Droplet
```bash
# SSH into droplet
ssh root@your_droplet_ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone https://github.com/letsseewhat/dianeonlinesoluction.shop.git
cd dianeonlinesoluction.shop

# Install dependencies
npm install --production

# Set environment variables
echo "STRIPE_PUBLIC_KEY=pk_live_..." > .env
echo "STRIPE_SECRET_KEY=sk_live_..." >> .env

# Use PM2 for process management
npm install -g pm2
pm2 start server.js --name "dianeonline"
pm2 startup
pm2 save
```

### 4. Azure App Service

#### Deploy via GitHub
1. Go to Azure Portal
2. Create App Service
3. Configure deployment from GitHub
4. Add environment variables in Application settings
5. Deploy

### 5. Docker Deployment

#### Create Dockerfile
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### Build and Run
```bash
docker build -t dianeonline .
docker run -p 3000:3000 --env-file .env dianeonline
```

## SSL/TLS Certificate

### Let's Encrypt (Free)
```bash
# Using Certbot
sudo apt-get install certbot python3-certbot-nginx
sudo certbot certonly --standalone -d yourdomain.com
```

### AWS Certificate Manager
- Free SSL certificates for AWS resources
- Automatic renewal

## Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
STRIPE_PUBLIC_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=dianeonline_prod
```

## Health Checks

Configure health check endpoint for load balancers:
```
GET /health
```

## Monitoring

### Uptime Monitoring
- Use services like UptimeRobot or Pingdom
- Monitor `/health` endpoint

### Error Tracking
- Sentry for error monitoring
- CloudWatch (AWS) for logs

### Performance
- New Relic for APM
- Datadog for comprehensive monitoring

## Backup Strategy

- Database backups: Daily automated backups
- Code backups: GitHub repository
- File backups: Data directory backups

## Post-Deployment

1. Test all features in production
2. Verify Stripe webhook setup
3. Monitor error logs
4. Set up SSL certificate
5. Configure CDN for static assets (optional)
6. Enable DDoS protection

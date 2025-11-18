# Deployment Guide — Crypto Hub Bot

## Overview

This guide covers deploying Crypto Hub Bot to production using PM2, Docker, and Kubernetes.

---

## Pre-Deployment Checklist

- [ ] All environment variables documented
- [ ] Database indexes created
- [ ] Webhook URLs configured and tested
- [ ] Error logging configured
- [ ] Monitoring tools set up
- [ ] Backup strategy in place
- [ ] SSL certificates ready (for webhooks)
- [ ] Payment provider accounts approved
- [ ] Rate limiting configured

---

## Option 1: PM2 (Simple VPS)

### Prerequisites

- Ubuntu 20.04+ server
- Node.js 20+ installed
- MongoDB (local or remote)
- Nginx (for reverse proxy)

### Installation

```bash
# Install PM2 globally
npm install -g pm2

# Clone repository
git clone https://github.com/yourusername/crypto-hub-bot.git
cd crypto-hub-bot

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env
nano .env  # Fill in production values
```

### Start Application

```bash
# Start with PM2
pm2 start src/index.js --name crypto-hub-bot

# View logs
pm2 logs crypto-hub-bot

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Auto-start on server reboot
pm2 startup
```

### PM2 Ecosystem File

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'crypto-hub-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true
  }]
};
```

Start with ecosystem file:

```bash
pm2 start ecosystem.config.js
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/crypto-hub-bot
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/crypto-hub-bot /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Updates

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install --production

# Restart app
pm2 restart crypto-hub-bot
```

---

## Option 2: Docker

### Dockerfile

```dockerfile
# /Dockerfile
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start application
CMD ["node", "src/index.js"]
```

### .dockerignore

```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
docs/
__tests__/
*.test.js
```

### Build & Run

```bash
# Build image
docker build -t crypto-hub-bot:latest .

# Run container
docker run -d \
  --name crypto-hub-bot \
  --env-file .env \
  -p 3000:3000 \
  --restart unless-stopped \
  crypto-hub-bot:latest

# View logs
docker logs -f crypto-hub-bot

# Stop container
docker stop crypto-hub-bot

# Remove container
docker rm crypto-hub-bot
```

---

## Option 3: Docker Compose

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: crypto-hub-bot
    restart: unless-stopped
    env_file: .env
    environment:
      - NODE_ENV=production
      - MONGO_URI=mongodb://mongo:27017/crypto_hub
    ports:
      - "3000:3000"
    depends_on:
      - mongo
    networks:
      - crypto-hub-network
    volumes:
      - ./logs:/app/logs

  mongo:
    image: mongo:7
    container_name: crypto-hub-mongo
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=crypto_hub
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    networks:
      - crypto-hub-network

  nginx:
    image: nginx:alpine
    container_name: crypto-hub-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - crypto-hub-network

volumes:
  mongo-data:

networks:
  crypto-hub-network:
    driver: bridge
```

### Start Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

---

## Option 4: Kubernetes

### Prerequisites

- Kubernetes cluster (GKE, EKS, AKS, or self-hosted)
- `kubectl` installed
- Docker registry (Docker Hub, GCR, ECR)

### Build & Push Image

```bash
# Build image
docker build -t yourusername/crypto-hub-bot:v1.0.0 .

# Push to registry
docker push yourusername/crypto-hub-bot:v1.0.0
```

### Kubernetes Manifests

**Namespace:**

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: crypto-hub
```

**Secret:**

```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: crypto-hub-secrets
  namespace: crypto-hub
type: Opaque
stringData:
  MONGO_URI: mongodb://mongo-service:27017/crypto_hub
  TELEGRAM_BOT_TOKEN: your_bot_token
  TELEGRAM_CHANNEL_ID: your_channel_id
  ADMIN_TELEGRAM_ID: your_admin_id
  GEMINI_API_KEY: your_gemini_key
  MPESA_CONSUMER_KEY: your_mpesa_key
  MPESA_CONSUMER_SECRET: your_mpesa_secret
  # Add all other secrets
```

**Deployment:**

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: crypto-hub-bot
  namespace: crypto-hub
spec:
  replicas: 2
  selector:
    matchLabels:
      app: crypto-hub-bot
  template:
    metadata:
      labels:
        app: crypto-hub-bot
    spec:
      containers:
      - name: crypto-hub-bot
        image: yourusername/crypto-hub-bot:v1.0.0
        ports:
        - containerPort: 3000
        envFrom:
        - secretRef:
            name: crypto-hub-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**Service:**

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: crypto-hub-service
  namespace: crypto-hub
spec:
  type: LoadBalancer
  selector:
    app: crypto-hub-bot
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
```

**MongoDB StatefulSet:**

```yaml
# k8s/mongo-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongo
  namespace: crypto-hub
spec:
  serviceName: mongo-service
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
      - name: mongo
        image: mongo:7
        ports:
        - containerPort: 27017
        volumeMounts:
        - name: mongo-storage
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: mongo-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongo-service
  namespace: crypto-hub
spec:
  clusterIP: None
  selector:
    app: mongo
  ports:
  - port: 27017
    targetPort: 27017
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl apply -f k8s/secret.yaml

# Deploy MongoDB
kubectl apply -f k8s/mongo-statefulset.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml

# Check status
kubectl get pods -n crypto-hub
kubectl get services -n crypto-hub

# View logs
kubectl logs -f -n crypto-hub -l app=crypto-hub-bot

# Scale deployment
kubectl scale deployment crypto-hub-bot --replicas=3 -n crypto-hub
```

### Updates

```bash
# Build new version
docker build -t yourusername/crypto-hub-bot:v1.0.1 .
docker push yourusername/crypto-hub-bot:v1.0.1

# Update deployment
kubectl set image deployment/crypto-hub-bot \
  crypto-hub-bot=yourusername/crypto-hub-bot:v1.0.1 \
  -n crypto-hub

# Check rollout status
kubectl rollout status deployment/crypto-hub-bot -n crypto-hub

# Rollback if needed
kubectl rollout undo deployment/crypto-hub-bot -n crypto-hub
```

---

## Environment Variables

### Required for Production

```env
# Core
NODE_ENV=production
PORT=3000
BASE_URL=https://yourdomain.com

# Database
MONGO_URI=mongodb://username:password@host:27017/crypto_hub?authSource=admin

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
TELEGRAM_CHANNEL_ID=-1001234567890
ADMIN_TELEGRAM_ID=123456789

# Gemini AI
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash

# Payment - Crypto
CRYPTO_USDT_ADDRESS=0x...
CRYPTO_BTC_ADDRESS=bc1...

# Payment - M-Pesa
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_ENVIRONMENT=production
MPESA_CALLBACK_URL=https://yourdomain.com/api/webhook/mpesa/callback

# Payment - Airtel
AIRTEL_CLIENT_ID=...
AIRTEL_CLIENT_SECRET=...
AIRTEL_API_KEY=...
AIRTEL_ENVIRONMENT=production

# Mobile Money Contacts
MOBILE_MPESA_KE=254791792027
MOBILE_AIRTEL_UG=256700000000
MOBILE_AIRTEL_MW=265990000000
DEFAULT_PAYMENT_COUNTRY=KE
```

---

## CI/CD with GitHub Actions

### .github/workflows/deploy.yml

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Login to Docker Hub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: yourusername/crypto-hub-bot:latest
    
    - name: Deploy to server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /opt/crypto-hub-bot
          docker-compose pull
          docker-compose up -d
```

---

## Health Checks

### Endpoint

Already implemented in `src/routes/api.js`:

```javascript
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### Enhanced Health Check

```javascript
router.get('/health', async (req, res) => {
  const checks = {
    server: 'ok',
    database: 'unknown',
    telegram: 'unknown'
  };

  try {
    // Check MongoDB
    await mongoose.connection.db.admin().ping();
    checks.database = 'ok';
  } catch (error) {
    checks.database = 'error';
  }

  try {
    // Check Telegram API
    await bot.telegram.getMe();
    checks.telegram = 'ok';
  } catch (error) {
    checks.telegram = 'error';
  }

  const allOk = Object.values(checks).every(status => status === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

---

## Monitoring

### Application Logs

```javascript
// src/utils/logger.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export default logger;
```

### Use in Application

```javascript
import logger from './utils/logger.js';

logger.info('Application started');
logger.error('Error occurred', { error: err.message });
```

---

## Backup Strategy

### MongoDB Backup

```bash
#!/bin/bash
# backup-mongodb.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mongodb"
mkdir -p $BACKUP_DIR

# Dump database
mongodump --uri="mongodb://user:pass@localhost:27017/crypto_hub" \
  --out="$BACKUP_DIR/backup_$DATE"

# Compress
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" -C "$BACKUP_DIR" "backup_$DATE"
rm -rf "$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: backup_$DATE.tar.gz"
```

### Automate with Cron

```bash
# Run daily at 2 AM
0 2 * * * /opt/scripts/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs crypto-hub-bot --lines 50

# Check environment variables
pm2 env 0

# Check port availability
netstat -tulpn | grep 3000
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart crypto-hub-bot --max-memory-restart 500M
```

### Database Connection Issues

```bash
# Test MongoDB connection
mongosh "mongodb://user:pass@localhost:27017/crypto_hub"

# Check MongoDB status
sudo systemctl status mongod
```

---

## Security Hardening

1. **Firewall**: Allow only necessary ports (80, 443, 22)
2. **SSH**: Disable password authentication, use key-based only
3. **Updates**: Keep system packages updated
4. **Secrets**: Never commit `.env` to Git
5. **HTTPS**: Use SSL certificates for all webhook URLs
6. **Rate Limiting**: Implement API rate limiting
7. **Monitoring**: Set up alerts for suspicious activity

---

## Next Steps

1. Choose deployment method (PM2, Docker, or Kubernetes)
2. Set up production server/cluster
3. Configure environment variables
4. Deploy application
5. Set up monitoring and logging
6. Configure automated backups
7. Test health checks
8. Set up CI/CD pipeline

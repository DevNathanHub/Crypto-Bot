# Crypto Hub Bot - System Startup Configuration

## ✅ Auto-Start Configured

The Crypto Hub Bot is now configured to start automatically on system boot using PM2 and systemd.

## System Service

- **Service Name**: `pm2-mosion`
- **Service File**: `/etc/systemd/system/pm2-mosion.service`
- **Status**: Enabled

## How It Works

1. **On System Boot**: systemd starts the `pm2-mosion` service
2. **PM2 Resurrection**: PM2 automatically restarts all saved processes
3. **Bot Startup**: crypto-hub-bot launches automatically

## Management Commands

### Check Service Status
```bash
systemctl status pm2-mosion
```

### Check Bot Status
```bash
pm2 status
# or
npm run pm2:status
```

### View Logs
```bash
pm2 logs crypto-hub-bot
# or
npm run pm2:logs
```

### Manual Control
```bash
# Restart bot
pm2 restart crypto-hub-bot

# Stop bot
pm2 stop crypto-hub-bot

# Start bot
pm2 start crypto-hub-bot

# Delete from PM2
pm2 delete crypto-hub-bot
```

### Update Saved Process List
After making changes to PM2 processes, save them:
```bash
pm2 save
```

### Disable Auto-Start (if needed)
```bash
pm2 unstartup systemd
sudo systemctl disable pm2-mosion
```

### Re-enable Auto-Start
```bash
pm2 startup
# Follow the command it provides
pm2 save
```

## What Starts Automatically

- **crypto-hub-bot**: Main Telegram bot process
  - Port: 3000
  - Memory limit: 500MB
  - Auto-restart: Enabled
  - Daily cron restart: 4 AM

## Logs Location

- **PM2 Logs**: `~/.pm2/logs/`
- **Bot Logs**: `./logs/pm2-*.log`
- **Error Log**: `./logs/pm2-error.log`
- **Output Log**: `./logs/pm2-out.log`

## Verification

Test the auto-start by rebooting:
```bash
sudo reboot
```

After reboot, check if bot is running:
```bash
pm2 status
```

## Troubleshooting

### Bot not starting after reboot?
1. Check service status: `systemctl status pm2-mosion`
2. Check PM2 logs: `pm2 logs crypto-hub-bot --err`
3. Manually start: `cd ~/Desktop/Crypto\ Hub/App && pm2 start ecosystem.config.cjs`
4. Save state: `pm2 save`

### Service not enabled?
```bash
sudo systemctl enable pm2-mosion
sudo systemctl start pm2-mosion
```

### PM2 not found on boot?
Ensure PM2 is in PATH. Re-run:
```bash
pm2 startup
# Copy and run the command it provides
```

## Current Configuration

- ✅ PM2 installed globally
- ✅ Systemd service created and enabled
- ✅ Process list saved (`crypto-hub-bot`)
- ✅ Auto-restart on crash enabled
- ✅ Daily cron restart at 4 AM (Europe/London)
- ✅ Multi-channel broadcasting to 2 channels

## Last Updated

Configuration completed: $(date)
System: $(uname -a | cut -d' ' -f1-3)

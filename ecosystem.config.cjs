module.exports = {
  apps: [{
    name: 'crypto-hub-bot',
    script: './src/index.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    env_development: {
      NODE_ENV: 'development'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    // Restart policy
    min_uptime: '10s',
    max_restarts: 10,
    autorestart: true,
    restart_delay: 4000,
    // Cron restart (optional - restart daily at 4 AM)
    cron_restart: '0 4 * * *',
    // Kill timeout
    kill_timeout: 5000
  }]
};

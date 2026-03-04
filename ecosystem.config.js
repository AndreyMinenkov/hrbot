module.exports = {
  apps: [
    {
      name: 'hr-bot-backend',
      script: '/root/hr-bot/backend/index.js',
      watch: true,
      ignore_watch: ['node_modules', 'logs', 'uploads'],
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
        DB_USER: 'postgres',
        DB_PASSWORD: 'Kapapa661109',
        DB_HOST: 'localhost',
        DB_PORT: 5432,
        DB_DATABASE: 'hrbot',
        JWT_SECRET: 'your_jwt_secret_key_change_this_in_production'
      },
      error_file: '/root/hr-bot/logs/backend-error.log',
      out_file: '/root/hr-bot/logs/backend-out.log',
      log_file: '/root/hr-bot/logs/backend-combined.log',
      time: true,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: 5000
    },
    {
      name: 'hr-bot-frontend',
      script: '/usr/bin/serve',
      args: '-s /root/hr-bot/frontend/build -l 3005',
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '/root/hr-bot/logs/frontend-error.log',
      out_file: '/root/hr-bot/logs/frontend-out.log',
      log_file: '/root/hr-bot/logs/frontend-combined.log',
      time: true,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: 5000
    }
  ]
};

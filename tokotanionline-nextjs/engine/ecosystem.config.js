/**
 * E1.3 — PM2 CONFIG untuk SEO Engine Runner
 * 
 * Production: pm2 start engine/ecosystem.config.js
 */

module.exports = {
  apps: [
    {
      name: 'seo-engine',
      script: './engine/runner.ts',
      interpreter: 'tsx',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/seo-engine-error.log',
      out_file: './logs/seo-engine-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};








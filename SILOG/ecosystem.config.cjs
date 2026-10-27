module.exports = {
  apps: [
    {
      name: 'siloga-server',
      script: './backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        DOMAIN: 'siloga.site',
        JWT_SECRET: 'siloga-military-defense-jwt-secret-key-2026-superadmin-omega',
        SIMCOP_SUPERADMIN_PASSWORD: 'ssc841209'
      }
    }
  ]
};

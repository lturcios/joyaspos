module.exports = {
  apps: [
    {
      name: 'joyaspos-api',
      script: './apps/api/dist/index.js',
      cwd: '/var/www/joyaspos',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
}

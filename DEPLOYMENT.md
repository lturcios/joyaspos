Deployment tiene dos partes independientes. Empiezo con la que tiene más pasos.

---
Parte 1 — API en InterServer VPS

Conectate por SSH y ejecutá estos comandos en orden.

MySQL

sudo apt update
sudo apt install -y mysql-server
sudo mysql_secure_installation   # seguí el wizard, anotá el root password

sudo mysql -u root -p
CREATE DATABASE joyaspos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'joyaspos'@'localhost' IDENTIFIED BY 'CONTRASEÑA_DB_FUERTE';
GRANT ALL PRIVILEGES ON joyaspos.* TO 'joyaspos'@'localhost';
FLUSH PRIVILEGES;
EXIT;

PM2 + pnpm

npm install -g pm2 pnpm

Código en el servidor

# Subí el monorepo a /var/www/joyaspos (vía git clone o rsync)
git clone https://github.com/TU_USUARIO/joyaspos.git /var/www/joyaspos
cd /var/www/joyaspos
pnpm install

Variables de entorno

Creá /var/www/joyaspos/apps/api/.env:
env
DATABASE_URL="mysql://joyaspos:c1elwMcH%3Csf%26%24td%5D%2FU%3EW%2Fls@localhost:3306/joyaspos"
JWT_SECRET="897e70fe36944f77272ffa1bf6992fc35fc409858a2fc194390a6a9e230e32be"
JWT_EXPIRES_IN="8h"
PORT=3000
HOST=0.0.0.0
CORS_ORIGINS="https://TU_DOMINIO_HOSTINGER.COM"
NODE_ENV=production

Build y migraciones

cd /var/www/joyaspos
pnpm --filter api exec prisma generate
pnpm --filter api build
#pnpm --filter api exec prisma db seed
pnpm --filter api exec prisma migrate deploy

PM2

cat /var/www/joyaspos/ecosystem.config.js:

● Write(ecosystem.config.js)
Wrote 16 lines to ecosystem.config.js
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
… +6 lines

cd /var/www/joyaspos
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup   # ejecutá el comando que te muestre para que arranque con el sistema

Nginx como reverse proxy

sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/joyaspos-api

Contenido:
server {
    listen 80;
    server_name api.TU_DOMINIO.COM;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

sudo ln -s /etc/nginx/sites-available/joyaspos-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL gratuito con Let's Encrypt
sudo certbot --nginx -d api.TU_DOMINIO.COM

---
Parte 2 — Web en Hostinger (hosting compartido)

Esto se hace localmente antes de subir.

Configurar la URL de producción

Creá apps/web/.env.production:

env
VITE_API_URL=https://api.TU_DOMINIO.COM

Build local

pnpm --filter web build
El output queda en apps/web/dist/.

.htaccess para React Router

Sin esto, cualquier refresh en /ventas o /dashboard devuelve 404 en Apache:

● Write(apps\web\public\.htaccess)
Wrote 5 lines to apps\web\public\.htaccess
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [QSA,L]

Al estar en public/, Vite lo copia automáticamente a dist/ en el próximo build.

Subir a Hostinger

1. En el panel de Hostinger → File Manager → abrí public_html/
2. Subí todo el contenido de apps/web/dist/ (no la carpeta dist/ en sí, sino lo que hay adentro)
3. Verificá que index.html y .htaccess están en la raíz de public_html/

---
Resumen de orden de ejecución

VPS:
  1. MySQL → crear DB y usuario
  2. pnpm install + build + prisma migrate deploy
  3. PM2 start
  4. Nginx + Certbot SSL

Local → Hostinger:
  1. Crear apps/web/.env.production con VITE_API_URL
  2. pnpm --filter web build
  3. Subir dist/ a public_html/

Reemplazá en todos los comandos:
- TU_DOMINIO.COM → tu dominio real
- api.TU_DOMINIO.COM → subdominio que apunta al VPS (un registro A en tu DNS)
- CONTRASEÑA_DB_FUERTE → contraseña para MySQL
- JWT_SECRET → generalo con openssl rand -hex 32 en el VPS

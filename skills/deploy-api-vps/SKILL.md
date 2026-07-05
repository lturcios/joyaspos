---
name: deploy-api-vps
description: |
  Guía completa de despliegue de la API de JoyasPOS en VPS Oracle Linux con MySQL 8:
  instalación de Node.js 20, PM2 en modo cluster, Nginx como reverse proxy (puerto
  3000 → 80/443), variables de entorno de producción, prisma migrate deploy como
  pre-deploy, configuración de SSL con Certbot/Let's Encrypt, y script de deploy
  automatizado. Usar al hacer el primer deploy a producción, al actualizar la API
  después de cambios de código, al ejecutar migraciones de base de datos en producción,
  o al depurar problemas de conectividad o rendimiento en el VPS.
  Depende de que SKILL-03 (fastify-project-structure) y SKILL-04 (prisma-mysql)
  estén completamente implementados y probados en desarrollo.
---

# SKILL-31 — Deploy API en VPS Oracle Linux

## Entorno objetivo
Oracle Linux 8/9 · MySQL 8 (ya operativo) · Node.js 20 · PM2 · Nginx

---

## 1. Preparación del VPS (primera vez)

```bash
# Conectar al VPS
ssh usuario@IP_VPS

# Instalar Node.js 20 via nvm (recomendado sobre el repo del sistema)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20
node --version   # debe mostrar v20.x.x

# Instalar pnpm globalmente
npm install -g pnpm

# Instalar PM2 globalmente
npm install -g pm2

# Instalar Nginx
sudo dnf install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx

# Abrir puerto 80 y 443 en el firewall de Oracle
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Verificar que MySQL está activo
sudo systemctl status mysqld
```

---

## 2. Crear base de datos de producción

```sql
-- Conectar a MySQL como root
mysql -u root -p

-- Crear BD y usuario dedicado
CREATE DATABASE joyaspos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'joyaspos_user'@'localhost' IDENTIFIED BY 'CONTRASEÑA_SEGURA';
GRANT ALL PRIVILEGES ON joyaspos.* TO 'joyaspos_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Clonar el repositorio en el VPS

```bash
# En el VPS, crear directorio de trabajo
mkdir -p /var/www/joyaspos
cd /var/www/joyaspos

# Clonar el monorepo (usar SSH o HTTPS según tu configuración Git)
git clone https://github.com/TUUSUARIO/joyaspos.git .

# Instalar dependencias
pnpm install --frozen-lockfile
```

---

## 4. Configurar variables de entorno de producción

```bash
# Crear el .env de producción (NUNCA commitear este archivo)
cat > /var/www/joyaspos/apps/api/.env << 'EOF'
DATABASE_URL="mysql://joyaspos_user:CONTRASEÑA_SEGURA@localhost:3306/joyaspos"
JWT_SECRET="SECRET_DE_AL_MENOS_32_CARACTERES_ALEATORIOS_AQUI"
JWT_EXPIRES_IN="8h"
PORT=3000
HOST=127.0.0.1
CORS_ORIGINS="https://tudominio.com,https://www.tudominio.com"
NODE_ENV=production
EOF

# Verificar que el archivo existe y tiene las variables
cat /var/www/joyaspos/apps/api/.env
```

---

## 5. Ejecutar migraciones y seed inicial

```bash
cd /var/www/joyaspos

# Generar el cliente Prisma
pnpm --filter api exec prisma generate

# Ejecutar migraciones en producción
pnpm --filter api exec prisma migrate deploy

# Crear el usuario admin inicial (solo la primera vez)
pnpm --filter api exec prisma db seed
```

---

## 6. Build de la API

```bash
cd /var/www/joyaspos
pnpm --filter api build
# Genera el directorio apps/api/dist/
```

---

## 7. Configurar PM2

### `apps/api/ecosystem.config.js`
```javascript
module.exports = {
  apps: [{
    name: 'joyaspos-api',
    script: './dist/index.js',
    cwd: '/var/www/joyaspos/apps/api',
    instances: 'max',           // Un proceso por núcleo de CPU disponible
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
    },
    // Reinicio automático si la memoria supera 512MB
    max_memory_restart: '512M',
    // Log de errores y output
    error_file: '/var/log/pm2/joyaspos-api-error.log',
    out_file: '/var/log/pm2/joyaspos-api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
}
```

```bash
# Crear directorio de logs
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# Iniciar la API con PM2
cd /var/www/joyaspos/apps/api
pm2 start ecosystem.config.js --env production

# Guardar la configuración de PM2 para que arranque con el sistema
pm2 save
pm2 startup   # copiar y ejecutar el comando que PM2 imprime

# Verificar que la API está corriendo
pm2 status
pm2 logs joyaspos-api --lines 20
```

---

## 8. Configurar Nginx como reverse proxy

```bash
sudo nano /etc/nginx/conf.d/joyaspos-api.conf
```

```nginx
# /etc/nginx/conf.d/joyaspos-api.conf
server {
    listen 80;
    server_name api.tudominio.com;

    # Redirigir a HTTPS (se activa después de instalar SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 30s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

```bash
# Verificar sintaxis y recargar Nginx
sudo nginx -t
sudo systemctl reload nginx

# Probar que la API responde
curl http://api.tudominio.com/health
# → {"status":"ok","timestamp":"..."}
```

---

## 9. Instalar SSL con Certbot

```bash
# Instalar Certbot
sudo dnf install certbot python3-certbot-nginx -y

# Obtener certificado SSL (reemplazar con tu dominio real)
sudo certbot --nginx -d api.tudominio.com

# Certbot modifica automáticamente el nginx.conf para HTTPS
# Verificar que el redirect HTTP→HTTPS funciona
curl -I http://api.tudominio.com
# → 301 https://...

# El certificado se renueva automáticamente vía cron
sudo certbot renew --dry-run
```

---

## 10. Script de deploy automatizado

```bash
# /var/www/joyaspos/scripts/deploy-api.sh
#!/bin/bash
set -e   # Detener si cualquier comando falla

echo "🚀 Iniciando deploy de JoyasPOS API..."
cd /var/www/joyaspos

# 1. Actualizar código
git pull origin main

# 2. Instalar dependencias nuevas (si las hay)
pnpm install --frozen-lockfile

# 3. Generar cliente Prisma
pnpm --filter api exec prisma generate

# 4. Ejecutar migraciones
pnpm --filter api exec prisma migrate deploy

# 5. Build
pnpm --filter api build

# 6. Reiniciar PM2 con zero-downtime (cluster mode)
pm2 reload joyaspos-api

echo "✅ Deploy completado exitosamente"
pm2 status
```

```bash
# Hacer ejecutable el script
chmod +x /var/www/joyaspos/scripts/deploy-api.sh

# Ejecutar deploy
/var/www/joyaspos/scripts/deploy-api.sh
```

---

## 11. Comandos de mantenimiento frecuentes

```bash
# Ver logs en tiempo real
pm2 logs joyaspos-api

# Reiniciar la API (con downtime mínimo en cluster)
pm2 reload joyaspos-api

# Ver estado de todos los procesos
pm2 status

# Ver métricas de CPU y memoria
pm2 monit

# Verificar que la BD tiene las migraciones aplicadas
cd /var/www/joyaspos && pnpm --filter api exec prisma migrate status

# Verificar conexión a la BD
mysql -u joyaspos_user -p joyaspos -e "SHOW TABLES;"
```

---

## 12. Checklist de deploy a producción

- [ ] Variables de entorno en `.env` de producción con valores correctos
- [ ] `JWT_SECRET` tiene al menos 32 caracteres y es único (no el del `.env.example`)
- [ ] `DATABASE_URL` apunta a la BD de producción
- [ ] `CORS_ORIGINS` incluye el dominio real del panel web
- [ ] `prisma migrate deploy` ejecutado exitosamente
- [ ] `pm2 status` muestra la API en estado `online`
- [ ] `curl https://api.tudominio.com/health` retorna `{"status":"ok"}`
- [ ] El certificado SSL está instalado y el redirect HTTP→HTTPS funciona
- [ ] El seed del usuario admin fue ejecutado (solo primera vez)

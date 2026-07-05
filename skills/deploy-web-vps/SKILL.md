---
name: deploy-web-vps
description: |
  Guía de despliegue del panel web de JoyasPOS como SPA estática en el VPS Oracle
  Linux: build de Vite con variables de entorno de producción, configuración de
  Nginx para servir los archivos estáticos con fallback a index.html para React
  Router, caché de assets, y script de deploy automatizado. Usar al hacer el primer
  deploy del panel web, al actualizar el panel después de cambios de código, o al
  depurar problemas de rutas (404 en recarga directa) o de conexión a la API.
  Depende de SKILL-31 (deploy-api-vps) para que la API esté operativa primero.
---

# SKILL-32 — Deploy Panel Web en VPS Oracle Linux

## El panel web es una SPA estática
Vite genera archivos HTML/CSS/JS en `apps/web/dist/`. Nginx los sirve directamente.
No se necesita Node.js en runtime para el panel web.

---

## 1. Configurar variables de entorno de producción del build

```bash
# En el VPS, crear el .env de producción para el panel web
cat > /var/www/joyaspos/apps/web/.env.production << 'EOF'
VITE_API_URL=https://api.tudominio.com
EOF
```

> Las variables `VITE_*` se inyectan en el bundle en tiempo de build — no son
> secretos y estarán visibles en el código JavaScript del navegador. Solo poner
> la URL de la API aquí, nunca secrets o tokens.

---

## 2. Build del panel web

```bash
cd /var/www/joyaspos

# Build del panel web con las variables de producción
pnpm --filter web build

# El output queda en:
ls apps/web/dist/
# index.html  assets/  ...
```

---

## 3. Configurar Nginx para el panel web

```bash
sudo nano /etc/nginx/conf.d/joyaspos-web.conf
```

```nginx
# /etc/nginx/conf.d/joyaspos-web.conf
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;

    # Redirigir a HTTPS (activar tras instalar SSL)
    # return 301 https://$server_name$request_uri;

    root /var/www/joyaspos/apps/web/dist;
    index index.html;

    # ── Caché de assets estáticos (JS, CSS, imágenes) ──────────────────────
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # ── SPA fallback — todas las rutas sirven index.html ───────────────────
    # Sin esto, recargar /dashboard o /reportes/ventas retorna 404
    location / {
        try_files $uri $uri/ /index.html;
    }

    # ── Seguridad — headers básicos ────────────────────────────────────────
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

```bash
# Verificar sintaxis y recargar
sudo nginx -t
sudo systemctl reload nginx

# Verificar que el panel responde
curl -I http://tudominio.com
# → 200 OK (o 301 si ya tienes SSL)
```

---

## 4. Instalar SSL para el panel web

```bash
# Obtener certificado (puede combinarse con el de la API en el mismo Certbot)
sudo certbot --nginx -d tudominio.com -d www.tudominio.com

# Verificar
curl -I https://tudominio.com
# → 200 OK con encabezados de seguridad
```

---

## 5. Permisos de archivos

```bash
# Nginx necesita leer los archivos del dist/
sudo chown -R nginx:nginx /var/www/joyaspos/apps/web/dist
sudo chmod -R 755 /var/www/joyaspos/apps/web/dist

# Si Nginx corre como otro usuario (verificar con):
ps aux | grep nginx
# Ajustar el chown según el usuario que aparezca
```

---

## 6. Script de deploy del panel web

```bash
# /var/www/joyaspos/scripts/deploy-web.sh
#!/bin/bash
set -e

echo "🌐 Iniciando deploy del panel web JoyasPOS..."
cd /var/www/joyaspos

# 1. Actualizar código
git pull origin main

# 2. Instalar dependencias nuevas
pnpm install --frozen-lockfile

# 3. Build de producción
pnpm --filter web build

# 4. Actualizar permisos
sudo chown -R nginx:nginx apps/web/dist

# Nginx sirve archivos estáticos — no requiere reload si solo cambia el dist/
echo "✅ Deploy del panel web completado"
echo "   URL: https://tudominio.com"
```

```bash
chmod +x /var/www/joyaspos/scripts/deploy-web.sh
```

---

## 7. Script de deploy completo (API + Web)

```bash
# /var/www/joyaspos/scripts/deploy-all.sh
#!/bin/bash
set -e

echo "🚀 Deploy completo — JoyasPOS"

# Deploy API primero (incluye migraciones)
/var/www/joyaspos/scripts/deploy-api.sh

echo ""

# Deploy Web
/var/www/joyaspos/scripts/deploy-web.sh

echo ""
echo "✅ Sistema desplegado completamente"
echo "   API:  https://api.tudominio.com/health"
echo "   Web:  https://tudominio.com"
```

---

## 8. Depuración de problemas comunes

### 404 en recarga directa (ej: /dashboard retorna 404)
**Causa:** falta el `try_files $uri $uri/ /index.html` en Nginx.
**Solución:** verificar la config de Nginx y recargar.

### El panel muestra "Error de conexión" al hacer login
**Causa:** `VITE_API_URL` apunta a `localhost` o a la URL incorrecta.
**Solución:** verificar el contenido de `.env.production` y rebuild.

```bash
grep VITE_API_URL apps/web/.env.production
# Debe mostrar: VITE_API_URL=https://api.tudominio.com

# Si lo corriges, rebuild:
pnpm --filter web build
```

### CORS error en el navegador
**Causa:** `CORS_ORIGINS` en la API no incluye el dominio del panel web.
**Solución:** actualizar `.env` de la API y reiniciar PM2.

```bash
# Editar CORS en la API
nano /var/www/joyaspos/apps/api/.env
# Asegurarse: CORS_ORIGINS="https://tudominio.com,https://www.tudominio.com"

pm2 reload joyaspos-api
```

---

## 9. Checklist de deploy del panel web

- [ ] `VITE_API_URL` en `.env.production` apunta a `https://api.tudominio.com`
- [ ] `pnpm --filter web build` completó sin errores de TypeScript
- [ ] `apps/web/dist/index.html` existe tras el build
- [ ] Nginx config tiene el `try_files $uri $uri/ /index.html` para el SPA fallback
- [ ] Los assets tienen cache de 1 año (`Cache-Control: public, immutable`)
- [ ] SSL instalado y el panel carga en HTTPS
- [ ] Probar recargar directamente en `/dashboard` — debe mostrar el dashboard, no 404
- [ ] Probar el login con el usuario admin seed
- [ ] Verificar que las llamadas a la API funcionan desde el panel (Network tab del browser)

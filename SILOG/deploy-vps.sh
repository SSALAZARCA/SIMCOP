#!/bin/bash
# ============================================================================
# SCRIPT AUTOMATIZADO DE DESPLIEGUE EN VPS - SILOGA (https://siloga.site)
# Compatible con Ubuntu 20.04 / 22.04 / 24.04 LTS y Debian 11 / 12
# ============================================================================

set -e

echo "=================================================================="
echo "  INICIANDO DESPLIEGUE DE PRODUCCIÓN - SILOGA (https://siloga.site)"
echo "=================================================================="

# 1. Comprobar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no encontrado. Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✓ Node.js versión: $(node -v)"
echo "✓ NPM versión: $(npm -v)"

# 2. Instalar dependencias y compilar frontend de producción
echo "📦 Instalando dependencias de SILOGA..."
npm install --legacy-peer-deps

echo "⚙️ Compilando SPA para producción con Vite..."
npm run build

# 3. Crear directorios persistentes
mkdir -p backend/data
chmod -R 755 backend/data

# 4. Modo de Despliegue: Docker o PM2
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "🐳 Docker detectado. Desplegando contenedor de producción..."
    docker-compose up -d --build
    echo "✓ Contenedor siloga_production iniciado en el puerto 5000."
else
    echo "🚀 Iniciando con PM2 en background..."
    if ! command -v pm2 &> /dev/null; then
        echo "Instalando PM2 globalmente..."
        sudo npm install -g pm2
    fi
    pm2 delete siloga-server || true
    pm2 start ecosystem.config.cjs
    pm2 save
    echo "✓ Servicio SILOGA iniciado con PM2."
fi

# 5. Instrucciones de NGINX y SSL Let's Encrypt
echo ""
echo "=================================================================="
echo "  ✅ DESPLIEGUE COMPLETADO SATISFACTORIAMENTE"
echo "=================================================================="
echo "  1. Backend escuchando en: http://127.0.0.1:5000"
echo "  2. Dominio configurado: https://siloga.site"
echo ""
echo "  Para habilitar NGINX y Certificado SSL Let's Encrypt:"
echo "    sudo cp nginx.conf /etc/nginx/sites-available/siloga.site"
echo "    sudo ln -s /etc/nginx/sites-available/siloga.site /etc/nginx/sites-enabled/"
echo "    sudo nginx -t && sudo systemctl reload nginx"
echo "    sudo certbot --nginx -d siloga.site -d www.siloga.site"
echo "=================================================================="

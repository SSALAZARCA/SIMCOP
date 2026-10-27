# ============================================================================
# SILOGA FRONTEND - PRODUCCIÓN MONOREPO SIMCOP (https://siloga.site)
# Nginx Servidor Web de Alto Rendimiento y Seguridad OWASP
# ============================================================================

# --- ETAPA 1: Compilación de Frontend Vite ---
FROM node:20-alpine AS build

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copiar fuentes y compilar SPA
COPY . .
RUN npm run build

# --- ETAPA 2: Servidor Nginx Producción ---
FROM nginx:stable-alpine

# Copiar bundle compilado al directorio web
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuración Nginx optimizada para Coolify / Traefik
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

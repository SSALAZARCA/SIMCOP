# ============================================================================
# DOCKERFILE PRODUCCIÓN - SILOGA (https://siloga.site)
# Multi-stage build de alta seguridad y mínimo footprint
# ============================================================================

# --- ETAPA 1: Compilación de Frontend Vite ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiesto de dependencias
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copiar código fuente
COPY . .

# Compilar SPA de producción
RUN npm run build

# --- ETAPA 2: Runtime de Producción Node.js ---
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Crear usuario sin privilegios para seguridad (OWASP)
RUN addgroup -S siloggroup && adduser -S siloguser -G siloggroup

# Copiar archivos compilados y backend
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/backend ./backend

# Crear y otorgar permisos sobre directorio de datos persistente
RUN mkdir -p ./backend/data && chown -R siloguser:siloggroup /app

USER siloguser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "backend/server.js"]

# Multi-stage build for Visibility Host
# Produces both shared and standalone builds in a single image

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY tsconfig.base.json ./

# Copy workspace files - ONLY what's needed for visibility
COPY apps/visibility ./apps/visibility
COPY packages ./packages

# Install dependencies
RUN npm ci --legacy-peer-deps

# Build both modes directly with Vite (bypass Nx to avoid plugin issues)
# Shared mode (React externalized) - Default for production
RUN cd apps/visibility && BUILD_MODE=shared npx vite build

# Standalone mode (React bundled) - Fallback
RUN cd apps/visibility && BUILD_MODE=standalone npx vite build

# Stage 2: Production with Nginx
FROM nginx:alpine

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/default.conf

# Copy custom nginx config
COPY apps/visibility/nginx.conf /etc/nginx/conf.d/visibility.conf

# Copy both build outputs
# Shared build (default)
COPY --from=builder /app/dist/apps/visibility /usr/share/nginx/html

# Standalone build (fallback path)
COPY --from=builder /app/dist/apps/visibility-standalone /usr/share/nginx/html/standalone

# Add health check page
RUN echo '<!DOCTYPE html><html><head><title>Visibility Host</title></head><body><h1>Visibility Host - Ready</h1><p>Version: 2.0</p><ul><li><a href="/visibility.mjs">Shared Build</a> (~6KB)</li><li><a href="/standalone/visibility.mjs">Standalone Build</a> (~318KB)</li></ul></body></html>' > /usr/share/nginx/html/index.html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

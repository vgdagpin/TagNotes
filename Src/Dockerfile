## syntax=docker/dockerfile:1.7

# Multi-stage: build with Node, serve with nginx (no Node in final image)

# ---------- Build Stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# Skip optional native rollup binary & make non-interactive
ENV ROLLUP_SKIP_NODEJS_NATIVE=1 CI=true

# Copy manifest (lock file intentionally omitted as in original setup)
COPY Src/package.json ./package.json
RUN --mount=type=cache,id=npm-cache,target=/root/.npm npm install --no-audit --no-fund

# Copy sources (only Src/ contents)
COPY Src/. .

# Build Vite project (outputs to dist/)
RUN npm run build

# ---------- Runtime Stage ----------
FROM nginx:1.27-alpine AS runtime

# Copy custom nginx config (includes SPA fallback + caching)
COPY Src/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static assets
COPY --from=build /app/dist /usr/share/nginx/html

# (Optional) Drop build metadata / ensure correct permissions
RUN chmod -R 755 /usr/share/nginx/html

EXPOSE 3000

# Default CMD provided by nginx base image ("nginx -g 'daemon off;'")
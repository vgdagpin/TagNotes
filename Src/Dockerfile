## syntax=docker/dockerfile:1.7

# ---------- Build Stage ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install dependencies (dev + prod). Copy only package.json to allow fresh resolution (lock may be out of sync)
COPY ['Src/package.json', '.']
RUN --mount=type=cache,id=npm-cache,target=/root/.npm npm install

# Copy source
COPY . .

# Build (produces dist/spa)
RUN npm run build

# Prune dev dependencies for slimmer runtime
RUN npm prune --production

# ---------- Runtime Stage ----------
FROM node:20-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Copy only what we need
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/serve-static.js ./serve-static.js

EXPOSE 3000

CMD ["node", "serve-static.js"]
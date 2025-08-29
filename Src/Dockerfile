## syntax=docker/dockerfile:1.7

# ---------- Build Stage ----------
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Environment tweaks: skip native rollup optional binary (use JS fallback) & make installs deterministic-ish
ENV ROLLUP_SKIP_NODEJS_NATIVE=1 \
	CI=true

# Copy manifest (Docker build context root is repo root; files live under Src/)
COPY Src/package.json ./package.json
# (Omit package-lock.json to allow fresh resolution; avoids stale optional native rollup mismatch)
RUN --mount=type=cache,id=npm-cache,target=/root/.npm npm install --no-audit --no-fund

# Copy the rest of the source inside Src directory only (avoid bringing in Terraform, etc.)
COPY Src/. .

# Build (produces dist/spa) ensuring env var present in same RUN invocation to force JS fallback
RUN ROLLUP_SKIP_NODEJS_NATIVE=1 npm run build

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
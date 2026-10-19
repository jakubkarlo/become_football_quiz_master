# ── Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# `prebuild` fetches stadium data from Wikidata when generated/stadiums/ is absent (it is not in git),
# so the build needs outbound HTTPS. Kits are NOT part of the image — nginx serves them from a volume.
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/dist /usr/share/nginx/html
# Mount point for the kits volume (see docker-compose.yml)
RUN mkdir -p /srv/kits
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

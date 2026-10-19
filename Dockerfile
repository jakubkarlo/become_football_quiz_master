# ── Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# Only the app is built here. Kits and stadium data are NOT part of the image — nginx serves them
# from volumes (see docker-compose.yml), so the build needs no network access beyond npm.
RUN npm run build

# ── Runtime ──────────────────────────────────────────────────────────
FROM nginx:1.27-alpine
# htpasswd for the basic auth credentials generated at startup (nginx/basic-auth.sh)
RUN apk add --no-cache apache2-utils
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY nginx/basic-auth.sh /docker-entrypoint.d/05-basic-auth.sh
RUN chmod 755 /docker-entrypoint.d/05-basic-auth.sh
COPY --from=build /app/dist /usr/share/nginx/html
# Mount points for the data volumes (see docker-compose.yml)
RUN mkdir -p /srv/kits /srv/stadium-data
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1

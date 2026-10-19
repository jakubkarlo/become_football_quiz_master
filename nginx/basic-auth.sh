#!/bin/sh
# Generates the htpasswd file for nginx basic auth from BASIC_AUTH_USER / BASIC_AUTH_PASSWORD.
# Run by the nginx image entrypoint (/docker-entrypoint.d/) before nginx starts. Fails closed:
# without credentials the container does not start, so the site is never served unprotected.
set -eu

HTPASSWD_FILE=/etc/nginx/.htpasswd

if [ -z "${BASIC_AUTH_USER:-}" ] || [ -z "${BASIC_AUTH_PASSWORD:-}" ]; then
    echo "basic-auth: BASIC_AUTH_USER and BASIC_AUTH_PASSWORD must be set" >&2
    exit 1
fi

case "$BASIC_AUTH_USER" in
    *:*) echo "basic-auth: BASIC_AUTH_USER must not contain ':'" >&2; exit 1 ;;
esac

# Password goes through stdin, never the command line (visible in ps). bcrypt with htpasswd's
# default cost: nginx verifies it on every request, so a high cost would slow down image loading.
printf '%s' "$BASIC_AUTH_PASSWORD" | htpasswd -ciB "$HTPASSWD_FILE" "$BASIC_AUTH_USER" 2>/dev/null
chown root:nginx "$HTPASSWD_FILE"
chmod 640 "$HTPASSWD_FILE"

echo "basic-auth: credentials configured for user '$BASIC_AUTH_USER'"

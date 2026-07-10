#!/bin/sh
set -eu

printf "Admin e-mail: "
read -r ADMIN_EMAIL
printf "Admin meno: "
read -r ADMIN_NAME
printf "Admin heslo (min. 12 znakov): "
stty -echo
read -r ADMIN_PASSWORD
stty echo
printf "\n"

export ADMIN_EMAIL ADMIN_NAME ADMIN_PASSWORD
PATH="/Users/macbook/.local/node/bin:$PATH" npx @railway/cli@latest run --service web --no-local npx tsx scripts/create-admin.ts
unset ADMIN_PASSWORD

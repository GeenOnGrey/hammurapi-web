#!/bin/sh
# Выполняется образом nginx до подстановки шаблонов (/docker-entrypoint.d).
#   - пишет /config.json из API_BASE_URL: один образ web подходит для любых доменов;
#   - выбирает конфигурацию: с API_UPSTREAM — nginx проксирует /api (docker compose),
#     без него — только статика (API на отдельном домене, HMR.INFRA-0002).
set -eu

html=/usr/share/nginx/html
api=${API_BASE_URL:-}
case $api in
  "" | http://* | https://*) ;;
  *) echo "05-hammurapi-config: API_BASE_URL должен начинаться с http:// или https://" >&2; exit 1 ;;
esac
# Экранирование для JSON: адрес не содержит кавычек и обратных слешей.
case $api in *'"'* | *'\'*) echo "05-hammurapi-config: недопустимый API_BASE_URL" >&2; exit 1 ;; esac
printf '{ "apiBaseUrl": "%s" }\n' "${api%/}" >"$html/config.json"

if [ -n "${API_UPSTREAM:-}" ]; then
  cp /etc/nginx/hammurapi/proxy.conf.template /etc/nginx/templates/default.conf.template
  echo "05-hammurapi-config: прокси /api → $API_UPSTREAM"
else
  cp /etc/nginx/hammurapi/static.conf.template /etc/nginx/templates/default.conf.template
  echo "05-hammurapi-config: только статика, API: ${api:-тот же origin}"
fi

#!/bin/sh
fileConfig="/usr/local/apache2/htdocs/assets/appconfig.production.json"
fileIndex="/usr/local/apache2/htdocs/index.html"

# ── appconfig.production.json replacements ──────────────────────────
if [ -n "${ApiUrl}" ]; then
    echo "[start.sh] Replacing {{connectapi}} with ${ApiUrl}"
    sed -i "s|{{connectapi}}|${ApiUrl}|g" "$fileConfig"
fi

if [ -n "${UiUrl}" ]; then
    echo "[start.sh] Replacing {{ui}} with ${UiUrl}"
    sed -i "s|{{ui}}|${UiUrl}|g" "$fileConfig"
fi

if [ -n "${ApplicationName}" ]; then
    echo "[start.sh] Replacing {{applicationName}} with ${ApplicationName}"
    sed -i "s|{{applicationName}}|${ApplicationName}|g" "$fileConfig"
    sed -i "s|{{applicationName}}|${ApplicationName}|g" "$fileIndex"
fi

# ── index.html meta replacements ────────────────────────────────────
if [ -n "${MetaEnvironmentName}" ]; then
    echo "[start.sh] Replacing {{MetaEnvironmentName}} with ${MetaEnvironmentName}"
    sed -i "s|{{MetaEnvironmentName}}|${MetaEnvironmentName}|g" "$fileIndex"
fi

if [ -n "${MetaEnvironmentDescription}" ]; then
    echo "[start.sh] Replacing {{MetaEnvironmentDescription}} with ${MetaEnvironmentDescription}"
    sed -i "s|{{MetaEnvironmentDescription}}|${MetaEnvironmentDescription}|g" "$fileIndex"
fi

# ── Apache rewrite config for Angular routing ───────────────────────
echo "[start.sh] Enabling mod_rewrite for Angular routing"
httpdConf="/usr/local/apache2/conf/httpd.conf"
sed -i 's|#LoadModule rewrite_module modules/mod_rewrite.so|LoadModule rewrite_module modules/mod_rewrite.so|g' "$httpdConf"
sed -i ':a;N;$!ba;s/AllowOverride None/AllowOverride All/1' "$httpdConf"

echo "[start.sh] Startup complete"

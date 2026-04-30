#!/usr/bin/env node
/**
 * Genera .htaccess (Apache) coherente con scripts/url-map.json.
 * Uso: node scripts/generate-htaccess.cjs > .htaccess
 */
const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'url-map.json');
const { fileToPath: m } = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const lines = [];
lines.push('# Generado con: node scripts/generate-htaccess.cjs');
lines.push('# Requiere: AllowOverride FileInfo (o All) y mod_rewrite');
lines.push('RewriteEngine On');
lines.push('RewriteBase /');
lines.push('');

lines.push('# --- 301: index.html en raíz → / ---');
lines.push('RewriteCond %{THE_REQUEST} \\s/+index\\.html[\\s?] [NC]');
lines.push('RewriteRule ^index\\.html$ / [R=301,L]');
lines.push('');

lines.push('# --- 301: *.html legacy → URL limpia ---');
for (const [file, clean] of Object.entries(m)) {
  const fesc = escRe(file);
  lines.push(`RewriteCond %{THE_REQUEST} \\s/+${fesc}[\\s?] [NC]`);
  lines.push(`RewriteRule ^${fesc}$ ${clean} [R=301,L]`);
  lines.push('');
}

lines.push('# --- Reescritura interna: ruta limpia → fichero ---');
// Orden: rutas más profundas primero (más segmentos)
const entries = Object.entries(m).sort((a, b) => {
  const segs = (p) => p.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean).length;
  return segs(b[1]) - segs(a[1]);
});

for (const [file, clean] of entries) {
  const c = clean.replace(/^\/+|\/+$/g, '');
  if (c === '') {
    lines.push('RewriteRule ^$ razolparquet-v2.html [L]');
    continue;
  }
  const pattern = escRe(c).replace(/\\\//g, '/');
  lines.push(`RewriteRule ^${pattern}/?$ ${file} [L]`);
}

lines.push('');
lines.push('# --- Alias adicionales (mismos HTML que en server.cjs) ---');
lines.push('RewriteRule ^inicio/?$ razolparquet-v2.html [L]');
lines.push('RewriteRule ^proceso/?$ razolparquet-proceso.html [L]');
lines.push('RewriteRule ^tu-proyecto/?$ razolparquet-contacto.html [L]');
lines.push('');
lines.push('# Si el host sirve solo estáticos sin Node, las reglas anteriores bastan.');

process.stdout.write(lines.join('\n') + '\n');

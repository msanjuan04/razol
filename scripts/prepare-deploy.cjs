/**
 * Prepara deploy/ para subir al servidor (Digital Ocean VPS u hosting estático).
 *
 * Uso:
 *   npm run build           → paquete completo para VPS (Node.js)
 *   npm run build -- --static → solo HTML/assets, sin Node (hosting FTP puro)
 *
 * Instrucciones VPS (Digital Ocean):
 *   1. Sube TODO el contenido de deploy/ a tu servidor vía FileZilla
 *   2. Crea el archivo .env en el servidor con tus claves (ver .env local)
 *   3. En el servidor: npm install --omit=dev
 *   4. En el servidor: npm start   (o: pm2 start server.cjs --name razol)
 */

const fs   = require('fs');
const path = require('path');

const ROOT      = path.join(__dirname, '..');
const OUT       = path.join(ROOT, 'deploy');
const IS_STATIC = process.argv.includes('--static');

// ─── Helpers ───────────────────────────────────────────────────────────────

function rmrf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return 0;
  fs.mkdirSync(dest, { recursive: true });
  let count = 0;
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) count += copyDir(s, d);
    else { fs.copyFileSync(s, d); count++; }
  }
  return count;
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  rmrf(OUT);
  fs.mkdirSync(OUT, { recursive: true });

  // ── 1. Archivos HTML ────────────────────────────────────────────────────
  const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
  for (const f of htmlFiles) copyFile(path.join(ROOT, f), path.join(OUT, f));

  // ── 2. SEO y assets ─────────────────────────────────────────────────────
  copyFile(path.join(ROOT, 'robots.txt'),  path.join(OUT, 'robots.txt'));
  copyFile(path.join(ROOT, 'sitemap.xml'), path.join(OUT, 'sitemap.xml'));
  copyFile(path.join(ROOT, 'llms.txt'),    path.join(OUT, 'llms.txt'));
  const assetCount = copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));

  // ── 3. JS del cliente ────────────────────────────────────────────────────
  copyFile(path.join(ROOT, 'cookie-banner.js'),  path.join(OUT, 'cookie-banner.js'));
  copyFile(path.join(ROOT, 'mobile-menu.js'),    path.join(OUT, 'mobile-menu.js'));
  copyFile(path.join(ROOT, 'translations.js'),   path.join(OUT, 'translations.js'));
  copyFile(path.join(ROOT, 'i18n.js'),           path.join(OUT, 'i18n.js'));

  if (!IS_STATIC) {
    // ── 4. Archivos del servidor Node ──────────────────────────────────────
    copyFile(path.join(ROOT, 'server.cjs'),        path.join(OUT, 'server.cjs'));
    copyFile(path.join(ROOT, 'package.json'),       path.join(OUT, 'package.json'));
    copyFile(path.join(ROOT, 'package-lock.json'),  path.join(OUT, 'package-lock.json'));

    // ── 5. Scripts de routing ─────────────────────────────────────────────
    copyFile(path.join(ROOT, 'scripts', 'url-map.json'), path.join(OUT, 'scripts', 'url-map.json'));

    // ── 6. .env.example (sin valores reales) ──────────────────────────────
    const envExample = [
      '# Copia este archivo como .env en el servidor y rellena los valores',
      'SUPABASE_URL=',
      'SUPABASE_SERVICE_ROLE_KEY=',
      'RESEND_API_KEY=',
      'ADMIN_EMAIL=',
      'RESEND_FROM_EMAIL=noreply@razolparquet.com',
    ].join('\n') + '\n';
    fs.writeFileSync(path.join(OUT, '.env.example'), envExample, 'utf8');
  }

  // ─── Resumen ─────────────────────────────────────────────────────────────
  console.log('');
  if (IS_STATIC) {
    console.log('  ✓ deploy/ listo para hosting estático (FTP)');
  } else {
    console.log('  ✓ deploy/ listo para Digital Ocean VPS');
  }
  console.log(`  · ${htmlFiles.length} archivos HTML`);
  console.log(`  · assets/ (${assetCount} archivos)`);
  console.log('  · robots.txt, sitemap.xml, llms.txt');
  console.log('  · cookie-banner.js, mobile-menu.js, translations.js, i18n.js');

  if (!IS_STATIC) {
    console.log('  · server.cjs, package.json, package-lock.json');
    console.log('  · scripts/url-map.json');
    console.log('  · .env.example');
    console.log('');
    console.log('  ──────────────────────────────────────────────');
    console.log('  Pasos en el servidor (Digital Ocean):');
    console.log('');
    console.log('  1. Sube TODO el contenido de deploy/ por FileZilla');
    console.log('     a la carpeta raíz de tu app (ej: /var/www/razol/)');
    console.log('');
    console.log('  2. Crea el archivo .env en el servidor:');
    console.log('     Copia tu .env local → sube solo ese archivo por FileZilla');
    console.log('     (nunca lo incluimos en deploy/ por seguridad)');
    console.log('');
    console.log('  3. En el servidor (SSH):');
    console.log('     cd /var/www/razol');
    console.log('     npm install --omit=dev');
    console.log('     npm start');
    console.log('');
    console.log('  4. Para que no se pare al cerrar SSH, usa PM2:');
    console.log('     npm install -g pm2');
    console.log('     pm2 start server.cjs --name razol');
    console.log('     pm2 save && pm2 startup');
    console.log('  ──────────────────────────────────────────────');
  }

  console.log('');
}

main();

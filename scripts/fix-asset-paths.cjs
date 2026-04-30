#!/usr/bin/env node
/**
 * Convierte rutas relativas assets/... en absolutas /assets/... para que
 * funcionen con URLs limpias anidadas (/proyectos/foo, /blog/bar).
 * Uso: node scripts/fix-asset-paths.cjs
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

function processFile(filePath) {
  let s = fs.readFileSync(filePath, 'utf8');
  const orig = s;
  const reps = [
    [/href="assets\//g, 'href="/assets/'],
    [/href='assets\//g, "href='/assets/"],
    [/src="assets\//g, 'src="/assets/'],
    [/src='assets\//g, "src='/assets/"],
    [/url\('assets\//g, "url('/assets/"],
    [/url\("assets\//g, 'url("/assets/'],
    [/content="assets\//g, 'content="/assets/'],
  ];
  for (const [re, repl] of reps) s = s.replace(re, repl);
  if (s !== orig) fs.writeFileSync(filePath, s);
  return s !== orig;
}

function walk(dir) {
  let n = 0;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith('.')) continue;
    if (ent.name === 'node_modules') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) n += walk(full);
    else if (ent.name.endsWith('.html') && processFile(full)) n++;
  }
  return n;
}

const count = walk(ROOT);
console.log(`Actualizados ${count} ficheros HTML.`);

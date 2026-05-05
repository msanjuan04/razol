require('dotenv').config();
const http = require('http');
const fs   = require('fs');
const path = require('path');

const supabaseUrl      = process.env.SUPABASE_URL;
const supabaseKey      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey     = process.env.RESEND_API_KEY;
const adminEmail       = process.env.ADMIN_EMAIL;
const resendFromEmail  = process.env.RESEND_FROM_EMAIL || 'noreply@razolparquet.com';

const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '127.0.0.1';

/** Quita barra final y unifica path para lookup de rutas limpias. */
function normalizeUrlPath(p) {
  const q = (p || '/').split('?')[0];
  if (q.length > 1 && q.endsWith('/')) return q.slice(0, -1);
  return q || '/';
}

/** Rutas limpias y redirecciones 301 desde *.html (scripts/url-map.json). */
function resolveUrlMapPath() {
  const candidates = [
    path.join(__dirname, 'scripts', 'url-map.json'),
    path.join(__dirname, '..', 'scripts', 'url-map.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}
let FILE_TO_PATH = {};
try {
  const urlMapPath = resolveUrlMapPath();
  if (urlMapPath) {
    FILE_TO_PATH = JSON.parse(fs.readFileSync(urlMapPath, 'utf8')).fileToPath;
  } else {
    console.warn('No se encontró url-map.json (scripts/url-map.json).');
  }
} catch (e) {
  console.warn('No se pudo leer url-map.json:', e.message);
}

const CLEAN_ROUTES = {};
const LEGACY_HTML_REDIRECT = {};
for (const [file, clean] of Object.entries(FILE_TO_PATH)) {
  CLEAN_ROUTES[clean] = '/' + file.replace(/^\//, '');
  LEGACY_HTML_REDIRECT['/' + file] = clean;
}
// Alias adicionales (mismo fichero)
CLEAN_ROUTES['/'] = '/razolparquet-v2.html';
CLEAN_ROUTES['/inicio'] = '/razolparquet-v2.html';
CLEAN_ROUTES['/index.html'] = '/razolparquet-v2.html';
CLEAN_ROUTES['/proceso'] = '/razolparquet-proceso.html';
CLEAN_ROUTES['/tu-proyecto'] = '/razolparquet-contacto.html';
LEGACY_HTML_REDIRECT['/index.html'] = '/';

// Colores marca Razol Parquet
const BRAND = {
  dark:      '#19150F',
  darkCard:  '#211D16',
  darkBorder:'rgba(200,169,110,0.15)',
  gold:      '#C8A96E',
  goldLight: '#D4BA85',
  cream:     '#F5F0E8',
  warmGray:  '#8C7B6B',
};

// ============================================
// EMBUDO INTELIGENTE — Puntuaciones
// ============================================

const SCORES = {
  servicio: {
    'Instalación de parquet nuevo':               3,
    'Lijado y restauración de parquet existente': 3,
    'Tarima exterior / terraza':                  3,
    'Barnizado o cambio de acabado':              2,
    'Reparación de zona dañada':                  1,
    'No sé todavía — necesito asesoramiento':     1,
  },
  metros: {
    'Más de 200m²': 4,
    '100–200m²':    3,
    '50–100m²':     2,
    'Menos de 50m²':1,
    'No lo sé':     1,
  },
  plazo: {
    'Lo antes posible':             4,
    'En 1-2 meses':                 3,
    'En 3-6 meses':                 2,
    'Solo quiero valorar opciones': 1,
  },
  perfil: {
    'Interiorista':             2,
    'Arquitecto / Constructor': 2,
    'Particular':               0,
  },
};

function calcularEmbudo(data) {
  const puntosServicio = SCORES.servicio[data.servicio]    ?? 1;
  const puntosMetros   = SCORES.metros[data.metros]        ?? 1;
  const puntosPlayzo   = SCORES.plazo[data.plazo]          ?? 1;
  const puntosEmail    = data.email ? 1 : 0;
  const puntosPerfil   = SCORES.perfil[data.tipo_perfil]   ?? 0;
  const total          = puntosServicio + puntosMetros + puntosPlayzo + puntosEmail + puntosPerfil;

  let calificacion, accion, emoji, badgeColor;

  if (total >= 10) {
    calificacion = 'CALIENTE';
    accion       = 'Llamar en las próximas 2 horas';
    emoji        = '🔥';
    badgeColor   = '#C0392B';
  } else if (total >= 7) {
    calificacion = 'TEMPLADO';
    accion       = 'Llamar en el día';
    emoji        = '🌤️';
    badgeColor   = '#C0700A';
  } else {
    calificacion = 'FRIO';
    accion       = 'Email de seguimiento — llamar esta semana';
    emoji        = '❄️';
    badgeColor   = '#1D5FA8';
  }

  return { puntosServicio, puntosMetros, puntosPlayzo, puntosEmail, puntosPerfil, total, calificacion, accion, emoji, badgeColor };
}

// ============================================
// EMAIL ADMIN — con scoring, estética marca
// ============================================

function buildAdminEmail(data, score) {
  const fecha = new Date().toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const fila = (label, value) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.darkBorder};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.gold};width:38%;vertical-align:top;">${label}</td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BRAND.darkBorder};font-size:14px;color:${BRAND.cream};font-weight:300;">${value || '—'}</td>
    </tr>`;

  const filaScore = (label, value) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid ${BRAND.darkBorder};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.warmGray};width:60%;">${label}</td>
      <td style="padding:8px 0 8px 16px;border-bottom:1px solid ${BRAND.darkBorder};font-size:13px;color:${BRAND.gold};text-align:right;">${value}</td>
    </tr>`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111009;font-family:'Georgia',serif;">
<div style="max-width:580px;margin:32px auto;border:1px solid ${BRAND.darkBorder};border-radius:2px;overflow:hidden;">

  <!-- CABECERA MARCA -->
  <div style="background:${BRAND.dark};padding:28px 36px;border-bottom:1px solid ${BRAND.darkBorder};">
    <p style="margin:0;font-size:10px;letter-spacing:.4em;text-transform:uppercase;color:${BRAND.gold};font-family:'Arial',sans-serif;">RAZOL<span style="color:${BRAND.cream};">PARQUET</span></p>
    <p style="margin:6px 0 0;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.warmGray};font-family:'Arial',sans-serif;">Nueva solicitud recibida · ${fecha}</p>
  </div>

  <!-- BADGE CLASIFICACIÓN -->
  <div style="background:${score.badgeColor};padding:20px 36px;display:block;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <p style="margin:0;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,0.7);font-family:'Arial',sans-serif;">Lead calificado</p>
        <p style="margin:4px 0 0;font-size:22px;font-weight:700;color:#fff;letter-spacing:.05em;font-family:'Arial',sans-serif;">${score.emoji} ${score.calificacion}</p>
      </td>
      <td style="text-align:right;vertical-align:middle;">
        <p style="margin:0;font-size:28px;font-weight:700;color:#fff;font-family:'Arial',sans-serif;">${score.total}<span style="font-size:14px;font-weight:400;opacity:.7;">/14</span></p>
        <p style="margin:2px 0 0;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,0.7);font-family:'Arial',sans-serif;">puntos</p>
      </td>
    </tr></table>
  </div>

  <!-- ACCIÓN RECOMENDADA -->
  <div style="background:${BRAND.darkCard};padding:14px 36px;border-bottom:1px solid ${BRAND.darkBorder};">
    <p style="margin:0;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:${BRAND.gold};font-family:'Arial',sans-serif;">▶ ${score.accion}</p>
  </div>

  <!-- DATOS DE CONTACTO -->
  <div style="background:${BRAND.dark};padding:28px 36px 0;">
    <p style="margin:0 0 16px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:${BRAND.gold};font-family:'Arial',sans-serif;">Datos de contacto</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Origen',    data.fuente || 'Formulario Tu Proyecto')}
      ${fila('Nombre',   data.nombre)}
      ${fila('Teléfono', data.telefono)}
      ${fila('Email',    data.email || 'No proporcionado')}
      ${data.tipo_perfil ? fila('Perfil', data.tipo_perfil) : ''}
      ${fila('Zona',     data.zona)}
    </table>
  </div>

  <!-- DETALLES DEL PROYECTO -->
  <div style="background:${BRAND.dark};padding:24px 36px 0;">
    <p style="margin:0 0 16px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:${BRAND.gold};font-family:'Arial',sans-serif;">Detalles del proyecto</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Servicio',    data.servicio)}
      ${fila('Metros',      data.metros)}
      ${data.plazo       ? fila('Plazo',       data.plazo)       : ''}
      ${data.presupuesto ? fila('Presupuesto', data.presupuesto) : ''}
      ${fila('Mensaje',     data.mensaje)}
    </table>
  </div>

  <!-- SCORING -->
  <div style="background:${BRAND.darkCard};margin:24px 36px;padding:20px 24px;border:1px solid ${BRAND.darkBorder};border-radius:2px;">
    <p style="margin:0 0 14px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:${BRAND.warmGray};font-family:'Arial',sans-serif;">Desglose del scoring</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${filaScore('Tipo de servicio', `${score.puntosServicio} / 3 pts`)}
      ${filaScore('Metros cuadrados', `${score.puntosMetros} / 4 pts`)}
      ${filaScore('Plazo',            `${score.puntosPlayzo} / 4 pts`)}
      ${filaScore('Email aportado',   `${score.puntosEmail} / 1 pt`)}
      ${filaScore('Perfil profesional', `${score.puntosPerfil} / 2 pts`)}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
      <tr>
        <td style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.cream};font-family:'Arial',sans-serif;">Total</td>
        <td style="text-align:right;font-size:18px;color:${BRAND.gold};font-family:'Arial',sans-serif;"><strong>${score.total} / 14</strong></td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div style="background:${BRAND.dark};padding:16px 36px;border-top:1px solid ${BRAND.darkBorder};text-align:center;">
    <p style="margin:0;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${BRAND.warmGray};font-family:'Arial',sans-serif;">Razol Parquet · Barcelona · razolparquet.com</p>
  </div>

</div>
</body>
</html>`;
}

// ============================================
// EMAIL CLIENTE — confirmación sin scoring
// ============================================

function buildClientEmail(data) {
  const fila = (label, value) => value ? `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BRAND.darkBorder};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.gold};width:40%;vertical-align:top;font-family:'Arial',sans-serif;">${label}</td>
      <td style="padding:10px 0 10px 16px;border-bottom:1px solid ${BRAND.darkBorder};font-size:14px;color:${BRAND.cream};font-weight:300;font-family:'Arial',sans-serif;">${value}</td>
    </tr>` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#111009;font-family:'Georgia',serif;">
<div style="max-width:580px;margin:32px auto;border:1px solid ${BRAND.darkBorder};border-radius:2px;overflow:hidden;">

  <!-- CABECERA MARCA -->
  <div style="background:${BRAND.dark};padding:32px 36px;text-align:center;border-bottom:1px solid ${BRAND.darkBorder};">
    <p style="margin:0;font-size:13px;letter-spacing:.5em;text-transform:uppercase;font-family:'Arial',sans-serif;">
      <span style="color:${BRAND.gold};">RAZOL</span><span style="color:${BRAND.cream};">PARQUET</span>
    </p>
    <div style="width:32px;height:1px;background:${BRAND.gold};margin:16px auto;"></div>
    <p style="margin:0;font-size:10px;letter-spacing:.25em;text-transform:uppercase;color:${BRAND.warmGray};font-family:'Arial',sans-serif;">Especialistas en suelos de madera · Barcelona</p>
  </div>

  <!-- MENSAJE PRINCIPAL -->
  <div style="background:${BRAND.dark};padding:36px 36px 28px;text-align:center;">
    <p style="margin:0 0 10px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:${BRAND.gold};font-family:'Arial',sans-serif;">Solicitud recibida</p>
    <h1 style="margin:0 0 16px;font-size:28px;font-weight:300;color:${BRAND.cream};font-family:'Georgia',serif;line-height:1.3;">Hola, <em style="font-style:italic;color:${BRAND.gold};">${data.nombre.split(' ')[0]}</em></h1>
    <p style="margin:0;font-size:15px;color:${BRAND.warmGray};font-weight:300;line-height:1.7;font-family:'Arial',sans-serif;">
      Hemos recibido tu solicitud y nos pondremos en contacto contigo a la mayor brevedad para preparar tu presupuesto personalizado.
    </p>
  </div>

  <!-- RESUMEN SOLICITUD -->
  <div style="background:${BRAND.darkCard};padding:28px 36px;border-top:1px solid ${BRAND.darkBorder};border-bottom:1px solid ${BRAND.darkBorder};">
    <p style="margin:0 0 16px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:${BRAND.gold};font-family:'Arial',sans-serif;">Tu solicitud</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${fila('Servicio', data.servicio)}
      ${fila('Metros',   data.metros)}
      ${fila('Zona',     data.zona)}
      ${fila('Plazo',    data.plazo)}
      ${fila('Mensaje',  data.mensaje)}
    </table>
  </div>

  <!-- QUÉ PASA AHORA -->
  <div style="background:${BRAND.dark};padding:28px 36px;">
    <p style="margin:0 0 16px;font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:${BRAND.gold};font-family:'Arial',sans-serif;">¿Qué pasa ahora?</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:top;padding-right:14px;">
          <p style="margin:0;width:24px;height:24px;background:${BRAND.darkCard};border:1px solid ${BRAND.darkBorder};color:${BRAND.gold};text-align:center;line-height:24px;font-size:11px;font-family:'Arial',sans-serif;">1</p>
        </td>
        <td style="vertical-align:top;padding-bottom:18px;">
          <p style="margin:0 0 3px;font-size:13px;color:${BRAND.cream};font-family:'Arial',sans-serif;">Revisamos tu solicitud</p>
          <p style="margin:0;font-size:12px;color:${BRAND.warmGray};font-family:'Arial',sans-serif;">Analizamos los detalles de tu proyecto en menos de 24 h.</p>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-right:14px;">
          <p style="margin:0;width:24px;height:24px;background:${BRAND.darkCard};border:1px solid ${BRAND.darkBorder};color:${BRAND.gold};text-align:center;line-height:24px;font-size:11px;font-family:'Arial',sans-serif;">2</p>
        </td>
        <td style="vertical-align:top;padding-bottom:18px;">
          <p style="margin:0 0 3px;font-size:13px;color:${BRAND.cream};font-family:'Arial',sans-serif;">Te llamamos para concretar</p>
          <p style="margin:0;font-size:12px;color:${BRAND.warmGray};font-family:'Arial',sans-serif;">Un especialista se pondrá en contacto contigo al ${data.telefono}.</p>
        </td>
      </tr>
      <tr>
        <td style="vertical-align:top;padding-right:14px;">
          <p style="margin:0;width:24px;height:24px;background:${BRAND.darkCard};border:1px solid ${BRAND.darkBorder};color:${BRAND.gold};text-align:center;line-height:24px;font-size:11px;font-family:'Arial',sans-serif;">3</p>
        </td>
        <td style="vertical-align:top;">
          <p style="margin:0 0 3px;font-size:13px;color:${BRAND.cream};font-family:'Arial',sans-serif;">Visita y presupuesto gratuito</p>
          <p style="margin:0;font-size:12px;color:${BRAND.warmGray};font-family:'Arial',sans-serif;">Agendamos la visita para evaluar el espacio sin compromiso.</p>
        </td>
      </tr>
    </table>
  </div>

  <!-- FOOTER -->
  <div style="background:${BRAND.dark};padding:20px 36px;border-top:1px solid ${BRAND.darkBorder};text-align:center;">
    <p style="margin:0 0 6px;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:${BRAND.warmGray};font-family:'Arial',sans-serif;">¿Tienes alguna duda?</p>
    <p style="margin:0 0 16px;font-size:13px;color:${BRAND.gold};font-family:'Arial',sans-serif;">info@razolparquet.com</p>
    <p style="margin:0;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.warmGray};opacity:.6;font-family:'Arial',sans-serif;">Razol Parquet · Barcelona · razolparquet.com</p>
  </div>

</div>
</body>
</html>`;
}

// ============================================
// SUPABASE — Guardar lead
// ============================================

async function guardarEnSupabase(data, score) {
  const res = await fetch(`${supabaseUrl}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      nombre:           data.nombre,
      telefono:         data.telefono,
      email:            data.email   || null,
      zona:             data.zona,
      mensaje:          data.mensaje || null,
      servicio:         data.servicio,
      metros:           data.metros,
      plazo:            data.plazo,
      tipo_perfil:      data.tipo_perfil || null,
      puntos_servicio:  score.puntosServicio,
      puntos_metros:    score.puntosMetros,
      puntos_plazo:     score.puntosPlayzo,
      puntos_email:     score.puntosEmail,
      puntos_perfil:    score.puntosPerfil,
      puntuacion_total: score.total,
      calificacion:     score.calificacion,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase error ${res.status}: ${err}`);
  }
}

// ============================================
// RESEND — Enviar emails
// ============================================

async function enviarEmails(data, score) {
  const emailsToSend = [
    // Email al admin con scoring completo
    {
      from:    `Razol Parquet <${resendFromEmail}>`,
      to:      [adminEmail],
      subject: `${score.emoji} Lead ${score.calificacion} — ${data.nombre} · ${score.total}/14 pts${data.fuente ? ' · ' + data.fuente : ''}`,
      html:    buildAdminEmail(data, score),
    },
  ];

  // Email de confirmación al cliente (solo si proporcionó email)
  if (data.email) {
    emailsToSend.push({
      from:    `Razol Parquet <${resendFromEmail}>`,
      to:      [data.email],
      subject: `Hemos recibido tu solicitud, ${data.nombre.split(' ')[0]}`,
      html:    buildClientEmail(data),
    });
  }

  await Promise.all(
    emailsToSend.map((payload) =>
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify(payload),
      }).then(async (res) => {
        if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
      })
    )
  );
}

// ============================================
// HTTP SERVER
// ============================================

const server = http.createServer(async (req, res) => {
  const urlPath = normalizeUrlPath((req.url || '').split('?')[0] || '/');
  const isGetOrHead = req.method === 'GET' || req.method === 'HEAD';

  // ── CORS preflight ───────────────────────
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }

  // ── POST /api/submit ─────────────────────
  if (req.method === 'POST' && urlPath === '/api/submit') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      try {
        const data  = JSON.parse(body);
        const score = calcularEmbudo(data);

        // LOG DE SEGURIDAD — siempre queda en consola (PM2 lo captura)
        console.log('─'.repeat(60));
        console.log(`  📋 LEAD ${score.emoji} ${score.calificacion} (${score.total}/14 pts)`);
        console.log(`     Nombre:     ${data.nombre}`);
        console.log(`     Teléfono:   ${data.telefono}`);
        console.log(`     Email:      ${data.email || '—'}`);
        console.log(`     Zona:       ${data.zona}`);
        console.log(`     Servicio:   ${data.servicio}`);
        console.log(`     Metros:     ${data.metros}`);
        console.log(`     Plazo:      ${data.plazo || '—'}`);
        console.log(`     Presupuesto:${data.presupuesto || '—'}`);
        console.log(`     Perfil:     ${data.tipo_perfil || '—'}`);
        console.log(`     Mensaje:    ${data.mensaje || '—'}`);
        console.log('─'.repeat(60));

        // 1. Guardar en Supabase — no bloqueante, logueamos si falla
        guardarEnSupabase(data, score)
          .then(() => console.log('  ✓ Supabase: lead guardado'))
          .catch((sbErr) => {
            const cause = sbErr.cause ? ` (${sbErr.cause.code || sbErr.cause.message})` : '';
            console.error(`  ⚠ Supabase no disponible${cause}:`, sbErr.message);
          });

        // 2. Enviar emails — no bloqueante
        enviarEmails(data, score)
          .then(() => console.log('  ✓ Emails enviados'))
          .catch((emailErr) => {
            const cause = emailErr.cause ? ` (${emailErr.cause.code || emailErr.cause.message})` : '';
            console.error(`  ⚠ Emails no enviados${cause}:`, emailErr.message);
          });

        // Siempre devolvemos 200 — el lead queda en los logs aunque fallen los servicios
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, calificacion: score.calificacion, puntuacion: score.total }));

      } catch (err) {
        // Solo llega aquí si el JSON del formulario es inválido
        console.error('  ✗ Error parseando formulario:', err.message);
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: 'Datos del formulario inválidos' }));
      }
    });
    return;
  }

  // ── 301: URLs antiguas *.html → rutas limpias ─────────
  if (isGetOrHead && LEGACY_HTML_REDIRECT[urlPath]) {
    const loc = LEGACY_HTML_REDIRECT[urlPath];
    res.writeHead(301, { Location: loc });
    res.end();
    return;
  }

  // ── URLs limpias → archivos HTML ─────────
  if (isGetOrHead && CLEAN_ROUTES[urlPath]) {
    const target = CLEAN_ROUTES[urlPath];
    const filePathClean = path.join(__dirname, target.replace(/^\//, ''));
    fs.readFile(filePathClean, (err, content) => {
      if (err) {
        res.writeHead(404); res.end('Not found'); return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(content);
    });
    return;
  }

  // ── Archivos estáticos ───────────────────
  if (!isGetOrHead) {
    res.writeHead(405, { Allow: 'GET, HEAD, POST, OPTIONS' });
    res.end();
    return;
  }

  const rawPath  = decodeURIComponent(urlPath.replace(/^\/+/, ''));
  const filePath = path.join(__dirname, rawPath);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Servir página 404 personalizada
      const page404 = path.join(__dirname, '404.html');
      fs.readFile(page404, (err2, html404) => {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        if (req.method === 'HEAD') {
          res.end();
          return;
        }
        res.end(err2 ? 'Página no encontrada' : html404);
      });
      return;
    }

    const ext   = path.extname(filePath).toLowerCase();
    const types = {
      '.html':  'text/html; charset=utf-8',
      '.css':   'text/css; charset=utf-8',
      '.js':    'text/javascript; charset=utf-8',
      '.png':   'image/png',
      '.jpg':   'image/jpeg',
      '.jpeg':  'image/jpeg',
      '.webp':  'image/webp',
      '.gif':   'image/gif',
      '.svg':   'image/svg+xml',
      '.ico':   'image/x-icon',
      '.woff':  'font/woff',
      '.woff2': 'font/woff2',
      '.ttf':   'font/ttf',
    };

    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain; charset=utf-8' });
    if (req.method === 'HEAD') {
      res.end();
      return;
    }
    res.end(content);
  });
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  Servidor listo.');
  console.log('  Abre en el navegador: http://127.0.0.1:' + PORT + '/');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Puerto ' + PORT + ' en uso. Cierra la otra app o cambia el puerto en server.cjs.');
  } else {
    console.error(err);
  }
  process.exit(1);
});

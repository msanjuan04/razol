(function () {
  if (localStorage.getItem('razol_cookies')) return;

  var style = document.createElement('style');
  style.textContent = [
    '#ck-banner{position:fixed;bottom:0;left:0;right:0;z-index:9000;background:#19150F;border-top:1px solid rgba(200,169,110,.3);padding:20px 40px;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;transform:translateY(100%);transition:transform .4s cubic-bezier(.4,0,.2,1);}',
    '#ck-banner.show{transform:translateY(0);}',
    '#ck-text{font-family:"DM Sans",sans-serif;font-size:13px;color:rgba(245,240,232,.7);line-height:1.6;max-width:640px;}',
    '#ck-text a{color:#C8A96E;text-decoration:underline;text-underline-offset:3px;}',
    '#ck-text a:hover{color:#D4BA85;}',
    '#ck-actions{display:flex;gap:10px;flex-shrink:0;}',
    '.ck-btn{font-family:"DM Sans",sans-serif;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:11px 22px;cursor:pointer;border:none;transition:all .2s;white-space:nowrap;}',
    '.ck-accept{background:#C8A96E;color:#19150F;font-weight:500;}',
    '.ck-accept:hover{background:#D4BA85;}',
    '.ck-reject{background:none;color:rgba(245,240,232,.5);border:1px solid rgba(245,240,232,.15);}',
    '.ck-reject:hover{color:rgba(245,240,232,.85);border-color:rgba(245,240,232,.35);}',
    '@media(max-width:640px){#ck-banner{padding:20px 20px;flex-direction:column;align-items:flex-start;}#ck-actions{width:100%;}#ck-actions .ck-btn{flex:1;text-align:center;}}'
  ].join('');
  document.head.appendChild(style);

  var banner = document.createElement('div');
  banner.id = 'ck-banner';
  banner.innerHTML = [
    '<p id="ck-text">Usamos cookies propias y de terceros para analizar el tráfico y mejorar tu experiencia. Puedes aceptarlas, rechazarlas o consultar nuestra <a href="cookies.html">política de cookies</a>.</p>',
    '<div id="ck-actions">',
    '  <button class="ck-btn ck-reject" id="ck-reject">Solo esenciales</button>',
    '  <button class="ck-btn ck-accept" id="ck-accept">Aceptar todas</button>',
    '</div>'
  ].join('');
  document.body.appendChild(banner);

  setTimeout(function () { banner.classList.add('show'); }, 300);

  function accept(val) {
    localStorage.setItem('razol_cookies', val);
    banner.classList.remove('show');
    setTimeout(function () { banner.remove(); }, 400);
  }

  document.getElementById('ck-accept').addEventListener('click', function () { accept('all'); });
  document.getElementById('ck-reject').addEventListener('click', function () { accept('essential'); });
})();

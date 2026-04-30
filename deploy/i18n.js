/**
 * Razol Parquet — Motor de i18n
 * Requiere que translations.js esté cargado antes que este archivo.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'razol-lang';
  var LANGS = ['es', 'en', 'ca'];

  var FLAGS = {
    es: '🇪🇸',
    en: '🇬🇧',
    ca: '<svg viewBox="0 0 20 14" xmlns="http://www.w3.org/2000/svg" style="width:20px;height:14px;display:block;flex-shrink:0"><rect width="20" height="14" fill="#FCDD09"/><rect y="1.56" width="20" height="1.56" fill="#C1001A"/><rect y="4.67" width="20" height="1.56" fill="#C1001A"/><rect y="7.78" width="20" height="1.56" fill="#C1001A"/><rect y="10.89" width="20" height="1.56" fill="#C1001A"/></svg>'
  };

  var LABELS = { es: 'ES', en: 'EN', ca: 'CA' };

  /* ── CSS del selector de idioma ── */
  var css = `
.lang-sw{position:relative;margin-left:12px;}
.lang-toggle{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:5px;padding:5px 7px;border-radius:4px;color:rgba(245,240,232,.65);transition:background .2s,color .2s;}
.lang-toggle:hover{background:rgba(200,169,110,.1);color:var(--cream,#F5F0E8);}
.lang-flag-current{font-size:20px;line-height:1;display:flex;align-items:center;}
.lang-caret{transition:transform .2s;flex-shrink:0;}
.lang-sw.open .lang-caret{transform:rotate(180deg);}
.lang-dropdown{position:absolute;right:0;top:calc(100% + 6px);background:rgba(25,21,15,.97);backdrop-filter:blur(16px);border:1px solid rgba(200,169,110,.2);display:none;flex-direction:column;min-width:88px;z-index:9100;box-shadow:0 8px 24px rgba(0,0,0,.5);overflow:hidden;}
.lang-sw.open .lang-dropdown{display:flex;}
.lang-btn{background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:8px;padding:10px 14px;font-family:'DM Sans',sans-serif;font-size:11px;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:rgba(245,240,232,.5);transition:color .2s,background .2s;white-space:nowrap;width:100%;text-align:left;}
.lang-btn:hover{color:var(--cream,#F5F0E8);background:rgba(200,169,110,.08);}
.lang-btn.lact{color:var(--gold,#C8A96E);}
.lang-btn .lang-flag{font-size:16px;line-height:1;display:flex;align-items:center;}
@media(max-width:768px){.lang-sw{margin-left:0;}.lang-dropdown{right:auto;left:0;}.lang-toggle{padding:6px 8px;}.lang-flag-current{font-size:22px;}}
`;

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  /* ── Motor ── */
  var I18N = window.I18N = {
    current: 'es',

    init: function () {
      var saved = localStorage.getItem(STORAGE_KEY) || 'es';
      this.current = LANGS.indexOf(saved) !== -1 ? saved : 'es';
      document.documentElement.lang = this.current;
      this._saveOriginals();
      this._buildDropdowns();
      this.apply();
      this._bindSwitchers();
    },

    set: function (lang) {
      if (LANGS.indexOf(lang) === -1) return;
      this.current = lang;
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      this.apply();
      this._updateUI();
      document.querySelectorAll('.lang-sw').forEach(function (sw) {
        sw.classList.remove('open');
      });
    },

    apply: function () {
      var lang = this.current;
      var T = (window.RAZOL_T || {})[lang];

      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var val = T ? I18N._get(T, el.dataset.i18n) : undefined;
        el.innerHTML = (val !== undefined) ? val : (el.dataset.origI18n || el.innerHTML);
      });

      document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
        var val = T ? I18N._get(T, el.dataset.i18nPh) : undefined;
        el.placeholder = (val !== undefined) ? val : (el.dataset.origPh || el.placeholder);
      });

      document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        var val = T ? I18N._get(T, el.dataset.i18nAria) : undefined;
        var orig = el.dataset.origAria;
        if (val !== undefined) el.setAttribute('aria-label', val);
        else if (orig !== undefined) el.setAttribute('aria-label', orig);
      });

      this._updateUI();
    },

    _buildDropdowns: function () {
      document.querySelectorAll('.lang-sw').forEach(function (sw) {
        /* Botón toggle con bandera actual */
        var toggle = document.createElement('button');
        toggle.className = 'lang-toggle';
        toggle.setAttribute('aria-label', 'Seleccionar idioma');
        toggle.setAttribute('aria-haspopup', 'true');
        toggle.setAttribute('aria-expanded', 'false');

        var flagCurrent = document.createElement('span');
        flagCurrent.className = 'lang-flag-current';

        var caretSvg = '<svg class="lang-caret" width="8" height="5" viewBox="0 0 8 5" fill="none"><path d="M1 1l3 3 3-3" stroke="rgba(245,240,232,.6)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

        toggle.appendChild(flagCurrent);
        toggle.insertAdjacentHTML('beforeend', caretSvg);

        /* Dropdown con las 3 opciones */
        var dropdown = document.createElement('div');
        dropdown.className = 'lang-dropdown';
        dropdown.setAttribute('role', 'listbox');

        LANGS.forEach(function (lang) {
          var btn = document.createElement('button');
          btn.className = 'lang-btn';
          btn.dataset.setlang = lang;
          btn.setAttribute('role', 'option');

          var flagEl = document.createElement('span');
          flagEl.className = 'lang-flag';
          flagEl.innerHTML = FLAGS[lang];

          var labelEl = document.createElement('span');
          labelEl.textContent = LABELS[lang];

          btn.appendChild(flagEl);
          btn.appendChild(labelEl);
          dropdown.appendChild(btn);
        });

        sw.innerHTML = '';
        sw.appendChild(toggle);
        sw.appendChild(dropdown);

        toggle.addEventListener('click', function (e) {
          e.stopPropagation();
          var isOpen = sw.classList.toggle('open');
          toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
      });

      if (!window.__razolLangDocHandler) {
        window.__razolLangDocHandler = true;
        document.addEventListener('click', function () {
          document.querySelectorAll('.lang-sw.open').forEach(function (sw) {
            sw.classList.remove('open');
            var t = sw.querySelector('.lang-toggle');
            if (t) t.setAttribute('aria-expanded', 'false');
          });
        });
      }
    },

    _saveOriginals: function () {
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        if (el.dataset.origI18n === undefined) el.dataset.origI18n = el.innerHTML;
      });
      document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
        if (el.dataset.origPh === undefined) el.dataset.origPh = el.placeholder || '';
      });
      document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
        if (el.dataset.origAria === undefined) el.dataset.origAria = el.getAttribute('aria-label') || '';
      });
    },

    _get: function (obj, path) {
      if (!path) return undefined;
      return path.split('.').reduce(function (o, k) {
        return (o !== undefined && o !== null && o[k] !== undefined) ? o[k] : undefined;
      }, obj);
    },

    _bindSwitchers: function () {
      var self = this;
      document.querySelectorAll('[data-setlang]').forEach(function (btn) {
        btn.addEventListener('click', function () { self.set(btn.dataset.setlang); });
      });
      this._updateUI();
    },

    _updateUI: function () {
      var cur = this.current;
      document.querySelectorAll('[data-setlang]').forEach(function (btn) {
        btn.classList.toggle('lact', btn.dataset.setlang === cur);
      });
      document.querySelectorAll('.lang-flag-current').forEach(function (el) {
        el.innerHTML = FLAGS[cur];
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { I18N.init(); });
  } else {
    I18N.init();
  }
})();

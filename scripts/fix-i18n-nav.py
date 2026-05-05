#!/usr/bin/env python3
"""
fix-i18n-nav.py
---------------
1. Adds / ensures data-i18n attributes on all nav <a> links in every HTML page.
2. Moves the <div class="lang-sw"> block INSIDE <div class="nav-right">
   (currently it is placed after the nav-right closing tag, outside the flex container).
3. Adds data-i18n attributes to the hero and CTA sections of the 6 main pages.
"""

import re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── nav link i18n map (href → key) ─────────────────────────────────────────
NAV_MAP = {
    '/' :             'nav.home',
    '/servicios':     'nav.services',
    '/proyectos':     'nav.projects',
    '/como-trabajamos': 'nav.howwework',
    '/blog':          'nav.blog',
    '/contacto':      'nav.yourproject',
    '/showroom':      'nav.contact',
}

# Patterns to inject / fix data-i18n on nav-links <a> tags
def fix_nav_links(html):
    def replacer(m):
        tag = m.group(0)
        href_m = re.search(r'href=["\']([^"\']+)["\']', tag)
        if not href_m:
            return tag
        href = href_m.group(1)
        key = NAV_MAP.get(href)
        if not key:
            return tag
        # Already has data-i18n with right value? Leave alone.
        if f'data-i18n="{key}"' in tag:
            return tag
        # Has wrong / missing data-i18n? Replace or add.
        if 'data-i18n=' in tag:
            tag = re.sub(r'\s*data-i18n="[^"]*"', '', tag)
        # Insert data-i18n before the closing >
        tag = re.sub(r'(\s*/?>)$', lambda x: f' data-i18n="{key}"' + x.group(1), tag)
        return tag

    # Only touch <a> tags inside <ul class="nav-links">
    def fix_nav_block(m):
        block = m.group(0)
        block = re.sub(r'<a\b[^>]*>', replacer, block)
        return block

    html = re.sub(
        r'<ul[^>]*class="[^"]*nav-links[^"]*"[^>]*>.*?</ul>',
        fix_nav_block,
        html,
        flags=re.DOTALL
    )
    return html


# ── move lang-sw inside nav-right ──────────────────────────────────────────
LANG_SW_BLOCK = re.compile(
    r'\s*<div class="lang-sw">.*?</div>',
    re.DOTALL
)

def move_lang_sw_into_nav_right(html):
    """
    Remove the <div class="lang-sw">…</div> from after nav-right
    and insert it just before </div> that closes nav-right.
    """
    # Extract the lang-sw block
    m = LANG_SW_BLOCK.search(html)
    if not m:
        return html

    lang_sw_html = m.group(0).strip()

    # Remove from current position
    html = html[:m.start()] + html[m.end():]

    # Find the closing of nav-right (the </div> after the nav-contact-square / nav-links)
    # Strategy: find <div class="nav-right"> and its matching </div>
    nav_right_start = html.find('<div class="nav-right">')
    if nav_right_start == -1:
        return html

    # Walk forward to find matching </div>
    depth = 0
    pos = nav_right_start
    while pos < len(html):
        if html[pos:pos+4] == '<div':
            depth += 1
            pos += 4
        elif html[pos:pos+6] == '</div>':
            depth -= 1
            if depth == 0:
                # Insert lang-sw just before this </div>
                insert_at = pos
                html = html[:insert_at] + '\n  ' + lang_sw_html + '\n  ' + html[insert_at:]
                return html
            pos += 6
        else:
            pos += 1

    return html


# ── content data-i18n patches for main pages ───────────────────────────────
CONTENT_PATCHES = {

  'razolparquet-servicios.html': [
    # Hero eyebrow
    ('<div class="eyebrow"><div class="eyebrow-line"></div><span>Todo lo que hacemos</span></div>',
     '<div class="eyebrow"><div class="eyebrow-line"></div><span data-i18n="srv.hero_tag">Todo lo que hacemos</span></div>'),
    # Hero h1
    ('<h1 class="page-title">Nuestros<br><em>servicios</em></h1>',
     '<h1 class="page-title" data-i18n="srv.hero_h1">Nuestros<br><em>servicios</em></h1>'),
    # Hero sub
    ('<p class="page-sub">Llevamos más de 25 años trabajando la madera. No hacemos de todo, hacemos esto: suelos de madera, con toda la atención y la precisión que merecen.</p>',
     '<p class="page-sub" data-i18n="srv.hero_sub">Llevamos más de 25 años trabajando la madera. No hacemos de todo, hacemos esto: suelos de madera, con toda la atención y la precisión que merecen.</p>'),
    # CTA strip h2
    ('<h2>¿Quieres saber cuánto costaría<br><em>en tu caso?</em></h2>',
     '<h2 data-i18n="srv.cta_h2">¿Quieres saber cuánto costaría<br><em>en tu caso?</em></h2>'),
    # CTA strip p
    ('<p>Envíanos fotos y te damos una valoración rápida. Sin compromiso.</p>',
     '<p data-i18n="srv.cta_sub">Envíanos fotos y te damos una valoración rápida. Sin compromiso.</p>'),
    # CTA button
    ('<a href="/contacto" class="btn-cream">Solicitar presupuesto</a>',
     '<a href="/contacto" class="btn-cream" data-i18n="srv.cta_btn">Solicitar presupuesto</a>'),
  ],

  'razolparquet-proyectos.html': [
    # Hero eyebrow (whatever the eyebrow span says)
    ('<span>Más de 800 proyectos realizados</span>',
     '<span data-i18n="proj.hero_tag">Más de 800 proyectos realizados</span>'),
    # Hero h1
    ('<h1 class="page-title">Nuestros<br><em>trabajos</em></h1>',
     '<h1 class="page-title" data-i18n="proj.hero_h1">Nuestros<br><em>trabajos</em></h1>'),
    # Hero sub
    ('<p class="page-sub">Cada proyecto en esta página es un cliente que confió en nosotros. Te mostramos el resultado, el proceso y los materiales para que puedas hacerte una idea real de lo que hacemos.</p>',
     '<p class="page-sub" data-i18n="proj.hero_sub">Cada proyecto en esta página es un cliente que confió en nosotros. Te mostramos el resultado, el proceso y los materiales para que puedas hacerte una idea real de lo que hacemos.</p>'),
    # Filter buttons
    ('<button class="filter-btn active" data-cat="all" onclick="filterProj(this,\'all\')">Todos</button>',
     '<button class="filter-btn active" data-cat="all" data-i18n="proj.filter_all" onclick="filterProj(this,\'all\')">Todos</button>'),
    ('<button class="filter-btn" data-cat="premium" onclick="filterProj(this,\'premium\')">Proyectos Premium</button>',
     '<button class="filter-btn" data-cat="premium" data-i18n="proj.filter_prem" onclick="filterProj(this,\'premium\')">Proyectos Premium</button>'),
    ('<button class="filter-btn" data-cat="viviendas" onclick="filterProj(this,\'viviendas\')">Viviendas</button>',
     '<button class="filter-btn" data-cat="viviendas" data-i18n="proj.filter_homes" onclick="filterProj(this,\'viviendas\')">Viviendas</button>'),
    ('<button class="filter-btn" data-cat="contract" onclick="filterProj(this,\'contract\')">Contract</button>',
     '<button class="filter-btn" data-cat="contract" data-i18n="proj.filter_cont" onclick="filterProj(this,\'contract\')">Contract</button>'),
  ],

  'razolparquet-proceso.html': [
    # CTA
    ('<h2>¿Empezamos<br><em>con la visita?</em></h2>',
     '<h2 data-i18n="how.cta_h2">¿Empezamos<br><em>con la visita?</em></h2>'),
    ('<a href="/contacto" class="btn-cream">Solicitar visita gratuita</a>',
     '<a href="/contacto" class="btn-cream" data-i18n="how.cta_btn">Solicitar visita gratuita</a>'),
  ],

}


def apply_patches(html, patches):
    for old, new in patches:
        if old in html:
            html = html.replace(old, new, 1)
    return html


# ── hero section patches for proceso (read first) ──────────────────────────
def patch_proceso_hero(html):
    """Find hero eyebrow and h1 on proceso page."""
    # eyebrow span - flexible match since we don't know exact text
    html = re.sub(
        r'(<div class="eyebrow"><div class="eyebrow-line"></div><span)([^>]*>)([^<]+)(</span></div>)',
        lambda m: m.group(1) + ' data-i18n="how.hero_tag"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1
    )
    # page-title h1 - flexible
    html = re.sub(
        r'(<h1 class="page-title")([^>]*>)(.*?)(</h1>)',
        lambda m: m.group(1) + ' data-i18n="how.hero_h1"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1, flags=re.DOTALL
    )
    # page-sub
    html = re.sub(
        r'(<p class="page-sub")([^>]*>)(.*?)(</p>)',
        lambda m: m.group(1) + ' data-i18n="how.hero_sub"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1, flags=re.DOTALL
    )
    return html


def patch_blog_page(html):
    """Add hero data-i18n to the blog listing page."""
    html = re.sub(
        r'(<div class="eyebrow"><div class="eyebrow-line"></div><span)([^>]*>)([^<]+)(</span></div>)',
        lambda m: m.group(1) + ' data-i18n="blog.hero_tag"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1
    )
    html = re.sub(
        r'(<h1 class="page-title")([^>]*>)(.*?)(</h1>)',
        lambda m: m.group(1) + ' data-i18n="blog.hero_h1"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1, flags=re.DOTALL
    )
    html = re.sub(
        r'(<p class="page-sub")([^>]*>)(.*?)(</p>)',
        lambda m: m.group(1) + ' data-i18n="blog.hero_sub"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1, flags=re.DOTALL
    )
    return html


def patch_contact_page(html):
    """Add hero data-i18n to the contact/proyecto page."""
    html = re.sub(
        r'(<div class="eyebrow"><div class="eyebrow-line"></div><span)([^>]*>)([^<]+)(</span></div>)',
        lambda m: m.group(1) + ' data-i18n="contact.hero_tag"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1
    )
    html = re.sub(
        r'(<h1 class="page-title")([^>]*>)(.*?)(</h1>)',
        lambda m: m.group(1) + ' data-i18n="contact.hero_h1"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1, flags=re.DOTALL
    )
    return html


def patch_showroom_page(html):
    """Add hero data-i18n to the showroom page."""
    html = re.sub(
        r'(<div class="eyebrow"><div class="eyebrow-line"></div><span)([^>]*>)([^<]+)(</span></div>)',
        lambda m: m.group(1) + ' data-i18n="showroom.hero_tag"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1
    )
    html = re.sub(
        r'(<h1 class="page-title")([^>]*>)(.*?)(</h1>)',
        lambda m: m.group(1) + ' data-i18n="showroom.hero_h1"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1, flags=re.DOTALL
    )
    html = re.sub(
        r'(<p class="page-sub")([^>]*>)(.*?)(</p>)',
        lambda m: m.group(1) + ' data-i18n="showroom.hero_sub"' + m.group(2) + m.group(3) + m.group(4)
        if 'data-i18n' not in m.group(2) else m.group(0),
        html, count=1, flags=re.DOTALL
    )
    return html


# ── proceso hero via eyebrow generic approach ───────────────────────────────
EXTRA_PAGE_FUNCS = {
    'razolparquet-proceso.html':  patch_proceso_hero,
    'razolparquet-blog.html':     patch_blog_page,
    'razolparquet-contacto.html': patch_contact_page,
    'razolparquet-showroom.html': patch_showroom_page,
}


# ── main ───────────────────────────────────────────────────────────────────
def process_file(path):
    filename = os.path.basename(path)
    with open(path, encoding='utf-8') as f:
        html = f.read()

    # Skip if no nav-right (not a real page)
    if 'nav-right' not in html:
        return False

    original = html

    # 1. Fix nav link i18n attributes
    html = fix_nav_links(html)

    # 2. Move lang-sw inside nav-right
    html = move_lang_sw_into_nav_right(html)

    # 3. Page-specific content patches
    if filename in CONTENT_PATCHES:
        html = apply_patches(html, CONTENT_PATCHES[filename])

    if filename in EXTRA_PAGE_FUNCS:
        html = EXTRA_PAGE_FUNCS[filename](html)

    if html != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'  ✓ {filename}')
        return True
    else:
        print(f'  – {filename} (no changes)')
        return False


def main():
    html_files = sorted(glob.glob(os.path.join(ROOT, '*.html')))
    changed = 0
    for path in html_files:
        if process_file(path):
            changed += 1
    print(f'\n{changed}/{len(html_files)} files updated.')

if __name__ == '__main__':
    main()

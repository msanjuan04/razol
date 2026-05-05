#!/usr/bin/env python3
"""
fix-proyecto-content.py
-----------------------
Adds data-i18n to spec labels, CTA section and footer back link
on all proyecto-*.html pages.
"""
import re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SPEC_LABELS = {
    'Tipo':       'proyecto.spec_type',
    'Ubicación':  'proyecto.spec_location',
    'Formato':    'proyecto.spec_format',
    'Acabado':    'proyecto.spec_finish',
    'Sistema':    'proyecto.spec_system',
    'Material':   'proyecto.spec_material',
}


def add_spec_i18n(html):
    """Add data-i18n to spec-label divs."""
    def replacer(m):
        full = m.group(0)
        text = m.group(1).strip()
        key = SPEC_LABELS.get(text)
        if not key or 'data-i18n' in full:
            return full
        return f'<div class="spec-label" data-i18n="{key}">{text}</div>'

    return re.sub(
        r'<div class="spec-label">([^<]+)</div>',
        replacer,
        html
    )


def add_cta_i18n(html):
    """Add data-i18n to CTA section elements."""
    # CTA h2 (various texts but within .cta-strip section)
    html = re.sub(
        r'(<section[^>]*class="[^"]*cta-strip[^"]*"[^>]*>.*?<h2)([^>]*>)(.*?)(</h2>)',
        lambda m: m.group(1) + (' data-i18n="proyecto.cta_h2"' if 'data-i18n' not in m.group(2) else '') + m.group(2) + m.group(3) + m.group(4),
        html, count=1, flags=re.DOTALL
    )
    # CTA p
    html = re.sub(
        r'(<section[^>]*class="[^"]*cta-strip[^"]*"[^>]*>.*?<p)([^>]*>)(.*?)(</p>)',
        lambda m: m.group(1) + (' data-i18n="proyecto.cta_sub"' if 'data-i18n' not in m.group(2) else '') + m.group(2) + m.group(3) + m.group(4),
        html, count=1, flags=re.DOTALL
    )
    # CTA btn (btn-cream link)
    html = re.sub(
        r'(<a href="/contacto"[^>]*class="btn-cream"[^>]*>)(.*?)(</a>)',
        lambda m: (
            m.group(1).replace('class="btn-cream"', 'class="btn-cream" data-i18n="proyecto.cta_btn"')
            if 'data-i18n' not in m.group(1) else m.group(1)
        ) + m.group(2) + m.group(3),
        html, count=1
    )
    return html


def add_footer_back_i18n(html):
    """Add data-i18n to the back-link in footer."""
    html = re.sub(
        r'(<a href="/proyectos"[^>]*class="back-link"[^>]*>)(.*?)(</a>)',
        lambda m: (
            m.group(1).replace('class="back-link"', 'class="back-link" data-i18n="proyecto.footer_back"')
            if 'data-i18n' not in m.group(1) else m.group(1)
        ) + m.group(2) + m.group(3),
        html, count=1
    )
    return html


def process_file(path):
    filename = os.path.basename(path)
    with open(path, encoding='utf-8') as f:
        html = f.read()

    # Only process project pages
    if not (filename.startswith('proyecto-') or filename == 'proyecto-mim-baqueira.html'):
        return False

    original = html
    html = add_spec_i18n(html)
    html = add_cta_i18n(html)
    html = add_footer_back_i18n(html)

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
    print(f'\n{changed} project files updated.')

if __name__ == '__main__':
    main()

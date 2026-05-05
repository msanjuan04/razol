#!/usr/bin/env python3
"""
fix-footer-form.py
------------------
Adds data-i18n to:
- Footer links (aviso-legal, privacidad, cookies) across all pages.
- Contacto page form title and step counter.
"""
import re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def fix_footer_links(html):
    """Add data-i18n to footer navigation links."""
    html = re.sub(
        r'(<a href="/aviso-legal")([^>]*>)(.*?)(</a>)',
        lambda m: (m.group(1) + (' data-i18n="ui.footer_legal"' if 'data-i18n' not in m.group(2) else '') + m.group(2) + m.group(3) + m.group(4)),
        html
    )
    html = re.sub(
        r'(<a href="/privacidad")([^>]*>)(.*?)(</a>)',
        lambda m: (m.group(1) + (' data-i18n="ui.footer_priv"' if 'data-i18n' not in m.group(2) else '') + m.group(2) + m.group(3) + m.group(4)),
        html
    )
    html = re.sub(
        r'(<a href="/cookies")([^>]*>)(.*?)(</a>)',
        lambda m: (m.group(1) + (' data-i18n="ui.footer_cook"' if 'data-i18n' not in m.group(2) else '') + m.group(2) + m.group(3) + m.group(4)),
        html
    )
    return html


def fix_contacto_form(html):
    """Add data-i18n to the contact form's form-title."""
    html = re.sub(
        r'(<div class="form-title")([^>]*>)(.*?)(</div>)',
        lambda m: m.group(1) + (' data-i18n="contact.hero_h1"' if 'data-i18n' not in m.group(2) else '') + m.group(2) + m.group(3) + m.group(4),
        html, count=1
    )
    return html


def process_file(path):
    filename = os.path.basename(path)
    with open(path, encoding='utf-8') as f:
        html = f.read()

    original = html

    # Footer links on all pages
    html = fix_footer_links(html)

    # Contacto form title
    if filename == 'razolparquet-contacto.html':
        html = fix_contacto_form(html)

    if html != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'  ✓ {filename}')
        return True
    return False


def main():
    html_files = sorted(glob.glob(os.path.join(ROOT, '*.html')))
    changed = 0
    for path in html_files:
        if process_file(path):
            changed += 1
    print(f'\n{changed} files updated.')

if __name__ == '__main__':
    main()

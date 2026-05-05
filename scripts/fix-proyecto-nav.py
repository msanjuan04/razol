#!/usr/bin/env python3
"""
fix-proyecto-nav.py
-------------------
For pages that have nav-links but NO nav-right wrapper:
1. Adds missing data-i18n to nav <a> links.
2. Moves <div class="lang-sw"> to be RIGHT BEFORE <button class="nav-burger">
   (avoids lang-sw being the last flex child after the burger).
"""
import re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NAV_MAP = {
    '/':               'nav.home',
    '/servicios':      'nav.services',
    '/proyectos':      'nav.projects',
    '/como-trabajamos':'nav.howwework',
    '/blog':           'nav.blog',
    '/contacto':       'nav.yourproject',
    '/showroom':       'nav.contact',
}

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
        if f'data-i18n="{key}"' in tag:
            return tag
        if 'data-i18n=' in tag:
            tag = re.sub(r'\s*data-i18n="[^"]*"', '', tag)
        tag = re.sub(r'(\s*/?>)$', lambda x: f' data-i18n="{key}"' + x.group(1), tag)
        return tag

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


def move_lang_sw_before_burger(html):
    """
    Move the <div class="lang-sw">…</div> block to be immediately before
    <button class="nav-burger"…>, so it appears between nav-links and the burger.
    """
    # Find lang-sw block (multi-line)
    lang_sw_m = re.search(
        r'\s*<div class="lang-sw">.*?</div>',
        html, re.DOTALL
    )
    if not lang_sw_m:
        return html

    lang_sw_html = lang_sw_m.group(0).strip()

    # Remove from current position
    html = html[:lang_sw_m.start()] + html[lang_sw_m.end():]

    # Find nav-burger button
    burger_m = re.search(r'<button[^>]*class="nav-burger"', html)
    if not burger_m:
        # Can't find burger, just return
        return html

    # Insert lang-sw just before the burger
    insert_at = burger_m.start()
    html = html[:insert_at] + '\n  ' + lang_sw_html + '\n  ' + html[insert_at:]
    return html


def process_file(path):
    filename = os.path.basename(path)
    with open(path, encoding='utf-8') as f:
        html = f.read()

    # Only process pages that have nav-links but NO nav-right
    if 'nav-right' in html or 'nav-links' not in html:
        return False

    original = html
    html = fix_nav_links(html)
    html = move_lang_sw_before_burger(html)

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
    print(f'\n{changed} files updated.')

if __name__ == '__main__':
    main()

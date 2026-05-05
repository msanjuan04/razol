#!/usr/bin/env python3
"""
fix-blog-content.py
-------------------
Adds data-i18n to blog post shared elements:
- related-label paragraph
- back-link
- CTA box strong + button
"""
import re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def add_blog_i18n(html):
    # related-label paragraph
    html = re.sub(
        r'(<p class="related-label")([^>]*>)(.*?)(</p>)',
        lambda m: m.group(1) + (' data-i18n="blogpost.related"' if 'data-i18n' not in m.group(2) else '') + m.group(2) + m.group(3) + m.group(4),
        html, count=1, flags=re.DOTALL
    )

    # back-link to /blog (not fixed-back, the bottom one)
    html = re.sub(
        r'(<a href="/blog"[^>]*class="back-link"[^>]*>)(.*?)(</a>)',
        lambda m: (
            m.group(1).replace('class="back-link"', 'class="back-link" data-i18n="blogpost.back"')
            if 'data-i18n' not in m.group(1) else m.group(1)
        ) + m.group(2) + m.group(3),
        html, count=1
    )

    return html


def process_file(path):
    filename = os.path.basename(path)
    with open(path, encoding='utf-8') as f:
        html = f.read()

    # Only process blog post pages
    if not filename.startswith('blog-'):
        return False

    original = html
    html = add_blog_i18n(html)

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
    print(f'\n{changed} blog files updated.')

if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Reemplaza enlaces *.html internos por rutas limpias según url-map.json."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAP_PATH = Path(__file__).resolve().parent / "url-map.json"
DOMAIN = "https://razolparquet.com"

with open(MAP_PATH, encoding="utf-8") as f:
    FILE_TO_PATH = json.load(f)["fileToPath"]

# Orden: ficheros más largos primero (evita sustituir prefijos cortos antes de tiempo)
ITEMS = sorted(FILE_TO_PATH.items(), key=lambda x: len(x[0]), reverse=True)


def rewrite_text(text: str) -> str:
    for fname, clean in ITEMS:
        esc = re.escape(fname)
        # href="file" o href="file#hash"
        text = re.sub(
            rf'(\bhref=["\']){esc}(#[^"\']*)?(["\'])',
            lambda m: f'{m.group(1)}{clean}{m.group(2) or ""}{m.group(3)}',
            text,
        )
        # URLs absolutas del sitio
        text = text.replace(f"{DOMAIN}/{fname}", f"{DOMAIN}{clean}")
        text = text.replace(f"{DOMAIN}/{fname.split('/')[-1]}", f"{DOMAIN}{clean}")
    return text


def process_file(path: Path) -> bool:
    raw = path.read_text(encoding="utf-8")
    new = rewrite_text(raw)
    if new != raw:
        path.write_text(new, encoding="utf-8")
        return True
    return False


def main():
    dirs = [ROOT, ROOT / "deploy"]
    updated = []
    for base in dirs:
        if not base.exists():
            continue
        for p in base.rglob("*.html"):
            if "node_modules" in str(p):
                continue
            if process_file(p):
                updated.append(p.relative_to(ROOT))
    print(f"Actualizados {len(updated)} archivos HTML.")


if __name__ == "__main__":
    main()

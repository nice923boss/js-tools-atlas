"""Build assets/data.js from the Excel source and the demo files.

Usage: python scripts/build_data.py [path/to/JS工具功能清單.xlsx]
"""
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_XLSX = ROOT / "assets" / "js-tools-list.xlsx"
DEMO_META_RE = re.compile(
    r'<script[^>]*id="demo-meta"[^>]*>(.*?)</script>', re.S | re.I
)


def slugify(name: str) -> str:
    base = re.sub(r"（.*?）", "", name)  # drop full-width parenthetical
    base = base.lower().replace(".", "")
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    return base


def rows(ws):
    header = None
    for r in ws.iter_rows(values_only=True):
        if not any(c is not None for c in r):
            continue
        if header is None:
            header = r
            continue
        yield r


def read_demo_meta(slug: str):
    path = ROOT / "demos" / f"{slug}.html"
    if not path.exists():
        return None
    html = path.read_text(encoding="utf-8")
    m = DEMO_META_RE.search(html)
    meta = json.loads(m.group(1)) if m else {}
    meta.setdefault("mode", "auto")
    meta["thumb"] = (ROOT / "assets" / "thumbs" / f"{slug}.webp").exists()
    return meta


def main():
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    wb = openpyxl.load_workbook(xlsx, data_only=True)

    tools, seen = [], set()
    for r in rows(wb["JS工具總表"]):
        slug = slugify(r[2])
        if slug in seen:
            raise SystemExit(f"duplicate slug: {slug} ({r[2]})")
        seen.add(slug)
        tools.append({
            "id": r[0], "cat": r[1], "name": r[2], "slug": slug,
            "desc": r[3], "effect": r[4], "level": r[5],
            "friendly": len(r[6] or ""), "framework": r[7], "license": r[8],
            "stars": r[9], "updated": r[10], "site": r[11],
            "example": r[12] if (r[12] or "").startswith("http") else None,
            "exampleNote": None if (r[12] or "").startswith("http") else r[12],
            "github": r[13], "check": r[14], "note": r[15],
            "demo": read_demo_meta(slug),
        })

    platforms = [
        {"id": r[0], "name": r[1], "desc": r[2], "fit": r[3], "url": r[4], "check": r[5]}
        for r in rows(wb["範例靈感平台"])
    ]
    recipes = [
        {"id": r[0], "combo": r[1], "result": r[2], "prompt": r[3], "url": r[4]}
        for r in rows(wb["組合配方"])
    ]
    notes = [{"k": r[0], "v": r[1]} for r in rows(wb["說明"])]

    data = {"tools": tools, "platforms": platforms, "recipes": recipes, "notes": notes}
    out = ROOT / "assets" / "data.js"
    out.write_text(
        "window.ATLAS = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    demo_count = sum(1 for t in tools if t["demo"])
    print(f"tools={len(tools)} demos={demo_count} platforms={len(platforms)} recipes={len(recipes)} -> {out}")


if __name__ == "__main__":
    main()

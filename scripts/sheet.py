"""Tile a demo's scene screenshots into one contact sheet for quick review.

Usage:
  python scripts/sheet.py chartjs              # desktop shots  -> scripts/_shots/chartjs-sheet.jpg
  python scripts/sheet.py chartjs -stage       # 600x420 shots  -> scripts/_shots/chartjs-stage-sheet.jpg
  python scripts/sheet.py chartjs -narrow      # 360x560 shots  -> scripts/_shots/chartjs-narrow-sheet.jpg
Run scripts/verify_demos.py <slug> --scenes [--stage --narrow] first.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw

SHOTS = Path(__file__).resolve().parent.parent / "scripts" / "_shots"


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    slug, suffix = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else "")
    first = SHOTS / f"{slug}{suffix}.png"
    files = [first] if first.exists() else []
    files += sorted(SHOTS.glob(f"{slug}{suffix}@*.jpg"), key=lambda p: int(p.stem.rsplit("@", 1)[1]))
    if not files:
        sys.exit(f"no screenshots for {slug}{suffix}")
    narrow = suffix == "-narrow"
    cols = 4 if narrow else (2 if suffix == "-stage" else 2)
    w = 300 if narrow else (600 if suffix == "-stage" else 640)
    imgs = [Image.open(f).convert("RGB") for f in files]
    h = round(imgs[0].height * w / imgs[0].width)
    rows = (len(imgs) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w + (cols - 1) * 6, rows * h + (rows - 1) * 6), (60, 60, 60))
    draw = ImageDraw.Draw(sheet)
    for i, im in enumerate(imgs):
        x, y = (i % cols) * (w + 6), (i // cols) * (h + 6)
        sheet.paste(im.resize((w, h), Image.LANCZOS), (x, y))
        draw.rectangle((x, y, x + 22, y + 16), fill=(247, 223, 30))
        draw.text((x + 6, y + 2), str(i + 1), fill=(0, 0, 0))
    out = SHOTS / f"{slug}{suffix}-sheet.jpg"
    sheet.save(out, quality=80)
    print(out)


if __name__ == "__main__":
    main()

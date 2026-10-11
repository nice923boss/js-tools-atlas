"""Headless check for demo pages: JS errors, failed requests, blank output, overflow.

Usage:
  python scripts/verify_demos.py p5js threejs         # check specific demos
  python scripts/verify_demos.py --all                # every demos/*.html
  options:
    --start     click the [data-demo-start] gate button (click-mode demos) and keep checking
    --wait S    seconds to wait after load / after start (default 3)
    --narrow    also render at 360x560 and report horizontal overflow
    --stage     also render at 600x420 (smallest desktop stage) and report overflow in either axis
    --thumbs    write assets/thumbs/<slug>.webp (480x300) from the screenshot
    --scenes    showcase demos: also open every scene (window.__showcase.go) and check each one;
                with --narrow / --stage the scenes are checked at those sizes too
    --only 2,5  with --scenes: only these 1-based scene numbers (scene 1 is always loaded first)
    --stress S  with --scenes: click [data-sc-run] in stress scenes and let the ramp run S seconds
Screenshots go to scripts/_shots/<slug>.png (and <slug>-narrow.png, <slug>@3.jpg for scene 3).
"""
import argparse
import functools
import http.server
import json
import socketserver
import sys
import threading
from pathlib import Path

from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SHOTS = ROOT / "scripts" / "_shots"
THUMBS = ROOT / "assets" / "thumbs"
IGNORE_URL_PARTS = ("favicon.ico",)
# TFLite's WASM runtime prints this INFO line through console.error.
IGNORE_CONSOLE_PARTS = ("Created TensorFlow Lite XNNPACK delegate",)
CHROME_ARGS = [
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream",
    "--autoplay-policy=no-user-gesture-required",
]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def serve():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    httpd = socketserver.ThreadingTCPServer(("127.0.0.1", 0), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]


def blank_ratio(png: Path) -> float:
    """Share of pixels equal to the most common colour (1.0 = completely flat)."""
    im = Image.open(png).convert("RGB").resize((160, 100))
    colors = im.getcolors(160 * 100) or []
    top = max(c for c, _ in colors) if colors else 0
    return top / (160 * 100)


def check(page, url, slug, wait, start, suffix="", vertical=False):
    issues = []

    def on_console(msg):
        if msg.type == "error" and not any(p in msg.text for p in IGNORE_CONSOLE_PARTS):
            issues.append(f"[console] {msg.text[:300]}")

    def on_response(resp):
        if resp.status >= 400 and not any(p in resp.url for p in IGNORE_URL_PARTS):
            issues.append(f"[http {resp.status}] {resp.url[:200]}")

    def on_request_failed(req):
        if any(p in req.url for p in IGNORE_URL_PARTS):
            return
        # Leaving a scene removes its iframes (YouTube, Vimeo...), which aborts their in-flight requests.
        if "ERR_ABORTED" in (req.failure or "") and req.frame != page.main_frame:
            return
        issues.append(f"[requestfailed] {req.url[:200]} {req.failure}")

    page.on("console", on_console)
    page.on("pageerror", lambda e: issues.append(f"[pageerror] {str(e)[:300]}"))
    page.on("requestfailed", on_request_failed)
    page.on("response", on_response)

    try:
        page.goto(url, wait_until="load", timeout=45000)
    except Exception as e:  # noqa: BLE001 - report any navigation failure
        issues.append(f"[goto] {e}")
    page.wait_for_timeout(int(wait * 1000))

    gated = page.locator("[data-demo-start]").count() > 0
    if start and gated:
        page.locator("[data-demo-start]").first.click()
        page.wait_for_timeout(int(wait * 1000))

    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    # Pages that switch body to overflow:auto (body.scroll or a media query) scroll instead of clipping.
    scrolls = page.evaluate(
        "() => ['auto', 'scroll'].includes(getComputedStyle(document.body).overflowY)"
    )
    if overflow > 2 and not scrolls:
        issues.append(f"[layout] horizontal overflow {overflow}px")
    if vertical and not scrolls:
        # body is overflow:hidden in demos, so anything taller than the viewport is clipped.
        clipped = page.evaluate(
            "() => document.documentElement.scrollHeight - document.documentElement.clientHeight"
        )
        if clipped > 4:
            issues.append(f"[layout] content clipped {clipped}px at the bottom")

    SHOTS.mkdir(parents=True, exist_ok=True)
    shot = SHOTS / f"{slug}{suffix}.png"
    page.screenshot(path=str(shot))
    ratio = blank_ratio(shot)
    if ratio > 0.97 and not gated:
        issues.append(f"[blank?] {ratio:.0%} of pixels are one colour")
    return issues, shot, gated


SCENE_PROBE = r"""() => {
  const el = document.querySelector('.sc-scene');
  if (!el) return null;
  const err = el.querySelector('.sc-error');
  const scroll = el.classList.contains('scroll') || getComputedStyle(el).overflowY === 'auto';
  const r = document.querySelector('.sc-stage').getBoundingClientRect();
  return {
    error: err ? err.innerText.replace(/\s+/g, ' ').slice(0, 300) : '',
    clipX: el.scrollWidth - el.clientWidth,
    clipY: scroll ? 0 : el.scrollHeight - el.clientHeight,
    stage: [r.left, r.top, r.right, r.bottom],
  };
}"""


def scene_issues(page, shot: Path, blank_check: bool) -> list:
    """Checks for the currently mounted showcase scene: error card, clipped content, blank stage."""
    probe = page.evaluate(SCENE_PROBE)
    if not probe:
        return ["[showcase] no .sc-scene mounted"]
    out = []
    if probe["error"]:
        out.append(f"[scene-error] {probe['error']}")
    if probe["clipX"] > 4:
        out.append(f"[layout] scene content overflows {probe['clipX']}px horizontally")
    if probe["clipY"] > 4:
        out.append(f"[layout] scene content clipped {probe['clipY']}px at the bottom")
    if blank_check:
        im = Image.open(shot).convert("RGB").crop(tuple(int(v) for v in probe["stage"]))
        colors = im.resize((160, 100)).getcolors(160 * 100) or []
        top = max(c for c, _ in colors) if colors else 0
        if top / 16000 > 0.97:
            out.append(f"[blank?] scene stage is {top / 16000:.0%} one colour")
    return out


def keep(msg: str, layout_only: bool) -> bool:
    return not layout_only or any(t in msg for t in ("[layout]", "[pageerror]", "[scene-error]"))


def check_scenes(page, slug, issues, wait, start, suffix, only, stress, layout_only=False):
    """Visit scenes 2..N of a showcase page (scene 1 was checked by check()). Returns (issues, count)."""
    scenes = page.evaluate("() => window.__showcase ? window.__showcase.scenes : null")
    if not scenes:
        return ["[showcase] window.__showcase missing (page is not a showcase demo)"], 0
    found = []
    main_shot = SHOTS / f"{slug}{suffix}.png"
    if main_shot.exists():
        gated0 = page.locator(".sc-scene [data-demo-start]").count() > 0
        found += [f"@1 {i}" for i in scene_issues(page, main_shot, blank_check=not layout_only and not gated0)
                  if keep(i, layout_only)]
    for i, sc in enumerate(scenes):
        n = i + 1
        if n == 1 or (only and n not in only):
            continue
        mark = len(issues)
        page.evaluate("i => window.__showcase.go(i)", i)
        page.wait_for_timeout(int(wait * 1000))
        gate = page.locator(".sc-scene [data-demo-start]")
        if start and gate.count():
            gate.first.click()
            page.wait_for_timeout(int(wait * 1000))
        gated = page.locator(".sc-scene [data-demo-start]").count() > 0
        if stress and sc.get("kind") == "stress":
            run = page.locator(".sc-scene [data-sc-run]")
            if run.count():
                run.first.click()
                page.wait_for_timeout(int(stress * 1000))
            else:
                found.append(f"@{n} [stress] no [data-sc-run] button in the stress scene")
        shot = SHOTS / f"{slug}{suffix}@{n}.jpg"
        page.screenshot(path=str(shot), type="jpeg", quality=72)
        local = scene_issues(page, shot, blank_check=not gated and not layout_only)
        new_console = issues[mark:]
        del issues[mark:]
        found += [f"@{n} {sc['title']} {m}" for m in new_console + local if keep(m, layout_only)]
    return found, len(scenes)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slugs", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--start", action="store_true")
    ap.add_argument("--wait", type=float, default=3.0)
    ap.add_argument("--narrow", action="store_true")
    ap.add_argument("--stage", action="store_true")
    ap.add_argument("--thumbs", action="store_true")
    ap.add_argument("--scenes", action="store_true")
    ap.add_argument("--only", default="", help="comma separated 1-based scene numbers")
    ap.add_argument("--stress", type=float, default=0.0)
    ap.add_argument("--json", help="write a JSON report to this path")
    args = ap.parse_args()

    slugs = args.slugs
    if args.all:
        slugs = sorted(p.stem for p in (ROOT / "demos").glob("*.html") if not p.stem.startswith("_"))
    if not slugs:
        ap.error("give demo slugs or --all")

    only = {int(x) for x in args.only.split(",") if x.strip()}
    httpd, port = serve()
    report, failed = {}, 0
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=CHROME_ARGS)
        for slug in slugs:
            if not (ROOT / "demos" / f"{slug}.html").exists():
                print(f"MISSING {slug}")
                failed += 1
                continue
            url = f"http://127.0.0.1:{port}/demos/{slug}.html"
            ctx = browser.new_context(viewport={"width": 960, "height": 600}, device_scale_factor=1)
            ctx.grant_permissions(["camera", "microphone"])
            page = ctx.new_page()
            issues, shot, gated = check(page, url, slug, args.wait, args.start)
            n_scenes = 0
            if args.scenes:
                found, n_scenes = check_scenes(page, slug, issues, args.wait, args.start, "", only, args.stress)
                issues += found
            ctx.close()
            small_wait = min(args.wait, 2.0)
            if args.narrow:
                ctx = browser.new_context(viewport={"width": 360, "height": 560})
                page = ctx.new_page()
                n_issues, _, _ = check(page, url, slug, small_wait, args.start, "-narrow")
                if args.scenes:
                    found, _ = check_scenes(page, slug, n_issues, min(small_wait, 1.2), args.start, "-narrow", only, 0, True)
                    n_issues += found
                issues += [f"(narrow) {i}" for i in n_issues if keep(i, True)]
                ctx.close()
            if args.stage:
                ctx = browser.new_context(viewport={"width": 600, "height": 420})
                page = ctx.new_page()
                s_issues, _, _ = check(page, url, slug, small_wait, args.start, "-stage", vertical=True)
                if args.scenes:
                    found, _ = check_scenes(page, slug, s_issues, min(small_wait, 1.2), args.start, "-stage", only, 0, True)
                    s_issues += found
                issues += [f"(stage) {i}" for i in s_issues if keep(i, True)]
                ctx.close()
            if args.thumbs:
                THUMBS.mkdir(parents=True, exist_ok=True)
                Image.open(shot).convert("RGB").resize((480, 300), Image.LANCZOS).save(
                    THUMBS / f"{slug}.webp", "WEBP", quality=72, method=6
                )
            report[slug] = {"issues": issues, "gated": gated, "shot": str(shot), "scenes": n_scenes}
            tag = "OK  " if not issues else "FAIL"
            failed += bool(issues)
            extra = f" ({n_scenes} scenes)" if n_scenes else ""
            print(f"{tag} {slug}{' (gated)' if gated else ''}{extra}  -> {shot}")
            for i in issues[:14]:
                print(f"      {i}")
        browser.close()
    httpd.shutdown()
    if args.json:
        Path(args.json).write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"\n{len(slugs) - failed}/{len(slugs)} clean")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()

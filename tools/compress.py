"""Build the optimized image set for the redesigned yogipatel.me.

Usage: python -I tools/compress.py <original_repo_root> <site_root>

Reads the original images, never modifies them, and writes the derivatives the
design spec names into <site_root>/images/... :

  about/yogi-400.webp + yogi-400.jpg       portrait
  logos/{uhg,pwc,pgw,pfizer}.png           trimmed, 96px tall, alpha kept
  work/project-{1..6}-800.webp             card thumbnails (1-4 cropped 16:10, 5-6 fit)
  graphicdesign/lb/{n}.webp, thumb/{n}.webp
  tshirts/lb/{n}.webp, thumb/{n}.webp
  akshardhamusa/3-1920.webp, 3-1600.webp, 3-800.webp
  akshardhamusa/{2,4,6}-1600.webp, {2,4,6}-640.webp (4:3 crop)
  akshardhamusa/1.mp4 (copied as-is, click-to-play)
  og-1200x630.jpg                           Open Graph image from 3.webp
"""
import os
import shutil
import sys

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None  # the t-shirt mockups are ~229 MP JPEGs from the owner's own repo

SRC = sys.argv[1]
SITE = sys.argv[2]
IMG = os.path.join(SITE, "images")
report = []


def kb(path):
    return f"{os.path.getsize(path) / 1024:,.0f} KB"


def ensure(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)


def open_img(rel, draft_to=None):
    im = Image.open(os.path.join(SRC, "images", rel))
    if draft_to and im.format == "JPEG":
        im.draft("RGB", (draft_to * 2, draft_to * 2))
    im.load()
    return ImageOps.exif_transpose(im)


def fit_within(im, max_w, max_h):
    w, h = im.size
    scale = min(1.0, max_w / w, max_h / h)
    if scale < 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    return im


def cover_crop(im, tw, th):
    """Resize + centre-crop to exactly tw x th."""
    w, h = im.size
    scale = max(tw / w, th / h)
    im = im.resize((max(tw, round(w * scale)), max(th, round(h * scale))), Image.LANCZOS)
    w, h = im.size
    left = (w - tw) // 2
    top = (h - th) // 2
    return im.crop((left, top, left + tw, top + th))


def save_webp(im, rel, quality):
    dest = os.path.join(IMG, rel)
    ensure(dest)
    if im.mode == "P":
        im = im.convert("RGBA")
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGB")
    im.save(dest, "WEBP", quality=quality, method=6)
    return dest


def save_jpg(im, rel, quality):
    dest = os.path.join(IMG, rel)
    ensure(dest)
    im.convert("RGB").save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
    return dest


# ---------- Portrait ----------
p = open_img("about-1.jpg")
d1 = save_webp(p, "about/yogi-400.webp", 85)
d2 = save_jpg(p, "about/yogi-400.jpg", 85)
report.append(f"portrait -> {kb(d1)} webp / {kb(d2)} jpg ({p.size[0]}x{p.size[1]})")

# ---------- Logos ----------
def trim_logo(im):
    im = im.convert("RGBA")
    bbox = im.getbbox()  # alpha-aware bbox (non-zero alpha or non-black)
    if bbox:
        im = im.crop(bbox)
    # Also trim near-white opaque padding (some logos have a baked white background)
    px = im.load()
    w, h = im.size
    def is_bg(x, y):
        r, g, b, a = px[x, y]
        return a < 8 or (r > 245 and g > 245 and b > 245)
    left, right, top, bottom = 0, w - 1, 0, h - 1
    while left < right and all(is_bg(left, y) for y in range(h)):
        left += 1
    while right > left and all(is_bg(right, y) for y in range(h)):
        right -= 1
    while top < bottom and all(is_bg(x, top) for x in range(w)):
        top += 1
    while bottom > top and all(is_bg(x, bottom) for x in range(w)):
        bottom -= 1
    return im.crop((left, top, right + 1, bottom + 1))


for src_name, out_name in (("uhg_logo", "uhg"), ("pwc_logo", "pwc"), ("pgw_logo", "pgw"), ("pfizer_logo", "pfizer")):
    im = trim_logo(open_img(f"{src_name}.png"))
    w, h = im.size
    im = im.resize((round(w * 96 / h), 96), Image.LANCZOS)
    dest = os.path.join(IMG, "logos", f"{out_name}.png")
    ensure(dest)
    im.save(dest, "PNG", optimize=True)
    report.append(f"logo {out_name} -> {kb(dest)} ({im.size[0]}x{im.size[1]})")

# ---------- Project thumbs ----------
for n in range(1, 7):
    im = open_img(f"project-{n}.png")
    if n <= 4:
        im = cover_crop(im.convert("RGB"), 800, 500)
    else:
        im = fit_within(im, 800, 500)
        if im.mode == "RGBA":
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[3])
            im = bg
    dest = save_webp(im, f"work/project-{n}-800.webp", 80)
    report.append(f"project-{n} -> {kb(dest)} ({im.size[0]}x{im.size[1]})")

# ---------- Galleries ----------
def gallery(sub, count, exts, lb_q, th_q):
    for n in range(1, count + 1):
        rel = None
        for ext in exts:
            cand = os.path.join(SRC, "images", sub, f"{n}{ext}")
            if os.path.exists(cand):
                rel = f"{sub}/{n}{ext}"
                break
        if not rel:
            report.append(f"{sub}/{n}: MISSING")
            continue
        im = open_img(rel, draft_to=1600)
        if im.mode == "RGBA":
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[3])
            im = bg
        lb = fit_within(im, 1600, 2000)
        d_lb = save_webp(lb, f"{sub}/lb/{n}.webp", lb_q)
        th = fit_within(im, 480, 480)
        d_th = save_webp(th, f"{sub}/thumb/{n}.webp", th_q)
        report.append(f"{sub}/{n} -> lb {kb(d_lb)} ({lb.size[0]}x{lb.size[1]}), thumb {kb(d_th)} ({th.size[0]}x{th.size[1]})")


gallery("graphicdesign", 7, (".jpg", ".png"), 82, 80)
gallery("tshirts", 8, (".jpg", ".png"), 80, 80)

# ---------- Akshardham photos ----------
hero = open_img("akshardhamusa/3.webp").convert("RGB")
for w in (1920, 1600, 800):
    im = fit_within(hero, w, 10000)
    dest = save_webp(im, f"akshardhamusa/3-{w}.webp", 80 if w < 1920 else 78)
    report.append(f"akshardhamusa/3-{w} -> {kb(dest)} ({im.size[0]}x{im.size[1]})")
og = cover_crop(hero, 1200, 630)
dest = save_jpg(og, "og-1200x630.jpg", 80)
report.append(f"og-1200x630 -> {kb(dest)}")

for n in (2, 4, 6):
    im = open_img(f"akshardhamusa/{n}.webp").convert("RGB")
    big = fit_within(im, 1600, 1600)
    d1 = save_webp(big, f"akshardhamusa/{n}-1600.webp", 80)
    tile = cover_crop(im, 640, 480)
    d2 = save_webp(tile, f"akshardhamusa/{n}-640.webp", 80)
    report.append(f"akshardhamusa/{n} -> 1600 {kb(d1)} ({big.size[0]}x{big.size[1]}), 640 tile {kb(d2)}")

mp4_src = os.path.join(SRC, "images", "akshardhamusa", "1.mp4")
if os.path.exists(mp4_src):
    dest = os.path.join(IMG, "akshardhamusa", "1.mp4")
    ensure(dest)
    shutil.copyfile(mp4_src, dest)
    report.append(f"akshardhamusa/1.mp4 copied ({kb(dest)})")

print("\n".join(report))
total = 0
for root, _, files in os.walk(IMG):
    for f in files:
        total += os.path.getsize(os.path.join(root, f))
print(f"TOTAL images/ in site: {total / 1024 / 1024:,.1f} MB")

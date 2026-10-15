"""Hard-clean Tensora brand PNGs: kill haze, rebuild crisp lockup."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ASSETS = Path(
    r"C:\Users\thepa\.cursor\projects\c-Users-thepa-The-Network\assets"
)
MARK_SRC = ASSETS / (
    "c__Users_thepa_AppData_Roaming_Cursor_User_workspaceStorage_"
    "223a0e40094cad37528c06ecf4968757_images_image12-55f223b7-90c9-4a24-b55e-012103d6bcb3.png"
)
# Prefer the user's cleanest lockup screenshot if present; else prior lockup source
LOCK_CANDIDATES = [
    ASSETS / (
        "c__Users_thepa_AppData_Roaming_Cursor_User_workspaceStorage_"
        "223a0e40094cad37528c06ecf4968757_images_image-d08b56fb-ced4-418b-ad3a-ae4af27fdc7d.png"
    ),
]
BRAND = Path(r"C:\Users\thepa\The Network\tensora-app\public\brand")
FAV = Path(r"C:\Users\thepa\The Network\tensora-app\public\favicon")
LANDING = Path(r"C:\Users\thepa\The Network\tensora-app\public\landing\icons")


def extract_ink(im: Image.Image, ink_max_lum: int = 140) -> Image.Image:
    """Keep only dark ink as pure black; everything else fully transparent."""
    im = im.convert("RGBA")
    out = Image.new("RGBA", im.size, (0, 0, 0, 0))
    src = im.load()
    dst = out.load()
    assert src is not None and dst is not None
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a < 8:
                continue
            lum = (r + g + b) / 3
            if lum <= ink_max_lum:
                # Soft AA only near ink edges: map darker → more alpha
                strength = max(0.0, min(1.0, (ink_max_lum - lum) / max(1, ink_max_lum * 0.35)))
                alpha = int(255 * (0.55 + 0.45 * strength))
                if lum < 40:
                    alpha = 255
                elif lum > ink_max_lum - 25:
                    alpha = max(0, int((ink_max_lum - lum) / 25 * 180))
                if alpha >= 24:
                    dst[x, y] = (0, 0, 0, alpha)
    return out


def hard_clean(im: Image.Image, cutoff: int = 96) -> Image.Image:
    """Drop haze: alpha below cutoff → 0; above → full black ink."""
    im = im.convert("RGBA")
    px = im.load()
    assert px is not None
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < cutoff:
                px[x, y] = (0, 0, 0, 0)
            else:
                # snap to crisp black with mild AA retained above cutoff
                px[x, y] = (0, 0, 0, 255 if a > 200 else a)
    return im


def trim(im: Image.Image, pad: int = 4) -> Image.Image:
    bbox = im.split()[-1].getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def invert_white(im: Image.Image) -> Image.Image:
    a = im.split()[-1]
    white = Image.new("L", im.size, 255)
    return Image.merge("RGBA", (white, white, white, a))


def tint_orange(im: Image.Image, rgb=(245, 132, 31)) -> Image.Image:
    a = im.split()[-1]
    c = Image.new("RGBA", im.size, (*rgb, 255))
    c.putalpha(a)
    return c


def square_pad(im: Image.Image, size: int) -> Image.Image:
    fitted = im.copy()
    fitted.thumbnail((size, size), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(
        fitted,
        ((size - fitted.width) // 2, (size - fitted.height) // 2),
        fitted,
    )
    return canvas


def compose_lockup(mark: Image.Image, word: Image.Image, gap: int = 18) -> Image.Image:
    # Match heights
    target_h = max(mark.height, word.height)
    m = mark.copy()
    w = word.copy()
    m.thumbnail((int(mark.width * target_h / mark.height), target_h), Image.Resampling.LANCZOS)
    w.thumbnail((int(word.width * target_h / word.height), target_h), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (m.width + gap + w.width, target_h), (0, 0, 0, 0))
    canvas.paste(m, (0, (target_h - m.height) // 2), m)
    canvas.paste(w, (m.width + gap, (target_h - w.height) // 2), w)
    return canvas


def main() -> None:
    mark = hard_clean(trim(extract_ink(Image.open(MARK_SRC), ink_max_lum=160), pad=8), cutoff=40)
    mark.save(BRAND / "mark-black.png", optimize=True)
    invert_white(mark).save(BRAND / "mark-white.png", optimize=True)
    tint_orange(mark).save(BRAND / "mark-orange.png", optimize=True)

    lock_src = next(p for p in LOCK_CANDIDATES if p.exists())
    lock_raw = hard_clean(trim(extract_ink(Image.open(lock_src), ink_max_lum=165), pad=6), cutoff=48)

    # Split mark vs wordmark from lockup columns
    w, h = lock_raw.size
    alpha = lock_raw.split()[-1]
    cols = [sum(1 for y in range(h) if alpha.getpixel((x, y)) > 40) for x in range(w)]
    seen = False
    gap_start = None
    for x, ink in enumerate(cols):
        if ink > h * 0.08:
            seen = True
        elif seen and ink < h * 0.015:
            gap_start = x
            break
    if gap_start is None:
        raise SystemExit("could not find mark/word gap")

    wm_start = gap_start
    while wm_start < w and cols[wm_start] < h * 0.015:
        wm_start += 1

    mark_from_lock = hard_clean(trim(lock_raw.crop((0, 0, gap_start, h)), pad=2), cutoff=48)
    word = hard_clean(trim(lock_raw.crop((wm_start, 0, w, h)), pad=2), cutoff=48)
    # Prefer dedicated mark source (cleaner) over crop
    mark_for_lock = mark.copy()
    mark_for_lock.thumbnail((word.height, word.height), Image.Resampling.LANCZOS)

    lock = compose_lockup(mark_for_lock, word, gap=max(14, word.height // 5))
    lock = hard_clean(lock, cutoff=40)

    lock.save(BRAND / "logo-lockup.png", optimize=True)
    invert_white(lock).save(BRAND / "logo-lockup-white.png", optimize=True)
    word.save(BRAND / "wordmark-black.png", optimize=True)
    invert_white(word).save(BRAND / "wordmark-white.png", optimize=True)

    for name, sz in [
        ("logo-header.png", (480, 120)),
        ("logo-footer.png", (360, 90)),
        ("logo-lockup@2x.png", (960, 240)),
    ]:
        t = lock.copy()
        t.thumbnail(sz, Image.Resampling.LANCZOS)
        t.save(BRAND / name, optimize=True)

    for name, sz in [
        ("tensora-mark-black.png", 256),
        ("tensora-mark-black-1024.png", 1024),
    ]:
        square_pad(mark, sz).save(BRAND / name, optimize=True)
    for name, sz in [
        ("tensora-mark-white.png", 256),
        ("tensora-mark-white-1024.png", 1024),
    ]:
        square_pad(invert_white(mark), sz).save(BRAND / name, optimize=True)

    import base64

    for svg_name, png_name in [
        ("tensora-mark.svg", "mark-black.png"),
        ("tensora-mark-white.svg", "mark-white.png"),
    ]:
        png = (BRAND / png_name).read_bytes()
        mw, mh = Image.open(BRAND / png_name).size
        b64 = base64.b64encode(png).decode("ascii")
        (BRAND / svg_name).write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {mw} {mh}">'
            f'<image href="data:image/png;base64,{b64}" width="{mw}" height="{mh}"/></svg>\n',
            encoding="utf-8",
        )

    for sz, name in [
        (48, "favicon-48x48.png"),
        (72, "favicon-72x72.png"),
        (96, "favicon-96x96.png"),
        (144, "favicon-144x144.png"),
        (192, "favicon-192x192.png"),
        (256, "favicon-256x256.png"),
        (384, "favicon-384x384.png"),
        (512, "favicon-512x512.png"),
    ]:
        square_pad(mark, sz).save(FAV / name, optimize=True)
    square_pad(mark, 180).save(FAV / "apple-touch-icon.png", optimize=True)
    square_pad(mark, 512).save(FAV / "favicon-light.png", optimize=True)
    square_pad(invert_white(mark), 512).save(FAV / "favicon-dark.png", optimize=True)
    icos = [square_pad(mark, s) for s in (16, 32, 48)]
    icos[0].save(
        FAV / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=icos[1:],
    )
    if LANDING.exists():
        square_pad(mark, 32).save(LANDING / "favicon-32.png", optimize=True)
        square_pad(mark, 192).save(LANDING / "favicon-192.png", optimize=True)
        (LANDING / "brand-logo.png").write_bytes((BRAND / "logo-lockup.png").read_bytes())

    # Stats
    for n in ["mark-black.png", "logo-lockup.png", "wordmark-black.png"]:
        im = Image.open(BRAND / n).convert("RGBA")
        px = im.load()
        assert px is not None
        clear = semi = opaque = 0
        for y in range(im.height):
            for x in range(im.width):
                a = px[x, y][3]
                if a == 0:
                    clear += 1
                elif a < 250:
                    semi += 1
                else:
                    opaque += 1
        print(f"{n}: {im.size} clear={clear} opaque={opaque} semi={semi}")


if __name__ == "__main__":
    main()

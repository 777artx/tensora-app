"""Crop the wave mark, recolor to brand blue / ice, and write favicons + SVGs."""
import base64
import io
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\thepa\.cursor\projects\c-Users-thepa-The-Network\assets"
    r"\c__Users_thepa_AppData_Roaming_Cursor_User_workspaceStorage_223a0e40094cad37528c06ecf4968757_images_image-7d8278b3-0443-4ef4-a898-b14b2ecbe399.png"
)
ROOT = Path(r"C:\Users\thepa\The Network")
APP = ROOT / "tensora-app" / "public"
LAND = ROOT / "unkey-local"

BLUE = (0x3B, 0x69, 0xF3)
ICE = (0xE3, 0xFE, 0xFF)


def crop_mark() -> Image.Image:
    im = Image.open(SRC).convert("RGBA")
    w, h = im.size
    px = im.load()
    minx, miny, maxx, maxy = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r + g + b > 90:
                minx, miny = min(minx, x), min(miny, y)
                maxx, maxy = max(maxx, x), max(maxy, y)
    pad = 8
    return im.crop((max(0, minx - pad), max(0, miny - pad), min(w, maxx + pad), min(h, maxy + pad)))


def recolor(im: Image.Image, rgb: tuple[int, int, int]) -> Image.Image:
    out = Image.new("RGBA", im.size)
    src = im.load()
    dst = out.load()
    for y in range(im.size[1]):
        for x in range(im.size[0]):
            r, g, b, a = src[x, y]
            # The source is the mark on black. Brightness is the coverage.
            lum = max(r, g, b)
            if lum < 28:
                dst[x, y] = (0, 0, 0, 0)
            else:
                alpha = min(255, int((lum - 28) * 255 / (255 - 28)))
                dst[x, y] = (*rgb, alpha)
    return out


def png_bytes(im: Image.Image) -> bytes:
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def svg_wrap(png: bytes, w: int, h: int) -> str:
    b64 = base64.b64encode(png).decode()
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">'
        f'<image href="data:image/png;base64,{b64}" width="{w}" height="{h}"/></svg>'
    )


def square(mark: Image.Image, size: int, bg: tuple[int, int, int] | None) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (*bg, 255) if bg else (0, 0, 0, 0))
    pad = int(size * 0.16)
    box = size - pad * 2
    fitted = mark.copy()
    fitted.thumbnail((box, box), Image.Resampling.LANCZOS)
    x = (size - fitted.size[0]) // 2
    y = (size - fitted.size[1]) // 2
    canvas.alpha_composite(fitted, (x, y))
    return canvas


def main() -> None:
    raw = crop_mark()
    blue = recolor(raw, BLUE)
    ice = recolor(raw, ICE)
    w, h = blue.size

    brand = APP / "brand"
    brand.mkdir(parents=True, exist_ok=True)
    blue.save(brand / "olora-mark.png")
    ice.save(brand / "olora-mark-ice.png")
    (brand / "tensora-mark.svg").write_text(svg_wrap(png_bytes(blue), w, h), encoding="utf-8")
    (brand / "tensora-mark-white.svg").write_text(svg_wrap(png_bytes(ice), w, h), encoding="utf-8")

    land_brand = LAND / "images" / "brand"
    land_brand.mkdir(parents=True, exist_ok=True)
    blue.save(land_brand / "mark.png")
    (land_brand / "mark.svg").write_text(svg_wrap(png_bytes(blue), w, h), encoding="utf-8")

    sizes = [16, 32, 48, 72, 96, 144, 180, 192, 256, 384, 512]
    for folder in (APP / "favicon", LAND / "favicon"):
        folder.mkdir(parents=True, exist_ok=True)
        for s in sizes:
            square(blue, s, None).save(folder / f"favicon-{s}x{s}.png")
        square(blue, 180, (255, 255, 255)).save(folder / "apple-touch-icon.png")
        square(blue, 32, None).save(folder / "favicon-32.png")
        ico_sizes = [square(blue, s, None) for s in (16, 32, 48)]
        ico_sizes[0].save(folder / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=ico_sizes[1:])
        (folder / "favicon-light.svg").write_text(svg_wrap(png_bytes(square(blue, 512, None)), 512, 512), encoding="utf-8")
        (folder / "favicon-dark.svg").write_text(svg_wrap(png_bytes(square(ice, 512, (10, 10, 10))), 512, 512), encoding="utf-8")

    icon = APP / "landing" / "icons"
    icon.mkdir(parents=True, exist_ok=True)
    (icon / "favicon.svg").write_text(svg_wrap(png_bytes(square(blue, 64, None)), 64, 64), encoding="utf-8")
    square(blue, 32, None).save(icon / "favicon-32.png")
    print("mark", w, h)


if __name__ == "__main__":
    main()

"""Extract exact SmartWrite logo assets from the brand identity sheet."""
from PIL import Image, ImageFilter
import os

SRC = r"C:\Users\nazia\.cursor\projects\e-projects-AI-Projects-smartwrite\assets\c__Users_nazia_AppData_Roaming_Cursor_User_workspaceStorage_3cb7d4097535ede2bf945174fccbeb12_images_image-0aa8cee5-cb7a-4e97-b791-4d139057f6a3.jpg"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images")


def make_transparent(im: Image.Image, thresh=238) -> Image.Image:
    im = im.convert("RGBA")
    pixels = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # White / near-white paper background
            if r >= thresh and g >= thresh and b >= thresh:
                pixels[x, y] = (255, 255, 255, 0)
            # Light gray labels like "FAVICON"
            elif abs(r - g) < 12 and abs(g - b) < 12 and r > 170:
                pixels[x, y] = (255, 255, 255, 0)
    return im


def trim_alpha(im: Image.Image, pad=6) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def square_pad(im: Image.Image, pad=10) -> Image.Image:
    side = max(im.size) + pad * 2
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - im.width) // 2, (side - im.height) // 2), im)
    return canvas


def main():
    sheet = Image.open(SRC).convert("RGBA")
    print("sheet", sheet.size)

    # Icon from top horizontal logo (left) — include full SW + motion + pen
    top = sheet.crop((18, 28, 270, 200))
    icon = make_transparent(top, thresh=235)
    icon = trim_alpha(icon, pad=4)
    icon = square_pad(icon, pad=10)
    mark_path = os.path.join(OUT, "smartwrite-mark.png")
    icon.save(mark_path)
    print("mark", icon.size, "->", mark_path)

    for px in (64, 128, 256):
        icon.resize((px, px), Image.Resampling.LANCZOS).save(
            os.path.join(OUT, f"smartwrite-mark-{px}.png")
        )

    # Full horizontal lockup
    lockup = make_transparent(sheet.crop((20, 20, 1000, 200)), thresh=235)
    lockup = trim_alpha(lockup, pad=6)
    lockup_path = os.path.join(OUT, "smartwrite-lockup.png")
    lockup.save(lockup_path)
    print("lockup", lockup.size, "->", lockup_path)

    # Wordmark + tagline (no icon)
    wm_x = int(lockup.width * 0.26)
    wordmark = trim_alpha(lockup.crop((wm_x, 0, lockup.width, lockup.height)), pad=4)
    wm_path = os.path.join(OUT, "smartwrite-wordmark.png")
    wordmark.save(wm_path)
    print("wordmark", wordmark.size, "->", wm_path)

    # Wordmark without tagline (top ~72% of wordmark height)
    cut = int(wordmark.height * 0.72)
    title_only = trim_alpha(wordmark.crop((0, 0, wordmark.width, cut)), pad=2)
    title_path = os.path.join(OUT, "smartwrite-title.png")
    title_only.save(title_path)
    print("title", title_only.size, "->", title_path)


if __name__ == "__main__":
    main()

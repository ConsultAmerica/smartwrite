"""Crop clean logo assets — keep white background (no hole-punching)."""
from PIL import Image
import os

# Prefer the full brand sheet if available; fall back to the clean horizontal PNG
SHEET = r"C:\Users\nazia\.cursor\projects\e-projects-AI-Projects-smartwrite\assets\c__Users_nazia_AppData_Roaming_Cursor_User_workspaceStorage_3cb7d4097535ede2bf945174fccbeb12_images_image-f7b51d95-6a20-45d5-ad29-21b8efa1dfea.jpg"
CLEAN = r"C:\Users\nazia\.cursor\projects\e-projects-AI-Projects-smartwrite\assets\c__Users_nazia_AppData_Roaming_Cursor_User_workspaceStorage_3cb7d4097535ede2bf945174fccbeb12_images_image-53b2031b-12c2-43fa-9e4d-7f05f4e60a18.png"
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "images")


def main():
    os.makedirs(OUT, exist_ok=True)

    # Use the clean horizontal logo the user provided (full W, full title)
    clean = Image.open(CLEAN).convert("RGBA")
    print("clean", clean.size)

    # Pad so nothing clips at edges when scaled
    pad = 16
    padded = Image.new("RGBA", (clean.width + pad * 2, clean.height + pad * 2), (255, 255, 255, 255))
    padded.paste(clean, (pad, pad), clean if clean.mode == "RGBA" else None)
    # If paste with mask fails on RGB, just paste
    if clean.mode != "RGBA":
        padded.paste(clean, (pad, pad))
    else:
        # composite onto white
        base = Image.new("RGBA", padded.size, (255, 255, 255, 255))
        base.paste(clean, (pad, pad), clean)
        padded = base

    lockup_path = os.path.join(OUT, "smartwrite-lockup.png")
    padded.save(lockup_path)
    print("lockup", padded.size)

    # Split icon / wordmark by fixed ratio on the clean lockup
    # Icon ~ left 20% including full SW mark
    split = int(padded.width * 0.20)
    # Ensure we don't cut into SmartWrite — scan for gap
    px = padded.load()
    w, h = padded.size

    def col_ink(x):
        ink = 0
        for y in range(h):
            r, g, b, a = px[x, y]
            if a < 10:
                continue
            # Non-white pixel
            if r < 245 or g < 245 or b < 245:
                ink += 1
        return ink

    # Find gap after icon: columns with little ink after a dense region
    best_split = split
    dense = False
    gap_run = 0
    for x in range(int(w * 0.12), int(w * 0.35)):
        ink = col_ink(x)
        if ink > h * 0.08:
            dense = True
            gap_run = 0
        elif dense:
            gap_run += 1
            if gap_run >= 6:
                best_split = x - 2
                break
    print("split", best_split)

    # Icon crop with generous padding — full height
    icon = padded.crop((0, 0, best_split, h))
    # Square canvas, white bg
    side = max(icon.size) + 20
    mark = Image.new("RGBA", (side, side), (255, 255, 255, 255))
    mark.paste(icon, ((side - icon.width) // 2, (side - icon.height) // 2))
    mark_path = os.path.join(OUT, "smartwrite-mark.png")
    mark.save(mark_path)
    print("mark", mark.size)
    for px_size in (64, 128, 256):
        mark.resize((px_size, px_size), Image.Resampling.LANCZOS).save(
            os.path.join(OUT, f"smartwrite-mark-{px_size}.png")
        )

    # Wordmark with padding — never crop W
    word = padded.crop((best_split, 0, w, h))
    # Extra left pad so W speed-lines aren't flush to edge
    word_pad = Image.new("RGBA", (word.width + 12, word.height + 8), (255, 255, 255, 255))
    word_pad.paste(word, (8, 4))
    word_path = os.path.join(OUT, "smartwrite-wordmark.png")
    word_pad.save(word_path)
    print("wordmark", word_pad.size)

    # Title only (no tagline) — keep top ~70%
    cut = int(word_pad.height * 0.72)
    title = word_pad.crop((0, 0, word_pad.width, cut))
    title_path = os.path.join(OUT, "smartwrite-title.png")
    title.save(title_path)
    print("title", title.size)

    # Also try sheet ICON ONLY if sheet exists and is tall enough
    try:
        sheet = Image.open(SHEET).convert("RGBA")
        print("sheet", sheet.size)
        if sheet.height > 400:
            iw, ih = sheet.size
            icon_only = sheet.crop((int(iw * 0.70), int(ih * 0.48), int(iw * 0.97), int(ih * 0.78)))
            icon_only = icon_only.resize((256, 256), Image.Resampling.LANCZOS)
            icon_only.save(os.path.join(OUT, "smartwrite-mark-sheet.png"))
            print("saved sheet icon alt")
    except Exception as e:
        print("sheet skip", e)


if __name__ == "__main__":
    main()

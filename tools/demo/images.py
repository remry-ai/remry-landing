"""Screenshot and poster sizes for the page: <name>-800/1600.webp, -1600.png and the phone -m.webp."""
import sys
from PIL import Image
out, dest = sys.argv[1], sys.argv[2]
Image.open(f"{out}/poster.png").convert("RGB").save(f"{dest}/demo-poster.webp", "WEBP", quality=85)
Image.open(f"{out}/poster.png").convert("RGB").resize((960, 600), Image.LANCZOS).save(f"{dest}/demo-poster.png", optimize=True)
Image.open(f"{out}/poster-m.png").convert("RGB").save(f"{dest}/demo-poster-m.webp", "WEBP", quality=85)
for n in ["org-map", "person", "goal", "doc-charts", "home", "wiki-page"]:
    im = Image.open(f"{out}/{n}.png").convert("RGB")
    for w in (800, 1600):
        r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
        r.save(f"{dest}/{n}-{w}.webp", "WEBP", quality=82, method=6)
        if w == 1600:
            r.save(f"{dest}/{n}-1600.png", optimize=True)
    m = Image.open(f"{out}/{n}-m.png").convert("RGB")
    m.save(f"{dest}/{n}-m.webp", "WEBP", quality=82, method=6)
    print(n, im.size, m.size)

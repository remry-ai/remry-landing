"""Turns record.js's frames into an ffmpeg concat list: real timings played back `slow` times
faster, and a short crossfade wherever the recording cut (a page load, or a wait on the CLI)."""
import json, os, sys
from PIL import Image

FADE_FRAMES, FPS = 9, 30  # a 0.3 s crossfade
src, out_list = sys.argv[1], sys.argv[2]
data = json.load(open(src))
slow, shots = data["slow"], data["shots"]
blend_dir = os.path.join(os.path.dirname(src), os.path.basename(src).replace(".json", "-fades"))
os.makedirs(blend_dir, exist_ok=True)

# Drop torn frames: the browser sometimes returns a frame that's only partly redrawn (half the
# old screen, half the new), which shows as a flash. Such a frame differs sharply from both
# neighbours while they match each other; its time goes to the frame before it.
from PIL import ImageChops, ImageStat
def small(f): return Image.open(f).convert("L").resize((96, 96))
def diff(a, b): return ImageStat.Stat(ImageChops.difference(a, b)).mean[0]
thumbs = [small(s["f"]) for s in shots]
torn = set()
for i in range(1, len(shots) - 1):
    if shots[i].get("cut") or shots[i + 1].get("cut"):
        continue
    d_prev, d_next, d_skip = diff(thumbs[i - 1], thumbs[i]), diff(thumbs[i], thumbs[i + 1]), diff(thumbs[i - 1], thumbs[i + 1])
    if min(d_prev, d_next) > 2 * d_skip + 1.5:
        torn.add(i)
shots = [s for i, s in enumerate(shots) if i not in torn]

entries = []  # (file, seconds)
for i, s in enumerate(shots):
    if s.get("cut") and i > 0:
        a = Image.open(shots[i - 1]["f"]).convert("RGB")
        b = Image.open(s["f"]).convert("RGB")
        if a.size == b.size:
            for k in range(1, FADE_FRAMES + 1):
                f = os.path.join(blend_dir, f"{i:05d}-{k}.jpg")
                Image.blend(a, b, k / (FADE_FRAMES + 1)).save(f, quality=88)
                entries.append((f, 1 / FPS))
    nxt = shots[i + 1]["t"] if i + 1 < len(shots) else s["t"] + 40
    entries.append((s["f"], max((nxt - s["t"]) / 1000 / slow, 1 / FPS)))

with open(out_list, "w") as fh:
    for f, d in entries:
        fh.write(f"file '{f}'\nduration {d:.4f}\n")
    fh.write(f"file '{entries[-1][0]}'\n")
print(f"{len(torn)} torn frames dropped, {len(shots)} frames, {sum(1 for s in shots if s.get('cut'))} crossfades, {sum(d for _, d in entries):.1f}s")

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
print(f"{len(shots)} frames, {sum(1 for s in shots if s.get('cut'))} crossfades, {sum(d for _, d in entries):.1f}s")

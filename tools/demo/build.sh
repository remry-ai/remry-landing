#!/bin/sh
# Builds both demos and the stills, then writes everything the page uses into public/images.
# Needs a Remry clone (REMRY_REPO, default ../remry beside this repo) with `bun install` and `bunx prisma generate` run,
# Playwright, ffmpeg and Python 3 with Pillow.
#
# The demo is a storyboard (story.html): each example's prompt, then the pieces of the app it
# changed, cut from the finished notebook (finish.py, crops.js) and drawn frame by frame (story.js).
set -e
D=$(cd "$(dirname "$0")" && pwd); OUT=$D/.out; I=$D/../../public/images
"$D/fresh.sh" && python3 "$D/finish.py" && mkdir -p "$OUT"
rm -rf "$OUT/crops" && node "$D/crops.js" "$OUT" && node "$D/shots.js" "$OUT"
node "$D/story.js" desktop "$OUT" && node "$D/story.js" phone "$OUT"
ffmpeg -loglevel error -y -framerate 30 -i "$OUT/story-desktop/%05d.jpg" -vf "format=yuv420p" -an -movflags +faststart -c:v libx264 -crf 22 -preset slow "$I/demo.mp4"
ffmpeg -loglevel error -y -framerate 30 -i "$OUT/story-phone/%05d.jpg" -vf "format=yuv420p" -an -movflags +faststart -c:v libx264 -crf 22 -preset slow "$I/demo-m.mp4"
ffmpeg -loglevel error -y -i "$I/demo.mp4" -vf "fps=10,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=none" "$I/demo.gif"
# The poster is the first example with its pieces in place.
ffmpeg -loglevel error -y -i "$OUT/story-desktop/00165.jpg" "$OUT/poster.png"
ffmpeg -loglevel error -y -i "$OUT/story-phone/00165.jpg" "$OUT/poster-m.png"
python3 -I "$D/images.py" "$OUT" "$I"
python3 -I "$D/../version.py"
fuser -k 5173/tcp >/dev/null 2>&1 || true
echo "Done. Check the images, then commit public/images."

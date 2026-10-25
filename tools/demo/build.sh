#!/bin/sh
# Records both demos and takes the stills, then writes everything the page uses into public/images.
# Needs a Remry clone (REMRY_REPO, default ../remry beside this repo) with `bun install` and `bunx prisma generate` run,
# Playwright, ffmpeg and Python 3 with Pillow.
set -e
D=$(cd "$(dirname "$0")" && pwd); OUT=$D/.out; I=$D/../../public/images
"$D/fresh.sh" && mkdir -p "$OUT" && node "$D/record.js" desktop "$OUT"
"$D/fresh.sh" && node "$D/record.js" phone "$OUT" && node "$D/shots.js" "$OUT"
# Both are 2x frames with page loads left out (record.js), stitched at their recorded timings.
ffmpeg -loglevel error -y -f concat -safe 0 -i "$OUT/frames-desktop.txt" -vf "fps=25,format=yuv420p" -an -movflags +faststart -c:v libx264 -crf 26 -preset slow -tune stillimage "$I/demo.mp4"
ffmpeg -loglevel error -y -f concat -safe 0 -i "$OUT/frames-phone.txt" -vf "fps=25,format=yuv420p" -an -movflags +faststart -c:v libx264 -crf 25 -preset slow -tune stillimage "$I/demo-m.mp4"
ffmpeg -loglevel error -y -i "$I/demo.mp4" -vf "fps=8,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64[p];[b][p]paletteuse=dither=none" "$I/demo.gif"
ffmpeg -loglevel error -y -ss 0.8 -i "$I/demo.mp4" -frames:v 1 "$OUT/poster.png"
ffmpeg -loglevel error -y -ss 0.8 -i "$I/demo-m.mp4" -frames:v 1 "$OUT/poster-m.png"
python3 -I "$D/images.py" "$OUT" "$I"
fuser -k 5173/tcp >/dev/null 2>&1 || true
echo "Done. Check the images, then commit public/images."

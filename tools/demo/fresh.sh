#!/bin/sh
# Fresh demo notebook in tools/demo/.data, and the Remry dev server on 127.0.0.1:5173 running against it.
set -e
D=$(cd "$(dirname "$0")" && pwd)
REPO=${REMRY_REPO:-$D/../../../remry}
export PATH=$HOME/.bun/bin:$PATH XDG_DATA_HOME=$D/.data
fuser -k 5173/tcp >/dev/null 2>&1 || true
sleep 1
rm -rf "$XDG_DATA_HOME"; mkdir -p "$XDG_DATA_HOME"
cd "$REPO"
bin/remry notebook.list >/dev/null 2>&1
bin/remry notebook.create --name Work --id work --profile work 2>/dev/null | grep -q '"ok": true'
bin/remry notebook.setDefault --id work 2>/dev/null | grep -q '"ok": true'
python3 "$D/seed.py"
nohup bun run dev > "$D/.data/dev.log" 2>&1 &
for i in $(seq 1 60); do curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:5173/app 2>/dev/null | grep -q 200 && break; sleep 1; done
curl -s -o /dev/null -w "server %{http_code}\n" http://127.0.0.1:5173/app

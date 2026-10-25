"""Call the Remry CLI against the scratch data folder and return its value."""
import json, os, subprocess, sys
REPO = os.environ.get("REMRY_REPO", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "remry"))
ENV = dict(os.environ, PATH=os.path.expanduser("~/.bun/bin") + ":" + os.environ["PATH"],
           XDG_DATA_HOME=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".data"))
def call(proc, **inp):
    r = subprocess.run([f"{REPO}/bin/remry", proc, "--input", json.dumps(inp)], cwd=REPO, env=ENV,
                       capture_output=True, text=True)
    try:
        out = json.loads(r.stdout)
    except json.JSONDecodeError:
        sys.exit(f"{proc}: {r.stdout[-500:]} {r.stderr[-800:]}")
    if not out.get("ok"):
        sys.exit(f"{proc} {inp}: {out}")
    return out["value"]

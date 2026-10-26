"""Stamps each local asset link in the site with a hash of the file (/images/demo.mp4?v=3f9a1c2e).

Images are cached for a week (public/_headers), so a changed file needs a new URL to reach people
who already have the old one. The hash only changes when the file does, so unchanged files stay
cached. Safe to run again: it replaces the stamp that's there. python3 tools/version.py
"""
import hashlib, os, re

PUBLIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public")
PAGES = ["main.js", "index.html", "404.html"]  # main.js first: the pages link to it
LINK = re.compile(r"(/(?:images|icons)/[\w.-]+|/(?:styles\.css|main\.js|analytics\.js))(?:\?v=[0-9a-f]+)?")
seen = {}

def stamp(m):
    path = m.group(1)
    f = os.path.join(PUBLIC, path.lstrip("/"))
    if not os.path.isfile(f):
        return m.group(0)
    if path not in seen:
        seen[path] = hashlib.sha256(open(f, "rb").read()).hexdigest()[:8]
    return f"{path}?v={seen[path]}"

def stamp_any(m):
    return stamp(re.match(LINK, m.group(0)))

for page in PAGES:
    f = os.path.join(PUBLIC, page)
    if not os.path.isfile(f):
        continue
    text = open(f).read()
    # Absolute URLs (og:image) stay as they are: social sites cache by their own rules.
    # Only links in attributes and strings: after a quote, or after ", " in a srcset list.
    new = re.sub(r"(?<=[\"'])" + LINK.pattern + "|(?<=, )" + LINK.pattern, stamp_any, text)
    if new != text:
        open(f, "w").write(new)
        print("stamped", page)
print(len(seen), "files")

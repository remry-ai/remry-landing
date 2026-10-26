// Cuts the pieces of the app each demo example changed, from the finished notebook (finish.py), at 3x.
// node crops.js <out-dir>  →  <out-dir>/crops/<name>.png and crops.json (each crop's size and highlight)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = path.join(process.argv[2] || '.', 'crops');
const BASE = 'http://127.0.0.1:5173';
const ids = JSON.parse(fs.readFileSync(path.join(__dirname, 'ids.json'), 'utf8'));

const expandPriya = async (p) => {
  await p.locator(`li:has(> .node[data-person-id="${ids['Priya Shah']}"]) > button.count`).click();
  await p.waitForTimeout(500);
};
const box = async (p, sel) => p.locator(sel).first().boundingBox();

// Each crop: the page, the rectangle (CSS pixels in a 1280×800 window, panel 380 wide), and
// optionally what to ring in it.
const CROPS = [
  { name: 'org-chart', path: '/app/orgmap', before: expandPriya, clip: { x: 452, y: 388, width: 376, height: 228 },
    hl: (p) => box(p, `.node[data-person-id="${ids['Dana Park']}"]`) },
  { name: 'dana-groups', path: `/app/people/${ids['Dana Park']}`, clip: { x: 20, y: 340, width: 420, height: 98 } },
  { name: 'dana-todo', path: `/app/people/${ids['Dana Park']}`, clip: { x: 902, y: 54, width: 378, height: 84 } },
  { name: 'dana-note', path: `/app/people/${ids['Dana Park']}`, clip: { x: 902, y: 160, width: 378, height: 90 } },
  { name: 'sr-head', path: `/app/projects/${ids['Search rewrite']}`, clip: { x: 20, y: 78, width: 300, height: 34 } },
  { name: 'sr-panel', path: `/app/projects/${ids['Search rewrite']}`, clip: { x: 902, y: 54, width: 378, height: 166 } },
  { name: 'timeline', path: '/app/projects', clip: { x: 32, y: 365, width: 836, height: 149 },
    hl: async () => ({ x: 34, y: 466, width: 832, height: 46 }) },
  { name: 'goal-head', path: `/app/goals/${ids['Cut p95 latency to 200ms']}`, clip: { x: 20, y: 80, width: 360, height: 32 } },
  { name: 'goal-progress', path: `/app/goals/${ids['Cut p95 latency to 200ms']}`, clip: { x: 20, y: 262, width: 850, height: 66 } },
  { name: 'goal-chart', path: `/app/goals/${ids['Cut p95 latency to 200ms']}`, clip: { x: 24, y: 340, width: 620, height: 300 } },
  { name: 'goal-checkins', path: `/app/goals/${ids['Cut p95 latency to 200ms']}`, clip: { x: 24, y: 664, width: 520, height: 120 },
    hl: async () => ({ x: 26, y: 698, width: 450, height: 26 }) },
  { name: 'doc-delivery', path: `/app/groups/${ids.Platform}?doc=${ids['Q3 review']}`, clip: { x: 33, y: 398, width: 640, height: 348 } },
  { name: 'doc-reliability', path: `/app/groups/${ids.Platform}?doc=${ids['Q3 review']}`, clip: { x: 33, y: 800, width: 640, height: 345 } },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 }); // 3x, since story.html enlarges some
  await ctx.addInitScript(() => { try { localStorage.setItem('remry:panel-width', '380'); } catch { /* none */ } });
  const p = await ctx.newPage();
  const meta = {};
  for (const c of CROPS) {
    await p.goto(BASE + c.path, { waitUntil: 'networkidle' });
    await p.waitForTimeout(900);
    if (c.before) await c.before(p);
    await p.evaluate(() => document.activeElement?.blur());
    await p.screenshot({ path: path.join(OUT, `${c.name}.png`), clip: c.clip, fullPage: true });
    const h = c.hl ? await c.hl(p) : null;
    meta[c.name] = { w: c.clip.width, h: c.clip.height,
      hl: h && { x: h.x - c.clip.x, y: h.y - c.clip.y, w: h.width, h: h.height } };
  }
  fs.writeFileSync(path.join(OUT, 'crops.json'), JSON.stringify(meta, null, 1));
  await b.close();
  console.log('crops done', Object.keys(meta).length);
})().catch((e) => { console.error(e); process.exit(1); });

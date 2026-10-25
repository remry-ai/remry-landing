// Still screenshots of the finished demo notebook, for the landing page.
// node shots.js <out-dir>  →  <name>.png (1280×800 at 2x) and <name>-m.png (390 wide at 2x)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const OUT = process.argv[2] || '.';
const BASE = 'http://127.0.0.1:5173';
const ids = JSON.parse(fs.readFileSync(path.join(__dirname, 'ids.json'), 'utf8'));

const expandPriya = async (p) => {
  await p.locator(`li:has(> .node[data-person-id="${ids['Priya Shah']}"]) > button.count`).click();
  await p.waitForTimeout(400);
};
const scrollTo = (sel, block = 'start') => async (p) => {
  await p.evaluate(([s, b]) => document.querySelector(s)?.scrollIntoView({ block: b }), [sel, block]);
  await p.waitForTimeout(400);
};
const openPanel = async (p) => { await p.locator('.drawer-toggle.right-toggle').click(); await p.waitForTimeout(700); };

const SHOTS = [
  { name: 'org-map', path: '/app/orgmap', both: expandPriya, phone: scrollTo('.level', 'start'), h: 620 },
  { name: 'person', path: `/app/people/${ids['Dana Park']}`, phone: openPanel, h: 560 },
  { name: 'goal', path: `/app/goals/${ids['Cut p95 latency to 200ms']}`, h: 780 },
  { name: 'doc-charts', path: `/app/groups/${ids.Platform}?doc=${ids['Q3 review']}`, phone: scrollTo('canvas', 'center'), h: 700 },
  { name: 'home', path: '/app', h: 700 },
  { name: 'wiki-page', path: `/app/wiki/${ids.Datadog}`, h: 640 },
];

(async () => {
  const b = await chromium.launch();
  for (const phone of [false, true]) {
    for (const s of SHOTS) {
      const ctx = await b.newContext({
        viewport: phone ? { width: 390, height: s.h } : { width: 1280, height: 800 },
        deviceScaleFactor: 2, isMobile: phone, hasTouch: phone,
      });
      const p = await ctx.newPage();
      await p.goto(BASE + s.path, { waitUntil: 'networkidle' });
      await p.waitForTimeout(900);
      if (s.both) await s.both(p);
      if (phone && s.phone) await s.phone(p);
      await p.waitForTimeout(500);
      await p.screenshot({ path: path.join(OUT, `${s.name}${phone ? '-m' : ''}.png`) });
      await ctx.close();
    }
  }
  await b.close();
  console.log('shots done');
})().catch((e) => { console.error(e); process.exit(1); });

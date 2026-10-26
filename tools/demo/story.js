// Draws story.html frame by frame at 2x: node story.js desktop|phone <out-dir> → <out-dir>/story-<mode>/%05d.jpg
// Each frame is render(t) then a screenshot, so playback is exactly 30 fps with nothing half drawn.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const MODE = process.argv[2] || 'desktop';
const OUT = path.join(process.argv[3] || '.', `story-${MODE}`);
const FPS = 30;
const viewport = MODE === 'phone' ? { width: 390, height: 660 } : { width: 960, height: 640 };

(async () => {
  fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 2 });
  const meta = fs.readFileSync(path.join(process.argv[3] || '.', 'crops', 'crops.json'), 'utf8');
  await ctx.addInitScript((m) => { window.__META = JSON.parse(m); }, meta);
  const p = await ctx.newPage();
  await p.goto(`file://${path.join(__dirname, 'story.html')}?mode=${MODE}`);
  const total = await p.evaluate(() => window.ready);
  const n = Math.round(total * FPS);
  for (let i = 0; i < n; i++) {
    await p.evaluate((t) => window.render(t), i / FPS);
    await p.screenshot({ path: path.join(OUT, `${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  }
  await b.close();
  console.log(MODE, n, 'frames', total.toFixed(1) + 's');
})().catch((e) => { console.error(e); process.exit(1); });

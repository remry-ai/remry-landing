// Records the landing page demo against the scratch notebook (seeded by reset.sh).
// node record.js desktop|phone <out-dir>
// Each scene types a prompt into a "You → Claude" bubble, makes the change with the
// Remry CLI (what Claude does over MCP), then reloads to show the result.
const { chromium } = require('playwright');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

const MODE = process.argv[2] || 'desktop';
const OUT = process.argv[3] || '.';
const PHONE = MODE === 'phone';
const BASE = 'http://127.0.0.1:5173';
const DATA = path.join(__dirname, '.data');
const REPO = process.env.REMRY_REPO || path.join(__dirname, '..', '..', '..', 'remry');
const ids = JSON.parse(fs.readFileSync(path.join(__dirname, 'ids.json'), 'utf8'));

const remry = (proc, input) => new Promise((resolve, reject) => {
  execFile(path.join(REPO, 'bin', 'remry'), [proc, '--input', JSON.stringify(input)], {
    cwd: REPO,
    env: { ...process.env, PATH: `${process.env.HOME}/.bun/bin:${process.env.PATH}`, XDG_DATA_HOME: DATA },
  }, (err, stdout) => {
    let r; try { r = JSON.parse(stdout); } catch { return reject(new Error(`${proc}: ${stdout} ${err}`)); }
    return r.ok ? resolve(r.value) : reject(new Error(`${proc}: ${JSON.stringify(r.error)}`));
  });
});
// Start Claude's changes, type the prompt meanwhile, then wait for them.
let pauseFor = async (p) => p; // set once capture exists
const during = async (typing, work) => { const job = work(); await typing; return pauseFor(job); };

// The bubble, caption and highlight, defined on every page load.
const overlay = () => {
  const css = `
    #ov { position: fixed; left: 50%; bottom: 22px; transform: translateX(-50%); width: min(760px, calc(100vw - 24px));
      background: #141414; color: #f4f4f5; border-radius: 14px; padding: 14px 20px; z-index: 2147483000;
      font: 20px/1.4 Inter, system-ui, sans-serif; box-shadow: 0 12px 40px rgb(0 0 0 / 35%); display: none; }
    #ov .lbl { font-size: 13px; letter-spacing: .06em; color: #a1a1aa; text-transform: uppercase; margin-bottom: 3px; }
    #ov .you::after { content: '▍'; color: #a1a1aa; animation: b 1s steps(1) infinite; }
    #ov.done .you::after { content: ''; }
    #ov .cl { display: none; border-top: 1px solid #2a2a2e; margin-top: 9px; padding-top: 8px; color: #d4d4d8; font-size: 18px; }
    #ov .cl b { color: #e8865f; margin-right: 6px; }
    #cap { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); background: #141414; color: #fafafa;
      padding: 8px 14px; border-radius: 999px; font: 600 18px/1.2 Inter, system-ui, sans-serif; z-index: 2147483000;
      display: none; white-space: nowrap; box-shadow: 0 8px 24px rgb(0 0 0 / 30%); }
    .ov-hl { outline: 3px solid #e8865f !important; outline-offset: 3px; border-radius: 8px; transition: outline-color .3s; }
    @media (max-width: 500px) { #ov { font-size: 16px; padding: 12px 16px; } #ov .cl { font-size: 15px; } #cap { font-size: 15px; } }
    @keyframes b { 50% { opacity: 0; } }`;
  const mount = () => {
    if (document.getElementById('ov')) return;
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    const ov = document.createElement('div'); ov.id = 'ov';
    ov.innerHTML = '<div class="lbl">You → Claude</div><div class="you"></div><div class="cl"><b>Claude</b><span></span></div>';
    const cap = document.createElement('div'); cap.id = 'cap';
    document.body.append(ov, cap);
  };
  window.__ov = {
    show(text = '', done = false) { mount(); const ov = document.getElementById('ov'); ov.style.display = 'block';
      ov.classList.toggle('done', done); ov.querySelector('.you').textContent = text; ov.querySelector('.cl').style.display = 'none'; },
    set(text) { document.querySelector('#ov .you').textContent = text; },
    claude(text) { const ov = document.getElementById('ov'); ov.classList.add('done');
      const cl = ov.querySelector('.cl'); cl.style.display = 'block'; cl.querySelector('span').textContent = text; },
    hide() { const ov = document.getElementById('ov'); if (ov) ov.style.display = 'none'; },
    caption(text) { mount(); const c = document.getElementById('cap'); c.textContent = text; c.style.display = text ? 'block' : 'none'; },
    highlight(sel) { document.querySelectorAll('.ov-hl').forEach((e) => e.classList.remove('ov-hl'));
      const el = sel && document.querySelector(sel); if (el) { el.classList.add('ov-hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } },
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
};

(async () => {
  const browser = await chromium.launch();
  // 960×640 is shown at its real size on the page. Below 1300px the left sidebar is a drawer
  // (left collapsed); the right panel docks, widened so the page and the panel share the frame.
  const viewport = PHONE ? { width: 390, height: 660 } : { width: 960, height: 640 };
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: PHONE, hasTouch: PHONE, bypassCSP: true });
  await ctx.addInitScript(overlay);
  if (!PHONE) await ctx.addInitScript(() => { try { localStorage.setItem('remry:panel-width', '380'); } catch { /* none */ } });
  const page = await ctx.newPage();
  // Playwright's own recorder captures CSS pixels, so this grabs 2x frames itself. Time spent
  // loading pages is left out (paused), so the video needs no speeding up.
  const FRAMES = path.join(OUT, `frames-${MODE}`);
  let capturing = true; let paused = false; let pausedAt = 0; let skipped = 0; const shots = [];
  let capture = null;
  const startCapture = () => { capture = (async () => {
    fs.rmSync(FRAMES, { recursive: true, force: true }); fs.mkdirSync(FRAMES, { recursive: true });
    const cdp = await ctx.newCDPSession(page);
    while (capturing) {
      if (paused) { await new Promise((res) => setTimeout(res, 15)); continue; }
      try {
        const v = (await cdp.send('Page.getLayoutMetrics')).cssVisualViewport;
        const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90,
          clip: { x: v.pageX, y: v.pageY, width: viewport.width, height: viewport.height, scale: 2 } });
        if (paused) continue;
        const f = path.join(FRAMES, `${String(shots.length).padStart(5, '0')}.jpg`);
        fs.writeFileSync(f, Buffer.from(r.data, 'base64')); shots.push({ f, t: Date.now() - skipped });
      } catch { await new Promise((res) => setTimeout(res, 30)); }
    }
  })(); };
  const pause = () => { paused = true; pausedAt = Date.now(); };
  const resume = () => { skipped += Date.now() - pausedAt; paused = false; };
  // Waiting on the CLI after the prompt is typed isn't shown either.
  pauseFor = async (p) => { pause(); try { return await p; } finally { resume(); } };
  const wait = (ms) => page.waitForTimeout(ms);
  const go = async (p) => { pause(); await page.goto(BASE + p, { waitUntil: 'networkidle' }); await wait(500); resume(); };
  const type = async (text) => {
    await page.evaluate(() => window.__ov.show(''));
    for (let i = 1; i <= text.length; i++) { await page.evaluate((t) => window.__ov.set(t), text.slice(0, i)); await wait(32); }
    await wait(700);
  };
  // After a reload the bubble comes back with the prompt and Claude's reply.
  const reply = async (prompt, text, hold = 3400) => {
    await page.evaluate(([p, t]) => { window.__ov.show(p, true); window.__ov.claude(t); }, [prompt, text]);
    await wait(hold);
  };
  const caption = (t) => page.evaluate((x) => window.__ov.caption(x), t);
  const hide = () => page.evaluate(() => window.__ov.hide());
  const highlight = (sel) => page.evaluate((s) => window.__ov.highlight(s), sel);
  const openRightPanel = async () => {
    if (!PHONE) return;
    await page.locator('.drawer-toggle.right-toggle').click(); await wait(700);
  };
  const days = (n) => new Date(Date.now() + n * 864e5).toISOString();

  // 1. An org change.
  await go('/app/orgmap'); await wait(1200); startCapture(); await wait(400);
  let prompt = 'Dana Park joined as a senior engineer, on Platform, reporting to Priya.';
  const dana = await during(type(prompt), async () => {
    const d = await remry('person.create', { name: 'Dana Park', extensions: { org: { title: 'Senior Engineer' } } });
    await remry('personRelation.add', { fromId: ids['Priya Shah'], toId: d.id, kind: 'LEAD_OF' });
    await Promise.all([remry('group.addMember', { groupId: ids.Platform, personId: d.id }),
      remry('group.addMember', { groupId: ids.Engineering, personId: d.id })]);
    return d;
  });
  ids['Dana Park'] = dana.id;
  await go('/app/orgmap');
  await page.locator(`li:has(> .node[data-person-id="${ids['Priya Shah']}"]) > button.count`).click();
  await wait(500);
  await reply(prompt, 'Added Dana Park · reports to Priya Shah · on Platform', 600);
  await highlight(`.node[data-person-id="${dana.id}"]`); await wait(3000);

  // 2. After a 1:1: the note and the todo land in the right panel.
  await go(`/app/people/${dana.id}`); await openRightPanel();
  prompt = 'Note that Dana wants to lead the migration. Remind me to book a 1:1 with her.';
  await during(type(prompt), () => Promise.all([
    remry('note.add', { entityType: 'PERSON', entityId: dana.id, content: 'Wants to lead the Q4 migration. Said the on-call rotation is the part she’d change first.' }),
    remry('todo.create', { title: 'Book 1:1 with Dana', priority: 2, entityType: 'PERSON', entityId: dana.id, targetDate: days(7) })]));
  await go(`/app/people/${dana.id}`); await openRightPanel();
  await reply(prompt, 'Added a note on Dana Park, and a todo: “Book 1:1 with Dana”', 4000);

  // 3. A blocked project, then the timeline and a peek.
  await go(`/app/projects/${ids['Search rewrite']}`); await openRightPanel();
  prompt = 'The search rewrite is blocked on the new index. Note it, and remind me to chase Tom.';
  await during(type(prompt), () => Promise.all([
    remry('project.update', { id: ids['Search rewrite'], status: 'blocked' }),
    remry('note.add', { entityType: 'PROJECT', entityId: ids['Search rewrite'], content: 'Blocked until the new search index ships.' }),
    remry('todo.create', { title: 'Chase Tom on the search index', priority: 1, entityType: 'PROJECT', entityId: ids['Search rewrite'] })]));
  await go(`/app/projects/${ids['Search rewrite']}`); await openRightPanel();
  await reply(prompt, 'Search rewrite is now blocked · added a note and a todo', 2600);
  await go('/app/projects');
  // The timeline needs the width: close the panel here, and the peek opens it again.
  if (!PHONE) { await page.locator('.drawer-toggle.right-toggle').click(); await wait(600); }
  await caption(PHONE ? 'Every project and its status, at a glance' : 'Every project on one timeline, coloured by status'); await wait(3400);
  await go(`/app/projects?peek=${ids['Search rewrite']}`); await caption('Peek at a project without leaving the list'); await wait(3400);
  await caption('');

  // 4. A goal check-in.
  await go(`/app/goals/${ids['Cut p95 latency to 200ms']}`);
  prompt = 'Platform’s latency is at 310ms now. Read replicas took another 80ms off.';
  await during(type(prompt), () => remry('goal.checkIn', { goalId: ids['Cut p95 latency to 200ms'], date: '2026-09-10T00:00:00.000Z', value: 310, status: 'ON_TRACK', comment: 'Read replicas took another 80ms off.' }));
  await go(`/app/goals/${ids['Cut p95 latency to 200ms']}`);
  await reply(prompt, 'Checked in 310 ms on “Cut p95 latency to 200ms” · on track', 900);
  await page.evaluate(() => { const c = document.querySelector('canvas'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  await wait(3400);

  // 5. A wiki page that links up.
  await go('/app/wiki');
  prompt = 'We pay Datadog $40k a year for 40 seats; it renews in March. Platform uses it for alerting.';
  const dd = await during(type(prompt), async () => {
    const pg = await remry('page.create', { title: 'Datadog', content: '- **Vendor:** Datadog\n- **Cost:** $40,000 a year, 40 seats\n- **Renews:** March 2027\n\nMonitoring and alerting. Platform owns the account.' });
    await remry('relation.add', { fromType: 'GROUP', fromId: ids.Platform, toType: 'PAGE', toId: pg.id, note: 'Uses it for alerting' });
    return pg;
  });
  ids.Datadog = dd.id;
  await go(`/app/wiki/${dd.id}`);
  await reply(prompt, 'Added a page for Datadog, linked to Platform', 4000);

  // 6. Writing up the quarter.
  await go(`/app/groups/${ids.Platform}`);
  prompt = 'Write up Platform’s quarter as a doc: delivery and reliability, with charts.';
  const doc = await during(type(prompt), async () => {
    const d = await remry('doc.add', { entityType: 'GROUP', entityId: ids.Platform, title: 'Q3 review' });
    await remry('doc.update', { id: d.id, content: fs.readFileSync(path.join(__dirname, 'q3.md'), 'utf8')
      .replace('{{migration}}', `/app/projects/${ids['Q4 migration']}`).replace('{{datadog}}', `/app/wiki/${dd.id}`) });
    return d;
  });
  ids['Q3 review'] = doc.id;
  await go(`/app/groups/${ids.Platform}?doc=${doc.id}`);
  await reply(prompt, 'Wrote “Q3 review” on Platform, with two charts', 900);
  await page.evaluate(() => { const c = document.querySelector('canvas'); if (c) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
  await wait(4000);

  fs.writeFileSync(path.join(__dirname, 'ids.json'), JSON.stringify(ids, null, 1));
  capturing = false; await capture;
  // Each frame lasts until the next one: an ffmpeg concat list with the recorded timings.
  const lines = shots.map((s, i) => `file '${s.f}'\nduration ${(((shots[i + 1] || s).t - s.t) / 1000 || 0.04).toFixed(3)}`);
  fs.writeFileSync(path.join(OUT, `frames-${MODE}.txt`), lines.join('\n') + `\nfile '${shots[shots.length - 1].f}'\n`);
  await ctx.close();
  await browser.close();
  console.log('recorded', MODE);
})().catch((e) => { console.error(e); process.exit(1); });

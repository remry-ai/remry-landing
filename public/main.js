// Small enhancements. The page works without this file.
(() => {
  const MAC = 'https://github.com/remry-ai/remry/releases/latest/download/Remry-macos-arm64.dmg';
  const WIN = 'https://github.com/remry-ai/remry/releases/latest/download/Remry-windows-x64-setup.exe';

  // Point the hero's Download button at the visitor's platform.
  const platform = () => {
    const p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    const ua = navigator.userAgent || '';
    if (/android|iphone|ipad|ipod/i.test(ua) || (/Mac/.test(p) && navigator.maxTouchPoints > 1)) return 'mobile';
    if (/win/i.test(p) || /Windows/.test(ua)) return 'windows';
    if (/mac/i.test(p) || /Macintosh/.test(ua)) return 'mac';
    return 'other';
  };

  const primary = document.getElementById('download-primary');
  const alt = document.getElementById('download-alt');
  const kind = platform();
  if (primary && alt) {
    const label = primary.querySelector('.btn-label');
    const sub = primary.querySelector('.btn-sub');
    const tail = ' Works with Claude desktop, Cowork and Claude Code.';
    if (kind === 'windows') {
      primary.href = WIN;
      primary.dataset.platform = 'windows';
      label.textContent = 'Download for Windows';
      sub.textContent = 'x64 · free';
      alt.innerHTML = `Also for <a href="${MAC}" data-track="download-hero-alt" data-platform="mac">Mac (Apple silicon)</a>.${tail}`;
    } else if (kind === 'mobile' || kind === 'other') {
      // Phones and Linux can't run it: send them to the section with both installers.
      primary.href = '#get-started';
      primary.dataset.platform = '';
      label.textContent = 'Get it for Mac or Windows';
      sub.textContent = 'Free';
      alt.textContent = kind === 'mobile'
        ? 'Remry runs on your computer. On your phone? Follow along and install it later.'
        : 'Remry runs on Apple silicon Macs and Windows (x64).';
    }
  }

  // The demo loops silently; honour reduced motion and offer a pause button.
  const video = document.getElementById('demo-video');
  const toggle = document.getElementById('demo-toggle');
  if (video && toggle) {
    toggle.hidden = false;
    const sync = () => {
      const paused = video.paused;
      toggle.textContent = paused ? 'Play' : 'Pause';
      toggle.setAttribute('aria-pressed', String(paused));
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.removeAttribute('autoplay');
      video.pause();
    }
    toggle.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    sync();
  }

  // Analytics events: anything with data-track. `remryTrack` is defined in analytics.js.
  document.addEventListener('click', (e) => {
    const el = e.target instanceof Element && e.target.closest('a[data-track]');
    if (el && window.remryTrack) window.remryTrack(el.dataset.track, { platform: el.dataset.platform || '' });
  });
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form instanceof HTMLFormElement && form.dataset.track && window.remryTrack) window.remryTrack(form.dataset.track);
  });
})();

// "Follow along" links jump to the footer signup and put the cursor in the email box.
(() => {
  const email = document.getElementById('email');
  if (!email) return;
  const focusEmail = () => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('subscribe').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    email.focus({ preventScroll: true });
  };
  document.querySelectorAll('a[href="#subscribe"]').forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', '#subscribe');
      focusEmail();
    }),
  );
  // A shared link to remry.ai/#subscribe lands on the form too.
  if (location.hash === '#subscribe') {
    // After the browser's own jump to the anchor, which would otherwise win.
    const later = () => setTimeout(focusEmail, 50);
    if (document.readyState === 'complete') later();
    else window.addEventListener('load', later);
  }
})();

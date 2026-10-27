// Analytics: Plausible (no cookies, no personal data). Loaded before Plausible's own script in
// index.html, so its setup lives here rather than inline: the CSP (public/_headers) runs scripts
// only from this site and https://plausible.io, and sends events only to https://plausible.io.
//
// main.js calls window.remryTrack(event, props) for downloads, newsletter clicks and Buy Pro
// (the data-track names in index.html). Each is a Plausible custom event; add the names as goals
// in the Plausible dashboard (Site settings → Goals → Custom event) to see them there.
(() => {
  // Plausible's queue: calls made before its script loads are kept and sent once it does.
  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  window.plausible.init = window.plausible.init || function (o) { window.plausible.o = o || {}; };
  window.plausible.init();

  window.remryTrack = (event, props = {}) => {
    try { window.plausible(event, { props }); } catch { /* analytics never breaks the page */ }
  };
})();

// Analytics hook: a placeholder that sends nothing.
//
// main.js calls window.remryTrack(event, props) for downloads, newsletter clicks and Buy Pro.
// To switch on a privacy-friendly provider (no cookies, no personal data):
//
//   Cloudflare Web Analytics: turn it on for the Pages project in the Cloudflare dashboard
//   (Workers & Pages → remry-landing → Metrics → Web Analytics). Cloudflare injects its own
//   beacon; then add https://static.cloudflareinsights.com to script-src and
//   https://cloudflareinsights.com to connect-src in public/_headers. It counts page views
//   only, so custom events below stay no-ops.
//
//   Plausible: add to index.html's <head>
//     <script defer data-domain="remry.ai" src="https://plausible.io/js/script.tagged-events.js"></script>
//   add https://plausible.io to script-src and connect-src in public/_headers, and set
//   PROVIDER below to 'plausible'.
(() => {
  const PROVIDER = 'none'; // 'none' | 'plausible'

  window.remryTrack = (event, props = {}) => {
    if (PROVIDER === 'plausible' && typeof window.plausible === 'function') {
      window.plausible(event, { props });
    }
  };
})();

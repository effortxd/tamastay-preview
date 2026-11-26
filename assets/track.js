/* Event log hook. EQ.track(name, props) always lands in window.dataLayer and window.EQ_EVENTS;
   it is sent on to our own collector, GA4 or the Meta Pixel only when config.json holds their IDs.
   Nothing third-party loads while the IDs are empty. No personal data (names, messages) is ever sent. */
(function () {
  var C = (window.EQ_CONFIG || {}).analytics || {};
  var EQ = window.EQ = window.EQ || {};
  window.dataLayer = window.dataLayer || [];
  window.EQ_EVENTS = [];
  var sid = (function () {
    try { var k = "eq-sid", v = sessionStorage.getItem(k); if (!v) { v = Math.random().toString(36).slice(2, 10); sessionStorage.setItem(k, v); } return v; }
    catch (e) { return "nosession"; }
  })();
  function load(src) { var s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); }
  if (C.ga4Id) {
    load("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(C.ga4Id));
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date()); window.gtag("config", C.ga4Id);
  }
  if (C.metaPixelId) {
    !function (f, b, e, v, n) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = "2.0"; n.queue = []; load(v); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", C.metaPixelId); window.fbq("track", "PageView");
  }
  var PIXEL_MAP = { whatsapp_click: "Contact", booking_request_sent: "Lead", engine_handoff: "InitiateCheckout" };
  EQ.track = function (name, props) {
    var ev = Object.assign({ event: name, page: location.pathname, lang: document.documentElement.lang, ts: new Date().toISOString(), sid: sid }, props || {});
    window.EQ_EVENTS.push(ev);
    window.dataLayer.push(ev);
    if (C.eventEndpoint && navigator.sendBeacon) {
      try { navigator.sendBeacon(C.eventEndpoint, new Blob([JSON.stringify(ev)], { type: "application/json" })); } catch (e) {}
    }
    if (window.gtag && C.ga4Id) window.gtag("event", name, props || {});
    if (window.fbq && C.metaPixelId && PIXEL_MAP[name]) window.fbq("track", PIXEL_MAP[name], props || {});
    return ev;
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-track]");
    if (a) EQ.track(a.dataset.track, { where: a.dataset.where || "", to: a.getAttribute("href") ? (a.hostname || "") : "" });
  });
  EQ.track("page_view");
})();

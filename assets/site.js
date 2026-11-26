/* Equity Homestay: menu, WhatsApp link builder, contact form. */
(function () {
  var C = window.EQ_CONFIG || {};
  var EQ = window.EQ = window.EQ || {};
  EQ.lang = function () { return document.documentElement.lang === "zh-Hans" ? "zh" : "en"; };
  EQ.wa = function (text) { return "https://wa.me/" + (C.whatsapp || "") + "?text=" + encodeURIComponent(text || ""); };
  EQ.openWa = function (text, where) {
    var url = EQ.wa(text);
    if (EQ.track) EQ.track("whatsapp_click", { where: where || "" });
    // window.open(..., "noopener") always returns null, so detach the opener by hand instead;
    // a null here then really means a blocked pop-up, and we go there in this tab.
    var w = window.open(url, "_blank");
    if (w) w.opener = null; else location.href = url;
    return url;
  };

  var menu = document.querySelector(".menu-btn");
  if (menu) menu.addEventListener("click", function () {
    var nav = document.getElementById("nav"), open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { var nav = document.getElementById("nav"); if (nav && nav.classList.contains("open")) { nav.classList.remove("open"); menu.setAttribute("aria-expanded", "false"); menu.focus(); } }
  });

  var ask = document.getElementById("ask");
  if (ask) ask.addEventListener("submit", function (e) {
    e.preventDefault();
    var zh = EQ.lang() === "zh", f = ask.elements;
    var d = f.dates.value.trim(), n = f.guests.value.trim(), m = f.message.value.trim();
    var err = document.getElementById("a-err");
    f.message.setAttribute("aria-invalid", String(!m)); err.hidden = !!m;
    if (!m) { f.message.focus(); return; }
    var t = zh
      ? "你好，我想问 " + C.name + "。" + (d ? "\n日期：" + d : "") + (n ? "\n人数：" + n : "") + "\n" + m
      : "Hi, I'd like to ask about " + C.name + "." + (d ? "\nDates: " + d : "") + (n ? "\nGuests: " + n : "") + "\n" + m;
    EQ.track && EQ.track("enquiry_submit", { has_dates: !!d });
    EQ.openWa(t, "contact-form");
  });
  /* ---- motion: hero parallax, reveal on scroll, count-up, the scroll walk ----
     No library: the walk is position:sticky plus one progress number per frame, so the page scrolls natively
     (no scroll-jacking) and the single-file test link needs no outside script. transform/opacity only.
     Safe to run again on the same document (the test link mounts pages one after another). */
  var root = document.documentElement;
  var reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var M = EQ._m || (EQ._m = {});
  if (M.io) M.io.disconnect();
  M.reduce = reduce;
  M.hero = reduce ? null : document.querySelector(".hero .fig img");
  M.tour = null;
  root.classList.add("mot");
  root.classList.toggle("calm", reduce);

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function headH() {
    var t = document.querySelector(".top"), h = t ? t.offsetHeight : 0;
    root.style.setProperty("--hh", h + "px");
    return h;
  }
  M.headH = headH;
  headH();

  function countUp(el) {
    var to = +el.getAttribute("data-to") || 0;
    if (M.reduce || !window.requestAnimationFrame) { el.textContent = to; return; }
    var t0 = 0;
    function step(ts) {
      if (!t0) t0 = ts;
      var k = clamp((ts - t0) / 1100, 0, 1), e = 1 - Math.pow(2, -10 * k);
      el.textContent = Math.round(to * (k === 1 ? 1 : e));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var sel = "main .h2, main .lede, .story .dims > div, .incl li, .faq details, .loc .map, .glance .cell, .band, .duo .fig, .gallery .fig, .plan > div, .close-card, .contact > *, .phead h1, .tour-more";
  var items = [].slice.call(document.querySelectorAll(sel)).filter(function (el) { return !el.closest(".hero, .tour-stage, .bk"); });
  if ("IntersectionObserver" in window) {
    M.io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        M.io.unobserve(e.target);
        var n = e.target.querySelector && e.target.querySelector(".n[data-to]");
        if (n) countUp(n);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0.08 });
  }
  items.forEach(function (el) {
    var i = el.parentNode ? [].indexOf.call(el.parentNode.children, el) : 0;
    el.setAttribute("data-rv", "");
    el.style.transitionDelay = Math.min(i, 4) * 70 + "ms";
    var n = el.querySelector(".n[data-to]");
    if (M.io) { if (n && !M.reduce) n.textContent = "0"; M.io.observe(el); } else el.classList.add("in");
  });

  /* the walk */
  var tour = document.querySelector(".tour");
  if (tour) {
    var stops = [].slice.call(tour.querySelectorAll(".tstop"));
    var T = {
      el: tour, track: tour.querySelector(".tour-track"), stage: tour.querySelector(".tour-stage"), n: stops.length,
      figs: stops.map(function (s) { return s.querySelector(".fig"); }),
      caps: stops.map(function (s) { return s.querySelector(".tcap"); }),
      dots: [].slice.call(tour.querySelectorAll(".tour-rail button")), p: -1, media: null, marks: null, act: -1,
      now: tour.querySelector(".tour-now"), fill: tour.querySelector(".tour-fill"),
      names: stops.map(function (s) { var h = s.querySelector("h3"); return h ? h.textContent.trim() : ""; })
    };
    var mk = (tour.getAttribute("data-marks") || "").split(",").map(parseFloat).filter(isFinite);
    if (mk.length === T.n) T.marks = mk;
    T.dots.forEach(function (b, i) { b.addEventListener("click", function () { tourGo(T, i); }); });
    if (!reduce) {
      root.classList.add("tour-on");
      M.tour = T;
      tourMedia(T);
    } else root.classList.remove("tour-on");
  } else root.classList.remove("tour-on");

  function tourT(T) {
    var r = T.track.getBoundingClientRect(), total = T.track.offsetHeight - T.stage.offsetHeight;
    var h = parseFloat(root.style.getPropertyValue("--hh")) || 0;
    return total > 0 ? clamp((h - r.top) / total, 0, 1) : 0;
  }
  function tToP(T, t) {
    if (!T.marks) return t * (T.n - 1);
    var m = T.marks;
    if (t <= m[0]) return 0;
    for (var k = 0; k < m.length - 1; k++) if (t <= m[k + 1]) return k + (t - m[k]) / ((m[k + 1] - m[k]) || 1);
    return T.n - 1;
  }
  function pToT(T, p) {
    if (!T.marks) return p / (T.n - 1);
    var k = Math.floor(clamp(p, 0, T.n - 1.0001)), m = T.marks;
    return m[k] + (p - k) * (m[k + 1] - m[k]);
  }
  function tourGo(T, i) {
    if (!M.tour) { T.figs[i].scrollIntoView({ behavior: "auto", block: "center" }); return; }
    var total = T.track.offsetHeight - T.stage.offsetHeight, h = parseFloat(root.style.getPropertyValue("--hh")) || 0;
    var top = T.track.getBoundingClientRect().top + window.pageYOffset - h + pToT(T, i) * total;
    window.scrollTo({ top: Math.round(top) + 1, behavior: "smooth" });
  }
  function tourPaint(T) {
    var p = T.p;
    for (var i = 0; i < T.n; i++) {
      var d = p - i, ad = Math.abs(d), f = T.figs[i], c = T.caps[i];
      if (!T.media) {
        // later rooms sit on top: a room fades in over the last one and stays until the next covers it
        var op = d >= 0 ? (d > 1.35 ? 0 : 1) : clamp(1 - (-d - 0.28) / 0.44, 0, 1);
        f.style.opacity = op;
        f.style.visibility = op > 0 ? "visible" : "hidden";
        if (op > 0) f.firstElementChild.style.transform = "scale(" + (1.02 + 0.055 * (clamp(d, -1, 1.35) + 1)).toFixed(4) + ")";
      }
      var co = clamp(1 - (ad - 0.2) / 0.22, 0, 1);
      c.style.opacity = co;
      c.style.transform = "translate3d(0," + (clamp(-d, -1, 1) * 28).toFixed(1) + "px,0)";
      c.style.visibility = co > 0 ? "visible" : "hidden";
    }
    var a = clamp(Math.round(p), 0, T.n - 1);
    if (a !== T.act) {
      T.act = a;
      T.dots.forEach(function (b, k) { if (k === a) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current"); });
      if (T.now) T.now.textContent = T.names[a] + " · " + (EQ.lang() === "zh" ? (a + 1) + " / " + T.n : (a + 1) + " of " + T.n);
    }
    if (T.media) T.media.draw(clamp(pToT(T, p), 0, 1));
    if (T.fill) T.fill.style.transform = "scaleX(" + (p / (T.n - 1)).toFixed(4) + ")";
  }
  /* the video slot: a frame sequence (canvas) or an MP4 scrubbed by currentTime */
  function tourMedia(T) {
    var slot = T.el.querySelector(".tour-slot"), v = T.el.getAttribute("data-video"),
        pat = T.el.getAttribute("data-frames"), cnt = +T.el.getAttribute("data-frame-count") || 0;
    if (!slot || (!v && !(pat && cnt > 1))) return;
    if (pat && cnt > 1) {
      var cv = document.createElement("canvas"), cx = cv.getContext("2d"), frames = new Array(cnt), shown = -1;
      cv.setAttribute("aria-hidden", "true");
      slot.appendChild(cv);
      var order = [], seen = {}, next = 0;
      for (var s = 32; s >= 1; s = s / 2) for (var j = 0; j < cnt; j += s) if (!seen[j]) { seen[j] = 1; order.push(j); }
      var media = { draw: function (t) {
        var want = Math.round(t * (cnt - 1)), k = want, b = 0;
        while (!frames[k] && b < cnt) { b++; k = frames[want - b] ? want - b : want + b; if (k < 0 || k >= cnt) k = want; }
        var im = frames[k];
        if (!im) return;
        var dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(slot.clientWidth * dpr), H = Math.round(slot.clientHeight * dpr);
        if (k === shown && cv.width === W && cv.height === H) return;
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        var sc = Math.max(W / im.naturalWidth, H / im.naturalHeight), w = im.naturalWidth * sc, h = im.naturalHeight * sc;
        cx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
        shown = k;
      } };
      var load = function () {
        if (next >= order.length) return;
        var k = order[next++], im = new Image();
        im.decoding = "async";
        im.onload = function () { frames[k] = im; if (!T.media) { T.media = media; T.el.classList.add("has-media"); slot.hidden = false; } shown = -1; M.req(); load(); };
        im.onerror = load;
        im.src = pat.replace("{n}", ("000" + (k + 1)).slice(-4));
      };
      for (var q = 0; q < 6; q++) load();
      return;
    }
    var vid = document.createElement("video");
    vid.muted = true; vid.playsInline = true; vid.preload = "auto";
    vid.setAttribute("muted", ""); vid.setAttribute("playsinline", ""); vid.setAttribute("aria-hidden", "true");
    vid.addEventListener("loadeddata", function () {
      var pr = vid.play && vid.play();
      if (pr && pr.then) pr.then(function () { vid.pause(); }).catch(function () {});
      T.media = { draw: function (t) {
        var d = vid.duration || 0, at = t * Math.max(0, d - 0.05);
        if (d && Math.abs(vid.currentTime - at) > 1 / 30 && !vid.seeking) vid.currentTime = at;
      } };
      T.el.classList.add("has-media"); slot.hidden = false; M.req();
    });
    vid.src = v;
    slot.appendChild(vid);
  }

  /* booking bar: hidden on Home until the hero is passed; elsewhere always there */
  M.heroBox = document.querySelector(".hero");
  M.dockSet = function (off) { root.classList.toggle("dock-off", !!off); };
  M.dockSet(!!M.heroBox);
  /* the stay chosen on the booking page rides along in the bar */
  (function () {
    var dock = document.querySelector(".dock"), old = dock && dock.querySelector(".stay");
    if (old) old.parentNode.removeChild(old);
    var st = null;
    try { st = JSON.parse(sessionStorage.getItem("eq_stay") || "null"); } catch (e) {}
    if (!dock || !st || !st.n || document.body.getAttribute("data-page") === "book") return;
    var book = dock.querySelector(".btn-solid"), zh = EQ.lang() === "zh", a = document.createElement("a");
    a.className = "stay"; a.href = book.getAttribute("href");
    a.innerHTML = "<span><b></b> · <span class=n></span> · <span class=p></span></span><span class=go></span>";
    a.querySelector("b").textContent = st.d;
    a.querySelector(".n").textContent = zh ? st.n + " 晚" : st.n + (st.n > 1 ? " nights" : " night");
    a.querySelector(".p").textContent = st.p;
    a.querySelector(".go").textContent = zh ? "继续预订" : "Continue";
    dock.insertBefore(a, dock.firstChild);
  })();
  /* the walk to Jonker is drawn as the location section scrolls in */
  M.route = document.querySelector(".route .rl");
  /* section dots (desktop) and the page line (phone) */
  (function () {
    [].forEach.call(document.querySelectorAll(".sdots, .sprog"), function (n) { n.parentNode.removeChild(n); });
    M.secs = [].slice.call(document.querySelectorAll("main > section[aria-labelledby]"));
    M.sdots = null;
    if (M.secs.length >= 4) {
      var nav = document.createElement("nav");
      nav.className = "sdots"; nav.setAttribute("aria-label", EQ.lang() === "zh" ? "页面章节" : "Page sections");
      M.secs.forEach(function (sec) {
        var h = document.getElementById(sec.getAttribute("aria-labelledby")), b = document.createElement("button"), sp = document.createElement("span");
        b.type = "button"; sp.textContent = h ? h.textContent.trim() : ""; b.appendChild(sp);
        b.addEventListener("click", function () {
          var y = sec.getBoundingClientRect().top + window.pageYOffset - (parseFloat(root.style.getPropertyValue("--hh")) || 0);
          window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: M.reduce ? "auto" : "smooth" });
        });
        nav.appendChild(b);
      });
      document.body.appendChild(nav);
      M.sdots = [].slice.call(nav.children);
    }
    var line = document.createElement("div");
    line.className = "sprog"; line.setAttribute("aria-hidden", "true");
    document.body.appendChild(line);
    M.sprog = line;
  })();
  /* tap a room picture to see it whole (the test link has its own viewer) */
  if (!M.lbBound) {
    M.lbBound = 1;
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a.zoom[href*="assets/img/"], .gallery a[href*="assets/img/"]');
      if (!a) return;
      e.preventDefault();
      var lb = document.getElementById("eq-lb");
      if (!lb) {
        lb = document.createElement("div"); lb.id = "eq-lb"; lb.className = "lbx"; lb.setAttribute("role", "dialog"); lb.setAttribute("aria-modal", "true");
        lb.innerHTML = '<img alt=""><button type="button">' + (EQ.lang() === "zh" ? "关闭" : "Close") + "</button>";
        lb.addEventListener("click", function () { lb.hidden = true; });
        document.addEventListener("keydown", function (k) { if (k.key === "Escape") lb.hidden = true; });
        document.body.appendChild(lb);
      }
      var im = a.querySelector("img");
      lb.querySelector("img").src = a.getAttribute("href"); lb.querySelector("img").alt = im ? im.alt : "";
      lb.hidden = false; lb.querySelector("button").focus();
    });
  }

  function frame() {
    M.raf = 0;
    var more = false, vh = window.innerHeight, y0 = window.pageYOffset;
    if (M.heroBox && M.heroBox.isConnected) M.dockSet(M.heroBox.getBoundingClientRect().bottom > vh * 0.25);
    if (M.route && M.route.isConnected && !M.reduce) {
      var rr = M.route.ownerSVGElement.getBoundingClientRect();
      M.route.style.strokeDashoffset = (1 - clamp((vh - rr.top) / (vh * 0.75), 0, 1)).toFixed(3);
    }
    if (M.sprog && M.sprog.isConnected) {
      var dh = document.documentElement.scrollHeight - vh;
      M.sprog.style.transform = "scaleX(" + (dh > 0 ? clamp(y0 / dh, 0, 1) : 0).toFixed(4) + ")";
    }
    if (M.sdots) {
      var cur = 0;
      M.secs.forEach(function (sec, i) { if (sec.getBoundingClientRect().top < vh * 0.45) cur = i; });
      M.sdots.forEach(function (b, i) { if (i === cur) b.setAttribute("aria-current", "true"); else b.removeAttribute("aria-current"); });
    }
    if (M.hero && M.hero.isConnected) {
      var y = window.pageYOffset, hb = M.hero.parentNode.getBoundingClientRect().bottom;
      if (hb > 0) M.hero.style.transform = "translate3d(0," + (y * 0.16).toFixed(1) + "px,0) scale(1.06)";
    }
    var T = M.tour;
    if (T && T.el.isConnected) {
      var r = T.track.getBoundingClientRect();
      if (r.bottom > -200 && r.top < window.innerHeight + 200 || T.p < 0) {
        var target = tToP(T, tourT(T));
        if (T.p < 0) T.p = target;
        var dp = target - T.p;
        T.p = Math.abs(dp) < 0.002 ? target : T.p + dp * 0.2;
        more = T.p !== target;
        tourPaint(T);
      }
    }
    if (more) M.req();
  }
  M.frame = frame;
  if (!M.bound) {
    M.bound = 1;
    M.req = function () { if (!M.raf) M.raf = requestAnimationFrame(function () { M.frame(); }); };
    window.addEventListener("scroll", function () { M.req(); }, { passive: true });
    window.addEventListener("resize", function () { M.headH(); M.req(); });
  }
  M.req();
})();

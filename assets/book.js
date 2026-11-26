/* Booking flow. One pluggable slot, chosen by config.json booking.mode:
   - "whatsapp-enquiry": dates -> guests -> details -> send. The request is written into a WhatsApp message.
   - "engine": dates -> guests -> the booking engine (embed snippet in #engine-slot, or redirect to urlTemplate).
   No personal data leaves the browser except through the WhatsApp message the guest sends themselves. */
(function () {
  var C = window.EQ_CONFIG || {}, R = C.rates || {}, B = C.booking || {}, E = B.engine || {};
  var root = document.getElementById("bk"); if (!root) return;
  // Engine mode needs something to hand over to; until then the WhatsApp request stays live.
  var MODE = B.mode === "engine" && (E.urlTemplate || E.embedHtml) ? "engine" : "whatsapp-enquiry";
  var DISPLAY = E.display === "embed" && E.embedHtml ? "embed" : E.display === "iframe" && E.urlTemplate ? "iframe" : E.urlTemplate ? "redirect" : "embed";
  root.setAttribute("data-mode", MODE);
  var MAX = +C.maxGuests || 6;
  var ORDER = MODE === "engine" ? ["dates", "guests", "engine"] : ["dates", "guests", "details", "send", "sent"];
  var S = { in: null, out: null, adults: 2, children: 0 };
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var zh = EQ.lang() === "zh";
  var DOW = zh ? ["日", "一", "二", "三", "四", "五", "六"] : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  var DAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function nights() { return S.in && S.out ? Math.round((S.out - S.in) / 864e5) : 0; }
  function fmt(d) {
    if (!d) return "—";
    return zh ? (d.getMonth() + 1) + "月" + d.getDate() + "日（周" + DOW[d.getDay()] + "）" : DAY_EN[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()].slice(0, 3);
  }
  function money(n) { return (R.currency || "RM") + " " + n.toLocaleString("en-MY"); }
  function price() { // null when any rate is missing: the page then says "RM —", never a guess
    if (!nights() || R.weeknight == null || R.weekendNight == null) return null;
    var sum = 0;
    for (var d = new Date(S.in); d < S.out; d.setDate(d.getDate() + 1)) sum += (d.getDay() === 5 || d.getDay() === 6) ? +R.weekendNight : +R.weeknight;
    return sum;
  }
  var arrow = function (dir) { return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="' + (dir < 0 ? "M10 3L5 8l5 5" : "M6 3l5 5-5 5") + '"/></svg>'; };

  /* calendar */
  function month(base, cls) {
    var y = base.getFullYear(), m = base.getMonth();
    var h = '<div class="cal-m ' + cls + '"><h3>' + (zh ? y + "年" + (m + 1) + "月" : MON[m] + " " + y) + '</h3><div class="cal-g" role="grid">';
    for (var i = 0; i < 7; i++) h += '<span class="dow" aria-hidden="true">' + DOW[i] + "</span>";
    var first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
    for (i = 0; i < first; i++) h += "<span></span>";
    for (var d = 1; d <= days; d++) {
      var dt = new Date(y, m, d), c = [], t = dt.getTime();
      if (t === today.getTime()) c.push("today");
      if (S.in && t === S.in.getTime()) c.push("start");
      if ((S.out && t === S.out.getTime()) || (S.in && !S.out && t === S.in.getTime())) c.push("end");
      if (S.in && S.out && dt > S.in && dt < S.out) c.push("in");
      var sel = c.indexOf("start") > -1 || c.indexOf("end") > -1;
      h += '<button type="button" data-t="' + t + '" class="' + c.join(" ") + '"' + (dt < today ? " disabled" : "") +
        ' aria-label="' + fmt(dt) + '" aria-pressed="' + sel + '"><span>' + d + "</span></button>";
    }
    return h + "</div></div>";
  }
  function drawCal() {
    var atStart = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();
    $("#cal").innerHTML = '<div class="cal-nav"><button type="button" data-v="-1" aria-label="' + (zh ? "上个月" : "Previous month") + '"' + (atStart ? " disabled" : "") + ">" + arrow(-1) +
      '</button><button type="button" data-v="1" aria-label="' + (zh ? "下个月" : "Next month") + '">' + arrow(1) + "</button></div>" +
      month(view, "first") + month(new Date(view.getFullYear(), view.getMonth() + 1, 1), "second");
    $("#to-guests").disabled = !(S.in && S.out);
  }
  $("#cal").addEventListener("click", function (e) {
    var v = e.target.closest("[data-v]");
    if (v && !v.disabled) { view = new Date(view.getFullYear(), view.getMonth() + (+v.dataset.v), 1); drawCal(); return; }
    var b = e.target.closest("button[data-t]");
    if (!b || b.disabled) return;
    var t = new Date(+b.dataset.t);
    if (!S.in || S.out || t <= S.in) { S.in = t; S.out = null; } else { S.out = t; }
    drawCal(); summary();
    var nb = $('#cal button[data-t="' + t.getTime() + '"]'); if (nb) nb.focus();
  });

  /* guests */
  function guests() {
    $$(".stepper").forEach(function (s) {
      var k = s.dataset.k, total = S.adults + S.children;
      $("output", s).textContent = S[k];
      s.querySelector('[data-d="-1"]').disabled = k === "adults" ? S.adults <= 1 : S.children <= 0;
      s.querySelector('[data-d="1"]').disabled = total >= MAX;
    });
    $("#cap-note").textContent = S.adults + S.children >= MAX ? (zh ? "人数较多？请在 WhatsApp 问我们。" : "More of you? Ask us on WhatsApp.") : "";
  }
  $$(".stepper").forEach(function (s) {
    s.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b || b.disabled) return;
      S[s.dataset.k] += +b.dataset.d; guests(); summary();
    });
  });
  function guestText() {
    var a = S.adults, c = S.children;
    return zh ? a + " 位成人" + (c ? "，" + c + " 位儿童" : "") : a + " adult" + (a > 1 ? "s" : "") + (c ? ", " + c + " child" + (c > 1 ? "ren" : "") : "");
  }

  /* summary */
  function summary() {
    var n = nights(), p = price();
    $("#s-dates").textContent = S.in ? fmt(S.in) + " → " + (S.out ? fmt(S.out) : "…") : "—";
    $("#s-guests").textContent = guestText();
    $("#s-nights").textContent = zh ? "整间房子" + (n ? " × " + n + " 晚" : "") : "Whole house" + (n ? " × " + n + " night" + (n > 1 ? "s" : "") : "");
    $("#s-sub").textContent = p == null ? (R.currency || "RM") + " —" : money(p);
    $("#s-total").textContent = p == null ? (R.currency || "RM") + " —" : money(p);
    // the booking bar on the other pages shows the stay and its price once dates are picked
    try {
      if (n) sessionStorage.setItem("eq_stay", JSON.stringify({ d: fmt(S.in) + " → " + fmt(S.out), n: n,
        p: p == null ? (R.currency || "RM") + " —" : money(p) }));
    } catch (e) {}
  }

  /* the WhatsApp request */
  function message() {
    var f = $("#details-form").elements, n = nights(), note = f.note.value.trim(), p = price();
    var lines = zh ? [
      "你好，我想预订 " + C.name + "（整间房子）。",
      "入住：" + fmt(S.in), "退房：" + fmt(S.out) + "（" + n + " 晚）", "人数：" + guestText(),
      "名字：" + f.name.value.trim(), "从：" + f.country.selectedOptions[0].textContent,
    ] : [
      "Hi, I'd like to book " + C.name + " (the whole house).",
      "Check-in: " + fmt(S.in) + " " + S.in.getFullYear(), "Check-out: " + fmt(S.out) + " " + S.out.getFullYear() + " (" + n + " night" + (n > 1 ? "s" : "") + ")",
      "Guests: " + guestText(), "Name: " + f.name.value.trim(), "Travelling from: " + f.country.selectedOptions[0].textContent,
    ];
    if (p != null) lines.push((zh ? "网站显示价格：" : "Price shown on the site: ") + money(p));
    if (note) lines.push((zh ? "备注：" : "Note: ") + note);
    lines.push(zh ? "请确认是否有空房，谢谢！" : "Could you confirm the dates are free? Thank you!");
    return lines.join("\n");
  }
  function engineUrl() {
    return (E.urlTemplate || "").replace("{checkin}", iso(S.in)).replace("{checkout}", iso(S.out))
      .replace("{adults}", S.adults).replace("{children}", S.children).replace("{lang}", zh ? "zh" : "en");
  }

  // innerHTML never runs <script> tags, so a vendor widget is mounted by re-creating each script.
  function mountSnippet(slot, snippet) {
    // the stay, for widgets that can read it before they render
    window.EQ_BOOKING = { checkin: iso(S.in), checkout: iso(S.out), adults: S.adults, children: S.children, lang: zh ? "zh" : "en" };
    var tpl = document.createElement("template"); tpl.innerHTML = snippet;
    $$("script", tpl.content).forEach(function (old) {
      var s = document.createElement("script");
      Array.prototype.forEach.call(old.attributes, function (a) { s.setAttribute(a.name, a.value); });
      s.text = old.textContent; old.replaceWith(s);
    });
    slot.appendChild(tpl.content);
  }

  /* steps */
  function go(step, push) {
    if (ORDER.indexOf(step) < 0) step = "dates";
    var i = ORDER.indexOf(step);
    if (i >= 1 && !(S.in && S.out)) { step = "dates"; i = 0; }
    if (MODE === "whatsapp-enquiry" && i >= 3) {
      var name = $("#f-name"), ok = name.value.trim().length > 1;
      name.setAttribute("aria-invalid", String(!ok)); $("#f-err").hidden = ok;
      if (!ok) { step = "details"; i = 2; }
    }
    $$(".panel[data-panel]").forEach(function (p) { p.hidden = p.dataset.panel !== step; });
    var vis = ORDER.indexOf(step === "sent" ? "send" : step);
    $$(".steps li").forEach(function (li) {
      var j = ORDER.indexOf(li.dataset.s);
      li.classList.toggle("on", j === vis && step !== "sent"); li.classList.toggle("past", j > -1 && (j < vis || step === "sent"));
      if (j === vis) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    if (step === "send") { $("#msg-preview").textContent = message(); $("#send-wa").href = EQ.wa(message()); }
    if (step === "engine") {
      var slot = $("#engine-slot"), btn = $("#engine-go");
      if (DISPLAY === "embed" && !slot.dataset.ready) { mountSnippet(slot, E.embedHtml); slot.dataset.ready = "1"; btn.hidden = true; }
      if (DISPLAY === "iframe") {
        slot.innerHTML = ""; var f = document.createElement("iframe");
        f.src = engineUrl(); f.title = zh ? "预订系统" : "Booking system"; f.className = "engine-frame"; f.loading = "eager";
        slot.appendChild(f); btn.hidden = true;
      }
      if (DISPLAY === "redirect") { btn.href = engineUrl(); btn.hidden = false; }
    }
    EQ.track && EQ.track("booking_step", { step: step, mode: MODE, nights: nights(), guests: S.adults + S.children });
    if (push !== false && location.hash !== "#" + step) history.pushState(null, "", "#" + step);
    if (push !== false) {
      var h = $('[data-panel="' + step + '"] h2'); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-next]"); if (b) go(b.dataset.next);
  });
  $("#send-wa").addEventListener("click", function (e) {
    e.preventDefault();
    EQ.track && EQ.track("booking_request_sent", { nights: nights(), guests: S.adults + S.children });
    EQ.openWa(message(), "booking");
    go("sent");
  });
  $("#f-name").addEventListener("input", function () {
    if (this.value.trim().length > 1) { this.setAttribute("aria-invalid", "false"); $("#f-err").hidden = true; }
  });
  $("#resend").addEventListener("click", function () { EQ.openWa(message(), "booking-again"); });
  $("#engine-go").addEventListener("click", function () { EQ.track && EQ.track("engine_handoff", { provider: E.provider || "", nights: nights() }); });
  window.addEventListener("popstate", function () { go(location.hash.slice(1) || "dates", false); });

  // Optional deep link from elsewhere on the site: book.html?checkin=2026-12-18&checkout=2026-12-20&adults=4
  var q = new URLSearchParams(location.search);
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); if (!m) return null; var d = new Date(+m[1], +m[2] - 1, +m[3]); return d >= today ? d : null; }
  var qi = parse(q.get("checkin")), qo = parse(q.get("checkout"));
  if (qi && qo && qo > qi) { S.in = qi; S.out = qo; view = new Date(qi.getFullYear(), qi.getMonth(), 1); }
  if (+q.get("adults") >= 1) S.adults = Math.min(+q.get("adults"), MAX);
  if (+q.get("children") >= 0 && S.adults + +q.get("children") <= MAX) S.children = +q.get("children") || 0;

  drawCal(); guests(); summary();
  go(location.hash.slice(1) || "dates", false);
})();

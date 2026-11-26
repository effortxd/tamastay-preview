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
})();

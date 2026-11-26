/* TamaStay booking DRAFT: all data is TEST, nothing is sent, booked or charged. */
(() => {
const TODAY = new Date(2026, 10, 26, 14, 58); // Thu 26 Nov 2026 (TEST clock, so every screen reads the same)
const RULES = {minNights: 2, maxNights: 14, maxGuests: 6, holdHours: 2, depositPct: 50, depositIfDaysOver: 14, balanceDaysBefore: 7, arrivalGuideDaysBefore: 3};
const HOLIDAYS = ["2026-12-25", "2027-01-01"];
// TEST bookings across every channel: [checkin, checkout, channel, guest, kind]
const BOOKINGS = [
  ["2026-11-22", "2026-11-26", "Airbnb", "TEST · Sarah T.", "paid"],
  ["2026-11-26", "2026-11-29", "Direct", "TEST · Lim Wei Jie", "deposit"],
  ["2026-11-29", "2026-12-01", "Booking.com", "TEST · Tan M. H.", "ota"],
  ["2026-12-02", "2026-12-03", "Owner", "Aircon service", "block"],
  ["2026-12-04", "2026-12-06", "Agoda", "TEST · Kumar S.", "ota"],
  ["2026-12-11", "2026-12-13", "Direct", "Hold · TEST · Wong K. L.", "hold"],
  ["2026-12-14", "2026-12-16", "Direct", "TEST · Priya R.", "paid"],
  ["2026-12-24", "2026-12-27", "Airbnb", "TEST · Chen family", "paid"],
  ["2026-12-31", "2027-01-02", "Booking.com", "TEST · Ho J.", "ota"],
  ["2027-01-08", "2027-01-10", "Direct", "Hold · TEST · Jessica L.", "hold"]
];
const DEF = {ci: "2026-12-18", co: "2026-12-20", ad: 4, ch: 1, inf: 0, name: "TEST · Lim Wei Jie", phone: "12-000 0000", email: "test@example.com",
  country: "Malaysia", eta: "15:00–17:00", pay: "deposit", method: "fpx", ref: "TEST-TS-2412"};
const KEY = "tamastayDraft";
const st = Object.assign({}, DEF, JSON.parse(sessionStorage.getItem(KEY) || "{}"));
const save = () => sessionStorage.setItem(KEY, JSON.stringify(st));

const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const parse = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmt = (s, dow = true) => { const d = typeof s === "string" ? parse(s) : s; return (dow ? DOW[d.getDay()] + " " : "") + d.getDate() + " " + MON[d.getMonth()]; };
const nightsOf = (ci, co) => Math.round((parse(co) - parse(ci)) / 864e5);
const blocked = new Set();
BOOKINGS.forEach(([a, b]) => { for (let d = parse(a); d < parse(b); d = addD(d, 1)) blocked.add(iso(d)); });
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const set = (sel, html) => $$(sel).forEach(e => e.innerHTML = html);
const ph = (t, why = "Owner to confirm") => `<span class="ph" title="${why}">${t}</span>`;
const toast = msg => { let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.classList.add("show"); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2600); };
window.draftToast = toast;
$$("[data-toast]").forEach(b => b.addEventListener("click", e => { e.preventDefault(); toast(b.dataset.toast); }));

function rangeOk(ci, co) {
  if (!ci || !co) return "Pick a check-out day.";
  const n = nightsOf(ci, co);
  if (n < RULES.minNights) return `Minimum ${RULES.minNights} nights.`;
  if (n > RULES.maxNights) return `For more than ${RULES.maxNights} nights, message us on WhatsApp.`;
  for (let d = parse(ci); d < parse(co); d = addD(d, 1)) if (blocked.has(iso(d))) return "Some of those nights are taken. Pick other dates.";
  return "";
}
function priceInfo() {
  const n = nightsOf(st.ci, st.co); let we = 0;
  for (let d = parse(st.ci); d < parse(st.co); d = addD(d, 1)) if (d.getDay() === 5 || d.getDay() === 6) we++;
  const daysAhead = Math.round((parse(st.ci) - new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate())) / 864e5);
  return {n, we, wk: n - we, daysAhead, deposit: daysAhead > RULES.depositIfDaysOver, balanceOn: addD(parse(st.ci), -RULES.balanceDaysBefore), guideOn: addD(parse(st.ci), -RULES.arrivalGuideDaysBefore)};
}
const guestsTxt = () => { const g = st.ad + st.ch; return g + " guest" + (g > 1 ? "s" : "") + (st.inf ? ` + ${st.inf} infant${st.inf > 1 ? "s" : ""}` : ""); };
const datesTxt = () => `${fmt(st.ci)} – ${fmt(st.co)}`;

// summary aside + dock on every guest screen
function fillSummary() {
  if (!st.ci) return;
  const p = priceInfo();
  set("[data-s=dates]", datesTxt()); set("[data-s=nights]", p.n + " night" + (p.n > 1 ? "s" : ""));
  set("[data-s=guests]", guestsTxt()); set("[data-s=ref]", st.ref); set("[data-s=name]", st.name);
  set("[data-s=dock]", `${fmt(st.ci, false)} – ${fmt(st.co, false)} · ${p.n} night${p.n > 1 ? "s" : ""}`);
  set("[data-s=balance-on]", fmt(p.balanceOn)); set("[data-s=guide-on]", fmt(p.guideOn));
  set("[data-s=ci]", fmt(st.ci)); set("[data-s=co]", fmt(st.co));
  set("[data-s=paynow]", p.deposit && st.pay === "deposit" ? `${RULES.depositPct}% deposit` : "Full amount");
  set("[data-s=first]", (st.name || "").replace("TEST · ", "").split(" ").slice(-2).join(" "));
}

// navigation with checks
$$(".js-next").forEach(b => b.addEventListener("click", e => {
  const page = document.body.dataset.page;
  if (page === "dates") { const err = rangeOk(st.ci, st.co); if (err) { e.preventDefault(); showDateErr(err); return; } }
  if (page === "details" && !checkDetails()) { e.preventDefault(); return; }
  save();
}));

/* ---------- 1 dates ---------- */
let view, picking = null;
function showDateErr(m) { const el = $("#date-err"); if (el) { el.textContent = m; el.hidden = !m; } }
function renderCal() {
  const box = $("#cal"); if (!box) return;
  const months = matchMedia("(min-width:700px)").matches ? 2 : 1;
  let html = "";
  for (let k = 0; k < months; k++) {
    const m0 = new Date(view.getFullYear(), view.getMonth() + k, 1);
    html += `<div class="cal-m"><h3>${MONL[m0.getMonth()]} ${m0.getFullYear()}</h3><div class="cal-g" role="grid">`;
    ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].forEach(d => html += `<div class="dow">${d}</div>`);
    const lead = (m0.getDay() + 6) % 7; for (let i = 0; i < lead; i++) html += "<div></div>";
    const last = new Date(m0.getFullYear(), m0.getMonth() + 1, 0).getDate();
    for (let d = 1; d <= last; d++) {
      const day = new Date(m0.getFullYear(), m0.getMonth(), d), s = iso(day);
      const past = day < new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
      const isBlocked = blocked.has(s);
      // a taken night can still be a checkout day for the night before it
      const canEnd = picking && s > picking && !past;
      const dis = past || (isBlocked && !canEnd);
      let cls = [];
      if (isBlocked) cls.push("blocked"); if (HOLIDAYS.includes(s)) cls.push("hol");
      if (st.ci === s) cls.push("start"); if (st.co === s) cls.push("end");
      if (st.ci && st.co && s > st.ci && s < st.co) cls.push("in");
      const label = `${fmt(day)}${isBlocked ? ", taken" : ""}${HOLIDAYS.includes(s) ? ", public holiday" : ""}`;
      html += `<button type="button" data-d="${s}" class="${cls.join(" ")}" ${dis ? "disabled" : ""} aria-label="${label}"><span>${d}</span></button>`;
    }
    html += "</div></div>";
  }
  box.innerHTML = html;
  const first = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
  $("#prev").disabled = view <= first;
  $$("#cal button[data-d]").forEach(b => b.addEventListener("click", () => pick(b.dataset.d)));
  const p = st.ci && st.co ? priceInfo() : null;
  $("#sel").innerHTML = p
    ? `<span>Check-in <b>${fmt(st.ci)}</b>, from ${ph("3 pm")}</span><span>Checkout <b>${fmt(st.co)}</b>, by ${ph("11 am")}</span><span><b>${p.n} nights</b></span>`
    : st.ci ? `<span>Check-in <b>${fmt(st.ci)}</b>. Now pick your checkout day.</span>` : `<span>Pick your check-in day.</span>`;
  fillSummary();
}
function pick(s) {
  showDateErr("");
  if (!picking) { st.ci = s; st.co = ""; picking = s; }
  else if (s <= picking) { st.ci = s; picking = s; }
  else { st.co = s; picking = null; const err = rangeOk(st.ci, st.co); if (err) showDateErr(err); else save(); }
  renderCal();
}
if (document.body.dataset.page === "dates") {
  view = new Date(parse(st.ci || iso(TODAY)).getFullYear(), parse(st.ci || iso(TODAY)).getMonth(), 1);
  $("#prev").addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); renderCal(); });
  $("#next").addEventListener("click", () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); renderCal(); });
  addEventListener("resize", renderCal);
  if (new URLSearchParams(location.search).get("change")) $("#change-note").hidden = false;
  renderCal();
}

/* ---------- 2 guests ---------- */
if (document.body.dataset.page === "guests") {
  const draw = () => {
    $$(".stp").forEach(s => { const k = s.dataset.k; s.querySelector("output").textContent = st[k];
      s.querySelector("[data-d='-1']").disabled = st[k] <= (k === "ad" ? 1 : 0);
      s.querySelector("[data-d='1']").disabled = k === "inf" ? st.inf >= 2 : st.ad + st.ch >= RULES.maxGuests; });
    $("#cap").textContent = `${st.ad + st.ch} of ${RULES.maxGuests}`; fillSummary(); save();
  };
  $$(".stp button").forEach(b => b.addEventListener("click", () => { st[b.parentElement.dataset.k] += Number(b.dataset.d); draw(); }));
  draw();
}

/* ---------- 3 price ---------- */
if (document.body.dataset.page === "price") {
  const p = priceInfo(); let rows = "";
  if (p.we) rows += `<tr><td>Weekend nights (Fri, Sat) × ${p.we}<small>Rate per night ${ph("RM —", "Owner sets the weekend rate")}</small></td><td>RM —</td></tr>`;
  if (p.wk) rows += `<tr><td>Weeknights × ${p.wk}<small>Rate per night ${ph("RM —", "Owner sets the weeknight rate")}</small></td><td>RM —</td></tr>`;
  rows += `<tr><td>Cleaning fee<small>${ph("If any", "Owner decides: a fee, or built into the rate")}</small></td><td>RM —</td></tr>`;
  rows += `<tr><td>Tourism tax<small>Foreign guests only, RM 10 a night; added at payment if it applies ${ph("[to confirm]", "UNVERIFIED: small-operator exemption")}</small></td><td>RM 0</td></tr>`;
  rows += `<tr class="total"><td>Total for ${p.n} nights, ${guestsTxt()}</td><td>RM —</td></tr>`;
  if (p.deposit) {
    rows += `<tr class="now"><td>Due when you book: ${ph(RULES.depositPct + "% deposit", "Owner sets the deposit")}</td><td>RM —</td></tr>`;
    rows += `<tr><td>Balance<small>We send the payment link on ${fmt(p.balanceOn)}, ${ph("7 days", "Owner sets")} before arrival</small></td><td>RM —</td></tr>`;
  } else rows += `<tr class="now"><td>Due when you book (arrival within 14 days)</td><td>RM —</td></tr>`;
  $("#lines").innerHTML = rows;
}

/* ---------- 4 details ---------- */
function checkDetails() {
  let ok = true;
  [["#f-name", v => v.trim().length > 1], ["#f-phone", v => v.replace(/\D/g, "").length >= 9], ["#f-email", v => /.+@.+\..+/.test(v)]].forEach(([id, t]) => {
    const i = $(id), good = t(i.value); i.closest(".fld").classList.toggle("bad", !good); i.setAttribute("aria-invalid", !good); if (!good && ok) { i.focus(); ok = false; }
  });
  $$(".chk[data-req]").forEach(c => { const good = c.querySelector("input").checked; c.classList.toggle("bad", !good); if (!good) ok = false; });
  if (ok) { st.name = $("#f-name").value; st.phone = $("#f-phone").value; st.email = $("#f-email").value; st.country = $("#f-country").value; }
  else $("#form-err").hidden = false;
  return ok;
}
if (document.body.dataset.page === "details") {
  $("#f-name").value = st.name; $("#f-phone").value = st.phone; $("#f-email").value = st.email; $("#f-country").value = st.country;
}

/* ---------- 5 pay ---------- */
if (document.body.dataset.page === "pay") {
  const p = priceInfo();
  if (!p.deposit) { $("#opt-deposit").hidden = true; st.pay = "full"; }
  $$("input[name=amt]").forEach(r => { r.checked = r.value === st.pay; r.addEventListener("change", () => { st.pay = r.value; save(); fillSummary(); }); });
  $$("input[name=method]").forEach(r => { r.checked = r.value === st.method; r.addEventListener("change", () => { st.method = r.value; save(); }); });
}

/* ---------- 6 pending ---------- */
if (document.body.dataset.page === "pending") {
  let left = RULES.holdHours * 3600 - 7 * 60 - 48;
  const until = new Date(TODAY.getTime() + left * 1000);
  set("[data-s=until]", until.toLocaleTimeString("en-MY", {hour: "numeric", minute: "2-digit"}).toLowerCase());
  const tick = () => { const h = Math.floor(left / 3600), m = Math.floor(left % 3600 / 60), s = left % 60;
    $("#timer").textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; if (left > 0) left--; };
  tick(); setInterval(tick, 1000);
  $$("[data-variant]").forEach(b => b.addEventListener("click", () => {
    if (b.dataset.variant === "paid") { location.href = "g7-confirmed.html"; return; }
    $$("[data-variant]").forEach(x => x.setAttribute("aria-pressed", x === b)); document.body.dataset.v = b.dataset.variant;
    $$("[data-when]").forEach(e => e.hidden = !e.dataset.when.split(" ").includes(b.dataset.variant));
  }));
  $("#check-now").addEventListener("click", () => toast("Checked with Billplz just now: still waiting for the bank (TEST)."));
}

/* ---------- my booking ---------- */
if (document.body.dataset.page === "mine") {
  const p = priceInfo();
  const TL = [["Booked and held", "26 Nov"], ["Deposit paid", "26 Nov"], ["Balance link sent", fmt(p.balanceOn, false)], ["Arrival guide and door code", fmt(p.guideOn, false)], ["Check-in", fmt(st.ci, false)], ["Checkout", fmt(st.co, false)]];
  const PILL = {pending: ["warn", "Payment pending"], deposit: ["ok", "Confirmed · deposit paid"], full: ["ok", "Confirmed · paid in full"], cancelled: ["bad", "Cancelled · refund on its way"]};
  const NOW = {pending: 0, deposit: 2, full: 3, cancelled: -1};
  const show = s => {
    $$("[data-state]").forEach(b => b.setAttribute("aria-pressed", b.dataset.state === s));
    const [c, t] = PILL[s]; $("#pill").className = "pill " + c; $("#pill").textContent = t;
    $$("[data-when]").forEach(e => e.hidden = !e.dataset.when.split(" ").includes(s));
    $("#tl").innerHTML = (s === "cancelled" ? [["Booked and held", "26 Nov"], ["Deposit paid", "26 Nov"], ["Cancelled by you", "26 Nov"], ["Refund sent (50% of deposit)", "26 Nov"], ["In your bank", ph("3–5 working days", "UNVERIFIED: Billplz refund timing")]] : TL)
      .map((r, i) => { const n = s === "cancelled" ? 99 : NOW[s]; const cls = i < n ? "done" : i === n ? "now" : "";
        return `<li class="${cls}"><span>${r[0]}${i === n ? "<small>Next step</small>" : ""}</span><span class="when">${r[1]}</span></li>`; }).join("");
    if (s === "pending") $("#tl").firstElementChild.className = "now";
  };
  $$("[data-state]").forEach(b => b.addEventListener("click", () => show(b.dataset.state)));
  $("#do-cancel").addEventListener("click", () => { show("cancelled"); toast("TEST: booking cancelled, refund of RM — started. Nothing real happened."); scrollTo({top: 0, behavior: "smooth"}); });
  show(new URLSearchParams(location.search).get("s") || "deposit");
}

/* ---------- owner dashboard ---------- */
if (document.body.dataset.page === "owner") {
  const start = parse("2026-11-26"), DAYS = 21, lanes = ["Direct", "Booking.com", "Agoda", "Airbnb", "Owner", "Cleaning"];
  let h = `<div></div>`;
  for (let i = 0; i < DAYS; i++) { const d = addD(start, i), we = d.getDay() === 5 || d.getDay() === 6;
    h += `<div class="d${we ? " we" : ""}${i === 0 ? " td" : ""}"><b>${d.getDate()}</b>${i === 0 || d.getDate() === 1 ? MON[d.getMonth()] : DOW[d.getDay()].slice(0, 2)}</div>`; }
  const pos = (a, b) => { const x = Math.max(0, (parse(a) - start) / 864e5 + .5), y = Math.min(DAYS, (parse(b) - start) / 864e5 + .5);
    return y <= 0 || x >= DAYS ? null : `left:calc(${x / DAYS * 100}% + 2px);width:calc(${(y - x) / DAYS * 100}% - 4px)`; };
  lanes.forEach(l => {
    h += `<div class="lane">${l === "Direct" ? "Direct <span style='color:var(--mute)'>web · WA</span>" : l === "Owner" ? "Owner blocks" : l}</div><div class="cells">`;
    for (let i = 0; i < DAYS; i++) h += `<i${i === 0 ? ' class="td"' : ""}></i>`;
    if (l === "Cleaning") BOOKINGS.filter(b => b[4] !== "block").forEach(b => { const x = (parse(b[1]) - start) / 864e5; if (x >= 0 && x < DAYS)
      h += `<span class="bar clean" title="Turnover ${fmt(b[1])}, 11:00–15:00" style="left:calc(${(x + .38) / DAYS * 100}%);width:calc(${.3 / DAYS * 100}% + 6px);padding:0"></span>`; });
    BOOKINGS.filter(b => b[2] === l).forEach(b => { const s = pos(b[0], b[1]); if (!s) return;
      const cls = b[4] === "hold" ? "hold" : b[4] === "block" ? "blk" : "";
      h += `<span class="bar ${cls}" style="${s}" title="${b[3]}, ${fmt(b[0])} – ${fmt(b[1])}">${b[3].replace("TEST · ", "")}</span>`; });
    h += `</div>`;
  });
  $("#tlc").innerHTML = h;
  // nights sold in the next 30 days, counted from the rows above
  let sold = 0; for (let i = 0; i < 30; i++) { const s = iso(addD(start, i)); if (BOOKINGS.some(b => s >= b[0] && s < b[1] && !["hold", "block"].includes(b[4]))) sold++; }
  $("#sold").innerHTML = `${sold}<em>of 30</em>`;
}

fillSummary();
})();

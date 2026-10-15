/* Dual Controls — UI. Every number shown is computed by window.DC (core.js) on a seeded toy lot; nothing is
   hard-coded except the paper figures quoted in the prose. */
(function () {
  "use strict";
  var DC = window.DC, GL = window.DC_GLOSSARY, IC = window.DC_ICONS || {}, ART = window.DC_ART || {};
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- formatting ---------------- */
  function fmt(n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function pct(p, d) { return fmt(p * 100, d == null ? 0 : d) + "%"; }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }
  function clock(sec) { var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = Math.floor(sec % 60); return h ? h + " h " + (m < 10 ? "0" : "") + m + " min" : m + ":" + (s < 10 ? "0" : "") + s; }
  var HEAD = ["east", "north-east", "north", "north-west", "west", "south-west", "south", "south-east"], ARROW = ["→", "↗", "↑", "↖", "←", "↙", "↓", "↘"], MOVE = ["left", "straight", "right"];
  function pose(s) { return "(" + DC.sx(s) + ", " + DC.sy(s) + ") " + ARROW[DC.sh(s)]; }

  /* ---------------- progress ---------------- */
  var KEY = "dual-controls-v1";
  var store = { predicts: {}, touched: {}, said: {}, cap: {}, ft: {} };
  try { var saved = JSON.parse(localStorage.getItem(KEY) || "null"); if (saved) store = Object.assign(store, saved); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }
  var REDUCED = false; try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  /* ---------------- colours (match css tokens) ---------------- */
  var COL = { student: "#F4C430", studentEdge: "#8A6300", instructor: "#C8322B", demo: "#246A9C", examiner: "#5E4A94", bad: "#A5321F", ink: "#3A2418", line: "#4A2E1E", soft: "#6E5040",
    asphalt: "#8F9397", asphaltD: "#6F7377", kerb: "#D6CFC2", hedge: "#3F7A3A", hedgeL: "#5FA03C", cone: "#E2701C", sheet: "#FFFDF6", grass: "#5FA03C", grassD: "#3B7422", sky: "#9CCBEA", skyD: "#246A9C", rule: "#E7DCC4", yellowD: "#8A6300", lilac: "#B8A3DC", wood: "#B8793F" };

  /* ---------------- nav ---------------- */
  var NAV_ICON = { s0: "lot", s1: "logbook", s2: "dial", s3: "examiner", s4: "demo", s5: "pedals", s6: "hedge", cap: "star", ft: "pencil" };
  var sections = qa("section");
  function buildNav() {
    var nav = $("nav"); nav.innerHTML = "";
    sections.forEach(function (s) {
      var b = document.createElement("button"); b.type = "button"; b.dataset.for = s.id;
      b.innerHTML = '<span class="ic" aria-hidden="true">' + (IC[NAV_ICON[s.id]] || "") + "</span>" + s.dataset.n + " · " + s.dataset.title + (store.said[s.id] ? '<span class="chk">✓</span>' : "");
      b.onclick = function () { show(s.id); };
      nav.appendChild(b);
    });
  }
  function show(id) {
    sections.forEach(function (s) { s.classList.toggle("on", s.id === id); });
    qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === id); });
    if (location.hash !== "#/" + id) history.replaceState(null, "", "#/" + id);
    window.scrollTo(0, 0);
    setTimeout(redrawAll, 0);
  }
  function markNav() { var cur = sections.filter(function (s) { return s.classList.contains("on"); })[0]; if (cur) qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === cur.id); }); }
  var redraws = [];
  function redrawAll() { redraws.forEach(function (f) { try { f(); } catch (e) { if (window.console) console.error(e); } }); }
  function onStep(id) { return $(id).classList.contains("on"); }

  /* ---------------- predictions & say-it ---------------- */
  function touch(sec) { store.touched[sec] = (store.touched[sec] || 0) + 1; save(); checkSay(sec); }
  function checkSay(sec) {
    var el = $(sec); if (!el) return;
    var say = el.querySelector(".say"); if (!say) return;
    var preds = qa(".predict", el);
    var allAnswered = preds.every(function (p) { return store.predicts[p.dataset.p] != null; });
    var played = (store.touched[sec] || 0) > 0;
    if (allAnswered && played) {
      say.classList.add("open");
      if (!store.said[sec]) { store.said[sec] = true; save(); buildNav(); markNav(); }
    }
  }
  function initPredicts() {
    qa(".predict").forEach(function (p) {
      var key = p.dataset.p, btns = qa(".opts button", p), sec = p.closest("section").id;
      function reveal(idx) {
        btns.forEach(function (b, i) { b.disabled = true; if (b.hasAttribute("data-right")) b.classList.add("right"); else if (i === idx) b.classList.add("wrong"); });
        p.classList.add("done");
      }
      btns.forEach(function (b, i) { b.onclick = function () { store.predicts[key] = i; save(); reveal(i); checkSay(sec); }; });
      if (store.predicts[key] != null) reveal(store.predicts[key]);
    });
  }

  /* ---------------- glossary tips ---------------- */
  function bindTip(el) {
    var g = GL[el.dataset.g]; if (!g) return;
    el.setAttribute("tabindex", "0"); el.setAttribute("role", "button");
    var tip = $("tip");
    function place() {
      tipAt = performance.now();
      tip.innerHTML = "<b>" + g[0] + "</b>" + g[1] + '<span class="kt">On the lot: ' + g[2] + "</span>";
      tip.style.display = "block";
      var r = el.getBoundingClientRect(), tw = Math.min(320, window.innerWidth - 24);
      tip.style.width = tw + "px";
      var left = Math.max(12, Math.min(window.innerWidth - tw - 12, r.left + r.width / 2 - tw / 2));
      var top = r.bottom + 8; if (top + tip.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - tip.offsetHeight - 8);
      tip.style.left = left + "px"; tip.style.top = top + "px";
    }
    el.addEventListener("mouseenter", place); el.addEventListener("focus", place);
    el.addEventListener("mouseleave", function () { tip.style.display = "none"; });
    el.addEventListener("blur", function () { tip.style.display = "none"; });
    el.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (tip.style.display === "block") tip.style.display = "none"; else place(); });
  }
  var tipAt = 0;   // when the tip was last placed: focusing a term can scroll it into view, and that scroll must not hide it
  function initTips(root) { qa(".g", root).forEach(bindTip); }
  document.addEventListener("click", function () { $("tip").style.display = "none"; });
  window.addEventListener("scroll", function () { if (performance.now() - tipAt > 500) $("tip").style.display = "none"; }, { passive: true });

  /* ---------------- small widgets ---------------- */
  function seg(el, opts, val, onChange) {
    el.innerHTML = "";
    var state = { value: val };
    opts.forEach(function (o) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = o.label; b.dataset.v = String(o.v);
      if (o.v === val) b.classList.add("on");
      b.setAttribute("aria-pressed", o.v === val ? "true" : "false");
      b.onclick = function () { state.value = o.v; qa("button", el).forEach(function (x) { var on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); }); onChange(o.v); };
      el.appendChild(b);
    });
    return state;
  }
  // Runs onFrame(u) with u from 0 to 1 over the given duration; returns a handle with stop().
  function anim(msDur, onFrame, onDone) {
    var h = { stopped: false, stop: function () { h.stopped = true; } }, t0 = null;
    if (REDUCED) { onFrame(1); if (onDone) onDone(); return h; }
    (function loop(ts) {
      if (h.stopped) return;
      if (t0 == null) t0 = ts;
      var u = Math.max(0, Math.min(1, (ts - t0) / msDur));
      onFrame(u);
      if (u < 1) requestAnimationFrame(loop); else if (onDone) onDone();
    })(performance.now());
    return h;
  }
  // Runs job(k) for k = 0 … n−1 in slices of ~25 ms so the page stays responsive.
  function slices(n, job, onProgress, onDone) {
    var k = 0, h = { stopped: false, stop: function () { h.stopped = true; } };
    (function chunk() {
      if (h.stopped) return;
      var t0 = performance.now();
      while (k < n && performance.now() - t0 < 25) { job(k); k++; }
      if (onProgress) onProgress(k, n);
      if (k < n) setTimeout(chunk, 0); else if (onDone) onDone();
    })();
    return h;
  }
  function busy(btns, on) { btns.forEach(function (b) { if ($(b)) $(b).disabled = on; }); }

  /* ---------------- fleets: 8 seeded students, trained lesson by lesson in slices ---------------- */
  var FC = {};
  function fleet(key, cfg, onProgress, onDone) {
    if (FC[key]) { onDone(FC[key]); return; }
    var T = DC.SEEDS.map(function (sd) { return DC.trainer(Object.assign({}, cfg, { seed: sd })); }), E = T[0].res.o.episodes, n = T.length;
    slices(E * n, function (j) { T[j % n].next(); }, function (k) { if (onProgress) onProgress(Math.floor(k / n), E); }, function () { FC[key] = T.map(function (t) { return t.res; }); onDone(FC[key]); });
  }
  function smooth(a, w) { var out = [], s = 0; for (var i = 0; i < a.length; i++) { s += a[i]; if (i >= w) s -= a[i - w]; out.push(s / Math.min(i + 1, w)); } return out; }

  /* ---------------- canvas basics ---------------- */
  if (!CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) { this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r); this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r); this.arcTo(x, y, x + w, y, r); this.closePath(); };
  function prep(cv) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth || 600, h = cv.clientHeight || Math.round(w / 2);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    var g = cv.getContext("2d"); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    return { g: g, W: w, H: h };
  }
  var HAND = "'Patrick Hand', 'Comic Sans MS', sans-serif", SIGN = "'Grandstander', 'Patrick Hand', sans-serif";

  /* ================= THE LOT =================
     The lot in plan: 12 × 8 squares of asphalt inside a hedge, the seven bays along the top with their signs on the
     kerb, the cones, and the zone where lessons start. One square = one car length = one move. */
  function LotView(id) {
    var cv = $(id), cap = document.createElement("div"); cap.className = "lotcap"; cv.parentNode.insertBefore(cap, cv.nextSibling);
    function geom(W, H) { var c = Math.min(W / 12.9, H / 9.65), ox = (W - 12.9 * c) / 2 + 0.45 * c, oy = (H - 9.65 * c) / 2 + 1.2 * c; return { c: c, W: W, H: H, X: function (x) { return ox + x * c; }, Y: function (y) { return oy + y * c; } }; }
    function car(g, G, x, y, h, o) {   // a learner car seen from above, centred on square (x, y), facing heading h
      o = o || {};
      var c = G.c, a = Math.atan2(DC.DY[h], DC.DX[h]);
      g.save(); g.translate(G.X(x + 0.5), G.Y(y + 0.5)); g.rotate(a); g.globalAlpha = o.ghost ? 0.45 : 1;
      if (o.ring) { g.strokeStyle = COL.instructor; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, c * 0.48, 0, 7); g.stroke(); }
      g.fillStyle = COL.line; [[-0.2, -0.22], [0.2, -0.22], [-0.2, 0.22], [0.2, 0.22]].forEach(function (w) { g.fillRect(w[0] * c - c * 0.07, w[1] * c - c * 0.035, c * 0.14, c * 0.07); });
      g.fillStyle = o.body || COL.sheet; g.strokeStyle = COL.line; g.lineWidth = 1.8; g.beginPath(); g.roundRect(-c * 0.33, -c * 0.2, c * 0.66, c * 0.4, c * 0.09); g.fill(); g.stroke();
      g.fillStyle = COL.sky; g.beginPath(); g.roundRect(-c * 0.12, -c * 0.15, c * 0.24, c * 0.3, c * 0.04); g.fill(); g.stroke();
      g.fillStyle = COL.sheet; g.fillRect(c * 0.2, -c * 0.07, c * 0.11, c * 0.14); g.strokeRect(c * 0.2, -c * 0.07, c * 0.11, c * 0.14);
      g.strokeStyle = COL.instructor; g.lineWidth = Math.max(1.2, c * 0.025); g.beginPath(); g.moveTo(c * 0.235, -c * 0.045); g.lineTo(c * 0.235, c * 0.045); g.lineTo(c * 0.29, c * 0.045); g.stroke();
      g.restore(); g.globalAlpha = 1;
    }
    function base(g, G, o) {
      var c = G.c, x, y;
      g.fillStyle = COL.hedge; g.fillRect(0, 0, G.W, G.H);
      g.fillStyle = COL.hedgeL;
      for (var k = 0; k < 90; k++) { var px = G.X(-0.45 + 12.9 * ((k * 0.618) % 1)), py = k % 2 ? G.Y(-1.15 + 0.1 * (k % 3)) : G.Y(8.08 + 0.1 * (k % 3)); g.beginPath(); g.arc(px, py, c * 0.13, 0, 7); g.fill(); }
      for (k = 0; k < 44; k++) { var qx = k % 2 ? G.X(-0.3 + 0.08 * (k % 3)) : G.X(12.3 - 0.08 * (k % 3)), qy = G.Y(-0.9 + 9.3 * ((k * 0.618) % 1)); g.beginPath(); g.arc(qx, qy, c * 0.12, 0, 7); g.fill(); }
      g.fillStyle = "rgba(0,0,0,.14)"; g.fillRect(G.X(0) + 3, G.Y(-0.9) + 3, 12 * c, 8.9 * c);   // the lot sits a little into the hedge
      // kerb with the bay signs
      g.fillStyle = COL.kerb; g.fillRect(G.X(0), G.Y(-0.9), 12 * c, 0.9 * c); g.strokeStyle = COL.line; g.lineWidth = 1.5; g.strokeRect(G.X(0), G.Y(-0.9), 12 * c, 0.9 * c);
      for (x = 3; x <= 9; x++) {
        var sx0 = G.X(x + 0.15), sy0 = G.Y(-0.8), sw = 0.7 * c, sh = 0.6 * c, sg = DC.cell(x, 0);
        if (sg === "E") {
          for (var u = 0; u < 3; u++) for (var v = 0; v < 2; v++) { g.fillStyle = (u + v) % 2 ? "#F4C430" : "#2E2A26"; g.fillRect(sx0 + u * sw / 3, sy0 + v * sh / 2, sw / 3, sh / 2); }
        } else { g.fillStyle = sg === "S" ? "#3B3F45" : "#B9BDC2"; g.fillRect(sx0, sy0, sw, sh); }
        g.strokeStyle = COL.line; g.lineWidth = 1.5; g.strokeRect(sx0, sy0, sw, sh);
        g.fillStyle = sg === "S" ? "#FFFDF6" : sg === "E" ? COL.ink : COL.ink; g.font = "700 " + Math.max(8, Math.round(c * 0.2)) + "px " + SIGN; g.textAlign = "center";
        if (sg === "S") g.fillText(c < 44 ? "S" : "STAFF", sx0 + sw / 2, sy0 + sh * 0.62); else if (sg !== "E") g.fillText(String(x - 2), sx0 + sw / 2, sy0 + sh * 0.65);
      }
      // asphalt
      g.fillStyle = COL.asphalt; g.fillRect(G.X(0), G.Y(0), 12 * c, 8 * c);
      g.fillStyle = "rgba(255,255,255,.08)"; for (k = 0; k < 160; k++) g.fillRect(G.X((k * 7.31) % 12), G.Y((k * 3.17) % 8), 2.5, 1.5);
      g.strokeStyle = "rgba(255,253,246,.16)"; g.lineWidth = 1; g.beginPath();
      for (x = 1; x < 12; x++) { g.moveTo(G.X(x), G.Y(1)); g.lineTo(G.X(x), G.Y(8)); }
      for (y = 1; y < 8; y++) { g.moveTo(G.X(0), G.Y(y)); g.lineTo(G.X(12), G.Y(y)); }
      g.stroke();
      // the start zone
      g.strokeStyle = "rgba(255,253,246,.55)"; g.lineWidth = 1.5; g.setLineDash([5, 5]); g.strokeRect(G.X(0.06), G.Y(5.06), 11.88 * c, 2.88 * c); g.setLineDash([]);
      g.fillStyle = "rgba(255,253,246,.8)"; g.font = Math.max(10, Math.round(c * 0.24)) + "px " + HAND; g.textAlign = "left"; g.fillText("lessons start in this zone", G.X(0.15), G.Y(7.88));
      // the practice box
      if (o.task === "box") { g.fillStyle = "rgba(244,196,48,.22)"; g.fillRect(G.X(9), G.Y(4), 3 * c, 3 * c); g.strokeStyle = COL.student; g.lineWidth = 3; g.strokeRect(G.X(9) + 2, G.Y(4) + 2, 3 * c - 4, 3 * c - 4); g.fillStyle = COL.student; g.font = "800 " + Math.round(c * 0.3) + "px " + SIGN; g.textAlign = "center"; g.fillText("PRACTICE", G.X(10.5), G.Y(6.82)); }
      // top row: flowerbeds, parked cars, empty bays
      for (x = 0; x < 12; x++) {
        var ch = DC.cell(x, 0);
        if (ch === "F") { g.fillStyle = "#6E8F3A"; g.fillRect(G.X(x), G.Y(0), c, c); g.strokeStyle = COL.line; g.lineWidth = 1.2; g.strokeRect(G.X(x), G.Y(0), c, c); ["#F2A88F", "#F4C430", "#FFFDF6", "#B8A3DC"].forEach(function (fc, i) { g.fillStyle = fc; g.beginPath(); g.arc(G.X(x + 0.25 + 0.5 * (i % 2)), G.Y(0.3 + 0.4 * Math.floor(i / 2)), c * 0.09, 0, 7); g.fill(); }); }
        else { g.fillStyle = ch === "E" ? "#9A9EA2" : COL.asphalt; g.fillRect(G.X(x), G.Y(0), c, c); }
        if (ch === "P") car(g, G, x, 0, 2, { body: ["#C8452F", "#5FA03C", "#B8A3DC", "#DDBB8A", "#9CCBEA"][x % 5] });
      }
      g.strokeStyle = "#FFFDF6"; g.lineWidth = Math.max(2, c * 0.06); g.beginPath(); for (x = 3; x <= 10; x++) { g.moveTo(G.X(x), G.Y(0)); g.lineTo(G.X(x), G.Y(0.95)); } g.stroke();
      g.fillStyle = COL.ink; g.font = "700 " + Math.max(8, Math.round(c * 0.2)) + "px " + SIGN; g.textAlign = "center"; g.fillText(c < 30 ? "" : "EXAM", G.X(8.5), G.Y(0.62));
      // cones
      for (y = 0; y < 8; y++) for (x = 0; x < 12; x++) if (DC.cell(x, y) === "C") {
        var cx = G.X(x + 0.5), cy = G.Y(y + 0.5);
        g.fillStyle = COL.cone; g.strokeStyle = COL.line; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, c * 0.24, 0, 7); g.fill(); g.stroke();
        g.strokeStyle = COL.sheet; g.lineWidth = c * 0.06; g.beginPath(); g.arc(cx, cy, c * 0.14, 0, 7); g.stroke();
        g.fillStyle = COL.cone; g.beginPath(); g.arc(cx, cy, c * 0.07, 0, 7); g.fill();
      }
      // the fence
      if (o.fence) { g.strokeStyle = COL.wood; g.lineWidth = 3; g.setLineDash([2, 6]); g.strokeRect(G.X(0) - 4, G.Y(0) - 3, 12 * c + 8, 8 * c + 7); g.setLineDash([]); g.strokeStyle = COL.wood; g.lineWidth = 1.5; g.strokeRect(G.X(0) - 4, G.Y(0) - 3, 12 * c + 8, 8 * c + 7); }
      g.strokeStyle = COL.line; g.lineWidth = 2; g.strokeRect(G.X(0), G.Y(-0.9), 12 * c, 8.9 * c);
    }
    function path(g, G, pts, col, width, alpha, dash) {
      if (pts.length < 2) return;
      g.globalAlpha = alpha == null ? 1 : alpha; g.lineJoin = "round"; g.lineCap = "round"; g.setLineDash(dash || []);
      g.strokeStyle = col; g.lineWidth = width;
      g.beginPath(); pts.forEach(function (p, i) { var X = G.X(p[0] + 0.5), Y = G.Y(p[1] + 0.5); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke();
      g.setLineDash([]); g.globalAlpha = 1;
    }
    function mark(g, G, m) {
      var X = G.X(m.x + 0.5), Y = G.Y(m.y + 0.5), c = G.c;
      if (m.type === "crash") { g.fillStyle = COL.bad; g.strokeStyle = COL.line; g.lineWidth = 1.5; g.beginPath(); for (var i = 0; i < 16; i++) { var r = i % 2 ? c * 0.14 : c * 0.32, t = i * Math.PI / 8; g.lineTo(X + r * Math.cos(t), Y + r * Math.sin(t)); } g.closePath(); g.fill(); g.stroke(); }
      if (m.type === "ok") { g.strokeStyle = COL.grassD; g.lineWidth = c * 0.12; g.beginPath(); g.moveTo(X - c * 0.22, Y); g.lineTo(X - c * 0.05, Y + c * 0.18); g.lineTo(X + c * 0.26, Y - c * 0.2); g.stroke(); }
      if (m.type === "bump") { g.strokeStyle = COL.wood; g.lineWidth = 2; g.beginPath(); g.arc(X, Y, c * 0.36, 0, 7); g.stroke(); }
      if (m.type === "wanted") { g.strokeStyle = COL.instructor; g.lineWidth = 2; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(G.X(m.fx + 0.5), G.Y(m.fy + 0.5)); g.lineTo(X, Y); g.stroke(); g.setLineDash([]); g.font = "700 " + Math.round(c * 0.4) + "px " + SIGN; g.fillStyle = COL.instructor; g.textAlign = "center"; g.fillText("✕", X, Y + c * 0.14); }
    }
    var lastSt = null;
    function render(st) {
      st = st || { task: "park", car: [1, 6, 0] }; lastSt = st;
      var cc = prep(cv), g = cc.g, G = geom(cc.W, cc.H);
      base(g, G, st);
      (st.demos || []).forEach(function (d) { path(g, G, d, COL.demo, Math.max(2, G.c * 0.07), 0.55); });
      if (st.traj) {
        var tr = st.traj, k = st.k == null ? tr.length : Math.min(st.k, tr.length), pts = [[DC.sx(tr[0].s), DC.sy(tr[0].s)]], i;
        for (i = 0; i < k; i++) {
          var a = tr[i], from = [DC.sx(a.s), DC.sy(a.s)], to = a.crash ? [a.x, a.y] : [a.x, a.y], col = a.who === "instructor" ? COL.instructor : a.who === "demo" ? COL.demo : COL.student;
          if (a.crash) { path(g, G, [from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]], COL.line, G.c * 0.16); path(g, G, [from, [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2]], col, G.c * 0.1); }
          else { path(g, G, [from, to], COL.line, G.c * 0.16); path(g, G, [from, to], col, G.c * 0.1); }
          if (a.who === "instructor" && a.wanted !== a.a && st.wanted && (i === 0 || tr[i - 1].who !== "instructor")) { var w = DC.move(a.s, a.wanted, "park", false); mark(g, G, { type: "wanted", x: (from[0] + w.x) / 2, y: (from[1] + w.y) / 2, fx: from[0], fy: from[1] }); }
          if (a.bump) mark(g, G, { type: "bump", x: from[0], y: from[1] });
        }
        var cur = k ? tr[k - 1] : null, last = tr[tr.length - 1];
        if (cur && cur.crash) { mark(g, G, { type: "crash", x: (DC.sx(cur.s) + cur.x) / 2, y: (DC.sy(cur.s) + cur.y) / 2 }); car(g, G, DC.sx(cur.s), DC.sy(cur.s), cur.h, {}); }
        else if (cur) car(g, G, cur.x, cur.y, cur.h, { ring: cur.who === "instructor" });
        else car(g, G, DC.sx(tr[0].s), DC.sy(tr[0].s), DC.sh(tr[0].s), {});
        if (k >= tr.length && last.ok) mark(g, G, { type: "ok", x: last.x, y: last.y + 0.9 });
      } else if (st.car) car(g, G, st.car[0], st.car[1], st.car[2], {});
      if (st.arrow) { var A = st.arrow; path(g, G, [A.from, A.to], COL.line, G.c * 0.16); path(g, G, [A.from, A.to], A.col || COL.student, G.c * 0.1); if (A.crash) mark(g, G, { type: "crash", x: A.to[0], y: A.to[1] }); else car(g, G, A.to[0], A.to[1], A.h, { ghost: true }); car(g, G, A.from[0], A.from[1], A.h0, {}); }
      cap.innerHTML = st.label ? "<i>" + esc(st.label) + "</i>" : "";
      if (st.stamp) { var sp = st.stamp; g.save(); g.font = "800 20px " + SIGN; var sw0 = g.measureText(sp.text).width + 22; g.font = "13px " + HAND; sw0 = Math.max(sw0, g.measureText(sp.sub || "").width + 16); g.translate(Math.min(G.X(10.3), cc.W - sw0 / 2 - 10), G.Y(3)); g.rotate(-0.12); g.font = "800 " + 20 + "px " + SIGN; var sw2 = g.measureText(sp.text).width + 22; g.fillStyle = "rgba(255,253,246,.92)"; g.strokeStyle = sp.col; g.lineWidth = 3; g.beginPath(); g.roundRect(-sw2 / 2, -18, sw2, 34, 6); g.fill(); g.stroke(); g.fillStyle = sp.col; g.textAlign = "center"; g.fillText(sp.text, 0, 6); if (sp.sub) { g.font = "13px " + HAND; g.fillStyle = COL.ink; g.fillText(sp.sub, 0, 32); } g.restore(); }
    }
    return { render: render, again: function () { render(lastSt); } };
  }
  // plays a recorded lesson on a lot view, about 6 moves a second
  function play(view, st, onTick, onDone, speed) {
    var N = st.traj.length, dur = Math.max(900, N / (speed || 6) * 1000);
    return anim(dur, function (u) { var k = Math.min(N, Math.floor(u * N + 0.999)); view.render(Object.assign({}, st, { k: k })); if (onTick) onTick(k); }, onDone);
  }

  /* ---------------- a line chart ---------------- */
  function lineChart(id, o) {
    var c = prep($(id)), g = c.g, W = c.W, H = c.H, narrow = W < 480, pad = { l: narrow ? 58 : 64, r: 14, t: 14, b: narrow ? 38 : 42 };
    var xmin = o.xmin || 0, xmax = o.xmax || 1, ymax = o.ymax || 1;
    var X = function (v) { return pad.l + (v - xmin) / (xmax - xmin || 1) * (W - pad.l - pad.r); };
    var Y = function (v) { return H - pad.b - v / ymax * (H - pad.t - pad.b); };
    g.fillStyle = COL.sheet; g.fillRect(0, 0, W, H);
    g.strokeStyle = COL.rule; g.lineWidth = 1; g.fillStyle = COL.soft; g.font = (narrow ? 12 : 13) + "px " + HAND;
    for (var j = 0; j <= 4; j++) { var yv = ymax * j / 4, yy = Y(yv); if (j) { g.beginPath(); g.moveTo(pad.l, yy); g.lineTo(W - pad.r, yy); g.stroke(); } if (o.hline == null || Math.abs(yy - Y(o.hline)) > 13) { g.textAlign = "right"; g.fillText(o.yfmt ? o.yfmt(yv) : fmt(yv, 1), pad.l - 8, yy + 4); } }
    g.textAlign = "center"; var ticks = o.xticks || 5;
    g.strokeStyle = COL.line; g.lineWidth = 1.5; g.lineCap = "round";
    for (j = 0; j <= ticks; j++) { var xv = xmin + (xmax - xmin) * j / ticks; g.fillText(o.xfmt ? o.xfmt(xv) : fmt(xv), X(xv), H - pad.b + 17); g.beginPath(); g.moveTo(X(xv), H - pad.b); g.lineTo(X(xv), H - pad.b + 4); g.stroke(); }
    // the two axes, drawn like a ruled page
    g.beginPath(); g.moveTo(pad.l, pad.t - 4); g.lineTo(pad.l, H - pad.b); g.lineTo(W - pad.r, H - pad.b); g.stroke();
    g.fillStyle = COL.soft; g.font = (narrow ? 12 : 13.5) + "px " + HAND;
    if (o.xlab) g.fillText(o.xlab + " →", (pad.l + W - pad.r) / 2, H - 4);
    if (o.ylab) { g.save(); g.translate(12, (pad.t + H - pad.b) / 2); g.rotate(-Math.PI / 2); g.textAlign = "center"; g.fillText((narrow && o.ylabS ? o.ylabS : o.ylab) + " →", 0, 0); g.restore(); }
    if (o.hline != null) {
      g.strokeStyle = COL.grassD; g.setLineDash([5, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(pad.l, Y(o.hline)); g.lineTo(W - pad.r, Y(o.hline)); g.stroke(); g.setLineDash([]);
      var hl = o.yfmt ? o.yfmt(o.hline) : fmt(o.hline, 2); g.font = "700 12.5px " + HAND; var hw = g.measureText(hl).width + 12, hy = Y(o.hline);   // a bookmark on the ruled margin
      if (narrow) { g.fillStyle = COL.grassD; g.textAlign = "right"; g.fillText(hl, pad.l - 8, hy + 4); g.beginPath(); g.moveTo(pad.l - 5, hy); g.lineTo(pad.l - 1, hy - 3); g.lineTo(pad.l - 1, hy + 3); g.closePath(); g.fill(); }
      else {
        g.fillStyle = "#E7F3DE"; g.strokeStyle = COL.grassD; g.lineWidth = 1.2; g.beginPath(); g.moveTo(pad.l - 4, hy); g.lineTo(pad.l - 9, hy - 9); g.lineTo(pad.l - 9 - hw, hy - 9); g.lineTo(pad.l - 9 - hw, hy + 9); g.lineTo(pad.l - 9, hy + 9); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = COL.grassD; g.textAlign = "right"; g.fillText(hl, pad.l - 14, hy + 4);
      }
    }
    g.lineJoin = "round";
    (o.series || []).forEach(function (s) {
      g.strokeStyle = s.col; g.lineWidth = s.width || 2.5; g.setLineDash(s.dash || []);
      g.beginPath(); var started = false, lx = null, ly = null;
      s.ys.forEach(function (v, i) { if (v == null) return; var px = X(s.xs[i]), py = Y(Math.min(ymax, v)); if (started) g.lineTo(px, py); else { g.moveTo(px, py); started = true; } lx = px; ly = py; });
      g.stroke(); g.setLineDash([]);
      if (lx != null) { g.fillStyle = s.col; g.strokeStyle = COL.sheet; g.lineWidth = 1.5; g.beginPath(); g.arc(lx, ly, s.width ? s.width + 1 : 3.5, 0, 7); g.fill(); g.stroke(); }
    });
    // the legend: an HTML row right under the chart, so it never sits on a line
    var cv = $(id), lg = cv.nextElementSibling;
    if (!lg || !lg.classList.contains("chartlegend")) { lg = document.createElement("div"); lg.className = "legend chartlegend"; cv.parentNode.insertBefore(lg, cv.nextSibling); }
    var items = (o.series || []).filter(function (s) { return s.name; });
    if (o.hline != null && items.length) items = items.concat([{ name: o.hlab || "the target", col: COL.grassD, dash: true }]);
    lg.innerHTML = items.map(function (s) { return '<span><span class="ln" style="border-top:3px ' + (s.dash ? "dashed" : "solid") + " " + s.col + '"></span>' + esc(s.name) + "</span>"; }).join("");
    if (o.empty) {   // an empty chart: a note pinned to the page, not a blank
      g.font = "16px " + HAND; var ew = Math.min(W - pad.l - 30, g.measureText(o.empty).width + 30), ex = (pad.l + W - pad.r) / 2 - ew / 2, ey = (pad.t + H - pad.b) / 2 - 20;
      g.fillStyle = "#FFF1A8"; g.strokeStyle = COL.line; g.lineWidth = 1.5; g.save(); g.translate(ex + ew / 2, ey + 20); g.rotate(-0.02); g.beginPath(); g.roundRect(-ew / 2, -20, ew, 40, 3); g.fill(); g.stroke();
      g.fillStyle = "rgba(156,203,234,.8)"; g.fillRect(-18, -26, 36, 11); g.strokeStyle = "rgba(74,46,30,.4)"; g.lineWidth = 1; g.strokeRect(-18, -26, 36, 11);
      g.fillStyle = COL.ink; g.textAlign = "center"; g.fillText(o.empty, 0, 6); g.restore();
    }
  }
  var PCT = function (v) { return fmt(v * 100) + "%"; };
  var LINE_COLS = ["#C8322B", "#246A9C", "#3B7422", "#5E4A94", "#8A6300", "#B8793F", "#6E5040"];

  /* ---------------- the dashcam photo ---------------- */
  function drawPhoto(cv, px) {
    cv.width = 5; cv.height = 4;
    var g = cv.getContext("2d"), im = g.createImageData(5, 4);
    for (var i = 0; i < 20; i++) { var v = Math.max(0, Math.min(255, Math.round(px[i] * 255))); im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
  }

  /* ================= STEP 0 ================= */
  function initS0() {
    var view = LotView("s0c"), running = null, n = 0, crashes = 0, parks = 0, secs = 0, seed = 1;
    function hud() { $("s0t").textContent = clock(secs); $("s0n").textContent = fmt(n); $("s0x").textContent = fmt(crashes); $("s0p").textContent = fmt(parks); }
    function randomLesson(sd) {
      var r = DC.rng(1000 + sd), st = DC.STARTS[r.int(DC.STARTS.length)], s = DC.sid(st[0], st[1], st[2]), traj = [];
      for (var t = 0; t < DC.T; t++) { var a = r.int(3), m = DC.move(s, a, "park", false); traj.push({ s: s, a: a, wanted: a, who: "student", x: m.x, y: m.y, h: m.h, crash: m.crash, r: m.success ? 1 : 0, ok: m.success, s2: m.s2, bay: m.bay, done: m.crash || !!m.bay || m.success }); if (m.crash || m.bay || m.success) break; s = m.s2; }
      return traj;
    }
    function logTable(tr) {
      $("s0log").innerHTML = "<tr><th>#</th><th>s: square, heading</th><th>a: move</th><th>r</th><th>s′</th><th>done</th></tr>" + tr.map(function (p, i) {
        return "<tr><td>" + (i + 1) + "</td><td>" + pose(p.s) + "</td><td>" + MOVE[p.a] + "</td><td class=\"n\">" + p.r + "</td><td>" + (p.crash ? "crash" : "(" + p.x + ", " + p.y + ") " + ARROW[p.h] + (p.bay ? (DC.cell(p.x, p.y) === "E" ? " exam bay" : " staff bay") : "")) + "</td><td>" + (p.done ? "yes" : "") + "</td></tr>";
      }).join("");
    }
    var last = randomLesson(0);
    $("s0one").onclick = function () {
      if (running) running.stop();
      var tr = randomLesson(seed++); last = tr; logTable(tr);
      var lessonSecs = 0;
      running = play(view, { task: "park", traj: tr, label: "lesson " + (n + 1) + " · the untrained student" }, function (k) { $("s0t").textContent = clock(secs + k); }, function () {
        running = null; var end = tr[tr.length - 1];
        n++; if (end.crash) crashes++; if (end.ok) parks++;
        secs += tr.length + (end.crash ? 45 : 10); hud();
        $("s0st").innerHTML = end.crash ? "Crashed after <b>" + tr.length + "</b> moves: 45 seconds to reset." : end.ok ? "<b>Parked!</b>" : end.bay ? "Pulled into a <b>staff bay</b>: the lesson ends, reward 0." : "Time's up after 30 moves.";
        touch("s0");
      });
    };
    $("s0many").onclick = function () {
      if (running) running.stop(); running = null;
      var R = DC.randomLessons(2000, 11);
      n = R.n; crashes = R.crash; parks = R.success; secs = R.secs; hud();
      $("s0st").innerHTML = "2,000 lessons, " + fmt(R.secs / 3600, 1) + " hours of lot time: <b>" + R.success + "</b> parked straight in the exam bay (" + pct(R.success / R.n, 1) + "), " + pct(R.crash / R.n) + " crashed, " + R.staff + " ended in a staff bay. " + fmt(R.moves / R.n, 1) + " moves a lesson.";
      view.render({ task: "park", traj: last, label: "the last lesson of the 2,000" });
      touch("s0");
    };
    logTable(last); hud();
    view.render({ task: "park", car: [1, 6, 0] });
    redraws.push(function () { if (onStep("s0") && !running) view.render(n ? { task: "park", traj: last } : { task: "park", car: [1, 6, 0] }); });
  }

  /* ================= STEP 1 ================= */
  function fleetSeries(runs, xKey, name, col, dash, lv) {
    var S = DC.summarize(runs, lv || 0.8), ys = smooth(S.curve, 5), xs = xKey === "min" ? S.mins : S.curve.map(function (_, i) { return i + 1; });
    return { name: name, col: col, ys: ys, xs: xs, dash: dash };
  }
  function reuse(runs) { return runs.reduce(function (s, r) { return s + r.replays / Math.max(1, r.online); }, 0) / runs.length; }
  function initS1() {
    var o = { utd: 4 }, done = {}, order = [];
    function draw() {
      var series = [], xmax = 60;
      order.forEach(function (k, i) { var runs = done[k]; series.push(fleetSeries(runs, "min", k === "rf" ? "REINFORCE (on-policy)" : "SAC, " + k.slice(3) + " batch" + (k === "utd1" ? "" : "es") + " per move", k === "rf" ? COL.bad : LINE_COLS[1 + i % 5], k === "rf" ? [6, 4] : null)); xmax = Math.max(xmax, DC.summarize(runs).mins.slice(-1)[0]); });
      lineChart("s1chart", { series: series, xmin: 0, xmax: Math.ceil(xmax / 60) * 60, ymax: 1, yfmt: PCT, xfmt: function (v) { return fmt(v / 60, 1) + " h"; }, xlab: "lot time, resets included", ylab: "exam score", hline: 0.75, hlab: "the 75% mark", empty: series.length ? null : "press Race to draw the curves" });
      $("s1tab").innerHTML = order.length ? "<tr><th>learner</th><th>exam after 50</th><th>100</th><th>200</th><th>300 lessons</th><th>75% at lesson</th><th>lot time to 75%</th><th>each move studied</th></tr>" + order.map(function (k) {
        var runs = done[k], S = DC.summarize(runs, 0.75), cr = DC.crossing(S.curve, 0.75);
        return "<tr><td>" + (k === "rf" ? "REINFORCE" : "SAC, UTD " + k.slice(3)) + "</td>" + [50, 100, 200, 300].map(function (x) { return "<td>" + pct(S.curve[x - 1]) + "</td>"; }).join("") + '<td class="n">' + (cr || "–") + "</td><td>" + (cr ? fmt(S.mins[cr - 1], 0) + " min" : "–") + "</td><td>" + (k === "rf" ? "once" : fmt(reuse(runs), 0) + "×") + "</td></tr>";
      }).join("") : "";
    }
    function run(keys, cb) {
      var i = 0;
      (function next() {
        if (i >= keys.length) { cb(); return; }
        var k = keys[i];
        fleet("s1" + k, DC.FLEETS.s1[k], function (l, E) { $("s1st").textContent = (k === "rf" ? "REINFORCE" : "SAC (UTD " + k.slice(3) + ")") + ": lesson " + l + " of " + E + " for 8 students…"; }, function (runs) { done[k] = runs; if (order.indexOf(k) < 0) order.push(k); draw(); i++; setTimeout(next, 0); });
      })();
    }
    $("s1go").onclick = function () {
      busy(["s1go"], true);
      run(["rf", "utd" + o.utd], function () { busy(["s1go"], false); var S = DC.summarize(done["utd" + o.utd], 0.75), R = DC.summarize(done.rf, 0.75); $("s1st").innerHTML = "REINFORCE reaches 75% at lesson <b>" + DC.crossing(R.curve, 0.75) + "</b>; SAC with " + o.utd + " batch" + (o.utd > 1 ? "es" : "") + " per move at lesson <b>" + (DC.crossing(S.curve, 0.75) || "–") + "</b>. Same lot, same starts."; touch("s1"); });
    };
    seg($("s1utd"), [{ v: 1, label: "1" }, { v: 4, label: "4" }, { v: 16, label: "16 (slow: ~10 s)" }], o.utd, function (v) { o.utd = v; });
    draw();
    redraws.push(function () { if (onStep("s1")) draw(); });
  }

  /* ================= STEP 2 ================= */
  function initS2() {
    var run = null, picks = null, sel = 0, lot = LotView("s2lot"), alpha = 0.1, temps = {}, order = [];
    function ensure() { if (!run) { run = DC.train(Object.assign({}, DC.FLEETS.s2.auto, { seed: 2, episodes: 60, keepBuffer: true })); picks = DC.bellmanPicks(run); } }
    function showPage() {
      ensure();
      var ag = run.agent, pk = picks[sel], t = pk.tr, al = Math.exp(ag.la), q = ag.Q[t.s * 3 + t.a], y = DC.target(ag, t), html;
      if (t.done) {
        html = '<div class="eq">y = r = ' + t.r + "</div><div class=\"eqn\">The lesson ended on this move" + (t.r ? ": parked in the box, reward <b>1</b>." : ": it hit something, reward <b>0</b>.") + " Nothing follows, so nothing is added.</div>";
        $("s2tab").innerHTML = "";
      } else {
        var p = DC.policy(ag, t.s2), rows = "", v = 0;
        for (var a = 0; a < 3; a++) { var qb = DC.qbar(ag, t.s2 * 3 + a), ent = -al * Math.log(p[a]), part = p[a] * (qb + ent); v += part; rows += "<tr><td>" + MOVE[a] + "</td><td>" + fmt(p[a], 3) + "</td><td>" + fmt(qb, 3) + "</td><td>" + fmt(ent, 3) + '</td><td class="n">' + fmt(part, 3) + "</td></tr>"; }
        $("s2tab").innerHTML = "<tr><th>next move a′ at s′</th><th>π(a′|s′)</th><th>Q̄(s′,a′)</th><th>−α log π</th><th>π·(Q̄ − α log π)</th></tr>" + rows + '<tr><td colspan="4">V̄(s′), the sum</td><td class="n">' + fmt(v, 3) + "</td></tr>";
        html = '<div class="eq">y = r + γ · V̄(s′) = ' + t.r + " + 0.95 × " + fmt(v, 3) + " = " + fmt(y, 3) + "</div><div class=\"eqn\">V̄(s′) averages the slow copy's values of the three next moves under the student's habits, each topped up by the temperature's bonus −α log π (α = " + fmt(al, 3) + ").</div>";
      }
      html += '<div class="eqn">The critic said Q(s, a) = <b>' + fmt(q, 3) + "</b>. One study step moves it half way: Q ← Q + 0.5 (y − Q) = <b>" + fmt(q + 0.5 * (y - q), 3) + "</b>.</div>";
      $("s2m").innerHTML = '<div class="eqn">Page: from ' + pose(t.s) + " the student steered <b>" + MOVE[t.a] + "</b>; r = " + t.r + (t.done ? ", the lesson ended." : ", lesson goes on.") + "</div>" + html;
      var from = [DC.sx(t.s), DC.sy(t.s)], m = DC.move(t.s, t.a, "box", false);
      lot.render({ task: "box", arrow: { from: from, to: [m.x, m.y], h0: DC.sh(t.s), h: m.h, crash: m.crash }, label: "after 60 lessons: " + run.online + " moves logged" });
    }
    function bars() {
      var q = [0.62, 0.70, 0.55], z = q.map(function (v) { return Math.exp(v / alpha); }), sm = z.reduce(function (a, b) { return a + b; }), p = z.map(function (v) { return v / sm; }), H = DC.entropy(p);
      var c = prep($("s2bars")), g = c.g, W = c.W, Hh = c.H, bw = Math.min(110, W / 5);
      g.fillStyle = COL.sheet; g.fillRect(0, 0, W, Hh);
      p.forEach(function (v, i) {
        var x = W / 2 + (i - 1) * bw * 1.4 - bw / 2, top = 24, bot = Hh - 44, h = (bot - top) * v;
        g.fillStyle = "#F6EFDD"; g.fillRect(x, top, bw, bot - top); g.strokeStyle = COL.rule; g.lineWidth = 1; g.strokeRect(x, top, bw, bot - top);
        g.fillStyle = i === 1 ? COL.student : COL.lilac; g.strokeStyle = COL.line; g.lineWidth = 2; g.fillRect(x, bot - h, bw, h); g.strokeRect(x, bot - h, bw, h);
        if (i === 0) { g.strokeStyle = COL.line; g.lineWidth = 1.5; g.beginPath(); g.moveTo(W / 2 - bw * 1.4 - bw / 2 - 10, bot); g.lineTo(W / 2 + bw * 1.4 + bw / 2 + 10, bot); g.stroke(); g.fillStyle = COL.soft; g.font = "12px " + HAND; g.textAlign = "right"; g.fillText("100%", x - 6, top + 5); g.fillText("0%", x - 6, bot + 4); }
        g.fillStyle = COL.ink; g.font = "800 17px " + SIGN; g.textAlign = "center"; g.fillText(pct(v), x + bw / 2, Math.max(top + 16, bot - h - 6));
        g.font = "15px " + HAND; g.fillStyle = COL.soft; g.fillText(MOVE[i] + " · Q = " + q[i].toFixed(2), x + bw / 2, bot + 20);
      });
      $("s2av").textContent = fmt(alpha, alpha < 0.1 ? 3 : 2);
      $("s2bst").innerHTML = "α = " + fmt(alpha, alpha < 0.1 ? 3 : 2) + ": the best move (straight) gets <b>" + pct(p[1]) + "</b>; entropy <b>" + fmt(H, 2) + "</b> nats of a possible 1.10.";
    }
    var NAMES = { hot: "α fixed at 1.0", auto: "α tuned, from 1.0", cool: "α fixed at 0.01", off: "no entropy (α ≈ 0)", tau1: "no slow copy (τ = 1)", tau05: "slow copy τ = 0.05" };
    function drawT() {
      var series = order.filter(function (k) { return k.indexOf("tau") < 0; }).map(function (k, i) { return fleetSeries(temps[k], "lessons", NAMES[k], LINE_COLS[i]); });
      lineChart("s2chart", { series: series, xmin: 0, xmax: 300, ymax: 1, yfmt: PCT, xlab: "lessons", ylab: "exam score", hline: 0.75, hlab: "the 75% mark", empty: series.length ? null : "press Run the four temperatures" });
      $("s2t2").innerHTML = order.length ? "<tr><th>setting</th><th>exam after 300 lessons</th><th>75% at lesson</th><th>final α</th><th>moves per lesson (last 20)</th></tr>" + order.map(function (k) {
        var runs = temps[k], S = DC.summarize(runs, 0.75), mv = runs.reduce(function (s, r) { return s + r.ep.slice(-20).reduce(function (a, e) { return a + e.steps; }, 0) / 20; }, 0) / runs.length;
        return "<tr><td>" + NAMES[k] + (k === "auto" ? " (also τ = 0.005)" : "") + '</td><td class="n">' + pct(S.pass) + "</td><td>" + (DC.crossing(S.curve, 0.75) || "–") + "</td><td>" + fmt(S.alpha, 3) + "</td><td>" + fmt(mv, 1) + "</td></tr>";
      }).join("") : "";
    }
    function runKeys(keys, btn) {
      busy(["s2go", "s2tau"], true); var i = 0;
      (function next() {
        if (i >= keys.length) { busy(["s2go", "s2tau"], false); $("s2st").textContent = ""; touch("s2"); return; }
        var k = keys[i];
        fleet("s2" + k, DC.FLEETS.s2[k], function (l, E) { $("s2st").textContent = NAMES[k] + ": lesson " + l + " of " + E + "…"; }, function (runs) { temps[k] = runs; if (order.indexOf(k) < 0) order.push(k); drawT(); i++; setTimeout(next, 0); });
      })();
    }
    $("s2go").onclick = function () { runKeys(["hot", "auto", "cool", "off"]); };
    $("s2tau").onclick = function () { runKeys(["auto", "tau1", "tau05"]); };
    $("s2a").addEventListener("input", function () { alpha = Math.pow(10, -2 + 2 * this.value / 100); bars(); touch("s2"); });
    var pageSeg = null;
    function buildPages() { ensure(); pageSeg = seg($("s2page"), picks.map(function (p, i) { return { v: i, label: p.name }; }), sel, function (v) { sel = v; showPage(); touch("s2"); }); }
    buildPages(); showPage(); bars(); drawT();
    redraws.push(function () { if (onStep("s2")) { showPage(); bars(); drawT(); } });
  }

  /* ================= STEP 3 ================= */
  var THRS = [0.5, 0.9, 0.99, 0.999];
  function examDrive(ag, start, clf, thr, seed) {
    var s = DC.sid(start[0], start[1], start[2]), traj = [], r = DC.rng(seed || 4242), said = false;
    for (var t = 0; t < DC.T; t++) {
      var a = DC.greedy(ag, s), m = DC.move(s, a, "park", false), pr = !m.crash && clf ? DC.clfProb(clf, DC.photo(m.s2, r)) : null;
      traj.push({ s: s, a: a, wanted: a, who: "student", x: m.x, y: m.y, h: m.h, crash: m.crash, ok: m.success, prob: pr, bay: m.bay });
      if (pr != null && pr >= thr) said = true;
      if (m.crash || m.bay || m.success || said) break;
      s = m.s2;
    }
    return { traj: traj, said: said, ok: traj[traj.length - 1].ok, staff: !!traj[traj.length - 1].bay && DC.cell(traj[traj.length - 1].x, traj[traj.length - 1].y) === "S" };
  }
  function initS3() {
    var o = { thr: 0, extra: 0, who: "naive" }, trained = false, results = {}, order = [], lot = LotView("s3lot"), running = null;
    var test = DC.examinerData(8, {});
    // the photo strip
    var d0 = DC.examiner(0).data, pick = [];
    for (var i = 0; i < d0.X.length && pick.length < 5; i++) if (d0.Y[i]) pick.push(i);
    for (i = 40; i < d0.X.length && pick.length < 14; i += 7) if (!d0.Y[i]) pick.push(i);
    $("s3ph").innerHTML = pick.map(function (k) { return '<figure class="' + (d0.Y[k] ? "pos" : "neg") + '"><canvas data-k="' + k + '"></canvas>' + (d0.Y[k] ? "parked ✓" : "not parked") + "</figure>"; }).join("");
    qa("#s3ph canvas").forEach(function (cv) { drawPhoto(cv, d0.X[+cv.dataset.k]); });
    var POSES = [{ s: DC.EXAM_S, t: "exam bay, straight" }, { s: DC.STAFF_S, t: "staff bay, straight" }, { s: DC.sid(8, 0, 1), t: "exam bay, crooked" }, { s: DC.sid(8, 1, 2), t: "one square short" }];
    function clf() { return DC.examiner(o.extra); }
    function stats() {
      var thr = THRS[o.thr]; $("s3tv").textContent = String(thr);
      if (!trained) { ["s3acc", "s3pr", "s3ex", "s3sf"].forEach(function (id) { $(id).textContent = "–"; }); $("s3v").innerHTML = ""; return; }
      var c = clf(), m = DC.metrics(c, test.X, test.Y, thr), ex = DC.verdict(c, DC.EXAM_S, thr), sf = DC.verdict(c, DC.STAFF_S, thr);
      $("s3acc").textContent = pct(m.acc, 1); $("s3pr").textContent = pct(m.precision) + " · " + pct(m.recall); $("s3ex").textContent = pct(ex.pass); $("s3sf").textContent = pct(sf.pass);
      $("s3v").innerHTML = POSES.map(function (p, j) { var v = DC.verdict(c, p.s, thr); return '<figure><canvas data-j="' + j + '"></canvas><figcaption>' + p.t + '<span class="sc ' + (v.pass > 0.5 ? "pass" : "fail") + '">' + fmt(v.mean, 3) + "</span>passes " + pct(v.pass) + " of photos</figcaption></figure>"; }).join("");
      var rr = DC.rng(77); qa("#s3v canvas").forEach(function (cv) { drawPhoto(cv, DC.photo(POSES[+cv.dataset.j].s, rr)); });
      $("s3st").innerHTML = "The examiner " + (o.extra ? "retrained with 30 photos of her false passes (" + c.n + " photos)" : "as first trained (" + c.n + " photos)") + ": log loss " + fmt(c.loss, 3) + " · her average score in each pose above, over 200 photos.";
    }
    $("s3train").onclick = function () { o.extra = 0; trained = true; stats(); touch("s3"); };
    $("s3extra").onclick = function () { o.extra = 30; trained = true; stats(); touch("s3"); };
    $("s3t").addEventListener("input", function () { o.thr = +this.value; stats(); });
    var WHO = { human: "the instructor's eye", naive: "the examiner as trained", thr99: "… at threshold 0.99", thr999: "… at threshold 0.999", fixed: "… with 30 extra negatives" };
    function table() {
      $("s3tab").innerHTML = order.length ? "<tr><th>who pays the reward</th><th>exam, by eye</th><th>exam, by her clipboard</th><th>ends in a staff bay</th><th>students reaching 80%</th></tr>" + order.map(function (k) { var S = DC.summarize(results[k]); return "<tr><td>" + WHO[k] + '</td><td class="n">' + pct(S.pass) + "</td><td>" + pct(S.examiner) + '</td><td style="color:' + (S.staff > 0.02 ? COL.bad : COL.grassD) + '">' + pct(S.staff) + "</td><td>" + S.reached + " / 8</td></tr>"; }).join("") : "";
    }
    $("s3go").onclick = function () {
      busy(["s3go", "s3show"], true); var k = o.who;
      fleet("s3" + k, DC.s3fleet(k), function (l, E) { $("s3st2").textContent = WHO[k] + ": lesson " + l + " of " + E + " for 8 students…"; }, function (runs) {
        results[k] = runs; if (order.indexOf(k) < 0) order.push(k); table(); busy(["s3go", "s3show"], false);
        var S = DC.summarize(runs); $("s3st2").innerHTML = "By her clipboard <b>" + pct(S.examiner) + "</b> passed; by the instructor's eye <b>" + pct(S.pass) + "</b>." + (S.staff > 0.02 ? " " + pct(S.staff) + " of exam starts ended in a staff bay." : "");
        touch("s3"); showDrive();
      });
    };
    function showDrive() {
      var runs = results[o.who]; if (!runs) { $("s3st2").textContent = "Train the students first."; return; }
      if (running) running.stop();
      var ag = runs[0].agent, c = DC.s3fleet(o.who).clf, thr = DC.s3fleet(o.who).thr || 0.5, best = null;
      for (var j = 0; j < DC.EXAM_STARTS.length; j++) { var d = examDrive(ag, DC.EXAM_STARTS[j], c, thr); if (!best || (d.staff && !best.staff)) best = d; if (d.staff) break; }
      var end = best.traj[best.traj.length - 1];
      running = play(lot, { task: "park", traj: best.traj, label: "student 1's exam · " + WHO[o.who] }, null, function () {
        running = null;
        var stamp = { text: c ? (best.said ? "PASS" : "NO PASS") : (best.ok ? "PASS" : "NO PASS"), col: (c ? best.said : best.ok) ? COL.grassD : COL.bad, sub: "by eye: " + (best.ok ? "parked ✓" : best.staff ? "staff bay ✗" : "not parked ✗") };
        lot.render({ task: "park", traj: best.traj, stamp: stamp, label: "student 1's exam · " + WHO[o.who] });
        touch("s3");
      });
    }
    $("s3show").onclick = showDrive;
    seg($("s3who"), ["human", "naive", "thr99", "fixed"].map(function (k) { return { v: k, label: WHO[k] }; }), o.who, function (v) { o.who = v; });
    stats(); table(); lot.render({ task: "park", car: [1, 6, 0] });
    redraws.push(function () { if (onStep("s3") && !running) lot.again(); });
  }

  /* ================= STEP 4 ================= */
  function initS4() {
    var o = { n: 20 }, done = {}, order = [], lot = LotView("s4lot");
    function drawLot() { var dr = o.n ? DC.demoDrives(o.n, 300) : []; lot.render({ task: "park", demos: dr.map(function (t) { var p = t.map(function (x) { return [DC.sx(x.s), DC.sy(x.s)]; }), l = t[t.length - 1]; p.push([DC.BAYS.exam.x, 0]); return p; }), label: o.n ? "the instructor's " + o.n + " demo drives (" + dr.reduce(function (s, t) { return s + t.length; }, 0) + " moves)" : "no demo drives" }); }
    function draw() {
      var series = order.map(function (k, i) { return fleetSeries(done[k], "lessons", k.slice(1) + " demo drives", LINE_COLS[i]); });
      lineChart("s4chart", { series: series, xmin: 0, xmax: 250, ymax: 1, yfmt: PCT, xlab: "lessons", ylab: "exam score", hline: 0.8, hlab: "the 80% mark", empty: series.length ? null : "press Train 8 students" });
      $("s4tab").innerHTML = order.length ? "<tr><th>demo drives</th><th>first parked (median)</th><th>students reaching 80%</th><th>fleet at 80%</th><th>exam after 250</th></tr>" + order.map(function (k) { var S = DC.summarize(done[k]), cr = DC.crossing(S.curve, 0.8), fp = DC.firstPassMedian(done[k]); return "<tr><td>" + k.slice(1) + '</td><td class="n">' + (fp ? "lesson " + fp : "–") + "</td><td>" + S.reached + " / 8</td><td>" + (cr ? "lesson " + cr + " · " + fmt(S.mins[cr - 1], 0) + " min" : "not in 250") + "</td><td>" + pct(S.pass) + "</td></tr>"; }).join("") : "";
    }
    function run(keys) {
      busy(["s4go", "s4all"], true); var i = 0;
      (function next() {
        if (i >= keys.length) { busy(["s4go", "s4all"], false); $("s4st").textContent = ""; touch("s4"); return; }
        var k = keys[i];
        fleet("s4" + k, DC.FLEETS.s4[k], function (l, E) { $("s4st").textContent = k.slice(1) + " demo drives: lesson " + l + " of " + E + " for 8 students…"; }, function (runs) { done[k] = runs; if (order.indexOf(k) < 0) { order.push(k); order.sort(function (a, b) { return +a.slice(1) - +b.slice(1); }); } draw(); i++; setTimeout(next, 0); });
      })();
    }
    $("s4go").onclick = function () { run(["d" + o.n]); };
    $("s4all").onclick = function () { run(["d0", "d5", "d10", "d20", "d30"]); };
    seg($("s4n"), [0, 5, 10, 20, 30].map(function (v) { return { v: v, label: String(v) }; }), o.n, function (v) { o.n = v; drawLot(); });
    drawLot(); draw();
    redraws.push(function () { if (onStep("s4")) { drawLot(); draw(); } });
  }

  /* ================= STEP 5 ================= */
  var STYLE = { none: "no help", rare: "catches 1 in 5", half: "catches half", short: "short corrections", long: "long rescues", backseat: "backseat driver" };
  function initS5() {
    var o = { style: "short" }, done = {}, order = [], lot = LotView("s5lot"), running = null, watch = { idx: 0 };
    var LESSONS = [1, 2, 4, 10, 40];
    function draw() {
      var k = order.length ? (done[o.style] ? o.style : order[order.length - 1]) : null, series = [];
      if (k) {
        var runs = done[k], S = DC.summarize(runs), xs = S.curve.map(function (_, i) { return i + 1; });
        series.push({ name: "exam · " + STYLE[k], col: COL.skyD, ys: smooth(S.curve, 5), xs: xs });
        series.push({ name: "intervention rate (last 20 lessons)", col: COL.instructor, ys: smooth(S.rate, 20), xs: xs, dash: [6, 4] });
        if (k !== "none" && done.none) series.push({ name: "exam · no help", col: COL.soft, ys: smooth(DC.summarize(done.none).curve, 5), xs: xs, width: 1.5 });
      }
      lineChart("s5chart", { series: series, xmin: 0, xmax: 150, ymax: 1, yfmt: PCT, xlab: "lessons", ylab: "exam score / her share of the moves", ylabS: "score / her share", hline: 0.8, hlab: "the 80% mark", empty: series.length ? null : "press Train 8 students" });
      $("s5tab").innerHTML = order.length ? "<tr><th>her style</th><th>fleet at 80%</th><th>her minutes</th><th>rate, lessons 1–20</th><th>131–150</th><th>crashes</th><th>exam after 150</th></tr>" + order.map(function (k) { var S = DC.summarize(done[k]), cr = DC.crossing(S.curve, 0.8); return "<tr><td>" + STYLE[k] + '</td><td class="n">' + (cr ? "lesson " + cr + " · " + fmt(S.mins[cr - 1], 0) + " min" : "–") + "</td><td>" + fmt(S.humanMin, 1) + "</td><td>" + pct(DC.rateIn(done[k], 0, 20)) + "</td><td>" + pct(DC.rateIn(done[k], 130, 150)) + "</td><td>" + fmt(S.crashes, 0) + "</td><td>" + pct(S.pass) + "</td></tr>"; }).join("") : "";
    }
    $("s5go").onclick = function () {
      busy(["s5go"], true); var k = o.style;
      fleet("s5" + k, DC.FLEETS.s5[k], function (l, E) { $("s5st").textContent = STYLE[k] + ": lesson " + l + " of " + E + " for 8 students…"; }, function (runs) {
        done[k] = runs; if (order.indexOf(k) < 0) order.push(k); draw(); busy(["s5go"], false);
        var S = DC.summarize(runs), cr = DC.crossing(S.curve, 0.8); $("s5st").innerHTML = STYLE[k] + ": the fleet averages 80% at " + (cr ? "lesson <b>" + cr + "</b> (" + fmt(S.mins[cr - 1], 0) + " lot-min)" : "<b>no lesson</b> in 150") + ", with <b>" + fmt(S.humanMin, 1) + "</b> minutes of her driving.";
        touch("s5");
      });
    };
    $("s5watch").onclick = function () {
      if (running) running.stop();
      var L = LESSONS[watch.idx % LESSONS.length]; watch.idx++;
      var res = DC.train(Object.assign({}, DC.FLEETS.s5[o.style], { seed: 3, episodes: L, record: true, examEvery: 0 })), e = res.ep[L - 1];
      $("s5les").textContent = L; $("s5mv").textContent = e.steps; $("s5hers").textContent = e.itv; $("s5ok").textContent = "…";
      running = play(lot, { task: "park", traj: e.traj, wanted: true, label: "student 3, lesson " + L + " · " + STYLE[o.style] }, null, function () {
        running = null; $("s5ok").textContent = e.success ? "parked" : e.crash ? "crash" : e.staff ? "staff bay" : "time up"; $("s5ok").className = "v " + (e.success ? "good" : "bad");
        $("s5st").innerHTML = "Lesson " + L + ": " + e.steps + " moves, <b>" + e.itv + "</b> by her (red). " + (e.itv ? "Each ✕ marks the move the student wanted when she took over." : "She didn't need to touch the controls.") + " Next click: lesson " + LESSONS[watch.idx % LESSONS.length] + ".";
        touch("s5");
      });
    };
    seg($("s5style"), Object.keys(STYLE).map(function (k) { return { v: k, label: STYLE[k] }; }), o.style, function (v) { o.style = v; watch.idx = 0; draw(); });
    draw(); lot.render({ task: "park", car: [1, 6, 0] });
    redraws.push(function () { if (onStep("s5")) { draw(); if (!running) lot.again(); } });
  }

  /* ================= STEP 6 ================= */
  var RESETS = [5, 10, 30, 60];
  function initS6() {
    var o = { fence: 1, r: 1 }, done = {}, order = [];
    function key() { return "f" + o.fence + "r" + RESETS[o.r]; }
    function cfg() { var rs = RESETS[o.r]; return Object.assign({}, o.fence ? DC.FLEETS.s6.fence1 : DC.FLEETS.s6.fence0, { resetS: rs, crashResetS: Math.max(rs, 45) }); }
    function name(k) { var m = /f(\d)r(\d+)/.exec(k); return (m[1] === "1" ? "fence" : "no fence") + ", " + m[2] + " s resets"; }
    function draw() {
      var xmax = 60, series = order.map(function (k, i) { var S = DC.summarize(done[k]); xmax = Math.max(xmax, S.mins[S.E - 1]); return fleetSeries(done[k], "min", name(k), LINE_COLS[i]); });
      lineChart("s6chart", { series: series, xmin: 0, xmax: Math.ceil(xmax / 60) * 60, ymax: 1, yfmt: PCT, xfmt: function (v) { return fmt(v / 60, 1) + " h"; }, xlab: "lot time, resets included", ylab: "exam score", hline: 0.8, hlab: "the 80% mark", empty: series.length ? null : "press Train 8 students" });
      $("s6tab").innerHTML = order.length ? "<tr><th>setup</th><th>crashes</th><th>bumps</th><th>students reaching 80%</th><th>fleet at 80%</th><th>250 lessons take</th></tr>" + order.map(function (k) { var S = DC.summarize(done[k]), cr = DC.crossing(S.curve, 0.8); return "<tr><td>" + name(k) + '</td><td class="n">' + fmt(S.crashes, 0) + "</td><td>" + fmt(S.bumps, 0) + "</td><td>" + S.reached + " / 8</td><td>" + (cr ? "lesson " + cr + " · " + fmt(S.mins[cr - 1], 0) + " min" : "–") + "</td><td>" + fmt(S.wallMin, 0) + " min</td></tr>"; }).join("") : "";
    }
    $("s6go").onclick = function () {
      busy(["s6go"], true); var k = key();
      fleet("s6" + k, cfg(), function (l, E) { $("s6st").textContent = name(k) + ": lesson " + l + " of " + E + " for 8 students…"; }, function (runs) { done[k] = runs; if (order.indexOf(k) < 0) order.push(k); draw(); busy(["s6go"], false); $("s6st").textContent = ""; touch("s6"); });
    };
    seg($("s6fence"), [{ v: 0, label: "hedge only" }, { v: 1, label: "fence inside the hedge" }], o.fence, function (v) { o.fence = v; });
    $("s6r").addEventListener("input", function () { o.r = +this.value; $("s6rv").textContent = RESETS[o.r] + " s"; });
    draw();
    redraws.push(function () { if (onStep("s6")) draw(); });
  }

  /* ================= REVIEW BOARD ================= */
  function initCap() {
    var host = $("capcases");
    host.innerHTML = DC.CASES.map(function (c) {
      return '<div class="card" style="margin-top:14px"><h3>' + c.title + '</h3><div class="brief">' + c.brief + '</div>' +
        '<div class="btnrow"><button class="ghost" id="' + c.id + 'run">Run it as configured</button><span class="verdict" id="' + c.id + 'v"></span></div>' +
        '<div class="lbl">The fix</div><div class="reason">' + c.fixes.map(function (f, i) { return '<label><input type="radio" name="' + c.id + 'fix" value="' + i + '"><span>' + esc(f.label) + "</span></label>"; }).join("") + "</div>" +
        '<div class="lbl">The cause</div><div class="reason">' + c.causes.map(function (f, i) { return '<label><input type="radio" name="' + c.id + 'cause" value="' + i + '"><span>' + esc(f.label) + "</span></label>"; }).join("") + "</div>" +
        '<div class="btnrow"><button class="act" id="' + c.id + 'go">Re-run 8 students with the fix</button></div><div class="checks" id="' + c.id + 'ch"></div></div>';
    }).join("");
    function grade() { var n = DC.CASES.filter(function (c) { return store.cap[c.id]; }).length; $("capstars").innerHTML = "★★★".split("").map(function (st, i) { return '<span class="' + (i < n ? "lit" : "dim") + '">' + st + "</span>"; }).join(""); $("capverdict").innerHTML = n === 3 ? "<b>Three for three.</b> You can run a training lot." : n ? "<b>" + n + " of 3</b> fixed and explained." : ""; if (n === 3 && !store.said.cap) { store.said.cap = true; save(); buildNav(); markNav(); } }
    DC.CASES.forEach(function (c) {
      $(c.id + "run").onclick = function () { busy([c.id + "run", c.id + "go"], true); fleet("cap" + c.id + "broken", c.broken, function (l, E) { $(c.id + "v").textContent = "lesson " + l + " of " + E + "…"; }, function (runs) { busy([c.id + "run", c.id + "go"], false); $(c.id + "v").innerHTML = "as configured: " + c.describe(DC.summarize(runs), runs); }); };
      $(c.id + "go").onclick = function () {
        var fi = document.querySelector('input[name="' + c.id + 'fix"]:checked'), ci = document.querySelector('input[name="' + c.id + 'cause"]:checked');
        if (!fi || !ci) { $(c.id + "ch").innerHTML = '<div class="callout co-w">Pick a fix and a cause first.</div>'; return; }
        var fix = c.fixes[+fi.value], cause = c.causes[+ci.value];
        busy([c.id + "run", c.id + "go"], true);
        fleet("cap" + c.id + "fix" + fi.value, fix.cfg, function (l, E) { $(c.id + "ch").innerHTML = '<div class="status">re-running: lesson ' + l + " of " + E + "…</div>"; }, function (runs) {
          busy([c.id + "run", c.id + "go"], false);
          var S = DC.summarize(runs), rows = c.checks.map(function (k) { return { ok: k.test(S, runs), label: k.label, why: k.why(S, runs) }; });
          rows.push({ ok: !!cause.right, label: "the cause is named", why: cause.right ? "yes" : "that's not what the re-run shows" });
          var pass = rows.every(function (r) { return r.ok; });
          $(c.id + "ch").innerHTML = rows.map(function (r) { return '<div class="check ' + (r.ok ? "ok" : "no") + '"><span class="ic">' + (r.ok ? "✓" : "✗") + '</span><div>' + r.label + '<div class="why">' + r.why + "</div></div></div>"; }).join("") +
            '<div class="callout ' + (pass ? "co-g" : "co-r") + '"><b>' + (pass ? "Fixed." : "Not fixed.") + "</b> " + esc(fix.why) + "</div>";
          store.cap[c.id] = store.cap[c.id] || pass; save(); grade();
        });
      };
    });
    grade();
  }

  /* ================= FIELD TEST ================= */
  function initFT() {
    var FT = DC.FIELD;
    $("ftqs").innerHTML = FT.map(function (f, i) { return '<div class="fq"><div class="fqt"><b>' + (i + 1) + ".</b> " + f.q + ' <span class="muted">(' + f.hint + ')</span></div><div class="row"><input type="number" id="ft' + i + '" step="any" value="' + (store.ft[i] != null ? esc(store.ft[i]) : "") + '" aria-label="Answer ' + (i + 1) + '"><span class="res" id="ftr' + i + '"></span></div></div>'; }).join("");
    $("ftgo").onclick = function () {
      var score = 0;
      FT.forEach(function (f, i) { var raw = $("ft" + i).value, v = parseFloat(raw), ok = raw !== "" && !isNaN(v) && Math.abs(v - f.ans) <= f.tol + 1e-9; store.ft[i] = raw; if (ok) score++; $("ftr" + i).innerHTML = ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>'; });
      save();
      $("ftscore").innerHTML = "<b>" + score + " / " + FT.length + "</b>" + (score === FT.length ? " · you can read the HIL-SERL paper." : "");
      if (score >= 8 && !store.said.ft) { store.said.ft = true; save(); buildNav(); markNav(); }
    };
    $("reset").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} history.replaceState(null, "", location.pathname); location.reload(); };
  }

  /* ---------------- art & boot ---------------- */
  function renderArt() { qa(".scene[data-art]").forEach(function (el) { var svg = ART[el.dataset.art]; if (svg && !el.firstChild) el.innerHTML = svg; }); }
  function buildNext() {
    sections.forEach(function (s, i) {
      var n = sections[i + 1]; if (!n) return;
      var row = document.createElement("div"); row.className = "nextrow";
      var b = document.createElement("button"); b.type = "button"; b.className = "act"; b.textContent = "Next: " + n.dataset.n + " · " + n.dataset.title + " →";
      b.onclick = function () { show(n.id); };
      row.appendChild(b); s.appendChild(row);
    });
  }
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  if (/[?&]shot=1/.test(location.search)) document.body.classList.add("shot");
  renderArt();
  qa(".kmap .k[data-i]").forEach(function (el) { el.innerHTML = IC[el.dataset.i] || ""; });
  qa(".mast .mi").forEach(function (el) { el.innerHTML = IC.plate || ""; });
  buildNav(); buildNext();
  function hashId() { var m = /^#\/?(s[0-6]|cap|ft)$/.exec(location.hash || ""); return m ? m[1] : null; }
  window.addEventListener("hashchange", function () { var id = hashId(); if (id && !$(id).classList.contains("on")) show(id); });
  initS0(); initS1(); initS2(); initS3(); initS4(); initS5(); initS6(); initCap(); initFT();
  initTips(document); initPredicts();
  sections.forEach(function (s) { checkSay(s.id); });
  show(hashId() || "s0");
  window.addEventListener("load", function () { setTimeout(function () { window.scrollTo(0, 0); redrawAll(); }, 0); });
  var rt = null; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(redrawAll, 80); });
  window.DCApp = { show: show, store: function () { return store; }, fleetCache: FC };
})();

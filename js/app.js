/* Policy Pond — UI. Every number shown is computed by window.PP (core.js) or window.PPSim (sim.js);
   this file only wires controls to them and draws. */
(function () {
  "use strict";
  var PP = window.PP, S = window.PPSim, GL = window.PP_GLOSSARY, MD = window.PP_MICRODUCK, IC = window.PP_ICONS || {};
  var $ = function (id) { return document.getElementById(id); };
  var qa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /* ---------------- formatting ---------------- */
  function fmt(n, d) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: d == null ? 0 : d, minimumFractionDigits: d == null ? 0 : d }); }
  function sgn(n, d) { return (n > 0 ? "+" : n < 0 ? "−" : "") + fmt(Math.abs(n), d == null ? 2 : d); }
  function pct(p) { return fmt(p * 100, 0) + "%"; }
  function fdur(sec) {
    if (sec < 90) return fmt(sec, 0) + " s";
    if (sec < 3600 * 1.5) return fmt(sec / 60, 0) + " min";
    if (sec < 86400 * 2) return fmt(sec / 3600, 1) + " h";
    if (sec < 86400 * 365 * 1.5) return fmt(sec / 86400, 0) + " days";
    return fmt(sec / 86400 / 365, 1) + " years";
  }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"); }

  /* ---------------- persistence (never required) ---------------- */
  var KEY = "policy-pond-v1";
  var store = { predicts: {}, touched: {}, said: {}, six: {}, cap: {}, capAns: {}, ft: {} };
  try { var raw = localStorage.getItem(KEY); if (raw) store = Object.assign(store, JSON.parse(raw)); } catch (e) {}
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  /* ---------------- nav ---------------- */
  var NAV_ICON = { s0: "pond", s1: "dice", s2: "mama", s3: "rope", s4: "dial", s5: "board", s6: "wrench", cap: "star", ft: "pencil" };
  var sections = qa("section");
  function buildNav() {
    var nav = $("nav"); nav.innerHTML = "";
    sections.forEach(function (s) {
      var b = document.createElement("button");
      b.innerHTML = '<span class="ic" aria-hidden="true">' + (IC[NAV_ICON[s.id]] || "") + "</span>" + s.dataset.title + (store.said[s.id] ? '<span class="chk">✓</span>' : "");
      b.onclick = function () { show(s.id); };
      b.dataset.for = s.id;
      nav.appendChild(b);
    });
  }
  function show(id) {
    sections.forEach(function (s) { s.classList.toggle("on", s.id === id); });
    qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === id); });
    var active = document.querySelector("#nav button.on"), nav = $("nav");
    if (active && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    try { history.replaceState(null, "", "#" + id); } catch (e) {}
    window.scrollTo(0, 0);
    redrawAll();
  }
  function markNav() { var cur = sections.filter(function (s) { return s.classList.contains("on"); })[0]; if (cur) qa("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.for === cur.id); }); }

  /* ---------------- engagement: predict + say ---------------- */
  function touch(sec) { store.touched[sec] = (store.touched[sec] || 0) + 1; save(); checkSay(sec); }
  function checkSay(sec) {
    var s = $(sec); if (!s) return;
    var preds = qa(".predict", s), sayEl = s.querySelector(".say");
    if (!sayEl) return;
    var allAnswered = preds.every(function (p) { return store.predicts[p.dataset.p] != null; });
    var open = allAnswered && (store.touched[sec] || 0) >= 3;
    if (open && !sayEl.classList.contains("open")) {
      sayEl.classList.add("open");
      if (!store.said[sec]) { store.said[sec] = true; save(); buildNav(); markNav(); }
    }
    sayEl.querySelector(".tag").textContent = open ? "Say it out loud" : "Say it out loud · unlocks after you answer the prediction" + (preds.length > 1 ? "s" : "") + " and play with the controls";
  }
  function initPredicts() {
    qa(".predict").forEach(function (p) {
      var key = p.dataset.p, sec = p.closest("section").id, btns = qa(".opts button", p);
      function reveal(idx) {
        btns.forEach(function (b, i) {
          b.disabled = true;
          if (b.hasAttribute("data-right")) b.classList.add("right");
          else if (i === idx) b.classList.add("wrong");
        });
        p.classList.add("done");
      }
      btns.forEach(function (b, i) { b.onclick = function () { store.predicts[key] = i; save(); reveal(i); checkSay(sec); }; });
      if (store.predicts[key] != null) reveal(store.predicts[key]);
    });
  }

  /* ---------------- glossary tooltip ---------------- */
  function bindTip(el) {
    if (el.dataset.bound) return; el.dataset.bound = "1";
    el.tabIndex = 0; el.setAttribute("role", "button");
    var tip = $("tip");
    function place() {
      var g = GL[el.dataset.g]; if (!g) return;
      tip.innerHTML = "<b>" + g[0] + "</b><br>" + g[1] + '<span class="kt">At the pond: ' + g[2] + "</span>";
      tip.style.display = "block";
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8) + "px";
      var y = r.bottom + 8; if (y + h > window.innerHeight - 8) y = r.top - h - 8;
      tip.style.top = Math.max(8, y) + "px";
    }
    el.addEventListener("mouseenter", place); el.addEventListener("focus", place);
    el.addEventListener("mouseleave", function () { tip.style.display = "none"; });
    el.addEventListener("blur", function () { tip.style.display = "none"; });
    el.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); if (tip.style.display === "block") tip.style.display = "none"; else place(); });
  }
  function initTips(root) { qa(".g", root).forEach(bindTip); }
  document.addEventListener("click", function () { $("tip").style.display = "none"; });
  window.addEventListener("scroll", function () { $("tip").style.display = "none"; }, { passive: true });

  /* ---------------- controls ---------------- */
  function seg(el, opts, val, onChange) {
    el.innerHTML = "";
    var state = { value: val };
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = o.label; b.dataset.v = o.v;
      if (String(o.v) === String(val)) b.classList.add("on");
      b.onclick = function () {
        state.value = o.v;
        qa("button", el).forEach(function (x) { x.classList.toggle("on", x === b); });
        onChange(o.v);
      };
      el.appendChild(b);
    });
    return state;
  }
  function range(id, onInput) { var el = $(id); el.addEventListener("input", onInput); return el; }

  /* ---------------- canvas ---------------- */
  var drawers = {};
  function ctxFor(id) {
    var c = $(id), dpr = window.devicePixelRatio || 1;
    // The markup's height attribute is the CSS height. Setting c.height below rewrites that attribute,
    // so remember what we wrote: an attribute that differs from it was set on purpose.
    var attr = c.getAttribute("height");
    if (!c.dataset.h || attr !== c.dataset.wrote) c.dataset.h = attr;
    var w = c.clientWidth || c.parentNode.clientWidth || 600, h = +c.dataset.h;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.height = h + "px";
    c.dataset.wrote = String(c.height);
    var x = c.getContext("2d"); x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, w, h);
    x.font = "14px 'Patrick Hand', sans-serif"; x.textBaseline = "middle";
    return { x: x, w: w, h: h };
  }
  function redrawAll() { Object.keys(drawers).forEach(function (k) { var el = $(k), s = el && el.closest("section"); if (s && s.classList.contains("on")) drawers[k](); }); }
  var rz; window.addEventListener("resize", function () { clearTimeout(rz); rz = setTimeout(redrawAll, 120); });
  var C = { gold: "#C98A0B", acc: "#246A9C", grn: "#3B7422", red: "#C8452F", dim: "#6E5040", line: "#E7DCC4", txt: "#3A2418", well: "#FFFDF6", water: "#7FB8D9", mud: "#8A5A2B", yellow: "#E0A91E" };
  var ROUTE_C = ["#246A9C", "#E0A91E", "#8A5A2B"];
  function axes(g, pad, ylo, yhi, yl) {
    var x = g.x; x.strokeStyle = C.line; x.lineWidth = 1;
    for (var i = 0; i <= 4; i++) { var y = pad.t + (g.h - pad.t - pad.b) * i / 4; x.beginPath(); x.moveTo(pad.l, y); x.lineTo(g.w - pad.r, y); x.stroke(); x.fillStyle = C.dim; x.textAlign = "right"; x.fillText(fmt(yhi - (yhi - ylo) * i / 4, yl == null ? 1 : yl), pad.l - 6, y); }
    x.strokeStyle = "#4A2E1E"; x.lineWidth = 2; x.beginPath(); x.moveTo(pad.l, pad.t); x.lineTo(pad.l, g.h - pad.b); x.lineTo(g.w - pad.r, g.h - pad.b); x.stroke();
  }
  function line(x, pts, color, width, dash) {
    x.strokeStyle = color; x.lineWidth = width || 2.5; x.setLineDash(dash || []); x.beginPath();
    pts.forEach(function (p, i) { if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]); });
    x.stroke(); x.setLineDash([]);
  }

  /* ================= STEP 0 · the pond ================= */
  var GAMMAS = [0, 0.5, 0.7, 0.8, 0.9, 0.95, 0.97, 0.98, 0.99, 0.995, 0.998, 0.999];
  var s0 = { seed: 1, ep: null, shown: 0, timer: null };
  function s0gamma() { return GAMMAS[+$("s0g").value]; }
  function s0strip(pos) {
    var html = "";
    for (var i = 0; i < S.STRIP.n; i++) {
      html += '<div class="tile' + (i === S.STRIP.goal ? " goal" : "") + (i === pos ? " here" : "") + '"><span class="ti">' + i + "</span>" +
        (i === pos ? '<span class="duck" aria-hidden="true">' + (IC.duck || "🦆") + "</span>" : "") +
        (i === S.STRIP.goal ? '<span class="cr">+' + S.STRIP.crumb + '</span>' : "") + "</div>";
    }
    $("s0strip").innerHTML = html;
  }
  function s0stats() {
    var ep = s0.ep, rows = ep ? ep.slice(0, s0.shown) : [];
    var rs = rows.map(function (x) { return x.r; });
    $("s0steps").textContent = rows.length ? rows.length : "–";
    $("s0sum").textContent = rows.length ? sgn(rs.reduce(function (a, b) { return a + b; }, 0), 0) : "–";
    $("s0G").textContent = rows.length ? sgn(PP.discountedReturn(rs, s0gamma()), 2) : "–";
    $("s0log").innerHTML = rows.length ? '<div class="lr h"><span>step</span><span>at</span><span>tried</span><span>pond</span><span>crumbs</span><span>now at</span></div>' + rows.map(function (x) {
      return '<div class="lr"><span>' + (x.t + 1) + "</span><span>" + x.s + "</span><span>" + (x.a > 0 ? "→" : "←") + "</span><span>" + (x.slip ? '<i class="bad">pushed back</i>' : "ok") + '</span><span class="' + (x.r > 0 ? "ok" : "bad") + '">' + sgn(x.r, 0) + "</span><span>" + x.s2 + (x.done ? " 🏁" : "") + "</span></div>";
    }).join("") + (s0.shown === ep.length && !ep[ep.length - 1].done ? '<div class="lr note">Out of time after ' + S.STRIP.maxSteps + " paddles: the episode ends without the crumbs.</div>" : "") : '<div class="lr note">Press <b>Cross the pond</b>.</div>';
  }
  function s0run() {
    clearInterval(s0.timer);
    s0.ep = S.stripEpisode(s0.seed, +$("s0p").value); s0.shown = 0; s0strip(0); s0stats();
    $("s0strip").classList.remove("over");
    s0.timer = setInterval(function () {
      s0.shown++; var step = s0.ep[s0.shown - 1]; s0strip(step.s2); s0stats();
      if (step.done) $("s0strip").querySelector(".tile.goal").classList.add("won");
      if (s0.shown >= s0.ep.length) { clearInterval(s0.timer); if (!step.done) $("s0strip").classList.add("over"); }
    }, 320);
    touch("s0");
  }
  function s0gammaRender() {
    var g = s0gamma();
    $("s0gv").textContent = g;
    var hs = PP.horizonSteps(g);
    $("s0hs").textContent = g === 0 ? "1" : fmt(hs, hs < 10 ? 1 : 0);
    $("s0hsec").textContent = g === 0 ? "0.02 s" : fmt(PP.horizonSeconds(g, MD.hz), 2) + " s";
    var pv = PP.presentValue(10, 30, g); $("s0pv10").textContent = fmt(pv, 2);
    $("s0pv10").className = "v " + (pv > 1 ? "good" : "bad");
    s0stats(); drawers.s0chart();
  }
  drawers.s0chart = function () {
    var g = ctxFor("s0chart"), x = g.x, gm = s0gamma(), pad = { l: 40, r: 12, t: 12, b: 26 }, K = 100;
    axes(g, pad, 0, 1, 1);
    var bw = (g.w - pad.l - pad.r) / (K + 1);
    for (var k = 0; k <= K; k++) {
      var v = Math.pow(gm, k), h = v * (g.h - pad.t - pad.b);
      x.fillStyle = k === 30 ? C.gold : "#7FB8D9"; x.fillRect(pad.l + k * bw + 0.5, g.h - pad.b - h, Math.max(1, bw - 1), h);
    }
    x.fillStyle = C.dim; x.textAlign = "center";
    [0, 25, 50, 75, 100].forEach(function (k) { x.fillText(k + (k === 100 ? " steps" : ""), pad.l + k * bw + bw / 2, g.h - 11); });
    if (gm > 0 && PP.horizonSteps(gm) <= K) { var hx = pad.l + PP.horizonSteps(gm) * bw; line(x, [[hx, pad.t], [hx, g.h - pad.b]], C.red, 2, [5, 4]); x.fillStyle = C.red; x.textAlign = "left"; x.fillText("≈ horizon", hx + 4, pad.t + 8); }
  };
  function initS0() {
    range("s0p", function () { $("s0pv").textContent = pct(+$("s0p").value); touch("s0"); });
    $("s0pv").textContent = pct(+$("s0p").value);
    range("s0g", function () { s0gammaRender(); touch("s0"); });
    $("s0go").onclick = s0run;
    $("s0new").onclick = function () { s0.seed++; s0run(); };
    s0strip(0); s0stats(); s0gammaRender();
  }

  /* ================= STEP 1 · lucky crossings ================= */
  var s1 = { th: [0, 0, 0], R: PP.rng(11), hist: [], lr: 0.1, last: null, scSeed: 3 };
  function s1cross(n) {
    for (var i = 0; i < n; i++) {
      var pi = PP.softmax(s1.th), u = s1.R(), a = u < pi[0] ? 0 : u < pi[0] + pi[1] ? 1 : 2, r = S.routeReward(a, s1.R, 0);
      var g = PP.reinforceEstimate(pi, a, r, 0);
      s1.last = { a: a, r: r, g: g, pi: pi };
      s1.th = s1.th.map(function (x, j) { return x + s1.lr * g[j]; });
      s1.hist.push(PP.softmax(s1.th));
    }
    s1render(); touch("s1");
  }
  function s1render() {
    var pi = PP.softmax(s1.th);
    $("s1routes").innerHTML = S.ROUTES.map(function (r, i) {
      return '<div class="rt"><div class="rn"><b style="color:' + ROUTE_C[i] + '">' + r.id + "</b> " + r.name + ' <span class="muted">· ' + r.note + " (avg " + fmt(r.mean, 1) + ", ± " + fmt(r.sd, 1) + ')</span></div><div class="rb"><i style="width:' + (pi[i] * 100) + "%;background:" + ROUTE_C[i] + '"></i><span>' + pct(pi[i]) + "</span></div></div>";
    }).join("");
    $("s1n").textContent = fmt(s1.hist.length);
    $("s1J").textContent = fmt(S.expectedReward(pi), 2);
    var L = s1.last;
    if (L) qa(".rt", $("s1routes"))[L.a].classList.add("hit");   // flash the route just taken
    $("s1last").textContent = L ? S.ROUTES[L.a].id + " · " + sgn(L.r, 2) : "–";
    $("s1math").innerHTML = '<div class="eq">θ ← θ + α · R · (onehot(route) − π)</div>' + (L ?
      '<div class="eqn">Last crossing: route <b>' + S.ROUTES[L.a].id + "</b>, R = " + sgn(L.r, 2) + "<br>push = R × (onehot − π) = [" + L.g.map(function (v) { return sgn(v, 2); }).join(", ") + "]<br>" +
      (L.r > 0 ? "Positive haul: route " + S.ROUTES[L.a].id + " goes <b>up</b>, the others down." : "Negative haul: route " + S.ROUTES[L.a].id + " goes <b>down</b>, the others up.") + "</div>"
      : '<div class="eqn">Press <b>1 crossing</b> to see one update worked out.</div>');
    drawers.s1chart();
  }
  drawers.s1chart = function () {
    var g = ctxFor("s1chart"), x = g.x, pad = { l: 40, r: 12, t: 10, b: 24 }, H = s1.hist, N = Math.max(20, H.length);
    axes(g, pad, 0, 1, 1);
    var sx = function (i) { return pad.l + (g.w - pad.l - pad.r) * i / N; }, sy = function (p) { return pad.t + (1 - p) * (g.h - pad.t - pad.b); };
    [0, 1, 2].forEach(function (j) { line(x, [[sx(0), sy(1 / 3)]].concat(H.map(function (p, i) { return [sx(i + 1), sy(p[j])]; })), ROUTE_C[j], 2.5); });
    x.fillStyle = C.dim; x.textAlign = "right"; x.fillText(fmt(N) + " crossings", g.w - pad.r, g.h - 10);
  };
  function scatterSVG(sc, lo, hi) {
    var W = 600, H = 70, px = function (v) { return 20 + (W - 40) * (v - lo) / (hi - lo); };
    var s = '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" style="width:100%;height:70px">';
    s += '<line x1="20" x2="' + (W - 20) + '" y1="44" y2="44" stroke="#4A2E1E" stroke-width="2"/>';
    s += '<line x1="' + px(0) + '" x2="' + px(0) + '" y1="30" y2="58" stroke="#6E5040" stroke-width="1.5"/>';
    s += '<line x1="' + px(sc.trueG) + '" x2="' + px(sc.trueG) + '" y1="6" y2="62" stroke="#3B7422" stroke-width="2.5" stroke-dasharray="5 4"/>';
    sc.pts.forEach(function (p, i) { var v = p.g[1]; s += '<circle cx="' + px(Math.max(lo, Math.min(hi, v))) + '" cy="' + (22 + (i % 5) * 4.5) + '" r="5.5" fill="' + ROUTE_C[p.a] + '" stroke="#4A2E1E" stroke-width="1.2" opacity=".9"/>'; });
    s += '<rect x="' + (px(sc.mean) - 3) + '" y="40" width="6" height="12" fill="#C8452F" stroke="#4A2E1E"/>';
    s += "</svg>";
    return s + '<div class="scax"><span>← pushes B down</span><span>0</span><span>pushes B up →</span></div>';
  }
  function s1scatter() {
    var sc = S.scatter([0, 0, 0], 30, "none", s1.scSeed, 0);
    var lim = Math.max(3, Math.ceil(Math.max.apply(null, sc.comp.map(Math.abs))));
    $("s1scat").innerHTML = scatterSVG(sc, -lim, lim);
    var wrong = sc.comp.filter(function (v) { return v < 0; }).length;
    $("s1scatnote").innerHTML = "true push <b>" + sgn(sc.trueG, 2) + "</b> (dashed) · this set's average " + sgn(sc.mean, 2) + " (red block) · spread ± " + fmt(sc.sd, 2) + " · <b>" + wrong + " of 30</b> point the wrong way";
  }
  function initS1() {
    seg($("s1lr"), [0.02, 0.05, 0.1, 0.3].map(function (v) { return { v: v, label: String(v) }; }), s1.lr, function (v) { s1.lr = +v; touch("s1"); });
    $("s1one").onclick = function () { s1cross(1); };
    $("s1twenty").onclick = function () { s1cross(20); };
    $("s1two").onclick = function () { s1cross(200); };
    $("s1reset").onclick = function () { s1.th = [0, 0, 0]; s1.hist = []; s1.last = null; s1.R = PP.rng(11 + Math.floor(Math.random() * 1e6)); s1render(); };
    $("s1more").onclick = function () { s1.scSeed++; s1scatter(); touch("s1"); };
    s1render(); s1scatter();
  }

  /* ================= STEP 2 · Mama's guess ================= */
  var s2 = { seed: 21, race: null };
  function s2render() {
    var b = +$("s2b").value; $("s2bv").textContent = b;
    var n = S.scatter([0, 0, 0], 30, "none", s2.seed, b), m = S.scatter([0, 0, 0], 30, "mama", s2.seed, b);
    var lim = Math.max(3, Math.ceil(Math.max.apply(null, n.comp.concat(m.comp).map(Math.abs))));
    $("s2none").innerHTML = scatterSVG(n, -lim, lim); $("s2mama").innerHTML = scatterSVG(m, -lim, lim);
    $("s2sdn").textContent = "± " + fmt(n.sd, 2); $("s2sdm").textContent = "± " + fmt(m.sd, 2); $("s2true").textContent = sgn(n.trueG, 2);
  }
  drawers.s2chart = function () {
    var g = ctxFor("s2chart"), x = g.x, pad = { l: 40, r: 12, t: 10, b: 24 };
    axes(g, pad, 0.8, 2.1, 1);
    var sy = function (v) { return pad.t + (2.1 - v) / 1.3 * (g.h - pad.t - pad.b); };
    if (!s2.race) { x.fillStyle = C.dim; x.textAlign = "center"; x.fillText("Press “Run the race”", g.w / 2, g.h / 2); return; }
    var N = s2.race.none.length, sx = function (i) { return pad.l + (g.w - pad.l - pad.r) * i / (N - 1); };
    [["none", C.red, "rgba(200,69,47,.16)"], ["mama", C.grn, "rgba(59,116,34,.18)"]].forEach(function (k) {
      var d = s2.race[k[0]]; x.fillStyle = k[2]; x.beginPath();
      d.forEach(function (p, i) { var yy = sy(Math.min(2.1, p.hi)); if (i) x.lineTo(sx(i), yy); else x.moveTo(sx(i), yy); });
      for (var i = N - 1; i >= 0; i--) x.lineTo(sx(i), sy(Math.max(0.8, d[i].lo)));
      x.closePath(); x.fill();
      line(x, d.map(function (p, i) { return [sx(i), sy(p.m)]; }), k[1], 2.5);
    });
    line(x, [[pad.l, sy(2)], [g.w - pad.r, sy(2)]], C.gold, 1.5, [5, 4]);
    x.fillStyle = C.gold; x.textAlign = "right"; x.fillText("best possible 2.0", g.w - pad.r - 4, sy(2) - 9);
    x.fillStyle = C.dim; x.fillText("300 crossings", g.w - pad.r, g.h - 10);
  };
  function s2td() {
    var r = +$("tdr").value, v = +$("tdv").value, n = +$("tdn").value, done = $("tddone").checked, gm = 0.99;
    $("tdrv").textContent = sgn(r, 1); $("tdvv").textContent = fmt(v, 1); $("tdnv").textContent = done ? "— (ended)" : fmt(n, 1);
    var d = PP.tdError(r, v, n, gm, done);
    $("tdmath").innerHTML = '<div class="eq">δ = r + γ · V(s′) − V(s)</div><div class="eqn big">δ = ' + sgn(r, 1) + " + 0.99 × " + (done ? "0" : fmt(n, 1)) + " − " + fmt(v, 1) + ' = <b class="' + (d > 0.005 ? "ok" : d < -0.005 ? "bad" : "") + '">' + sgn(d, 2) + "</b></div>";
    var note = $("tdnote");
    note.className = "callout " + (d > 0.005 ? "co-g" : d < -0.005 ? "co-r" : "co-i");
    note.innerHTML = d > 0.005 ? "<b>Better than Mama expected.</b> Make that paddle more likely." : d < -0.005 ? "<b>Worse than Mama expected.</b> Make that paddle less likely, and Mama lowers her guess here." : "<b>Exactly as expected.</b> Nothing to learn from this step.";
  }
  function initS2() {
    range("s2b", function () { s2render(); touch("s2"); });
    $("s2more").onclick = function () { s2.seed++; s2render(); touch("s2"); };
    $("s2race").onclick = function () { s2.race = S.race(300, 0.05, 40, +$("s2b").value); drawers.s2chart(); touch("s2"); };
    ["tdr", "tdv", "tdn"].forEach(function (id) { range(id, function () { s2td(); touch("s2"); }); });
    $("tddone").onchange = function () { s2td(); touch("s2"); };
    s2render(); s2td();
  }

  /* ---- Watch Mama learn: TD(0) value learning on the step 0 pond ---- */
  var s2v = { V: [], seed: 500, n: 0, alpha: 0.1, p: 0.8, lastLoss: null };
  function s2vReset() { s2v.V = new Array(S.STRIP.n).fill(0); s2v.n = 0; s2v.lastLoss = null; s2vRender(); }
  function s2vCross(k) {
    for (var e = 0; e < k; e++) {
      var ep = S.stripEpisode(s2v.seed++, s2v.p, 200), sq = 0;
      ep.forEach(function (st) {
        var d = PP.tdError(st.r, s2v.V[st.s], s2v.V[st.s2], 0.99, st.done);   // her surprise on this paddle
        s2v.V[st.s] += s2v.alpha * d;                                        // V(here) ← V(here) + α·δ
        sq += d * d;
      });
      s2v.lastLoss = sq / ep.length; s2v.n++;
    }
    s2vRender(); touch("s2");
  }
  function s2vRender() {
    var ex = S.stripExactValues(s2v.p, 0.99), all = ex.concat(s2v.V);
    var lo = Math.min(-5, Math.min.apply(null, all)) * 1.08, hi = Math.max(5, Math.max.apply(null, all)) * 1.08, span = hi - lo, gap = 0;
    $("s2v").innerHTML = ex.map(function (x, i) {
      var v = s2v.V[i], goal = i === S.STRIP.goal;
      if (!goal) gap = Math.max(gap, Math.abs(v - x));
      var pos = function (y) { return (y - lo) / span * 100; };
      return '<div class="vt' + (goal ? " goal" : "") + '"><div class="vb"><s class="zero" style="bottom:' + pos(0) + '%"></s><i class="est" style="bottom:' + pos(Math.min(v, 0)) + "%;height:" + (pos(Math.max(v, 0)) - pos(Math.min(v, 0))) + '%"></i><b class="ex" style="bottom:' + pos(x) + '%"></b></div><div class="vl">' + i + (goal ? " 🏁" : "") + '</div><div class="vv">' + (goal ? "0" : sgn(v, 1)) + "</div></div>";
    }).join("");
    $("s2vn").textContent = fmt(s2v.n); $("s2vgap").textContent = fmt(gap, 2); $("s2vgap").className = "v " + (gap < 1 ? "good" : gap < 5 ? "warn" : "bad");
    $("s2vloss").textContent = s2v.lastLoss == null ? "–" : fmt(s2v.lastLoss, 2);
    $("s2vex0").textContent = sgn(ex[0], 1);
  }
  function initS2v() {
    range("s2vp", function () { s2v.p = +$("s2vp").value; $("s2vpv").textContent = pct(s2v.p); s2vReset(); touch("s2"); });
    $("s2vpv").textContent = pct(s2v.p);
    seg($("s2valpha"), [0.02, 0.05, 0.1, 0.3].map(function (v) { return { v: v, label: String(v) }; }), s2v.alpha, function (v) { s2v.alpha = +v; touch("s2"); });
    $("s2vone").onclick = function () { s2vCross(1); };
    $("s2vtwenty").onclick = function () { s2vCross(20); };
    $("s2vtwo").onclick = function () { s2vCross(200); };
    $("s2vreset").onclick = function () { s2vReset(); touch("s2"); };
    s2vReset();
  }

  /* ================= STEP 3 · the lane ropes ================= */
  var s3 = { A: 1, eps: 0.2, batchSeed: 42, K: 20, fleet: null };
  var CASES = {
    1: ["In the ropes, good crossing", "Push it up. Normal learning."],
    2: ["In the ropes, bad crossing", "Push it down. Normal learning."],
    3: ["Below the ropes, good crossing", "It was under-weighted. Moving back up is allowed."],
    4: ["Below the ropes, bad crossing", "Already pushed down enough. Flat: no push."],
    5: ["Above the ropes, good crossing", "Already pushed up enough. Flat: no push."],
    6: ["Above the ropes, bad crossing", "It was over-weighted. Moving back down is allowed."]
  };
  function s3render() {
    var r = +$("s3r").value; $("s3rv").textContent = fmt(r, 2);
    var o = PP.clipObjective(r, s3.A, s3.eps);
    $("s3flow").textContent = o.flows ? "Yes · slope " + sgn(o.dLdr, 0) : "No · flat";
    $("s3flow").className = "v " + (o.flows ? "good" : "bad");
    $("s3case").textContent = "Case " + o.caseNo;
    $("s3math").innerHTML = '<div class="eq">L = min( r·A , clip(r, 1−ε, 1+ε)·A )</div><div class="eqn">= min( ' + fmt(r, 2) + " × " + sgn(s3.A, 0) + " , " + fmt(PP.clip(r, 1 - s3.eps, 1 + s3.eps), 2) + " × " + sgn(s3.A, 0) + " )<br>= min( " + sgn(o.unclipped, 2) + " , " + sgn(o.clipped, 2) + " ) = <b>" + sgn(o.L, 2) + "</b><br><i>" + CASES[o.caseNo][0] + ":</i> " + CASES[o.caseNo][1] + "</div>";
    var key = o.caseNo; if (!store.six[key]) { store.six[key] = true; save(); }
    drawers.s3chart(); s3six(o.caseNo);
  }
  drawers.s3chart = function () {
    var g = ctxFor("s3chart"), x = g.x, pad = { l: 44, r: 14, t: 12, b: 26 }, A = s3.A, e = s3.eps, r = +$("s3r").value;
    var ylo = -1.7, yhi = 1.7;
    var sx = function (v) { return pad.l + (v - 0.4) / 1.2 * (g.w - pad.l - pad.r); }, sy = function (v) { return pad.t + (yhi - v) / (yhi - ylo) * (g.h - pad.t - pad.b); };
    x.fillStyle = "rgba(127,184,217,.28)"; x.fillRect(sx(1 - e), pad.t, sx(1 + e) - sx(1 - e), g.h - pad.t - pad.b);
    axes(g, pad, ylo, yhi, 1);
    line(x, [[pad.l, sy(0)], [g.w - pad.r, sy(0)]], "#B9A98A", 1.5);
    var un = [], cl = [];
    for (var v = 0.4; v <= 1.6001; v += 0.01) { un.push([sx(v), sy(v * A)]); cl.push([sx(v), sy(PP.clipObjective(v, A, e).L)]); }
    line(x, un, C.dim, 2, [6, 5]); line(x, cl, C.acc, 4);
    [1 - e, 1 + e].forEach(function (b) { line(x, [[sx(b), pad.t], [sx(b), g.h - pad.b]], C.red, 2, [3, 3]); });
    var o = PP.clipObjective(r, A, e);
    x.fillStyle = o.flows ? C.grn : C.red; x.strokeStyle = "#4A2E1E"; x.lineWidth = 2;
    x.beginPath(); x.arc(sx(r), sy(o.L), 8, 0, Math.PI * 2); x.fill(); x.stroke();
    if (o.flows) { var dx = 0.12 * (A > 0 ? 1 : -1); line(x, [[sx(r), sy(o.L)], [sx(r + dx), sy(o.L + dx * A)]], C.grn, 3); }
    x.fillStyle = C.dim; x.textAlign = "center";
    [0.4, 0.6, 0.8, 1, 1.2, 1.4, 1.6].forEach(function (t) { x.fillText(fmt(t, 1), sx(t), g.h - 11); });
    x.fillStyle = C.red; x.fillText("1−ε", sx(1 - e), pad.t + 8); x.fillText("1+ε", sx(1 + e), pad.t + 8);
  };
  function s3six(now) {
    var e = s3.eps, html = "";
    [[1, 1, 1], [2, -1, 1], [3, 1, 1 - e - 0.15], [4, -1, 1 - e - 0.15], [5, 1, 1 + e + 0.15], [6, -1, 1 + e + 0.15]].forEach(function (c) {
      var n = c[0], A = c[1], rr = c[2], o = PP.clipObjective(rr, A, e), W = 160, H = 90;
      var sx = function (v) { return 8 + (v - 0.4) / 1.2 * (W - 16); }, sy = function (v) { return 45 - v * 22; };
      var p = "";
      for (var v = 0.4; v <= 1.6001; v += 0.02) p += (p ? "L" : "M") + sx(v).toFixed(1) + " " + sy(PP.clipObjective(v, A, e).L).toFixed(1);
      html += '<div class="tile6' + (store.six[n] ? " seen" : "") + (n === now ? " now" : "") + '"><svg viewBox="0 0 ' + W + " " + H + '"><rect x="' + sx(1 - e) + '" y="4" width="' + (sx(1 + e) - sx(1 - e)) + '" height="82" fill="#CFE6F3"/><path d="M8 45H152" stroke="#B9A98A" stroke-width="1"/><path d="' + p + '" fill="none" stroke="#246A9C" stroke-width="3"/><circle cx="' + sx(rr) + '" cy="' + sy(o.L) + '" r="6" fill="' + (o.flows ? "#5FA03C" : "#C8452F") + '" stroke="#4A2E1E" stroke-width="1.5"/></svg>' +
        '<div class="t6"><b>' + n + (store.six[n] ? " ✓" : "") + "</b> " + CASES[n][0] + '<br><span class="' + (o.flows ? "ok" : "bad") + '">' + (o.flows ? "push" : "no push") + "</span></div></div>";
    });
    $("s3six").innerHTML = html;
  }
  function s3reuse() {
    var K = +$("s3k").value; $("s3kv").textContent = K;
    var clipOn = $("s3clip").checked;
    var res = S.ppoReuse({ logits: [0, 0, 0], n: 64, eps: 0.2, epochs: K, lr: 1, clip: clipOn, seed: s3.batchSeed });
    var last = res.hist[res.hist.length - 1];
    $("s3batchinfo").innerHTML = "This batch: " + S.ROUTES.map(function (r, j) { return "<b>" + r.id + "</b> ×" + res.counts[j] + (res.avg[j] != null ? " (avg " + fmt(res.avg[j], 2) + ")" : ""); }).join(" · ");
    var max = 3;
    $("s3ratios").innerHTML = S.ROUTES.map(function (r, j) {
      var q = last.ratio[j], w = Math.min(q, max) / max * 100;
      return '<div class="ratio"><div class="rn"><b style="color:' + ROUTE_C[j] + '">' + r.id + "</b> ratio " + fmt(q, 2) + ' <span class="muted">· chance ' + pct(res.piOld[j]) + " → " + pct(last.pi[j]) + '</span></div><div class="rbar"><span class="band" style="left:' + (0.8 / max * 100) + "%;width:" + (0.4 / max * 100) + '%"></span><span class="one" style="left:' + (1 / max * 100) + '%"></span><i style="width:' + w + "%;background:" + ROUTE_C[j] + '"></i></div></div>';
    }).join("") + '<div class="scax"><span>0</span><span>ropes at 0.8 and 1.2</span><span>3+</span></div>';
    var far = 0; last.ratio.forEach(function (q, j) { if (Math.abs(Math.log(q)) > Math.abs(Math.log(last.ratio[far]))) far = j; });
    var fq = last.ratio[far];
    $("s3out").textContent = S.ROUTES[far].id + " · ×" + fmt(fq, 2);
    $("s3out").className = "v " + (Math.abs(Math.log(fq)) > Math.log(1.5) ? "bad" : "good");
    $("s3J").textContent = fmt(last.J, 2);
  }
  function duckDot(color) { return '<svg viewBox="0 0 20 16" aria-hidden="true"><ellipse cx="9" cy="10" rx="8" ry="5" fill="' + color + '" stroke="#4A2E1E" stroke-width="1.4"/><circle cx="14" cy="5" r="3.6" fill="' + color + '" stroke="#4A2E1E" stroke-width="1.4"/><path d="M17.3 5l2.4 .8-2.4 .8z" fill="#E8923A" stroke="#4A2E1E" stroke-width=".8"/></svg>'; }
  // Draw both flocks as they stood after round k (round 0 = before any training).
  function s3flockRound(k) {
    var R = s3.fleet.on[0].length - 1;
    ["on", "off"].forEach(function (key) {
      var fin = s3.fleet[key].map(function (run) { return run[Math.min(k, run.length - 1)]; });
      var good = 0, stuck = 0;
      $("s3f" + key).innerHTML = fin.map(function (f) {
        var c = f.pi[1] > 0.8 ? (good++, "#F4C430") : f.pi[1] < 0.1 ? (stuck++, "#C8452F") : "#9CCBEA";
        return '<span title="B chance ' + pct(f.pi[1]) + '">' + duckDot(c) + "</span>";
      }).join("");
      var avg = fin.reduce(function (s, f) { return s + f.J; }, 0) / fin.length;
      $("s3f" + key + "n").innerHTML = '<span class="muted">round ' + k + " of " + R + "</span> · <b class=\"" + (stuck ? "bad" : "ok") + "\">" + stuck + " stuck</b> · " + good + " favour B · average " + fmt(avg, 2) + " crumbs per crossing";
    });
  }
  // Play the rounds out one by one, so the cliff is seen happening rather than reported.
  function s3flock() {
    if (!s3.fleet) return;
    clearInterval(s3.anim);
    var R = s3.fleet.on[0].length - 1, k = 0;
    if (REDUCED) { s3flockRound(R); return; }
    s3flockRound(0);
    s3.anim = setInterval(function () { k++; s3flockRound(k); if (k >= R) clearInterval(s3.anim); }, 280);
  }
  function initS3() {
    range("s3r", function () { s3render(); touch("s3"); });
    seg($("s3A"), [{ v: 1, label: "Better (A = +1)" }, { v: -1, label: "Worse (A = −1)" }], 1, function (v) { s3.A = +v; s3render(); touch("s3"); });
    seg($("s3e"), [0.1, 0.2, 0.3].map(function (v) { return { v: v, label: "ε = " + v }; }), 0.2, function (v) { s3.eps = +v; s3render(); touch("s3"); });
    range("s3k", function () { s3reuse(); touch("s3"); });
    $("s3clip").onchange = function () { s3reuse(); touch("s3"); };
    $("s3batch").onclick = function () { s3.batchSeed++; s3reuse(); touch("s3"); };
    seg($("s3fk"), [5, 20, 40].map(function (v) { return { v: v, label: "K = " + v }; }), s3.K, function (v) { s3.K = +v; });
    $("s3fleet").onclick = function () {
      var b = $("s3fleet"); b.disabled = true; b.textContent = "Training…";
      setTimeout(function () {
        s3.fleet = S.ppoFleet({ logits: [0, 0, 0], n: 12, eps: 0.2, epochs: s3.K, lr: 1, seed: 5 }, 15, 60);
        s3flock(); b.disabled = false; b.textContent = "Train both flocks"; touch("s3");
      }, 30);
    };
    s3render(); s3reuse();
  }

  /* ================= STEP 4 · the λ dial ================= */
  var S4G = [0.9, 0.95, 0.97, 0.99, 0.995];
  var s4 = { trace: "stumble" };
  function s4vals() {
    var gm = S4G[+$("s4g").value], base = S.TRACES[s4.trace];
    return { lam: +$("s4l").value, gm: gm, t: +$("s4t").value, tr: { label: base.label, r: base.r, k: base.k, v: S.traceValues(base, gm) } };
  }
  function s4render() {
    var v = s4vals(); $("s4lv").textContent = fmt(v.lam, 2); $("s4gv").textContent = v.gm; $("s4tv").textContent = v.t;
    var g = PP.gae(v.tr.r, v.tr.v, v.gm, v.lam), i = v.t - 1, gl = v.gm * v.lam;
    $("s4A").textContent = sgn(g.adv[i], 3);
    var hl = PP.halfLifeSteps(v.gm, v.lam); $("s4half").textContent = v.lam === 0 ? "—" : !isFinite(hl) ? "never" : fmt(hl, 1);
    var g0 = PP.gae(v.tr.r, v.tr.v, v.gm, 0), g1 = PP.gae(v.tr.r, v.tr.v, v.gm, 1);
    $("s4ends").textContent = sgn(g0.adv[i], 2) + " · " + sgn(g1.adv[i], 2);
    var terms = [];
    for (var k = 0; k < 3 && i + k < 24; k++) terms.push((k ? fmt(Math.pow(gl, k), 3) + " × " : "") + "(" + sgn(g.deltas[i + k], 3) + ")");
    var big = -1, bigv = 0;
    for (var j = i + 3; j < 24; j++) { var c = Math.pow(gl, j - i) * g.deltas[j]; if (Math.abs(c) > Math.abs(bigv) + 1e-9) { big = j; bigv = c; } }
    var bigTxt = big >= 0 && Math.abs(bigv) > 0.01 ? "<br>Biggest later term: plank " + (big + 1) + ", " + fmt(Math.pow(gl, big - i), 3) + " × (" + sgn(g.deltas[big], 3) + ") = " + sgn(bigv, 3) : "";
    $("s4math").innerHTML = '<div class="eq">A<sub>t</sub> = δ<sub>t</sub> + (γλ)·δ<sub>t+1</sub> + (γλ)²·δ<sub>t+2</sub> + …</div><div class="eqn">γλ = ' + fmt(gl, 4) + "<br>A<sub>" + v.t + "</sub> = " + terms.join(" + ") + (i + 3 < 24 ? " + …" : "") + " = <b>" + sgn(g.adv[i], 3) + "</b>" + bigTxt + "<br>Mama's guess at the cut, V(s<sub>24</sub>) = " + fmt(v.tr.v[24], 2) + ", covers everything after plank 24.</div>";
    drawers.s4chart(); drawers.s4var();
  }
  drawers.s4chart = function () {
    var v = s4vals(), gg = PP.gae(v.tr.r, v.tr.v, v.gm, v.lam);
    var g = ctxFor("s4chart"), x = g.x, pad = { l: 44, r: 12, t: 14, b: 28 };
    var all = gg.deltas.concat(gg.adv), yhi = Math.max(0.5, Math.max.apply(null, all)) * 1.15, ylo = Math.min(-0.5, Math.min.apply(null, all)) * 1.15;
    axes(g, pad, ylo, yhi, 1);
    var bw = (g.w - pad.l - pad.r) / 24, sy = function (y) { return pad.t + (yhi - y) / (yhi - ylo) * (g.h - pad.t - pad.b); };
    line(x, [[pad.l, sy(0)], [g.w - pad.r, sy(0)]], "#4A2E1E", 1.5);
    x.fillStyle = "rgba(244,196,48,.25)"; x.fillRect(pad.l + (v.t - 1) * bw, pad.t, bw, g.h - pad.t - pad.b);
    for (var k = 0; k < 24; k++) {
      var x0 = pad.l + k * bw;
      x.fillStyle = "#B9BDC2"; x.fillRect(x0 + bw * 0.1, Math.min(sy(0), sy(gg.deltas[k])), bw * 0.36, Math.abs(sy(gg.deltas[k]) - sy(0)));
      x.fillStyle = C.acc; x.fillRect(x0 + bw * 0.5, Math.min(sy(0), sy(gg.adv[k])), bw * 0.36, Math.abs(sy(gg.adv[k]) - sy(0)));
      if (k % 2 === 0 || bw > 26) { x.fillStyle = C.dim; x.textAlign = "center"; x.fillText(k + 1, x0 + bw / 2, g.h - 12); }
    }
    var pts = [];
    for (var j = v.t - 1; j < 24; j++) pts.push([pad.l + j * bw + bw / 2, sy(yhi * 0.92 * Math.pow(v.gm * v.lam, j - v.t + 1))]);
    line(x, pts, C.gold, 2.5);
  };
  drawers.s4var = function () {
    var v = s4vals(), sp = S.gaeSpread(v.tr, v.gm, 200, 0.5, 77);
    var g = ctxFor("s4var"), x = g.x, pad = { l: 44, r: 12, t: 12, b: 26 };
    var yhi = Math.max.apply(null, sp.map(function (p) { return p.sd; })) * 1.15;
    axes(g, pad, 0, yhi, 2);
    var sx = function (l) { return pad.l + l * (g.w - pad.l - pad.r); }, sy = function (y) { return pad.t + (yhi - y) / yhi * (g.h - pad.t - pad.b); };
    line(x, sp.map(function (p) { return [sx(p.lambda), sy(p.sd)]; }), C.red, 3);
    var li = Math.min(19, Math.floor(v.lam * 20)), f = v.lam * 20 - li, sd = sp[li].sd + (sp[Math.min(20, li + 1)].sd - sp[li].sd) * f;
    x.fillStyle = C.gold; x.strokeStyle = "#4A2E1E"; x.lineWidth = 2; x.beginPath(); x.arc(sx(v.lam), sy(sd), 7, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = C.dim; x.textAlign = "center"; [0, 0.25, 0.5, 0.75, 1].forEach(function (l) { x.fillText("λ " + l, sx(l), g.h - 11); });

  };
  function initS4() {
    seg($("s4trace"), Object.keys(S.TRACES).map(function (k) { return { v: k, label: S.TRACES[k].label }; }), s4.trace, function (v) { s4.trace = v; s4render(); touch("s4"); });
    ["s4l", "s4g", "s4t"].forEach(function (id) { range(id, function () { s4render(); touch("s4"); }); });
    s4render();
  }

  /* ================= STEP 5 · the scorecard ================= */
  var KIND = { reward: ["reward", "wants +"], cost: ["cost", "wants −"], selfneg: ["self-negating", "wants +"] };
  function defaults(task) { var w = {}; S.TASKS[task].terms.forEach(function (t) { w[t.id] = t.def; }); return w; }
  function termTable(el, task, weights, onChange) {
    var T = S.TASKS[task];
    var html = '<div class="tt"><div class="tr h"><span>term</span><span>kind</span>' + T.behaviours.map(function (b) { return "<span>" + esc(b.name) + "</span>"; }).join("") + "<span>weight</span></div>";
    T.terms.forEach(function (t) {
      html += '<div class="tr"><span><code>' + t.id + "</code>" + (t.note ? '<small>' + esc(t.note) + "</small>" : "") + '</span><span><i class="kd k-' + t.kind + '">' + KIND[t.kind][0] + "</i><small>" + KIND[t.kind][1] + "</small></span>" +
        T.behaviours.map(function (b) { var v = t.vals[b.id]; return '<span class="nv' + (v < 0 ? " neg" : "") + '">' + fmt(v, Math.abs(v) < 2 && v % 1 ? 1 : 0) + "</span>"; }).join("") +
        '<span><input type="number" step="0.1" data-t="' + t.id + '" value="' + weights[t.id] + '" aria-label="weight for ' + t.id + '"></span></div>';
    });
    el.innerHTML = html + "</div>";
    qa("input[data-t]", el).forEach(function (inp) { inp.addEventListener("input", function () { var v = parseFloat(inp.value); weights[inp.dataset.t] = isNaN(v) ? 0 : v; onChange(); }); });
  }
  function trainMenu(task, weights) {
    var tot = S.behaviourTotals(task, weights), hist = S.learnMenu(tot, 300, 0.5), pi = hist[hist.length - 1];
    var win = 0; pi.forEach(function (p, i) { if (p > pi[win]) win = i; });
    return { tot: tot, hist: hist, pi: pi, win: tot[win], audit: S.penaltyAudit(task, weights, tot[win].id) };
  }
  // One frame of the learner: the policy `pi` after `n` updates. `final` marks the settled state.
  function renderBehave(el, res, pi, n, final) {
    el.innerHTML = res.tot.map(function (b, i) {
      return '<div class="bh' + (final && b === res.win ? " win" : "") + '"><span class="bn">' + esc(b.name) + (b.want ? ' <small>(what you wanted)</small>' : "") + '</span><span class="bb"><i style="width:' + (pi[i] * 100) + '%"></i></span><span class="bp">' + pct(pi[i]) + '</span><span class="bt">' + sgn(b.total, 1) + "</span></div>";
    }).join("") + '<div class="scax"><span>chance the learner picks it</span><span>' + (final ? "settled after " + res.hist.length + " updates" : "update " + n + " of " + res.hist.length) + '</span><span>total reward</span></div>';
  }
  // Play the 300 updates out over about a second, so the learner is seen learning; then call `done`.
  // Time-based, with a timeout fallback: a hidden tab throttles animation frames, and the log
  // audit and the review-board grade must never wait on that.
  function playBehave(el, res, done) {
    if (el._raf) cancelAnimationFrame(el._raf);
    if (el._to) clearTimeout(el._to);
    var H = res.hist, t0 = performance.now(), D = 900, finished = false;
    function finish() {
      if (finished) return; finished = true;
      if (el._raf) cancelAnimationFrame(el._raf); el._raf = null; clearTimeout(el._to);
      renderBehave(el, res, res.pi, H.length, true); if (done) done();
    }
    if (REDUCED) { finish(); return; }
    function frame() {
      var f = (performance.now() - t0) / D;
      if (f >= 1) return finish();
      var i = Math.floor(f * (H.length - 1));
      renderBehave(el, res, H[i], i + 1, false);
      el._raf = requestAnimationFrame(frame);
    }
    frame();
    el._to = setTimeout(finish, D + 250);
  }
  function renderAudit(el, task, weights, res) {
    var parts = res.win.parts;
    el.innerHTML = parts.map(function (p) {
      var pen = p.kind !== "reward", bad = pen && p.v > 1e-9;
      return '<div class="au' + (bad ? " red" : "") + '"><code>Episode_Reward/' + p.id + "</code><b>" + sgn(p.v, 1) + "</b>" + (pen ? (bad ? '<span class="bad">penalty paying out</span>' : '<span class="ok">≤ 0 ✓</span>') : '<span class="muted">reward</span>') + "</div>";
    }).join("");
  }
  var s5 = { task: "walk", w: { walk: defaults("walk"), getup: defaults("getup") } };
  function s5table() { termTable($("s5terms"), s5.task, s5.w[s5.task], function () { touch("s5"); }); }
  function s5train() {
    var r = trainMenu(s5.task, s5.w[s5.task]);
    $("s5audit").innerHTML = "";
    playBehave($("s5behave"), r, function () { renderAudit($("s5audit"), s5.task, s5.w[s5.task], r); });
  }
  function initS5() {
    seg($("s5task"), [{ v: "walk", label: "Walk forward" }, { v: "getup", label: "Get up after a fall" }], "walk", function (v) { s5.task = v; s5table(); s5train(); touch("s5"); });
    $("s5train").onclick = function () { s5train(); touch("s5"); };
    $("s5def").onclick = function () { s5.w[s5.task] = defaults(s5.task); s5table(); s5train(); };
    s5table(); s5train();
  }

  /* ================= STEP 6 · the real duck ================= */
  var STEP_T = { s0: "0 · The Pond", s1: "1 · Lucky Crossings", s2: "2 · Mama's Guess", s3: "3 · The Lane Ropes", s4: "4 · The λ Dial", s5: "5 · The Scorecard", s6: "6 · this step" };
  function s6cfg() {
    var k = {}; MD.knobs.forEach(function (row) { k[row[0]] = row; });
    function kn(name, indent) { var row = k[name]; return indent + '<button type="button" class="kn" data-k="' + name + '">' + name + "=" + esc(row[1]) + "</button>,\n"; }
    var s = "MicroduckRlCfg = RslRlOnPolicyRunnerCfg(\n    actor=RslRlModelCfg(\n" + kn("hidden_dims", "        ") + kn("activation", "        ") + kn("obs_normalization", "        ") +
      "        distribution_cfg={\n" + kn("init_std", "            ").replace("init_std=", '"init_std": ') + kn("std_type", "            ").replace("std_type=", '"std_type": ') + "        },\n    ),\n    critic=RslRlModelCfg(hidden_dims=(512, 256, 128), activation=\"elu\", obs_normalization=True),\n    algorithm=PpoWithSymmetryCfg(\n";
    ["value_loss_coef", "use_clipped_value_loss", "clip_param", "entropy_coef", "num_learning_epochs", "num_mini_batches", "learning_rate", "schedule", "gamma", "lam", "desired_kl", "max_grad_norm"].forEach(function (n) { s += kn(n, "        "); });
    s += "        …\n    ),\n    …\n" + kn("num_steps_per_env", "    ") + kn("max_iterations", "    ") + ")";
    $("s6cfg").innerHTML = s;
    qa(".kn", $("s6cfg")).forEach(function (b) { b.onclick = function () { s6knob(b.dataset.k); touch("s6"); }; });
    s6knob("clip_param");
  }
  function s6knob(name) {
    var row = MD.knobs.filter(function (r) { return r[0] === name; })[0];
    qa(".kn", $("s6cfg")).forEach(function (b) { b.classList.toggle("on", b.dataset.k === name); });
    var extra = name === "entropy_coef" ? '<p class="muted">The roller-skating task raises it to <b>0.03</b>: "' + esc(MD.rollersEntropy.comment) + '" (<code>' + MD.rollersEntropy.file.split("/").pop() + ":" + MD.rollersEntropy.line + "</code>).</p>" : "";
    $("s6knob").innerHTML = "<h3><code>" + row[0] + "</code> = " + esc(row[1]) + "</h3><p>" + esc(row[4]) + "</p>" + (row[5] !== "—" ? '<p class="muted"><b>Turn it up / down:</b> ' + esc(row[5]) + "</p>" : "") + extra +
      '<div class="btnrow">' + (row[3] !== "s6" ? '<button class="ghost" data-go="' + row[3] + '">Learned in step ' + STEP_T[row[3]] + " →</button>" : "") + '<a class="ghost lnk" href="' + MD.url + "#L" + row[2] + '" target="_blank" rel="noopener">Line ' + row[2] + " on GitHub ↗</a></div>";
    var go = $("s6knob").querySelector("[data-go]"); if (go) go.onclick = function () { show(go.dataset.go); };
  }
  var ENVS = [64, 128, 256, 512, 1024, 2048, 4096, 8192], ITERS = [5, 100, 1000, 5000, 10000, 20000, 50000];
  function s6batch() {
    var e = ENVS[+$("s6e").value], it = ITERS[+$("s6i").value], b = PP.ppoBatch(e, 24, 4, 5), tot = PP.envSteps(e, it, 24), smoke = PP.envSteps(MD.smoke.envs, MD.smoke.iters, 24);
    $("s6ev").textContent = fmt(e); $("s6iv").textContent = fmt(it);
    $("s6batch").textContent = fmt(b.batch); $("s6mb").textContent = fmt(b.miniBatch); $("s6gs").textContent = b.gradSteps;
    $("s6dt").textContent = fdur(b.batch / MD.hz); $("s6tot").textContent = fdur(tot / MD.hz);
    $("s6smoke").textContent = tot >= smoke ? "×" + fmt(tot / smoke) : "smaller";
  }
  var s6 = { single: S.drTrain(1, 1), dr: null };
  function s6dr() {
    var w = +$("s6w").value, mu = +$("s6m").value;
    $("s6wv").textContent = fmt(w, 2); $("s6mv").textContent = fmt(mu, 2);
    s6.dr = S.drTrain(1 - w, 1 + w);
    var a = S.drScore(s6.single.k, s6.single.c, mu), b = S.drScore(s6.dr.k, s6.dr.c, mu);
    $("s6s1").textContent = a < 0 ? "falls" : fmt(a, 2); $("s6s1").className = "v " + (a < 0 ? "bad" : "good");
    $("s6s2").textContent = b < 0 ? "falls" : fmt(b, 2); $("s6s2").className = "v " + (b < 0 ? "bad" : "good");
    drawers.s6chart();
  }
  drawers.s6chart = function () {
    if (!s6.dr) return;
    var g = ctxFor("s6chart"), x = g.x, pad = { l: 40, r: 12, t: 12, b: 26 }, mu = +$("s6m").value, w = +$("s6w").value;
    axes(g, pad, -1.2, 1.2, 1);
    var sx = function (m) { return pad.l + (m - 0.5) * (g.w - pad.l - pad.r); }, sy = function (y) { return pad.t + (1.2 - y) / 2.4 * (g.h - pad.t - pad.b); };
    x.fillStyle = "rgba(95,160,60,.14)"; x.fillRect(sx(1 - w), pad.t, sx(1 + w) - sx(1 - w), g.h - pad.t - pad.b);
    line(x, [[pad.l, sy(0)], [g.w - pad.r, sy(0)]], "#4A2E1E", 1.5);
    [[s6.single, C.red], [s6.dr, C.grn]].forEach(function (p) {
      var pts = []; for (var m = 0.5; m <= 1.5001; m += 0.005) pts.push([sx(m), sy(S.drScore(p[0].k, p[0].c, m))]);
      line(x, pts, p[1], 3);
    });
    line(x, [[sx(mu), pad.t], [sx(mu), g.h - pad.b]], C.acc, 2, [5, 4]);
    x.fillStyle = C.dim; x.textAlign = "center"; [0.5, 0.75, 1, 1.25, 1.5].forEach(function (m) { x.fillText(fmt(m, 2), sx(m), g.h - 11); });
  };
  function initS6() {
    s6cfg();
    ["s6e", "s6i"].forEach(function (id) { range(id, function () { s6batch(); touch("s6"); }); });
    ["s6w", "s6m"].forEach(function (id) { range(id, function () { s6dr(); touch("s6"); }); });
    s6batch(); s6dr();
  }

  /* ================= CAPSTONE ================= */
  var CAP = {
    cap1: {
      title: "Case 1 · The butt-hop",
      task: "walk",
      start: function () { var w = defaults("walk"); w.joint_limit_penalty = -1.0; return w; },
      brief: "A walking run. Mean reward climbed nicely all night, but the video shows the robot bouncing along on its bottom, and <code>Episode_Reward/joint_limit_penalty</code> reads <b>+100</b>. The previous engineer's note: \"added a joint-limit penalty, weight −1.0.\"",
      reason: ["The penalty already returns negative numbers; a negative weight double-negates it into a payment for slamming the joints", "The upright reward is too small", "The learning rate is too high"],
      right: 0,
      checks: function (w, res) {
        return [
          ["It learns to walk", res.win.id === "walk"],
          ["Every penalty reads ≤ 0 on the learned behaviour", res.audit.every(function (a) { return a.ok; })],
          ["The joint-limit penalty is still switched on (weight > 0)", w.joint_limit_penalty > 0]
        ];
      }
    },
    cap2: {
      title: "Case 2 · The parking lot",
      task: "getup",
      start: function () { return defaults("getup"); },
      brief: "A get-up-after-a-fall run. To \"encourage recovery\", someone added <code>recovery_bonus</code>, paid every step the robot's body is low. After training, the robot lies on its back (or flops on its side) and stays there, collecting it. A potential-based term, <code>rise_progress</code>, is available at weight 0: it pays for the <i>change</i> in uprightness.",
      reason: ["The bonus pays for being in the fallen state, so the cheapest low pose farms it", "The robot is too weak to stand", "γ is too low"],
      right: 0,
      checks: function (w, res) {
        var T = res.tot, stand = T.filter(function (b) { return b.id === "standup"; })[0];
        var pos = function (b) { return b.parts.filter(function (p) { return p.kind === "reward"; }).reduce(function (s, p) { return s + Math.max(0, p.v); }, 0); };
        var worst = Math.max.apply(null, T.filter(function (b) { return b.id === "lie" || b.id === "flop"; }).map(pos));
        var keep = pos(stand) > 0 ? worst / pos(stand) : 1;
        return [
          ["It learns to stand up", res.win.id === "standup"],
          ["Nothing pays for being low (recovery_bonus weight is 0)", !w.recovery_bonus],
          ["A lazy flop keeps under 25% of what standing earns (it keeps " + pct(Math.max(0, keep)) + ")", keep < 0.25]
        ];
      }
    }
  };
  function capStars() {
    var n = ["cap1", "cap2", "cap3"].filter(function (k) { return store.cap[k]; }).length;
    $("capstars").textContent = "★★★".slice(0, n) + "☆☆☆".slice(0, 3 - n);
    $("capscore").textContent = n + " of 3 cases closed";
    if (n === 3 && !store.said.cap) { store.said.cap = true; save(); buildNav(); markNav(); }
  }
  function reasonHTML(id, opts) {
    return '<div class="lbl">Why did it happen?</div><div class="reason" id="' + id + 'r">' + opts.map(function (o, i) { return '<label><input type="radio" name="' + id + 'r" value="' + i + '"' + (store.capAns[id] === i ? " checked" : "") + "> " + o + "</label>"; }).join("") + "</div>";
  }
  function readReason(id) { var el = document.querySelector('input[name="' + id + 'r"]:checked'); return el ? +el.value : null; }
  function checksHTML(list, reasonOk) {
    return list.concat([["You named the right cause", reasonOk]]).map(function (c) { return '<div class="check ' + (c[1] ? "ok" : "no") + '"><span class="ic">' + (c[1] ? "✓" : "✗") + "</span><div>" + c[0] + "</div></div>"; }).join("");
  }
  function initCapMenu(id) {
    var c = CAP[id], el = $(id), w = c.start();
    el.innerHTML = "<h3>" + c.title + '</h3><div class="brief">' + c.brief + '</div><div class="terms" id="' + id + 't"></div><div class="btnrow"><button class="act" id="' + id + 'go">Re-train</button><button class="ghost" id="' + id + 'rs">Back to the broken run</button></div><div class="grid g2"><div><div class="lbl">What it learns</div><div class="behave" id="' + id + 'b"></div></div><div><div class="lbl">The logs</div><div class="audit" id="' + id + 'a"></div></div></div>' + reasonHTML(id, c.reason) + '<div class="checks" id="' + id + 'c"></div>';
    function draw() { termTable($(id + "t"), c.task, w, function () {}); }
    function run(grade) {
      var res = trainMenu(c.task, w);
      $(id + "a").innerHTML = ""; $(id + "c").innerHTML = "";
      playBehave($(id + "b"), res, function () {
        renderAudit($(id + "a"), c.task, w, res);
        if (!grade) return;
        var ans = readReason(id); store.capAns[id] = ans;
        var list = c.checks(w, res), ok = ans === c.right, pass = ok && list.every(function (x) { return x[1]; });
        $(id + "c").innerHTML = checksHTML(list, ok) + (pass ? '<div class="callout co-g"><b>Case closed.</b></div>' : "");
        store.cap[id] = pass; save(); capStars();
      });
    }
    $(id + "go").onclick = function () { run(true); };
    $(id + "rs").onclick = function () { w = c.start(); draw(); run(false); };
    draw(); run(false);
  }
  function initCap3() {
    var el = $("cap3");
    el.innerHTML = '<h3>Case 3 · The attempt tax</h3><div class="brief">A roll trick. The team wants smooth motion, so <code>action_rate_l2</code> (a smoothness penalty) is at full weight from iteration 0. After 500 iterations the robot just stands there. The roll is never discovered. In this toy, attempting pays 22 + 100 × skill − 60 × tax; standing still pays 20 − 1 × tax; skill only grows while the robot attempts.</div>' +
      '<div class="pg"><div class="panel">' +
      '<div class="sl"><div class="sl-h"><span>Tax weight at the end</span><b id="c3wv"></b></div><input type="range" id="c3w" min="0" max="1" step="0.05" value="1" aria-label="Final tax weight"></div>' +
      '<div class="sl"><div class="sl-h"><span>Tax switches on at iteration</span><b id="c3sv"></b></div><input type="range" id="c3s" min="0" max="400" step="25" value="0" aria-label="Start iteration"></div>' +
      '<div class="sl"><div class="sl-h"><span>Ramp length (a staircase from 0)</span><b id="c3lv"></b></div><input type="range" id="c3l" min="0" max="200" step="50" value="0" aria-label="Ramp length"></div>' +
      '</div><div><canvas id="c3chart" height="210" aria-label="Attempt rate, skill and tax over training"></canvas><div class="chartcap"><span class="sw" style="background:#246A9C"></span>chance it attempts the roll · <span class="sw" style="background:#3B7422"></span>skill · <span class="sw" style="background:#C8452F"></span>tax weight</div></div></div>' +
      '<div class="btnrow"><button class="act" id="cap3go">Re-train</button></div>' + reasonHTML("cap3", ["The tax made trying worse than doing nothing before the skill existed, so it stopped trying", "The tax weight should be negative", "It needs more iterations"]) + '<div class="checks" id="cap3c"></div>';
    var hist = null;
    function sched() { var w = +$("c3w").value, st = +$("c3s").value, len = +$("c3l").value; return { mode: "ramp", w: w, start: st, len: len }; }
    function run(grade) {
      $("c3wv").textContent = fmt(+$("c3w").value, 2); $("c3sv").textContent = $("c3s").value; $("c3lv").textContent = $("c3l").value;
      hist = S.attemptTax(sched(), 500); drawers.c3chart();
      if (!grade) { $("cap3c").innerHTML = ""; return; }
      var L = hist[hist.length - 1], ans = readReason("cap3"); store.capAns.cap3 = ans;
      var list = [["It learns the roll (attempts " + pct(L.pAttempt) + ", skill " + pct(L.skill) + ")", L.pAttempt > 0.9 && L.skill > 0.9], ["Smoothness is fully on by the end (tax weight 1.0)", Math.abs(L.w - 1) < 1e-9]];
      var ok = ans === 0, pass = ok && list.every(function (x) { return x[1]; });
      $("cap3c").innerHTML = checksHTML(list, ok) + (pass ? '<div class="callout co-g"><b>Case closed.</b> The playbook: introduce taxes after skill discovery, as a curriculum from about 0.</div>' : "");
      store.cap.cap3 = pass; save(); capStars();
    }
    drawers.c3chart = function () {
      if (!hist) return;
      var g = ctxFor("c3chart"), x = g.x, pad = { l: 40, r: 12, t: 10, b: 24 }, N = hist.length;
      axes(g, pad, 0, 1, 1);
      var sx = function (i) { return pad.l + (g.w - pad.l - pad.r) * i / (N - 1); }, sy = function (v) { return pad.t + (1 - v) * (g.h - pad.t - pad.b); };
      line(x, hist.map(function (h, i) { return [sx(i), sy(h.w)]; }), C.red, 2, [5, 4]);
      line(x, hist.map(function (h, i) { return [sx(i), sy(h.skill)]; }), C.grn, 2.5);
      line(x, hist.map(function (h, i) { return [sx(i), sy(h.pAttempt)]; }), C.acc, 3);
      x.fillStyle = C.dim; x.textAlign = "right"; x.fillText("500 iterations", g.w - pad.r, g.h - 10);
    };
    ["c3w", "c3s", "c3l"].forEach(function (id) { range(id, function () { run(false); }); });
    $("cap3go").onclick = function () { run(true); };
    run(false);
  }
  function initCap() { initCapMenu("cap1"); initCapMenu("cap2"); initCap3(); capStars(); }

  /* ================= FIELD TEST ================= */
  var FT = [
    { q: "Step 0: which γ gives a horizon of exactly 1 second at 50 steps per second?", type: "num", ans: 0.98, tol: 0.0005, hint: "1 s = 50 steps = 1 ÷ (1 − γ)" },
    { q: "Step 3: pick K = 40 and train both flocks. Without the ropes, how many of the 60 ducklings end up stuck?", type: "num", ans: 9, tol: 0.5 },
    { q: "Step 2: with a 10-crumb finishing bonus, does subtracting Mama's guess change the true (average) push?", type: "opt", opts: ["Yes, it gets bigger", "No, only the spread changes", "Yes, it flips sign"], ans: 1 },
    { q: "Step 2: r = 1, V(here) = 4, V(next) = 4, γ = 0.99, not finished. What's δ?", type: "num", ans: 0.96, tol: 0.005 },
    { q: "Step 3: ε = 0.2 and the crossing was worse than expected (A = −1). Below which ratio does the push stop?", type: "num", ans: 0.8, tol: 0.001 },
    { q: "Step 4: which λ makes the advantage equal to Mama's one-step surprise δ?", type: "num", ans: 0, tol: 0.001 },
    { q: "Step 6: with 1,024 simulated ducks, how many steps go into each minibatch?", type: "num", ans: 6144, tol: 0.5 },
    { q: "Step 5: joint_limit_penalty already returns numbers ≤ 0. What sign should its weight have?", type: "opt", opts: ["Positive", "Negative", "Either"], ans: 0 }
  ];
  function initFT() {
    $("ftqs").innerHTML = FT.map(function (f, i) {
      var input = f.type === "num" ? '<input type="number" step="any" id="ft' + i + '" aria-label="Answer ' + (i + 1) + '"' + (store.ft[i] != null ? ' value="' + store.ft[i] + '"' : "") + ">" :
        '<select id="ft' + i + '" aria-label="Answer ' + (i + 1) + '"><option value="">choose…</option>' + f.opts.map(function (o, j) { return '<option value="' + j + '"' + (String(store.ft[i]) === String(j) ? " selected" : "") + ">" + o + "</option>"; }).join("") + "</select>";
      return '<div class="fq"><div class="fqt"><b>' + (i + 1) + ".</b> " + f.q + (f.hint ? ' <span class="muted">(' + f.hint + ")</span>" : "") + '</div><div class="row">' + input + '<span class="res" id="ftr' + i + '"></span></div></div>';
    }).join("");
    $("ftgo").onclick = function () {
      var score = 0;
      FT.forEach(function (f, i) {
        var raw = $("ft" + i).value, v = parseFloat(raw), ok = raw !== "" && !isNaN(v) && (f.type === "num" ? (f.lo != null ? v >= f.lo && v <= f.hi : Math.abs(v - f.ans) <= f.tol) : v === f.ans);
        store.ft[i] = raw; if (ok) score++;
        $("ftr" + i).innerHTML = ok ? '<span class="ok">✓</span>' : '<span class="bad">✗</span>';
      });
      save();
      $("ftscore").innerHTML = "<b>" + score + " / " + FT.length + "</b>" + (score === FT.length ? " · you can read a PPO config." : "");
      if (score >= 6 && !store.said.ft) { store.said.ft = true; save(); buildNav(); markNav(); }
    };
    $("reset").onclick = function () { try { localStorage.removeItem(KEY); } catch (e) {} location.hash = ""; location.reload(); };
  }

  /* ---------------- art ---------------- */
  function renderArt() {
    var A = window.PP_ART || {};
    qa(".scene[data-art]").forEach(function (el) { var svg = A[el.dataset.art]; if (svg && !el.firstChild) el.innerHTML = svg; });
  }

  /* ---------------- next-step buttons ---------------- */
  function buildNext() {
    sections.forEach(function (s, i) {
      var n = sections[i + 1]; if (!n) return;
      var row = document.createElement("div"); row.className = "nextrow";
      var b = document.createElement("button"); b.type = "button"; b.className = "act";
      b.textContent = "Next: " + n.dataset.n + " · " + n.dataset.title + " →";
      b.onclick = function () { show(n.id); };
      row.appendChild(b); s.appendChild(row);
    });
  }

  /* ---------------- boot ---------------- */
  var REDUCED = false; try { REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
  try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
  renderArt();
  qa(".kmap .k[data-i]").forEach(function (el) { el.innerHTML = IC[el.dataset.i] || ""; });
  qa(".mast .mi").forEach(function (el) { el.innerHTML = IC.duck || ""; });
  buildNav(); buildNext();
  // A hash typed or pasted into an open tab should switch the step too (show() uses replaceState, which doesn't fire this).
  window.addEventListener("hashchange", function () {
    var id = (location.hash || "").replace("#", "");
    if ($(id) && $(id).tagName === "SECTION" && !$(id).classList.contains("on")) show(id);
  });
  initS0(); initS1(); initS2(); initS2v(); initS3(); initS4(); initS5(); initS6(); initCap(); initFT();
  initTips(document);
  initPredicts();
  sections.forEach(function (s) { checkSay(s.id); });
  var start = (location.hash || "").replace("#", "");
  show($(start) && $(start).tagName === "SECTION" ? start : "s0");
  // The URL hash matches a section id, so the browser performs its own fragment jump after load,
  // after show() has already scrolled to the top. Undo it once the page has settled.
  window.addEventListener("load", function () {
    setTimeout(function () {
      window.scrollTo(0, 0);
      // Shareable result link: ?run=1#s3 trains both flocks at K = 40 and scrolls to them.
      if (/[?&]run=1/.test(location.search) && start === "s3") {
        var b40 = document.querySelector('#s3fk button[data-v="40"]'); if (b40) b40.click();
        s3.fleet = S.ppoFleet({ logits: [0, 0, 0], n: 12, eps: 0.2, epochs: 40, lr: 1, seed: 5 }, 15, 60);
        s3flock(); $("s3fleet").closest(".card").scrollIntoView({ block: "start" });
      }
    }, 0);
  });
  window.PPApp = { show: show, store: function () { return store; } };
})();

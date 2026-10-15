/* Dual Controls — checks. `node tests/check.js` verifies the invariants and prints every number ACCEPTANCE.md quotes.
   Everything is seeded, so the printout is the same on every machine. Exits non-zero if a check fails. */
"use strict";
var DC = require("../js/core.js");
var fails = 0, t0 = Date.now();
function ok(cond, what) { if (!cond) { fails++; console.log("  ✗ " + what); } else console.log("  ✓ " + what); }
function f(n, d) { return n == null ? "–" : Number(n).toFixed(d == null ? 2 : d); }
function pc(x, d) { return f(100 * x, d == null ? 0 : d) + "%"; }
function head(s) { console.log("\n" + s); }
var CACHE = {};
function fleet(key, cfg) { if (!CACHE[key]) CACHE[key] = DC.runFleet(cfg); return CACHE[key]; }
function line(name, runs, level) {
  var S = DC.summarize(runs, level), cross = DC.crossing(S.curve, level || 0.8);
  return "  " + name + " exam " + pc(S.pass) + " (examiner says " + pc(S.examiner) + ", staff bays " + pc(S.staff) + ") · fleet average reaches " + pc(level || 0.8) + " at lesson " + (cross || "–") + (cross ? " (" + f(S.mins[cross - 1], 0) + " lot-min)" : "") +
    " · runs reaching it " + S.reached + "/" + S.n + " · lot " + f(S.wallMin, 0) + " min · instructor " + f(S.humanMin, 1) + " min · crashes " + f(S.crashes, 0);
}

/* ---------------- machinery ---------------- */
head("Machinery");
(function () {
  // the instructor's distances are shortest paths: no action does better than D − 1, and some action achieves it
  var D = DC.dist("park"), bad = 0;
  for (var s = 0; s < DC.NS; s++) {
    if (DC.cell(DC.sx(s), DC.sy(s)) !== "." || D[s] === Infinity) continue;
    var best = Infinity;
    for (var a = 0; a < 3; a++) { var m = DC.move(s, a, "park", false); var v = m.success ? 1 : (m.crash || m.bay) ? Infinity : 1 + D[m.s2]; best = Math.min(best, v); }
    if (best !== D[s]) bad++;
  }
  ok(bad === 0, "the instructor's distances satisfy D(s) = 1 + min over moves (a shortest path)");
  console.log("  lesson starts: " + DC.STARTS.length + " poses; the exam uses " + DC.EXAM_STARTS.length + " of them");

  // Bellman target, by hand
  var ag = DC.newAgent({ alpha0: 0.2, tau: 0.005, gamma: 0.95 }), r = DC.rng(3);
  for (var e = 0; e < ag.Q.length; e++) { ag.Q[e] = r(); ag.QT[e] = r(); ag.L[e] = r.normal(); }
  var tr = { s: DC.sid(5, 5, 0), a: 1, r: 0, s2: DC.sid(6, 5, 0), done: false }, s2 = tr.s2, p = DC.policy(ag, s2), al = Math.exp(ag.la), v = 0;
  for (var a2 = 0; a2 < 3; a2++) v += p[a2] * (ag.QT[s2 * 3 + a2] - al * Math.log(p[a2]));
  ok(Math.abs(DC.target(ag, tr) - 0.95 * v) < 1e-12, "Bellman target y = r + γ Σ π(a'|s')[Q̄(s',a') − α log π(a'|s')] (by hand)");
  ok(DC.target(ag, { s: 1, a: 0, r: 1, s2: 2, done: true }) === 1, "a terminal transition's target is just its reward");

  // gradient checks by central finite differences
  var s0 = DC.sid(4, 6, 1), L = Float64Array.from(ag.L), an = DC.actorLoss(ag, s0, L), worst = 0, hh = 1e-6;
  for (var k = 0; k < 3; k++) { var Lp = Float64Array.from(L), Lm = Float64Array.from(L); Lp[s0 * 3 + k] += hh; Lm[s0 * 3 + k] -= hh; var fd = (DC.actorLoss(ag, s0, Lp).J - DC.actorLoss(ag, s0, Lm).J) / (2 * hh); worst = Math.max(worst, Math.abs(fd - an.g[k])); }
  ok(worst < 1e-7, "actor loss gradient matches finite differences (max error " + worst.toExponential(1) + ")");
  var states = [s0, DC.sid(2, 5, 2), DC.sid(9, 3, 4)], aa = DC.alphaLoss(ag, states, 0.15), fdA = (DC.alphaLoss(ag, states, 0.15, ag.la + hh).J - DC.alphaLoss(ag, states, 0.15, ag.la - hh).J) / (2 * hh);
  ok(Math.abs(fdA - aa.g) < 1e-7, "temperature loss gradient (w.r.t. log α) matches finite differences");
  var d = DC.examinerData(7, {}), c = { w: new Float64Array(DC.NPX).map(function () { return r.normal() * 0.3; }), b: 0.1 }, g = DC.clfLoss(c, d.X, d.Y, 1e-4), wc = 0;
  for (k = 0; k < DC.NPX; k++) { var cp = { w: Float64Array.from(c.w), b: c.b }, cm = { w: Float64Array.from(c.w), b: c.b }; cp.w[k] += hh; cm.w[k] -= hh; wc = Math.max(wc, Math.abs((DC.clfLoss(cp, d.X, d.Y, 1e-4).loss - DC.clfLoss(cm, d.X, d.Y, 1e-4).loss) / (2 * hh) - g.gw[k])); }
  ok(wc < 1e-7, "examiner (logistic regression) gradient matches finite differences (max error " + wc.toExponential(1) + ")");

  // the lazy target copy equals Polyak averaging done every step
  var A = DC.newAgent({ tau: 0.05 }), Bq = new Float64Array(A.Q.length), rr = DC.rng(9), maxd = 0;
  for (var step = 0; step < 300; step++) {
    var e2 = rr.int(40); for (var z = 0; z < 40; z++) maxd = Math.max(maxd, Math.abs(DC.qbar(A, z) - Bq[z]));
    var nv = rr(); A.QT[e2] = DC.qbar(A, e2); A.stamp[e2] = A.U; A.Q[e2] = nv;
    for (z = 0; z < 40; z++) Bq[z] = 0.05 * A.Q[z] + 0.95 * Bq[z];
    A.U++;
  }
  ok(maxd < 1e-12, "the target copy, computed lazily, equals Q̄ ← τQ + (1 − τ)Q̄ applied after every step");

  // the fast update equals the reference written with the loss functions
  var o = Object.assign({}, DC.DEFAULTS), X = DC.newAgent(o), Y = DC.newAgent(o), batch = [];
  for (k = 0; k < 16; k++) { var ss = DC.sid(rr.int(12), 1 + rr.int(7), rr.int(8)); batch.push({ s: ss, a: rr.int(3), r: rr() < 0.2 ? 1 : 0, s2: DC.sid(rr.int(12), 1 + rr.int(7), rr.int(8)), done: rr() < 0.2 }); }
  for (k = 0; k < 5; k++) { DC.update(X, batch, o); DC.updateRef(Y, batch, o); }
  var diff = 0; for (k = 0; k < X.Q.length; k++) diff = Math.max(diff, Math.abs(X.Q[k] - Y.Q[k]), Math.abs(X.L[k] - Y.L[k]));
  ok(diff < 1e-12 && Math.abs(X.la - Y.la) < 1e-12, "the page's fast SAC update equals the reference update");

  var r1 = DC.train({ seed: 4, episodes: 30, demos: 5, itv: DC.ITV.short }), r2 = DC.train({ seed: 4, episodes: 30, demos: 5, itv: DC.ITV.short });
  ok(JSON.stringify(r1.ep.map(function (e) { return [e.steps, e.itv, e.exam.pass]; })) === JSON.stringify(r2.ep.map(function (e) { return [e.steps, e.itv, e.exam.pass]; })), "a seeded training run is the same every time");
})();

/* ---------------- step 0 ---------------- */
head("Step 0 · The lot (2,000 lessons with the untrained student, picking moves at random)");
(function () {
  var R = DC.randomLessons(2000, 11);
  console.log("  parked straight in the exam bay " + R.success + " times (" + pc(R.success / R.n, 1) + ") · crashed " + pc(R.crash / R.n, 0) + " · ended in a staff bay " + R.staff + " · " + f(R.moves / R.n, 1) + " moves a lesson · " + f(R.secs / 3600, 1) + " lot-hours");
  ok(R.success / R.n < 0.01, "random driving almost never parks in the exam bay");
  var dr = DC.demoDrives(20, 300), lens = dr.map(function (t) { return t.length; }), D = DC.dist("park");
  var opt = dr.map(function (t) { return D[t[0].s]; });
  console.log("  the instructor's 20 demo drives: " + f(lens.reduce(function (a, b) { return a + b; }) / 20, 1) + " moves on average (shortest possible from the same starts: " + f(opt.reduce(function (a, b) { return a + b; }) / 20, 1) + "), all " + dr.filter(function (t) { return t[t.length - 1].success; }).length + " parked");
})();

/* ---------------- step 1 ---------------- */
head("Step 1 · Every lesson twice (the practice box, 8 runs each; exam = 24 fixed starts)");
(function () {
  var F = DC.FLEETS.s1, out = {};
  ["rf", "utd1", "utd4", "utd16"].forEach(function (k) {
    var runs = fleet("s1" + k, F[k]), S = DC.summarize(runs, 0.75), cr = DC.crossing(S.curve, 0.75);
    out[k] = { S: S, cr: cr };
    var at = [50, 100, 200, 300, 600].filter(function (x) { return x <= S.E; }).map(function (x) { return x + ": " + pc(S.curve[x - 1]) + " @ " + f(S.mins[x - 1], 0) + " min"; }).join(" · ");
    var reuse = runs.reduce(function (s, r) { return s + r.replays / Math.max(1, r.online); }, 0) / runs.length;
    if (k === "rf") reuse = 1;
    console.log("  " + k + ": " + at + " · fleet average reaches 75% at lesson " + (cr || "–") + (cr ? " (" + f(S.mins[cr - 1], 0) + " lot-min)" : "") + " · each logged move studied " + f(reuse, 0) + "× on average");
  });
  ok(out.utd4.cr && (!out.rf.cr || out.rf.cr > 1.5 * out.utd4.cr), "off-policy SAC (4 updates a move) reaches 75% in under two-thirds of the lessons REINFORCE needs");
  ok(out.utd4.S.curve[199] > out.rf.S.curve[199] + 0.15, "after 200 lessons SAC's exam is at least 15 points above REINFORCE's");
  ok(out.utd4.S.curve[199] > out.utd1.S.curve[199], "4 updates a move beats 1 after 200 lessons");
  console.log("  REINFORCE learning-rate sweep (600 lessons, mean final exam): " + [3, 10, 30].map(function (lr) { return "lr " + lr + ": " + pc(DC.summarize(DC.runFleet({ task: "box", learner: "reinforce", lrRF: lr, episodes: 600 })).pass); }).join(" · ") + " (the page uses lr 10)");
})();

/* ---------------- step 2 ---------------- */
head("Step 2 · The soft critic");
(function () {
  // a worked Bellman target from a real logbook: SAC on the box after 60 lessons, seed 2
  var run = DC.train(Object.assign({}, DC.FLEETS.s2.auto, { seed: 2, episodes: 60, keepBuffer: true })), ag = run.agent, buf = run.onlineBuf;
  console.log("  after 60 lessons: " + buf.length + " moves in the logbook, " + run.updates + " gradient steps, α = " + f(Math.exp(ag.la), 3));
  var picks = DC.bellmanPicks(run);
  picks.forEach(function (pk) {
    var t = pk.tr, y = DC.target(ag, t);
    console.log("  page '" + pk.name + "': (" + DC.sx(t.s) + "," + DC.sy(t.s) + ") h" + DC.sh(t.s) + " → move " + t.a + ", r = " + t.r + ", done = " + t.done + " · Q = " + f(ag.Q[t.s * 3 + t.a], 3) + " · y = " + f(y, 3) + (t.done ? "" : " · V̄(s') = " + f(DC.softV(ag, t.s2, true), 3)));
  });
  var F = DC.FLEETS.s2;
  ["hot", "auto", "cool", "off", "tau1", "tau05"].forEach(function (k) {
    var runs = fleet("s2" + k, F[k]), S = DC.summarize(runs, 0.75), cr = DC.crossing(S.curve, 0.75);
    console.log("  " + k + ": final exam " + pc(S.pass) + " · reaches 75% at lesson " + (cr || "–") + " · final α " + f(S.alpha, 3) + " · after 300 lessons the lessons average " + f(runs.reduce(function (s, r) { return s + r.ep.slice(-20).reduce(function (a, e) { return a + e.steps; }, 0) / 20; }, 0) / runs.length, 1) + " moves");
  });
  var hot = DC.summarize(CACHE.s2hot), auto = DC.summarize(CACHE.s2auto);
  ok(hot.pass < 0.4 && auto.pass > 0.7, "a temperature stuck at 1 keeps the student dithering (exam under 40%); tuned from the same start, over 70%");
  // the soft optimum: π ∝ exp(Q/α) at three temperatures, for the Q values of a fixed example
  var q = [0.62, 0.70, 0.55];
  [1, 0.1, 0.01].forEach(function (al) { var z = q.map(function (v) { return Math.exp(v / al); }), sm = z.reduce(function (a, b) { return a + b; }); console.log("  Q = (0.62, 0.70, 0.55), α = " + al + ": π ∝ exp(Q/α) = (" + z.map(function (v) { return f(v / sm, 2); }).join(", ") + "), entropy " + f(DC.entropy(z.map(function (v) { return v / sm; })), 2) + " nats (max ln 3 = 1.10)"); });
})();

/* ---------------- step 3 ---------------- */
head("Step 3 · The examiner (logistic regression on a 5 × 4 dashcam photo)");
(function () {
  var c0 = DC.examiner(0), c1 = DC.examiner(30), test = DC.examinerData(8, {});
  var d0 = c0.data;
  console.log("  training photos: " + d0.X.length + " (" + c0.npos + " parked in the exam bay, " + (d0.X.length - c0.npos) + " from 10 instructor drives) · loss " + f(c0.loss, 3));
  [0.5, 0.9, 0.99, 0.999].forEach(function (thr) {
    var m = DC.metrics(c0, test.X, test.Y, thr), v = DC.verdict(c0, DC.EXAM_S, thr), st = DC.verdict(c0, DC.STAFF_S, thr);
    console.log("  threshold " + thr + ": test set (" + m.n + " photos) accuracy " + pc(m.acc, 1) + ", precision " + pc(m.precision, 1) + ", recall " + pc(m.recall, 1) + " · exam bay passed " + pc(v.pass) + " · staff bay passed " + pc(st.pass));
  });
  console.log("  her mean score: exam bay " + f(DC.verdict(c0, DC.EXAM_S, 0.5).mean, 3) + " · staff bay " + f(DC.verdict(c0, DC.STAFF_S, 0.5).mean, 3) + " · exam bay crooked " + f(DC.verdict(c0, DC.sid(8, 0, 1), 0.5).mean, 3));
  ok(DC.metrics(c0, test.X, test.Y, 0.5).acc > 0.95, "the examiner scores over 95% on a fresh test set collected the same way");
  ok(DC.verdict(c0, DC.STAFF_S, 0.5).pass > 0.9, "…and passes a straight park in a staff bay over 90% of the time");
  ok(DC.verdict(c0, DC.STAFF_S, 0.5).mean >= DC.verdict(c0, DC.EXAM_S, 0.5).mean - 0.01, "…scoring the staff bay about as high as the exam bay, so no threshold separates them cleanly");
  var fpPoses = function (c) { var n = 0; for (var s = 0; s < DC.NS; s++) { var ch = DC.cell(DC.sx(s), DC.sy(s)); if ((ch === "." || ch === "S" || ch === "E") && s !== DC.EXAM_S && DC.verdict(c, s, 0.5, 5).pass > 0.02) n++; } return n; };
  var n0 = fpPoses(c0), n1 = fpPoses(c1);
  console.log("  poses (other than the exam bay) she passes more than 2% of the time: " + n0 + " before, " + n1 + " after 30 extra negatives (" + c1.n + " photos) · exam bay still passed " + pc(DC.verdict(c1, DC.EXAM_S, 0.5).pass) + " · staff bay " + pc(DC.verdict(c1, DC.STAFF_S, 0.5).pass) + " (mean score " + f(DC.verdict(c1, DC.STAFF_S, 0.5).mean, 3) + ")");
  ok(n0 === 2 && n1 === 0, "her only false passes are the two staff bays, and 30 photos of them fix it");
  ["human", "naive", "thr99", "thr999", "more", "fixed"].forEach(function (k) { console.log(line(k + ":", fleet("s3" + k, DC.s3fleet(k)))); });
  var nv = DC.summarize(CACHE.s3naive), fx = DC.summarize(CACHE.s3fixed);
  ok(nv.staff > 0.2 && nv.examiner > nv.pass + 0.2, "trained on the naive examiner, the student parks in staff bays and she says it passed");
  ok(fx.staff < 0.02 && Math.abs(fx.examiner - fx.pass) < 0.05, "with 30 extra negatives the exploit is gone and her verdict matches the truth");
})();

/* ---------------- step 4 ---------------- */
head("Step 4 · The instructor's drives (RLPD: half of every batch from the demo logbook)");
(function () {
  var F = DC.FLEETS.s4, S = {};
  ["d0", "d5", "d10", "d20", "d30", "pour"].forEach(function (k) { var runs = fleet("s4" + k, F[k]); S[k] = DC.summarize(runs); console.log(line(k + ":", runs) + " · first lesson parked (median) " + DC.firstPassMedian(runs)); });
  ok(S.d0.reached === 0, "with no demonstrations no run reaches 80% in 250 lessons");
  ok(S.d30.reached > S.d5.reached, "more demonstrations, more runs reach 80%");
  var r = CACHE.s4d20[0], r2 = CACHE.s4pour[0];
  console.log("  the 20 demo drives hold " + r.demoN + " moves");
  console.log("  share of each batch from the demos after 50 / 250 lessons: 50/50 sampling " + pc(0.5) + " / " + pc(0.5) + " · poured into one logbook " + pc(DC.demoShare(r2, 50)) + " / " + pc(DC.demoShare(r2, 250)));
})();

/* ---------------- step 5 ---------------- */
head("Step 5 · Dual controls (interventions; 20 demos; 150 lessons)");
(function () {
  var F = DC.FLEETS.s5, S = {};
  ["none", "rare", "half", "short", "long", "backseat", "alone"].forEach(function (k) {
    var runs = fleet("s5" + k, F[k]); S[k] = DC.summarize(runs);
    console.log(line(k + ":", runs) + " · intervention rate, lessons 1–20 / 21–40 / 61–80 / 131–150: " + [[0, 20], [20, 40], [60, 80], [130, 150]].map(function (w) { return pc(DC.rateIn(runs, w[0], w[1])); }).join(" / "));
  });
  ok(DC.crossing(S.short.curve, 0.8) < DC.crossing(S.none.curve, 0.8) || DC.crossing(S.none.curve, 0.8) == null, "short corrections reach 80% sooner than no corrections");
  ok(DC.rateIn(CACHE.s5short, 130, 150) < 0.05 && DC.rateIn(CACHE.s5short, 0, 20) > 0.2, "with short corrections the intervention rate falls from over 20% to under 5%");
  ok(DC.rateIn(CACHE.s5backseat, 130, 150) > 0.2, "the backseat driver's intervention rate is still over 20% at the end");
  ok(S.backseat.humanMin > 2 * S.short.humanMin, "the backseat driver spends over twice the instructor-minutes");
  ok(DC.crossing(S.rare.curve, 0.8) > DC.crossing(S.short.curve, 0.8), "catching a fifth of the mistakes is slower than catching all of them");
  var ex = DC.train(Object.assign({}, F.short, { seed: 3, episodes: 8, record: true })), e0 = ex.ep[0];
  console.log("  lesson 1 of seed 3, short corrections: " + e0.steps + " moves, " + e0.itv + " by the instructor");
})();

/* ---------------- step 6 ---------------- */
head("Step 6 · The real lot (the fence, resets and the clock; 20 demos, no instructor, 250 lessons)");
(function () {
  var F = DC.FLEETS.s6, a = fleet("s6fence0", F.fence0), b = fleet("s6fence1", F.fence1), A = DC.summarize(a), B = DC.summarize(b);
  console.log(line("no fence:", a) + " · bumps " + f(A.bumps, 0));
  console.log(line("fence:", b) + " · bumps " + f(B.bumps, 0));
  ok(B.crashes < 0.6 * A.crashes, "the fence turns over 40% of the crashes into bumps");
  ok(B.wallMin < A.wallMin, "with the fence the same 250 lessons take fewer lot-minutes");
  [5, 10, 30, 60].forEach(function (rs) { var runs = DC.runFleet(Object.assign({}, F.fence1, { resetS: rs, crashResetS: Math.max(rs, 45) })); var S = DC.summarize(runs), cr = DC.crossing(S.curve, 0.8); console.log("  reset " + rs + " s: reaches 80% at lesson " + (cr || "–") + (cr ? " = " + f(S.mins[cr - 1], 0) + " lot-min" : "") + " · 250 lessons = " + f(S.wallMin, 0) + " lot-min"); });
  var c = DC.crossing(DC.summarize(CACHE.s5short).curve, 0.8);
  console.log("  everything on (20 demos, short corrections, the examiner judged by eye): 80% at lesson " + c + " = " + f(DC.summarize(CACHE.s5short).mins[c - 1], 0) + " lot-min");
})();

/* ---------------- review board ---------------- */
head("Review board (each fix re-run on 8 seeds)");
(function () {
  DC.CASES.forEach(function (cs) {
    console.log("  " + cs.title);
    var br = DC.runFleet(cs.broken);
    console.log("    as configured: " + cs.describe(DC.summarize(br), br));
    cs.fixes.forEach(function (fx) {
      var runs = DC.runFleet(fx.cfg), S = DC.summarize(runs), res = cs.checks.map(function (k) { return k.test(S, runs); }), pass = res.every(function (x) { return x; });
      console.log("    " + (fx.right ? "[right] " : "[wrong] ") + fx.label + ": " + cs.describe(S, runs) + " → " + (pass ? "passes" : "fails"));
      ok(pass === !!fx.right, "    " + (fx.right ? "the right fix passes" : "the tempting fix fails") + ": " + fx.label);
    });
  });
})();

/* ---------------- field test ---------------- */
head("Field test answers (each recomputed)");
(function () {
  var s1 = function (k, lv) { return DC.summarize(CACHE["s1" + k], lv); };
  var run2 = DC.train(Object.assign({}, DC.FLEETS.s2.auto, { seed: 2, episodes: 60, keepBuffer: true })), pk = DC.bellmanPicks(run2).filter(function (p) { return p.name === "one move short"; })[0];
  var q = [0.62, 0.70, 0.55], z = q.map(function (v) { return Math.exp(v / 0.1); }), sm = z.reduce(function (a, b) { return a + b; });
  var test = DC.examinerData(8, {}), F6 = DC.summarize(DC.runFleet(Object.assign({}, DC.FLEETS.s6.fence1, { resetS: 30, crashResetS: 45 })));
  var got = [
    DC.randomLessons(2000, 11).success,
    DC.crossing(s1("utd4", 0.75).curve, 0.75),
    100 * s1("rf").curve[199],
    DC.target(run2.agent, pk.tr),
    100 * z[1] / sm,
    100 * DC.metrics(DC.examiner(0), test.X, test.Y, 0.999).recall,
    100 * DC.summarize(CACHE.s3naive).staff,
    DC.firstPassMedian(CACHE.s4d20),
    DC.summarize(CACHE.s5short).humanMin,
    F6.mins[DC.crossing(F6.curve, 0.8) - 1]
  ];
  DC.FIELD.forEach(function (fq, i) { console.log("  " + (i + 1) + ". " + fq.q + " → " + fq.ans + " (computed " + f(got[i], 3) + ")"); ok(Math.abs(got[i] - fq.ans) <= fq.tol + 1e-9, "    answer " + (i + 1) + " matches the widget"); });
})();

console.log("\n" + (fails ? fails + " check(s) FAILED" : "all checks passed") + " · " + f((Date.now() - t0) / 1000, 1) + " s");
process.exit(fails ? 1 : 0);

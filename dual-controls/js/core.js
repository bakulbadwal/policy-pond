/* Dual Controls — the core. Every number on the page comes from here: a seeded toy driving-school lot, a learned
   success classifier (the examiner), and the real algorithms run on it: SAC for discrete actions with a table for a
   critic (Haarnoja et al. 2018; Christodoulou 2019), RLPD's symmetric sampling (Ball et al. 2023), HIL-SERL's
   intervention buffering (Luo et al. 2024), and REINFORCE as the on-policy baseline. Works in the browser
   (window.DC) and in node (module.exports). Nothing here touches the DOM. */
(function (root) {
  "use strict";
  var DC = {};

  /* ---------------- seeded randomness ---------------- */
  function rng(seed) {
    var s = (seed >>> 0) || 1;
    function r() { s = (s + 0x6D2B79F5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    r.normal = function () { var u = r() || 1e-12, v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    r.int = function (n) { return Math.floor(r() * n); };
    return r;
  }
  DC.rng = rng;

  /* ---------------- the lot ----------------
     12 × 8 squares, one car length each; y = 0 is the top row (the bays), y grows down the page. The car is a pose
     (x, y, heading), with 8 headings 45° apart: 0 = east, 2 = north (up the page), 4 = west, 6 = south. Every move it
     turns (left, straight, right: −45°, 0, +45° … left is anticlockwise) and rolls one square forward. One move is
     about one second of lot time. */
  var W = 12, H = 8, NH = 8, NA = 3, NS = W * H * NH;
  var DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, -1, -1, -1, 0, 1, 1, 1];
  var TURN = [1, 0, -1];   // action 0 = steer left, 1 = straight, 2 = steer right
  // F flowerbed · P parked car · S the staff bay (empty) · E the exam bay (empty) · C a cone · . asphalt
  var MAP = [
    "FFFSSPPPEPFF",
    "............",
    "............",
    "............",
    ".....CCC....",
    "............",
    "............",
    "............"
  ];
  var BAYS = { staff: [3, 4], exam: { x: 8, n: 6 } };   // the seven bays are x = 3 … 9, numbered 1 … 7; bays 1 and 2 are the staff bays
  var BOX = { x0: 9, x1: 11, y0: 4, y1: 6 };                   // step 1's practice box
  var STARTS = [], EXAM_STARTS = [];   // filled in once the instructor's distances exist (below)
  function sid(x, y, h) { return (y * W + x) * NH + h; }
  function sx(s) { return Math.floor(s / NH) % W; }
  function sy(s) { return Math.floor(s / NH / W); }
  function sh(s) { return s % NH; }
  function cell(x, y) { return MAP[y].charAt(x); }
  DC.W = W; DC.H = H; DC.NH = NH; DC.NA = NA; DC.NS = NS; DC.DX = DX; DC.DY = DY; DC.MAP = MAP; DC.BAYS = BAYS; DC.BOX = BOX; DC.STARTS = STARTS;
  DC.sid = sid; DC.sx = sx; DC.sy = sy; DC.sh = sh; DC.cell = cell;
  DC.STEP_S = 1;            // seconds of lot time per move
  DC.T = 30;                // a lesson is cut off after 30 moves

  // One move. bounds = the workspace fence (step 6): a move that would leave the lot is clipped, the car stays put.
  function move(s, a, task, bounds) {
    var x = sx(s), y = sy(s), h = (sh(s) + TURN[a] + 8) % 8, nx = x + DX[h], ny = y + DY[h];
    var out = { s2: -1, crash: false, bay: 0, success: false, bumped: false, h: h, x: nx, y: ny };
    if (nx < 0 || nx >= W || ny < 0 || ny >= H) {
      if (bounds) { out.s2 = sid(x, y, h); out.bumped = true; out.x = x; out.y = y; return out; }
      out.crash = true; return out;
    }
    var c = cell(nx, ny);
    if (c === "F" || c === "P" || c === "C") { out.crash = true; return out; }
    out.s2 = sid(nx, ny, h);
    if (c === "S" || c === "E") out.bay = nx - 2;
    if (task === "box") out.success = nx >= BOX.x0 && nx <= BOX.x1 && ny >= BOX.y0 && ny <= BOX.y1;
    else out.success = c === "E" && h === 2;
    return out;
  }
  DC.move = move;

  /* ---------------- the instructor ----------------
     She knows the lot: D[s] is the fewest moves from s to a straight park in the exam bay (Infinity if it can't be
     done without hitting something). Her driving picks a shortest move, except that some of the time (DC.WOBBLE) a human
     instructor takes a safe detour. */
  var DIST = {};
  function dist(task) {
    if (DIST[task]) return DIST[task];
    var D = new Float64Array(NS).fill(Infinity), changed = true;
    while (changed) {
      changed = false;
      for (var s = 0; s < NS; s++) {
        var c = cell(sx(s), sy(s)); if (c !== ".") continue;
        var best = D[s];
        for (var a = 0; a < NA; a++) {
          var m = move(s, a, task, false), v = m.success ? 1 : (m.crash || m.bay) ? Infinity : 1 + D[m.s2];
          if (v < best) best = v;
        }
        if (best < D[s]) { D[s] = best; changed = true; }
      }
    }
    DIST[task] = D; return D;
  }
  DC.dist = dist;
  function goodActions(s, task) {
    var D = dist(task), out = [];
    for (var a = 0; a < NA; a++) { var m = move(s, a, task, false); if (m.success || (!m.crash && !m.bay && D[m.s2] === D[s] - 1)) out.push(a); }
    return out;
  }
  function safeActions(s, task) {
    var D = dist(task), out = [];
    for (var a = 0; a < NA; a++) { var m = move(s, a, task, false); if (m.success || (!m.crash && !m.bay && D[m.s2] < Infinity)) out.push(a); }
    return out;
  }
  DC.goodActions = goodActions; DC.safeActions = safeActions;
  // Lessons start anywhere in the bottom three rows, pointing any way from which the exam bay can still be reached,
  // at least 6 moves away. The exam uses a fixed 24 of them, spread evenly.
  (function () {
    var Dp = dist("park"), Db = dist("box");
    for (var y = 5; y < H; y++) for (var x = 0; x < W; x++) for (var h = 0; h < NH; h++) {
      var s = sid(x, y, h); if (cell(x, y) === "." && Dp[s] >= 6 && Dp[s] < Infinity && Db[s] >= 4 && Db[s] < Infinity) STARTS.push([x, y, h]);
    }
    var step = STARTS.length / 24;
    for (var k = 0; k < 24; k++) EXAM_STARTS.push(STARTS[Math.floor(k * step + step / 2)]);
  })();
  DC.EXAM_STARTS = EXAM_STARTS;
  function instructorAction(s, task, r, wobble) {
    var g = goodActions(s, task);
    if (wobble && r() < wobble) { var D = dist(task), sa = safeActions(s, task).filter(function (a) { var m = move(s, a, task, false); return g.indexOf(a) < 0 && !m.success && D[m.s2] <= D[s] + 1; }); if (sa.length) return sa[r.int(sa.length)]; }
    if (g.indexOf(1) >= 0) return 1;
    return g.length ? g[0] : 1;
  }
  DC.instructorAction = instructorAction;
  DC.WOBBLE = 0.3;

  /* ---------------- the dashcam photo ----------------
     The examiner never watches the drive. She gets a 5 × 4 greyscale photo from a camera on the bonnet: 20 pixels
     sampled in front of the car (0.25 to 1.3 car lengths ahead, ±0.5 to either side), with pixel noise and a lighting
     shift. Bay lines are white, the kerb is pale, every bay has a sign on the kerb; the exam bay's sign is a shade
     darker than the staff bay's, and that's the only difference between their photos. */
  var FWD = [0.25, 0.6, 0.95, 1.3], LAT = [-0.5, -0.25, 0, 0.25, 0.5], NPX = 20;
  var SIGN = { 1: 0.15, 2: 0.15, 3: 0.58, 4: 0.40, 5: 0.52, 6: -1, 7: 0.55 };   // −1: the exam bay's chequered sign
  function look(px, py) {
    if (px < 0 || px >= W || py >= H) return 0.2;                        // the hedge round the lot
    if (py < 0) {                                                         // beyond the top kerb
      var bx = Math.floor(px);
      if (bx >= 3 && bx <= 9 && py <= -0.2 && py >= -0.95 && px - bx >= 0.15 && px - bx <= 0.85) {
        var sg = SIGN[bx - 2]; if (sg >= 0) return sg;
        var u = Math.min(2, Math.floor((px - bx - 0.15) / 0.7 * 3)), v = Math.min(1, Math.floor((py + 0.95) / 0.75 * 2));
        return (u + v) % 2 ? 0.75 : 0.2;   // same average shade as the staff signs, different pattern
      }
      return 0.9;
    }
    var cx = Math.floor(px), cy = Math.floor(py), c = cell(cx, cy);
    if (cy === 0 && px >= 3 - 0.07 && px <= 10 + 0.07 && Math.abs(px - Math.round(px)) < 0.07) return 1.0;   // bay lines
    if (c === "P") return 0.15;
    if (c === "F") return 0.45;
    if (c === "C") { var dx = px - cx - 0.5, dy = py - cy - 0.5; return dx * dx + dy * dy < 0.09 ? 0.75 : 0.3; }
    return 0.3;
  }
  function photo(s, r, h) {
    var x = sx(s) + 0.5, y = sy(s) + 0.5, hd = h == null ? sh(s) : h, th = hd * Math.PI / 4, fx = Math.cos(th), fy = -Math.sin(th), lx = -Math.sin(th), ly = -Math.cos(th);
    var out = new Float64Array(NPX), light = r ? 0.05 * r.normal() : 0;
    for (var i = 0; i < FWD.length; i++) for (var j = 0; j < LAT.length; j++) {
      var v = look(x + FWD[i] * fx + LAT[j] * lx, y + FWD[i] * fy + LAT[j] * ly);
      out[(FWD.length - 1 - i) * LAT.length + j] = v + light + (r ? 0.05 * r.normal() : 0);
    }
    return out;   // row 0 is the far row (top of the photo)
  }
  DC.photo = photo; DC.NPX = NPX; DC.PHOTO_W = 5; DC.PHOTO_H = 4;

  /* ---------------- the examiner: logistic regression on the photo ---------------- */
  function sigmoid(z) { return z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)); }
  DC.sigmoid = sigmoid;
  function clfProb(c, x) { var z = c.b; for (var i = 0; i < NPX; i++) z += c.w[i] * x[i]; return sigmoid(z); }
  DC.clfProb = clfProb;
  // mean log loss + (λ/2)|w|², and its exact gradient
  function clfLoss(c, X, Y, lam) {
    var L = 0, gw = new Float64Array(NPX), gb = 0, n = X.length;
    for (var k = 0; k < n; k++) {
      var p = clfProb(c, X[k]), y = Y[k];
      L -= (y ? Math.log(Math.max(p, 1e-300)) : Math.log(Math.max(1 - p, 1e-300))) / n;
      var d = (p - y) / n; gb += d; for (var i = 0; i < NPX; i++) gw[i] += d * X[k][i];
    }
    for (i = 0; i < NPX; i++) { L += lam / 2 * c.w[i] * c.w[i]; gw[i] += lam * c.w[i]; }
    return { loss: L, gw: gw, gb: gb };
  }
  DC.clfLoss = clfLoss;
  function trainClassifier(X, Y, o) {
    o = o || {};
    var c = { w: new Float64Array(NPX), b: 0 }, lr = o.lr || 2, iters = o.iters || 3000, lam = o.lam == null ? 1e-4 : o.lam;
    for (var it = 0; it < iters; it++) { var g = clfLoss(c, X, Y, lam); for (var i = 0; i < NPX; i++) c.w[i] -= lr * g.gw[i]; c.b -= lr * g.gb; }
    c.loss = clfLoss(c, X, Y, lam).loss; c.n = X.length; c.npos = Y.filter(function (y) { return y; }).length;
    return c;
  }
  DC.trainClassifier = trainClassifier;

  // The examiner's training photos, collected the HIL-SERL way: drive the task by hand a few times; frames in the
  // exam bay are positives, every other frame is a negative. Extra negatives are photos of her false passes.
  function demoDrives(n, seed, task) {
    var r = rng(seed), out = [];
    for (var k = 0; k < n; k++) {
      var st = STARTS[r.int(STARTS.length)], s = sid(st[0], st[1], st[2]), traj = [];
      for (var t = 0; t < 60; t++) {
        var a = instructorAction(s, task || "park", r, DC.WOBBLE), m = move(s, a, task || "park", false);
        traj.push({ s: s, a: a, r: m.success ? 1 : 0, s2: m.s2, done: m.success || m.crash || !!m.bay, success: m.success, crash: m.crash, bay: m.bay });
        if (m.success || m.crash || m.bay) break;
        s = m.s2;
      }
      out.push(traj);
    }
    return out;
  }
  DC.demoDrives = demoDrives;
  var EXAM_S = sid(BAYS.exam.x, 0, 2), STAFF_S = sid(BAYS.staff[0], 0, 2);
  DC.EXAM_S = EXAM_S; DC.STAFF_S = STAFF_S;
  function examinerData(seed, o) {
    o = o || {};
    var r = rng(seed), X = [], Y = [], tag = [], drives = demoDrives(o.drives || 10, seed + 1);
    function add(s, y, t, h) { X.push(photo(s, r, h)); Y.push(y); tag.push(t); }
    for (var k = 0; k < (o.pos || 40); k++) add(EXAM_S, 1, "exam bay, straight");
    drives.forEach(function (tr) { tr.forEach(function (st) { add(st.s, 0, "on the way"); }); });
    if (o.extra) {   // photos of her false passes, taken in turn at each of these poses
      var poses = [];
      BAYS.staff.forEach(function (bx) { poses.push([bx, 2, "staff bay, straight"]); poses.push([bx, 2, "staff bay, straight"]); poses.push([bx, 1, "staff bay, crooked"]); poses.push([bx, 3, "staff bay, crooked"]); });
      poses.push([BAYS.exam.x, 1, "exam bay, crooked"]); poses.push([BAYS.exam.x, 3, "exam bay, crooked"]);
      for (k = 0; k < o.extra; k++) { var ps = poses[k % poses.length]; add(sid(ps[0], 0, ps[1]), 0, ps[2]); }
    }
    return { X: X, Y: Y, tag: tag };
  }
  DC.examinerData = examinerData;
  function metrics(c, X, Y, thr) {
    var tp = 0, fp = 0, tn = 0, fn = 0;
    for (var k = 0; k < X.length; k++) { var p = clfProb(c, X[k]) >= thr; if (p && Y[k]) tp++; else if (p) fp++; else if (Y[k]) fn++; else tn++; }
    return { tp: tp, fp: fp, tn: tn, fn: fn, acc: (tp + tn) / X.length, precision: tp + fp ? tp / (tp + fp) : 1, recall: tp + fn ? tp / (tp + fn) : 1, n: X.length };
  }
  DC.metrics = metrics;
  // The examiner most of the page uses: 40 positives, 10 drives of negatives (seed 7), with or without extra negatives.
  var EXAMINERS = {};
  function examiner(extra) {
    var key = extra || 0;
    if (!EXAMINERS[key]) { var d = examinerData(7, { extra: extra || 0 }); EXAMINERS[key] = trainClassifier(d.X, d.Y); EXAMINERS[key].data = d; }
    return EXAMINERS[key];
  }
  DC.examiner = examiner;
  // Her average verdict on a pose, over 200 photos (for the page's tables): the mean probability and the share ≥ threshold.
  function verdict(c, s, thr, seed, h) {
    var r = rng(seed || 99), sum = 0, pass = 0, n = 200;
    for (var k = 0; k < n; k++) { var p = clfProb(c, photo(s, r, h)); sum += p; if (p >= thr) pass++; }
    return { mean: sum / n, pass: pass / n };
  }
  DC.verdict = verdict;

  /* ---------------- the student: SAC for discrete actions, with tables ----------------
     Critic: Q[s][a]. Target critic: a slow copy, Q̄ ← τQ + (1 − τ)Q̄ after every gradient step (computed lazily, exactly).
     Actor: logits ℓ[s][a], π = softmax(ℓ). Temperature α = exp(log α), tuned to a target entropy H̄.
     The three losses are SAC-Discrete's (Christodoulou 2019, eqs. 10–12):
       y = r + γ(1 − done) · Σ_a' π(a'|s')[Q̄(s',a') − α log π(a'|s')]
       J_Q = ½(Q(s,a) − y)²                J_π = Σ_a π(a|s)[α log π(a|s) − Q(s,a)]          J(α) = Σ_a π(a|s)[−α(log π(a|s) + H̄)] */
  function newAgent(o) {
    var n = NS * NA;
    return { Q: new Float64Array(n), QT: new Float64Array(n), stamp: new Float64Array(n), L: new Float64Array(n), Lm: new Float64Array(n), Lv: new Float64Array(n), Lt: new Float64Array(NS), la: Math.log(o.alpha0), am: 0, av: 0, at: 0, U: 0, tau: o.tau, gamma: o.gamma };
  }
  DC.newAgent = function (o) { return newAgent(Object.assign({ alpha0: 0.01, tau: 0.005, gamma: 0.95 }, o || {})); };
  function qbar(ag, e) { var k = ag.U - ag.stamp[e]; return k === 0 ? ag.QT[e] : ag.Q[e] + Math.pow(1 - ag.tau, k) * (ag.QT[e] - ag.Q[e]); }
  DC.qbar = qbar;
  function setQ(ag, e, v) { ag.QT[e] = qbar(ag, e); ag.stamp[e] = ag.U; ag.Q[e] = v; }
  function policy(ag, s, out) {
    out = out || new Float64Array(NA);
    var b = s * NA, m = Math.max(ag.L[b], ag.L[b + 1], ag.L[b + 2]), z = 0;
    for (var a = 0; a < NA; a++) { out[a] = Math.exp(ag.L[b + a] - m); z += out[a]; }
    for (a = 0; a < NA; a++) out[a] /= z;
    return out;
  }
  DC.policy = policy;
  function entropy(p) { var h = 0; for (var a = 0; a < p.length; a++) if (p[a] > 0) h -= p[a] * Math.log(p[a]); return h; }
  DC.entropy = entropy;
  var PB = new Float64Array(NA);
  // the soft value of s' under the target critic, and the Bellman target for one transition
  function softV(ag, s, useTarget) {
    var p = policy(ag, s, PB), al = Math.exp(ag.la), v = 0, b = s * NA;
    for (var a = 0; a < NA; a++) v += p[a] * ((useTarget ? qbar(ag, b + a) : ag.Q[b + a]) - al * Math.log(Math.max(p[a], 1e-300)));
    return v;
  }
  DC.softV = softV;
  function target(ag, tr) { return tr.r + (tr.done ? 0 : ag.gamma * softV(ag, tr.s2, true)); }
  DC.target = target;
  // the actor loss at one state and its exact gradient with respect to the logits
  function actorLoss(ag, s, L) {
    var b = s * NA, m = Math.max(L[b], L[b + 1], L[b + 2]), p = [0, 0, 0], z = 0, al = Math.exp(ag.la), J = 0, g = [0, 0, 0], mean = 0;
    for (var a = 0; a < NA; a++) { p[a] = Math.exp(L[b + a] - m); z += p[a]; }
    var u = [0, 0, 0];
    for (a = 0; a < NA; a++) { p[a] /= z; u[a] = al * Math.log(Math.max(p[a], 1e-300)) - ag.Q[b + a]; J += p[a] * u[a]; }
    for (a = 0; a < NA; a++) mean += p[a] * u[a];
    for (a = 0; a < NA; a++) g[a] = p[a] * (u[a] - mean);
    return { J: J, g: g, p: p };
  }
  DC.actorLoss = actorLoss;
  // the temperature loss averaged over a batch of states, and its gradient with respect to log α
  function alphaLoss(ag, states, Hbar, la) {
    var al = Math.exp(la == null ? ag.la : la), J = 0, gH = 0, p = new Float64Array(NA);
    states.forEach(function (s) { policy(ag, s, p); var Hs = entropy(p); J += al * (Hs - Hbar) / states.length; gH += (Hs - Hbar) / states.length; });
    return { J: J, g: al * gH };
  }
  DC.alphaLoss = alphaLoss;

  // One gradient step of SAC-Discrete on a batch (critic, then actor, then temperature, then the target copy).
  // One gradient step of SAC-Discrete on a batch: critic, then actor, then temperature, then the target copy.
  // (updateRef below is the same step written with the loss functions above; tests/check.js checks they agree.)
  var YS = new Float64Array(1024), GA = new Float64Array(NA), PA = new Float64Array(NA);
  function update(ag, batch, o) {
    var n = batch.length, i, a, Q = ag.Q, L = ag.L, al = Math.exp(ag.la);
    for (i = 0; i < n; i++) { var tr = batch[i]; YS[i] = tr.done ? tr.r : tr.r + ag.gamma * softV(ag, tr.s2, true); }
    for (i = 0; i < n; i++) { var e = batch[i].s * NA + batch[i].a; setQ(ag, e, Q[e] + o.lrQ * (YS[i] - Q[e])); }
    for (i = 0; i < n; i++) {   // Adam on the logits of each state in the batch
      var s0 = batch[i].s, b = s0 * NA, m = Math.max(L[b], L[b + 1], L[b + 2]), z = 0, mean = 0;
      for (a = 0; a < NA; a++) { PA[a] = Math.exp(L[b + a] - m); z += PA[a]; }
      for (a = 0; a < NA; a++) { PA[a] /= z; GA[a] = al * Math.log(Math.max(PA[a], 1e-300)) - Q[b + a]; mean += PA[a] * GA[a]; }
      var tt = ++ag.Lt[s0], c1 = 1 - Math.pow(0.9, tt), c2 = 1 - Math.pow(0.999, tt);
      for (a = 0; a < NA; a++) { var gg = PA[a] * (GA[a] - mean); ag.Lm[b + a] = 0.9 * ag.Lm[b + a] + 0.1 * gg; ag.Lv[b + a] = 0.999 * ag.Lv[b + a] + 0.001 * gg * gg; L[b + a] -= o.lrPi * (ag.Lm[b + a] / c1) / (Math.sqrt(ag.Lv[b + a] / c2) + 1e-8); }
    }
    if (o.autoAlpha) {   // Adam on log α, as SAC's and LeRobot's implementations do
      var gH = 0;
      for (i = 0; i < n; i++) { policy(ag, batch[i].s, PA); gH += (entropy(PA) - o.Hbar) / n; }
      var g = al * gH;
      ag.at++; ag.am = 0.9 * ag.am + 0.1 * g; ag.av = 0.999 * ag.av + 0.001 * g * g;
      var mh = ag.am / (1 - Math.pow(0.9, ag.at)), vh = ag.av / (1 - Math.pow(0.999, ag.at));
      ag.la = Math.max(Math.log(1e-4), Math.min(Math.log(10), ag.la - o.lrA * mh / (Math.sqrt(vh) + 1e-8)));
    }
    ag.U++;
  }
  function updateRef(ag, batch, o) {
    var ys = batch.map(function (tr) { return target(ag, tr); }), i, tr;
    for (i = 0; i < batch.length; i++) { tr = batch[i]; var e = tr.s * NA + tr.a; setQ(ag, e, ag.Q[e] + o.lrQ * (ys[i] - ag.Q[e])); }
    for (i = 0; i < batch.length; i++) {   // Adam on the logits of each state in the batch
      var s0 = batch[i].s, al = actorLoss(ag, s0, ag.L), b = s0 * NA, tt = ++ag.Lt[s0], c1 = 1 - Math.pow(0.9, tt), c2 = 1 - Math.pow(0.999, tt);
      for (var a = 0; a < NA; a++) { var gg = al.g[a]; ag.Lm[b + a] = 0.9 * ag.Lm[b + a] + 0.1 * gg; ag.Lv[b + a] = 0.999 * ag.Lv[b + a] + 0.001 * gg * gg; ag.L[b + a] -= o.lrPi * (ag.Lm[b + a] / c1) / (Math.sqrt(ag.Lv[b + a] / c2) + 1e-8); }
    }
    if (o.autoAlpha) {   // Adam on log α, as SAC's and LeRobot's implementations do
      var g = alphaLoss(ag, batch.map(function (t) { return t.s; }), o.Hbar).g;
      ag.at++; ag.am = 0.9 * ag.am + 0.1 * g; ag.av = 0.999 * ag.av + 0.001 * g * g;
      var mh = ag.am / (1 - Math.pow(0.9, ag.at)), vh = ag.av / (1 - Math.pow(0.999, ag.at));
      ag.la = Math.max(Math.log(1e-4), Math.min(Math.log(10), ag.la - o.lrA * mh / (Math.sqrt(vh) + 1e-8)));
    }
    ag.U++;
    return ys;
  }
  DC.updateRef = updateRef;
  DC.update = update;
  function greedy(ag, s) { var b = s * NA, best = 1; for (var a = 0; a < NA; a++) if (ag.L[b + a] > ag.L[b + best] + 1e-12) best = a; return best; }
  DC.greedy = greedy;
  function sample(p, r) { var u = r(), c = 0; for (var a = 0; a < NA; a++) { c += p[a]; if (u < c) return a; } return NA - 1; }

  /* ---------------- the exam: the student alone, best guess at every move, from 24 fixed starts ---------------- */
  function exam(ag, o) {
    var task = o.task || "park", passes = 0, examiner_ = 0, staff = 0, steps = 0, r = rng(4242);
    for (var k = 0; k < EXAM_STARTS.length; k++) {
      var st = EXAM_STARTS[k], s = sid(st[0], st[1], st[2]);
      for (var t = 0; t < DC.T; t++) {
        var a = o.policyFn ? o.policyFn(s) : greedy(ag, s), m = move(s, a, task, o.bounds); steps++;
        var said = !m.crash && o.clf ? clfProb(o.clf, photo(m.s2, r)) >= o.thr : m.success;
        if (m.success) passes++;
        if (said) examiner_++;
        if (m.bay && cell(m.x, m.y) === "S") staff++;
        if (m.crash || m.bay || m.success || said) break;
        s = m.s2;
      }
    }
    var n = EXAM_STARTS.length; return { pass: passes / n, examiner: examiner_ / n, staff: staff / n, steps: steps / n };
  }
  DC.exam = exam;

  /* ---------------- training ---------------- */
  var DEFAULTS = {
    seed: 1, episodes: 150, task: "park", learner: "sac",
    gamma: 0.95, lrQ: 0.5, lrPi: 0.05, lrA: 0.003, alpha0: 1, autoAlpha: true, Hbar: 0.15, tau: 0.005,
    utd: 4, batch: 16, warmup: 30,
    demos: 0, demoMode: "symmetric", demoSeed: 300,
    clf: null, thr: 0.5,
    itv: null,              // { p: chance she catches a mistake, K: moves she drives (Infinity = to the bay), trigger: "fail" | "strict", until: episodes }
    bounds: false, resetS: 10, crashResetS: 45,
    lrRF: 1, examEvery: 1, record: false
  };
  DC.DEFAULTS = DEFAULTS;
  function buffer() { return { data: [], push: function (t) { this.data.push(t); }, sample: function (r) { return this.data[r.int(this.data.length)]; } }; }

  // The instructor's trigger: is the student's chosen move about to fail?
  function aboutToFail(s, a, task, trig) {
    var m = move(s, a, task, false), D = dist(task);
    if (m.success) return false;
    if (m.crash || m.bay) return true;
    if (D[m.s2] === Infinity) return true;
    if (trig === "strict") return D[m.s2] !== D[s] - 1;
    return false;
  }
  DC.aboutToFail = aboutToFail;

  // A training run that advances one lesson at a time (the page slices long runs with it); train() runs it to the end.
  function trainer(opts) {
    var o = Object.assign({}, DEFAULTS, opts || {});
    if (o.learner === "reinforce") return reinforceTrainer(o);
    var r = rng(o.seed), envR = rng(o.seed * 7919 + 17), photoR = rng(o.seed * 104729 + 3);
    var ag = newAgent(o), online = buffer(), demo = buffer(), task = o.task;
    var res = { o: o, ep: [], wall: 0, human: 0, demoN: 0, updates: 0, replays: 0, agent: ag, online: 0, demoBuf: 0 };
    if (o.demos > 0) {
      var drives = demoDrives(o.demos, o.demoSeed, task);
      drives.forEach(function (tr) { tr.forEach(function (t) { t.who = "demo"; if (o.demoMode === "pour") online.push(t); else demo.push(t); res.demoN++; }); });
      res.demoDrives = drives;
    }
    var p = new Float64Array(NA), batchN = o.batch, half = batchN / 2, batch = new Array(batchN);
    function lesson() {
      var ep = res.ep.length;
      var st = STARTS[envR.int(STARTS.length)], s = sid(st[0], st[1], st[2]), take = 0, steps = 0, itvSteps = 0, crash = false, success = false, said = false, staff = false, bumps = 0, traj = o.record ? [] : null;
      var itvOn = o.itv && (o.itv.until == null || ep < o.itv.until), start = s;
      for (var t = 0; t < DC.T; t++) {
        policy(ag, s, p);
        var a = sample(p, r), who = "student", wanted = a;
        if (itvOn) {
          if (take > 0) { a = instructorAction(s, task, envR, 0); take--; who = "instructor"; }
          else if (aboutToFail(s, a, task, o.itv.trigger) && envR() < o.itv.p) { a = instructorAction(s, task, envR, 0); take = (o.itv.K === Infinity ? 1e9 : o.itv.K) - 1; who = "instructor"; }
        }
        var m = move(s, a, task, o.bounds);
        var rew = m.success ? 1 : 0;
        if (o.clf && !m.crash) rew = clfProb(o.clf, photo(m.s2, photoR)) >= o.thr ? 1 : 0;
        var done = m.crash || !!m.bay || rew === 1;
        var tr = { s: s, a: a, r: rew, s2: m.crash ? s : m.s2, done: done, who: who };
        online.push(tr); if (who === "instructor") { demo.push(tr); itvSteps++; }
        if (traj) traj.push({ s: s, a: a, wanted: wanted, who: who, x: m.x, y: m.y, h: m.h, crash: m.crash, bump: m.bumped, r: rew, ok: m.success });
        steps++; if (m.bumped) bumps++;
        // the learner: utd gradient steps per move, each batch half from the demo logbook and half from the lesson log
        if (online.data.length >= o.warmup) for (var g = 0; g < o.utd; g++) {
          var useDemo = o.demoMode === "symmetric" && demo.data.length > 0;
          for (var b = 0; b < batchN; b++) batch[b] = useDemo && b < half ? demo.sample(r) : online.sample(r);
          update(ag, batch, o); res.updates++; res.replays += batchN;
        }
        if (m.crash) crash = true;
        if (m.success) success = true;
        if (rew === 1) said = true;
        if (m.bay && cell(m.x, m.y) === "S") staff = true;
        if (done) break;
        s = m.s2;
      }
      var secs = steps * DC.STEP_S + (crash ? o.crashResetS : o.resetS);
      res.wall += secs; res.human += itvSteps * DC.STEP_S;
      var rec = { start: start, steps: steps, success: success, said: said, crash: crash, staff: staff, itv: itvSteps, itvRate: itvSteps / steps, wall: res.wall, alpha: Math.exp(ag.la), bumps: bumps, traj: traj };
      if (o.examEvery && (ep % o.examEvery === 0 || ep === o.episodes - 1)) rec.exam = exam(ag, { task: task, bounds: o.bounds, clf: o.clf, thr: o.thr });
      res.ep.push(rec);
      res.online = online.data.length; res.demoBuf = demo.data.length;
      if (o.keepBuffer) { res.onlineBuf = online.data; res.demoBufData = demo.data; }
      return rec;
    }
    return { res: res, next: lesson, done: function () { return res.ep.length >= o.episodes; } };
  }
  DC.trainer = trainer;
  function train(opts) { var T = trainer(opts); while (!T.done()) T.next(); return T.res; }
  DC.train = train;

  /* ---------------- the on-policy baseline: REINFORCE with a per-square baseline (Policy Pond's learner) ----------------
     Every lesson is used for one update and then thrown away. */
  function reinforceTrainer(o) {
    var r = rng(o.seed), envR = rng(o.seed * 7919 + 17), task = o.task, L = new Float64Array(NS * NA), base = new Float64Array(NS), seen = new Float64Array(NS);
    var ag = { L: L, la: Math.log(1e-9) }, res = { o: o, ep: [], wall: 0, human: 0, updates: 0, replays: 0, online: 0, agent: ag }, p = new Float64Array(NA);
    function pol(s) { var b = s * NA, m = Math.max(L[b], L[b + 1], L[b + 2]), z = 0; for (var a = 0; a < NA; a++) { p[a] = Math.exp(L[b + a] - m); z += p[a]; } for (a = 0; a < NA; a++) p[a] /= z; return p; }
    function lesson() {
      var ep = res.ep.length, st = STARTS[envR.int(STARTS.length)], s = sid(st[0], st[1], st[2]), traj = [], crash = false, success = false, rtraj = o.record ? [] : null;
      for (var t = 0; t < DC.T; t++) {
        var a = sample(pol(s), r), m = move(s, a, task, o.bounds);
        traj.push({ s: s, a: a, r: m.success ? 1 : 0 });
        if (rtraj) rtraj.push({ s: s, a: a, wanted: a, who: "student", x: m.x, y: m.y, h: m.h, crash: m.crash, bump: m.bumped, r: m.success ? 1 : 0, ok: m.success });
        if (m.crash) crash = true; if (m.success) success = true;
        if (m.crash || m.bay || m.success) break;
        s = m.s2;
      }
      var G = 0;
      for (var i = traj.length - 1; i >= 0; i--) {
        var x = traj[i]; G = x.r + o.gamma * G;
        seen[x.s]++; base[x.s] += (G - base[x.s]) / Math.min(seen[x.s], 10);
        var adv = G - base[x.s]; pol(x.s);
        for (var aa = 0; aa < NA; aa++) L[x.s * NA + aa] += o.lrRF * adv * ((aa === x.a ? 1 : 0) - p[aa]);
        res.replays++;
      }
      res.updates++; res.online += traj.length;
      res.wall += traj.length * DC.STEP_S + (crash ? o.crashResetS : o.resetS);
      var rec = { steps: traj.length, success: success, said: success, crash: crash, itv: 0, itvRate: 0, wall: res.wall, traj: rtraj };
      if (o.examEvery && (ep % o.examEvery === 0 || ep === o.episodes - 1)) rec.exam = exam(ag, { task: task, bounds: o.bounds });
      res.ep.push(rec);
      return rec;
    }
    return { res: res, next: lesson, done: function () { return res.ep.length >= o.episodes; } };
  }

  /* ---------------- summaries ---------------- */
  // running average over the last n lessons, as HIL-SERL's Fig. 5 plots (n = 20)
  function running(arr, n) { var out = [], sum = 0; for (var i = 0; i < arr.length; i++) { sum += arr[i]; if (i >= n) sum -= arr[i - n]; out.push(sum / Math.min(i + 1, n)); } return out; }
  DC.running = running;
  // the first lesson after which the exam pass rate stays at or above `level` for `hold` exams in a row
  function lessonsTo(res, level, hold) {
    hold = hold || 5;
    var ex = res.ep.map(function (e) { return e.exam ? e.exam.pass : null; }), run = 0;
    for (var i = 0; i < ex.length; i++) { if (ex[i] == null) continue; if (ex[i] >= level - 1e-9) { run++; if (run >= hold) return i - hold + 2; } else run = 0; }
    return null;
  }
  DC.lessonsTo = lessonsTo;
  function minutesAt(res, lessons) { if (lessons == null) return null; return res.ep[Math.min(lessons, res.ep.length) - 1].wall / 60; }
  DC.minutesAt = minutesAt;

  // A fleet of runs (one per seed), summarised the way the page shows it.
  function summarize(runs, level) {
    level = level || 0.8;
    var n = runs.length, E = runs[0].ep.length, curve = [], mins = [], rate = [], i;
    for (i = 0; i < E; i++) {
      var p = 0, m = 0, it = 0, st = 0;
      runs.forEach(function (r) { p += r.ep[i].exam.pass / n; m += r.ep[i].wall / 60 / n; it += r.ep[i].itv / r.ep[i].steps / n; });
      curve.push(p); mins.push(m); rate.push(it);
    }
    var L = runs.map(function (r) { return lessonsTo(r, level); }), sorted = L.map(function (x) { return x == null ? Infinity : x; }).sort(function (a, b) { return a - b; });
    var last = runs.map(function (r) { return r.ep[E - 1].exam; });
    function mean(f) { return runs.reduce(function (s, r, k) { return s + f(r, k); }, 0) / n; }
    return {
      n: n, E: E, curve: curve, mins: mins, rate: rate, L: L, reached: L.filter(function (x) { return x != null; }).length,
      medianL: sorted[Math.floor((n - 1) / 2)] === Infinity ? null : sorted[Math.floor((n - 1) / 2)],
      pass: mean(function (r, k) { return last[k].pass; }), examiner: mean(function (r, k) { return last[k].examiner; }), staff: mean(function (r, k) { return last[k].staff; }),
      humanMin: mean(function (r) { return r.human / 60; }), wallMin: mean(function (r) { return r.wall / 60; }),
      crashes: mean(function (r) { return r.ep.filter(function (e) { return e.crash; }).length; }),
      bumps: mean(function (r) { return r.ep.reduce(function (s, e) { return s + (e.bumps || 0); }, 0); }),
      alpha: mean(function (r) { return r.ep[E - 1].alpha || 0; })
    };
  }
  DC.summarize = summarize;
  // the first lesson at which a fleet's average exam score, averaged over the last 5 exams, reaches `level`
  function crossing(curve, level) { for (var i = 4; i < curve.length; i++) { var m = (curve[i] + curve[i - 1] + curve[i - 2] + curve[i - 3] + curve[i - 4]) / 5; if (m >= level - 1e-9) return i + 1; } return null; }
  DC.crossing = crossing;
  DC.SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
  // Every fleet the page runs, so the page and tests/check.js run exactly the same configurations.
  var KSHORT = { p: 1, K: 3, trigger: "fail" };
  DC.ITV = {
    none: null,
    short: KSHORT,
    half: { p: 0.5, K: 3, trigger: "fail" },
    rare: { p: 0.2, K: 3, trigger: "fail" },
    long: { p: 1, K: Infinity, trigger: "fail" },
    backseat: { p: 1, K: Infinity, trigger: "strict" }
  };
  DC.FLEETS = {
    s1: { utd1: { task: "box", utd: 1, episodes: 300 }, utd4: { task: "box", utd: 4, episodes: 300 }, utd16: { task: "box", utd: 16, episodes: 300 }, rf: { task: "box", learner: "reinforce", lrRF: 10, episodes: 600 } },
    s2: { hot: { task: "box", episodes: 300, alpha0: 1, autoAlpha: false }, auto: { task: "box", episodes: 300 }, cool: { task: "box", episodes: 300, alpha0: 0.01, autoAlpha: false }, off: { task: "box", episodes: 300, alpha0: 1e-6, autoAlpha: false },
          tau1: { task: "box", episodes: 300, tau: 1 }, tau05: { task: "box", episodes: 300, tau: 0.05 } },
    s4: { d0: { episodes: 250 }, d5: { episodes: 250, demos: 5 }, d10: { episodes: 250, demos: 10 }, d20: { episodes: 250, demos: 20 }, d30: { episodes: 250, demos: 30 }, pour: { episodes: 250, demos: 20, demoMode: "pour" } },
    s5: { none: { episodes: 150, demos: 20 }, short: { episodes: 150, demos: 20, itv: DC.ITV.short }, half: { episodes: 150, demos: 20, itv: DC.ITV.half }, rare: { episodes: 150, demos: 20, itv: DC.ITV.rare },
          long: { episodes: 150, demos: 20, itv: DC.ITV.long }, backseat: { episodes: 150, demos: 20, itv: DC.ITV.backseat }, alone: { episodes: 150, itv: DC.ITV.short } },
    s6: { fence0: { episodes: 250, demos: 20 }, fence1: { episodes: 250, demos: 20, bounds: true } }
  };
  // step 3's fleets need the examiner object, so they're built on demand
  DC.s3fleet = function (k) {
    var base = { episodes: 150, demos: 20 };
    if (k === "human") return base;
    if (k === "naive") return Object.assign({ clf: examiner(0) }, base);
    if (k === "thr99") return Object.assign({ clf: examiner(0), thr: 0.99 }, base);
    if (k === "thr999") return Object.assign({ clf: examiner(0), thr: 0.999 }, base);
    if (k === "more") return Object.assign({ clf: examiner(0) }, base, { demos: 40 });
    if (k === "fixed") return Object.assign({ clf: examiner(30) }, base);
  };
  // step 2's worked examples: three pages from the logbook
  DC.bellmanPicks = function (run) {
    var buf = run.onlineBuf, out = [], i, ag = run.agent;
    for (i = buf.length - 1; i >= 0; i--) if (buf[i].r === 1) { out.push({ name: "reached the box", tr: buf[i] }); break; }
    for (i = buf.length - 1; i >= 0; i--) if (buf[i].done && buf[i].r === 0) { out.push({ name: "hit something", tr: buf[i] }); break; }
    var D = dist("box");
    for (i = buf.length - 1; i >= 0; i--) { var t = buf[i]; if (!t.done && D[t.s2] === 1 && D[t.s] === 2) { out.push({ name: "one move short", tr: t }); break; } }
    return out;
  };
  DC.firstPassMedian = function (runs) {
    var v = runs.map(function (r) { for (var i = 0; i < r.ep.length; i++) if (r.ep[i].success) return i + 1; return Infinity; }).sort(function (a, b) { return a - b; });
    var m = v[Math.floor((v.length - 1) / 2)]; return m === Infinity ? null : m;
  };
  // the share of the logbook that is demonstration when demos are poured into it (= the expected share of a batch)
  DC.demoShare = function (run, lessons) { var n = 0; for (var i = 0; i < lessons; i++) n += run.ep[i].steps; return run.demoN / (run.demoN + n); };
  // The field test. Each answer is checked against a fresh computation in tests/check.js.
  DC.FIELD = [
    { q: "Two thousand lessons of random driving: how many park straight in the exam bay?", hint: "step 0", ans: 8, tol: 0 },
    { q: "SAC with 4 study batches per move: at which lesson does the fleet's average exam reach 75%?", hint: "step 1", ans: 253, tol: 1 },
    { q: "REINFORCE: the fleet's average exam after 200 lessons, in percent?", hint: "step 1, the table", ans: 33, tol: 1 },
    { q: "The page \u201cone move short\u201d: its Bellman target y?", hint: "step 2, three decimals", ans: 0.326, tol: 0.001 },
    { q: "The dither dial at α = 0.10: the chance of the best move, in percent?", hint: "step 2", ans: 60, tol: 1 },
    { q: "The examiner as first trained, threshold 0.999: her recall on the test set, in percent?", hint: "step 3", ans: 20, tol: 0.5 },
    { q: "Students paid by the examiner as first trained: the share of exam starts that end in a staff bay, in percent?", hint: "step 3", ans: 36, tol: 1 },
    { q: "With 20 demo drives: the median lesson at which a student first parks?", hint: "step 4", ans: 22, tol: 0 },
    { q: "Short corrections: the instructor's minutes of driving over all 150 lessons, averaged over the 8 students?", hint: "step 5, one decimal", ans: 3.0, tol: 0.1 },
    { q: "Fence on, 30-second resets: lot-minutes until the fleet averages 80%?", hint: "step 6", ans: 129, tol: 1 }
  ];
  DC.runFleet = function (cfg, seeds) { return (seeds || DC.SEEDS).map(function (sd) { return train(Object.assign({}, cfg, { seed: sd })); }); };
  // window [a, b) of a fleet's intervention rate: intervened moves / all moves
  // HIL-SERL's intervention rate: each lesson's intervened moves ÷ its moves, averaged over lessons [a, b) and over runs
  function rateIn(runs, a, b) { var s = 0, n = 0; runs.forEach(function (r) { r.ep.slice(a, b).forEach(function (e) { s += e.itv / e.steps; n++; }); }); return n ? s / n : 0; }
  DC.rateIn = rateIn;
  // Step 0: the untrained student, picking moves at random
  function randomLessons(n, seed, task) {
    var r = rng(seed), out = { n: n, success: 0, crash: 0, staff: 0, bay: 0, moves: 0, secs: 0 };
    for (var k = 0; k < n; k++) {
      var st = STARTS[r.int(STARTS.length)], s = sid(st[0], st[1], st[2]), crash = false;
      for (var t = 0; t < DC.T; t++) {
        var m = move(s, r.int(NA), task || "park", false); out.moves++;
        if (m.success) out.success++;
        if (m.crash) { out.crash++; crash = true; }
        if (m.bay) { out.bay++; if (cell(m.x, m.y) === "S") out.staff++; }
        if (m.crash || m.bay || m.success) break;
        s = m.s2;
      }
    }
    out.secs = out.moves * DC.STEP_S + out.crash * DEFAULTS.crashResetS + (n - out.crash) * DEFAULTS.resetS;
    return out;
  }
  DC.randomLessons = randomLessons;

  /* ---------------- the review board: three failed training runs ---------------- */
  function pct(x) { return Math.round(100 * x) + "%"; }
  DC.CASES = [
    { id: "c1", title: "Case 1 · The student who parks next door",
      brief: "<b>The complaint:</b> the examiner's clipboard says the student passes most lessons, but the instructor keeps finding the car in a staff bay. Setup: 20 demo drives, the examiner as first trained (40 photos of the exam bay, 10 drives' worth of everything else), threshold 0.5, 150 lessons.",
      broken: null, brokenKey: "naive",
      fixes: [
        { label: "Raise the examiner's threshold to 0.99", key: "thr99", why: "Her score for a staff bay is 0.99 too: the threshold moves both bays together." },
        { label: "Give the student 20 more demo drives (40 in all)", key: "more", why: "The demos show the right bay, but a reward she pays for the wrong bay is still a reward." },
        { label: "Photograph her false passes (staff bays, crooked parks): 30 extra negatives, retrain her", key: "fixed", right: true, why: "With photos of the staff bays labelled 'no', she learns the one thing that differs: the chequered sign." }
      ],
      causes: [{ label: "The examiner can't tell a staff bay from the exam bay: none of her training photos showed a staff bay", right: true }, { label: "The student hasn't seen enough demonstrations" }, { label: "The threshold of 0.5 is too low" }],
      checks: [
        { label: "parks in a staff bay on at most 2% of exam starts", test: function (S) { return S.staff <= 0.02 + 1e-9; }, why: function (S) { return pct(S.staff) + " of exam starts end in a staff bay"; } },
        { label: "the examiner's pass rate is within 5 points of the truth", test: function (S) { return Math.abs(S.examiner - S.pass) <= 0.05 + 1e-9; }, why: function (S) { return "she says " + pct(S.examiner) + ", truly parked " + pct(S.pass); } },
        { label: "passes at least 70% of exam starts", test: function (S) { return S.pass >= 0.7 - 1e-9; }, why: function (S) { return pct(S.pass) + " parked straight in the exam bay"; } }
      ],
      describe: function (S) { return "exam " + pct(S.pass) + " · examiner says " + pct(S.examiner) + " · staff bays " + pct(S.staff); } },
    { id: "c2", title: "Case 2 · The dawdler",
      brief: "<b>The complaint:</b> 150 lessons with the instructor in the car and the student still drives round the lot until time runs out. It hardly ever crashes, so she rarely has anything to grab. Setup: 20 demo drives, short corrections, temperature α fixed at 1.0 (tuning switched off).",
      brokenCfg: { episodes: 150, demos: 20, itv: DC.ITV.short, autoAlpha: false },
      fixes: [
        { label: "Give it 20 more demo drives (40 in all)", cfg: { episodes: 150, demos: 40, itv: DC.ITV.short, autoAlpha: false }, why: "The demos say where the bay is; α = 1 still pays more for keeping options open than parking pays." },
        { label: "Have the instructor take over for longer: drive it all the way into the bay", cfg: { episodes: 150, demos: 20, itv: DC.ITV.long, autoAlpha: false }, why: "LeRobot's guide warns a temperature set too high can make interventions ineffective: they are." },
        { label: "Switch temperature tuning back on (target entropy 0.15)", cfg: { episodes: 150, demos: 20, itv: DC.ITV.short }, right: true, why: "α falls until the student is only as random as the target allows, and parking pays again." }
      ],
      causes: [{ label: "The temperature is stuck high: every move it keeps its options open earns more than parking does", right: true }, { label: "Too few demonstrations" }, { label: "The instructor isn't intervening enough" }],
      checks: [{ label: "passes at least 80% of exam starts", test: function (S) { return S.pass >= 0.8 - 1e-9; }, why: function (S) { return pct(S.pass) + " parked straight in the exam bay"; } }],
      describe: function (S) { return "exam " + pct(S.pass) + " · instructor " + S.humanMin.toFixed(1) + " min · final α " + S.alpha.toFixed(2); } },
    { id: "c3", title: "Case 3 · The backseat driver",
      brief: "<b>The complaint:</b> the student passes its exam, but after 150 lessons the instructor is still driving 40% of the moves, and she's tired. Setup: 20 demo drives; she grabs the wheel at every move that isn't the shortest way, and keeps it until the car is parked.",
      brokenKey: "backseat",
      fixes: [
        { label: "Give it 20 more demo drives (40 in all)", cfg: Object.assign({}, DC.FLEETS.s5.backseat, { demos: 40 }), why: "More of her driving in the logbook doesn't stop her grabbing the wheel." },
        { label: "Only take over when it's about to fail, but still drive it all the way in", cfg: DC.FLEETS.s5.long, why: "Better, but every rescue still finishes the lesson for the student." },
        { label: "Only take over when it's about to fail, for three moves, then hand back", cfg: DC.FLEETS.s5.short, right: true, why: "Short, specific corrections; the student finishes its own lessons and the rate falls." }
      ],
      causes: [{ label: "She takes over too often and too long, so the student never practises finishing a lesson itself", right: true }, { label: "The student needs more demonstrations" }, { label: "The learner isn't doing enough updates per move" }],
      checks: [
        { label: "intervention rate under 5% over the last 20 lessons", test: function (S, runs) { return rateIn(runs, S.E - 20, S.E) < 0.05; }, why: function (S, runs) { return pct(rateIn(runs, S.E - 20, S.E)) + " of moves were hers"; } },
        { label: "under 5 instructor-minutes in all", test: function (S) { return S.humanMin < 5; }, why: function (S) { return S.humanMin.toFixed(1) + " minutes of her driving"; } },
        { label: "passes at least 90% of exam starts", test: function (S) { return S.pass >= 0.9 - 1e-9; }, why: function (S) { return pct(S.pass) + " parked straight in the exam bay"; } }
      ],
      describe: function (S, runs) { return "exam " + pct(S.pass) + " · instructor " + S.humanMin.toFixed(1) + " min · last-20 rate " + pct(rateIn(runs, S.E - 20, S.E)); } }
  ];
  // the right fix and cause sit in a different place in each case
  (function () {
    function move(arr, from, to) { var x = arr.splice(from, 1)[0]; arr.splice(to, 0, x); }
    move(DC.CASES[1].fixes, 2, 0); move(DC.CASES[2].fixes, 2, 1);
    move(DC.CASES[0].causes, 0, 1); move(DC.CASES[1].causes, 0, 2);
  })();
  DC.CASES.forEach(function (cs) {
    if (cs.brokenKey) cs.broken = cs.id === "c1" ? DC.s3fleet(cs.brokenKey) : DC.FLEETS.s5[cs.brokenKey]; else cs.broken = cs.brokenCfg;
    cs.fixes.forEach(function (fx) { if (fx.key) fx.cfg = DC.s3fleet(fx.key); });
  });

  if (typeof module !== "undefined" && module.exports) module.exports = DC;
  root.DC = DC;
})(typeof window !== "undefined" ? window : this);

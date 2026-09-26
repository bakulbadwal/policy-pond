/* Policy Pond — the toy worlds. Deterministic given a seed. Exposed as window.PPSim.
   The LEARNERS here are real (REINFORCE, a baseline, PPO's clipped update, exact policy
   gradient). The WORLDS are toys: three pond routes, a menu of robot behaviours with
   hand-written scores, and a one-number balance task. See the honesty note on the page. */
(function (root) {
  "use strict";
  var PP = root.PP;

  /* ================= the pond strip (step 0) ================= */
  // Tiles 0..7; breadcrumbs sit on tile 7 (+20, episode ends). Each move costs −1 (effort).
  // The current pushes it the wrong way 15% of the time.
  var STRIP = { n: 8, goal: 7, crumb: 20, step: -1, maxSteps: 25 };
  function stripEpisode(seed, pRight, maxSteps) {
    var R = PP.rng(seed), s = 0, out = [], T = maxSteps || STRIP.maxSteps;
    for (var t = 0; t < T; t++) {
      var a = R() < pRight ? 1 : -1;          // the habit: how often it tries to go right
      var slip = R() < 0.15;                  // the pond: 15% of the time the current pushes the other way
      var move = slip ? -a : a;
      var s2 = Math.max(0, Math.min(STRIP.n - 1, s + move));
      var done = s2 === STRIP.goal;
      var r = done ? STRIP.crumb : STRIP.step;
      out.push({ t: t, s: s, a: a, r: r, s2: s2, slip: slip, done: done });
      s = s2;
      if (done) break;
    }
    return out;
  }

  // The exact value of each tile under a fixed habit (value iteration on the 8-state chain, no day
  // limit): what Mama's guess should converge to. The goal tile is terminal, so its value is 0.
  function stripExactValues(pRight, gamma) {
    var n = STRIP.n, V = new Array(n).fill(0), pR = 0.85 * pRight + 0.15 * (1 - pRight);   // chance the duckling actually moves right
    for (var it = 0; it < 5000; it++) {
      var W = V.slice(), diff = 0;
      for (var s = 0; s < n; s++) {
        if (s === STRIP.goal) { W[s] = 0; continue; }
        var right = Math.min(n - 1, s + 1), left = Math.max(0, s - 1);
        var vR = right === STRIP.goal ? STRIP.crumb : STRIP.step + gamma * V[right];
        var vL = STRIP.step + gamma * V[left];
        W[s] = pR * vR + (1 - pR) * vL;
        diff = Math.max(diff, Math.abs(W[s] - V[s]));
      }
      V = W; if (diff < 1e-10) break;
    }
    return V;
  }

  /* ================= three routes across the pond (steps 1–3) ================= */
  // A steady route, a risky one with the best average, and a slow one.
  var ROUTES = [
    { id: "A", name: "Along the reeds", note: "steady", mean: 1.0, sd: 0.3 },
    { id: "B", name: "Past the bread boat", note: "risky, best on average", mean: 2.0, sd: 3.0 },
    { id: "C", name: "Through the mud", note: "slow", mean: 0.3, sd: 0.3 }
  ];
  function routeReward(a, R, bonus) { return (bonus || 0) + ROUTES[a].mean + ROUTES[a].sd * R.normal(); }
  function sampleAction(pi, R) { var u = R(), c = 0; for (var i = 0; i < pi.length; i++) { c += pi[i]; if (u < c) return i; } return pi.length - 1; }
  function expectedReward(pi, bonus) { return (bonus || 0) + pi.reduce(function (s, p, i) { return s + p * ROUTES[i].mean; }, 0); }

  // n single-crossing REINFORCE estimates of the gradient, from one fixed policy.
  // baseline: "none" or "mama" (Mama's guess = the true average haul under this policy, V = Σ π·mean).
  function scatter(logits, n, baseline, seed, bonus) {
    var R = PP.rng(seed), pi = PP.softmax(logits), b = baseline === "mama" ? expectedReward(pi, bonus) : 0, pts = [];
    for (var i = 0; i < n; i++) {
      var a = sampleAction(pi, R), r = routeReward(a, R, bonus);
      var g = PP.reinforceEstimate(pi, a, r, b);
      pts.push({ a: a, r: r, g: g });
    }
    var comp = pts.map(function (p) { return p.g[1]; });            // the push toward route B
    var mean = comp.reduce(function (s, x) { return s + x; }, 0) / n;
    var sd = Math.sqrt(comp.reduce(function (s, x) { return s + (x - mean) * (x - mean); }, 0) / (n - 1));
    // the true (expected) gradient toward B, for reference: Σ_a π_a·mean_a·(1[a=B] − π_B)
    var trueG = pi.reduce(function (s, p, a) { return s + p * ROUTES[a].mean * ((a === 1 ? 1 : 0) - pi[1]); }, 0);
    return { pi: pi, pts: pts, comp: comp, mean: mean, sd: sd, trueG: trueG, baseline: b };
  }

  // Train with REINFORCE for `episodes` crossings. baseline "none" | "mama" (a running average of hauls).
  function trainReinforce(episodes, lr, baseline, seed, bonus) {
    var R = PP.rng(seed), th = [0, 0, 0], b = 0, hist = [];
    for (var e = 0; e < episodes; e++) {
      var pi = PP.softmax(th), a = sampleAction(pi, R), r = routeReward(a, R, bonus);
      var g = PP.reinforceEstimate(pi, a, r, baseline === "mama" ? b : 0);
      th = th.map(function (x, i) { return x + lr * g[i]; });
      if (baseline === "mama") b += 0.05 * (r - b);
      hist.push({ pi: PP.softmax(th), a: a, r: r, J: expectedReward(PP.softmax(th)) });
    }
    return hist;
  }
  // Average J over many seeds, for the race chart.
  function race(episodes, lr, seeds, bonus) {
    var out = { none: [], mama: [] };
    ["none", "mama"].forEach(function (mode) {
      var runs = [];
      for (var s = 0; s < seeds; s++) runs.push(trainReinforce(episodes, lr, mode, 1000 + s, bonus));
      for (var e = 0; e < episodes; e++) {
        var js = runs.map(function (h) { return h[e].J; });
        var m = js.reduce(function (a, b) { return a + b; }, 0) / seeds;
        var sd = Math.sqrt(js.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / seeds);
        out[mode].push({ m: m, lo: m - sd, hi: m + sd });
      }
    });
    return out;
  }

  // PPO on the routes: collect one batch under π_old, then K epochs of full-batch ascent on the
  // clipped (or unclipped) surrogate. Advantage = haul − batch average (normalised).
  function ppoReuse(opts) {
    var R = PP.rng(opts.seed), th0 = opts.logits.slice(), piOld = PP.softmax(th0), N = opts.n;
    var batch = [];
    for (var i = 0; i < N; i++) { var a = sampleAction(piOld, R); batch.push({ a: a, r: routeReward(a, R) }); }
    var mr = batch.reduce(function (s, x) { return s + x.r; }, 0) / N;
    var sr = Math.sqrt(batch.reduce(function (s, x) { return s + (x.r - mr) * (x.r - mr); }, 0) / N) || 1;
    batch.forEach(function (x) { x.A = (x.r - mr) / sr; });
    var th = th0.slice(), eps = opts.eps, hist = [];
    function snapshot(k) {
      var pi = PP.softmax(th), ratio = pi.map(function (p, j) { return p / piOld[j]; });
      var outside = batch.filter(function (x) { var q = ratio[x.a]; return q < 1 - eps || q > 1 + eps; }).length / N;
      hist.push({ epoch: k, pi: pi, ratio: ratio, outside: outside, J: expectedReward(pi) });
    }
    snapshot(0);
    for (var k = 1; k <= opts.epochs; k++) {
      var pi = PP.softmax(th), g = [0, 0, 0];
      batch.forEach(function (x) {
        var q = pi[x.a] / piOld[x.a];
        var flows = opts.clip ? PP.clipObjective(q, x.A, eps).flows : true;
        if (!flows) return;
        // ∇ (r·A) = A · r · ∇log π(a)
        var gl = PP.gradLogPi(pi, x.a);
        for (var j = 0; j < 3; j++) g[j] += x.A * q * gl[j] / N;
      });
      th = th.map(function (v, j) { return v + opts.lr * g[j]; });
      snapshot(k);
    }
    var counts = [0, 0, 0], sums = [0, 0, 0];
    batch.forEach(function (x) { counts[x.a]++; sums[x.a] += x.r; });
    return { piOld: piOld, batch: batch, hist: hist, counts: counts, avg: sums.map(function (s, j) { return counts[j] ? s / counts[j] : null; }) };
  }
  // Real PPO training: `rounds` × (collect a batch with the current policy, then K epochs on it).
  // Returns the policy after each round. On-policy: a route the policy stops choosing stops being sampled.
  function ppoTrain(opts, rounds) {
    var logits = opts.logits.slice(), out = [{ round: 0, pi: PP.softmax(logits), J: expectedReward(PP.softmax(logits)) }];
    for (var k = 1; k <= rounds; k++) {
      var res = ppoReuse(Object.assign({}, opts, { logits: logits, seed: opts.seed + 7919 * k }));
      var last = res.hist[res.hist.length - 1];
      // carry the final logits forward (log π works as logits for a softmax)
      logits = last.pi.map(function (p) { return Math.log(Math.max(p, 1e-12)); });
      out.push({ round: k, pi: last.pi, J: last.J });
    }
    return out;
  }
  function ppoFleet(opts, rounds, seeds) {
    var res = { on: [], off: [] };
    for (var s = 0; s < seeds; s++) {
      res.on.push(ppoTrain(Object.assign({}, opts, { clip: true, seed: opts.seed + 31 * s }), rounds));
      res.off.push(ppoTrain(Object.assign({}, opts, { clip: false, seed: opts.seed + 31 * s }), rounds));
    }
    return res;
  }
  // Ten fresh batches, clip on vs off: where does the policy end up?
  function ppoMany(opts, batches) {
    var res = { on: [], off: [] };
    for (var b = 0; b < batches; b++) {
      var base = Object.assign({}, opts, { seed: opts.seed + 101 * b });
      res.on.push(ppoReuse(Object.assign({}, base, { clip: true })).hist.slice(-1)[0]);
      res.off.push(ppoReuse(Object.assign({}, base, { clip: false })).hist.slice(-1)[0]);
    }
    return res;
  }

  /* ================= GAE traces (step 4) ================= */
  // One 24-step slice of a rollout (Microduck's num_steps_per_env = 24). An ordinary plank pays 0.1.
  // Mama's guess is the self-consistent value of an ordinary walk, 0.1 / (1 − γ), times `k`
  // (k = 1: a correct critic; k = 1.3: one that expects 30% more than the walk delivers), so an
  // unsurprising walk has δ = 0 on every plank. values has 25 entries: the last bootstraps the rest.
  var TRACES = {
    stumble: { label: "A stumble at plank 15", r: fill(24, 0.1, { 14: -1.0 }), k: 1 },
    gust: { label: "A lucky gust at plank 8", r: fill(24, 0.1, { 7: 1.0 }), k: 1 },
    optimist: { label: "Mama is too optimistic", r: fill(24, 0.1, {}), k: 1.3 },
    steady: { label: "Nothing surprising", r: fill(24, 0.1, {}), k: 1 }
  };
  function traceValues(trace, gamma) { return fill(25, trace.k * 0.1 / (1 - gamma), {}); }
  // Spread of the plank-1 advantage across `n` noisy walks (each plank's crumbs ± noise sd),
  // for λ = 0, 0.05, …, 1. Same noise draws for every λ, so the curve is smooth and comparable.
  function gaeSpread(trace, gamma, n, noise, seed) {
    var R = PP.rng(seed), walks = [], v = traceValues(trace, gamma);
    for (var i = 0; i < n; i++) walks.push(trace.r.map(function (x) { return x + noise * R.normal(); }));
    var out = [];
    for (var l = 0; l <= 20; l++) {
      var lam = l / 20, a0 = walks.map(function (w) { return PP.gae(w, v, gamma, lam).adv[0]; });
      var m = a0.reduce(function (s, x) { return s + x; }, 0) / n;
      out.push({ lambda: lam, mean: m, sd: Math.sqrt(a0.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (n - 1)) });
    }
    return out;
  }
  function fill(n, x, over) { var a = []; for (var i = 0; i < n; i++) a.push(over[i] != null ? over[i] : x); return a; }

  /* ================= the scorecard: behaviour menus (step 5 + capstone) ================= */
  // Each behaviour has a hand-written per-episode value for each reward term (100 steps).
  // kind "reward": function returns ≥ 0, wants a positive weight.
  // kind "cost":   mjlab-style cost, returns ≥ 0, wants a NEGATIVE weight.
  // kind "selfneg": microduck-style *_penalty / *_l1, returns ≤ 0, wants a POSITIVE weight.
  var TASKS = {
    walk: {
      title: "Walk forward",
      behaviours: [
        { id: "walk", name: "walks", want: true },
        { id: "shuffle", name: "shuffles in place" },
        { id: "butthop", name: "hops on its bottom" },
        { id: "lunge", name: "lunges and falls" },
        { id: "stand", name: "stands still" }
      ],
      terms: [
        { id: "track_velocity", kind: "reward", vals: { walk: 80, shuffle: 30, butthop: 45, lunge: 20, stand: 0 }, def: 1.0 },
        { id: "upright", kind: "reward", vals: { walk: 95, shuffle: 100, butthop: 40, lunge: 20, stand: 100 }, def: 0.5 },
        { id: "joint_limit_penalty", kind: "selfneg", vals: { walk: -5, shuffle: -3, butthop: -100, lunge: -20, stand: 0 }, def: 1.0 },
        { id: "action_rate_l2", kind: "cost", vals: { walk: 10, shuffle: 6, butthop: 25, lunge: 30, stand: 1 }, def: -0.5 },
        { id: "fell_over", kind: "cost", vals: { walk: 0, shuffle: 0, butthop: 0, lunge: 1, stand: 0 }, def: -50 }
      ]
    },
    getup: {
      title: "Get up after a fall",
      behaviours: [
        { id: "standup", name: "stands up", want: true },
        { id: "lie", name: "lies on its back" },
        { id: "sit", name: "sits" },
        { id: "flop", name: "flops on its side" },
        { id: "thrash", name: "thrashes" }
      ],
      terms: [
        { id: "recovery_bonus", kind: "reward", gated: true, vals: { standup: 30, lie: 100, sit: 0, flop: 100, thrash: 60 }, def: 1.0, note: "pays every step the robot is low, 'to encourage recovery'" },
        { id: "upright", kind: "reward", vals: { standup: 70, lie: 0, sit: 60, flop: 0, thrash: 20 }, def: 0.3 },
        { id: "height", kind: "reward", vals: { standup: 70, lie: 0, sit: 20, flop: 0, thrash: 10 }, def: 0.3 },
        { id: "rise_progress", kind: "reward", potential: true, vals: { standup: 1.0, lie: 0, sit: 0.8, flop: 0, thrash: 0.2 }, def: 0, note: "potential-based: pays Δcos(tilt), so rising pays and holding pays zero" },
        { id: "action_rate_l2", kind: "cost", vals: { standup: 10, lie: 0, sit: 3, flop: 2, thrash: 40 }, def: -0.1 }
      ]
    }
  };
  function behaviourTotals(task, weights) {
    var T = TASKS[task];
    return T.behaviours.map(function (b) {
      var parts = T.terms.map(function (t) { return { id: t.id, kind: t.kind, v: (weights[t.id] || 0) * t.vals[b.id] }; });
      return { id: b.id, name: b.name, want: !!b.want, parts: parts, total: parts.reduce(function (s, p) { return s + p.v; }, 0) };
    });
  }
  // Exact (noise-free) policy gradient over the behaviour menu: ∇J = Σ_a π_a·R_a·(e_a − π).
  // Returns π after each iteration. Scale-free step: rewards divided by their spread.
  function learnMenu(totals, iters, lr) {
    var n = totals.length, th = new Array(n).fill(0), R = totals.map(function (t) { return t.total; });
    var span = Math.max.apply(null, R) - Math.min.apply(null, R) || 1, hist = [];
    for (var it = 0; it < iters; it++) {
      var pi = PP.softmax(th), J = pi.reduce(function (s, p, i) { return s + p * R[i]; }, 0);
      th = th.map(function (x, i) { return x + lr * pi[i] * (R[i] - J) / span; });
      hist.push(PP.softmax(th));
    }
    return hist;
  }
  // "Episode_Reward/<term>" panel for the behaviour the policy settled on: weighted value per term.
  function penaltyAudit(task, weights, behaviourId) {
    var T = TASKS[task];
    return T.terms.filter(function (t) { return t.kind !== "reward"; }).map(function (t) {
      var v = (weights[t.id] || 0) * t.vals[behaviourId];
      return { id: t.id, kind: t.kind, v: v, ok: v <= 1e-9 };
    });
  }

  /* ================= the attempt tax (capstone case 3) ================= */
  // Two behaviours: stand still, or attempt the roll. Skill only grows while attempting.
  // attempt return = 22 + 100·skill − 60·w(t) ; stand still = 20 − 1·w(t)
  // w(t) = the smoothness-penalty weight at iteration t, set by a schedule.
  function taxSchedule(it, sched) {
    if (sched.mode === "const") return sched.w;
    if (it < sched.start) return 0;
    if (it >= sched.start + sched.len) return sched.w;
    return sched.w * Math.floor((it - sched.start) / (sched.len / 4)) / 4;  // a staircase from 0: mdp.reward_weight is a step function
  }
  function attemptTax(sched, iters) {
    iters = iters || 500;
    var th = [0, 0], skill = 0, hist = [];
    for (var it = 0; it < iters; it++) {
      var w = taxSchedule(it, sched), pi = PP.softmax(th);
      var R = [20 - 1 * w, 22 + 100 * skill - 60 * w];
      var J = pi[0] * R[0] + pi[1] * R[1];
      th = th.map(function (x, i) { return x + 0.05 * pi[i] * (R[i] - J); });
      skill += 0.008 * pi[1] * (1 - skill);
      hist.push({ it: it, w: w, pAttempt: PP.softmax(th)[1], skill: skill });
    }
    return hist;
  }

  /* ================= domain randomization (step 6) ================= */
  // One knob the policy chooses: a balance gain k, and how cautious it is, c.
  // Score on a floor with friction μ: best when k matches μ; caution widens the safe band
  // but lowers the peak. Outside the band the duck falls (score −1).
  function drScore(k, c, mu) {
    var w = 0.1 + 0.5 * c, d = Math.abs(k - mu);
    if (d > w) return -1;
    return (1 - 0.6 * c) * (1 - 0.5 * (d / w) * (d / w));
  }
  function drTrain(lo, hi) {
    var best = null, mus = [];
    for (var i = 0; i <= 20; i++) mus.push(lo + (hi - lo) * i / 20);
    for (var k = 0.4; k <= 1.6001; k += 0.01) for (var c = 0; c <= 0.8001; c += 0.02) {
      var s = mus.reduce(function (a, m) { return a + drScore(k, c, m); }, 0) / mus.length;
      if (!best || s > best.s + 1e-12) best = { k: k, c: c, s: s };
    }
    return best;
  }

  root.PPSim = {
    STRIP: STRIP, stripEpisode: stripEpisode, stripExactValues: stripExactValues, ROUTES: ROUTES, routeReward: routeReward, expectedReward: expectedReward,
    scatter: scatter, trainReinforce: trainReinforce, race: race, ppoReuse: ppoReuse, ppoMany: ppoMany, ppoTrain: ppoTrain, ppoFleet: ppoFleet,
    TRACES: TRACES, traceValues: traceValues, gaeSpread: gaeSpread, TASKS: TASKS, behaviourTotals: behaviourTotals, learnMenu: learnMenu, penaltyAudit: penaltyAudit,
    taxSchedule: taxSchedule, attemptTax: attemptTax, drScore: drScore, drTrain: drTrain
  };
})(typeof window !== "undefined" ? window : globalThis);

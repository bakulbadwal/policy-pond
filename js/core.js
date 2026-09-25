/* Policy Pond — the math. Pure functions only, exposed as window.PP.
   Everything here is exact: the formulas from the Hugging Face Deep RL Course
   (Units 1, 2, 4, 6, 8) and from Schulman et al. (2016, GAE; 2017, PPO). */
(function (root) {
  "use strict";

  /* ---------- seeded randomness (so every demo is reproducible) ---------- */
  function rng(seed) {
    var s = seed >>> 0;
    var f = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.normal = function () {
      var u = 0, v = 0;
      while (u === 0) u = f();
      while (v === 0) v = f();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    return f;
  }

  /* ---------- Unit 1: return and discounting ---------- */
  // G_t = R_{t+1} + γ·R_{t+2} + γ²·R_{t+3} + …   (rewards[0] is R_{t+1})
  function discountedReturn(rewards, gamma) {
    var g = 0;
    for (var i = rewards.length - 1; i >= 0; i--) g = rewards[i] + gamma * g;
    return g;
  }
  // Rough "how far ahead does it care": 1/(1−γ) steps.
  function horizonSteps(gamma) { return gamma >= 1 ? Infinity : 1 / (1 - gamma); }
  function horizonSeconds(gamma, hz) { return horizonSteps(gamma) / hz; }
  // Present value of `amount` crumbs arriving `steps` steps from now.
  function presentValue(amount, steps, gamma) { return amount * Math.pow(gamma, steps); }

  /* ---------- Unit 4: the softmax policy ---------- */
  function softmax(logits) {
    var m = Math.max.apply(null, logits), e = logits.map(function (x) { return Math.exp(x - m); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (x) { return x / s; });
  }
  // ∇_θ log π_θ(a) for a softmax over logits θ: onehot(a) − π
  function gradLogPi(pi, a) { return pi.map(function (p, i) { return (i === a ? 1 : 0) - p; }); }
  // One REINFORCE estimate: (R − b) · ∇ log π(a)
  function reinforceEstimate(pi, a, R, baseline) {
    var w = R - (baseline || 0);
    return gradLogPi(pi, a).map(function (g) { return w * g; });
  }

  /* ---------- Units 2 & 6: TD error ---------- */
  // δ = r + γ·V(s′) − V(s)   (V(s′) = 0 if the episode ended)
  function tdError(r, v, vNext, gamma, done) { return r + (done ? 0 : gamma * vNext) - v; }

  /* ---------- GAE (Schulman et al. 2016) — not taught in the course ---------- */
  // rewards: length T. values: length T+1 (the last is the bootstrap V(s_T)).
  // Returns deltas, advantages and the critic's targets ("returns" = A + V).
  function gae(rewards, values, gamma, lambda) {
    var T = rewards.length, deltas = new Array(T), adv = new Array(T), ret = new Array(T), next = 0;
    for (var t = 0; t < T; t++) deltas[t] = rewards[t] + gamma * values[t + 1] - values[t];
    for (var k = T - 1; k >= 0; k--) { next = deltas[k] + gamma * lambda * next; adv[k] = next; }
    for (var j = 0; j < T; j++) ret[j] = adv[j] + values[j];
    return { deltas: deltas, adv: adv, returns: ret };
  }
  // Weight that the TD error k steps later gets in A_t: (γλ)^k
  function gaeWeight(gamma, lambda, k) { return Math.pow(gamma * lambda, k); }
  function halfLifeSteps(gamma, lambda) { var x = gamma * lambda; return x <= 0 ? 0 : x >= 1 ? Infinity : Math.log(0.5) / Math.log(x); }

  /* ---------- Unit 8: the clipped surrogate objective ---------- */
  function clip(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  // L = min(r·A, clip(r, 1−ε, 1+ε)·A). dLdr is the slope in r (0 = no gradient).
  function clipObjective(r, A, eps) {
    var un = r * A, rc = clip(r, 1 - eps, 1 + eps), cl = rc * A;
    var L = Math.min(un, cl);
    // gradient flows only when the unclipped term is the one selected
    var usesUnclipped = un <= cl + 1e-12;
    var inside = r >= 1 - eps && r <= 1 + eps;
    var dLdr = (usesUnclipped || inside) ? A : 0;
    return { L: L, unclipped: un, clipped: cl, dLdr: dLdr, flows: dLdr !== 0, caseNo: clipCase(r, A, eps) };
  }
  // The six cases of the course's visualize page:
  // 1 in range A>0 · 2 in range A<0 · 3 below A>0 · 4 below A<0 · 5 above A>0 · 6 above A<0
  function clipCase(r, A, eps) {
    var pos = A >= 0;
    if (r < 1 - eps) return pos ? 3 : 4;
    if (r > 1 + eps) return pos ? 5 : 6;
    return pos ? 1 : 2;
  }

  /* ---------- PPO batch arithmetic (rsl_rl-style runner) ---------- */
  function ppoBatch(envs, stepsPerEnv, miniBatches, epochs) {
    var batch = envs * stepsPerEnv;
    return { batch: batch, miniBatch: batch / miniBatches, gradSteps: miniBatches * epochs };
  }
  function envSteps(envs, iterations, stepsPerEnv) { return envs * iterations * stepsPerEnv; }

  root.PP = {
    rng: rng, discountedReturn: discountedReturn, horizonSteps: horizonSteps, horizonSeconds: horizonSeconds,
    presentValue: presentValue, softmax: softmax, gradLogPi: gradLogPi, reinforceEstimate: reinforceEstimate,
    tdError: tdError, gae: gae, gaeWeight: gaeWeight, halfLifeSteps: halfLifeSteps,
    clip: clip, clipObjective: clipObjective, clipCase: clipCase, ppoBatch: ppoBatch, envSteps: envSteps
  };
})(typeof window !== "undefined" ? window : globalThis);

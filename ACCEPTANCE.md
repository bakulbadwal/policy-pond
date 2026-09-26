# Policy Pond: acceptance criteria

Numeric checks are asserted against `window.PP` / `window.PPSim` (the pure math and the seeded toys). Behaviour checks were run in a real browser. Verified 25 Sep 2026.

## A. The math is right

| # | Check | Expected | Result |
|---|---|---|---|
| A1 | Return of reward 1 per step for 24 steps, γ = 0.99 | 21.43 = (1 − 0.99²⁴) / 0.01 | 21.4322 ✓ |
| A2 | Horizon 1/(1 − γ) at 50 Hz | γ = 0.99 → 100 steps = 2.0 s · γ = 0.9 → 10 steps = 0.2 s | ✓ |
| A3 | Clipped objective, ε = 0.2: L and dL/dr, case | r 1.3, A +1 → 1.2, 0, case 5 · r 0.7, A +1 → 0.7, 1, case 3 · r 0.7, A −1 → −0.8, 0, case 4 · r 1.3, A −1 → −1.3, −1, case 6 · r 1, A ±1 → ±1, ±1, cases 1/2 | all ✓ |
| A4 | GAE on rewards [1, 0, 0, 1], V = [0.5, 0.5, 0.5, 0.5], bootstrap 0, γ = 0.99 | δ = [0.995, −0.005, −0.005, 0.5] · λ = 0 → A₀ = 0.995 · λ = 1 → A₀ = 1.4703 = G₀ − V₀ (1.9703 − 0.5) | ✓ |
| A5 | GAE fade, γ = 0.99, λ = 0.95 | γλ = 0.9405; half-weight after 11.3 steps | ✓ |
| A6 | Microduck batch | 4,096 × 24 = 98,304 · minibatch 24,576 · 20 gradient steps per update | ✓ |
| A7 | Smoke test vs full velocity run | 64 × 5 × 24 = 7,680 vs 4,096 × 50,000 × 24 = 4.9152 × 10⁹ → ×640,000 | ✓ |
| A8 | Duck-time | 98,304 steps ÷ 50 Hz = 1,966 s ≈ 33 min per update · full run ≈ 3.1 years | ✓ |
| A9 | Present value | 10 crumbs, 30 steps away: γ 0.9 → 0.42 · γ 0.99 → 7.40 · break-even γ = 0.1^(1/30) = 0.9261 | ✓ |
| A10 | TD error | r 0, V 5 → 6, γ 0.99 → +0.94 · r 1, V 4 → 4 → +0.96 | ✓ |
| A11 | GAE presets use a self-consistent critic, V = k · 0.1 / (1 − γ) | "Nothing surprising": A = 0.000 at every plank, λ and γ · stumble, plank 5: λ 0 → 0.000, λ 0.95 → −0.596 · gust, plank 5, λ 0.95 → +0.749 · optimist (k = 1.3), plank 1, λ 0.95 → −0.389 | ✓ |
| A12 | Config fidelity | every value in `js/microduck.js` matches `microduck_velocity_env_cfg.py` @ `d424a0c` at the stated line (914–948); roller `entropy_coef = 0.03` at line 652 | ✓ |
| A14 | Exact tile values on the step 0 pond (value iteration, γ = 0.99, no day limit; the far bank is terminal, value 0) | habit 80%: tile 0 = +4.48, tile 6 = +18.41 · habit 50%: tile 0 = −25.12 · habit 30%: tile 0 = −78.92 · habit 100%: tile 0 = +10.01 | ✓ |
| A15 | TD(0) learning converges to them (α = 0.1, habit 80%, seeded) | biggest gap to the exact values 2.45 after 200 crossings, 0.68 after 2,000; changing the habit resets the estimates | ✓ |
| A16 | The rsl_rl loss block quoted in step 6 | matches `rsl_rl/algorithms/ppo.py` lines 268–285 and 309–310 at `857de61`, with only two `# type: ignore` comments removed; advantages are normalised over the whole batch at lines 190–191 | ✓ |
| A13 | Library behaviour (rsl_rl main @ `857de61`) | adaptive schedule: KL > 2 × desired → lr ÷ 1.5 (floor 1e-5); KL < desired / 2 → lr × 1.5 (ceiling 1e-2) (`ppo.py:241-256`) · `std_type="scalar"` = one learnable std per action dimension (`distribution.py:165-168`) | ✓ |

## B. The toys teach the right direction (seeded, same for every visitor)

| # | Check | Expected | Result |
|---|---|---|---|
| B1 | Baseline, 5-crumb finishing bonus, seed 21 | spread without Mama ≫ with Mama; true push unchanged | ± 3.08 vs ± 0.72, true +0.30 ✓ |
| B2 | Baseline, averaged over seeds 0–199 | spread grows with the bonus without a baseline, not with one | bonus 0/5/10: 1.30 / 3.23 / 5.49 vs 1.11 / 1.11 / 1.11 ✓ |
| B3 | REINFORCE converges | 200 crossings at α 0.1 → expected crumbs near 2.0 (route B) | 1.97 ✓ |
| B4 | Race, 40 ducklings each, bonus 5 | with Mama ends higher and tighter | ✓ |
| B5 | One batch reused 10 epochs (seed 42) | with the clip, ratios stop near the ropes (0.99 / 1.25 / 0.77); without it they run away (0.26 / 2.57 / 0.17). The clip removes the incentive rather than enforcing a bound: across seeds 40–59 one clipped ratio reaches 0.66, and the page says so | ✓ |
| B6 | Flock: 60 ducklings × 15 rounds, 12 crossings per batch, K = 40, seed 5 | more stuck without the clip | 1 stuck with ropes vs 9 without ✓ |
| B7 | Scorecard, walk, default weights | learner settles on "walks"; every penalty ≤ 0 | walks 99% ✓ |
| B8 | Scorecard, `track_velocity` = 0 | "stands still" (49.5 vs walking 37.5) | ✓ |
| B9 | Scorecard, `action_rate_l2` = +0.5 | still walks, but its log reads +5 and turns red | ✓ |
| B10 | Case 1 (butt-hop) | broken → hops; flip `joint_limit_penalty` to +1 → walks, all penalties ≤ 0 → pass; raise `upright` instead → walks but a penalty pays out → fail; delete the penalty → fail (guard removed) | ✓ |
| B11 | Case 2 (parking lot) | broken → lies on its back; `recovery_bonus` 0 + `rise_progress` 50 → stands, flop keeps 0% → pass; raise `upright` to 1.0 → stands but flop keeps 83% → fail | ✓ |
| B12 | Case 3 (attempt tax) | tax 1.0 from iteration 0 → never rolls; constant 0.2 → still never rolls; staircase from 0 starting at 150 over 100 → rolls, and the tax ends at 1.0 → pass | ✓ |
| B13 | Domain randomization, range ±0.3, real friction 1.15 | one-floor duck falls; randomized duck ≈ 0.66; on the training floor 1.0 vs ≈ 0.75 | ✓ |

## C. It teaches

- C1 Every step is interactive, with live visuals.
- C2 Every step 0–6 has at least one predict-then-reveal question.
- C3 Every step ends with a "say it out loud" line that unlocks after the predictions and three interactions.
- C4 Every technical term has a tooltip with its plain meaning and its pond equivalent.
- C5 Every step names the course unit it covers, or says plainly that it isn't in the course (GAE, reward design).
- C6 The honesty note is on the page and in the README.
- C7 Capstone: three cases, each with checks on the behaviour *and* the fix, plus a named cause. Known-good fixes pass, known-bad fixes fail for the stated reason (B10–B12).
- C8 Field test: eight questions answered by operating the widgets, graded automatically (8/8 on right answers, 0/8 on wrong ones). Every question is answerable from a widget; question 2 asks for the K = 40 flock's stuck count (9, from B6).
- C9 The flock plays out round by round (round 0 = untrained, 15 = final); the step 5 and review-board learners play their 300 updates before the log audit appears. The learner animation is time-based with a timeout fallback, so the audit and the grade land within ~1.2 s even in a background tab where animation frames are throttled (verified: 1,212 ms with the tab hidden). Both jump straight to the end under `prefers-reduced-motion`.
- C10 Every step but the last ends with a "Next: …" button.
- C11 Step 2 shows the critic being trained ("Watch Mama learn"): TD(0) estimates per tile against the exact values, with a prediction that turns on V(s) depending on the policy (A14). Step 6 quotes the real rsl_rl loss with every line mapped to a pond term and the step that taught it (A16).
- C12 Social previews use a 1200 × 630 card (`docs/share.png`) declared in `og:image` with width, height and `twitter:card`.

## D. It works

- D1 Opens straight from the file: no server, no build step, no fetch of local files.
- D2 Zero console errors across all steps.
- D3 No horizontal page scroll at 375 px in any step.
- D4 Progress persists across reloads in localStorage, wrapped so it degrades safely.
- D5 Loads at the top of the page even with a `#step` link (the browser's fragment jump is undone after load).
- D6 A fresh-context adversarial review finds no open correctness issue. Run 25 Sep 2026: 1 blocker (the GAE presets used a critic inconsistent with γ), 3 major, 7 minor. All fixed and re-verified.
- D7 Changing the URL hash on an already-open page (pasting `#s5`, a hash link) switches the step. Found and fixed in the second review pass, 25 Sep 2026.

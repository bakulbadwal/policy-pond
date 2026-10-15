# Acceptance

Every number the page quotes, as `node tests/check.js` prints it (seeded: the same on every machine). The page computes the same numbers live, with the same seeds and the same fleet configurations (`DC.FLEETS`, `DC.CASES`, `DC.FIELD` in `js/core.js`); the checks marked ✓ are the invariants the build must keep.

```

Machinery
  ✓ the instructor's distances satisfy D(s) = 1 + min over moves (a shortest path)
  lesson starts: 160 poses; the exam uses 24 of them
  ✓ Bellman target y = r + γ Σ π(a'|s')[Q̄(s',a') − α log π(a'|s')] (by hand)
  ✓ a terminal transition's target is just its reward
  ✓ actor loss gradient matches finite differences (max error 3.3e-11)
  ✓ temperature loss gradient (w.r.t. log α) matches finite differences
  ✓ examiner (logistic regression) gradient matches finite differences (max error 4.6e-10)
  ✓ the target copy, computed lazily, equals Q̄ ← τQ + (1 − τ)Q̄ applied after every step
  ✓ the page's fast SAC update equals the reference update
  ✓ a seeded training run is the same every time

Step 0 · The lot (2,000 lessons with the untrained student, picking moves at random)
  parked straight in the exam bay 8 times (0.4%) · crashed 95% · ended in a staff bay 79 · 4.1 moves a lesson · 26.4 lot-hours
  ✓ random driving almost never parks in the exam bay
  the instructor's 20 demo drives: 9.4 moves on average (shortest possible from the same starts: 8.2), all 20 parked

Step 1 · Every lesson twice (the practice box, 8 runs each; exam = 24 fixed starts)
  rf: 50: 10% @ 38 min · 100: 21% @ 76 min · 200: 33% @ 145 min · 300: 50% @ 206 min · 600: 76% @ 353 min · fleet average reaches 75% at lesson 557 (334 lot-min) · each logged move studied 1× on average
  utd1: 50: 8% @ 39 min · 100: 22% @ 76 min · 200: 45% @ 149 min · 300: 76% @ 213 min · fleet average reaches 75% at lesson 300 (213 lot-min) · each logged move studied 16× on average
  utd4: 50: 17% @ 38 min · 100: 33% @ 75 min · 200: 62% @ 134 min · 300: 82% @ 182 min · fleet average reaches 75% at lesson 253 (160 lot-min) · each logged move studied 63× on average
  utd16: 50: 15% @ 38 min · 100: 34% @ 74 min · 200: 71% @ 133 min · 300: 80% @ 180 min · fleet average reaches 75% at lesson 243 (154 lot-min) · each logged move studied 253× on average
  ✓ off-policy SAC (4 updates a move) reaches 75% in under two-thirds of the lessons REINFORCE needs
  ✓ after 200 lessons SAC's exam is at least 15 points above REINFORCE's
  ✓ 4 updates a move beats 1 after 200 lessons
  REINFORCE learning-rate sweep (600 lessons, mean final exam): lr 3: 62% · lr 10: 76% · lr 30: 72% (the page uses lr 10)

Step 2 · The soft critic
  after 60 lessons: 251 moves in the logbook, 888 gradient steps, α = 0.201
  page 'reached the box': (8,5) h2 → move 2, r = 1, done = true · Q = 1.000 · y = 1.000
  page 'hit something': (0,5) h5 → move 2, r = 0, done = true · Q = 0.000 · y = 0.000
  page 'one move short': (9,7) h7 → move 0, r = 0, done = false · Q = 0.336 · y = 0.326 · V̄(s') = 0.344
  hot: final exam 4% · reaches 75% at lesson – · final α 1.000 · after 300 lessons the lessons average 12.0 moves
  auto: final exam 82% · reaches 75% at lesson 253 · final α 0.013 · after 300 lessons the lessons average 9.4 moves
  cool: final exam 76% · reaches 75% at lesson 275 · final α 0.010 · after 300 lessons the lessons average 10.5 moves
  off: final exam 80% · reaches 75% at lesson 231 · final α 0.000 · after 300 lessons the lessons average 10.6 moves
  tau1: final exam 85% · reaches 75% at lesson 202 · final α 0.025 · after 300 lessons the lessons average 10.5 moves
  tau05: final exam 82% · reaches 75% at lesson 225 · final α 0.020 · after 300 lessons the lessons average 10.0 moves
  ✓ a temperature stuck at 1 keeps the student dithering (exam under 40%); tuned from the same start, over 70%
  Q = (0.62, 0.70, 0.55), α = 1: π ∝ exp(Q/α) = (0.33, 0.36, 0.31), entropy 1.10 nats (max ln 3 = 1.10)
  Q = (0.62, 0.70, 0.55), α = 0.1: π ∝ exp(Q/α) = (0.27, 0.60, 0.13), entropy 0.93 nats (max ln 3 = 1.10)
  Q = (0.62, 0.70, 0.55), α = 0.01: π ∝ exp(Q/α) = (0.00, 1.00, 0.00), entropy 0.00 nats (max ln 3 = 1.10)

Step 3 · The examiner (logistic regression on a 5 × 4 dashcam photo)
  training photos: 133 (40 parked in the exam bay, 93 from 10 instructor drives) · loss 0.005
  threshold 0.5: test set (138 photos) accuracy 100.0%, precision 100.0%, recall 100.0% · exam bay passed 100% · staff bay passed 100%
  threshold 0.9: test set (138 photos) accuracy 100.0%, precision 100.0%, recall 100.0% · exam bay passed 100% · staff bay passed 100%
  threshold 0.99: test set (138 photos) accuracy 100.0%, precision 100.0%, recall 100.0% · exam bay passed 100% · staff bay passed 88%
  threshold 0.999: test set (138 photos) accuracy 76.8%, precision 100.0%, recall 20.0% · exam bay passed 24% · staff bay passed 0%
  her mean score: exam bay 0.998 · staff bay 0.994 · exam bay crooked 0.028
  ✓ the examiner scores over 95% on a fresh test set collected the same way
  ✓ …and passes a straight park in a staff bay over 90% of the time
  ✓ …scoring the staff bay about as high as the exam bay, so no threshold separates them cleanly
  poses (other than the exam bay) she passes more than 2% of the time: 2 before, 0 after 30 extra negatives (163 photos) · exam bay still passed 100% · staff bay 0% (mean score 0.012)
  ✓ her only false passes are the two staff bays, and 30 photos of them fix it
  human: exam 81% (examiner says 81%, staff bays 0%) · fleet average reaches 80% at lesson 150 (92 lot-min) · runs reaching it 3/8 · lot 92 min · instructor 0.0 min · crashes 86
  naive: exam 49% (examiner says 85%, staff bays 36%) · fleet average reaches 80% at lesson – · runs reaching it 1/8 · lot 89 min · instructor 0.0 min · crashes 83
  thr99: exam 60% (examiner says 82%, staff bays 24%) · fleet average reaches 80% at lesson – · runs reaching it 4/8 · lot 89 min · instructor 0.0 min · crashes 83
  thr999: exam 81% (examiner says 14%, staff bays 1%) · fleet average reaches 80% at lesson 148 (92 lot-min) · runs reaching it 4/8 · lot 93 min · instructor 0.0 min · crashes 88
  more: exam 72% (examiner says 82%, staff bays 10%) · fleet average reaches 80% at lesson – · runs reaching it 3/8 · lot 88 min · instructor 0.0 min · crashes 79
  fixed: exam 81% (examiner says 81%, staff bays 0%) · fleet average reaches 80% at lesson 150 (92 lot-min) · runs reaching it 3/8 · lot 92 min · instructor 0.0 min · crashes 86
  ✓ trained on the naive examiner, the student parks in staff bays and she says it passed
  ✓ with 30 extra negatives the exploit is gone and her verdict matches the truth

Step 4 · The instructor's drives (RLPD: half of every batch from the demo logbook)
  d0: exam 46% (examiner says 46%, staff bays 0%) · fleet average reaches 80% at lesson – · runs reaching it 0/8 · lot 192 min · instructor 0.0 min · crashes 189 · first lesson parked (median) 167
  d5: exam 77% (examiner says 77%, staff bays 1%) · fleet average reaches 80% at lesson – · runs reaching it 1/8 · lot 151 min · instructor 0.0 min · crashes 136 · first lesson parked (median) 30
  d10: exam 84% (examiner says 84%, staff bays 0%) · fleet average reaches 80% at lesson 231 (133 lot-min) · runs reaching it 5/8 · lot 141 min · instructor 0.0 min · crashes 118 · first lesson parked (median) 30
  d20: exam 85% (examiner says 85%, staff bays 0%) · fleet average reaches 80% at lesson 150 (92 lot-min) · runs reaching it 5/8 · lot 134 min · instructor 0.0 min · crashes 107 · first lesson parked (median) 22
  d30: exam 88% (examiner says 88%, staff bays 0%) · fleet average reaches 80% at lesson 103 (67 lot-min) · runs reaching it 7/8 · lot 132 min · instructor 0.0 min · crashes 102 · first lesson parked (median) 23
  pour: exam 90% (examiner says 90%, staff bays 0%) · fleet average reaches 80% at lesson 130 (77 lot-min) · runs reaching it 8/8 · lot 127 min · instructor 0.0 min · crashes 95 · first lesson parked (median) 21
  ✓ with no demonstrations no run reaches 80% in 250 lessons
  ✓ more demonstrations, more runs reach 80%
  the 20 demo drives hold 188 moves
  share of each batch from the demos after 50 / 250 lessons: 50/50 sampling 50% / 50% · poured into one logbook 43% / 9%

Step 5 · Dual controls (interventions; 20 demos; 150 lessons)
  none: exam 81% (examiner says 81%, staff bays 0%) · fleet average reaches 80% at lesson 150 (92 lot-min) · runs reaching it 3/8 · lot 92 min · instructor 0.0 min · crashes 86 · intervention rate, lessons 1–20 / 21–40 / 61–80 / 131–150: 0% / 0% / 0% / 0%
  rare: exam 88% (examiner says 88%, staff bays 0%) · fleet average reaches 80% at lesson 69 (45 lot-min) · runs reaching it 6/8 · lot 78 min · instructor 1.0 min · crashes 57 · intervention rate, lessons 1–20 / 21–40 / 61–80 / 131–150: 8% / 10% / 5% / 3%
  half: exam 95% (examiner says 95%, staff bays 0%) · fleet average reaches 80% at lesson 27 (19 lot-min) · runs reaching it 8/8 · lot 70 min · instructor 1.9 min · crashes 35 · intervention rate, lessons 1–20 / 21–40 / 61–80 / 131–150: 17% / 11% / 6% / 2%
  short: exam 98% (examiner says 98%, staff bays 0%) · fleet average reaches 80% at lesson 11 (5 lot-min) · runs reaching it 8/8 · lot 55 min · instructor 3.0 min · crashes 0 · intervention rate, lessons 1–20 / 21–40 / 61–80 / 131–150: 31% / 9% / 4% / 2%
  long: exam 96% (examiner says 96%, staff bays 0%) · fleet average reaches 80% at lesson 22 (8 lot-min) · runs reaching it 8/8 · lot 51 min · instructor 6.6 min · crashes 0 · intervention rate, lessons 1–20 / 21–40 / 61–80 / 131–150: 66% / 35% / 17% / 12%
  backseat: exam 95% (examiner says 95%, staff bays 0%) · fleet average reaches 80% at lesson 22 (7 lot-min) · runs reaching it 8/8 · lot 46 min · instructor 11.6 min · crashes 0 · intervention rate, lessons 1–20 / 21–40 / 61–80 / 131–150: 88% / 73% / 45% / 40%
  alone: exam 93% (examiner says 93%, staff bays 0%) · fleet average reaches 80% at lesson 35 (16 lot-min) · runs reaching it 8/8 · lot 60 min · instructor 3.9 min · crashes 0 · intervention rate, lessons 1–20 / 21–40 / 61–80 / 131–150: 36% / 11% / 6% / 2%
  ✓ short corrections reach 80% sooner than no corrections
  ✓ with short corrections the intervention rate falls from over 20% to under 5%
  ✓ the backseat driver's intervention rate is still over 20% at the end
  ✓ the backseat driver spends over twice the instructor-minutes
  ✓ catching a fifth of the mistakes is slower than catching all of them
  lesson 1 of seed 3, short corrections: 10 moves, 5 by the instructor

Step 6 · The real lot (the fence, resets and the clock; 20 demos, no instructor, 250 lessons)
  no fence: exam 85% (examiner says 85%, staff bays 0%) · fleet average reaches 80% at lesson 150 (92 lot-min) · runs reaching it 5/8 · lot 134 min · instructor 0.0 min · crashes 107 · bumps 0
  fence: exam 92% (examiner says 92%, staff bays 0%) · fleet average reaches 80% at lesson 159 (80 lot-min) · runs reaching it 8/8 · lot 116 min · instructor 0.0 min · crashes 18 · bumps 1752
  ✓ the fence turns over 40% of the crashes into bumps
  ✓ with the fence the same 250 lessons take fewer lot-minutes
  reset 5 s: reaches 80% at lesson 159 = 68 lot-min · 250 lessons = 97 lot-min
  reset 10 s: reaches 80% at lesson 159 = 80 lot-min · 250 lessons = 116 lot-min
  reset 30 s: reaches 80% at lesson 159 = 129 lot-min · 250 lessons = 194 lot-min
  reset 60 s: reaches 80% at lesson 159 = 205 lot-min · 250 lessons = 314 lot-min
  everything on (20 demos, short corrections, the examiner judged by eye): 80% at lesson 11 = 5 lot-min

Review board (each fix re-run on 8 seeds)
  Case 1 · The student who parks next door
    as configured: exam 49% · examiner says 85% · staff bays 36%
    [wrong] Raise the examiner's threshold to 0.99: exam 60% · examiner says 82% · staff bays 24% → fails
  ✓     the tempting fix fails: Raise the examiner's threshold to 0.99
    [wrong] Give the student 20 more demo drives (40 in all): exam 72% · examiner says 82% · staff bays 10% → fails
  ✓     the tempting fix fails: Give the student 20 more demo drives (40 in all)
    [right] Photograph her false passes (staff bays, crooked parks): 30 extra negatives, retrain her: exam 81% · examiner says 81% · staff bays 0% → passes
  ✓     the right fix passes: Photograph her false passes (staff bays, crooked parks): 30 extra negatives, retrain her
  Case 2 · The dawdler
    as configured: exam 0% · instructor 5.5 min · final α 1.00
    [right] Switch temperature tuning back on (target entropy 0.15): exam 98% · instructor 3.0 min · final α 0.08 → passes
  ✓     the right fix passes: Switch temperature tuning back on (target entropy 0.15)
    [wrong] Give it 20 more demo drives (40 in all): exam 0% · instructor 5.4 min · final α 1.00 → fails
  ✓     the tempting fix fails: Give it 20 more demo drives (40 in all)
    [wrong] Have the instructor take over for longer: drive it all the way into the bay: exam 1% · instructor 13.7 min · final α 1.00 → fails
  ✓     the tempting fix fails: Have the instructor take over for longer: drive it all the way into the bay
  Case 3 · The backseat driver
    as configured: exam 95% · instructor 11.6 min · last-20 rate 40%
    [wrong] Give it 20 more demo drives (40 in all): exam 97% · instructor 12.3 min · last-20 rate 50% → fails
  ✓     the tempting fix fails: Give it 20 more demo drives (40 in all)
    [right] Only take over when it's about to fail, for three moves, then hand back: exam 98% · instructor 3.0 min · last-20 rate 2% → passes
  ✓     the right fix passes: Only take over when it's about to fail, for three moves, then hand back
    [wrong] Only take over when it's about to fail, but still drive it all the way in: exam 96% · instructor 6.6 min · last-20 rate 12% → fails
  ✓     the tempting fix fails: Only take over when it's about to fail, but still drive it all the way in

Field test answers (each recomputed)
  1. Two thousand lessons of random driving: how many park straight in the exam bay? → 8 (computed 8.000)
  ✓     answer 1 matches the widget
  2. SAC with 4 study batches per move: at which lesson does the fleet's average exam reach 75%? → 253 (computed 253.000)
  ✓     answer 2 matches the widget
  3. REINFORCE: the fleet's average exam after 200 lessons, in percent? → 33 (computed 33.333)
  ✓     answer 3 matches the widget
  4. The page “one move short”: its Bellman target y? → 0.326 (computed 0.326)
  ✓     answer 4 matches the widget
  5. The dither dial at α = 0.10: the chance of the best move, in percent? → 60 (computed 59.792)
  ✓     answer 5 matches the widget
  6. The examiner as first trained, threshold 0.999: her recall on the test set, in percent? → 20 (computed 20.000)
  ✓     answer 6 matches the widget
  7. Students paid by the examiner as first trained: the share of exam starts that end in a staff bay, in percent? → 36 (computed 35.938)
  ✓     answer 7 matches the widget
  8. With 20 demo drives: the median lesson at which a student first parks? → 22 (computed 22.000)
  ✓     answer 8 matches the widget
  9. Short corrections: the instructor's minutes of driving over all 150 lessons, averaged over the 8 students? → 3 (computed 3.042)
  ✓     answer 9 matches the widget
  10. Fence on, 30-second resets: lot-minutes until the fleet averages 80%? → 129 (computed 128.723)
  ✓     answer 10 matches the widget

all checks passed · 74.9 s
```

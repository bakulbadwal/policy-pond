# Product

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, no dependencies. Hosted on GitHub Pages (https://bakulbadwal.github.io/policy-pond/dual-controls/). Must also work opened straight from the file.

## Users

Primary: the author, an MBA (UVA Darden '27) who isn't an engineer and wants to read the real-world RL part of Hugging Face's *Robot Learning: A Tutorial* (§3), the HIL-SERL paper and LeRobot's HIL-SERL guide with the right picture in his head. Secondary: people working through the Hugging Face Robotics Course and LeRobot who want to know what HIL-SERL's knobs do before they spend an afternoon at a real arm, and anyone the author shares it with.

## Product purpose

Teach why reinforcement learning on a real robot is a problem of minutes, and the four things HIL-SERL does about it:

1. **Reuse every minute.** Off-policy learning (SAC) keeps every transition in a replay buffer and learns from it many times; on-policy learning (Policy Pond's REINFORCE and PPO) throws each episode away after an update.
2. **Learn the reward, and fix its false positives.** Nothing computes "success" on a real robot, so a classifier on camera images does; the policy will find its false positives, and extra negatives fix them.
3. **Start from demonstrations.** A small demo buffer, half of every batch (RLPD), tells the critic where reward is from the first update.
4. **Correct briefly, where it fails.** Human interventions go into both buffers; short, specific corrections make the intervention rate fall; long takeovers don't.

Plus the setting that makes all of it necessary: workspace bounds, resets and the wall clock.

Success: after about 70 minutes of play, the reader can explain why off-policy RL suits a real robot, what SAC's critic, actor, temperature and target network do, why a learned reward gets exploited and how HIL-SERL guards against it, why demos are sampled half-and-half, what good interventions look like and why the intervention rate should fall, and can read HIL-SERL §3 and LeRobot's HIL-SERL guide without a glossary.

## Positioning

The interactive RL explainers are about learning in simulation (gridworlds, browser walkers, this series' Policy Pond and Reward Arcade). HIL-SERL and real-world RL are explained in papers, the tutorial and a static guide. Nothing found lets you train a reward classifier and watch a policy exploit it, put demonstrations and interventions on the same seeds, count lot-minutes, and watch the intervention rate fall. That is this lab. It doesn't re-teach REINFORCE, PPO, GAE, reward hacking in general or evaluation with error bars: Policy Pond and Reward Arcade do.

## Operating context

Used at a laptop in study sessions, and on a phone when shared. Steps are done in order (0–6, review board, field test) but people jump between them. Progress persists in localStorage. Nothing trains until a button is pressed; fleets of 8 seeded students train lesson by lesson in small slices so the page stays responsive (a few seconds per fleet; UTD 16 about ten).

## Constraints

- Every number comes from `js/core.js` (the real algorithms on a seeded toy lot). `ACCEPTANCE.md` lists the verified values; `node tests/check.js` prints them and recomputes every field-test answer.
- The honesty note (what's exact vs a teaching model) must remain, on the page and in the README.
- Numbers quoted from papers and code are cited and not altered (see `SOURCES.md`).
- The driving school is the vocabulary: the student driver = the robot, its habits = the policy, the lot = the real world, the exam bay = the task, the examiner = the reward classifier, her dashcam photos = camera observations, the threshold = her success threshold, the staff bays = her false positives, the logbook = the replay buffer, studying batches per move = the update-to-data ratio, the critic = Q, the slow copy = the target network, the dither dial = the temperature, the instructor's drives = demonstrations, her book = the demo buffer, the dual controls = human interventions, her share of the moves = the intervention rate, the fence = workspace bounds, the reset truck = resets, the lot clock = the wall clock.

## Brand commitments

- Name: **Dual Controls**. A sibling of Inference Kitchen, Policy Pond, Demos to Deployment and the rest: same design system, a driving-school palette and a learner-plate red masthead.
- Must not look like "every AI tool" (dark ground, neon accent, glowing cards) or like a corporate SaaS dashboard.

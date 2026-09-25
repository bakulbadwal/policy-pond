# Product

## Platform

web

## Stack

Static HTML/CSS/JS, no build step, no dependencies. Hosted on GitHub Pages (https://bakulbadwal.github.io/policy-pond/). Must also work opened straight from the file.

## Users

Primary: the author, an MBA (UVA Darden '27) who isn't an engineer and wants deep RL intuition, PPO in particular, well enough to read a real robot's training config. Secondary: people learning RL for robotics who find the Hugging Face Deep RL Course's PPO pages too static, and anyone the author shares it with.

## Product purpose

Teach how robots learn by trial and error (return and discounting, policy gradients and their variance, the critic and the TD error, PPO's clip and why it makes batch reuse safe, GAE, reward design and reward hacking, domain randomization) through direct manipulation of real algorithms. Success: after about 90 minutes of play, the reader can open Microduck's `rsl_rl` config and explain every PPO setting in it.

## Positioning

Interactive RL explainers exist for tabular methods (gridworlds, Q-learning, TD vs Monte Carlo). PPO, GAE and reward design are taught with static pages. This lab makes those interactive, runs the real algorithms, and ties the reward-design lessons to a real open-source robot's playbook.

## Operating context

Used at a laptop in study sessions, and on a phone when shared. Steps are done in order (0–6, review board, field test), but people also jump between them. Progress persists in localStorage.

## Constraints

- Every number comes from `js/core.js` (exact) or `js/sim.js` (seeded toys running real learners). `ACCEPTANCE.md` lists the verified values.
- The honesty note (what's exact vs a teaching model) must remain, on the page and in the README.
- Microduck's config values stay pinned to a commit and cite their source lines.
- The pond analogy is the vocabulary: duckling = agent, habits = policy, pond = environment, breadcrumbs = reward, crossing = episode, Mama Duck = critic, lane ropes = PPO's clip, scorecard = reward function, the flock = parallel environments.

## Brand commitments

- Name: **Policy Pond**. A sibling of Inference Kitchen: same design system, pond palette.
- Must not look like "every AI tool" (dark ground, neon accent, glowing cards) or like a corporate SaaS dashboard.

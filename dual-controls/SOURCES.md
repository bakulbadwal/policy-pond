# Sources

Every figure the page quotes from a paper or a codebase, with where it comes from. Checked against the arXiv full texts (via the Hugging Face paper mirror) and the LeRobot repository (main at 53feaef, 2026-10-14), on 2026-10-15. Numbers the page computes itself are in [`ACCEPTANCE.md`](ACCEPTANCE.md), not here.

## HIL-SERL

Luo, Xu, Wu & Levine, [*Precise and Dexterous Robotic Manipulation via Human-in-the-Loop Reinforcement Learning*](https://arxiv.org/abs/2410.21845) (arXiv 2410.21845, v3).

- Abstract / §1: "near-perfect success rates and fast cycle times within just 1 to 2.5 hours of training"; "an average 2x improvement in success rate and 1.8x faster execution" over imitation baselines.
- §3.1: "For all our tasks, we employ a sparse reward function. This function makes a binary decision on whether a task is successful or not using a trained classifier." RLPD is the base: "At each training step, RLPD samples equally between prior data and on-policy data". Eq. 1 (critic loss with a target network Q_φ̄) and eq. 2 (actor loss with entropy weight α, "adaptively adjusted").
- §3.2: "a human can intervene the robot by using a SpaceMouse"; the demo buffer holds demonstrations "usually on the range of 20-30"; "The learner process samples data equally from the demo and RL replay buffers".
- §3.3: a pretrained ResNet-10 vision backbone; "an impedance controller with reference limiting in the real-time layer to ensure safety".
- §3.4: "We store the intervention data in both the demonstration and RL data buffers. However, we add the policy's transitions (i.e., the states and actions before and after the intervention) only to the RL buffer." "In the beginning of the training process, the human intervenes more frequently … gradually decreasing the frequency as the policy improves." "the policy improves faster when the human operator issues specific corrections while letting the robot explore on its own otherwise." Compared to HG-DAgger, but the data optimize the policy with RL.
- §3.5: images cropped and resized to 128 × 128; the classifier: "Typically, we gather 200 positive data points and 1000 negative data points … it usually takes around 5 minutes"; "we may collect extra data to address any false negative and false positive issues"; "accuracy of greater than 95% in the evaluation data set". "We should avoid persistently providing long sparse interventions that lead to task successes. Such an intervention strategy will cause the overestimation of the value function, particularly in the early stages of the training process".
- §4.3: intervention rate = "the ratio of intervened timesteps to total timesteps within an episode", reported as a running average over 20 episodes; training time "includes all scripted motion, policy rollouts, intended stops, as well as onboard computation". Table 1a: average cycle time 9.6 s (HG-DAgger) vs 5.4 s.
- §4.5 / Table 1b: "RL from scratch, without any demonstrations or corrections, achieved 0% success rate on all tasks"; the ablation without interventions (demonstrations only) averages 49% against 100% for HIL-SERL (RAM 48, dashboard 0, flipping 100).

## Robot Learning: A Tutorial

Capuano, Pascal, Zouitine, Wolf & Aractingi, [arXiv 2510.12403](https://arxiv.org/abs/2510.12403) (v1, 14 Oct 2025), §3 "Robot (Reinforcement) Learning".

- "Real-world RL for Robotics": early actions "may command high velocities, self-collisiding configurations … Mitigating these risks requires external safeguards (e.g., watchdogs, safety monitors, emergency stops)"; resets are "a time-consuming and error-prone process".
- "Off-policy algorithms like Soft Actor-Critic (SAC) (Haarnoja et al., 2018) tend to be more sample efficient then their on-policy counterpart … due to the presence a replay buffer".
- Eqs. 15–17: the maximum-entropy objective, the soft TD target, and SAC's policy update. RLPD: "transitions from both the offline and online replay buffers are sampled in equal proportions". HIL-SERL: "near-perfect success rates (99%+) on diverse manipulation tasks within 1-2 hours of training"; Fig. 16 shows an intervention on an SO-100; the code examples train a reward classifier and run an actor and a learner.

## LeRobot (HIL-SERL guide and code)

[docs/source/hilserl.mdx](https://huggingface.co/docs/lerobot/hilserl) and `src/lerobot` at main 53feaef.

- Guide: the three ingredients (offline demonstrations and a reward classifier; an actor/learner loop with human interventions; "joint/end-effector (EE) bounds" among the safety tools). Interventions by gamepad trigger, the `space` key, or an SO-101 leader arm. "Avoid intervening for long periods of time." "The ideal behaviour is that your intervention rate should drop gradually during training." `temperature_init`: "A good starting point is `1e-2`. We observed that setting it too high can make human interventions ineffective and slow down learning."
- Guide, workspace bounds: run `lerobot-find-joint-limits`, record the end-effector's min and max, put them in `end_effector_bounds`; "Bounding the action space will reduce the redundant exploration of the agent and guarantees safety."
- `rl/algorithms/sac/configuration_sac.py`: `discount` 0.99, `critic_target_update_weight` 0.005, `num_critics` 2, `temperature_init` 1.0, `target_entropy` default −|A|/2, `utd_ratio` 1.
- `rl/train_rl.py`: `online_ratio: float = 0.5` ("Fraction sampled from online replay when using OnlineOfflineMixer").
- `rl/learner.py`: every transition goes to the online buffer; "Add to offline buffer if it's an intervention".
- `envs/configs.py`, `processor/hil_processor.py`: `success_threshold` 0.5; reset `reset_time_s` 5.0 in the guide's `ResetConfig`; `terminate_on_success`; env `fps` 10.
- `robots/so_follower/robot_kinematic_processor.py`: `EEBoundsAndSafety` "Clips the end-effector pose to predefined bounds and checks for unsafe jumps".

## Soft actor-critic

Haarnoja et al., [*Soft Actor-Critic Algorithms and Applications*](https://arxiv.org/abs/1812.05905) (2018).

- Eqs. 1–7: the maximum-entropy objective, soft value V(s) = E[Q − α log π], the soft Bellman residual with a target soft Q-function "obtained as an exponentially moving average".
- Eq. 18: J(α) = E[−α log π − α H̄], learned by gradient steps; Table 1: τ = 0.005, entropy target −dim(A).
- §7.2: a Minitaur learned to walk from "160k environment steps … approximately 2 hours of real-world training time". §7.3: valve rotation from images took "the equivalent of 20 hours"; from the valve position, 3 hours, "substantially faster than … PPO (7.4 hours)".

Christodoulou, [*Soft Actor-Critic for Discrete Action Settings*](https://arxiv.org/abs/1910.07207) (2019): eqs. 10–12 give the discrete soft value V(s) = π(s)ᵀ[Q(s) − α log π(s)], the temperature loss and the actor loss as exact sums; Table 2 uses an entropy target of 0.98 · (−log(1/|A|)). The lab uses 0.15 nats instead (a choice for this toy, stated on the page).

## RLPD

Ball, Smith, Kostrikov & Levine, [*Efficient Online Reinforcement Learning with Offline Data*](https://arxiv.org/abs/2302.02948) (ICML 2023).

- §4.1: "symmetric sampling, whereby for each batch we sample 50% of the data from our replay buffer, and the remaining 50% from the offline data buffer".
- §4.2: LayerNorm "bounds the values" of the critic; §4.3: higher update-to-data ratios with critic ensembles.
- §5: "we test increasing UTD to 10 on one of the tasks" (pixel-based Cheetah Run), with "a remarkable improvement".
- §5.1, Figs. 10–12: symmetric sampling vs initializing the buffer with offline data: "improves sample efficiency and reduces variance across seeds"; "RLPD is not very sensitive to sampling proportion".

## Not verified, so not on the page

- No quantitative claim about HIL-SERL's learning curves (Fig. 5) is quoted; the figure was not read numerically.
- The LeRobot guide says human interventions cut "the number of steps where the policy starts achieving the maximum reward … by a quarter"; the page doesn't quote it, as its meaning (to a quarter, or by 25%) is ambiguous.

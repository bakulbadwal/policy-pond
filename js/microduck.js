/* The real config: Microduck's PPO settings, copied from pollen-robotics/microduck_rl
   at commit d424a0c (2026-08-27), file src/mjlab_microduck/tasks/microduck_velocity_env_cfg.py.
   Every line number below was checked against that commit. Exposed as window.PP_MICRODUCK. */
window.PP_MICRODUCK = {
  repo: "pollen-robotics/microduck_rl",
  commit: "d424a0c",
  file: "src/mjlab_microduck/tasks/microduck_velocity_env_cfg.py",
  url: "https://github.com/pollen-robotics/microduck_rl/blob/d424a0c/src/mjlab_microduck/tasks/microduck_velocity_env_cfg.py",
  envs: 4096,          // the repo's own train command: --env.scene.num-envs 4096 (README, AGENTS.md)
  smoke: { envs: 64, iters: 5 },  // AGENTS.md: "A 5-iteration smoke test at 64 envs catches ~95% of config errors for cents."
  hz: 50,
  // [key, value as written, line, step that teaches it, plain meaning, turn it up / down]
  knobs: [
    ["hidden_dims", "(512, 256, 128)", 914, "s1", "The actor: a small neural net with three layers of 512, 256 and 128 units. It reads the robot's senses and outputs its habits.", "Bigger learns more but trains slower."],
    ["activation", "\"elu\"", 915, "s1", "The bend inside each layer of the net (ELU, a smooth relative of ReLU).", "Rarely changed."],
    ["obs_normalization", "True", 916, "s6", "Rescale every sense (angles, speeds) to a similar range using running averages, so no single number dominates. Must be baked into the exported model.", "Off: raw numbers in wildly different units make learning much harder."],
    ["init_std", "1.0", 919, "s1", "How wobbly the duck's habits start: the spread of the Gaussian each joint target is drawn from. That spread is how it explores.", "Up: more exploring, more falling early. Down: explores less, can get stuck."],
    ["std_type", "\"scalar\"", 920, "s1", "How the wobble is stored: one learnable spread per joint, kept as a plain number (\"log\" would store its logarithm instead). It is learned, and it doesn't depend on the situation. Checked in rsl_rl's distribution.py.", "—"],
    ["value_loss_coef", "1.0", 929, "s2", "How much the critic's own mistakes count in the combined loss.", "Up: the critic learns faster relative to the actor."],
    ["use_clipped_value_loss", "True", 930, "s3", "The same lane-rope idea applied to the critic: its guess can't jump too far in one update.", "Off: one odd batch can throw the critic's guesses, and every advantage with them."],
    ["clip_param", "0.2", 931, "s3", "ε, the lane ropes. The ratio new ÷ old is trusted between 0.8 and 1.2.", "Up: bigger steps, more risk of the cliff. Down: safer, slower."],
    ["entropy_coef", "0.01", 932, "s0", "A small bonus for keeping the habits spread out: exploration pressure. The roller-skating task uses 0.03.", "Up: explores longer. Down: commits sooner, maybe to a worse gait."],
    ["num_learning_epochs", "5", 933, "s3", "K: how many times each batch is reused before it's thrown away.", "Up: squeezes more from each batch, leans harder on the clip."],
    ["num_mini_batches", "4", 934, "s3", "Each epoch splits the batch into 4 pieces, one gradient step each. 5 × 4 = 20 steps per batch.", "Up: more, noisier steps."],
    ["learning_rate", "1.0e-3", 935, "s1", "The starting size of each nudge to the network's weights (α). With the adaptive schedule below, rsl_rl rescales it after every minibatch, so 1e-3 is only where it begins.", "Up: faster but jumpier."],
    ["schedule", "\"adaptive\"", 936, "s6", "The learning rate steers itself. rsl_rl measures each update's size as KL divergence: above 2 × desired_kl it divides the rate by 1.5, below half of desired_kl it multiplies by 1.5 (kept between 0.00001 and 0.01). Checked in rsl_rl's ppo.py.", "—"],
    ["gamma", "0.99", 937, "s0", "γ, the discount. 1/(1−γ) = 100 steps = about 2 seconds ahead at 50 Hz.", "Up: plans further ahead, noisier returns. Down: short-sighted."],
    ["lam", "0.95", 938, "s4", "λ, the GAE dial. About 20 steps of real rewards, then the critic's guess for everything beyond.", "Up (→1): less bias, more noise. Down (→0): steadier, leans on the critic."],
    ["desired_kl", "0.01", 939, "s6", "The target size of one update, for the adaptive schedule. A second brake, alongside the clip.", "Up: tolerates bigger updates."],
    ["max_grad_norm", "1.0", 940, "s3", "Caps the gradient's length before the optimizer (Adam) uses it, separately for the actor and the critic, so one wild batch can't yank the weights.", "Up: allows larger raw gradients through."],
    ["num_steps_per_env", "24", 947, "s4", "Each simulated duck takes 24 steps (about half a second at 50 Hz), then everyone stops for an update.", "Up: longer slices, more real reward per advantage."],
    ["max_iterations", "50_000", 948, "s6", "The budget: how many collect-then-update rounds before training stops.", "—"]
  ],
  rslrl: { repo: "leggedrobotics/rsl_rl", commit: "857de61", note: "The library's behaviour (std_type, the adaptive schedule, per-batch advantage normalisation) was read from rsl_rl main @ 857de61 (2026-09-09); Microduck pins its own rsl_rl version." },
  rollersEntropy: { value: 0.03, file: "src/mjlab_microduck/tasks/microduck_velocity_rollers_env_cfg.py", line: 652, comment: "roller-specific: higher exploration than the walk envs" }
};

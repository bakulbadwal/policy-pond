# Design: Dual Controls

Dual Controls uses the design system recorded in [Inference Kitchen's DESIGN.md](https://github.com/bakulbadwal/inference-kitchen/blob/master/DESIGN.md): a Busytown cross-section spread, flat gouache fields on warm paper, one warm-brown outline, and every object wearing a hand-lettered label. Buttons are painted signs, readouts are price tags on a nail, predictions are sticky notes, takeaways are chalked on a wood-framed board, and the glossary is a menu board. The type is Grandstander for signboards, Patrick Hand for labels and Andika for body text.

This file records only what the driving school changes.

## Palette additions

| Token | Hex | Use |
|---|---|---|
| plate / plate-d | `#C8322B` / `#962019` | the learner plate: masthead and footer, replacing the kitchen's brick and Wet Paint's road-works orange |
| student | `#F4C430` | anything the student drove: path segments, its logbook, the LEARNER roof sign |
| instructor | `#C8322B` | anything the instructor drove: her takeovers on the lot, her brake pedal, the intervention rate |
| demo | `#246A9C` | the instructor's demo drives and her logbook (the demo buffer) |
| examiner | `#5E4A94` | the examiner and her board |
| asphalt / hedge | `#8F9397` / `#3F7A3A` | the lot surface and the hedge round it in every plan view |
| school car | `#9CCBEA` | the learner car |

Driver colours are fixed across every canvas and scene: yellow is always the student, red is always the instructor, blue is always a demonstration. The exam bay's sign is always the yellow-and-black chequer; staff bays always have a plain dark sign.

## New objects

- **The lot** (`canvas.lotc`): a 12 × 8 plan of the lot inside its hedge, the kerb with the seven bay signs along the top (chequered EXAM, dark STAFF, grey numbers), flowerbeds and parked cars, the three cones, the dashed start zone, the practice box when it's in play, and the fence when bounds are on. The learner car is drawn from above with an L plate, ringed red while the instructor drives; paths are drawn by driver colour; a starburst marks a crash, a green tick a straight park, a dashed red ✕ the move the student wanted when she took over.
- **The dashcam photo**: a 5 × 4 greyscale pixel image, drawn pixelated, in a white print border. Training photos sit on green (parked) or rose (not parked) cards.
- **The verdict cards** (step 3): four poses, each with a sample photo, her mean score and the share of photos she passes.
- **The Bellman chalk box** (step 2): the target built term by term, with a table of the next move's π, Q̄ and −α log π.
- **The dither dial**: three bars for π ∝ exp(Q/α) under a log-scale temperature slider.
- **Fleet charts**: the average exam score of 8 seeded students, against lessons or lot time, smoothed over 5 exams; the intervention rate dashed in red; two ruled axes with titles, the target (75% or 80%) as a green bookmark on the margin, and the legend as a row of paper tags under the chart; an empty chart shows a sticky note saying which button to press. The lot's caption is a luggage tag under the canvas, so it never covers the kerb on a phone.
- **Case folders** (review board): three cases pinned to cork, each with a re-run of 8 students and a named cause.

## Scenes

Eight hand-built SVG scenes, 960 × 400, one per step plus the review board, assembled in `js/art.js` from a drawn cast:

- **the learner car**: a pale blue rounded hatchback with a yellow LEARNER roof sign and red L plates; the student (yellow cap) at the wheel and the instructor (bun, glasses) beside it;
- **the dual-control cutaway** (step 5): the car opened up to show two seats, two wheels and two brake pedals, hers in red;
- **the examiner**: in the office window or at her desk, with a clipboard, a PASS stamp, a photo tube and a cork board of photos;
- **the logbooks**: a yellow lesson log, a blue instructor's book, and a study tray holding a batch of half blue, half yellow pages;
- **the dither dial**: a dashboard gauge marked α, from "sure" to "dithers";
- **the lot furniture**: the bay row with its signs and parked cars, cones, the hedge, the fence, a clock on a pole, and a yellow RESET tow truck;
- the DRIVING SCHOOL office and a study room with desks and a chalkboard.

Each scene labels its objects with their RL meaning ("the examiner = the reward classifier"). The car is a generic learner car, not any company's product.

# Design: Policy Pond

Policy Pond uses the design system recorded in [Inference Kitchen's DESIGN.md](https://github.com/bakulbadwal/inference-kitchen/blob/master/DESIGN.md): a Busytown cross-section spread, flat gouache fields on warm paper, one warm-brown outline, and every object wearing a hand-lettered label. Buttons are painted signs, readouts are price tags on a nail, predictions are sticky notes, takeaways are chalked on a wood-framed board, and the glossary is a menu board. The type is Grandstander for signboards, Patrick Hand for labels and Andika for body text.

This file records only what the pond changes.

## Palette additions

| Token | Hex | Use |
|---|---|---|
| water | `#7FB8D9` | the pond, the strip in step 0 |
| ripple | `#A9D3EA` | water highlights, pond tiles |
| deep water | `#5B9BC4` | the deep part of each scene's pond |
| duckling | `#F9D95B` | the agent |
| bill | `#E8923A` | bills and feet |
| masthead / footer | `#246A9C` / `#1F5A85` | the pond's signboard, replacing the kitchen's brick |

Route colours are fixed across every chart and dot: A `#246A9C`, B `#E0A91E`, C `#8A5A2B`.

## New objects

- **The pond strip** (step 0): eight painted tiles on a water board; the duckling bobs into each new tile.
- **The chalk math box**: a small chalkboard in a wooden frame showing each formula with the live numbers substituted in. Used wherever the page claims a number, so the arithmetic is always visible.
- **Scatter strips**: one crossing = one dot, coloured by route, with the true value as a dashed green line and the sample average as a red block.
- **The six-case tiles** (step 3): small multiples of the clipped objective, one per case, drawn with the reader's ε, and checked off as they are visited.
- **The flock** (step 3): sixty duckling glyphs coloured by where real PPO training left each one (yellow = found the best route, red = stuck).
- **The config board** (step 6): the real config on a dark chalkboard; each setting is a button that opens its card.

## Scenes

Eight hand-built SVG scenes, 960 × 400, one per step plus the review board, in `js/art/`. Each scene labels its objects with their RL meaning ("duckling = the agent"). The robot in step 6 and the review board is a generic small biped duck, not any company's product.

Car mode theme art (Mo's layers, made Nov 12 2026 with an image generator from prompts written for the radar).
Each layer was drawn on flat #FF00FF magenta and cut out by tools/cut_art.py (soft edges, the magenta tint pulled
out, cropped, shrunk to WebP); layers.json records where each crop sat in its 16:9 frame.
  nd2-space.webp   Night Drive: the galaxy (stays put; stars, orbs and the road are drawn live in front of it)
  nd2-dash.webp    the dash with its amber meters and readout window (the controls sit in the window)
  nd2-wheel.webp   wheel and gloved hand (only the top shows; it steers into each curve)
  bike-side/-rear/-front.webp   Grid's blade bikes; *-lit.webp = just their white light strips, recoloured live
  cpn-*.webp       City Pop: sky by day and at dusk, the skyline by day and lit at night, palms, villa, pool, car
  cp-city.webp     Neon Nights album cover (this theme was called City Pop until Nov 12)
  pk-sport.webp / pk-classic.webp  portable cassette players    pk-phones.webp  headphones
  cr-head.webp / cr-cd.webp  Car stereo head unit and CD unit    cr-dash.webp  the dash    cr-screen.webp  the flip-out screen
To swap a picture: make it on the same magenta, run  python3 tools/cut_art.py <folder of .jpg> assets/car

# BERTARUNE

A not-at-all-official Deltarune-style parody RPG, made for Bert.

Bert and his classmates from a Church Gymnasium (Martin, Matěj, Dan, Kája
and Šíma) get sent to detention, find a suspiciously glowing Latin
textbook, and fall into a Dark World version of the school library where
homework comes alive and a strict Substitute Teacher must be defeated
with kindness (and a red pen).

## How to run

No build step, no dependencies. Just serve the folder and open it:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000` in a browser.

(Opening `index.html` directly with `file://` also mostly works, but a
local server avoids browser restrictions on some setups.)

## Controls

- **Arrow keys** — move / navigate menus
- **Z or Enter** — confirm / interact / attack
- **X** — cancel / back
- **M** — mute music

## What's original here

Everything is built from scratch for this project:

- All artwork is drawn procedurally with `<canvas>` primitives (no image
  files, nothing traced from the original game).
- All music and sound effects are synthesized at runtime with the Web
  Audio API — original short chiptune loops in the style of dark-synth
  RPG battle themes, not transcriptions of any existing soundtrack.
- All characters, dialogue, and story are original, inspired by Bert's
  own school and friends.

Only the general battle-mechanic shape (turn menu with FIGHT/ACT/ITEM/
MERCY, and a bullet-hell dodging phase for enemy turns) is a parody
homage to Deltarune/Undertale's well-known genre convention.

## Project structure

```
index.html         entry point
css/style.css       layout & theme
js/data.js          characters, enemies, rooms, dialogue (game content)
js/audio.js         procedural chiptune music + sfx engine
js/sprites.js       canvas-drawn character/enemy sprites
js/input.js         keyboard input state
js/overworld.js     map rendering, movement, collision, NPCs, warps
js/battle.js        battle menu, FIGHT minigame, bullet-hell dodge phase
js/main.js          game state machine, title/dialogue/gameover screens
```

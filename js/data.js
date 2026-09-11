// ============================================================
// BERTARUNE — game data: map builder, rooms, characters, enemies,
// dialogue and battle scripts. Pure data + small helpers, no
// rendering logic here (see sprites.js / overworld.js / battle.js).
// ============================================================

const TILE = 32;
const COLS = 20;
const ROWS = 15;

// ---- tile legend -------------------------------------------------
// '#' '%' 'o'  -> solid (wall / hedge / obstacle), everything else walkable
const WALL_CHARS = new Set(['#', '%', 'o']);

function blankRoom(wall = '#', floor = '.') {
  const grid = [];
  for (let y = 0; y < ROWS; y++) {
    const row = [];
    for (let x = 0; x < COLS; x++) {
      const edge = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
      row.push(edge ? wall : floor);
    }
    grid.push(row);
  }
  return grid;
}

function setTile(grid, x, y, ch) { grid[y][x] = ch; }
function rect(grid, x0, y0, x1, y1, ch) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) setTile(grid, x, y, ch);
}

// ============================================================
// CHARACTERS (party members drawn as chibi humanoids)
// ============================================================
const CHARACTERS = {
  bert: {
    id: 'bert', name: 'Bert', title: 'A BOY WHO GOT SENT TO DETENTION',
    skin: '#f0c8a0', hair: '#3b2712', hairStyle: 'messy', shirt: '#2e4fc4', pants: '#1c2140',
    maxHP: 80, atk: 8, def: 2,
  },
  kaja: {
    id: 'kaja', name: 'Kája', title: 'ALSO GOT SENT TO DETENTION (NOT HER FAULT)',
    skin: '#f0c8a0', hair: '#a02c4a', hairStyle: 'ponytail', shirt: '#5a2a78', pants: '#141018',
    maxHP: 110, atk: 12, def: 3, weapon: 'ruler',
  },
  sima: {
    id: 'sima', name: 'Šíma', title: 'SELF-APPOINTED PREFECT OF THE DARK WORLD',
    skin: '#f3d2ab', hair: '#e9e0b8', hairStyle: 'neat', shirt: '#1f6b46', pants: '#12331f',
    maxHP: 70, atk: 5, def: 2, cape: '#1f6b46', magic: true,
  },
  martin: {
    id: 'martin', name: 'Martin', title: 'RIVAL. VERY SERIOUS ABOUT BEING COOL',
    skin: '#f0c8a0', hair: '#141414', hairStyle: 'spiky', shirt: '#c02626', pants: '#141428',
  },
  matej: {
    id: 'matej', name: 'Matěj', title: 'HAS SNACKS. ALWAYS HAS SNACKS',
    skin: '#f0c8a0', hair: '#7a5626', hairStyle: 'neat', shirt: '#d98b1f', pants: '#3a2810',
  },
  dan: {
    id: 'dan', name: 'Dan', title: 'CAPTURED. PROBABLY FINE',
    skin: '#f0c8a0', hair: '#3a3a3a', hairStyle: 'flat', shirt: '#3aa0c9', pants: '#1e2a38',
  },
};

// ============================================================
// ENEMIES
// ============================================================
const ENEMIES = {
  homework_golem: {
    id: 'homework_golem', name: 'HOMEWORK GOLEM', kind: 'golem',
    maxHP: 60, atk: 6, def: 1,
    checkText: '* A pile of unfinished worksheets, animated by pure guilt.',
    acts: ['Check Answer', 'Erase'],
    spareNeeds: 2,
    actLines: {
      'Check Answer': '* You check its answers. 3 are wrong. It looks ashamed.',
      'Erase': '* You erase its mistakes. It feels lighter.',
    },
    spareLine: '* The Homework Golem quietly turns into a paper airplane and flies off.',
    pattern: 'papers',
  },
  killer_chalk: {
    id: 'killer_chalk', name: 'ANGRY CHALK', kind: 'chalk',
    maxHP: 40, atk: 5, def: 0,
    checkText: '* A stick of chalk, worn down to a nub from writing "SILENCE" on the board.',
    acts: ['Compliment Handwriting'],
    spareNeeds: 1,
    actLines: { 'Compliment Handwriting': '* You compliment its handwriting. It squeaks happily.' },
    spareLine: '* Angry Chalk blushes chalk-dust pink and rolls away, satisfied.',
    pattern: 'chalkdust',
  },
  latin_ghost: {
    id: 'latin_ghost', name: 'LATIN GHOST', kind: 'ghost',
    maxHP: 50, atk: 6, def: 1,
    checkText: '* The restless spirit of a student who never learned the ablative case.',
    acts: ['Conjugate Verb', 'Translate'],
    spareNeeds: 2,
    actLines: {
      'Conjugate Verb': '* You conjugate "amare" for it. AMO, AMAS, AMAT... It nods slowly.',
      'Translate': '* You translate "memento mori" for it. It seems relieved to finally understand.',
    },
    spareLine: '* The Latin Ghost fades peacefully, finally at rest. Requiescat in pace.',
    pattern: 'words',
  },
  lancer_martin: {
    id: 'lancer_martin', name: 'MARTIN', kind: 'rival',
    maxHP: 9999, atk: 0, def: 99, unlosable: true,
    checkText: '* Martin, riding a school chair he definitely stole from the chemistry lab.',
    acts: ['Shake Hands'],
    spareNeeds: 1,
    actLines: { 'Shake Hands': '* You offer a handshake. Martin looks conflicted, then grins.' },
    spareLine: '* "OKAY FINE. You win THIS round. I built a CHAIR-KART, Bert! A CHAIR-KART!"',
    pattern: 'chairkart',
  },
  sub_teacher: {
    id: 'sub_teacher', name: 'THE SUBSTITUTE', kind: 'boss',
    maxHP: 260, atk: 10, def: 3, boss: true,
    checkText: '* The Substitute. Red pen for a hand. Grade book for a heart. Wants everyone to fail the pop quiz of life.',
    acts: ['Do Homework', 'Apologize', 'Cite Chapel Rule'],
    spareNeeds: 3,
    actLines: {
      'Do Homework': '* You actually do the assigned homework. The Substitute did not expect this.',
      'Apologize': '* You apologize for the paper airplane incident of 3rd period. It helps, a little.',
      'Cite Chapel Rule': '* You cite Rule 7 of the Chapel Handbook: "Be kind to one another." The Substitute flinches.',
    },
    spareLine: '* The Substitute lowers the red pen. "...Fine. Extra credit for everyone."',
    pattern: 'boss',
  },
};

const ITEMS = [
  { id: 'snack', name: "Matěj's Snack", desc: 'Restores 25 HP. Slightly stale.', heal: 25, count: 3 },
];

// ============================================================
// ROOMS
// ============================================================
const ROOMS = {};

// ---- 1. COURTYARD (light world, start) ----------------------------
(function () {
  const grid = blankRoom('%', '~');
  rect(grid, 1, 1, COLS - 2, ROWS - 2, '~');
  rect(grid, 2, 2, COLS - 3, ROWS - 3, '.');
  // school building block along the top
  rect(grid, 5, 1, 14, 3, 'o');
  setTile(grid, 9, 3, '1'); // door tile (visual only, warp handled separately)
  setTile(grid, 10, 3, '1');
  ROOMS.courtyard = {
    id: 'courtyard', world: 'light', grid, music: 'light',
    playerStart: { x: 9, y: 9, facing: 'down' },
    obstacles: [],
    npcs: [
      { id: 'matej', x: 6, y: 8, facing: 'down', dialogue: 'matej_courtyard' },
      { id: 'dan', x: 13, y: 8, facing: 'down', dialogue: 'dan_courtyard' },
    ],
    warps: [
      { x: 9, y: 3, toRoom: 'hallway', toX: 9, toY: 11, toFacing: 'up' },
      { x: 10, y: 3, toRoom: 'hallway', toX: 10, toY: 11, toFacing: 'up' },
    ],
    encounters: [],
    signs: [],
  };
})();

// ---- 2. HALLWAY (light world) --------------------------------------
(function () {
  const grid = blankRoom('#', '.');
  rect(grid, 2, 2, 17, 12, '.');
  rect(grid, 2, 6, 6, 7, 'o'); // lockers block
  rect(grid, 13, 6, 17, 7, 'o');
  ROOMS.hallway = {
    id: 'hallway', world: 'light', grid, music: 'light',
    playerStart: { x: 9, y: 11, facing: 'up' },
    npcs: [
      { id: 'martin', x: 5, y: 4, facing: 'down', dialogue: 'martin_hallway' },
    ],
    warps: [
      { x: 9, y: 12, toRoom: 'courtyard', toX: 9, toY: 4, toFacing: 'down' },
      { x: 10, y: 12, toRoom: 'courtyard', toX: 10, toY: 4, toFacing: 'down' },
      { x: 9, y: 2, toRoom: 'detention', toX: 9, toY: 11, toFacing: 'up' },
      { x: 10, y: 2, toRoom: 'detention', toX: 10, toY: 11, toFacing: 'up' },
    ],
    encounters: [],
    signs: [{ x: 9, y: 2, text: '* A sign: "DETENTION ROOM ->"' }],
  };
})();

// ---- 3. DETENTION ROOM (light world) --------------------------------
(function () {
  const grid = blankRoom('#', '.');
  rect(grid, 2, 2, 17, 12, '.');
  rect(grid, 8, 4, 11, 5, 'o'); // shared desk
  setTile(grid, 9, 3, 'B'); // the glowing book shelf tile (visual marker only)
  ROOMS.detention = {
    id: 'detention', world: 'light', grid, music: 'tense',
    playerStart: { x: 9, y: 10, facing: 'up' },
    npcs: [
      { id: 'kaja', x: 11, y: 10, facing: 'left', dialogue: 'kaja_detention', follower: true },
    ],
    warps: [
      { x: 9, y: 12, toRoom: 'hallway', toX: 9, toY: 3, toFacing: 'down' },
      { x: 10, y: 12, toRoom: 'hallway', toX: 10, toY: 3, toFacing: 'down' },
    ],
    interactables: [
      { x: 9, y: 3, id: 'old_book', dialogue: 'old_book_first' },
    ],
    encounters: [],
    signs: [],
  };
})();

// ---- 4. DARK HALL (dark world entry) --------------------------------
(function () {
  const grid = blankRoom('#', ',');
  rect(grid, 1, 1, COLS - 2, ROWS - 2, ',');
  rect(grid, 4, 5, 6, 9, 'o');
  rect(grid, 13, 5, 15, 9, 'o');
  ROOMS.dark_hall = {
    id: 'dark_hall', world: 'dark', grid, music: 'dark',
    playerStart: { x: 9, y: 11, facing: 'up' },
    npcs: [
      { id: 'sima', x: 9, y: 6, facing: 'down', dialogue: 'sima_intro', joinsParty: true },
    ],
    warps: [
      { x: 9, y: 1, toRoom: 'dark_duel', toX: 9, toY: 12, toFacing: 'up' },
      { x: 10, y: 1, toRoom: 'dark_duel', toX: 10, toY: 12, toFacing: 'up' },
    ],
    encounters: [
      { x: 3, y: 3 }, { x: 16, y: 3 }, { x: 3, y: 12 }, { x: 16, y: 12 },
      { x: 9, y: 3 }, { x: 2, y: 8 }, { x: 17, y: 8 },
    ],
    encounterTable: ['killer_chalk', 'homework_golem'],
    signs: [],
  };
})();

// ---- 5. DARK DUEL (Martin lancer scene) ------------------------------
(function () {
  const grid = blankRoom('#', ',');
  rect(grid, 1, 1, COLS - 2, ROWS - 2, ',');
  ROOMS.dark_duel = {
    id: 'dark_duel', world: 'dark', grid, music: 'dark',
    playerStart: { x: 9, y: 11, facing: 'up' },
    npcs: [
      { id: 'martin_dark', x: 9, y: 6, facing: 'down', dialogue: 'martin_dark_intro', triggersDuel: true },
    ],
    warps: [
      { x: 9, y: 1, toRoom: 'dark_town', toX: 9, toY: 12, toFacing: 'up' },
      { x: 10, y: 1, toRoom: 'dark_town', toX: 10, toY: 12, toFacing: 'up' },
    ],
    encounters: [],
    signs: [],
  };
})();

// ---- 6. DARK TOWN (Matěj shop / hub) ---------------------------------
(function () {
  const grid = blankRoom('#', ',');
  rect(grid, 1, 1, COLS - 2, ROWS - 2, ',');
  rect(grid, 3, 3, 7, 5, 'o');
  rect(grid, 12, 3, 16, 5, 'o');
  ROOMS.dark_town = {
    id: 'dark_town', world: 'dark', grid, music: 'dark_calm',
    playerStart: { x: 9, y: 11, facing: 'up' },
    npcs: [
      { id: 'matej_dark', x: 9, y: 8, facing: 'down', dialogue: 'matej_shop', shop: true },
    ],
    warps: [
      { x: 9, y: 1, toRoom: 'dark_castle', toX: 9, toY: 12, toFacing: 'up' },
      { x: 10, y: 1, toRoom: 'dark_castle', toX: 10, toY: 12, toFacing: 'up' },
    ],
    encounters: [ { x: 3, y: 9 }, { x: 16, y: 9 } ],
    encounterTable: ['latin_ghost', 'homework_golem', 'killer_chalk'],
    signs: [],
  };
})();

// ---- 7. DARK CASTLE (approach) ---------------------------------------
(function () {
  const grid = blankRoom('#', ',');
  rect(grid, 1, 1, COLS - 2, ROWS - 2, ',');
  rect(grid, 8, 6, 11, 8, 'o');
  ROOMS.dark_castle = {
    id: 'dark_castle', world: 'dark', grid, music: 'dark_tense',
    playerStart: { x: 9, y: 11, facing: 'up' },
    npcs: [
      { id: 'dan_caged', x: 9, y: 4, facing: 'down', dialogue: 'dan_caged' },
    ],
    warps: [
      { x: 9, y: 1, toRoom: 'boss_room', toX: 9, toY: 12, toFacing: 'up' },
      { x: 10, y: 1, toRoom: 'boss_room', toX: 10, toY: 12, toFacing: 'up' },
    ],
    encounters: [ { x: 3, y: 8 }, { x: 16, y: 8 }, { x: 9, y: 10 } ],
    encounterTable: ['latin_ghost', 'homework_golem'],
    signs: [],
  };
})();

// ---- 8. BOSS ROOM -------------------------------------------------------
(function () {
  const grid = blankRoom('#', ',');
  rect(grid, 1, 1, COLS - 2, ROWS - 2, ',');
  ROOMS.boss_room = {
    id: 'boss_room', world: 'dark', grid, music: 'boss',
    playerStart: { x: 9, y: 12, facing: 'up' },
    npcs: [
      { id: 'sub_teacher_npc', x: 9, y: 5, facing: 'down', dialogue: 'boss_intro', triggersBoss: true },
    ],
    warps: [],
    encounters: [],
    signs: [],
  };
})();

// ============================================================
// DIALOGUE
// key -> array of lines. Some entries are objects with .lines and .after (a function name run once, see main.js DIALOGUE_HOOKS)
// ============================================================
const DIALOGUE = {
  matej_courtyard: ['MATĚJ: Hey Bert. Want a snack before class?', 'MATĚJ: I always have snacks. It is my one skill.'],
  dan_courtyard: ['DAN: Did you finish the German homework?', 'DAN: ...Yeah, me neither. We are so getting yelled at.'],
  martin_hallway: ['MARTIN: Bert! One day I will beat you at something. Anything.', 'MARTIN: Today is not that day. But one day.'],

  kaja_detention: {
    lines: ['KÁJA: This is SO unfair. I did not even throw that paper airplane.', 'KÁJA: ...okay I threw it. But it was a GREAT throw.', 'KÁJA: Whatever. I am sticking with you until this detention is over, Bert.'],
    after: 'joinKaja',
  },
  old_book_first: {
    lines: [
      '* An ancient, dust-covered Latin textbook sits on the shelf, glowing faintly.',
      'KÁJA: ...why is the textbook glowing.',
      'KÁJA: Bert. BERT. Textbooks do not usually do that.',
      '* You open it anyway.',
    ],
    after: 'fallToDarkWorld',
  },

  sima_intro: {
    lines: [
      'ŠÍMA: Oh! Lightners! At last!',
      'ŠÍMA: I am Šíma, self-appointed Prefect of this Dark World.',
      'ŠÍMA: An old prophecy says two Lightners must close the Fountain before Finals Week, or darkness will consume the whole school.',
      'ŠÍMA: I have been preparing for this for MONTHS. I even made a badge.',
      'KÁJA: ...are you going to help us or not.',
      'ŠÍMA: Yes! Obviously! I am joining your party. This is very exciting for me.',
    ],
    after: 'joinSima',
  },

  martin_dark_intro: {
    lines: [
      '* It is Martin. He is riding a chair. The chair has wheels bolted onto it.',
      "MARTIN: HALT, Lightners! I am the Dark World's greatest rival!",
      'MARTIN: You must defeat me in a DUEL before you may pass!',
      'MARTIN: ...it is a friendly duel. I will not actually hurt you. I checked with Šíma.',
      'ŠÍMA: It is true. He asked me three times.',
    ],
    after: 'startDuel',
  },

  matej_shop: {
    lines: [
      "MATĚJ: Bert! You're in the Dark World too?? Cool. Also, want a snack?",
      "MATĚJ: I brought my whole backpack. Snacks: 25 HP each. Totally reasonable price.",
    ],
    after: 'openShop',
  },

  dan_caged: {
    lines: [
      'DAN: Guys?? GUYS. A little help? The Substitute put me in a cage made of detention slips.',
      'DAN: It is surprisingly sturdy for paper.',
      "ŠÍMA: Hang on, Dan! We just need to get past the Substitute first.",
      'DAN: Cool cool cool no rush I will just be OVER HERE. IN A CAGE.',
    ],
  },

  boss_intro: {
    lines: [
      '* THE SUBSTITUTE turns around slowly. Red pen raised.',
      'THE SUBSTITUTE: Ah. More students who did not do their reading.',
      'THE SUBSTITUTE: The Fountain stays open until every soul in this school has properly conjugated their homework.',
      'ŠÍMA: That is not how the prophecy goes at all.',
      'THE SUBSTITUTE: The prophecy has been GRADED. C-minus. See me after class.',
      '* THE SUBSTITUTE attacks!',
    ],
    after: 'startBoss',
  },

  ending: {
    lines: [
      '* The Fountain flickers and closes. The Dark World brightens into an ordinary, slightly dusty library archive.',
      'DAN: So... are we still getting detention for this?',
      'KÁJA: Worth it.',
      'ŠÍMA: I shall remain here as Prefect, should the Fountain ever return. Someone has to.',
      'MARTIN: Rematch next week! I have been practicing!',
      'MATĚJ: Anyone want a snack? Emotional moments make me hungry.',
      '* Bert, Kája, Martin, Matěj and Dan walk back to class like nothing happened.',
      '* THE END',
    ],
    after: 'finishGame',
  },
};

const TITLE_LINES = [
  'Church Gymnasium of the Teutonic Order,',
  'a normal Tuesday.',
];

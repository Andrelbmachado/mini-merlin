const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d", { alpha: false });
const startScreen = document.querySelector("#start-screen");
const startButton = document.querySelector("#start-btn");
const touchControls = document.querySelector("#touch-controls");
const statusNode = document.querySelector("#status");
const shortcutsPanel = document.querySelector("#shortcuts-panel");
const shortcutsButton = document.querySelector("#shortcuts-btn");
const soundPanel = document.querySelector("#sound-panel");
const soundButton = document.querySelector("#sound-btn");
const soundClose = document.querySelector("#sound-close");
const musicEnabledInput = document.querySelector("#music-enabled");
const sfxEnabledInput = document.querySelector("#sfx-enabled");
const musicVolumeInput = document.querySelector("#music-volume");
const sfxVolumeInput = document.querySelector("#sfx-volume");
const musicValue = document.querySelector("#music-value");
const sfxValue = document.querySelector("#sfx-value");

const W = 960;
const H = 540;
const WORLD_W = 5400;
const GRAVITY = 1450;
const FIXED_DT = 1 / 60;
ctx.imageSmoothingEnabled = false;

const art = {};

function loadArt(name, src, removeBackground = false) {
  const image = new Image();
  const promise = new Promise((resolve) => {
    image.onload = () => {
      if (!removeBackground) {
        art[name] = { image, sx: 0, sy: 0, sw: image.width, sh: image.height, ready: true };
        resolve(art[name]);
        return;
      }
      const surface = document.createElement("canvas");
      surface.width = image.width; surface.height = image.height;
      const surfaceCtx = surface.getContext("2d", { willReadFrequently: true });
      surfaceCtx.drawImage(image, 0, 0);
      const pixels = surfaceCtx.getImageData(0, 0, surface.width, surface.height);
      const width = surface.width, height = surface.height, count = width * height;
      const visited = new Uint8Array(count);
      const stack = new Int32Array(count);
      let stackSize = 0;
      const isBackground = (pixel) => {
        const index = pixel * 4;
        const red = pixels.data[index];
        const green = pixels.data[index + 1];
        const blue = pixels.data[index + 2];
        if (removeBackground === "light") {
          return Math.min(red, green, blue) > 222 && Math.max(red, green, blue) - Math.min(red, green, blue) < 24;
        }
        return red < 12 && green < 12 && blue < 12;
      };
      const visit = (pixel) => {
        if (pixel < 0 || pixel >= count || visited[pixel] || !isBackground(pixel)) return;
        visited[pixel] = 1;
        stack[stackSize++] = pixel;
      };
      for (let x = 0; x < width; x++) { visit(x); visit((height - 1) * width + x); }
      for (let y = 0; y < height; y++) { visit(y * width); visit(y * width + width - 1); }
      while (stackSize) {
        const pixel = stack[--stackSize];
        pixels.data[pixel * 4 + 3] = 0;
        const x = pixel % width;
        if (x > 0) visit(pixel - 1);
        if (x < width - 1) visit(pixel + 1);
        if (pixel >= width) visit(pixel - width);
        if (pixel < count - width) visit(pixel + width);
      }
      let left = width, top = height, right = 0, bottom = 0;
      for (let pixel = 0; pixel < count; pixel++) {
        if (pixels.data[pixel * 4 + 3] === 0) continue;
        const x = pixel % width;
        const y = Math.floor(pixel / width);
        left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
      }
      surfaceCtx.putImageData(pixels, 0, 0);
      art[name] = { image: surface, sx: left, sy: top, sw: Math.max(1, right - left + 1), sh: Math.max(1, bottom - top + 1), ready: true };
      resolve(art[name]);
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
  return promise;
}

const MERLIN_ART_FILES = {
  idle: "01-idle.png", andando: "02-walking.png", correndo: "03-running.png", pulando: "04-jumping.png",
  varinha: "05-wand-magic.png", bolha: "06-forward-bubble.png", magia_cima: "07-upward-magic.png",
  escudo: "08-shield.png", teleporte: "09-teleport.png", ferido_leve: "10-light-hurt.png",
  ferido_forte: "11-heavy-hurt.png", caindo: "12-falling.png", morto: "13-dead.png",
  agachado: "14-crouching.png", levantando: "15-getting-up.png", interagindo: "16-interacting.png",
  carregando: "17-charging-wand.png", em_queda: "18-airborne-descent.png", caido: "12-falling.png"
};

const ENEMY_ART_FILES = {
  andando: "01-walking.png", atacando: "02-attacking.png", parado: "03-idle.png",
  defendendo: "04-defending.png", levando_dano: "05-taking-damage.png", morto: "06-dead.png",
  pulando: "07-jumping.png", agachado: "08-crouching.png", correndo: "09-running.png", morrendo: "10-dying.png"
};

const COIN_ART_FILES = [
  "01-front.png", "02-front-highlight.png", "03-turning.png", "04-edge.png",
  "05-edge-return.png", "06-reappearing.png", "07-near-front.png", "08-front-loop.png"
];

const assetPromises = [
  loadArt("background", "assets/background.png"),
  loadArt("ground", "assets/ground.png", true),
  loadArt("floating", "assets/floating-platform.png", true),
  loadArt("merlinIdle", "assets/merlin-idle.png", true),
  loadArt("merlinWalking", "assets/merlin-walking.png", true),
  loadArt("enemy", "assets/enemy.png", true)
];
for (const [state, filename] of Object.entries(MERLIN_ART_FILES)) assetPromises.push(loadArt(`merlin:${state}`, `assets/runtime/merlin/${filename}`, "light"));
for (const [state, filename] of Object.entries(ENEMY_ART_FILES)) assetPromises.push(loadArt(`enemy:${state}`, `assets/runtime/enemy/${filename}`, "light"));
COIN_ART_FILES.forEach((filename, index) => assetPromises.push(loadArt(`coin:${index}`, `assets/runtime/coin/${filename}`, "light")));
window.__assetsReady = Promise.all(assetPromises);

function drawArt(asset, x, y, width, height) {
  if (!asset?.ready) return false;
  ctx.drawImage(asset.image, asset.sx, asset.sy, asset.sw, asset.sh, roundPixel(x), roundPixel(y), roundPixel(width), roundPixel(height));
  return true;
}

function drawArtFitted(asset, maxWidth, maxHeight, centerX = 0, bottomY = 0) {
  if (!asset?.ready) return false;
  const scale = Math.min(maxWidth / asset.sw, maxHeight / asset.sh);
  const width = asset.sw * scale;
  const height = asset.sh * scale;
  ctx.drawImage(asset.image, asset.sx, asset.sy, asset.sw, asset.sh, roundPixel(centerX - width / 2), roundPixel(bottomY - height), roundPixel(width), roundPixel(height));
  return true;
}

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const rectsOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const roundPixel = (value) => Math.round(value);

const ACTION_LABELS = {
  idle: "IDLE",
  andando: "ANDANDO",
  correndo: "CORRENDO",
  pulando: "PULANDO",
  varinha: "VARINHA MÁGICA",
  bolha: "BOLHA MÁGICA",
  magia_cima: "RAJADA FRONTAL",
  escudo: "ESCUDO MÁGICO",
  teleporte: "TELEPORTE",
  ferido_leve: "FERIDO LEVE",
  ferido_forte: "FERIDO FORTE",
  caindo: "CAINDO",
  caido: "CAÍDO",
  morto: "MORTO",
  agachado: "AGACHADO",
  levantando: "LEVANTANDO",
  interagindo: "INTERAGINDO",
  carregando: "CARREGANDO VARINHA",
  em_queda: "EM QUEDA"
};

const input = {
  held: new Set(),
  pressed: new Set(),
  released: new Set(),
  gamepadHeld: new Set()
};

const keyMap = {
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
  ArrowDown: "down", s: "down", S: "down", c: "down", C: "down",
  ArrowUp: "jump", w: "jump", W: "jump", " ": "jump",
  Shift: "run",
  j: "attack", J: "attack", b: "attack", B: "attack",
  k: "bubble", K: "bubble",
  u: "upAttack", U: "upAttack",
  l: "shield", L: "shield",
  q: "teleport", Q: "teleport",
  r: "charge", R: "charge",
  e: "interact", E: "interact",
  p: "pause", P: "pause",
  f: "fullscreen", F: "fullscreen",
  m: "mute", M: "mute",
  Tab: "shortcuts",
  Enter: "confirm"
};

window.addEventListener("keydown", (event) => {
  if (event.key === "Tab" && !soundPanel.classList.contains("hidden")) return;
  const action = keyMap[event.key];
  if (event.key === "Escape" && (!shortcutsPanel.classList.contains("hidden") || !soundPanel.classList.contains("hidden"))) {
    event.preventDefault();
    closeGameModals();
    return;
  }
  if (!action) return;
  if (["left", "right", "down", "jump", "shortcuts"].includes(action)) event.preventDefault();
  if (action === "shortcuts") {
    if (!event.repeat) toggleShortcuts();
    return;
  }
  if (action === "mute") {
    if (!event.repeat) toggleMute();
    return;
  }
  if (!input.held.has(action)) input.pressed.add(action);
  input.held.add(action);
  if (action === "fullscreen") toggleFullscreen();
});

shortcutsButton.addEventListener("click", toggleShortcuts);
soundButton.addEventListener("click", openSoundSettings);
soundClose.addEventListener("click", closeGameModals);
soundPanel.addEventListener("pointerdown", (event) => { if (event.target === soundPanel) closeGameModals(); });
shortcutsPanel.addEventListener("pointerdown", (event) => { if (event.target === shortcutsPanel) closeGameModals(); });

window.addEventListener("keyup", (event) => {
  const action = keyMap[event.key];
  if (!action) return;
  input.held.delete(action);
  input.released.add(action);
});

document.querySelectorAll("[data-action]").forEach((button) => {
  const action = button.dataset.action;
  const press = (event) => {
    event.preventDefault();
    if (!input.held.has(action)) input.pressed.add(action);
    input.held.add(action);
    button.classList.add("active");
  };
  const release = (event) => {
    event.preventDefault();
    input.held.delete(action);
    input.released.add(action);
    button.classList.remove("active");
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", (event) => {
    if (event.buttons) release(event);
  });
});

const game = {
  mode: "title",
  level: 1,
  levelName: "Brocéliande",
  time: 0,
  cameraX: 0,
  score: 0,
  coins: 0,
  runes: 0,
  keys: 0,
  checkpointX: 120,
  toast: "",
  toastTimer: 0,
  quest: "Encontre as 3 runas de Brocéliande",
  shake: 0,
  transitionTimer: 0,
  nextLevel: 0,
  shortcutsVisible: false,
  settingsOpen: false,
  lastTime: performance.now(),
  accumulator: 0
};

const player = {
  x: 120, y: 360, w: 30, h: 58,
  vx: 0, vy: 0, face: 1,
  onGround: false,
  hp: 100, mana: 100,
  state: "idle",
  actionTimer: 0,
  attackCooldown: 0,
  bubbleCooldown: 0,
  teleportCooldown: 0,
  invulnerable: 0,
  knockdown: 0,
  standup: 0,
  crouched: false,
  wasCrouched: false,
  charging: 0,
  wasCharging: false,
  deadTimer: 0,
  jumpHold: 0,
  jumpReleased: false
};

const makeEnemy = (type, x, hp, dir, range) => ({
  type, x, y: 391, w: type === "dragon" ? 68 : 42, h: type === "dragon" ? 62 : 54,
  hp, maxHp: hp, dir, home: x, range, alive: true, visible: true, flash: 0,
  fire: type === "dragon" ? 1 + Math.random() : 0, state: "parado", stateTimer: 0,
  attackTimer: 0, defendTimer: 0, deathTimer: 0, jumpCooldown: 0, hitCount: 0, vy: 0, onGround: true
});

function createLevelData(level) {
  if (level === 2) {
    const ground = [
      { x: 0, y: 445, w: 900, h: 120 }, { x: 1040, y: 445, w: 800, h: 120 },
      { x: 1980, y: 445, w: 880, h: 120 }, { x: 3000, y: 445, w: 900, h: 120 },
      { x: 4040, y: 445, w: 1360, h: 120 }
    ];
    return {
      name: "Avalon",
      quest: "Atravesse Avalon e encontre o Portal Estelar",
      ground,
      platforms: [...ground,
        { x: 330, y: 350, w: 170, h: 28 }, { x: 620, y: 280, w: 180, h: 28 },
        { x: 1110, y: 330, w: 170, h: 28 }, { x: 1430, y: 260, w: 190, h: 28 },
        { x: 2050, y: 340, w: 180, h: 28 }, { x: 2400, y: 275, w: 170, h: 28 },
        { x: 3080, y: 325, w: 190, h: 28 }, { x: 3480, y: 255, w: 180, h: 28 },
        { x: 4130, y: 340, w: 170, h: 28 }, { x: 4520, y: 275, w: 210, h: 28 }
      ],
      signs: [
        { x: 210, y: 390, text: "Avalon — a ilha onde a magia toca as estrelas." },
        { x: 2880, y: 390, text: "As ruínas lunares guardam o caminho para a Torre de Cristal." },
        { x: 4920, y: 390, text: "O Portal Estelar encerra esta jornada." }
      ],
      chests: [{ x: 690, y: 242, opened: false, reward: "potion" }, { x: 3540, y: 217, opened: false, reward: "key" }],
      collectibles: [
        { type: "coin", x: 390, y: 310 }, { type: "coin", x: 690, y: 240 }, { type: "crystal", x: 1190, y: 290 },
        { type: "coin", x: 1510, y: 220 }, { type: "fruit", x: 2150, y: 300 }, { type: "coin", x: 2480, y: 235 },
        { type: "crystal", x: 3160, y: 285 }, { type: "coin", x: 3560, y: 215 }, { type: "fruit", x: 4200, y: 300 },
        { type: "coin", x: 4620, y: 235 }, { type: "coin", x: 4820, y: 395 }
      ],
      animals: [
        { type: "owl", x: 540, y: 315, dir: 1, phase: 1.2 }, { type: "deer", x: 1260, y: 398, dir: -1, phase: 2.1 },
        { type: "frog", x: 2240, y: 425, dir: 1, phase: 0.6 }, { type: "fox", x: 3230, y: 414, dir: -1, phase: 3.1 },
        { type: "rabbit", x: 4300, y: 417, dir: 1, phase: 1.8 }
      ],
      enemies: [
        makeEnemy("goblin", 820, 55, -1, 100), makeEnemy("goblin", 1700, 65, 1, 150),
        makeEnemy("dragon", 2670, 140, -1, 150), makeEnemy("goblin", 3760, 70, -1, 140),
        makeEnemy("dragon", 4740, 160, -1, 170)
      ],
      portal: { x: 5150, y: 315, w: 72, h: 130, unlocked: true, title: "Portal Estelar" }
    };
  }
  const ground = [
    { x: 0, y: 445, w: 1120, h: 120 }, { x: 1240, y: 445, w: 1020, h: 120 },
    { x: 2390, y: 445, w: 1060, h: 120 }, { x: 3570, y: 445, w: 1830, h: 120 }
  ];
  return {
    name: "Brocéliande",
    quest: "Encontre as 3 runas de Brocéliande",
    ground,
    platforms: [...ground,
      { x: 420, y: 356, w: 190, h: 28 }, { x: 750, y: 300, w: 160, h: 28 }, { x: 970, y: 360, w: 120, h: 28 },
      { x: 1320, y: 350, w: 150, h: 28 }, { x: 1560, y: 285, w: 180, h: 28 }, { x: 1880, y: 340, w: 190, h: 28 },
      { x: 2430, y: 350, w: 150, h: 28 }, { x: 2720, y: 290, w: 180, h: 28 }, { x: 3050, y: 350, w: 150, h: 28 },
      { x: 3620, y: 335, w: 160, h: 28 }, { x: 3950, y: 275, w: 180, h: 28 }, { x: 4320, y: 345, w: 160, h: 28 },
      { x: 4610, y: 295, w: 210, h: 28 }
    ],
    signs: [
      { x: 250, y: 390, text: "Floresta de Brocéliande — a magia desperta a leste." },
      { x: 2290, y: 390, text: "Ponte quebrada — o teleporte atravessa grandes distâncias." },
      { x: 4820, y: 390, text: "O portal para Avalon exige as três runas." }
    ],
    chests: [{ x: 810, y: 262, opened: false, reward: "key" }, { x: 3170, y: 407, opened: false, reward: "potion" }],
    collectibles: [
      { type: "coin", x: 480, y: 315 }, { type: "coin", x: 530, y: 315 }, { type: "coin", x: 1020, y: 320 },
      { type: "coin", x: 1370, y: 310 }, { type: "fruit", x: 1680, y: 245 }, { type: "coin", x: 1950, y: 300 },
      { type: "crystal", x: 2510, y: 310 }, { type: "coin", x: 2810, y: 250 }, { type: "coin", x: 3120, y: 310 },
      { type: "fruit", x: 3700, y: 295 }, { type: "coin", x: 4050, y: 235 }, { type: "crystal", x: 4400, y: 305 },
      { type: "coin", x: 4680, y: 255 }, { type: "rune", x: 1030, y: 306, id: 1 },
      { type: "rune", x: 2805, y: 230, id: 2 }, { type: "rune", x: 4580, y: 395, id: 3 }
    ],
    animals: [
      { type: "rabbit", x: 330, y: 417, dir: 1, phase: 0.2 }, { type: "squirrel", x: 650, y: 416, dir: -1, phase: 1.3 },
      { type: "deer", x: 1440, y: 398, dir: 1, phase: 0.7 }, { type: "fox", x: 1810, y: 414, dir: -1, phase: 2.1 },
      { type: "hedgehog", x: 2530, y: 425, dir: 1, phase: 3.4 }, { type: "bird", x: 3000, y: 240, dir: -1, phase: 0.4 },
      { type: "owl", x: 3780, y: 310, dir: 1, phase: 1.8 }, { type: "frog", x: 4280, y: 425, dir: -1, phase: 2.8 }
    ],
    enemies: [
      makeEnemy("goblin", 670, 40, 1, 90), makeEnemy("goblin", 2020, 55, -1, 150),
      makeEnemy("goblin", 3100, 40, -1, 100), makeEnemy("dragon", 3320, 110, -1, 190),
      makeEnemy("dragon", 4490, 125, 1, 150)
    ],
    portal: { x: 5150, y: 315, w: 72, h: 130, unlocked: false, title: "Portal de Avalon" }
  };
}

let groundSegments = [];
let platforms = [];
let signs = [];
let chests = [];
let collectibles = [];
let animals = [];
let enemies = [];
let portal = null;

function loadLevel(level, preserveVitals = true) {
  const data = createLevelData(level);
  game.level = level;
  game.levelName = data.name;
  game.quest = data.quest;
  game.cameraX = 0;
  game.checkpointX = 120;
  groundSegments = data.ground;
  platforms = data.platforms;
  signs = data.signs;
  chests = data.chests;
  collectibles = data.collectibles.map((item) => ({ ...item, collected: false, bob: Math.random() * Math.PI * 2 }));
  animals = data.animals;
  enemies = data.enemies;
  portal = data.portal;
  Object.assign(player, { x: 120, y: 360, vx: 0, vy: 0, face: 1, onGround: false, state: "idle", actionTimer: 0, knockdown: 0, standup: 0, jumpHold: 0, jumpReleased: false });
  if (!preserveVitals) Object.assign(player, { hp: 100, mana: 100 });
  projectiles.length = 0;
  particles.length = 0;
}

const projectiles = [];
const particles = [];

const SOUND_STORAGE_KEY = "mini-merlin-sound-v1";
const soundSettings = (() => {
  const defaults = { musicEnabled: true, sfxEnabled: true, musicVolume: 0.45, sfxVolume: 0.7, muted: false };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(SOUND_STORAGE_KEY) || "{}") }; }
  catch { return defaults; }
})();

let audioContext = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = null;
let musicStep = 0;
let musicNextTime = 0;

function initAudio() {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === "suspended") audioContext.resume();
  if (!musicGain) {
    musicGain = audioContext.createGain();
    sfxGain = audioContext.createGain();
    musicGain.connect(audioContext.destination);
    sfxGain.connect(audioContext.destination);
  }
  applySoundSettings();
  startCelticMusic();
}

function beep(frequency = 440, duration = 0.08, type = "square", volume = 0.035) {
  if (!audioContext || !sfxGain || !soundSettings.sfxEnabled || soundSettings.muted) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(sfxGain);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function playJumpSfx() {
  if (!audioContext || !sfxGain || !soundSettings.sfxEnabled || soundSettings.muted) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const now = audioContext.currentTime;
  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(240, now);
  oscillator.frequency.exponentialRampToValueAtTime(520, now + 0.11);
  gain.gain.setValueAtTime(0.045, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
  oscillator.connect(gain).connect(sfxGain);
  oscillator.start(now);
  oscillator.stop(now + 0.15);
}

function scheduleTone(frequency, start, duration, type, volume, output, detune = 0) {
  if (!audioContext || !output) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(detune, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

const CELTIC_MELODY = [
  293.66, 349.23, 392, 440, 392, 349.23, 293.66, 261.63,
  293.66, 349.23, 440, 523.25, 440, 392, 349.23, 293.66,
  392, 440, 523.25, 587.33, 523.25, 440, 392, 349.23,
  293.66, 349.23, 392, 440, 349.23, 293.66, 261.63, 293.66
];

function scheduleMusic() {
  if (!audioContext || !musicGain) return;
  const stepLength = 0.24;
  while (musicNextTime < audioContext.currentTime + 0.45) {
    const note = CELTIC_MELODY[musicStep % CELTIC_MELODY.length];
    scheduleTone(note, musicNextTime, stepLength * 0.82, "triangle", 0.055, musicGain);
    scheduleTone(note * 2, musicNextTime, stepLength * 0.38, "square", 0.012, musicGain, -5);
    if (musicStep % 4 === 0) {
      const drone = musicStep % 16 < 8 ? 146.83 : 130.81;
      scheduleTone(drone, musicNextTime, stepLength * 3.8, "sine", 0.028, musicGain);
      scheduleTone(drone * 1.5, musicNextTime, stepLength * 1.8, "triangle", 0.014, musicGain);
    }
    if (musicStep % 2 === 0) scheduleTone(73.42, musicNextTime, 0.055, "triangle", 0.025, musicGain);
    musicStep += 1;
    musicNextTime += stepLength;
  }
}

function startCelticMusic() {
  if (!audioContext || musicTimer) return;
  musicNextTime = audioContext.currentTime + 0.06;
  scheduleMusic();
  musicTimer = window.setInterval(scheduleMusic, 120);
}

function applySoundSettings() {
  if (audioContext && musicGain && sfxGain) {
    const now = audioContext.currentTime;
    const musicLevel = soundSettings.musicEnabled && !soundSettings.muted ? soundSettings.musicVolume : 0;
    const sfxLevel = soundSettings.sfxEnabled && !soundSettings.muted ? soundSettings.sfxVolume : 0;
    musicGain.gain.setTargetAtTime(musicLevel, now, 0.025);
    sfxGain.gain.setTargetAtTime(sfxLevel, now, 0.015);
  }
  musicEnabledInput.checked = soundSettings.musicEnabled;
  sfxEnabledInput.checked = soundSettings.sfxEnabled;
  musicVolumeInput.value = String(Math.round(soundSettings.musicVolume * 100));
  sfxVolumeInput.value = String(Math.round(soundSettings.sfxVolume * 100));
  musicValue.value = `${musicVolumeInput.value}%`;
  sfxValue.value = `${sfxVolumeInput.value}%`;
  soundButton.textContent = soundSettings.muted ? "🔇 SOM" : "⚙ SOM";
  try { localStorage.setItem(SOUND_STORAGE_KEY, JSON.stringify(soundSettings)); } catch {}
}

function closeGameModals() {
  shortcutsPanel.classList.add("hidden");
  soundPanel.classList.add("hidden");
  shortcutsPanel.setAttribute("aria-hidden", "true");
  soundPanel.setAttribute("aria-hidden", "true");
  game.shortcutsVisible = false;
  game.settingsOpen = false;
}

function clearGameplayInput() {
  input.held.clear();
  input.pressed.clear();
  input.released.clear();
}

function toggleShortcuts() {
  const shouldOpen = shortcutsPanel.classList.contains("hidden");
  closeGameModals();
  if (shouldOpen) {
    clearGameplayInput();
    shortcutsPanel.classList.remove("hidden");
    shortcutsPanel.setAttribute("aria-hidden", "false");
    game.shortcutsVisible = true;
  }
}

function openSoundSettings() {
  initAudio();
  closeGameModals();
  clearGameplayInput();
  soundPanel.classList.remove("hidden");
  soundPanel.setAttribute("aria-hidden", "false");
  game.settingsOpen = true;
}

function toggleMute() {
  soundSettings.muted = !soundSettings.muted;
  applySoundSettings();
  setToast(soundSettings.muted ? "Áudio silenciado" : "Áudio restaurado", 1.2);
}

musicEnabledInput.addEventListener("change", () => { soundSettings.musicEnabled = musicEnabledInput.checked; initAudio(); applySoundSettings(); });
sfxEnabledInput.addEventListener("change", () => { soundSettings.sfxEnabled = sfxEnabledInput.checked; initAudio(); applySoundSettings(); });
musicVolumeInput.addEventListener("input", () => { soundSettings.musicVolume = Number(musicVolumeInput.value) / 100; initAudio(); applySoundSettings(); });
sfxVolumeInput.addEventListener("input", () => { soundSettings.sfxVolume = Number(sfxVolumeInput.value) / 100; initAudio(); applySoundSettings(); });
applySoundSettings();

function beginGame() {
  initAudio();
  resetGame();
  game.mode = "playing";
  startScreen.classList.add("hidden");
  touchControls.classList.add("visible");
  closeGameModals();
  statusNode.textContent = "Jogo iniciado. Encontre as três runas e atravesse o portal.";
  beep(523, 0.08); setTimeout(() => beep(659, 0.1), 80); setTimeout(() => beep(784, 0.14), 170);
}

startButton.addEventListener("click", beginGame);

function resetGame() {
  Object.assign(game, { mode: "playing", level: 1, time: 0, cameraX: 0, score: 0, coins: 0, runes: 0, keys: 0, checkpointX: 120, toast: "", toastTimer: 0, shake: 0, transitionTimer: 0, nextLevel: 0 });
  Object.assign(player, { hp: 100, mana: 100, state: "idle", actionTimer: 0, attackCooldown: 0, bubbleCooldown: 0, teleportCooldown: 0, invulnerable: 0, knockdown: 0, standup: 0, crouched: false, wasCrouched: false, charging: 0, wasCharging: false, deadTimer: 0, jumpHold: 0, jumpReleased: false });
  loadLevel(1, false);
}

function pollGamepad() {
  const pad = navigator.getGamepads?.()[0];
  if (!pad) return;
  const next = new Set();
  const add = (condition, action) => { if (condition) next.add(action); };
  add(pad.axes[0] < -0.35 || pad.buttons[14]?.pressed, "left");
  add(pad.axes[0] > 0.35 || pad.buttons[15]?.pressed, "right");
  add(pad.axes[1] > 0.5 || pad.buttons[13]?.pressed, "down");
  add(pad.buttons[0]?.pressed, "jump");
  add(pad.buttons[2]?.pressed, "attack");
  add(pad.buttons[1]?.pressed, "bubble");
  add(pad.buttons[3]?.pressed, "upAttack");
  add(pad.buttons[4]?.pressed, "shield");
  add(pad.buttons[5]?.pressed, "teleport");
  add(pad.buttons[6]?.pressed, "charge");
  add(pad.buttons[7]?.pressed, "run");
  add(pad.buttons[9]?.pressed, "pause");
  for (const action of next) {
    if (!input.gamepadHeld.has(action) && !input.held.has(action)) input.pressed.add(action);
    input.held.add(action);
  }
  for (const action of input.gamepadHeld) {
    if (!next.has(action)) {
      input.held.delete(action);
      input.released.add(action);
    }
  }
  input.gamepadHeld = next;
}

function spawnParticles(x, y, color, count = 8, speed = 130) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const force = speed * (0.5 + Math.random() * 0.6);
    particles.push({ x, y, vx: Math.cos(angle) * force, vy: Math.sin(angle) * force, life: 0.3 + Math.random() * 0.35, maxLife: 0.65, color, size: 2 + Math.random() * 4 });
  }
}

function setToast(text, duration = 2.4) {
  game.toast = text;
  game.toastTimer = duration;
  statusNode.textContent = text;
}

function castProjectile(type, x, y, vx, vy, damage, radius, life = 1.6) {
  projectiles.push({ type, owner: "player", x, y, vx, vy, damage, r: radius, life, bounces: type === "bubble" ? 2 : 0 });
}

function performAttack(type) {
  if (type === "attack" && player.attackCooldown <= 0 && player.mana >= 4) {
    player.attackCooldown = 0.28; player.actionTimer = 0.3; player.state = "varinha"; player.mana -= 4;
    castProjectile("magic", player.x + player.w / 2 + player.face * 24, player.y + 25, player.face * 520, 0, 18, 7, 0.65);
    spawnParticles(player.x + player.w / 2 + player.face * 25, player.y + 25, "#c76dff", 7, 90); beep(620, 0.07, "square");
  }
  if (type === "bubble" && player.bubbleCooldown <= 0 && player.mana >= 14) {
    player.bubbleCooldown = 0.65; player.actionTimer = 0.42; player.state = "bolha"; player.mana -= 14;
    castProjectile("bubble", player.x + player.w / 2 + player.face * 30, player.y + 24, player.face * 300, 0, 28, 15, 2.4);
    beep(340, 0.12, "sine");
  }
  if (type === "upAttack" && player.attackCooldown <= 0 && player.mana >= 9) {
    player.attackCooldown = 0.4; player.actionTimer = 0.38; player.state = "magia_cima"; player.mana -= 9;
    castProjectile("arcane", player.x + player.w / 2 + player.face * 28, player.y + 22, player.face * 450, 0, 24, 9, 1.15);
    spawnParticles(player.x + player.w / 2 + player.face * 28, player.y + 22, "#f5a2ff", 9, 100); beep(760, 0.08, "sine");
  }
}

function enterPortal() {
  if (!portal) return;
  const unlocked = game.level === 2 || game.runes >= 3;
  portal.unlocked = unlocked;
  if (!unlocked) {
    player.x = Math.min(player.x, portal.x - player.w - 8);
    setToast(`O portal exige 3 runas. Você possui ${game.runes}.`, 1.8);
    beep(145, 0.12, "square", 0.025);
    return;
  }
  if (game.level === 1) {
    game.mode = "transition";
    game.transitionTimer = 1.15;
    game.nextLevel = 2;
    player.state = "teleporte";
    player.vx = 0;
    spawnParticles(portal.x + portal.w / 2, portal.y + portal.h / 2, "#7cecff", 34, 250);
    setToast("O Portal de Avalon foi atravessado!", 2.2);
    beep(392, 0.12, "sine"); setTimeout(() => beep(587, 0.18, "sine"), 90); setTimeout(() => beep(880, 0.28, "sine"), 190);
    return;
  }
  game.mode = "won";
  game.score += player.hp * 10 + Math.round(player.mana) * 5 + 2500;
  setToast("A Torre de Cristal foi alcançada!", 6);
  beep(523, 0.12); setTimeout(() => beep(659, 0.12), 100); setTimeout(() => beep(784, 0.12), 200); setTimeout(() => beep(1046, 0.35), 300);
}

function releaseCharge() {
  if (player.charging < 0.12) { player.charging = 0; return; }
  const power = clamp(player.charging / 1.35, 0.18, 1);
  const manaCost = 10 + power * 20;
  if (player.mana >= manaCost) {
    player.mana -= manaCost;
    castProjectile("charge", player.x + player.w / 2 + player.face * 28, player.y + 22, player.face * (360 + power * 220), 0, 24 + power * 45, 10 + power * 13, 1.5);
    spawnParticles(player.x + player.w / 2 + player.face * 28, player.y + 22, "#ef75ff", 14, 180);
    player.state = "varinha"; player.actionTimer = 0.4;
    beep(360 + power * 460, 0.16, "sawtooth", 0.04);
  }
  player.charging = 0;
}

function teleport() {
  if (player.teleportCooldown > 0 || player.mana < 24) return;
  player.teleportCooldown = 1.1;
  player.mana -= 24;
  player.state = "teleporte";
  player.actionTimer = 0.38;
  spawnParticles(player.x + player.w / 2, player.y + player.h / 2, "#bd58ff", 18, 210);
  const origin = player.x;
  player.x = clamp(player.x + player.face * 220, 8, WORLD_W - player.w - 8);
  for (const platform of platforms) {
    if (rectsOverlap(player, platform)) player.x = origin;
  }
  spawnParticles(player.x + player.w / 2, player.y + player.h / 2, "#7ddfff", 18, 210);
  beep(880, 0.08, "sine"); setTimeout(() => beep(440, 0.12, "sine"), 55);
}

function interact() {
  player.state = "interagindo";
  player.actionTimer = 0.55;
  const px = player.x + player.w / 2;
  const sign = signs.find((item) => Math.abs(item.x - px) < 85);
  if (sign) { setToast(sign.text, 4); beep(520, 0.06); return; }
  const chest = chests.find((item) => !item.opened && Math.abs(item.x - px) < 80 && Math.abs(item.y - player.y) < 120);
  if (chest) {
    chest.opened = true;
    if (chest.reward === "key") { game.keys += 1; game.score += 250; setToast("Chave antiga encontrada!", 2.5); }
    else { player.hp = Math.min(100, player.hp + 45); game.score += 150; setToast("Poção da vida: +45 HP", 2.5); }
    spawnParticles(chest.x + 24, chest.y, "#ffd44d", 18, 170); beep(784, 0.09); setTimeout(() => beep(1046, 0.16), 80); return;
  }
  const nearbyAnimal = animals.find((animal) => Math.abs(animal.x - px) < 62 && Math.abs(animal.y - player.y) < 120);
  if (nearbyAnimal) { setToast(`O ${animalName(nearbyAnimal.type)} sente a magia de Merlin.`, 2.5); beep(680, 0.07, "sine"); return; }
  setToast("Nada para interagir por aqui.", 1.2);
}

function damagePlayer(amount, direction = 0) {
  if (player.invulnerable > 0 || player.state === "morto") return;
  if (input.held.has("shield") && player.mana > 2) {
    player.mana = Math.max(0, player.mana - amount * 0.45);
    player.state = "escudo";
    spawnParticles(player.x + player.w / 2, player.y + player.h / 2, "#54d8ff", 10, 130);
    beep(220, 0.08, "square");
    return;
  }
  player.hp = Math.max(0, player.hp - amount);
  player.invulnerable = 0.85;
  player.vx = direction * 210;
  game.shake = 0.25;
  if (player.hp <= 0) {
    player.state = "morto"; player.deadTimer = 2.2; player.vy = -260;
    setToast("Merlin caiu. Pressione ENTER para recomeçar.", 5); beep(120, 0.5, "sawtooth");
  } else if (amount >= 20) {
    player.state = "ferido_forte"; player.actionTimer = 0.45; player.knockdown = 1.15; player.vy = -260;
    setToast(`Golpe forte! -${amount} HP`, 1.2); beep(150, 0.16, "square");
  } else {
    player.state = "ferido_leve"; player.actionTimer = 0.35; player.vy = -120;
    setToast(`Merlin foi ferido: -${amount} HP`, 1); beep(190, 0.1, "square");
  }
}

function collectItems() {
  const hitbox = { x: player.x - 5, y: player.y - 5, w: player.w + 10, h: player.h + 10 };
  for (const item of collectibles) {
    if (item.collected || !rectsOverlap(hitbox, { x: item.x - 12, y: item.y - 12, w: 24, h: 24 })) continue;
    item.collected = true;
    if (item.type === "coin") { game.coins += 1; game.score += 100; beep(880, 0.07); }
    if (item.type === "fruit") { player.hp = Math.min(100, player.hp + 20); game.score += 80; setToast("Fruta encantada: +20 HP", 1.4); beep(620, 0.08, "sine"); }
    if (item.type === "crystal") { player.mana = Math.min(100, player.mana + 35); game.score += 120; setToast("Cristal arcano: +35 mana", 1.4); beep(740, 0.08, "sine"); }
    if (item.type === "rune") {
      game.runes += 1; game.score += 1000; game.checkpointX = item.x;
      setToast(`Runa de Brocéliande ${game.runes}/3`, 3);
      spawnParticles(item.x, item.y, "#fff36a", 26, 220);
      beep(523, 0.12); setTimeout(() => beep(659, 0.12), 100); setTimeout(() => beep(1046, 0.25), 210);
      if (game.runes === 3) game.quest = "O portão de Camelot está aberto!";
    }
    spawnParticles(item.x, item.y, item.type === "crystal" ? "#53dfff" : "#ffd84b", 10, 120);
  }
}

function resolvePlayerPlatforms(previousY) {
  player.onGround = false;
  for (const platform of platforms) {
    if (player.x + player.w <= platform.x + 4 || player.x >= platform.x + platform.w - 4) continue;
    const previousBottom = previousY + player.h;
    const currentBottom = player.y + player.h;
    if (player.vy >= 0 && previousBottom <= platform.y + 8 && currentBottom >= platform.y) {
      player.y = platform.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.jumpHold = 0;
      player.jumpReleased = false;
    }
  }
}

function updatePlayer(dt) {
  player.actionTimer = Math.max(0, player.actionTimer - dt);
  player.attackCooldown = Math.max(0, player.attackCooldown - dt);
  player.bubbleCooldown = Math.max(0, player.bubbleCooldown - dt);
  player.teleportCooldown = Math.max(0, player.teleportCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);

  if (player.state === "morto") {
    player.deadTimer -= dt;
    player.vy += GRAVITY * dt;
    const previousY = player.y;
    player.y += player.vy * dt;
    resolvePlayerPlatforms(previousY);
    if ((input.pressed.has("confirm") || input.pressed.has("jump") || input.pressed.has("attack")) && player.deadTimer <= 1.4) beginGame();
    return;
  }

  if (player.knockdown > 0) {
    player.knockdown -= dt;
    player.state = player.onGround && player.knockdown < 0.6 ? "caido" : "caindo";
    player.vy += GRAVITY * dt;
    const previousY = player.y;
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.vx *= 0.93;
    resolvePlayerPlatforms(previousY);
    if (player.knockdown <= 0) player.standup = 0.45;
    return;
  }

  if (player.standup > 0) {
    player.standup -= dt;
    player.state = "levantando";
    if (player.standup <= 0) player.state = "idle";
    return;
  }

  const shielding = input.held.has("shield") && player.mana > 0.5;
  if (shielding) {
    player.mana = Math.max(0, player.mana - 16 * dt);
    player.state = "escudo";
  } else if (!input.held.has("charge")) {
    player.mana = Math.min(100, player.mana + 7.5 * dt);
  }

  if (input.pressed.has("pause")) {
    game.mode = "paused";
    return;
  }

  if (input.pressed.has("interact")) interact();
  if (input.pressed.has("teleport")) teleport();
  if (input.pressed.has("attack")) performAttack("attack");
  if (input.pressed.has("bubble")) performAttack("bubble");
  if (input.pressed.has("upAttack")) performAttack("upAttack");

  if (input.held.has("charge") && player.mana >= 10) {
    player.charging = Math.min(1.35, player.charging + dt);
    player.wasCharging = true;
    player.state = "carregando";
    player.vx *= 0.8;
    if (Math.random() < 0.25) spawnParticles(player.x + player.w / 2 + player.face * 25, player.y + 22, "#dd66ff", 1, 70);
  } else if (player.wasCharging) {
    releaseCharge();
    player.wasCharging = false;
  }

  const crouching = input.held.has("down") && player.onGround;
  if (crouching) {
    player.crouched = true;
    player.state = "agachado";
  } else if (player.crouched) {
    player.crouched = false;
    player.actionTimer = Math.max(player.actionTimer, 0.28);
    player.state = "levantando";
  }

  let direction = 0;
  if (input.held.has("left")) direction -= 1;
  if (input.held.has("right")) direction += 1;
  if (direction) player.face = direction;
  const running = input.held.has("run");
  const speed = running ? 255 : 150;
  const canMove = !crouching && !shielding && player.charging === 0 && !["teleporte", "interagindo"].includes(player.state);
  const targetVx = canMove ? direction * speed : 0;
  player.vx = lerp(player.vx, targetVx, player.onGround ? 0.28 : 0.1);

  if (input.pressed.has("jump") && player.onGround && !crouching) {
    player.vy = -430;
    player.onGround = false;
    player.state = "pulando";
    player.jumpHold = 0.26;
    player.jumpReleased = false;
    playJumpSfx();
  }

  if (!player.onGround && player.vy < 0 && input.held.has("jump") && player.jumpHold > 0) {
    player.vy -= 920 * dt;
    player.jumpHold = Math.max(0, player.jumpHold - dt);
  }
  if (!player.onGround && player.vy < -150 && (!input.held.has("jump") || input.released.has("jump")) && !player.jumpReleased) {
    player.vy *= 0.48;
    player.jumpHold = 0;
    player.jumpReleased = true;
  }

  const previousY = player.y;
  player.vy += GRAVITY * dt;
  player.x = clamp(player.x + player.vx * dt, 0, WORLD_W - player.w);
  player.y += player.vy * dt;
  resolvePlayerPlatforms(previousY);

  if (player.y > H + 100) {
    player.hp = Math.max(1, player.hp - 25);
    player.x = game.checkpointX;
    player.y = 300;
    player.vx = 0; player.vy = 0;
    player.knockdown = 0.8;
    player.state = "ferido_forte";
    setToast("As águas devolveram Merlin ao último marco. -25 HP", 2.5);
  }

  if (player.actionTimer <= 0 && !shielding && player.charging === 0 && !crouching) {
    if (!player.onGround) player.state = player.vy < 0 ? "pulando" : "em_queda";
    else if (Math.abs(player.vx) > 180) player.state = "correndo";
    else if (Math.abs(player.vx) > 20) player.state = "andando";
    else player.state = "idle";
  }

  collectItems();
  if (portal && rectsOverlap(player, portal)) enterPortal();
}

function terrainTopAt(x, width = 1) {
  let top = 700;
  for (const platform of platforms) {
    if (x + width > platform.x && x < platform.x + platform.w) top = Math.min(top, platform.y);
  }
  return top;
}

function defeatEnemy(enemy, cause = "magic") {
  if (!enemy.alive) return;
  enemy.alive = false;
  enemy.visible = true;
  enemy.state = enemy.type === "dragon" ? "morto" : "morrendo";
  enemy.deathTimer = enemy.type === "dragon" ? 0.48 : 0.78;
  enemy.vy = cause === "stomp" ? 30 : -90;
  game.score += cause === "stomp" ? (enemy.type === "dragon" ? 900 : 350) : (enemy.type === "dragon" ? 700 : 250);
  spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.type === "dragon" ? "#ff9c35" : "#a7df46", 22, 230);
  if (enemy.type === "dragon") setToast(cause === "stomp" ? "Pisão lendário! Dragão derrotado." : "Dragão vencido! A floresta respira novamente.", 2.2);
  else if (cause === "stomp") setToast("Pisão mágico! Inimigo derrotado.", 1.5);
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.visible) continue;
    if (!enemy.alive) {
      enemy.deathTimer -= dt;
      if (enemy.type !== "dragon") enemy.state = enemy.deathTimer > 0.28 ? "morrendo" : "morto";
      if (enemy.deathTimer <= 0) enemy.visible = false;
      continue;
    }
    enemy.flash = Math.max(0, enemy.flash - dt);
    enemy.stateTimer = Math.max(0, enemy.stateTimer - dt);
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    enemy.defendTimer = Math.max(0, enemy.defendTimer - dt);
    enemy.jumpCooldown = Math.max(0, enemy.jumpCooldown - dt);
    enemy.fire -= dt;
    const distance = player.x - enemy.x;
    if (Math.abs(distance) < (enemy.type === "dragon" ? 380 : 190)) enemy.dir = Math.sign(distance) || enemy.dir;

    if (enemy.type !== "dragon") {
      const incoming = projectiles.find((projectile) => projectile.owner === "player" && Math.abs(projectile.x - (enemy.x + enemy.w / 2)) < 145 && Math.sign(projectile.vx) === Math.sign(enemy.x - projectile.x));
      if (enemy.stateTimer <= 0 && incoming && enemy.defendTimer <= 0) {
        enemy.state = incoming.y < enemy.y + 18 ? "agachado" : "defendendo";
        enemy.stateTimer = 0.34;
        enemy.defendTimer = 1.25;
      } else if (enemy.onGround && enemy.jumpCooldown <= 0 && Math.abs(distance) < 155 && player.y + player.h < enemy.y - 30) {
        enemy.vy = -335;
        enemy.onGround = false;
        enemy.jumpCooldown = 2.2;
        enemy.state = "pulando";
        enemy.stateTimer = 0.28;
      } else if (enemy.stateTimer <= 0) {
        if (Math.abs(distance) < 66 && enemy.attackTimer <= 0) {
          enemy.state = "atacando";
          enemy.stateTimer = 0.3;
          enemy.attackTimer = 0.72;
        } else if (Math.abs(distance) < 240) enemy.state = "correndo";
        else if (Math.sin(game.time * 0.8 + enemy.home * 0.01) > 0.72) enemy.state = "parado";
        else enemy.state = "andando";
      }
    }

    const speed = enemy.type === "dragon" ? 34 : enemy.state === "correndo" ? 92 : enemy.state === "andando" ? 48 : 0;
    const nextX = enemy.x + enemy.dir * speed * dt;
    const nextFloor = terrainTopAt(nextX, enemy.w);
    if (Math.abs(nextX - enemy.home) > enemy.range || nextFloor > 600) enemy.dir *= -1;
    else enemy.x = nextX;
    const floor = terrainTopAt(enemy.x, enemy.w);
    if (!enemy.onGround) {
      enemy.vy += GRAVITY * 0.72 * dt;
      enemy.y += enemy.vy * dt;
      if (enemy.y + enemy.h >= floor) {
        enemy.y = floor - enemy.h;
        enemy.vy = 0;
        enemy.onGround = true;
      } else if (enemy.type !== "dragon") enemy.state = "pulando";
    } else enemy.y = floor - enemy.h;

    if (enemy.type === "dragon" && Math.abs(distance) < 430 && enemy.fire <= 0) {
      enemy.fire = 2.1 + Math.random();
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const length = Math.hypot(dx, dy) || 1;
      projectiles.push({ type: "fire", owner: "enemy", x: enemy.x + enemy.w / 2, y: enemy.y + 25, vx: dx / length * 230, vy: dy / length * 230, damage: 22, r: 9, life: 2.6, bounces: 0 });
      beep(100, 0.18, "sawtooth", 0.025);
    }

    if (rectsOverlap(player, enemy)) {
      const previousBottom = player.y + player.h - Math.max(0, player.vy * dt);
      const stomped = player.vy > 80 && previousBottom <= enemy.y + 11 && player.y < enemy.y;
      if (stomped) {
        defeatEnemy(enemy, "stomp");
        player.y = enemy.y - player.h;
        player.vy = -390;
        player.onGround = false;
        player.state = "pulando";
        player.jumpHold = 0;
        player.jumpReleased = true;
        beep(210, 0.06, "square"); setTimeout(() => beep(440, 0.1, "square"), 55);
        continue;
      }
      damagePlayer(enemy.type === "dragon" ? 24 : 14, Math.sign(player.x - enemy.x));
    }
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const projectile = projectiles[i];
    projectile.life -= dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    if (projectile.type === "fire") projectile.vy += 30 * dt;

    let remove = projectile.life <= 0 || projectile.x < -50 || projectile.x > WORLD_W + 50 || projectile.y < -80 || projectile.y > H + 150;
    if (projectile.owner === "player") {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        const hit = { x: projectile.x - projectile.r, y: projectile.y - projectile.r, w: projectile.r * 2, h: projectile.r * 2 };
        if (!rectsOverlap(hit, enemy)) continue;
        const defended = enemy.type !== "dragon" && enemy.state === "defendendo";
        const damage = defended ? projectile.damage * 0.25 : projectile.damage;
        enemy.hp -= damage;
        enemy.flash = 0.12;
        enemy.dir = Math.sign(enemy.x - player.x) || enemy.dir;
        enemy.hitCount += 1;
        if (enemy.type !== "dragon" && !defended) {
          enemy.state = "levando_dano";
          enemy.stateTimer = 0.2;
        }
        spawnParticles(projectile.x, projectile.y, projectile.type === "bubble" ? "#68e6ff" : "#d76cff", 10, 150);
        beep(defended ? 170 : 240, defended ? 0.09 : 0.05, "square", 0.02);
        if (enemy.hp <= 0) {
          defeatEnemy(enemy, "magic");
        }
        if (projectile.type !== "bubble" || projectile.bounces <= 0) remove = true;
        else { projectile.bounces -= 1; projectile.vx *= -0.75; projectile.vy = -120; }
        break;
      }
    } else {
      const hit = { x: projectile.x - projectile.r, y: projectile.y - projectile.r, w: projectile.r * 2, h: projectile.r * 2 };
      if (rectsOverlap(hit, player)) { damagePlayer(projectile.damage, Math.sign(projectile.vx)); remove = true; }
    }
    if (remove) projectiles.splice(i, 1);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += 160 * dt;
    particle.vx *= 0.98;
    if (particle.life <= 0) particles.splice(i, 1);
  }
}

function update(dt) {
  pollGamepad();
  game.time += dt;
  if (game.shortcutsVisible || game.settingsOpen) {
    input.pressed.clear(); input.released.clear();
    return;
  }
  if (input.pressed.has("confirm") && game.mode === "title") beginGame();
  if (game.mode === "paused") {
    if (input.pressed.has("pause") || input.pressed.has("confirm")) game.mode = "playing";
    input.pressed.clear(); input.released.clear();
    return;
  }
  if (game.mode === "won") {
    if (input.pressed.has("confirm") || input.pressed.has("jump") || input.pressed.has("attack")) beginGame();
    input.pressed.clear(); input.released.clear();
    return;
  }
  if (game.mode === "transition") {
    game.transitionTimer -= dt;
    updateParticles(dt);
    if (game.toastTimer > 0) game.toastTimer -= dt;
    if (game.transitionTimer <= 0) {
      loadLevel(game.nextLevel || 2, true);
      game.mode = "playing";
      game.nextLevel = 0;
      setToast("Fase 2 — Avalon", 2.4);
    }
    input.pressed.clear(); input.released.clear();
    return;
  }
  if (game.mode === "playing") {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateParticles(dt);
    if (game.toastTimer > 0) game.toastTimer -= dt;
    game.shake = Math.max(0, game.shake - dt);
    const targetCamera = clamp(player.x - W * 0.38, 0, WORLD_W - W);
    game.cameraX = lerp(game.cameraX, targetCamera, 0.08);
  }
  input.pressed.clear();
  input.released.clear();
}

function pixelRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(roundPixel(x), roundPixel(y), roundPixel(w), roundPixel(h));
}

function drawCloud(x, y, scale = 1) {
  const s = 8 * scale;
  pixelRect(x + s, y, s * 4, s, "#fff");
  pixelRect(x, y + s, s * 7, s * 2, "#fff");
  pixelRect(x + s, y + s * 3, s * 5, s, "#dff3ff");
}

function drawCastle(x, baseY, scale = 1) {
  ctx.save(); ctx.translate(roundPixel(x), roundPixel(baseY)); ctx.scale(scale, scale);
  pixelRect(-55, -96, 110, 96, "#d5d3e7");
  pixelRect(-72, -76, 25, 76, "#bbb9d8"); pixelRect(47, -76, 25, 76, "#aaa8ce");
  pixelRect(-25, -126, 50, 126, "#c8c6df");
  pixelRect(-29, -135, 58, 12, "#7e62ce");
  ctx.fillStyle = "#684ab8"; ctx.beginPath(); ctx.moveTo(-30, -135); ctx.lineTo(0, -174); ctx.lineTo(30, -135); ctx.fill();
  ctx.fillStyle = "#7954c9";
  for (const tx of [-60, 60]) { ctx.beginPath(); ctx.moveTo(tx - 16, -76); ctx.lineTo(tx, -112); ctx.lineTo(tx + 16, -76); ctx.fill(); }
  for (const wx of [-45, -16, 13, 42]) pixelRect(wx, -55, 10, 20, "#655b9e");
  pixelRect(-12, -35, 24, 35, "#584b89");
  ctx.restore();
}

function drawBackground() {
  if (art.background?.ready) {
    const image = art.background.image;
    const sourceRatio = image.width / image.height;
    const targetRatio = W / H;
    let sx = 0, sy = 0, sw = image.width, sh = image.height;
    if (sourceRatio > targetRatio) {
      sw = image.height * targetRatio;
      sx = (image.width - sw) / 2 + Math.sin(game.cameraX / WORLD_W * Math.PI) * 80;
      sx = clamp(sx, 0, image.width - sw);
    } else {
      sh = image.width / targetRatio;
      sy = (image.height - sh) / 2;
    }
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, W, H);
    if (game.level === 2) {
      ctx.fillStyle = "rgba(79, 35, 145, .28)"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(185, 239, 255, .8)";
      for (let i = 0; i < 34; i++) {
        const x = (i * 173 + 41 - game.cameraX * 0.04) % (W + 80);
        const y = 38 + (i * 67) % 245;
        pixelRect(x, y, i % 3 === 0 ? 3 : 2, i % 3 === 0 ? 3 : 2, i % 4 ? "#d9f7ff" : "#ffe7a0");
      }
    }
    return;
  }
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, "#2499f4"); sky.addColorStop(0.65, "#7bd5f4"); sky.addColorStop(1, "#c4f0df");
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

  const cloudShift = (game.cameraX * 0.06) % 1200;
  drawCloud(110 - cloudShift, 80, 1.1); drawCloud(470 - cloudShift, 130, 0.75); drawCloud(820 - cloudShift, 66, 0.9); drawCloud(1210 - cloudShift, 110, 1);

  const farShift = game.cameraX * 0.12;
  ctx.fillStyle = "#7897cf";
  for (let x = -300; x < W + 500; x += 260) {
    const sx = x - (farShift % 260);
    ctx.beginPath(); ctx.moveTo(sx, 350); ctx.lineTo(sx + 130, 160 + ((x / 260) % 2) * 45); ctx.lineTo(sx + 280, 350); ctx.fill();
    ctx.fillStyle = "#d8ecf4"; ctx.beginPath(); ctx.moveTo(sx + 82, 226); ctx.lineTo(sx + 130, 160 + ((x / 260) % 2) * 45); ctx.lineTo(sx + 171, 230); ctx.fill(); ctx.fillStyle = "#7897cf";
  }

  const treeShift = game.cameraX * 0.32;
  ctx.fillStyle = "#177a72";
  for (let x = -80; x < W + 120; x += 62) {
    const sx = x - (treeShift % 62);
    const height = 55 + ((x * 17) % 38);
    ctx.beginPath(); ctx.moveTo(sx, 410); ctx.lineTo(sx + 31, 410 - height); ctx.lineTo(sx + 62, 410); ctx.fill();
  }
  drawCastle(810 - game.cameraX * 0.18, 310, 0.85);
}

function drawGroundTile(platform) {
  if (platform.h >= 100 && art.ground?.ready) {
    drawArt(art.ground, platform.x, platform.y - 1, platform.w, platform.h + 1);
    return;
  }
  if (platform.h < 100 && art.floating?.ready) {
    const visualHeight = Math.max(64, platform.w * 0.42);
    drawArt(art.floating, platform.x, platform.y - 4, platform.w, visualHeight);
    return;
  }
  pixelRect(platform.x, platform.y, platform.w, platform.h, "#6a361f");
  pixelRect(platform.x, platform.y, platform.w, 11, "#4bc835");
  pixelRect(platform.x, platform.y + 11, platform.w, 7, "#218d35");
  for (let x = platform.x + 8; x < platform.x + platform.w; x += 24) {
    const row = Math.floor((x - platform.x) / 24);
    pixelRect(x, platform.y + 25 + (row % 3) * 14, 14, 9, row % 2 ? "#9d5728" : "#7e4225");
    pixelRect(x + 4, platform.y + 29 + (row % 3) * 14, 7, 5, "#b96b32");
  }
}

function drawTree(x, y, kind = 0) {
  const colors = kind === 2 ? ["#814b91", "#b56ad1"] : kind === 1 ? ["#0d8060", "#2bc35c"] : ["#137e3f", "#43c734"];
  pixelRect(x - 9, y - 76, 18, 78, "#744124"); pixelRect(x - 5, y - 72, 7, 74, "#a3612b");
  pixelRect(x - 42, y - 122, 84, 52, colors[0]); pixelRect(x - 30, y - 142, 60, 74, colors[1]);
  pixelRect(x - 48, y - 104, 30, 34, colors[1]); pixelRect(x + 18, y - 110, 30, 40, colors[0]);
}

function drawBush(x, y, flowers = false) {
  pixelRect(x - 26, y - 22, 52, 22, "#177b3c"); pixelRect(x - 18, y - 31, 36, 31, "#35b83f");
  if (flowers) { pixelRect(x - 12, y - 20, 5, 5, "#ff78bd"); pixelRect(x + 10, y - 13, 5, 5, "#ffd753"); }
}

function drawPortal() {
  if (!portal) return;
  const unlocked = game.level === 2 || game.runes >= 3;
  portal.unlocked = unlocked;
  const centerX = portal.x + portal.w / 2;
  const centerY = portal.y + portal.h / 2;
  ctx.save();
  pixelRect(portal.x - 15, portal.y + 3, 18, portal.h - 3, game.level === 2 ? "#8fd9e8" : "#aaa7c9");
  pixelRect(portal.x + portal.w - 3, portal.y + 3, 18, portal.h - 3, game.level === 2 ? "#8fd9e8" : "#aaa7c9");
  pixelRect(portal.x - 24, portal.y - 7, portal.w + 48, 15, game.level === 2 ? "#c8f7ff" : "#d6d3e8");
  ctx.lineWidth = 8;
  ctx.strokeStyle = unlocked ? (game.level === 2 ? "#6ff5ff" : "#a86dff") : "#4f466d";
  ctx.beginPath(); ctx.ellipse(centerX, centerY + 2, 31, 57, 0, 0, Math.PI * 2); ctx.stroke();
  if (unlocked) {
    const gradient = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, 34);
    gradient.addColorStop(0, game.level === 2 ? "rgba(255,255,210,.92)" : "rgba(165,245,255,.95)");
    gradient.addColorStop(.45, game.level === 2 ? "rgba(72,218,255,.72)" : "rgba(144,91,255,.75)");
    gradient.addColorStop(1, "rgba(38,14,86,.18)");
    ctx.fillStyle = gradient; ctx.beginPath(); ctx.ellipse(centerX, centerY + 2, 27, 53, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 9; i++) {
      const angle = game.time * (i % 2 ? 1.8 : -1.3) + i * Math.PI * 2 / 9;
      pixelRect(centerX + Math.cos(angle) * (13 + i % 3 * 5), centerY + Math.sin(angle) * 35, 4, 4, i % 2 ? "#fff7a8" : "#d9f8ff");
    }
  } else {
    for (let x = portal.x + 12; x < portal.x + portal.w - 5; x += 15) pixelRect(x, portal.y + 17, 7, portal.h - 28, "#4d4368");
    pixelRect(portal.x + 8, centerY - 5, portal.w - 16, 10, "#4d4368");
  }
  ctx.restore();
}

function drawScenery() {
  const trees = game.level === 2 ? [
    [120, 445, 2], [720, 445, 2], [1350, 445, 1], [2080, 445, 2], [2660, 445, 2],
    [3160, 445, 1], [3740, 445, 2], [4300, 445, 2], [4930, 445, 1]
  ] : [
    [120, 445, 0], [680, 445, 1], [1490, 445, 0], [1770, 445, 2], [2600, 445, 0],
    [2960, 445, 1], [3650, 445, 2], [4140, 445, 0], [4890, 445, 0]
  ];
  const bushes = [[340,445,1],[590,445,0],[1280,445,1],[2110,445,0],[2450,445,1],[3210,445,0],[3890,445,1],[4750,445,1]];
  for (const tree of trees) drawTree(...tree);
  for (const bush of bushes) drawBush(...bush);

  for (const sign of signs) {
    pixelRect(sign.x - 4, sign.y, 8, 55, "#75401f"); pixelRect(sign.x - 31, sign.y - 5, 62, 26, "#a9662c");
    pixelRect(sign.x - 23, sign.y + 3, 38, 3, "#d28b3b");
    ctx.fillStyle = "#5b321d"; ctx.beginPath(); ctx.moveTo(sign.x + 31, sign.y - 5); ctx.lineTo(sign.x + 43, sign.y + 8); ctx.lineTo(sign.x + 31, sign.y + 21); ctx.fill();
  }

  for (const chest of chests) drawChest(chest);

  drawPortal();
}

function drawChest(chest) {
  if (chest.opened) {
    pixelRect(chest.x, chest.y + 12, 48, 25, "#8c4b1f"); pixelRect(chest.x + 4, chest.y - 3, 40, 12, "#c57a28");
    pixelRect(chest.x + 20, chest.y + 12, 9, 10, "#ffd047");
  } else {
    pixelRect(chest.x, chest.y, 48, 38, "#8c4b1f"); pixelRect(chest.x + 3, chest.y - 5, 42, 17, "#d68a2e");
    pixelRect(chest.x + 19, chest.y + 8, 11, 14, "#ffd047"); pixelRect(chest.x + 22, chest.y + 12, 5, 7, "#6f431e");
  }
}

function animalName(type) {
  return ({ rabbit: "coelho", squirrel: "esquilo", deer: "cervo", fox: "raposa", hedgehog: "ouriço", bird: "pássaro", owl: "coruja", frog: "sapo" })[type] || type;
}

function drawAnimal(animal) {
  const bob = Math.sin(game.time * 3 + animal.phase) * 1.5;
  ctx.save(); ctx.translate(roundPixel(animal.x), roundPixel(animal.y + bob)); ctx.scale(animal.dir, 1);
  if (animal.type === "rabbit") {
    pixelRect(-12, -20, 24, 20, "#f7f3e9"); pixelRect(5, -30, 15, 18, "#fff"); pixelRect(8, -48, 5, 22, "#fff"); pixelRect(16, -46, 5, 20, "#fff"); pixelRect(15, -25, 3, 3, "#3a2841");
  } else if (animal.type === "squirrel") {
    pixelRect(-8, -20, 24, 20, "#cf7b2b"); pixelRect(10, -30, 14, 15, "#e99938"); pixelRect(-22, -31, 18, 27, "#b75a22"); pixelRect(19, -26, 3, 3, "#221b23");
  } else if (animal.type === "deer") {
    pixelRect(-22, -34, 42, 27, "#b66b2c"); pixelRect(14, -52, 13, 30, "#c17b36"); pixelRect(22, -64, 3, 15, "#7d4725"); pixelRect(16, -64, 3, 14, "#7d4725"); pixelRect(-15, -8, 5, 10, "#6d4024"); pixelRect(10, -8, 5, 10, "#6d4024");
  } else if (animal.type === "fox") {
    pixelRect(-20, -20, 38, 20, "#e56f28"); pixelRect(9, -30, 20, 20, "#f28832"); pixelRect(14, -40, 7, 13, "#d95327"); pixelRect(24, -38, 7, 12, "#d95327"); pixelRect(-33, -17, 20, 11, "#d85822"); pixelRect(25, -23, 5, 4, "#fff");
  } else if (animal.type === "hedgehog") {
    ctx.fillStyle = "#6c4a37"; ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(-18, -22); ctx.lineTo(-10, -16); ctx.lineTo(-4, -27); ctx.lineTo(4, -17); ctx.lineTo(12, -25); ctx.lineTo(18, -10); ctx.lineTo(24, 0); ctx.fill(); pixelRect(10, -13, 17, 13, "#d1a26c");
  } else if (animal.type === "bird") {
    pixelRect(-13, -11, 25, 16, "#318ddb"); pixelRect(8, -16, 13, 13, "#54baff"); pixelRect(20, -12, 8, 4, "#ffd04a"); pixelRect(-4, -19 + Math.sin(game.time * 8) * 7, 15, 8, "#2570c3");
  } else if (animal.type === "owl") {
    pixelRect(-15, -28, 30, 28, "#f1f0e9"); pixelRect(-18, -31, 12, 14, "#fff"); pixelRect(6, -31, 12, 14, "#fff"); pixelRect(-11, -26, 4, 4, "#2a2750"); pixelRect(7, -26, 4, 4, "#2a2750"); pixelRect(-3, -19, 6, 6, "#e9a82f");
  } else if (animal.type === "frog") {
    pixelRect(-18, -15, 36, 15, "#4aa83c"); pixelRect(-13, -22, 10, 10, "#68cc51"); pixelRect(5, -22, 10, 10, "#68cc51"); pixelRect(-10, -19, 3, 3, "#131927"); pixelRect(8, -19, 3, 3, "#131927");
  }
  ctx.restore();
}

function drawEnemy(enemy) {
  if (enemy.type !== "dragon") {
    const state = enemy.state || "andando";
    const asset = art[`enemy:${state}`] || art.enemy;
    if (asset?.ready) {
      const fallen = ["morrendo", "morto"].includes(state);
      const bob = ["andando", "correndo"].includes(state) ? Math.sin(game.time * (state === "correndo" ? 16 : 10) + enemy.home) * 1.5 : 0;
      ctx.save();
      ctx.translate(roundPixel(enemy.x + enemy.w / 2), roundPixel(enemy.y + enemy.h + bob));
      ctx.scale(enemy.dir, 1);
      if (enemy.flash > 0 && Math.floor(game.time * 30) % 2) ctx.globalAlpha = 0.48;
      drawArtFitted(asset, fallen ? 94 : 78, fallen ? 66 : 76);
      ctx.restore();
      if (enemy.alive && enemy.hp < enemy.maxHp) {
        pixelRect(enemy.x, enemy.y - 10, enemy.w, 4, "#4a1d30"); pixelRect(enemy.x, enemy.y - 10, enemy.w * enemy.hp / enemy.maxHp, 4, "#ff5353");
      }
      return;
    }
  }
  if (enemy.type !== "dragon" && art.enemy?.ready) {
    ctx.save();
    ctx.translate(roundPixel(enemy.x + enemy.w / 2), roundPixel(enemy.y + enemy.h));
    ctx.scale(enemy.dir, 1);
    if (enemy.flash > 0) ctx.globalAlpha = 0.55;
    drawArt(art.enemy, -36, -66, 72, 66);
    ctx.restore();
    if (enemy.alive && enemy.hp < enemy.maxHp) {
      pixelRect(enemy.x, enemy.y - 10, enemy.w, 4, "#4a1d30"); pixelRect(enemy.x, enemy.y - 10, enemy.w * enemy.hp / enemy.maxHp, 4, "#ff5353");
    }
    return;
  }
  ctx.save(); ctx.translate(roundPixel(enemy.x + enemy.w / 2), roundPixel(enemy.y + enemy.h)); ctx.scale(enemy.dir, 1);
  const flash = enemy.flash > 0 ? "#fff" : null;
  if (enemy.type === "slime") {
    pixelRect(-18, -20, 36, 20, flash || "#42a9e5"); pixelRect(-13, -28, 26, 16, flash || "#51c6f2"); pixelRect(-8, -19, 5, 7, "#162557"); pixelRect(7, -19, 5, 7, "#162557"); pixelRect(-4, -8, 12, 3, "#246895");
  } else if (enemy.type === "boar") {
    pixelRect(-24, -26, 42, 26, flash || "#7c4a2a"); pixelRect(10, -22, 20, 18, flash || "#9c6233"); pixelRect(25, -13, 10, 5, "#f4dfbf"); pixelRect(-15, -34, 7, 12, "#5a3526");
  } else {
    const body = flash || "#784bd1";
    pixelRect(-30, -39, 48, 34, body); pixelRect(12, -52, 26, 30, body); pixelRect(33, -44, 14, 7, "#d8b64b");
    pixelRect(-22, -57, 12, 20, "#9b65ed"); pixelRect(-14, -67, 18, 16, "#8b58df");
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(-24, -36); ctx.lineTo(-55, -57); ctx.lineTo(-44, -24); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-26, -22); ctx.lineTo(-58, -7); ctx.lineTo(-29, -4); ctx.fill();
    pixelRect(27, -43, 4, 4, "#fff"); pixelRect(30, -42, 3, 3, "#ef4040");
  }
  ctx.restore();
  if (enemy.alive && enemy.hp < enemy.maxHp) {
    pixelRect(enemy.x, enemy.y - 10, enemy.w, 4, "#4a1d30"); pixelRect(enemy.x, enemy.y - 10, enemy.w * enemy.hp / enemy.maxHp, 4, "#ff5353");
  }
}

function drawCollectible(item) {
  const y = item.y + Math.sin(game.time * 3 + item.bob) * 5;
  if (item.type === "coin") {
    const frame = Math.floor(game.time * 12 + item.bob) % COIN_ART_FILES.length;
    const asset = art[`coin:${frame}`];
    if (asset?.ready) {
      ctx.save(); ctx.translate(roundPixel(item.x), roundPixel(y + 15));
      drawArtFitted(asset, 34, 34);
      ctx.restore();
    } else {
      pixelRect(item.x - 8, y - 12, 16, 24, "#f59d22"); pixelRect(item.x - 4, y - 10, 8, 20, "#ffe34d"); pixelRect(item.x - 1, y - 7, 3, 14, "#fff3a1");
    }
  } else if (item.type === "fruit") {
    pixelRect(item.x - 9, y - 8, 18, 17, "#ee4e3e"); pixelRect(item.x - 3, y - 14, 5, 7, "#6b3f25"); pixelRect(item.x + 1, y - 15, 10, 5, "#41b843");
  } else if (item.type === "crystal") {
    ctx.fillStyle = "#45c8ff"; ctx.beginPath(); ctx.moveTo(item.x, y - 16); ctx.lineTo(item.x + 10, y - 5); ctx.lineTo(item.x + 5, y + 14); ctx.lineTo(item.x - 8, y + 12); ctx.lineTo(item.x - 11, y - 4); ctx.fill(); pixelRect(item.x - 2, y - 9, 4, 15, "#c3f6ff");
  } else {
    ctx.save(); ctx.translate(item.x, y); ctx.rotate(game.time * 0.8);
    ctx.fillStyle = "#ffe75c"; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const radius = i % 2 ? 8 : 18; const angle = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius); }
    ctx.closePath(); ctx.fill(); pixelRect(-3, -3, 6, 6, "#fff9af"); ctx.restore();
  }
}

function drawProjectile(projectile) {
  if (projectile.type === "bubble") {
    ctx.strokeStyle = "#8befff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, projectile.r, 0, Math.PI * 2); ctx.stroke();
    pixelRect(projectile.x - projectile.r * .45, projectile.y - projectile.r * .55, 5, 5, "#fff");
  } else if (projectile.type === "fire") {
    pixelRect(projectile.x - 9, projectile.y - 7, 18, 14, "#f04b28"); pixelRect(projectile.x - 5, projectile.y - 5, 12, 10, "#ffbe35");
  } else {
    const color = projectile.type === "arcane" ? "#f1a3ff" : projectile.type === "charge" ? "#ef62ff" : "#9d56ff";
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(projectile.x, projectile.y, projectile.r, 0, Math.PI * 2); ctx.fill();
    pixelRect(projectile.x - 3, projectile.y - 3, 6, 6, "#fff");
  }
}

function drawWizardFallback() {
  const state = player.state;
  const moving = state === "andando" || state === "correndo";
  const frame = Math.floor(game.time * (state === "correndo" ? 12 : 7)) % 4;
  const bob = moving ? (frame % 2) * 2 : Math.sin(game.time * 2.5) * 1;
  let tilt = 0;
  let scaleY = 1;
  let yOffset = bob;
  if (state === "ferido_leve") tilt = -player.face * 0.12;
  if (["ferido_forte", "caindo"].includes(state)) tilt = -player.face * 0.7;
  if (state === "caido" || state === "morto") { tilt = -player.face * 1.45; yOffset = 17; }
  if (state === "agachado") { scaleY = 0.72; yOffset = 16; }
  if (state === "levantando") { scaleY = 0.82 + (Math.sin(game.time * 18) + 1) * 0.08; yOffset = 10; }
  if (state === "teleporte") ctx.globalAlpha = 0.35 + Math.abs(Math.sin(game.time * 38)) * 0.45;
  if (player.invulnerable > 0 && Math.floor(game.time * 18) % 2) ctx.globalAlpha *= 0.55;

  ctx.save();
  ctx.translate(roundPixel(player.x + player.w / 2), roundPixel(player.y + player.h + yOffset));
  ctx.scale(player.face, scaleY);
  ctx.rotate(tilt);

  const step = moving ? (frame < 2 ? -4 : 4) : 0;
  pixelRect(-13 + step, -5, 11, 5, "#5a2f21"); pixelRect(4 - step, -5, 11, 5, "#5a2f21");
  ctx.fillStyle = "#4d31a8"; ctx.beginPath(); ctx.moveTo(-15, -35); ctx.lineTo(16, -35); ctx.lineTo(21, -6); ctx.lineTo(-19, -6); ctx.fill();
  pixelRect(-13, -34, 27, 9, "#7752e5");
  pixelRect(-11, -53, 23, 21, "#efaa67"); pixelRect(-7, -47, 4, 5, "#241c3f"); pixelRect(6, -47, 4, 5, "#241c3f");
  pixelRect(-13, -57, 29, 6, "#4e2ca2");
  ctx.fillStyle = "#6843d2"; ctx.beginPath(); ctx.moveTo(-16, -57); ctx.lineTo(4, -84); ctx.lineTo(12, -57); ctx.fill();
  pixelRect(-7, -71, 10, 5, "#845cec"); pixelRect(4, -83, 6, 6, "#ffd14b");
  ctx.fillStyle = "#fff8e9"; ctx.beginPath(); ctx.moveTo(-13, -38); ctx.lineTo(15, -38); ctx.lineTo(10, -11); ctx.lineTo(3, -20); ctx.lineTo(-2, -9); ctx.lineTo(-8, -22); ctx.lineTo(-15, -13); ctx.fill();

  let armY = -31;
  let staffAngle = 0;
  if (["varinha", "bolha"].includes(state)) { armY = -37; staffAngle = -1.2; }
  if (state === "magia_cima") staffAngle = Math.PI / 2;
  const staffX = 19;
  ctx.save(); ctx.translate(staffX, armY); ctx.rotate(staffAngle);
  pixelRect(-3, -26, 6, 50, "#8e542c"); pixelRect(-7, -32, 14, 14, "#7d50e8"); pixelRect(-3, -28, 6, 6, "#e7c9ff");
  ctx.restore();

  if (state === "carregando") {
    const power = clamp(player.charging / 1.35, 0, 1);
    ctx.strokeStyle = "#ec80ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(23, -52, 8 + power * 14, 0, Math.PI * 2); ctx.stroke();
    pixelRect(20, -55, 6, 6, "#fff");
  }
  ctx.restore();

  if (state === "escudo") {
    ctx.strokeStyle = "#4ad9ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 38 + Math.sin(game.time * 7) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#d9faff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 31, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawWizard() {
  const moving = player.state === "andando" || player.state === "correndo";
  const asset = art[`merlin:${player.state}`] || (moving ? art.merlinWalking : art.merlinIdle);
  if (!asset?.ready) {
    drawWizardFallback();
    return;
  }

  const frame = Math.floor(game.time * (player.state === "correndo" ? 11 : 7)) % 4;
  const fallen = ["caido", "morto"].includes(player.state);
  const bob = moving ? (frame % 2) * 1.6 : player.state === "idle" ? Math.sin(game.time * 2.5) * 0.8 : 0;

  ctx.save();
  ctx.translate(roundPixel(player.x + player.w / 2), roundPixel(player.y + player.h + bob));
  ctx.scale(player.face, 1);
  if (player.state === "teleporte") ctx.globalAlpha = 0.3 + Math.abs(Math.sin(game.time * 38)) * 0.6;
  if (player.invulnerable > 0 && Math.floor(game.time * 18) % 2) ctx.globalAlpha *= 0.5;
  drawArtFitted(asset, fallen ? 100 : 88, fallen ? 66 : 91);

  if (["varinha", "bolha", "magia_cima"].includes(player.state)) {
    const orbX = 39;
    const orbY = -47;
    ctx.fillStyle = player.state === "bolha" ? "#70e8ff" : "#ce65ff";
    ctx.beginPath(); ctx.arc(orbX, orbY, 7 + Math.sin(game.time * 18) * 2, 0, Math.PI * 2); ctx.fill();
    pixelRect(orbX - 2, orbY - 2, 4, 4, "#fff");
  }
  if (player.state === "carregando") {
    const power = clamp(player.charging / 1.35, 0, 1);
    ctx.strokeStyle = "#ec80ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(38, -47, 8 + power * 14, 0, Math.PI * 2); ctx.stroke();
    pixelRect(35, -50, 6, 6, "#fff");
  }
  ctx.restore();

  if (player.state === "escudo") {
    ctx.strokeStyle = "#4ad9ff"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 43 + Math.sin(game.time * 7) * 2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "#d9faff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(player.x + player.w / 2, player.y + player.h / 2, 35, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawWorld() {
  ctx.save();
  const shakeX = game.shake > 0 ? (Math.random() - 0.5) * 8 : 0;
  const shakeY = game.shake > 0 ? (Math.random() - 0.5) * 6 : 0;
  ctx.translate(roundPixel(-game.cameraX + shakeX), roundPixel(shakeY));
  for (const platform of platforms) drawGroundTile(platform);
  drawScenery();
  for (const animal of animals) drawAnimal(animal);
  for (const item of collectibles) if (!item.collected) drawCollectible(item);
  for (const enemy of enemies) if (enemy.visible) drawEnemy(enemy);
  for (const projectile of projectiles) drawProjectile(projectile);
  drawWizard();
  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    pixelRect(particle.x, particle.y, particle.size, particle.size, particle.color);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawBar(x, y, width, value, color, label) {
  pixelRect(x, y, width, 14, "#17112f"); pixelRect(x + 3, y + 3, (width - 6) * clamp(value / 100, 0, 1), 8, color);
  ctx.fillStyle = "#fff"; ctx.font = "bold 11px monospace"; ctx.fillText(label, x + 6, y + 11);
}

function drawHud() {
  ctx.save();
  ctx.fillStyle = "rgba(11, 8, 34, .78)"; ctx.fillRect(14, 14, 220, 64);
  ctx.strokeStyle = "#8b78d6"; ctx.lineWidth = 2; ctx.strokeRect(14, 14, 220, 64);
  drawBar(24, 24, 130, player.hp, "#ef4f5e", `VIDA ${Math.ceil(player.hp)}`);
  drawBar(24, 45, 130, player.mana, "#4ac8ff", `MANA ${Math.ceil(player.mana)}`);
  ctx.fillStyle = "#ffe056"; ctx.font = "bold 15px monospace"; ctx.fillText(`◉ ${game.coins}`, 169, 36);
  ctx.fillStyle = "#fff1a1"; ctx.fillText(`✦ ${game.runes}/3`, 169, 59);

  const stateLabel = ACTION_LABELS[player.state] || player.state.toUpperCase();
  ctx.font = "bold 12px monospace";
  const stateW = ctx.measureText(stateLabel).width + 22;
  ctx.fillStyle = "rgba(22, 14, 53, .82)"; ctx.fillRect(W - stateW - 15, 16, stateW, 27);
  ctx.strokeStyle = "#8e75e8"; ctx.strokeRect(W - stateW - 15, 16, stateW, 27);
  ctx.fillStyle = "#fff"; ctx.fillText(stateLabel, W - stateW - 4, 34);

  ctx.textAlign = "center"; ctx.font = "bold 13px monospace";
  ctx.fillStyle = "rgba(12, 9, 35, .78)"; ctx.fillRect(W / 2 - 224, 14, 448, 44);
  ctx.fillStyle = "#fff3b0"; ctx.fillText(game.quest, W / 2, 31);
  ctx.fillStyle = "#9eeeff"; ctx.font = "bold 10px monospace"; ctx.fillText(`FASE ${game.level} · ${game.levelName.toUpperCase()}`, W / 2, 49);

  if (game.toastTimer > 0) {
    ctx.font = "bold 15px monospace";
    const width = Math.min(780, ctx.measureText(game.toast).width + 34);
    ctx.fillStyle = "rgba(12, 9, 35, .9)"; ctx.fillRect(W / 2 - width / 2, H - 72, width, 38);
    ctx.strokeStyle = "#c4a9ff"; ctx.strokeRect(W / 2 - width / 2, H - 72, width, 38);
    ctx.fillStyle = "#fff"; ctx.fillText(game.toast, W / 2, H - 47);
  }
  ctx.restore();
}

function drawOverlay(title, subtitle, color = "#ffe054", hint = "ENTER / ESPAÇO para jogar novamente") {
  ctx.fillStyle = "rgba(7, 5, 24, .78)"; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.fillStyle = color; ctx.font = "bold 54px monospace"; ctx.fillText(title, W / 2, 220);
  ctx.fillStyle = "#fff"; ctx.font = "bold 18px monospace"; ctx.fillText(subtitle, W / 2, 265);
  ctx.fillStyle = "#bbb2db"; ctx.font = "14px monospace"; ctx.fillText(hint, W / 2, 306);
  ctx.textAlign = "left";
}

function render() {
  drawBackground();
  drawWorld();
  if (game.mode !== "title") drawHud();
  if (game.mode === "paused") drawOverlay("PAUSADO", "P ou ENTER para continuar", "#aeeaff");
  if (game.mode === "transition") drawOverlay("PORTAL!", "A magia conduz Merlin até Avalon", "#89edff", "Preparando a Fase 2...");
  if (game.mode === "won") drawOverlay("AVALON!", `As duas fases foram concluídas • ${game.score} pontos`, "#ffe054");
}

function frame(now) {
  const elapsed = Math.min(0.05, (now - game.lastTime) / 1000);
  game.lastTime = now;
  game.accumulator += elapsed;
  while (game.accumulator >= FIXED_DT) { update(FIXED_DT); game.accumulator -= FIXED_DT; }
  render();
  requestAnimationFrame(frame);
}

function toggleFullscreen() {
  if (!document.fullscreenElement) document.querySelector(".game-shell").requestFullscreen?.();
  else document.exitFullscreen?.();
}

window.render_game_to_text = () => JSON.stringify({
  coordinateSystem: "origem no canto superior esquerdo; x cresce para a direita, y cresce para baixo; unidades em pixels do mundo 5400x540",
  mode: game.mode,
  level: { number: game.level, name: game.levelName },
  quest: game.quest,
  player: {
    x: Math.round(player.x), y: Math.round(player.y), vx: Math.round(player.vx), vy: Math.round(player.vy),
    state: player.state, facing: player.face > 0 ? "right" : "left", onGround: player.onGround,
    hp: Math.ceil(player.hp), mana: Math.ceil(player.mana), invulnerable: Number(player.invulnerable.toFixed(2)),
    cooldowns: { attack: Number(player.attackCooldown.toFixed(2)), bubble: Number(player.bubbleCooldown.toFixed(2)), teleport: Number(player.teleportCooldown.toFixed(2)) },
    charge: Number(player.charging.toFixed(2)), jumpHold: Number(player.jumpHold.toFixed(2))
  },
  progress: { score: game.score, coins: game.coins, runes: game.runes, keys: game.keys, checkpointX: game.checkpointX },
  portal: portal ? { x: portal.x, y: portal.y, unlocked: game.level === 2 || game.runes >= 3, target: game.level === 1 ? "Avalon" : "fim" } : null,
  ui: { shortcutsVisible: game.shortcutsVisible, settingsOpen: game.settingsOpen },
  audio: { musicEnabled: soundSettings.musicEnabled, sfxEnabled: soundSettings.sfxEnabled, muted: soundSettings.muted, musicVolume: soundSettings.musicVolume, sfxVolume: soundSettings.sfxVolume },
  nearby: {
    enemies: enemies.filter((enemy) => enemy.visible && Math.abs(enemy.x - player.x) < 700).map((enemy) => ({ type: enemy.type, state: enemy.state, alive: enemy.alive, x: Math.round(enemy.x), y: Math.round(enemy.y), hp: Math.max(0, Math.ceil(enemy.hp)) })),
    collectibles: collectibles.filter((item) => !item.collected && Math.abs(item.x - player.x) < 700).map((item) => ({ type: item.type, x: item.x, y: item.y })),
    interactables: [
      ...signs.filter((item) => Math.abs(item.x - player.x) < 250).map((item) => ({ type: "sign", x: item.x })),
      ...chests.filter((item) => !item.opened && Math.abs(item.x - player.x) < 250).map((item) => ({ type: "chest", x: item.x }))
    ]
  },
  projectiles: projectiles.map((item) => ({ owner: item.owner, type: item.type, x: Math.round(item.x), y: Math.round(item.y) })),
  message: game.toastTimer > 0 ? game.toast : null
});

window.advanceTime = (ms) => {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i++) update(FIXED_DT);
  render();
};

if (["localhost", "127.0.0.1"].includes(location.hostname)) {
  window.__miniMerlinTest = {
    damage: (amount, direction = 1) => damagePlayer(amount, direction),
    setPlayerPosition: (x, y = 360, vy = 0) => { player.x = x; player.y = y; player.vx = 0; player.vy = vy; player.onGround = false; },
    grantRunes: () => {
      for (const item of collectibles) if (item.type === "rune") item.collected = true;
      game.runes = 3;
      game.quest = "O portão de Camelot está aberto!";
      if (portal) portal.unlocked = true;
    },
    enterPortal,
    loadLevel: (level) => { loadLevel(level, true); game.mode = "playing"; },
    restart: beginGame
  };
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  const localDevelopment = ["localhost", "127.0.0.1"].includes(location.hostname);
  if (localDevelopment) {
    navigator.serviceWorker.getRegistrations().then((registrations) => registrations.forEach((registration) => registration.unregister()));
    if ("caches" in window) caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));
  } else {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
}
render();
requestAnimationFrame(frame);

import { createRequire } from "node:module";
const require = createRequire("/Users/andremachado/.codex/skills/develop-web-game/package.json");
const { chromium } = require("playwright");
const baseUrl = process.env.MINI_MERLIN_URL || "http://127.0.0.1:5174";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
await page.evaluate(() => window.__assetsReady);
await page.click("#start-btn");

const state = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
const step = async (frames = 1) => page.evaluate((count) => window.advanceTime(count * 1000 / 60), frames);
const press = async (key, frames = 1) => {
  await page.keyboard.down(key);
  await step(frames);
  await page.keyboard.up(key);
  await step(1);
  return state();
};
const hold = async (key, frames = 1) => {
  await page.keyboard.down(key);
  await step(frames);
  const snapshot = await state();
  await page.keyboard.up(key);
  await step(1);
  return snapshot;
};
const assert = (condition, message) => { if (!condition) throw new Error(message); };

let snapshot = await state();
assert(snapshot.mode === "playing", "o botão inicial não entrou no jogo");

const startX = snapshot.player.x;
snapshot = await hold("ArrowRight", 12);
assert(snapshot.player.x > startX, "Merlin não andou para a direita");
assert(["andando", "correndo"].includes(snapshot.player.state), "estado de caminhada ausente");

const walkX = snapshot.player.x;
await page.keyboard.down("ShiftLeft");
snapshot = await hold("ArrowRight", 12);
await page.keyboard.up("ShiftLeft");
assert(snapshot.player.x > walkX && snapshot.player.state === "correndo", "corrida falhou");

snapshot = await press("Space", 2);
assert(snapshot.player.vy < 0 && snapshot.player.state === "pulando", "pulo não iniciou");
await step(45);

snapshot = await press("KeyJ", 1);
assert(snapshot.player.state === "varinha" && snapshot.projectiles.some((item) => item.type === "magic"), "ataque de varinha falhou");
await step(25);

snapshot = await press("KeyK", 1);
assert(snapshot.player.state === "bolha" && snapshot.projectiles.some((item) => item.type === "bubble"), "bolha mágica falhou");
await step(45);

snapshot = await press("KeyU", 1);
assert(snapshot.player.state === "magia_cima" && snapshot.projectiles.some((item) => item.type === "up"), "magia para cima falhou");
await step(30);

const beforeShieldMana = (await state()).player.mana;
snapshot = await hold("KeyL", 12);
assert(snapshot.player.state === "escudo" && snapshot.player.mana < beforeShieldMana, "escudo não ativou ou não consumiu mana");

await step(80);
const beforeTeleportX = (await state()).player.x;
snapshot = await press("KeyQ", 1);
assert(snapshot.player.state === "teleporte" && Math.abs(snapshot.player.x - beforeTeleportX) > 150, "teleporte falhou");
await step(40);

snapshot = await hold("KeyC", 8);
assert(snapshot.player.state === "agachado", "agachar falhou");
await step(25);

snapshot = await hold("KeyR", 45);
assert(snapshot.player.state === "carregando" && snapshot.player.charge > 0.5, "carregamento da varinha falhou");
await step(2);
snapshot = await state();
assert(snapshot.projectiles.some((item) => item.type === "charge"), "soltar o ataque carregado não criou projétil");

snapshot = await press("KeyE", 1);
assert(snapshot.player.state === "interagindo", "estado de interação falhou");

snapshot = await press("KeyP", 1);
assert(snapshot.mode === "paused", "pausa falhou");
snapshot = await press("KeyP", 1);
assert(snapshot.mode === "playing", "retomar após pausa falhou");

await page.evaluate(() => window.__miniMerlinTest.restart());
await step(2);
await page.evaluate(() => window.__miniMerlinTest.damage(10));
snapshot = await state();
assert(snapshot.player.state === "ferido_leve" && snapshot.player.hp === 90, "dano leve falhou");
await step(70);

await page.evaluate(() => window.__miniMerlinTest.damage(25));
snapshot = await state();
assert(snapshot.player.state === "ferido_forte" && snapshot.player.hp === 65, "dano forte falhou");
await step(4);
snapshot = await state();
assert(["caindo", "caido"].includes(snapshot.player.state), "derrubada após dano forte falhou");
await step(80);
snapshot = await state();
assert(["levantando", "idle"].includes(snapshot.player.state), "Merlin não levantou após cair");
await step(70);

await page.evaluate(() => window.__miniMerlinTest.damage(999));
snapshot = await state();
assert(snapshot.player.state === "morto" && snapshot.player.hp === 0, "estado morto falhou");

await page.evaluate(() => {
  window.__miniMerlinTest.restart();
  window.__miniMerlinTest.setPlayerPosition(670, 318, 430);
});
await step(9);
snapshot = await state();
assert(snapshot.progress.score >= 350 && !snapshot.nearby.enemies.some((enemy) => enemy.type === "goblin" && Math.abs(enemy.x - 670) < 140), "pisão estilo Mario falhou");
assert(snapshot.player.vy < 0 && snapshot.player.state === "pulando", "Merlin não quicou após o pisão");
await page.screenshot({ path: "output/web-game/integration/stomp.png", fullPage: true });

await page.evaluate(() => window.__miniMerlinTest.restart());
await page.evaluate(() => { window.__miniMerlinTest.grantRunes(); window.__miniMerlinTest.setPlayerPosition(5140, 360); });
await step(5);
snapshot = await state();
assert(snapshot.mode === "won" && snapshot.progress.runes === 3, "portão/final de Camelot falhou");
await page.screenshot({ path: "output/web-game/integration/win.png", fullPage: true });

assert(errors.length === 0, `erros no console: ${errors.join(" | ")}`);
console.log(JSON.stringify({ ok: true, tested: ["walk", "run", "jump", "wand", "bubble", "up-magic", "shield", "teleport", "crouch", "charge", "interact", "pause", "light-hurt", "heavy-hurt", "knockdown", "get-up", "death", "stomp", "stomp-bounce", "three-runes", "gate", "win"], finalState: snapshot }, null, 2));
await browser.close();

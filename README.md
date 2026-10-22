# Mini Merlin 🧙‍♂️✨

**Plataforma 8-bit no navegador: guie o pequeno mago Merlin pela floresta de Brocéliande, recupere as três runas perdidas, enfrente dragões e cruze o portal rumo a Avalon.**

Feito em Canvas e JavaScript puro — sem frameworks, sem build, sem dependências de runtime. Abre em segundos, funciona offline depois do primeiro acesso e roda no teclado, no toque ou no gamepad.

> **Status:** protótipo jogável (v0.1.0). Duas fases completas, do início ao fim. O que vem depois está em **[PLANO.md](PLANO.md)** — tudo marcado como _planejado_ ainda não existe no código.

---

## O que já dá para jogar

- **2 fases:** _Brocéliande_ (encontre as 3 runas para abrir o Portal de Avalon) e _Avalon_ (ruínas lunares até o Portal Estelar, que encerra a jornada).
- **Inimigos:** goblins (andam, correm, pulam, defendem, atacam) e dragões que cospem fogo. Dá para vencê-los com magia ou com um pisão na cabeça.
- **Arsenal do Merlin:** varinha, bolha mágica que quica, magia para cima, escudo, teleporte e varinha carregada, administrando a barra de mana.
- **Mundo vivo:** moedas, cristais, frutas, baús com chave ou poção, placas com dicas, checkpoints e animais da floresta (corujas, raposas, cervos, sapos…).
- **Som:** efeitos sintetizados e uma melodia celta procedural via Web Audio, com painel de volume (música/efeitos) salvo no navegador.
- **Game feel inicial:** partículas, tremor de tela, dano leve/forte com queda e levantar.

## Jogar localmente

Requer **Node.js 18+**. Não há `npm install` — o servidor usa só módulos nativos do Node.

```bash
npm run dev
```

Abra **<http://localhost:5174>**.

A porta padrão é `5174` para não brigar com projetos Vite (que costumam usar `5173`). Para trocar:

```bash
PORT=8080 npm run dev
```

> Em `localhost` o service worker é desativado de propósito, para você sempre ver a versão mais recente durante o desenvolvimento.

## Controles

| Ação | Teclado | Gamepad (layout padrão) |
| --- | --- | --- |
| Andar | `A` / `D` ou `←` / `→` | Analógico esquerdo ou direcional |
| Correr | `Shift` + direção | `RT` |
| Pular | `Espaço`, `W` ou `↑` | `A` |
| Varinha mágica | `J` ou `B` | `X` |
| Bolha mágica | `K` | `B` |
| Magia para cima | `U` | `Y` |
| Escudo mágico | segurar `L` | `LB` |
| Teleporte | `Q` | `RB` |
| Carregar varinha | segurar e soltar `R` | `LT` |
| Interagir (placas, baús) | `E` | — |
| Agachar | `C`, `S` ou `↓` | Analógico/direcional para baixo |
| Pausar | `P` | `Start` |
| Tela cheia | `F` | — |
| Silenciar | `M` | — |
| Lista de atalhos | `Tab` | — |

No celular aparecem botões de toque na tela.

## Testes

A suíte de integração em [`tests/e2e.mjs`](tests/e2e.mjs) usa Playwright para jogar uma partida inteira de forma determinística: anda, corre, pula, usa cada magia, toma dano, morre, pisa em inimigos, coleta as três runas, abre o portão e vence.

```bash
npm run dev                 # em um terminal
node tests/e2e.mjs          # em outro
```

Para apontar para outra URL: `MINI_MERLIN_URL=http://127.0.0.1:8080 node tests/e2e.mjs`.

> ⚠️ Hoje o teste carrega o Playwright de um caminho fixo da máquina do autor (`~/.codex/skills/develop-web-game`). Tornar isso portátil (Playwright como `devDependency` + script `npm test`) é a primeira tarefa do [PLANO.md](PLANO.md).

O jogo expõe ganchos para automação:

- `window.render_game_to_text()` — estado atual em JSON (modo, fase, jogador, progresso…).
- `window.advanceTime(ms)` — avança a simulação em passos fixos, sem depender do relógio real.

## Como funciona por dentro

| Arquivo | Papel |
| --- | --- |
| `index.html` | Tela inicial, HUD, painéis de som e atalhos, botões de toque |
| `game.js` | O jogo inteiro: input, física, fases, inimigos, áudio, renderização |
| `styles.css` | Layout, HUD e controles de toque |
| `server.mjs` | Servidor estático de desenvolvimento (Node puro) |
| `sw.js` + `manifest.webmanifest` | Cache offline e instalação como PWA |
| `assets/runtime/` | Sprites usados no jogo (Merlin, goblin, moeda) |
| `assets/*-variations/` | Variações de arte geradas, mantidas como referência |
| `tests/e2e.mjs` | Teste ponta a ponta com Playwright |

- Um único `<canvas>` com renderização pixelada.
- Cenário, plataformas, Merlin, goblins e moedas usam os PNGs de `assets/`; o fundo preto é removido em memória ao carregar, sem alterar os arquivos.
- Dragões, animais, partículas, céu e paralaxe são desenhados por código.

## Publicação

O projeto é 100% estático: basta servir a pasta raiz no GitHub Pages, Netlify, Vercel ou qualquer servidor de arquivos. Há uma rota `Mini-merlin/` para URLs com maiúscula no GitHub Pages. O deploy automático ainda é **planejado** (ver PLANO.md).

## Próximos passos

Resumo do [PLANO.md](PLANO.md) — tudo abaixo é **planejado**:

1. Base sólida: `npm test` portátil, CI em todo PR, deploy automático e `game.js` dividido em módulos.
2. Game feel: hit-stop, squash & stretch, UI e menus animados.
3. Conteúdo: história com cenas, mais fases, novos inimigos e um chefe dragão.
4. Polimento: salvar progresso, menu de opções completo, testes em celular e gamepad reais.

---

<sub>README revisado em 21/10/2026 conferindo cada item contra o código. Recursos não implementados estão sempre marcados como **planejado**.</sub>

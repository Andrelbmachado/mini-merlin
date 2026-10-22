# PLANO — Mini Merlin

Plano de evolução por fases. Cada tarefa tem um **critério de pronto** verificável; uma fase só começa quando a anterior está verde no CI.

**Legenda:** `[x]` feito · `[ ]` planejado · 🔸 já existe parcialmente no código

## Ponto de partida (v0.1.0 — já existe)

- [x] 2 fases jogáveis: Brocéliande (3 runas → Portal de Avalon) e Avalon (→ Portal Estelar).
- [x] Inimigos: goblin (máquina de estados com 10 animações) e dragão (bola de fogo).
- [x] Varinha, bolha, magia para cima e varinha carregada (barra de mana), escudo, teleporte, pisão, dano leve/forte, morte e checkpoint.
- [x] Teclado, toque e gamepad; tela cheia; PWA com service worker.
- [x] Efeitos sonoros e música celta procedural; painel de volume salvo em `localStorage`.
- [x] Partículas e tremor de tela.
- [x] Teste e2e (`tests/e2e.mjs`) cobrindo a partida inteira via `render_game_to_text` / `advanceTime`.

---

## Fase 1 — Base (fundação para crescer sem medo)

| # | Tarefa | Critério de pronto |
| --- | --- | --- |
| 1.1 | Tornar o teste portátil: adicionar `playwright` como `devDependency`, trocar o `createRequire` com caminho fixo (`~/.codex/...`) por `import { chromium } from "playwright"` e criar `npm test`. | Em um clone limpo, `npm ci && npx playwright install chromium && npm test` passa. |
| 1.2 | `npm test` sobe o servidor sozinho (inicia `server.mjs` numa porta livre, roda o e2e, encerra). | Um único comando, sem segundo terminal; código de saída ≠ 0 quando falha. |
| 1.3 | CI no GitHub Actions (`.github/workflows/ci.yml`) rodando `npm test` em todo PR e push na `main`. | PR com teste quebrado fica vermelho; badge de CI no README. |
| 1.4 | Deploy automático no GitHub Pages a partir da `main` (`actions/deploy-pages`). | URL pública abre o jogo; link adicionado ao README. |
| 1.5 | Versionar o cache do `sw.js` automaticamente (ex.: hash/versão do `package.json`), em vez de editar à mão. | Novo deploy invalida o cache antigo sem mudança manual no `sw.js`. |
| 1.6 | Dividir `game.js` em módulos ES nativos: `input.js`, `audio.js`, `levels.js`, `entities/` (player, enemy, projectile), `physics.js`, `render.js`, `main.js`. Sem bundler. | `game.js` ≤ 200 linhas (só orquestração); e2e continua verde; nenhuma mudança de comportamento. |
| 1.7 | Mover os dados das fases (`platforms`, `enemies`, `collectibles`…) para `levels/*.js` declarativos. | Criar uma fase nova = adicionar um arquivo + registrá-lo em uma lista. |

## Fase 2 — Game feel

| # | Tarefa | Critério de pronto |
| --- | --- | --- |
| 2.1 | 🔸 Revisar tremor de tela e partículas existentes: intensidade por tipo de evento (pisão, dano forte, morte de dragão). | Tabela de intensidades em um só lugar; opção "reduzir movimento" desliga o tremor. |
| 2.2 | Hit-stop de 40–80 ms ao acertar/receber golpe forte. | Visível ao derrotar dragão; não afeta `advanceTime` determinístico (teste verde). |
| 2.3 | Squash & stretch no Merlin (pulo, aterrissagem) e nos inimigos ao tomar dano. | Escala aplicada só na renderização, sem alterar hitbox. |
| 2.4 | Coyote time (~100 ms) e buffer de pulo (~120 ms). | Novos asserts no e2e: pular logo após sair da plataforma e apertar pulo antes de tocar o chão. |
| 2.5 | Menus e ícones animados em HTML/CSS/JS puro (estilo Moxen): tela inicial, pausa, vitória e game over. | Navegáveis por teclado, toque e gamepad; respeitam `prefers-reduced-motion`. |

## Fase 3 — Conteúdo

| # | Tarefa | Critério de pronto |
| --- | --- | --- |
| 3.1 | Roteiro curto (Brocéliande → Avalon → … → Camelot) em `docs/historia.md`, com 1 parágrafo por fase. | Cada fase tem objetivo, mecânica nova e frase de abertura definidos. |
| 3.2 | Cenas entre fases (texto + arte estática, pulável com `Enter`/`Start`). | Cena aparece na transição; e2e consegue pular. |
| 3.3 | Expandir de 2 para 5+ fases, cada uma com uma mecânica nova (ex.: plataformas móveis, água, escuridão com luz da varinha, vento, plataformas que desabam). | Todas as fases completáveis; e2e tem atalho de teste por fase. |
| 3.4 | 3 novos inimigos com comportamento distinto (ex.: morcego voador, cavaleiro com escudo frontal, espírito que só sofre dano de bolha). | Cada um com sprites em `assets/runtime/`, estados e teste próprio. |
| 3.5 | Chefe dragão com 3 padrões de ataque e barra de vida. | Luta vencível sem dano por jogador habilidoso; e2e cobre a vitória. |
| 3.6 | Feitiços desbloqueados ao longo da campanha (começa só com varinha; cada fase libera uma magia). | Estado de desbloqueio aparece no HUD e em `render_game_to_text`. |

## Fase 4 — Polimento

| # | Tarefa | Critério de pronto |
| --- | --- | --- |
| 4.1 | Salvar progresso (fase alcançada, runas, magias desbloqueadas, pontuação) em `localStorage`, com "Continuar" na tela inicial. | Recarregar a página mantém o progresso; botão para apagar o save. |
| 4.2 | 🔸 Menu de opções completo: hoje existe só o painel de som; adicionar remapeamento de teclas, reduzir movimento e idioma. | Opções persistem entre sessões. |
| 4.3 | 🔸 Trilha sonora: hoje há uma melodia celta procedural; criar um tema por fase + tema do chefe. | Música muda na transição de fase sem estalos. |
| 4.4 | `Interagir` e `Tela cheia` também no gamepad (hoje só no teclado). | Todos os comandos acessíveis sem teclado. |
| 4.5 | Teste manual em aparelhos reais: iPhone (Safari), Android (Chrome), controle Xbox e PlayStation. Registrar resultados em `docs/testes-dispositivos.md`. | Checklist preenchido; bugs viram issues. |
| 4.6 | Orçamento de desempenho: 60 fps estáveis em celular intermediário; carregamento inicial < 1 MB. | Medido e anotado no checklist da 4.5. |

---

## Como trabalhar neste plano

1. Uma tarefa = um branch = um PR pequeno (ex.: `feat/1.1-npm-test`).
2. Todo PR roda o e2e; mudança de gameplay vem acompanhada de assert novo no teste.
3. Ao concluir, marque `[x]` aqui (tabelas: prefixe o número com ✅) e atualize o README se algo deixou de ser "planejado".

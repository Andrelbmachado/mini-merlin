# Mini Merlin

Um jogo de plataforma 8-bit leve, feito em Canvas e JavaScript puro. Explore a floresta de Brocéliande, encontre as três runas perdidas, enfrente dragões e abra o caminho para Camelot.

## Jogar localmente

Requer Node.js 18 ou mais recente.

```bash
npm run dev
```

Abra [http://localhost:5174](http://localhost:5174).

O Mini Merlin usa a porta `5174` por padrão para não conflitar com projetos Vite que normalmente ocupam a `5173`. Para escolher outra porta:

```bash
PORT=8080 npm run dev
```

## Controles

| Ação | Teclado |
| --- | --- |
| Andar | `A` / `D` ou setas |
| Correr | `Shift` + direção |
| Pular | `Espaço`, `W` ou seta para cima |
| Varinha mágica | `J` |
| Bolha mágica | `K` |
| Magia para cima | `U` |
| Escudo mágico | segurar `L` |
| Teleporte | `Q` |
| Carregar varinha | segurar e soltar `R` |
| Interagir | `E` |
| Agachar | `C`, `S` ou seta para baixo |
| Pausar | `P` |
| Tela cheia | `F` |

O jogo também oferece controles por toque e suporte a gamepad.

## Publicação

O projeto é inteiramente estático. Pode ser publicado diretamente no GitHub Pages, Netlify, Vercel ou qualquer servidor de arquivos estáticos. O manifesto e o service worker permitem instalação como PWA e uso após o primeiro carregamento.

## Arquitetura leve

- Sem frameworks ou dependências de runtime.
- Um único Canvas com renderização pixelada.
- Arte, partículas, sons e animações gerados por código.
- Cenário, plataformas, Merlin e goblins usam os PNGs fornecidos no diretório `assets/`; o fundo preto é removido em memória durante o carregamento, preservando os arquivos originais.
- Estado determinístico exposto por `window.render_game_to_text` para testes.
- Suíte de integração em `tests/e2e.mjs`.

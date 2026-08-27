Original prompt: Criar no repositório mini-merlin um jogo online leve em estilo 8-bit inspirado nas imagens fornecidas, usando todas as variações e ações descritas para Merlin, além dos animais, itens e elementos do mapa.

## Estado

- Repositório inicialmente vazio.
- Direção escolhida: jogo de plataforma 2D em Canvas, estático/PWA, sem bibliotecas de runtime.
- As imagens fornecidas são referências visuais; os elementos do jogo serão desenhados no Canvas para manter o download pequeno e permitir animações e estados reais.
- Base implementada: mapa de 5400 px, PWA, HUD, câmera, física, plataformas, teclado/gamepad/touch, áudio procedural e estado textual para testes.
- Estados implementados: idle, andando, correndo, pulando, varinha, bolha, magia para cima, escudo, teleporte, ferido leve/forte, caindo/caído, morto, agachado, levantando, interagindo, carregando e em queda.
- Conteúdo implementado: oito animais, slimes/javali/dragões, moedas, frutas, cristais, chaves, baús, placas, três runas e portão final de Camelot.
- Documentação, `.gitignore` e suíte de integração adicionadas.

## TODO

- Próxima expansão sugerida: segundo nível narrativo, chefes históricos/lendários e spritesheet dedicado caso seja criada arte final quadro a quadro.

## Validação final

- Cliente Playwright oficial executado em cenários de movimento, salto e combate; capturas inspecionadas visualmente.
- Suíte `tests/e2e.mjs` aprovada sem erros de console.
- Verificados: andar, correr, pular, varinha, bolha, magia para cima, escudo, teleporte, agachar, carregar/soltar, interagir, pausar/retomar, dano leve, dano forte, derrubada, levantar, morte, três runas, portão e vitória.
- `node --check` e `git diff --check` aprovados.

## Execução local

- Porta padrão alterada de `5173` para `5174`, pois `5173` estava ocupada pelo projeto externo “Neon Countach”.
- O outro servidor foi preservado; Mini Merlin deve ser aberto em `http://localhost:5174`.

## Assets fornecidos e pisão

- Integrados os PNGs `Background`, `Chao`, `Chao_flutuante`, Merlin parado, Merlin andando e inimigo goblin.
- O preto dos assets é convertido em transparência somente em memória; os arquivos recebidos permanecem intactos.
- Implementado pisão estilo Mario: aterrissar sobre qualquer inimigo o elimina, faz Merlin quicar e concede pontuação.
- Suíte de integração ampliada com cenários explícitos de pisão e quique.
- Cache do service worker desativado em localhost e assets versionados no HTML para evitar que o navegador mostre uma versão antiga durante o desenvolvimento.

## Variações do Merlin

- Gerados 18 PNGs individuais, um para cada estado da prancha de animações fornecida.
- Salvos em `assets/merlin-variations/generated-v1/`, com tabela de correspondência em `README.md` da pasta.

## Variações do inimigo

- Foram geradas 10 imagens individuais do goblin: andando, atacando, parado, defendendo, levando dano, morto, pulando, agachado, correndo e morrendo.
- Salvas em `assets/enemy-variations/generated-v1/`, com a tabela de correspondência no `README.md` da pasta.

## Variações da moeda

- Foram gerados 8 quadros individuais para a animação de moeda girando, incluindo as fases frontal e lateral.
- Salvos em `assets/coin-variations/generated-v1/`, com a ordem de reprodução no `README.md` da pasta.

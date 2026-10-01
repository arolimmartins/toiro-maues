# Implementação do Jogo "Colheita do Guaraná" com Personagens e Gestos de IA

Substituição da antiga pista de corrida pelo cenário amazônico de **Colheita do Guaraná** (`Tela do jogo.png`), introduzindo os **personagens jogáveis** e os **frutos de guaraná** (`icons 2.png`) controlados em tempo real por movimentos corporais e gestos da visão computacional.

## Contexto e Objetivo

O projeto GestureCar AI (CETAM) está evoluindo para o jogo temático **Colheita do Guaraná — Nossa Terra, Nossa Energia!**.
A área central (onde antes rodava a pista de corrida) agora apresentará o cenário oficial de plantação de guaraná, com:
1. **Cenário de Fundo**: `Tela do jogo.png` integrado de ponta a ponta na área do jogo.
2. **Personagens Jogáveis**: Os 4 personagens do CETAM recortados de `icons 2.png` (Gabriel CETAM, Ana flor, Lucas CETAM e Mayara indígena), com animações de *idle*, corrida (*walk*) e colheita (*collect*).
3. **Frutos de Guaraná e Colecionáveis**: Frutos de guaraná caindo suavemente dos pés de guaraná para serem colhidos na cesta, além de moedas e folhas/obstáculos.
4. **Controle por Visão Computacional**: O boneco se move para a esquerda e direita conforme a rotação do volante virtual das mãos ou o posicionamento das mãos na câmera, com turbo sprint ao fazer o sinal da paz (dois dedos V), andar com a palma aberta e frear ao fechar os punhos.
5. **Suporte Completo**: Atualização tanto na edição Electron (`index.html`, `src/game/`) quanto na edição Python Pygame (`app.py`, `game/`).

---

## User Review Required

> [!IMPORTANT]
> - Os 5 personagens estão devidamente organizados em `assets/characters/player1/` a `player5/` com estados `idle`, `walk`, `collect`, `victory` e `portrait`.
> - O Player 5 (Kauã) possui animação natural multi-frame via spritesheet de caminhada.
> - O jogador poderá alternar entre os 5 personagens pelas teclas `1`, `2`, `3`, `4`, `5` ou através do seletor visual no HUD.
> - O controle gestual mantém a calibração suave do volante e posição das mãos: mover as mãos para a esquerda/direita desloca o personagem pelo chão da plantação.

---

## Proposed Changes

### Edição Electron (Web / MediaPipe)

#### [NEW] [`src/game/harvester.js`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/src/game/harvester.js)
- Classe `GuaranaHarvester` que gerencia o personagem:
  - Posição horizontal `x`, velocidade `vx`, orientação `facing` (-1 para esquerda, 1 para direita).
  - Troca de sprites (`idle.png`, `walk.png`, `collect.png`) com animação fluida a 60 FPS.
  - Seleção dos 4 personagens (Player 1 a 4).
  - Hitbox da cesta e física de movimento responsiva com amortecimento.

#### [NEW] [`src/game/harvest_scene.js`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/src/game/harvest_scene.js)
- Classe `HarvestScene` que gerencia o mundo da colheita:
  - Renderiza o fundo oficial `assets/backgrounds/tela_do_jogo.png`.
  - Spawna cachos de guaraná (`assets/ui/icons/guarana.png`), moedas douradas (`icon_moeda.png`) e folhas caídas a partir dos pés de guaraná.
  - Efeitos de partículas ao colher (brilho, confetes, texto flutuante "+100").
  - Sistema de pontuação, contagem de frutos colhidos (Meta: 50) e cronômetro (01:30).

#### [MODIFY] [`src/game/engine.js`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/src/game/engine.js)
- Atualizar a engine para orquestrar a cena da colheita (`HarvestScene`) e o personagem (`GuaranaHarvester`) no lugar do carro e da pista antiga.
- Mapear comandos de visão:
  - `smoothSteer < -0.15` ou comando `ESQUERDA` -> Personagem move para a esquerda.
  - `smoothSteer > 0.15` ou comando `DIREITA` -> Personagem move para a direita.
  - `TURBO` -> Corrida rápida (dash) com rastro de partículas.
  - `ACELERAR` -> Movimentação normal.
  - `PARAR` / `FREAR` -> Parada imediata.
- Sincronização com HUD de vitória ao atingir a meta de 50 guaranás.

#### [MODIFY] [`index.html`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/index.html)
- Renomear rótulos da pista para "🌿 COLHEITA DO GUARANÁ".
- Ajustar os contadores superiores para:
  - ⏱️ Tempo (01:30 regressivo)
  - 🍒 Guaranás Colhidos (Meta: 50)
  - ⭐ Pontos
  - 👤 Personagem Ativo (com avatar do personagem)
- Atualizar o Guia de Gestos lateral para a dinâmica de colheita.
- Adicionar mini seletor de personagens (Gabriel, Ana, Lucas, Mayara).

#### [MODIFY] [`styles.css`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/styles.css)
- Ajustar estilos temáticos amazônicos para combinar com a identidade visual de `Tela do jogo.png` (tons de madeira, verde folhagem e guaraná).

---

### Edição Python / Pygame

#### [NEW] [`game/harvester.py`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/game/harvester.py)
- Equivalente em Pygame com carregamento de imagens por `pygame.image.load`, animação de passos e flip horizontal.

#### [NEW] [`game/harvest_scene.py`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/game/harvest_scene.py)
- Gestor dos frutos cadentes, colisões da cesta, sistema de pontuação e renderização da tela de fundo no Pygame.

#### [MODIFY] [`game/game.py`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/game/game.py) e [`app.py`](file:///c:/Users/novo2/Downloads/GestureCarAI_COMPLETO/GestureCarAI/app.py)
- Integrar a cena de colheita na área principal de jogo do Pygame.

---

## Verification Plan

### Testes Manuais & Automatizados
1. **Verificação de Assets**:
   - Garantir que `Tela do jogo.png` e todos os sprites dos 4 personagens carregam sem erros em ambas as plataformas.
2. **Teste de Movimentação do Boneco**:
   - Testar deslocamento do boneco para esquerda e direita com teclado (`A`/`D`, setas) e por gestos da câmera (volante virtual e posição das mãos).
   - Testar a troca de sprites: em repouso (`idle`), andando (`walk`) e colhendo (`collect`).
   - Testar o espelhamento do boneco ao andar para a esquerda vs direita.
3. **Teste de Colheita de Frutos**:
   - Verificar se os guaranás caem das árvores e são computados ao colidir com o personagem/cesta.
   - Verificar efeitos sonoros e partículas visuais de pontuação.
4. **Execução Local**:
   - Testar carregamento no Electron (`iniciar_electron.bat` / `npx electron .`).
   - Testar execução do script de suporte Python (`app.py`).

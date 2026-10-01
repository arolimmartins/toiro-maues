# Plano de Reformulação: To'iro Maués

Este documento detalha o passo a passo para transformar a versão antiga do jogo em uma nova versão focada exclusivamente em **4 fases inéditas** e **2 personagens** (1 menino e 1 menina).

**Aviso importante sobre a Visão Computacional:**
A lógica de Inteligência Artificial e rastreamento de gestos com MediaPipe já está isolada e funcional. Ela atua como um "teclado virtual". Portanto, as mudanças visuais e de regras de negócio descritas abaixo **não quebrarão a detecção das mãos**.

---

## 🎨 Passo 1: Preparação das Novas Artes (Assets)

Para que o jogo ganhe vida, precisaremos das seguintes imagens (você precisará providenciá-las ou criá-las):

- [ ] **4 Novos Cenários (Fundos de Tela):**
  - Sugestão de resolução: `1920x1080` (proporção 16:9).
  - Um cenário para cada uma das 4 fases.
- [ ] **2 Personagens (Menino e Menina):**
  - **Player 1 (Menino):** Sprite parado (idle), correndo (walk) e avatar de perfil.
  - **Player 2 (Menina):** Sprite parada (idle), correndo (walk) e avatar de perfil.
  - *Opcional:* Se os sprites precisarem de animação complexa (spritesheets), o motor atual suporta isso.

*Ação Técnica:* Limparemos os arquivos antigos das pastas `assets/backgrounds` e `assets/characters` para deixar apenas a estrutura limpa para os novos arquivos.

---

## 👩💻👨💻 Passo 2: Reformulação dos Personagens no Código

Atualmente, o sistema carrega 5 opções de personagens no código Web e Python. Precisamos simplificar isso:

- [ ] **Interface Web (`index.html`) e App Python (`app.py`):**
  - Remover os botões de seleção dos personagens extras (3, 4 e 5).
  - Renomear as opções para "1. Menino" e "2. Menina" (ou nomes específicos que você escolher).
  - Ajustar as instruções do HUD que mencionam "Teclas [1, 2, 3, 4]".
- [ ] **Lógica do Jogador (`src/game/harvester.js` e `game/harvester.py`):**
  - Alterar o mapeamento de carregamento de texturas para buscar apenas das pastas `player1` e `player2`.
  - Reduzir as colisões e lógicas para não tentar ler configurações de personagens inexistentes.

---

## 🎯 Passo 3: Reconstrução das Fases do Jogo

As atuais 9 fases serão totalmente deletadas e substituídas por 4 novas com foco progressivo de dificuldade.

- [ ] **Definir Arquitetura das 4 Fases (`src/game/harvest_scene.js` e `game/harvest_scene.py`):**
  - Substituir o array/lista gigante atual de fases.
  - Criar as 4 novas fases definindo:
    - `name`: Nome da fase (ex: "FASE 1: INÍCIO DA JORNADA").
    - `bg`: Caminho da imagem de fundo correspondente.
    - `targetGuarana`: Quantos guaranás devem ser colhidos (ex: 20, 30, 40, 50).
    - `totalTime`: Tempo cronometrado para o desafio.
    - `minSpeed` / `maxSpeed`: Velocidade de queda dos itens para criar a dificuldade progressiva.

---

## 🛠️ Passo 4: Refino e Condição de Vitória

Para garantir que a experiência do usuário seja fluida:

- [ ] **Vitória Final:** Atualizar a lógica do motor gráfico (`engine.js` / `game.py`) para reconhecer o "Fim de Jogo" com sucesso logo após a Fase 4, exibindo a tela de comemoração.
- [ ] **Curva de Dificuldade:** Fazer testes rápidos das velocidades de queda entre a Fase 1 e a Fase 4 para não ficar nem muito monótono, nem impossível de jogar.

---

## Próximos Passos (Para você, usuário)

Pode deixar os seus comentários direto aqui no documento! Responda algumas perguntas para mim:
1. Você já tem os nomes para essas 4 fases? Se sim, pode escrevê-los.
2. Como você quer chamar os 2 personagens?
3. Podemos começar apagando no código os 3 personagens extras e atualizando a lista de fases para essas 4 agora mesmo?

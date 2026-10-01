# To'iro Maués 🌿🖐️

Jogo educativo de visão computacional da cultura amazônica: colheita de guaraná controlada por gestos das mãos e do corpo.

## O que já funciona
- Webcam em tempo real com OpenCV.
- Detecção da mão e 21 landmarks com MediaPipe.
- Reconhecimento didático de gestos: ACELERAR, ESQUERDA, DIREITA, PARAR e FREAR.
- Personagem da colheita controlado pelos gestos em um cenário da Amazônia.
- Interface com câmera, gesto detectado, confiança, velocidade, tempo, metas e estatísticas.
- Controle alternativo pelo teclado para testar sem webcam.
- Estrutura preparada para substituir o reconhecedor heurístico por uma CNN treinada.

## Requisitos
Python 3.10 ou 3.11 recomendado.

```bash
pip install -r requirements.txt
python app.py
```

## Controles
- Gestos: mão aberta = parar; punho = frear; mão inclinada/movimento para esquerda/direita = direção; gesto de apontar para cima = acelerar.
- Teclado: W/↑ acelera, A/← esquerda, D/→ direita, S/↓ freia, Espaço para parar no modo 2D, P pausa, R reinicia, N próxima fase, V turbo, 2–4 troca de personagem (Ana, Lucas e Mayara), M som, F voz do arara, ESC sai.
- Modo 3D (experimental): T liga/desliga. No 3D o menino anda livre no plano, W/A/S/D movem relativo à câmera, Shift/V acelera e Espaço pula (no 2D, Espaço continua freando).
- Na introdução: Espaço/Enter/clique avança, S pula a abertura.

## Voz do arara

A abertura **"O Coração e a Alma de Maués"** é narrada pelo papagaio, **frase a frase**: cada frase do texto virou uma cena de fundo.

A tela da abertura é **foto de fundo + papagaio**. Nenhum cenário é desenhado por código: as seis fotos do projeto, em `assets/backgrounds/narrativa/`, são recortadas em `cover` (as laterais são cortadas, nunca esticadas). O único efeito de cena é a chuva, e só no estágio `chuva`.

| # | Cena | Foto de fundo |
|---|------|---------------|
| 1 | praia | `cenario-1.jpeg` |
| 2 | povo | `cenario-1.jpeg` |
| 3 | guerreiro | `cenario-2.jpeg` |
| 4 | abraco | `cenario-2.jpeg` |
| 5 | ditado | `cenario-3a.jpeg` |
| 6 | jaraqui | `cenario-3b.jpeg` |
| 7 | guarana | `cenario-3b.jpeg` |
| 8 | arte | `cenario-4.jpeg` |
| 9 | festa | `cenario-4.jpeg` |
| 10 | fe | `cenario-5.jpeg` |
| 11 | chuva | `cenario-5.jpeg` + efeito de chuva |
| 12 | final | `cenario-3a.jpeg` |
| 13 | dica | sem foto: fundo liso |

> A correspondência acima segue a numeração dos arquivos e é **provisória**. Para trocar uma foto de cena, edite `STORY_FUNDOS` em `src/game/story.js` e confira com `npx electron tools/ver-cenas.js`, que grava um PNG por cena em `tools/cenas/` e um `mapa.txt` com o arquivo usado em cada uma.

O papagaio é desenhado por código, em camadas: cauda vermelha de pontas azuis, corpo com degradê, asa com capa vermelha, faixa amarela de coberteiras e penas de voo azuis, cabeça com testa verde, rosto branco e bico preto curvo. O bico se move pela **amplitude real do áudio**.

A voz é **gravada** (síntese neural em português), não locução do sistema.

- `src/game/voice.js` — motor de voz. Preferencia: clipe gravado → `speechSynthesis` → animação sem áudio. Nunca fica mudo: se não houver áudio, o bico continua se movendo no tempo estimado da frase.
- `src/game/voice-clips.js` — **gerado**. Índice dos clipes e o instante de cada frase.
- `assets/voice/` — 12 MP3 (~92s) + `manifest.json` de referência.
- O bico é movido pela **amplitude real do áudio** (`AnalyserNode`), e o texto da caixa de diálogo aparece no ritmo em que a frase é falada.

Mudou uma frase do arara em `src/game/story.js`? Regere a voz, senão o papagaio fala uma coisa e a tela mostra outra (há teste que falha exatamente nesse caso):

```bash
python -m pip install edge-tts
python tools/gerar-voz.py
```

Outras vozes neurais em pt-BR: `VOZ=pt-BR-ThalitaMultilingualNeural` ou `VOZ=pt-BR-AntonioNeural`.

Isso é etapa de desenvolvimento: os clipes ficam versionados, então o jogo roda **offline** e não depende de rede nem do Python.

## CNN
A pasta `ai/` contém o pipeline inicial para uma CNN de classificação de imagens. O jogo usa o reconhecedor de landmarks por padrão para funcionar sem um modelo treinado. Depois de coletar imagens em `dataset/`, o modelo CNN pode ser treinado e conectado ao jogo.

## Estrutura
- `app.py`: ponto de entrada.
- `camera/`: webcam.
- `vision/`: detecção e reconhecimento de gestos.
- `ai/`: treinamento/inferência CNN.
- `game/`: física simples, pista e HUD.
- `dataset/`: classes para coleta de imagens.
- `models/`: modelos treinados.

/**
 * Narrativa de Abertura — "O Coração e a Alma de Maués"
 * O arara narra o texto do povo de Maues frase a frase. Cada frase tem um
 * estagio proprio (stage) com a foto de fundo correspondente: praia, povo,
 * guerreiro, abraco, ditado, jaraqui, guarana, arte, festa, fe, chuva e final.
 * Os fundos sao as fotos do projeto em assets/backgrounds/narrativa/, sem
 * cenario desenhado por codigo. O unico efeito de cena e a chuva no estagio
 * 'chuva'. O estagio 'dica' nao tem foto e usa so um fundo liso.
 */
const STORY_SCENES = [
  {
    stage: 'praia',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'Aqui em Maués, a gente vive cercado por belas praias de água doce e areia branca, como a nossa Ponta da Maresia, onde a gente nada na beirada do rio enquanto o sol pinta o céu de dourado.'
  },
  {
    stage: 'povo',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'Mas a verdadeira riqueza de Maués é a nossa gente.'
  },
  {
    stage: 'guerreiro',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'Somos um povo guerreiro, que traz na veia a força dos Sateré-Mawé e a garra de quem desbrava a Amazônia, mas que ao mesmo tempo é extremamente hospitaleiro.'
  },
  {
    stage: 'abraco',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'Quem chega de fora é recebido com um abraço largo e um sorriso verdadeiro, como se já fosse da família.'
  },
  {
    stage: 'ditado',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'E por falar em quem chega, tem um ditado antigo aqui na nossa terra que nunca erra: "Quem come o jaraqui e prova do guaraná, nunca mais esquece e sempre quer voltar!"'
  },
  {
    stage: 'jaraqui',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'O nosso peixe jaraqui, fritinho na hora com aquela farinha crocante que a gente faz na Ilha de Vera Cruz, tem umpero que enfeitiça.'
  },
  {
    stage: 'guarana',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'E o nosso elixir da longevidade, o puro guaraná ralado na pedra, dá a energia e a saúde que fazem nossos avós viverem tanto e com tanta alegria.'
  },
  {
    stage: 'arte',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'A nossa vida também é feita de arte e cultura que brotam direto da floresta, nos grafismos, nos artesanatos de sementes e cipós, e nos ritmos que embalam a nossa gente.'
  },
  {
    stage: 'festa',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'Somos um povo festeiro, que adora celebrar a vida, seja na grande Festa do Guaraná ou nas rodas de conversa na calçada.'
  },
  {
    stage: 'fe',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'Tudo isso é guiado por um povo religioso e crente na sua fé.'
  },
  {
    stage: 'chuva',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'A gente agradece a Deus e aos espíritos da floresta pelo pão de cada dia, pela chuva que molha a roça e pela proteção que nos mantém unidos.'
  },
  {
    stage: 'final',
    speaker: 'ARARA',
    color: '#FB7185',
    text: 'Maués é isso tudo misturado: fé, festa, sabor, luta e amor pela nossa terra. É o melhor lugar do mundo para se viver!'
  },
  {
    stage: 'dica',
    speaker: 'DICA',
    color: '#34D399',
    text: 'Controles: mova as mãos (ou A / D) para andar, dois dedos (ou W) para acelerar, punho fechado (ou S) para frear e V para o turbo. Colete os cachos vermelhos antes que o tempo acabe.'
  }
];

// Fundos fotograficos da abertura. Cada foto entra como pano de fundo do
// papagaio; a frase correspondente e a unica coisa que decide qual foto aparece.
//
// ATENCAO: este mapa esta em ORDEM PROVISORIA. As seis fotos chegaram sem
// legenda, entao a distribuicao segue a numeracao dos arquivos e nao foi
// conferida contra o conteudo de cada foto. Para conferir, rode
// `npx electron tools/ver-cenas.js` e abra tools/cenas/contato-fotos.png.
// Basta trocar o `arquivo` de uma linha para corrigir a associacao.
//
//   1  cenario-1.jpeg   <- "1- cenario.jpeg"
//   2  cenario-2.jpeg   <- "2- cenario.jpeg"
//   3a cenario-3a.jpeg  <- "3-cenario.jpeg"      (397 KB)
//   3b cenario-3b.jpeg  <- "3 - Cenario.jpeg"    (298 KB)
//   4  cenario-4.jpeg   <- "4-cenario.jpeg"
//   5  cenario-5.jpeg   <- "5 -cenario.jpeg"
//
// Duas frases por foto, na ordem da naracao. `focoX` desloca o corte lateral
// (0 = cola a esquerda, 0.5 = centralizado, 1 = cola a direita).
const STORY_FUNDOS = {
  praia:     { arquivo: 'cenario-1.jpeg', focoX: 0.5 },
  povo:      { arquivo: 'cenario-1.jpeg', focoX: 0.5 },
  guerreiro: { arquivo: 'cenario-2.jpeg', focoX: 0.5 },
  abraco:    { arquivo: 'cenario-2.jpeg', focoX: 0.5 },
  ditado:    { arquivo: 'cenario-3a.jpeg', focoX: 0.5 },
  jaraqui:   { arquivo: 'cenario-3b.jpeg', focoX: 0.5 },
  guarana:   { arquivo: 'cenario-3b.jpeg', focoX: 0.5 },
  arte:      { arquivo: 'cenario-4.jpeg', focoX: 0.5 },
  festa:     { arquivo: 'cenario-4.jpeg', focoX: 0.5 },
  fe:        { arquivo: 'cenario-5.jpeg', focoX: 0.5 },
  chuva:     { arquivo: 'cenario-5.jpeg', focoX: 0.5 },
  final:     { arquivo: 'cenario-3a.jpeg', focoX: 0.5 }
};

// Uma paleta por cena. Todas as cenas sao de fim de tarde em Maués, entao o
// sol sempre fica em cima a direita e o verde da floresta nunca some.
const STORY_PALETTES = {
  praia: { skyTop: '#1B4A82', skyBot: '#FFD08A', sun: '#FFF0BE', hill: '#2E6B8A', bush: '#3E8C7A', fruit: '#E23B3B', fog: 'rgba(255, 210, 150, 0.14)' },
  povo: { skyTop: '#0E4C6B', skyBot: '#FFC98A', sun: '#FFE9A8', hill: '#1F5E4A', bush: '#2C7D57', fruit: '#E23B3B', fog: 'rgba(255, 200, 140, 0.12)' },
  guerreiro: { skyTop: '#0A2E3C', skyBot: '#D98E4A', sun: '#FFD79A', hill: '#2A4636', bush: '#3C6B4A', fruit: '#E23B3B', fog: 'rgba(255, 180, 110, 0.12)' },
  abraco: { skyTop: '#12395C', skyBot: '#FFB08A', sun: '#FFE0B0', hill: '#245A45', bush: '#357A5C', fruit: '#E23B3B', fog: 'rgba(255, 190, 150, 0.14)' },
  ditado: { skyTop: '#2A1A3E', skyBot: '#C97B4A', sun: '#FFE2A8', hill: '#3A2A4A', bush: '#4A3A5A', fruit: '#E23B3B', fog: 'rgba(220, 170, 120, 0.12)' },
  jaraqui: { skyTop: '#123047', skyBot: '#E8A44E', sun: '#FFF0C0', hill: '#2A5040', bush: '#3C7050', fruit: '#E23B3B', fog: 'rgba(255, 200, 130, 0.14)' },
  guarana: { skyTop: '#1A3A2E', skyBot: '#D9A05B', sun: '#FFE9B0', hill: '#2E5A40', bush: '#407A52', fruit: '#E23B3B', fog: 'rgba(255, 215, 160, 0.12)' },
  arte: { skyTop: '#0F3D4A', skyBot: '#F0A85C', sun: '#FFEFC0', hill: '#1E5A4A', bush: '#2E7A5E', fruit: '#E23B3B', fog: 'rgba(255, 190, 120, 0.12)' },
  festa: { skyTop: '#141A4A', skyBot: '#F0A050', sun: '#FFE8A0', hill: '#1E4A5A', bush: '#2A6A5A', fruit: '#E23B3B', fog: 'rgba(255, 170, 120, 0.16)' },
  fe: { skyTop: '#1B1F4A', skyBot: '#E8A05A', sun: '#FFF2C8', hill: '#2A3550', bush: '#3A4A5A', fruit: '#E23B3B', fog: 'rgba(255, 200, 150, 0.14)' },
  chuva: { skyTop: '#243A4A', skyBot: '#6E8A7A', sun: '#C8D8D0', hill: '#2A4038', bush: '#35564A', fruit: '#E23B3B', fog: 'rgba(180, 200, 210, 0.16)' },
  final: { skyTop: '#0A2A4A', skyBot: '#FFC46B', sun: '#FFF6D0', hill: '#1E5240', bush: '#2A7050', fruit: '#E23B3B', fog: 'rgba(255, 210, 150, 0.14)' },
  dica: { skyTop: '#06202B', skyBot: '#0B3B44', sun: '#9BE7C4', hill: '#0A2A24', bush: '#134A38', fruit: '#E23B3B', fog: 'rgba(120, 230, 200, 0.10)' }
};

class StoryManager {
  constructor(width, height, sound, voice) {
    this.width = width;
    this.height = height;
    this.sound = sound;

    this.voice = voice || new ParrotVoice();
    this.voiceSpokenFor = -1;

    this.active = false;
    this.skipped = false;
    this.completed = false;
    this.index = 0;
    this.scenesSeen = 0;
    this.elapsed = 0;
    this.sceneTime = 0;
    this.charsShown = 0;
    this.wrappedLines = [];
    this.motes = [];
    this.pulse = 0;
    this.t = 0;
    this.parrotTalk = 0;
    this._fundos = {};
    this._initFundos();
    this._initMotes();
  }

  /** Carrega uma vez so as fotos do mapa STORY_FUNDOS. */
  _initFundos() {
    this._fundos = {};
    for (const stage of Object.keys(STORY_FUNDOS)) {
      const entrada = STORY_FUNDOS[stage];
      if (!entrada) continue;
      const arquivo = typeof entrada === 'string' ? entrada : entrada.arquivo;
      if (!arquivo) continue;
      const img = new Image();
      img.onload = () => { img.__pronto = true; };
      img.src = 'assets/backgrounds/narrativa/' + arquivo;
      this._fundos[stage] = img;
    }
  }

  /** Devolve a foto da cena quando ela ja carregou; senao null. */
  _fundoDaCena(stage) {
    const img = this._fundos[stage];
    if (!img) return null;
    if (!img.complete || !img.naturalWidth) return null;
    return img;
  }

  /** A cena fala quando o texto do papagaio comeca a aparecer. */
  get isParrotScene() {
    return this.currentScene.speaker === 'ARARA';
  }

  toggleVoice() {
    const on = this.voice.toggle();
    if (!on) this.parrotTalk = 0;
    if (on && this.active && this.isParrotScene) this.voice.speak(this.currentScene.text);
    return on;
  }

  setVoiceMuted(muted) {
    this.voice.setMuted(muted);
    if (muted) this.parrotTalk = 0;
  }

  _initMotes() {
    this.motes = [];
    for (let i = 0; i < 34; i++) {
      this.motes.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: 0.6 + Math.random() * 1.8,
        sp: 6 + Math.random() * 22,
        drift: (Math.random() - 0.5) * 14,
        ph: Math.random() * Math.PI * 2
      });
    }
  }

  start() {
    this.active = true;
    this.completed = false;
    this.skipped = false;
    this.index = 0;
    this.scenesSeen = 0;
    this.elapsed = 0;
    // Busca os clipes gravados do arara; sem internet e sem cache, cai na sintese.
    if (this.voice && this.voice.loadManifest) this.voice.loadManifest();
    this._enterScene(0);
  }

  restart() {
    this.start();
  }

  finish() {
    this.active = false;
    this.completed = true;
    this.voice.stop();
  }

  skip() {
    if (!this.active) return;
    this.skipped = true;
    this.finish();
  }

  get currentScene() {
    return STORY_SCENES[this.index] || STORY_SCENES[0];
  }

  get charsPerSecond() {
    return 52;
  }

  get sceneDuration() {
    const len = this.currentScene.text.length;
    const reading = Math.max(5.2, len / this.charsPerSecond + 2.0);
    if (this.isParrotScene && this.voice.duration > 0) {
      return Math.max(reading, this.voice.duration + 1.6);
    }
    return reading;
  }

  _enterScene(i) {
    this.index = i;
    this.scenesSeen++;
    this.sceneTime = 0;
    this.charsShown = 0;
    this.elapsed = 0;
    this.voiceSpokenFor = -1;
    this._voiceWait = 0;
    this.voice.stop();
    this._layoutText();
    const isParrot = this.currentScene.speaker === 'ARARA';
    if (isParrot) this.parrotTalk = 1;
    if (this.sound) {
      if (i === 0) this.sound.playDramaticSting();
      else if (isParrot) this.sound.playParrotSquawk();
      else this.sound.playPageTurn();
    }
  }

  _layoutText() {
    const ctx = this._measureCtx || (this._measureCtx = document.createElement('canvas').getContext('2d'));
    ctx.font = '600 15px "Inter", sans-serif';
    const maxWidth = this.width - 108;
    const words = this.currentScene.text.split(' ');
    const lines = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    this.wrappedLines = lines;
  }

  _visibleLines() {
    let remaining = this.charsShown;
    const out = [];
    for (const line of this.wrappedLines) {
      if (remaining <= 0) break;
      if (remaining >= line.length) {
        out.push(line);
        remaining -= line.length;
      } else {
        out.push(line.slice(0, remaining));
        remaining = 0;
      }
    }
    return out;
  }

  get textComplete() {
    return this.charsShown >= this.currentScene.text.length;
  }

  advance() {
    if (!this.active) return;
    if (!this.textComplete) {
      this.charsShown = this.currentScene.text.length;
      this._layoutText();
      return;
    }
    if (this.index < STORY_SCENES.length - 1) {
      if (this.sound) this.sound.playWhoosh();
      this._enterScene(this.index + 1);
    } else {
      this.finish();
    }
  }

  update(dt) {
    if (!this.active) {
      this.voice.update(dt);
      return;
    }
    this.t += dt;
    this.sceneTime += dt;
    this.elapsed += dt;
    this.pulse = (this.pulse + dt) % 1000;

    // A voz do arara arranca junto com o começo da cena, para o audio e o
    // texto saírem do zero no mesmo instante. Espera o manifesto dos clipes
    // resolver para nao cair na sintese por causa de uma corrida de timing; se
    // o arquivo nao vier, a espera tem teto e o jogo segue com a voz animada.
    if (this.isParrotScene && this.voiceSpokenFor !== this.index) {
      if (!this.voice.manifestLoaded) {
        this._voiceWait = (this._voiceWait || 0) + dt;
      }
      const manifestoPronto = this.voice.manifestLoaded;
      if ((manifestoPronto || this._voiceWait > 1.2) && this.sceneTime > 0.25) {
        this.voiceSpokenFor = this.index;
        this._voiceWait = 0;
        this.voice.setMuted(!!(this.sound && !this.sound.enabled));
        this.voice.speak(this.currentScene.text, this.index);
      }
    }
    const voiceOn = this.voice.update(dt);
    if (this.isParrotScene) {
      // A voz manda: com clipe gravado, o texto e o bico seguem o audio real;
      // sem clipe, a animacao cauda para o tempo estimado e desliga sozinha.
      this.parrotTalk = voiceOn > 0.02
        ? Math.max(this.parrotTalk, 0.25 + voiceOn * 0.75)
        : Math.max(0, this.parrotTalk - dt * 2.4);
    } else {
      this.parrotTalk = Math.max(0, this.parrotTalk - dt * 0.8);
    }

    if (this.voice.speaking && this.voice.source === 'clipe') {
      // Texto escrito no ritmo da voz humana, marca por marca. O max evita
      // retroceder se o jogador adiantou a frase com o proprio clique.
      const falado = this.voice.charsAt(this.voice.time);
      this.charsShown = Math.min(this.currentScene.text.length, Math.max(this.charsShown, falado));
    } else if (this.charsShown < this.currentScene.text.length) {
      const before = Math.floor(this.charsShown);
      this.charsShown = Math.min(this.currentScene.text.length, this.charsShown + this.charsPerSecond * dt);
      if (Math.floor(this.charsShown) !== before) this._layoutText();
    }

    if (this.textComplete && this.elapsed > this.sceneDuration) {
      this.advance();
    }

    const pal = STORY_PALETTES[this.currentScene.stage] || STORY_PALETTES.praia;
    for (const m of this.motes) {
      m.y -= m.sp * dt;
      m.x += Math.sin(this.t * 0.8 + m.ph) * m.drift * dt;
      if (m.y < -8) {
        m.y = this.height + 8;
        m.x = Math.random() * this.width;
      }
    }
    this.pal = pal;
  }

  draw(ctx) {
    const pal = this.pal || STORY_PALETTES.praia;
    const stage = this.currentScene.stage;
    const horizon = this.height * 0.62;

    ctx.save();

    // A foto da frase ocupa o lugar do ceu, do sol, dos morros e do chao.
    // Sem foto carregada, o desenho vetorial antigo entra como reserva.
    const fundo = this._fundoDaCena(stage);
    if (fundo) {
      this._cortarFundo(ctx, fundo, stage);
    } else {
      // Sem foto carregada, um fundo liso para o texto ficar legivel.
      const liso = ctx.createLinearGradient(0, 0, 0, this.height);
      liso.addColorStop(0, pal.skyTop);
      liso.addColorStop(1, pal.skyBot);
      ctx.fillStyle = liso;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    if (stage === 'chuva') this._drawChuvaFx(ctx, horizon);

    this._drawParrot(ctx, pal, stage);
    if (stage === 'dica') this._drawColheitor(ctx, horizon, pal);

    this._drawMotes(ctx, pal);
    ctx.restore();

    this._drawVignette(ctx);
    this._drawTitle(ctx, stage);
    this._drawTextBox(ctx);
  }

  /**
   * Chuva por cima da foto. Ficou fora do desenho de cenario de proposito: e o
   * unico efeito que o usuario pediu para manter sobre a imagem.
   */
  _drawChuvaFx(ctx, horizon) {
    const W = this.width;
    ctx.strokeStyle = 'rgba(210,230,240,0.5)';
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 90; i++) {
      const x = ((i * 197) % W) + (this.t * 40) % W;
      const y = (this.t * 620 + i * 53) % this.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y + 17);
      ctx.stroke();
    }
  }

  /**
   * Preenche o canvas com a foto, cortando o excedente para nao distorcer.
   * As fotos sao panoramicas (1600x647) e o jogo e 4:3, entao sobra largura:
   * cortamos as laterais em vez de achatar a imagem. `focoX` desloca o corte,
   * 0.5 centralizado, 0 cola a esquerda e 1 cola a direita.
   */
  _cortarFundo(ctx, img, stage) {
    const sw = img.naturalWidth || img.width;
    const sh = img.naturalHeight || img.height;
    if (!sw || !sh) return false;

    const escala = Math.max(this.width / sw, this.height / sh);
    const dw = sw * escala;
    const dh = sh * escala;
    const palco = STORY_FUNDOS[stage] && STORY_FUNDOS[stage].focoX;
    const foco = typeof palco === 'number' ? palco : 0.5;
    const dx = (this.width - dw) * foco;
    const dy = (this.height - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
    return true;
  }

  /**
   * O arara, pintado em camadas como a arara-caninde de verdade.
   *
   * A luz vem de cima e da direita, igual ao sol das fotos de fundo, entao o
   * brilho cai no dorso e na testa e a sombra fica no peito e no ventre. Cada
   * parte recebe um degrade proprio e as penas sao desenhadas uma a uma, com
   * a separation entre elas, senao o papagaio vira uma mancha vermelha.
   */
  _drawParrot(ctx, pal, stage) {
    const talking = this.parrotTalk > 0.05;
    const startX = -70;
    const endX = this.width * 0.30;
    const k = Math.min(1, this.sceneTime / 2.2);
    const ease = 1 - Math.pow(1 - k, 3);
    const x = startX + (endX - startX) * ease;
    const y = this.height * 0.20 + Math.sin(this.t * 1.7) * 20 + (0.30 - 0.20) * this.height * 2;
    // Um pouco maior que antes, para a pintura aparecer.
    const s = 1.18 + Math.sin(this.t * 2.3) * 0.05;
    const flap = Math.sin(this.sceneTime * (k < 1 ? 26 : 9));
    const vi = this.voice ? this.voice.intensity : 0;
    // Boca aberta pelo volume real da voz: 0 = fechada, 1 = escancarada.
    const abre = talking ? 0.30 + Math.abs(Math.sin(this.t * 12)) * 0.35 + Math.min(1, vi) * 0.55 : 0;
    const wing = flap * 0.9;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    this._araraCauda(ctx, wing);
    this._araraCorpo(ctx);
    // A asa vem depois do corpo de proposito: numa ave, a asa dobrada fica
    // por cima do flanco. Desenhada antes, o corpo cobria a faixa amarela.
    this._araraAsa(ctx, wing);
    this._araraCabeca(ctx, abre);

    ctx.restore();

    // Ondas de voz: saem do bico e pulsam com a intensidade da fala.
    if (talking) {
      const bico = x + 42 * s;
      const rings = 3;
      for (let i = 0; i < rings; i++) {
        const ph = (this.t * 2.4 + i / rings) % 1;
        const rad = 14 + ph * (18 + vi * 12);
        ctx.globalAlpha = (1 - ph) * (0.28 + vi * 0.45);
        ctx.strokeStyle = '#FCA5A5';
        ctx.lineWidth = 2 - ph;
        ctx.beginPath();
        ctx.arc(bico, y - 2, rad, -0.9, 0.9);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  /** Cauda longa de arara: vermelha, com as pontas azuis, em tres penas. */
  _araraCauda(ctx, wing) {
    const canetas = [
      { ang: 0.10 + wing * 0.05, comp: 70, larg: 4.6 },
      { ang: 0.24 + wing * 0.07, comp: 62, larg: 4.0 },
      { ang: 0.01 + wing * 0.03, comp: 66, larg: 4.2 }
    ];
    for (let i = 0; i < canetas.length; i++) {
      const c = canetas[i];
      this._pena(ctx, 10, 5 + i * 2.4, c.comp, c.larg, c.ang, {
        clara: '#D8382F', base: '#B01C22', escura: '#6E0F16', borda: '#5C0D13'
      }, -1);
    }
    // Ponta azul das penas de cauda, que e o que da leitura de arara.
    for (let i = 0; i < canetas.length; i++) {
      const c = canetas[i];
      ctx.save();
      ctx.translate(10, 5 + i * 2.4);
      ctx.scale(-1, 1);
      ctx.rotate(c.ang);
      const g = ctx.createLinearGradient(c.comp - 22, 0, c.comp, 0);
      g.addColorStop(0, 'rgba(29,78,216,0)');
      g.addColorStop(0.45, 'rgba(29,78,216,0.85)');
      g.addColorStop(1, '#12358F');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(c.comp - 22, -c.larg * 0.75);
      ctx.quadraticCurveTo(c.comp, -c.larg * 0.35, c.comp, 0);
      ctx.quadraticCurveTo(c.comp, c.larg * 0.35, c.comp - 22, c.larg * 0.75);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Asa fechada de arara-caninde: ombro vermelho, faixa amarela de coberteiras
   * e as penas de voo azuis por baixo, com a separacao escura entre elas.
   */
  _araraAsa(ctx, wing) {
    // Penas de voo azuis: as longas, por baixo de tudo, varrendo para tras.
    const voo = [-0.30, -0.14, 0.02, 0.18, 0.34];
    for (let i = 0; i < voo.length; i++) {
      const t = i / (voo.length - 1);
      this._pena(ctx, 2, 0 + i * 1.5, 30 - t * 6, 4.6 - t * 0.7, voo[i] + wing * 0.10, {
        clara: '#5B8AE0', base: '#1D4ED8', escura: '#0F2C7A', borda: '#0B1F5C'
      }, -1);
    }
    // Capa vermelha do ombro: so a parte de cima da asa, junto do corpo. Ela
    // vem antes do amarelo de proposito, senao esconde a faixa das coberteiras.
    const g = ctx.createLinearGradient(0, -16, 0, 0);
    g.addColorStop(0, '#F0503F');
    g.addColorStop(0.55, '#C6202B');
    g.addColorStop(1, '#8C121C');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-4, -14);
    ctx.quadraticCurveTo(-17, -18 + wing * 12, -15, -3 + wing * 5);
    ctx.quadraticCurveTo(-8, 0, -2, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(92,13,19,0.55)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    // Faixa amarela de coberteiras, no meio da asa, por cima da capa.
    const amarela = [-0.24, -0.08, 0.08, 0.24];
    for (let i = 0; i < amarela.length; i++) {
      this._pena(ctx, 2, -4 + i * 2.4, 20 - i * 1.5, 4.6 - i * 0.3, amarela[i] + wing * 0.12, {
        clara: '#FFE27A', base: '#F0B400', escura: '#B27C00', borda: '#8A5F00'
      }, -1);
    }
  }

  /**
   * Corpo de Scarlet Macaw: scarlet no dorso, mais escuro no peito e no
   * ventre, com as camadas de pena do peito e do dorso aparecendo na textura.
   */
  _araraCorpo(ctx) {
    // Volume: brilho no dorso (cima-direita) e sombra embaixo-esquerda.
    const g = ctx.createRadialGradient(7, -8, 2, 0, 0, 24);
    g.addColorStop(0, '#F0503F');
    g.addColorStop(0.35, '#D22B2B');
    g.addColorStop(0.72, '#A8181F');
    g.addColorStop(1, '#6E0F16');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 1, 19, 16, 0.10, 0, Math.PI * 2);
    ctx.fill();

    // Camadas de pena do dorso: files curtas e sobrepostas, varrendo para tras.
    for (let file = 0; file < 3; file++) {
      for (let i = 0; i < 5; i++) {
        this._pena(ctx, 10 - i * 5.5, -9 + file * 4.6, 9, 3.0, -0.55 + file * 0.30, {
          clara: 'rgba(255,150,130,0.30)', base: 'rgba(210,43,43,0.22)', escura: 'rgba(140,18,28,0.18)', borda: 'rgba(110,15,22,0.16)'
        }, -1);
      }
    }
    // Barriga: peninhas curtas, mais escuras, seguindo a curva do peito.
    for (let file = 0; file < 2; file++) {
      for (let i = 0; i < 5; i++) {
        this._pena(ctx, 12 - i * 5.0, 5 + file * 4.4, 7, 2.6, 0.95 - file * 0.18, {
          clara: 'rgba(255,140,120,0.20)', base: 'rgba(168,24,31,0.20)', escura: 'rgba(90,12,18,0.22)', borda: 'rgba(70,10,15,0.16)'
        }, -1);
      }
    }

    // Luz de contorno pela borda de cima, que separa o papagaio da foto.
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#FFB59A';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, 1, 19, 16, 0.10, -2.35, -0.55);
    ctx.stroke();
    ctx.restore();
  }

  /** Cabeca, testa verde, cara branca, olho e bico, com a boca abrindo. */
  _araraCabeca(ctx, abre) {
    // Cabeca: esfera com o brilho no alto-direita.
    const g = ctx.createRadialGradient(10, -18, 1, 6, -14, 15);
    g.addColorStop(0, '#F2594A');
    g.addColorStop(0.4, '#D22B2B');
    g.addColorStop(0.8, '#A8181F');
    g.addColorStop(1, '#78111A');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(6, -15, 12.4, 11.4, 0.06, 0, Math.PI * 2);
    ctx.fill();

    // Peninhas do crnio, para nao virar uma esfera lisa.
    for (let i = 0; i < 6; i++) {
      this._pena(ctx, 14 - i * 4.2, -20 + (i % 2) * 3, 6, 2.0, -0.8 + (i % 3) * 0.25, {
        clara: 'rgba(255,160,140,0.24)', base: 'rgba(210,43,43,0.16)', escura: 'rgba(140,18,28,0.16)', borda: 'rgba(110,15,22,0.12)'
      }, -1);
    }

    // Testa verde: a arara-caninde tem uma faixa verde e ninguem mais tem.
    const fg = ctx.createLinearGradient(6, -26, 16, -20);
    fg.addColorStop(0, '#5FBF63');
    fg.addColorStop(0.6, '#2E8B34');
    fg.addColorStop(1, '#1B5E20');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(3, -24.5);
    ctx.quadraticCurveTo(12, -27, 16.5, -21.5);
    ctx.quadraticCurveTo(12, -19.5, 3, -20.5);
    ctx.closePath();
    ctx.fill();

    // Cara branca: e pele nua, entao e mais clara e nao tem pena por cima.
    const bg = ctx.createRadialGradient(11, -14, 1, 9, -13, 9);
    bg.addColorStop(0, '#FFFBF3');
    bg.addColorStop(0.55, '#F0E5D2');
    bg.addColorStop(1, '#CDBCA1');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(9.5, -13, 8.2, 7.0, 0.05, 0, Math.PI * 2);
    ctx.fill();
    // Linhas finas de pena vermelha sobre a pele, como na arara real.
    ctx.strokeStyle = 'rgba(200,40,40,0.32)';
    ctx.lineWidth = 0.6;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(4.5 + i * 1.9, -17.5);
      ctx.lineTo(6.5 + i * 1.9, -9.5);
      ctx.stroke();
    }

    // Olho: iris palida, pupila escura e o brilho que da vida ao olhar.
    ctx.fillStyle = '#E8C86A';
    ctx.beginPath();
    ctx.ellipse(11.5, -15, 2.9, 2.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1A1512';
    ctx.beginPath();
    ctx.ellipse(11.7, -15, 1.7, 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.arc(12.6, -16, 0.95, 0, Math.PI * 2);
    ctx.fill();
    // Pálpebra: a linha escura que emoldura o olho.
    ctx.strokeStyle = 'rgba(90,20,24,0.7)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.ellipse(11.5, -15, 2.9, 2.7, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Bico: o de cima e o gancho, o de baixo e menor. Preto com brilho cinza.
    const bico = ctx.createLinearGradient(15, -14, 30, 2);
    bico.addColorStop(0, '#7C766F');
    bico.addColorStop(0.35, '#3A3531');
    bico.addColorStop(1, '#0D0C0B');
    ctx.fillStyle = bico;
    ctx.beginPath();
    ctx.moveTo(14.5, -12.5);
    ctx.quadraticCurveTo(28, -12, 33, -4.5);
    ctx.quadraticCurveTo(34, 1, 29, 2.5);
    ctx.quadraticCurveTo(24, 0.5, 20, -1.5);
    ctx.quadraticCurveTo(16, -4, 14.5, -12.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,8,8,0.85)';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Boca de baixo, mais curta, abrindo com a fala.
    const baixo = ctx.createLinearGradient(18, -1, 28, 6);
    baixo.addColorStop(0, '#514B45');
    baixo.addColorStop(1, '#151312');
    ctx.fillStyle = baixo;
    ctx.beginPath();
    ctx.moveTo(16, -1.6);
    ctx.quadraticCurveTo(23, 0.4, 26, 2.6);
    ctx.quadraticCurveTo(22, 5.5, 16, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,8,8,0.85)';
    ctx.lineWidth = 0.9;
    ctx.stroke();

    if (abre > 0.02) {
      // Dentro da boca: escuro, com a lingua aparecendo embaixo.
      const dentro = ctx.createLinearGradient(18, -2, 30, 6);
      dentro.addColorStop(0, '#2A0A0C');
      dentro.addColorStop(1, '#6E1418');
      ctx.fillStyle = dentro;
      ctx.beginPath();
      ctx.moveTo(16, -1.4);
      ctx.quadraticCurveTo(24, 0.6, 29, 3);
      ctx.quadraticCurveTo(24, 3 + abre * 8, 17, 2 + abre * 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#C4656B';
      ctx.beginPath();
      ctx.ellipse(20, 2.6 + abre * 2.2, 3.2, 1.1 + abre * 0.6, -0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Brilho no dorso do bico, que e o que faz ele parecer duro e nao um borrão.
    ctx.strokeStyle = 'rgba(226,222,214,0.5)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(16.5, -11.5);
    ctx.quadraticCurveTo(26, -10.5, 30.5, -4.5);
    ctx.stroke();
    // Narina.
    ctx.fillStyle = 'rgba(20,18,16,0.9)';
    ctx.beginPath();
    ctx.ellipse(17.5, -10, 1.3, 0.9, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Uma pena isolada, com degrade proprio e a borda escura que a separa da
   * pena vizinha. `ang` gira em torno da ancora; `sentido` -1 faz a pena varrer
   * para tras, que e como a cauda e a asa de uma ave que olha para a direita.
   */
  _pena(ctx, x, y, comp, larg, ang, cor, sentido) {
    ctx.save();
    ctx.translate(x, y);
    if (sentido === -1) ctx.scale(-1, 1);
    ctx.rotate(ang);
    const g = ctx.createLinearGradient(0, -larg, 0, larg);
    g.addColorStop(0, cor.clara);
    g.addColorStop(0.5, cor.base);
    g.addColorStop(1, cor.escura);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -larg);
    ctx.quadraticCurveTo(comp * 0.6, -larg * 0.9, comp, 0);
    ctx.quadraticCurveTo(comp * 0.6, larg * 0.9, 0, larg);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = cor.borda;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Raio central, a haste da pena.
    ctx.strokeStyle = 'rgba(255,255,255,0.13)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(comp * 0.1, 0);
    ctx.lineTo(comp * 0.92, 0);
    ctx.stroke();
    ctx.restore();
  }

  _drawColheitor(ctx, horizon, pal) {
    const x = this.width * 0.62;
    const y = horizon + 62;
    const bob = Math.sin(this.t * 2.2) * 3;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + 4, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.translate(x, y + bob);

    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(-13, 0);
    ctx.lineTo(-11, -42);
    ctx.quadraticCurveTo(0, -50, 11, -42);
    ctx.lineTo(13, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#FDBA74';
    ctx.beginPath();
    ctx.arc(0, -52, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3F2A18';
    ctx.beginPath();
    ctx.arc(0, -56, 9, Math.PI, 0);
    ctx.fill();

    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.ellipse(17, -22, 14, 11, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(6 + i * 6, -30);
      ctx.lineTo(20 + i * 6, -14);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#E23B3B';
      ctx.beginPath();
      ctx.arc(12 + i * 6, -28, 3.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#FDBA74';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    const wave = Math.sin(this.t * 3) * 0.5;
    ctx.beginPath();
    ctx.moveTo(-6, -38);
    ctx.quadraticCurveTo(-26, -46, -30, -66 + wave * 8);
    ctx.stroke();
    ctx.restore();
  }

  _drawMotes(ctx, pal) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const m of this.motes) {
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawVignette(ctx) {
    const g = ctx.createRadialGradient(this.width / 2, this.height / 2, this.height * 0.32, this.width / 2, this.height / 2, this.height * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.width, 26);
    ctx.fillRect(0, this.height - 26, this.width, 26);
  }

  _drawTitle(ctx, stage) {
    const reveal = Math.min(1, this.sceneTime / 0.8);
    ctx.save();
    ctx.globalAlpha = reveal;
    ctx.textAlign = 'center';
    ctx.font = '800 21px "Orbitron", sans-serif';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.strokeText('O CORAÇÃO E A ALMA DE MAUÉS', this.width / 2, 30);
    ctx.fillStyle = '#FDE68A';
    ctx.fillText('O CORAÇÃO E A ALMA DE MAUÉS', this.width / 2, 30);

    ctx.font = '600 10px "Inter", sans-serif';
    ctx.strokeText("TO'IRO MAUÉS  •  CETAM", this.width / 2, 47);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText("TO'IRO MAUÉS  •  CETAM", this.width / 2, 47);

    for (let i = 0; i < STORY_SCENES.length; i++) {
      const done = i < this.index;
      const active = i === this.index;
      ctx.fillStyle = active ? '#FDE68A' : done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.20)';
      ctx.beginPath();
      ctx.arc(this.width - 26 - i * 15, 30, active ? 5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawTextBox(ctx) {
    const boxH = 104;
    const boxY = this.height - 26 - boxH - 12;
    const boxX = 34;
    const boxW = this.width - 68;
    const scene = this.currentScene;

    ctx.save();
    ctx.globalAlpha = Math.min(1, this.sceneTime / 0.35);

    ctx.fillStyle = 'rgba(3, 10, 20, 0.88)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, boxW, boxH, 14);
    else ctx.rect(boxX, boxY, boxW, boxH);
    ctx.fill();

    ctx.lineWidth = 1.6;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();

    ctx.fillStyle = scene.color;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(boxX, boxY, 5, boxH, 3);
    else ctx.rect(boxX, boxY, 5, boxH);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '800 13px "Orbitron", sans-serif';
    ctx.fillStyle = scene.color;
    ctx.fillText(scene.speaker, boxX + 20, boxY + 25);

    // Medidor de voz do arara: barras animadas + rotulo de estado.
    if (this.voice) {
      const vx = boxX + 20 + ctx.measureText(scene.speaker).width + 14;
      const vi = this.voice.intensity;
      const live = this.voice.speaking || vi > 0.02;
      ctx.font = '700 9px "Inter", sans-serif';
      ctx.fillStyle = live ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.30)';
      ctx.fillText(this.voice.statusLabel, vx + 26, boxY + 24);
      for (let i = 0; i < 5; i++) {
        const seed = Math.sin(this.t * 9 + i * 1.7) * 0.5 + 0.5;
        const h = live ? 3 + seed * (4 + vi * 8) : 2.5;
        ctx.fillStyle = live
          ? `rgba(252, 165, 165, ${0.45 + seed * 0.5})`
          : 'rgba(255,255,255,0.22)';
        ctx.fillRect(vx + i * 4.2, boxY + 20 - h, 2.6, h);
      }
    }

    ctx.font = '600 15px "Inter", sans-serif';
    ctx.fillStyle = '#FFFFFF';
    const lines = this._visibleLines();
    let ty = boxY + 50;
    for (const line of lines) {
      ctx.fillText(line, boxX + 20, ty);
      ty += 21;
    }

    if (this.textComplete) {
      const a = 0.35 + Math.abs(Math.sin(this.t * 3.2)) * 0.65;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.moveTo(boxX + boxW - 26, boxY + boxH - 20);
      ctx.lineTo(boxX + boxW - 16, boxY + boxH - 20);
      ctx.lineTo(boxX + boxW - 21, boxY + boxH - 13);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.textAlign = 'center';
    ctx.font = '600 10px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.fillText('ESPAÇO / CLIQUE: AVANÇAR   •   S: PULAR INTRODUÇÃO   •   F: VOZ DO ARARA   •   M: SOM', this.width / 2, this.height - 8);
    ctx.restore();
  }
}

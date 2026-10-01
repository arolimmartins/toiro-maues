/**
 * Banco de provas do To'iro Maués
 *
 * Carrega os scripts reais do jogo dentro de um contexto Node com Canvas 2D,
 * DOM e Image simulados, para que o comportamento possa ser exercitado sem
 * abrir o Electron. Os caminhos de imagem sao resolvidos contra o disco de
 * verdade, entao os testes detectam asset renomeado, movido ou apagado.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = path.resolve(__dirname, '..');

/** Ordem de carregamento: mesma do index.html (sprites antes de harvester). */
const FILES = [
  'src/game/audio.js',
  'src/game/particles.js',
  'src/game/sprites.js',
  'src/game/harvester.js',
  'src/game/harvest_scene.js',
  'src/game/harvest_sim.js',
  'src/game/menino3d.js',
  'src/game/harvest3d.js',
  'src/game/harvest3d_app.js',
  'src/game/voice-clips.js',
  'src/game/voice.js',
  'src/game/story.js',
  'src/game/engine.js'
];

/** Nomes globais que os testes precisam acessar. */
const EXPORTS = [
  'GuaranaHarvester', 'CharacterSpriteSet', 'FrameSet', 'HarvestScene',
  'StoryManager', 'GameEngine', 'ParticleSystem', 'SoundManager', 'ParrotVoice',
  'STORY_SCENES', 'STORY_FUNDOS', 'HARVEST_PHASES', 'CHAR_ANIM_SOURCES', 'VOICE_CLIPS', 'VOICE_META',
  'HarvestSim', 'HARVEST_WORLD', 'ITEM_TYPES', 'BOY_ABILITIES',
  'MENINO_RIG', 'MENINO_ESTILO', 'MENINO_ANIM', 'buildMeninoGuarana', 'animarMenino', 'atualizarCesta',
  'criarHarvest3D', 'entradaRelativa', 'Colheita3D', 'EntradaJogo', 'HARVEST3D_PALETA', 'HARVEST3D_EFEITOS', 'HARVEST3D_FASE_CHAO'
];

/** Caminho relativo de todos os arquivos do projeto, para simular o servidor. */
function listAssets() {
  const found = new Set();
  const walk = (dir, rel) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const name = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
        walk(abs, name);
      } else {
        found.add(name);
      }
    }
  };
  walk(BASE, '');
  return found;
}

/**
 * Canvas 2D que aceita qualquer chamada, para focar no estado do jogo.
 *
 * Cada chamada de desenho e registrada em `ctx.__ops` (funcoes que pintam de
 * verdade: fill, stroke, fillRect, drawImage...). Isso permite garantir que uma
 * tela realmente desenha conteudo, e nao so repete um fundo vazio.
 */
function createMockContext() {
  const noop = () => {};
  // Um degrade por chamada. Registrar as paradas de cor e o que permite
  // checar a paleta da arte: num preenchimento com degrade, o fillStyle e um
  // objeto, e as cores verdadeiras estao nas paradas.
  const degradê = () => ({ addColorStop: (_offset, cor) => { ctx.__cores.push(cor); } });
  const ctx = {
    // Contador de operacoes de desenho, para os testes medirem o que foi pintado.
    __ops: [],
    // Contador de degradês criados. Um desenho 2D chapado nao deve criar nenhum:
    // é assim que a suite mede o quanto a arte usa sombreamento.
    __gradientes: 0,
    // Retangulos passados a drawImage, para conferir como a foto foi recortada:
    // [dx, dy, dw, dh]. Vazio enquanto nenhuma imagem foi pintada.
    __drawImage: [],
    // Cores de preenchimento e traço usadas, para garantir que a arte mantem a
    // paleta de verdade (a arara-caninde e vermelha, amarela, azul e verde).
    __cores: [],
    canvas: { width: 960, height: 520 },
    globalAlpha: 1, globalCompositeOperation: 'source-over',
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '',
    textAlign: '', textBaseline: '', lineCap: '', lineJoin: '', letterSpacing: '',
    imageSmoothingEnabled: true, imageSmoothingQuality: 'high',
    shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    filter: 'none',
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    transform: noop, setTransform: noop, resetTransform: noop,
    beginPath: noop, closePath: noop, moveTo: noop, lineTo: noop,
    quadraticCurveTo: noop, bezierCurveTo: noop, arc: noop, arcTo: noop,
    ellipse: noop, rect: noop, roundRect: noop, clip: noop,
    setLineDash: noop, getLineDash: () => [],
    measureText: (t) => ({ width: String(t).length * 8 }),
    createLinearGradient: () => { ctx.__gradientes++; return degradê(); },
    createRadialGradient: () => { ctx.__gradientes++; return degradê(); },
    createConicGradient: () => { ctx.__gradientes++; return degradê(); },
    createPattern: () => null,
    isPointInPath: () => false
  };
  // Envolve so as chamadas que realmente pintam, para nao inflar o contador.
  ['fill', 'stroke', 'fillRect', 'strokeRect', 'clearRect', 'drawImage', 'fillText', 'strokeText']
    .forEach((nome) => {
      ctx[nome] = (...args) => {
        ctx.__ops.push(nome);
        // drawImage com 5 argumentos e o recorte (img, sx, sy, sw, sh, dx, dy, dw, dh).
        if (nome === 'drawImage' && args.length === 5) ctx.__drawImage.push(args.slice(1));
        if (nome === 'fill') ctx.__cores.push(ctx.fillStyle);
        if (nome === 'stroke') ctx.__cores.push(ctx.strokeStyle);
      };
    });
  return ctx;
}

/** Elemento de DOM minimo, com o mesmo contrato usado pelo jogo. */
function createMockElement() {
  const classes = new Set();
  return {
    textContent: '', innerHTML: '', value: '', style: {}, dataset: {}, children: [],
    classList: {
      add(...c) { c.forEach(x => classes.add(x)); },
      remove(...c) { c.forEach(x => classes.delete(x)); },
      contains(c) { return classes.has(c); },
      toggle(c) { if (classes.has(c)) classes.delete(c); else classes.add(c); }
    },
    appendChild() {}, removeChild() {}, replaceChildren() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    querySelector: () => createMockElement(),
    querySelectorAll: () => [],
    getAttribute: () => null, setAttribute() {}, removeAttribute() {},
    focus() {}, blur() {}, click() {}
  };
}

/** Elemento <canvas> minimo, como o motor espera receber. */
function createMockCanvas(width = 960, height = 520) {
  const ctx = createMockContext();
  ctx.canvas = { width, height };
  return {
    width,
    height,
    getContext: () => ctx,
    addEventListener() {}, removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width, height, right: width, bottom: height })
  };
}

/**
 * Monta o sandbox e devolve as classes do jogo.
 * @param {{semArquivos?: string[]}} [options] scripts a omitir, para testar
 *        o comportamento do jogo quando um arquivo opcional nao existe.
 * @returns {{sandbox, api, elements, stats, context, canvas}}
 */
function createGameSandbox(options = {}) {
  const omitidos = new Set(options.semArquivos || []);
  const assets = listAssets();
  const stats = { loaded: 0, missing: [], missingPaths: [] };

  class MockImage {
    constructor() {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.complete = false;
      this.onload = null;
      this.onerror = null;
      this._src = '';
    }
    get src() { return this._src; }
    set src(value) {
      this._src = value;
      if (assets.has(String(value).replace(/\\/g, '/'))) {
        stats.loaded++;
        this.naturalWidth = 64;
        this.naturalHeight = 96;
        this.complete = true;
        if (this.onload) this.onload();
      } else {
        stats.missing++;
        stats.missingPaths.push(String(value).replace(/\\/g, '/'));
        if (this.onerror) this.onerror();
      }
    }
  }

  const elements = new Map();
  const storage = {};

  const sandbox = {
    console,
    performance: { now: () => Date.now() },
    requestAnimationFrame: () => 0,
    cancelAnimationFrame: () => {},
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Math, Date, JSON, String, Number, Array, Object, Set, Map, Boolean,
    isNaN, parseInt, parseFloat, Error, TypeError,
    localStorage: {
      getItem: (k) => (k in storage ? storage[k] : null),
      setItem: (k, v) => { storage[k] = String(v); },
      removeItem: (k) => { delete storage[k]; }
    },
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, createMockElement());
        return elements.get(id);
      },
      createElement: () => ({ getContext: () => createMockContext(), width: 0, height: 0 }),
      addEventListener() {}, removeEventListener() {}
    },
    Image: MockImage
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  for (const file of FILES) {
    const full = path.join(BASE, file);
    if (omitidos.has(file)) continue;
    if (!fs.existsSync(full)) throw new Error(`Script do jogo ausente: ${file}`);
    vm.runInContext(fs.readFileSync(full, 'utf8'), sandbox, { filename: file });
  }

  // typeof para nao estourar quando um script opcional foi omitido.
  const exports = EXPORTS
    .map((nome) => `${nome}: (typeof ${nome} !== 'undefined' ? ${nome} : undefined)`)
    .join(', ');
  vm.runInContext(`globalThis.__api = { ${exports} };`, sandbox);

  return {
    sandbox,
    api: sandbox.__api,
    elements,
    stats,
    context: createMockContext,
    canvas: createMockCanvas
  };
}

/** Relatorio de resultado no formato da suite. */
function createReporter(title) {
  let passed = 0;
  const failures = [];

  console.log(`\n${title}`);
  console.log('='.repeat(title.length));

  return {
    section(name) {
      console.log(`\n--- ${name} ---`);
    },
    info(message) {
      console.log(`  info  ${message}`);
    },
    check(name, condition, detail) {
      if (condition) {
        passed++;
        console.log(`  PASS  ${name}`);
      } else {
        failures.push({ name, detail });
        console.log(`  FAIL  ${name}${detail ? ` -> ${detail}` : ''}`);
      }
    },
    summary() {
      const total = passed + failures.length;
      console.log('');
      if (failures.length === 0) {
        console.log(`OK: ${passed}/${total} checagens passaram.`);
        return 0;
      }
      console.log(`FALHOU: ${failures.length} de ${total} checagens.`);
      for (const f of failures) console.log(`  - ${f.name}${f.detail ? ` (${f.detail})` : ''}`);
      return 1;
    }
  };
}

/** helpers de montagem de cena usados pelos testes de colheita. */
const helpers = {
  /** Coloca a cena em estado estavel, sem contagem regressiva nem spawns. */
  stableScene(scene) {
    scene.countdown = -1;
    scene.phaseElapsed = 999;
    scene.nextSpawnDelay = 9999;
    return scene;
  },
  /** Esvazia a cena durante a medicao, para o teste nao depender de sorte. */
  freeze(scene) {
    scene.fallingItems.length = 0;
    scene.nextSpawnDelay = 9999;
  },
  /** Insere um item exatamente sobre a cesta, forcando a coleta. */
  dropAtBasket(scene, harvester, type = 'guarana') {
    const basket = harvester.getBasketCenter();
    scene.fallingItems.push({
      type, x: basket.x, y: basket.y, baseX: basket.x,
      swayOffset: 0, swaySpeed: 0, swayAmount: 0,
      speed: 0, radius: 24, rotation: 0, rotSpeed: 0, time: 0
    });
  },
  countAssets(assets, prefix, ext) {
    let n = 0;
    for (const f of assets) if (f.startsWith(prefix) && f.endsWith(ext)) n++;
    return n;
  }
};

module.exports = {
  BASE, FILES, EXPORTS,
  listAssets, createGameSandbox, createMockContext, createMockElement,
  createMockCanvas, createReporter, helpers
};

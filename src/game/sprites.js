/**
 * Sistema de sprites com fallback automatico e animacao por quadro
 *
 * Mapa de assets verificado em disco:
 *  - player2   -> assets/characters/player2    (ciclo de caminhada walk1..walk6, recorte da Ana)
 *  - player3   -> assets/characters/player3    (ciclo de caminhada walk1..walk3)
 *  - player4   -> assets/characters/player4    (ciclo de caminhada walk1..walk4)
 *
 * Ana, Lucas e Mayara jogam. Quando nao ha ciclo proprio, usam o quadro unico
 * e a fluidez vem de squash, inclinacao, poeira e rastro.
 */

const CHAR_ASSET_DIRS = {
  2: 'player2',
  3: 'player3',
  4: 'player4'
};

function charFile(playerId, file) {
  return `assets/characters/${CHAR_ASSET_DIRS[playerId] || 'player3'}/${file}`;
}

function buildAnimSources() {
  const table = {};

  for (const p of [2, 3, 4]) {
    const f = (name) => charFile(p, name);

    const entry = {
      idle: { single: [f('frente.png'), f('idle.png')] },
      walk: { single: [f('lado.png'), f('walk.png')] },
      collect: { single: [f('coletando.png'), f('collect.png')] },
      victory: { single: [f('vitoria.png'), f('victory.png')] },
      hurt: { single: [] }
    };

    // Ciclos numerados existem apenas onde ha walk1.png ... walkN.png em disco.
    entry.walk = { seq: f('walk%N%.png'), pad: false, max: 8, fps: 12, single: [f('lado.png'), f('walk.png')] };

    table[p] = entry;
  }

  return table;
}

const CHAR_ANIM_SOURCES = buildAnimSources();

const ANIM_DEFAULT_FPS = { idle: 6, walk: 12, walkLeft: 12, run: 14, runLeft: 14, collect: 14, victory: 10, hurt: 12 };

function _num(n, pad) {
  return pad && n < 10 ? `0${n}` : `${n}`;
}

function expandPattern(pattern, max, pad) {
  const out = [];
  for (let i = 1; i <= max; i++) out.push(pattern.replace('%N%', _num(i, pad)));
  return out;
}

function loadFirstImage(paths, onReady) {
  if (!paths || paths.length === 0) {
    onReady(null);
    return;
  }
  const tryAt = (idx) => {
    if (idx >= paths.length) {
      onReady(null);
      return;
    }
    const img = new Image();
    img.onload = () => onReady(img);
    img.onerror = () => tryAt(idx + 1);
    img.src = paths[idx];
  };
  tryAt(0);
}

function loadFrameSequence(paths, onReady, stopAfterMisses = 1) {
  const frames = [];
  let misses = 0;
  const step = (i) => {
    if (i >= paths.length || misses >= stopAfterMisses) {
      onReady(frames);
      return;
    }
    const img = new Image();
    img.onload = () => {
      misses = 0;
      frames.push(img);
      step(i + 1);
    };
    img.onerror = () => {
      misses++;
      step(i + 1);
    };
    img.src = paths[i];
  };
  step(0);
}

class FrameSet {
  constructor(frames = [], fps = 12, loop = true) {
    this.frames = frames;
    this.fps = fps;
    this.loop = loop;
    this.index = 0;
    this.accum = 0;
  }

  get ready() {
    return this.frames.length > 0;
  }

  get isAnimated() {
    return this.frames.length > 1;
  }

  get current() {
    return this.frames[this.index] || null;
  }

  setFps(fps) {
    if (fps > 0) this.fps = fps;
  }

  update(dt) {
    if (this.frames.length < 2) return;
    this.accum += dt;
    const step = 1 / this.fps;
    if (this.accum < step) return;
    this.accum -= step;
    if (this.accum > step * 4) this.accum = 0;
    this.index++;
    if (this.index >= this.frames.length) {
      this.index = this.loop ? 0 : this.frames.length - 1;
    }
  }

  reset() {
    this.index = 0;
    this.accum = 0;
  }
}

class CharacterSpriteSet {
  constructor(playerId) {
    this.playerId = playerId;
    this.dir = `assets/characters/${CHAR_ASSET_DIRS[playerId] || 'player3'}`;
    this.sets = {};
    this.portrait = null;
    this._load();
  }

  _loadAnim(key, cfg, defaultFps, defaultLoop) {
    const fps = cfg.fps || defaultFps;
    const loop = cfg.loop === undefined ? defaultLoop : cfg.loop;
    const finish = (frames) => {
      this.sets[key] = new FrameSet(frames, fps, loop);
    };
    const fallback = () => {
      if (!cfg.single || cfg.single.length === 0) {
        this.sets[key] = null;
        return;
      }
      loadFirstImage(cfg.single, img => finish(img ? [img] : []));
    };

    if (cfg.seq) {
      this._loadSequence(cfg.seq, cfg, frames => {
        if (frames.length > 0) finish(frames);
        else fallback();
      });
    } else {
      fallback();
    }
  }

  _loadSequence(patterns, cfg, onReady) {
    const list = Array.isArray(patterns) ? patterns : [{ seq: patterns, pad: cfg.pad, max: cfg.max }];
    let p = 0;
    const tryNext = () => {
      if (p >= list.length) {
        onReady([]);
        return;
      }
      const entry = list[p++];
      const max = entry.max || cfg.max || 8;
      const pad = entry.pad === undefined ? !!cfg.pad : !!entry.pad;
      loadFrameSequence(expandPattern(entry.seq, max, pad), frames => {
        if (frames.length > 0) onReady(frames);
        else tryNext();
      });
    };
    tryNext();
  }

  _load() {
    const sources = CHAR_ANIM_SOURCES[this.playerId] || CHAR_ANIM_SOURCES[3];
    this._loadAnim('idle', sources.idle, ANIM_DEFAULT_FPS.idle, true);
    this._loadAnim('walk', sources.walk, ANIM_DEFAULT_FPS.walk, true);
    this._loadAnim('collect', sources.collect, ANIM_DEFAULT_FPS.collect, false);
    this._loadAnim('victory', sources.victory, ANIM_DEFAULT_FPS.victory, false);
    this._loadAnim('hurt', sources.hurt, ANIM_DEFAULT_FPS.hurt, false);
    if (sources.walkLeft) this._loadAnim('walkLeft', sources.walkLeft, ANIM_DEFAULT_FPS.walkLeft, true);
    if (sources.run) this._loadAnim('run', sources.run, ANIM_DEFAULT_FPS.run, true);
    if (sources.runLeft) this._loadAnim('runLeft', sources.runLeft, ANIM_DEFAULT_FPS.runLeft, true);
    loadFirstImage([`${this.dir}/portrait.png`], img => {
      this.portrait = img;
    });
  }

  get(anim) {
    const set = this.sets[anim];
    if (set && set.ready) return set;
    const idle = this.sets.idle;
    return idle && idle.ready ? idle : null;
  }
}

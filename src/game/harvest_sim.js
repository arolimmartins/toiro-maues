/**
 * Simulacao da Colheita do Guarana em 3D — nucleo puro, sem tela.
 *
 * Este arquivo e a unica fonte de verdade do gameplay. Ele nao sabe o que e
 * canvas, WebGL ou DOM: e so numeros. Quem desenha e o renderizador 3D
 * (src/game/harvest3d.js) e quem le a telemetria e o HUD em HTML.
 *
 * Por que o movimento e no plano XZ e nao so no eixo X:
 * a versao 2D prendia o personagem a uma linha, entao "andar para todos os
 * lados" era impossivel por construcao. Aqui o chao e um plano, o menino anda
 * nas duas direcoes horizontais de verdade e o pulo usa o eixo Y. A cesta
 * tambem vira um ponto no espaco, entada a distancia vira distancia de verdade.
 *
 * Unidades: metros e segundos. O chao e y = 0 e o menino tem ~1.7 m.
 * A velocidade foi convertida da versao 2D (420 px/s => 8.2 m/s) para o
 * passo continuar com o mesmo peso depois da migracao.
 */

const HARVEST_WORLD = {
  groundY: 0,
  minX: -14,
  maxX: 14,
  minZ: -9,
  maxZ: 2.2,
  walkSpeed: 8.2,
  runSpeed: 13.5,
  accelRate: 45,
  decelRate: 60,
  brakeRate: 82,
  pivotRate: 90,
  jumpSpeed: 9.2,
  gravity: 26,
  maxFallSpeed: 34,
  basketRadius: 0.9,
  basketHeight: 1.05,
  basketForward: 0.42,
  turboDrain: 2.6,
  turboRefill: 5.5
};

const ITEM_TYPES = {
  guarana: { radius: 0.47, speedMult: 1.0, points: 100, color: 0x8b1a2b },
  moeda: { radius: 0.39, speedMult: 1.15, points: 250, turbo: 0.22, color: 0xd99400 },
  folha: { radius: 0.35, speedMult: 0.85, points: 0, turbo: -0.15, color: 0x2f7a3a },
  estrela: { radius: 0.47, speedMult: 1.25, points: 500, turbo: 1, color: 0xd8c02a }
};

const BOY_ABILITIES = {
  2: {
    name: 'Ana (Guaraná)',
    badge: '💨 Coleta Veloz',
    walkSpeedMult: 1.0,
    runSpeedMult: 1.12,
    basketRadiusMult: 1.0,
    comboDurationMult: 1.0,
    leafImmunity: false,
    textColor: '#10B981'
  },
  3: {
    name: 'Lucas (CETAM)',
    badge: '🛡️ Combo Salvo',
    walkSpeedMult: 1.0,
    runSpeedMult: 1.0,
    basketRadiusMult: 1.0,
    comboDurationMult: 1.0,
    leafImmunity: true,
    textColor: '#3B82F6'
  },
  4: {
    name: 'Mayara (Amazônia)',
    badge: '🔥 Combo 2x',
    walkSpeedMult: 1.0,
    runSpeedMult: 1.0,
    basketRadiusMult: 1.0,
    comboDurationMult: 2.0,
    leafImmunity: false,
    textColor: '#EC4899'
  },
  // Corpo padrao: continua servindo de fallback para qualquer id fora do
  // roster (testes, rodadas antigas) e e o modelo do menino na cena 3D.
  5: {
    name: 'Menino Guaraná',
    badge: '🌿 Menino Guaraná',
    walkSpeedMult: 1.15,
    runSpeedMult: 1.15,
    basketRadiusMult: 1.1,
    comboDurationMult: 1.0,
    leafImmunity: false,
    textColor: '#D97706'
  }
};

const SIM_DEFAULTS = {
  comboWindow: 2.5,
  comboGrace: 1.25,
  comboStep: 20,
  comboMax: 200,
  firstSpawnDelay: 0.8,
  rampSeconds: 5,
  rampFactor: 1.55,
  magnetRange: 1.6
};

class HarvestSim {
  /**
   * @param {object} opts
   * @param {number} opts.playerId personagem escolhido
   * @param {number} opts.phases lista de fases (HARVEST_PHASES)
   * @param {function} opts.rng gerador de aleatorio, para os testes serem deterministas
   */
  constructor(opts = {}) {
    this._opts = opts;
    this._init();
  }

  _init() {
    const opts = this._opts;
    this.phases = opts.phases || [];
    this.rng = opts.rng || Math.random;
    this.world = Object.assign({}, HARVEST_WORLD);
    this.cfg = Object.assign({}, SIM_DEFAULTS);
    this.ability = BOY_ABILITIES[opts.playerId] || Object.values(BOY_ABILITIES)[0];
    this.playerId = opts.playerId || 3;

    this.player = {
      x: 0,
      y: this.world.groundY,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      facing: 0,
      grounded: true,
      state: 'idle',
      walkPhase: 0,
      turboCharge: 1,
      isTurbo: false,
      jumpBuffer: 0,
      jumpsUsed: 0,
      airTime: 0,
      collectTimer: 0,
      hurtTimer: 0,
      victoryTimer: 0,
      carryingBasket: false,
      basketFruit: 0
    };

    this.items = [];
    this.events = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = this.cfg.firstSpawnDelay;
    this.spawnedAny = false;
    this.phaseElapsed = 0;

    this.phaseIndex = 0;
    this.score = 0;
    this.coinsCollected = 0;
    this.guaranaCollected = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboGrace = 0;
    this.timeLeft = this.totalTime;
    this.isVictory = false;
    this.isGameOver = false;
    this.timeBonus = 0;
    this.frozen = false;
  }

  get phase() {
    return this.phases[this.phaseIndex] || null;
  }

  /** Aliases usados pela tela de vitoria, que e compartilhada com o 2D. */
  getCurrentPhase() {
    return this.phase;
  }

  get isFinished() {
    return this.isVictory || this.isGameOver;
  }

  get totalTime() {
    return this.phase ? this.phase.totalTime : 60;
  }

  get targetGuarana() {
    return this.phase ? this.phase.targetGuarana : 20;
  }

  get walkSpeed() {
    return this.world.walkSpeed * this.ability.walkSpeedMult;
  }

  get runSpeed() {
    return this.world.runSpeed * this.ability.runSpeedMult;
  }

  get basketRadius() {
    return this.world.basketRadius * this.ability.basketRadiusMult;
  }

  get comboWindow() {
    return this.cfg.comboWindow * this.ability.comboDurationMult;
  }

  /**
   * Onde a cesta fica. Ela e um ponto no espaco, entao pode ser comparada com
   * o item por distancia de verdade em vez de um circulo de tela.
   */
  getBasketCenter() {
    const p = this.player;
    const fx = Math.sin(p.facing);
    const fz = Math.cos(p.facing);
    const lift = p.carryingBasket ? this.world.basketHeight : this.world.basketHeight * 0.78;
    return {
      x: p.x + fx * this.world.basketForward,
      y: p.y + lift,
      z: p.z + fz * this.world.basketForward,
      radius: this.basketRadius
    };
  }

  /** Direcao desejada no chao, normalizada, a partir de dois eixos analogicos. */
  _intent(steerX, steerZ) {
    let ix = steerX;
    let iz = steerZ;
    const mag = Math.hypot(ix, iz);
    if (mag < 0.0001) return { x: 0, z: 0, mag: 0 };
    if (mag > 1) {
      ix /= mag;
      iz /= mag;
    }
    return { x: ix, z: iz, mag: Math.min(1, mag) };
  }

  _rateFor(current, target) {
    if (Math.abs(target) < Math.abs(current)) return this.world.decelRate;
    if (current !== 0 && target !== 0 && Math.sign(target) !== Math.sign(current)) return this.world.pivotRate;
    return this.world.accelRate;
  }

  _moveToward(current, target, maxDelta) {
    if (Math.abs(target - current) <= maxDelta) return target;
    return current + Math.sign(target - current) * maxDelta;
  }

  requestJump() {
    if (this.player.grounded) this.player.jumpBuffer = 0.14;
  }

  /**
   * @param {number} dt segundos
   * @param {object} cmd
   * @param {number} cmd.steerX -1..1 (esquerda/direita)
   * @param {number} cmd.steerZ -1..1 (frente/tras)
   * @param {string} cmd.command TURBO | FREAR | PARAR | ...
   */
  update(dt, cmd = {}) {
    if (dt <= 0) return;
    if (this.frozen) return;

    const wasGrounded = this.player.grounded;
    this._updateCombo(dt);
    this._updatePlayer(dt, cmd);
    this._updatePhase(dt);
    this._updateItems(dt);

    if (!wasGrounded && this.player.grounded) this._emit('land');
    if (this.timeLeft <= 0) this._finish(false);
  }

  _updatePlayer(dt, cmd) {
    const p = this.player;
    const w = this.world;
    const command = cmd.command || 'PARAR';

    const intent = this.frozen || command === 'PARAR' || command === 'FREAR'
      ? { x: 0, z: 0, mag: 0 }
      : this._intent(cmd.steerX || 0, cmd.steerZ || 0);

    const wantsTurbo = command === 'TURBO' && intent.mag > 0.05 && p.turboCharge > 0.02;
    p.isTurbo = wantsTurbo;
    p.turboCharge = Math.max(0, Math.min(1, p.turboCharge + (wantsTurbo ? -dt / w.turboDrain : dt / w.turboRefill)));

    const maxSpeed = wantsTurbo ? this.runSpeed : this.walkSpeed;
    const rate = (command === 'FREAR' ? w.brakeRate : this._rateFor(intent.mag, 1)) || w.accelRate;
    const step = rate * dt * (intent.mag > 0 ? intent.mag : 1);

    p.vx = this._moveToward(p.vx, intent.x * maxSpeed, step);
    p.vz = this._moveToward(p.vz, intent.z * maxSpeed, step);

    if (Math.hypot(p.vx, p.vz) < 0.05 && intent.mag === 0) {
      p.vx = 0;
      p.vz = 0;
    }

    // Pulo: buffer de alguns quadros, para o comando nao se perder entre polls.
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.jumpBuffer > 0 && p.grounded) {
      p.vy = w.jumpSpeed;
      p.grounded = false;
      p.jumpsUsed = 1;
      p.jumpBuffer = 0;
      p.airTime = 0;
      this._emit('jump');
    }

    p.vy -= w.gravity * dt;
    if (p.vy < -w.maxFallSpeed) p.vy = -w.maxFallSpeed;

    p.x += p.vx * dt;
    p.z += p.vz * dt;
    p.y += p.vy * dt;

    // Limites do terreno: ele bate na borda e perde velocidade, como no 2D.
    const wall = 0.3;
    if (p.x < w.minX) {
      p.x = w.minX;
      if (p.vx < 0) p.vx *= -wall;
    } else if (p.x > w.maxX) {
      p.x = w.maxX;
      if (p.vx > 0) p.vx *= -wall;
    }
    if (p.z < w.minZ) {
      p.z = w.minZ;
      if (p.vz < 0) p.vz *= -wall;
    } else if (p.z > w.maxZ) {
      p.z = w.maxZ;
      if (p.vz > 0) p.vz *= -wall;
    }

    if (p.y <= w.groundY) {
      p.y = w.groundY;
      p.vy = 0;
      p.grounded = true;
      p.jumpsUsed = 0;
    } else {
      p.grounded = false;
      p.airTime += dt;
    }

    const speed = Math.hypot(p.vx, p.vz);
    if (speed > 0.6) p.facing = Math.atan2(p.vx, p.vz);
    p.walkPhase += speed * dt * 1.35;

    if (p.collectTimer > 0) p.collectTimer = Math.max(0, p.collectTimer - dt);
    if (p.hurtTimer > 0) p.hurtTimer = Math.max(0, p.hurtTimer - dt);

    this._updatePlayerState(speed, maxSpeed);
  }

  _updatePlayerState(speed, maxSpeed) {
    const p = this.player;
    const ratio = Math.min(1, speed / Math.max(0.001, maxSpeed));
    let next;
    if (this.isVictory) {
      next = 'victory';
    } else if (p.hurtTimer > 0) {
      next = 'hurt';
    } else if (!p.grounded) {
      next = 'jump';
    } else if (p.collectTimer > 0 && ratio < 0.25) {
      next = 'collect';
    } else if (ratio > 0.06) {
      next = p.isTurbo && ratio > 0.6 ? 'run' : 'walk';
    } else {
      next = 'idle';
    }
    p.state = next;
    p.speedRatio = ratio;
  }

  _updateCombo(dt) {
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        if (this.combo > 1) this.comboGrace = this.cfg.comboGrace;
        else this.combo = 0;
      }
    } else if (this.comboGrace > 0) {
      this.comboGrace -= dt;
      if (this.comboGrace <= 0) this.combo = 0;
    }
  }

  _updatePhase(dt) {
    if (this.isVictory || this.isGameOver) return;
    const p = this.phase;
    if (!p) return;
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    this.phaseElapsed += dt;
    if (this.timeLeft <= 0) this._finish(false);
  }

  _finish(won) {
    if (this.isVictory || this.isGameOver) return;
    if (won) {
      this.isVictory = true;
      this.timeBonus = Math.max(0, Math.floor(this.timeLeft) * 50);
      this.score += this.timeBonus;
      this.player.victoryTimer = 1.4;
      this._emit('phaseVictory', { bonus: this.timeBonus });
    } else {
      this.isGameOver = true;
      this._emit('phaseOver');
    }
    this.frozen = true;
  }

  _spawn() {
    const p = this.phase;
    if (!p) return;
    const w = this.world;
    const rand = this.rng();

    // Persegue o menino em 1/3 dos spawns, como na versao 2D, agora no plano XZ.
    let x;
    let z;
    if (rand < 0.34) {
      const ang = this.rng() * Math.PI * 2;
      const dist = 1.5 + this.rng() * 4.5;
      x = this.player.x + Math.cos(ang) * dist;
      z = this.player.z + Math.sin(ang) * dist * 0.55;
    } else {
      x = w.minX + this.rng() * (w.maxX - w.minX);
      z = w.minZ + this.rng() * (w.maxZ - w.minZ);
    }
    x = Math.max(w.minX + 0.6, Math.min(w.maxX - 0.6, x));
    z = Math.max(w.minZ + 0.6, Math.min(w.maxZ - 0.6, z));

    const baseSpeed = p.minSpeed / 51 + this.rng() * (p.maxSpeed - p.minSpeed) / 51;

    let type = 'guarana';
    if (this.spawnedAny) {
      const r = this.rng();
      if (r < 0.65) type = 'guarana';
      else if (r < 0.82) type = 'moeda';
      else if (r < 0.94) type = 'folha';
      else type = 'estrela';
    }
    this.spawnedAny = true;

    const def = ITEM_TYPES[type];
    this.items.push({
      type,
      x,
      y: 9 + this.rng() * 2,
      z,
      baseX: x,
      baseZ: z,
      speed: baseSpeed * def.speedMult,
      radius: def.radius,
      spin: this.rng() * Math.PI * 2,
      spinRate: (this.rng() - 0.5) * 2.4,
      swayPhase: this.rng() * Math.PI * 2,
      swayRate: 1.4 + this.rng() * 1.6,
      swayAmount: 0.25 + this.rng() * 0.25,
      age: 0
    });
  }

  _updateItems(dt) {
    if (!this.isVictory && !this.isGameOver) {
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.nextSpawnDelay) {
        this.spawnTimer = 0;
        const p = this.phase;
        const ramp = this.phaseElapsed < this.cfg.rampSeconds ? this.cfg.rampFactor : 1;
        this.nextSpawnDelay = (p.spawnDelayMin + this.rng() * (p.spawnDelayMax - p.spawnDelayMin)) * ramp;
        this._spawn();
      }
    }

    const basket = this.getBasketCenter();
    const range = basket.radius * this.cfg.magnetRange;

    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.age += dt;
      it.y -= it.speed * dt;
      it.spin += it.spinRate * dt;

      const sway = Math.sin(it.age * it.swayRate + it.swayPhase) * it.swayAmount;

      // Assistencia de mira: so no plano do chao e so com o item acima da
      // cesta, para nao sugar um fruto que ja passou.
      if (it.y > basket.y) {
        const dx = basket.x - it.baseX;
        const dz = basket.z - it.baseZ;
        const d = Math.hypot(dx, dz);
        if (d < range) {
          const pull = (1 - d / range) * 3.4 * dt;
          it.baseX += Math.max(-pull, Math.min(pull, dx)) * 0.85;
          it.baseZ += Math.max(-pull, Math.min(pull, dz)) * 0.85;
        }
      }

      it.x = it.baseX + sway;
      it.z = it.baseZ;

      const d3 = Math.hypot(it.x - basket.x, it.y - basket.y, it.z - basket.z);
      if (d3 < it.radius + basket.radius) {
        this._collect(it);
        this.items.splice(i, 1);
        continue;
      }

      if (it.y <= this.world.groundY) {
        if (it.type === 'guarana' && this.combo > 1) {
          this._emit('comboLost', { x: it.x, y: 0, z: it.z });
          this.combo = 0;
          this.comboTimer = 0;
          this.comboGrace = 0;
        }
        this._emit('miss', { itemType: it.type, x: it.x, y: 0, z: it.z });
        this.items.splice(i, 1);
      }
    }
  }

  _collect(item) {
    const p = this.player;
    p.collectTimer = 0.24;

    const def = ITEM_TYPES[item.type];

    if (item.type === 'guarana') {
      // A cesta so entra com o primeiro guarana, que foi o que o usuario pediu.
      // Antes disso o menino coleta a mao e a cesta nao existe na cena.
      p.carryingBasket = true;
      p.basketFruit += 1;
      this.guaranaCollected++;
      const retomado = this.combo > 1 && this.comboTimer <= 0 && this.comboGrace > 0;
      this.combo++;
      this.comboTimer = this.comboWindow;
      this.comboGrace = 0;
      const points = def.points + Math.min(this.combo * this.cfg.comboStep, this.cfg.comboMax);
      this.score += points;
      this._emit('pickup', {
        itemType: item.type,
        points,
        combo: this.combo,
        retomado,
        x: item.x,
        y: item.y,
        z: item.z
      });
      if (this.guaranaCollected >= this.targetGuarana && !this.isVictory) this._finish(true);
      return;
    }

    if (item.type === 'folha') {
      p.hurtTimer = 0.4;
      if (this.ability.leafImmunity) {
        this.score = Math.max(0, this.score - 25);
        this._emit('leafSafe', { x: item.x, y: item.y, z: item.z });
      } else {
        this.score = Math.max(0, this.score - 50);
        this.combo = 0;
        this.comboTimer = 0;
        this.comboGrace = 0;
        this._emit('hurt', { x: item.x, y: item.y, z: item.z });
      }
      this._emit('pickup', { itemType: item.type, points: 0, combo: 0, x: item.x, y: item.y, z: item.z });
      return;
    }

    this.score += def.points;
    if (item.type === 'moeda') this.coinsCollected++;
    this._emit('pickup', { itemType: item.type, points: def.points, combo: this.combo, x: item.x, y: item.y, z: item.z });
    if (def.turbo) {
      p.turboCharge = Math.max(0, Math.min(1, p.turboCharge + def.turbo));
      this._emit('turboGain', { amount: def.turbo, x: item.x, y: item.y, z: item.z });
    }
  }

  /**
   * Coloca um evento na fila para o renderizador. O `type` do evento e o nome
   * (`pickup`, `jump`...), entao o tipo do item entra como `itemType`: se viesse
   * como `type` sobrescreveria o nome do proprio evento.
   */
  _emit(type, data = {}) {
    this.events.push(Object.assign({ type }, data));
  }

  /** O renderizador le os eventos e os limpa, como uma fila. */
  drainEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }

  /**
   * Zera a partida mantendo a fase atual, como o reiniciar do jogo 2D fazia.
   * O construtor nao pode ser chamado aqui: ele comecaria na fase 1.
   */
  reset() {
    const idx = this.phaseIndex;
    this._init();
    this.phaseIndex = Math.max(0, Math.min(idx, this.phases.length - 1));
  }

  advancePhase() {
    if (this.phaseIndex < this.phases.length - 1) this.phaseIndex++;
    this.reset();
  }

  hasNextPhase() {
    return this.phaseIndex < this.phases.length - 1;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { HarvestSim, HARVEST_WORLD, ITEM_TYPES, BOY_ABILITIES };
}

/**
 * Personagem Coletor de Guaraná (Harvester)
 * Movimento com aceleração/desaceleração assimétricas, troca de animação com
 * cross-fade, ciclo de caminhada sincronizado pela distância percorrida,
 * medidor de turbo e sprite sheet com fallback automático.
 */
const CHARACTER_ABILITIES = {
  2: {
    id: 'harvest_speed',
    name: 'Ana (Guaraná)',
    badge: '💨 Coleta Veloz',
    description: 'Colhe mais rápido (maior velocidade de base)',
    speedMult: 1.12,
    turboSpeedMult: 1.0,
    basketRadiusMult: 1.0,
    comboDurationMult: 1.0,
    leafImmunity: false,
    auraColor: 'rgba(16, 185, 129, 0.75)',
    textColor: '#10B981'
  },
  3: {
    id: 'forest_resilience',
    name: 'Lucas (CETAM)',
    badge: '🛡️ Combo Salvo',
    description: 'Imune ao reset de combo ao atingir folhas e galhos',
    speedMult: 1.0,
    turboSpeedMult: 1.0,
    basketRadiusMult: 1.0,
    comboDurationMult: 1.0,
    leafImmunity: true,
    auraColor: 'rgba(59, 130, 246, 0.75)',
    textColor: '#3B82F6'
  },
  4: {
    id: 'combo_master',
    name: 'Mayara (Amazônia)',
    badge: '🔥 Combo 2x',
    description: 'Tempo de retenção de combo estendido (5 segundos)',
    speedMult: 1.0,
    turboSpeedMult: 1.0,
    basketRadiusMult: 1.0,
    comboDurationMult: 2.0,
    leafImmunity: false,
    auraColor: 'rgba(236, 72, 153, 0.75)',
    textColor: '#EC4899'
  }
};

const STEER_DEADZONE = 0.06;
const TURBO_DRAIN = 2.6;
const TURBO_REFILL = 5.5;
const FADE_DURATION = 0.11;

function moveToward(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

class GuaranaHarvester {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.groundY = 445;
    this.x = canvasWidth / 2;
    this.y = this.groundY;
    this.vx = 0;

    this.baseSpeed = 420;
    this.baseTurboSpeed = 700;
    this.baseHitboxRadius = 46;

    this.speed = this.baseSpeed;
    this.turboSpeed = this.baseTurboSpeed;
    this.hitboxRadius = this.baseHitboxRadius;

    this.accelRate = 2300;
    this.decelRate = 3100;
    this.brakeRate = 4200;
    this.pivotRate = 4600;

    this.facing = 1;
    this.state = 'idle';
    this.collectTimer = 0;
    this.popTimer = 0;
    this.hurtTimer = 0;
    this.isTurbo = false;
    this.isVictory = false;
    this.turboCharge = 1;

    this.walkPhase = 0;
    this.wallBump = 0;
    this.dustTimer = 0;

    this.drawHeight = 135;

    this.currentPlayer = 3;
    this.playerNames = {
      2: "Ana (Guaraná)",
      3: "Lucas (CETAM)",
      4: "Mayara (Amazônia)"
    };

    this.spriteSets = {
      2: new CharacterSpriteSet(2),
      3: new CharacterSpriteSet(3),
      4: new CharacterSpriteSet(4)
    };

    this.animState = 'idle';
    this.animBlend = 1;
    this.prevImage = null;
    this.prevMirrored = false;
    this.activeSet = null;
    this.activeMirror = false;
    this.trail = [];

    this.setPlayer(3);
  }

  setPlayer(id) {
    if (![2, 3, 4].includes(id)) id = 3;
    this.currentPlayer = id;
    this.ability = CHARACTER_ABILITIES[id];
    this.speed = this.baseSpeed * this.ability.speedMult;
    this.turboSpeed = this.baseTurboSpeed * this.ability.turboSpeedMult;
    this.hitboxRadius = this.baseHitboxRadius * this.ability.basketRadiusMult;
    this._setAnim('idle', true);
  }

  get sprites() {
    return this.spriteSets[this.currentPlayer];
  }

  _resolveName(name) {
    const sets = this.sprites ? this.sprites.sets : {};
    if (sets[name] && sets[name].ready) return name;
    if (sets.idle && sets.idle.ready) return 'idle';
    return name;
  }

  _setAnim(name, force = false) {
    const nextSet = this._resolveSet(name);
    const changed = this.animState !== name || nextSet !== this.activeSet;
    if (!changed && !force) return;

    if (force) {
      this.prevImage = null;
    } else if (this.activeSet && this.activeSet.current) {
      this.prevImage = this.activeSet.current;
      this.prevMirrored = this.activeMirror;
    }

    this.animState = name;
    this.activeSet = nextSet;
    this.activeMirror = this._needsMirror(name);
    this.animBlend = 0;
    if (nextSet) nextSet.reset();
  }

  _resolveSet(name) {
    if (!this.sprites) return null;
    if (this.facing === -1 && (name === 'walk' || name === 'run')) {
      const left = this.sprites.sets[name === 'run' ? 'runLeft' : 'walkLeft'];
      if (left && left.ready && left.isAnimated) return left;
    }
    return this.sprites.get(name);
  }

  _needsMirror(name) {
    if (this.facing !== -1) return false;
    if (name === 'walk' || name === 'run') {
      const left = this.sprites ? this.sprites.sets[name === 'run' ? 'runLeft' : 'walkLeft'] : null;
      if (left && left.ready && left.isAnimated) return false;
    }
    return true;
  }

  triggerCollect() {
    this.collectTimer = 0.24;
    this.popTimer = 0.26;
  }

  triggerCollectHappy() {
    this.popTimer = 0.42;
  }

  triggerHurt() {
    this.hurtTimer = 0.4;
  }

  update(dt, command, steerVal, isVictory = false, particles = null) {
    this.isVictory = isVictory;

    let intent = 0;
    if (!isVictory) {
      if (Math.abs(steerVal) > STEER_DEADZONE) {
        intent = steerVal;
      } else if (command === 'ESQUERDA') {
        intent = -1;
      } else if (command === 'DIREITA') {
        intent = 1;
      }
      if (command === 'PARAR' || command === 'FREAR') intent = 0;
    }

    const wantsTurbo = (command === 'TURBO') && !isVictory && this.turboCharge > 0.02 && intent !== 0;
    if (wantsTurbo) {
      this.turboCharge = Math.max(0, this.turboCharge - dt / TURBO_DRAIN);
    } else {
      this.turboCharge = Math.min(1, this.turboCharge + dt / TURBO_REFILL);
    }
    this.isTurbo = wantsTurbo;

    const maxSpeed = wantsTurbo ? this.turboSpeed : this.speed;
    const target = intent * maxSpeed;

    const braking = (command === 'FREAR') && !isVictory;
    const reversing = (this.vx !== 0) && (target !== 0) && (Math.sign(target) !== Math.sign(this.vx));
    let rate;
    if (braking) {
      rate = this.brakeRate;
    } else if (reversing) {
      rate = this.pivotRate;
    } else if (Math.abs(target) > Math.abs(this.vx)) {
      rate = this.accelRate;
    } else {
      rate = this.decelRate;
    }
    this.vx = moveToward(this.vx, target, rate * dt);

    if (Math.abs(this.vx) < 4 && target === 0) this.vx = 0;

    this.x += this.vx * dt;

    const minX = 72;
    const maxX = this.canvasWidth - 72;
    this.wallBump = Math.max(0, this.wallBump - dt * 4);
    if (this.x < minX) {
      this.x = minX;
      this.vx = Math.max(0, -this.vx * 0.3);
      this.wallBump = 1;
    } else if (this.x > maxX) {
      this.x = maxX;
      this.vx = Math.min(0, -this.vx * 0.3);
      this.wallBump = 1;
    }

    if (this.vx > 12) this.facing = 1;
    else if (this.vx < -12) this.facing = -1;

    this.walkPhase += Math.abs(this.vx) * dt * 0.021;

    if (this.collectTimer > 0) this.collectTimer -= dt;
    if (this.popTimer > 0) this.popTimer -= dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    const speedRatio = Math.min(1, Math.abs(this.vx) / this.turboSpeed);

    let next = 'idle';
    if (isVictory) {
      next = 'victory';
    } else if (this.hurtTimer > 0) {
      next = 'hurt';
    } else if (this.collectTimer > 0 && speedRatio < 0.22) {
      next = 'collect';
    } else if (speedRatio > 0.06) {
      next = (wantsTurbo && speedRatio > 0.66) ? 'run' : 'walk';
    }
    next = this._resolveName(next);
    this.state = next;

    const target_ = this._resolveSet(next);
    if (target_ && target_.isAnimated) {
      let animFps = ANIM_DEFAULT_FPS.walk;
      if (next === 'walk' || next === 'walkLeft') animFps = 8 + 10 * speedRatio;
      else if (next === 'run' || next === 'runLeft') animFps = 11 + 8 * speedRatio;
      target_.setFps(animFps);
      if (next !== 'collect' && next !== 'victory' && next !== 'hurt') target_.update(dt);
    }
    this._setAnim(next);

    if (this.animBlend < 1) this.animBlend = Math.min(1, this.animBlend + dt / FADE_DURATION);
    if (this.animBlend >= 1) this.prevImage = null;

    if (particles && Math.abs(this.vx) > 130) {
      this.dustTimer -= dt;
      if (this.dustTimer <= 0) {
        this.dustTimer = wantsTurbo ? 0.03 : 0.07;
        particles.emitDust(this.x - this.facing * 16, this.groundY + 2, this.facing, wantsTurbo);
      }
    }

    if (wantsTurbo && Math.abs(this.vx) > 60) {
      this.trail.push({ x: this.x, y: this.y, facing: this.facing, alpha: 0.5 });
      if (this.trail.length > 10) this.trail.shift();
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= dt * 3.2;
      this.trail[i].x -= this.facing * 40 * dt;
      if (this.trail[i].alpha <= 0) this.trail.splice(i, 1);
    }
  }

  _drawSprite(ctx, img, mirrored, alpha, bobY, squash, posX) {
    if (!img || !img.complete || !img.naturalWidth) return;
    const aspect = img.naturalWidth / img.naturalHeight;
    const targetH = this.drawHeight * squash.scaleY;
    const targetW = targetH * aspect;
    const px = posX === undefined ? this.x : posX;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px, this.y + bobY + squash.offsetY);
    if (mirrored) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, -targetW / 2, -targetH, targetW, targetH);
    ctx.restore();
  }

  get squash() {
    const speedRatio = Math.min(1, Math.abs(this.vx) / this.turboSpeed);
    const pop = this.popTimer > 0 ? Math.sin((this.popTimer / 0.26) * Math.PI) * 0.10 : 0;
    const stretch = 0.05 * speedRatio + pop;
    return { scaleY: 1 + stretch, scaleX: 1 - stretch * 0.75, offsetY: 0 };
  }

  draw(ctx) {
    const set = this._resolveSet(this.animState);
    const img = set ? set.current : null;
    const moving = this.animState === 'walk' || this.animState === 'run';
    const bobAmp = moving ? (3 + 5 * Math.min(1, Math.abs(this.vx) / this.turboSpeed)) : 1.5;
    const bobY = Math.sin(this.walkPhase * 2) * bobAmp;
    const squash = this.squash;

    ctx.save();
    ctx.fillStyle = 'rgba(20, 10, 5, 0.45)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 4, 30 * (1 - 0.08 * Math.abs(this.vx) / this.turboSpeed), 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    for (const ghost of this.trail) {
      this._drawSprite(ctx, img, this._needsMirror(this.animState), ghost.alpha * 0.3, bobY * 0.5, { scaleX: 1, scaleY: 1, offsetY: 0 }, ghost.x);
    }

    if (this.animBlend < 1 && this.prevImage) {
      this._drawSprite(ctx, this.prevImage, this.prevMirrored, 1 - this.animBlend, bobY, squash);
    }
    this._drawSprite(ctx, img, this._needsMirror(this.animState), 1, bobY, squash);

    if (this.isTurbo) {
      ctx.save();
      const h = this.drawHeight * squash.scaleY;
      const w = h * 0.62;
      ctx.strokeStyle = 'rgba(255, 170, 0, 0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.x - w / 2 - 2, this.y + bobY - h - 2, w + 4, h + 4);
      ctx.restore();
    }

    if (this.hurtTimer > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.55, this.hurtTimer * 1.2);
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(this.x - 46, this.y - this.drawHeight - 12, 92, this.drawHeight + 16);
      ctx.restore();
    }

    this._drawBasketRing(ctx);
    this._drawTurboGauge(ctx);
    this._drawLabel(ctx, bobY);
  }

  _drawBasketRing(ctx) {
    const basket = this.getBasketCenter();
    const mult = this.ability ? this.ability.basketRadiusMult : 1;
    ctx.save();
    ctx.beginPath();
    ctx.arc(basket.x, basket.y, basket.radius, 0, Math.PI * 2);
    ctx.strokeStyle = mult > 1 ? 'rgba(16, 185, 129, 0.45)' : 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = mult > 1 ? 2.4 : 1.6;
    if (mult > 1) ctx.setLineDash([5, 5]);
    ctx.stroke();
    ctx.restore();
  }

  _drawTurboGauge(ctx) {
    if (!this.isTurbo && this.turboCharge >= 0.999) return;
    const w = 58;
    const h = 5;
    const x = this.x - w / 2;
    const y = this.y + 12;
    ctx.save();
    ctx.fillStyle = 'rgba(3, 12, 24, 0.75)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 3);
    else ctx.rect(x - 1, y - 1, w + 2, h + 2);
    ctx.fill();

    const grad = ctx.createLinearGradient(x, 0, x + w, 0);
    if (this.isTurbo) {
      grad.addColorStop(0, '#facc15');
      grad.addColorStop(1, '#f97316');
    } else {
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, '#00f090');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w * this.turboCharge, h);

    if (this.isTurbo) {
      ctx.globalAlpha = 0.4 + Math.abs(Math.sin(performance.now() / 90)) * 0.5;
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    }
    ctx.restore();
  }

  _drawLabel(ctx, bobY) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 12px "Inter", sans-serif';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    const nameY = this.y + bobY - this.drawHeight - 18;
    ctx.strokeText(this.playerNames[this.currentPlayer], this.x, nameY);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(this.playerNames[this.currentPlayer], this.x, nameY);

    if (this.ability) {
      const badgeY = nameY + 14;
      ctx.font = '700 9.5px "Inter", sans-serif';
      const badgeText = this.ability.badge;
      const textWidth = ctx.measureText(badgeText).width;
      const padX = 6;
      const badgeW = textWidth + padX * 2;
      const badgeH = 14;
      const rx = this.x - badgeW / 2;
      const ry = badgeY - 11;

      ctx.fillStyle = 'rgba(7, 18, 30, 0.88)';
      ctx.strokeStyle = this.ability.textColor;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(rx, ry, badgeW, badgeH, 7);
      else ctx.rect(rx, ry, badgeW, badgeH);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = this.ability.textColor;
      ctx.fillText(badgeText, this.x, badgeY);
    }
    ctx.restore();
  }

  getBasketCenter() {
    const offset = this.state === 'coletando' || this.state === 'collect' ? 24 : 15;
    return {
      x: this.x + (this.facing === 1 ? offset : -offset),
      y: this.y - this.drawHeight * 0.42,
      radius: this.hitboxRadius
    };
  }
}

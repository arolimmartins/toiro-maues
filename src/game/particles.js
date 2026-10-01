/**
 * Sistema de partículas para fumaça, poeira, chamas de nitro e faíscas
 * Toda a integração é independente de framerate (delta time em segundos).
 */
class Particle {
  constructor(x, y, vx, vy, color, radius, decay, kind = 'smoke', life = 1) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.radius = radius;
    this.decay = decay;
    this.kind = kind;
    this.life = life;
    this.maxLife = life;
    this.gravity = kind === 'dust' ? -18 : (kind === 'spark' ? 90 : 40);
  }

  update(dt) {
    this.x += this.vx * dt * 60;
    this.y += this.vy * dt * 60;
    this.vy += this.gravity * dt;
    this.vx *= 1 - 1.6 * dt;
    this.radius = Math.max(0, this.radius - this.decay * dt * 60);
    this.life -= dt;
    return this.life > 0 && this.radius > 0.4;
  }

  draw(ctx) {
    const t = Math.max(0, Math.min(1, this.life / this.maxLife));
    ctx.save();
    ctx.globalAlpha = t * t;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emitSmoke(x, y, count = 2) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(
        x, y,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2 - 0.3,
        '#cbd5e1', 5 + Math.random() * 3, 0.18, 'smoke', 0.7
      ));
    }
  }

  emitDust(x, y, facing = 1, turbo = false) {
    const colors = turbo ? ['#fde68a', '#fbbf24', '#fb923c'] : ['#8b6f4e', '#a98867', '#6b5540'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    this.particles.push(new Particle(
      x, y,
      -facing * (0.6 + Math.random() * (turbo ? 2.2 : 1.1)),
      -Math.random() * 0.5,
      color,
      3 + Math.random() * 3.5,
      0.12,
      'dust',
      0.35 + Math.random() * 0.25
    ));
  }

  emitNitro(x, y, angle, count = 3) {
    for (let i = 0; i < count; i++) {
      const speed = 4 + Math.random() * 3;
      const spread = (Math.random() - 0.5) * 0.4;
      const colors = ['#00d4ff', '#38bdf8', '#60a5fa', '#f59e0b'];
      this.particles.push(new Particle(
        x, y,
        -Math.cos(angle + spread) * speed,
        -Math.sin(angle + spread) * speed,
        colors[Math.floor(Math.random() * colors.length)],
        4 + Math.random() * 3, 0.28, 'nitro', 0.45
      ));
    }
  }

  emitSparks(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const spd = 2 + Math.random() * 4;
      const ang = Math.random() * Math.PI * 2;
      const colors = ['#facc15', '#f97316', '#ffffff'];
      this.particles.push(new Particle(
        x, y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd,
        colors[Math.floor(Math.random() * colors.length)],
        2.5 + Math.random() * 2, 0.25, 'spark', 0.5
      ));
    }
  }

  emitCoin(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const spd = 1.5 + Math.random() * 3;
      const ang = Math.random() * Math.PI * 2;
      const colors = ['#facc15', '#fef08a', '#eab308'];
      this.particles.push(new Particle(
        x, y,
        Math.cos(ang) * spd,
        Math.sin(ang) * spd - 1.2,
        colors[Math.floor(Math.random() * colors.length)],
        3 + Math.random() * 2, 0.15, 'coin', 0.6
      ));
    }
  }

  emitRing(x, y, color, count = 14, speed = 4) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.2;
      this.particles.push(new Particle(
        x, y,
        Math.cos(ang) * speed,
        Math.sin(ang) * speed,
        color, 3 + Math.random() * 2, 0.2, 'ring', 0.4
      ));
    }
  }

  emitCoinPickup(x, y) {
    this.emitCoin(x, y, 6);
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (!this.particles[i].update(dt)) this.particles.splice(i, 1);
    }
    if (this.particles.length > 260) {
      this.particles = this.particles.slice(this.particles.length - 260);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      p.draw(ctx);
    }
  }
}

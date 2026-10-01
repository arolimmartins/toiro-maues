/**
 * Motor Principal do Jogo (GameEngine)
 * Orquesta a narrativa de abertura, a Colheita do Guaraná, o Harvester,
 * queda de frutos, áudio, efeitos, tremor de tela e telemetria.
 */
class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.width = canvas.width;
    this.height = canvas.height;

    this.sound = new SoundManager();
    this.particles = new ParticleSystem();

    // Personagem e Cena de Colheita do Guaraná
    this.harvester = new GuaranaHarvester(this.width, this.height);
    this.harvestScene = new HarvestScene(this.width, this.height, this.sound, this.particles);
    this.harvestScene.onShake = (amount) => {
      this.shakeMag = Math.max(this.shakeMag, amount);
      this.shakeTime = 0.22;
    };

    // Narrativa de abertura
    this.mode = 'story';
    this.story = new StoryManager(this.width, this.height, this.sound);
    this.story.start();

    this.isPaused = false;
    this.isFinished = false;
    this.isRunning = true;

    this.lastFrameTime = performance.now();
    this.fps = 60;

    this.shakeMag = 0;
    this.shakeTime = 0;
    this.shakeSeed = 0;

    this.currentCommand = 'PARAR';
    this.currentSteer = 0.0;

    this.dom = {
      spdEl: document.getElementById('speedValue'),
      spdBar: document.getElementById('speedBarFill'),
      hudLap: document.getElementById('hudLap'),
      hudTime: document.getElementById('hudTime'),
      hudCoins: document.getElementById('hudCoins'),
      hudScore: document.getElementById('hudScore'),
      pillLap: document.getElementById('pillLap'),
      pillTime: document.getElementById('pillTime'),
      pillSpeed: document.getElementById('pillSpeed'),
      pillScore: document.getElementById('pillScore'),
      phaseTitle: document.getElementById('phaseTitle'),
      timeBonusRow: document.getElementById('timeBonusRow'),
      finalTimeBonus: document.getElementById('finalTimeBonus'),
      nextPhaseBtn: document.getElementById('nextPhaseBtn'),
      restartVictoryBtn: document.getElementById('restartVictoryBtn')
    };

    this._lastSpeed = null;
    this._lastMeta = null;
    this._lastTime = null;
    this._lastScore = null;
    this._lastCoins = null;
    this._lastPhaseName = null;
  }

  get inStory() {
    return this.mode === 'story' && this.story.active;
  }

  beginRun() {
    this.mode = 'game';
    this.isFinished = false;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this._showFirstRunHint();
  }

  advanceStory() {
    if (!this.inStory) return;
    this.story.advance();
    if (!this.story.active) this.beginRun();
  }

  skipStory() {
    if (!this.inStory) return;
    this.story.skip();
    this.beginRun();
  }

  startFromMenu() {
    if (this.inStory) {
      this.skipStory();
      return;
    }
    this.isPaused = false;
    this.isFinished = false;
    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');
    this._showFirstRunHint();
  }

  _showFirstRunHint() {
    let seen = false;
    try {
      seen = localStorage.getItem('warana_hint_seen') === '1';
    } catch (e) {
      seen = false;
    }
    if (seen) return;
    try {
      localStorage.setItem('warana_hint_seen', '1');
    } catch (e) {
      return;
    }
    const el = document.getElementById('gameToast');
    if (!el) return;
    el.textContent = 'A / D ou setas para andar  •  W acelera  •  S freia  •  V turbo  •  P pausa';
    el.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('show'), 6000);
  }

  _resetHarvester() {
    this.harvester.x = this.width / 2;
    this.harvester.vx = 0;
    this.harvester.facing = 1;
    this.harvester.turboCharge = 1;
    this.harvester.trail.length = 0;
  }

  restart() {
    if (this.mode === 'story') {
      this.story.restart();
      return;
    }
    this.harvestScene.reset();
    this._resetHarvester();
    this.isFinished = false;
    this.isPaused = false;
    this.lastFrameTime = performance.now();

    const pauseOverlay = document.getElementById('pauseOverlay');
    if (pauseOverlay) pauseOverlay.classList.add('hidden');

    const victoryOverlay = document.getElementById('victoryOverlay');
    if (victoryOverlay) victoryOverlay.classList.add('hidden');

    this._lastMeta = null;
    this._lastTime = null;
    this._lastScore = null;
  }

  nextPhase() {
    this.harvestScene.advancePhase();
    this._resetHarvester();
    this.isFinished = false;
    this.isPaused = false;
    this.lastFrameTime = performance.now();

    const victoryOverlay = document.getElementById('victoryOverlay');
    if (victoryOverlay) victoryOverlay.classList.add('hidden');

    this._lastMeta = null;
    this._lastTime = null;
    this._lastScore = null;
    this._lastPhaseName = null;
  }

  setPlayer(id) {
    this.harvester.setPlayer(id);
    this.sound.playClick();
    if (this.harvestScene && this.harvester && this.harvester.ability) {
      this.harvestScene.addFloatingText(
        this.harvester.ability.badge,
        this.harvester.x,
        this.harvester.y - 110,
        this.harvester.ability.textColor
      );
    }
  }

  togglePause() {
    if (this.mode === 'story') return;
    this.isPaused = !this.isPaused;
    const overlay = document.getElementById('pauseOverlay');
    if (overlay) {
      if (this.isPaused) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
    this.lastFrameTime = performance.now();
  }

  update(command, steerVal) {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    if (this.mode === 'story') {
      this.story.update(dt);
      if (!this.story.active) this.beginRun();
      return;
    }

    if (this.isPaused || this.isFinished) return;

    this.currentCommand = command;
    this.currentSteer = steerVal;

    this.harvester.update(dt, command, steerVal, this.harvestScene.isVictory, this.particles);
    this.harvestScene.update(dt, this.harvester);
    this.particles.update(dt);

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      if (this.shakeTime <= 0) this.shakeMag = 0;
    }

    if ((this.harvestScene.isVictory || this.harvestScene.isGameOver) && !this.isFinished) {
      this.isFinished = true;
      this._showVictoryScreen();
    }
  }

  /**
   * Monta a tela de vitoria/derrota.
   *
   * Le de `fonte` para o jogo 2D e para o 3D poderem usar a mesma tela sem
   * duplicar dez linhas de DOM. Os dois objetos expoem os mesmos nomes
   * (score, timeLeft, guaranaCollected, isVictory, timeBonus, getCurrentPhase,
   * hasNextPhase), entao a troca e so de onde os numeros vem.
   */
  _showVictoryScreen(fonte) {
    const r = fonte || this.harvestScene;
    const overlay = document.getElementById('victoryOverlay');
    if (!overlay) return;

    const finalScoreEl = document.getElementById('finalScore');
    if (finalScoreEl) finalScoreEl.textContent = r.score;

    const finalBestLapEl = document.getElementById('finalBestLap');
    if (finalBestLapEl) {
      const minutes = Math.floor(r.timeLeft / 60);
      const seconds = Math.floor(r.timeLeft % 60);
      finalBestLapEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    const finalCoinsEl = document.getElementById('finalCoins');
    if (finalCoinsEl) finalCoinsEl.textContent = r.guaranaCollected;

    if (this.dom.timeBonusRow && this.dom.finalTimeBonus) {
      if (r.isVictory && r.timeBonus > 0) {
        this.dom.timeBonusRow.style.display = 'block';
        this.dom.finalTimeBonus.textContent = `+${r.timeBonus} pts (${Math.floor(r.timeLeft)}s)`;
      } else {
        this.dom.timeBonusRow.style.display = 'none';
      }
    }

    const titleEl = overlay.querySelector('h2');
    const currentPhase = r.getCurrentPhase();
    const hasNext = r.hasNextPhase();

    if (r.isVictory) {
      if (hasNext) {
        const nextPhase = HARVEST_PHASES[currentPhase.id];
        const nextName = nextPhase ? nextPhase.shortTitle : `Fase ${currentPhase.id + 1}`;
        if (titleEl) titleEl.textContent = `🏆 ${currentPhase.name} CONCLUÍDA!`;
        if (this.dom.nextPhaseBtn) {
          this.dom.nextPhaseBtn.style.display = 'inline-flex';
          this.dom.nextPhaseBtn.textContent = `Avançar para ${nextName} ▶`;
        }
        if (this.dom.restartVictoryBtn) {
          this.dom.restartVictoryBtn.textContent = `Repetir Fase ${currentPhase.id} [ R ]`;
        }
      } else {
        if (titleEl) titleEl.textContent = '🌟 LENDÁRIO MESTRE DA AMAZÔNIA! 🌟';
        if (this.dom.nextPhaseBtn) {
          this.dom.nextPhaseBtn.style.display = 'none';
        }
        if (this.dom.restartVictoryBtn) {
          this.dom.restartVictoryBtn.textContent = 'Jogar Novamente desde o Início [ R ]';
        }
      }
    } else {
      if (titleEl) titleEl.textContent = '⏱️ TEMPO ESGOTADO!';
      if (this.dom.nextPhaseBtn) {
        this.dom.nextPhaseBtn.style.display = 'none';
      }
      if (this.dom.restartVictoryBtn) {
        this.dom.restartVictoryBtn.textContent = `Tentar Novamente Fase ${currentPhase.id} [ R ]`;
      }
    }

    overlay.classList.remove('hidden');
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    if (this.mode === 'story') {
      this.story.draw(ctx);
      return;
    }

    let ox = 0;
    let oy = 0;
    if (this.shakeMag > 0.2) {
      this.shakeSeed += 1;
      const decay = this.shakeTime > 0 ? this.shakeTime / 0.22 : 0;
      const mag = this.shakeMag * Math.max(0, decay);
      ox = (Math.sin(this.shakeSeed * 12.9898) * 43758.5453 % 1) * mag;
      oy = (Math.sin(this.shakeSeed * 78.233) * 12345.6789 % 1) * mag;
    }

    ctx.save();
    ctx.translate(ox, oy);
    this.harvestScene.draw(ctx);
    this.harvester.draw(ctx);
    this.particles.draw(ctx);
    ctx.restore();
  }

  syncTelemetry() {
    const speedFormatted = Math.abs(Math.round(this.harvester.vx * 0.15));

    const minutes = Math.floor(this.harvestScene.timeLeft / 60);
    const seconds = Math.floor(this.harvestScene.timeLeft % 60);
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const metaStr = `${this.harvestScene.guaranaCollected} / ${this.harvestScene.targetGuarana}`;

    if (this._lastSpeed !== speedFormatted) {
      this._lastSpeed = speedFormatted;
      if (this.dom.spdEl) this.dom.spdEl.textContent = speedFormatted;
      if (this.dom.pillSpeed) this.dom.pillSpeed.textContent = `${speedFormatted} km/h`;
      if (this.dom.spdBar) {
        const pct = Math.min(100, (Math.abs(this.harvester.vx) / this.harvester.turboSpeed) * 100);
        this.dom.spdBar.style.width = `${pct}%`;
        this.dom.spdBar.style.background = this.harvester.isTurbo
          ? 'linear-gradient(90deg, #ff781f, #facc15)'
          : 'linear-gradient(90deg, #10B981, #34D399)';
      }
    }

    if (this._lastMeta !== metaStr) {
      this._lastMeta = metaStr;
      if (this.dom.hudLap) this.dom.hudLap.textContent = metaStr;
      if (this.dom.pillLap) this.dom.pillLap.textContent = metaStr;
    }

    if (this._lastTime !== timeStr) {
      this._lastTime = timeStr;
      if (this.dom.hudTime) this.dom.hudTime.textContent = timeStr;
      if (this.dom.pillTime) this.dom.pillTime.textContent = timeStr;
    }

    if (this._lastCoins !== this.harvestScene.coinsCollected) {
      this._lastCoins = this.harvestScene.coinsCollected;
      if (this.dom.hudCoins) this.dom.hudCoins.textContent = this.harvestScene.coinsCollected;
    }

    if (this._lastScore !== this.harvestScene.score) {
      this._lastScore = this.harvestScene.score;
      if (this.dom.hudScore) this.dom.hudScore.textContent = this.harvestScene.score;
      if (this.dom.pillScore) this.dom.pillScore.textContent = this.harvestScene.score;
    }

    const currentPhase = this.harvestScene.getCurrentPhase();
    if (this._lastPhaseName !== currentPhase.name) {
      this._lastPhaseName = currentPhase.name;
      if (this.dom.phaseTitle) this.dom.phaseTitle.textContent = currentPhase.name;
    }
  }
}

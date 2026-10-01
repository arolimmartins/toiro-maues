/**
 * Configuração Oficial das 9 Fases da Colheita Amazônica (CETAM)
 * Cada fase possui seu cenário temático exclusivo, lema inspirador e dificuldade calibrada.
 */
const HARVEST_PHASES = [
  {
    id: 1,
    name: 'FASE 1: FLORESTA AMAZÔNICA',
    shortTitle: 'Fase 1 — Floresta Amazônica',
    motto: 'O coração da nossa terra! 🍃',
    bg: 'assets/backgrounds/cenario_1.png',
    targetGuarana: 20,
    totalTime: 60.0,
    minSpeed: 130,
    maxSpeed: 210,
    spawnDelayMin: 0.70,
    spawnDelayMax: 0.95,
    desc: 'Colheita inicial sob as copas das árvores nativas de guaraná!'
  },
  {
    id: 2,
    name: 'FASE 2: VILA RIBEIRINHA',
    shortTitle: 'Fase 2 — Vila Ribeirinha',
    motto: 'Tradição que alimenta! 🍃',
    bg: 'assets/backgrounds/cenario_2.png',
    targetGuarana: 25,
    totalTime: 60.0,
    minSpeed: 150,
    maxSpeed: 230,
    spawnDelayMin: 0.65,
    spawnDelayMax: 0.90,
    desc: 'Colheita tradicional entre as palafitas e margens dos rios!'
  },
  {
    id: 3,
    name: 'FASE 3: CACHOEIRA DO GUAPORÉ',
    shortTitle: 'Fase 3 — Cachoeira do GuaporÉ',
    motto: 'Energia que vem da natureza! 🍃',
    bg: 'assets/backgrounds/cenario_3.png',
    targetGuarana: 30,
    totalTime: 60.0,
    minSpeed: 170,
    maxSpeed: 260,
    spawnDelayMin: 0.60,
    spawnDelayMax: 0.85,
    desc: 'Sinta a força revigorante das quedas d’água ao entardecer!'
  },
  {
    id: 4,
    name: 'FASE 4: PLANTIO SUSTENTÁVEL',
    shortTitle: 'Fase 4 — Plantio Sustentável',
    motto: 'Hoje planta, amanhã colhe! 🍃',
    bg: 'assets/backgrounds/cenario_4.png',
    targetGuarana: 35,
    totalTime: 60.0,
    minSpeed: 190,
    maxSpeed: 290,
    spawnDelayMin: 0.55,
    spawnDelayMax: 0.80,
    desc: 'Grande conclusão da colheita agroecológica sustentável!'
  },
  {
    id: 5,
    name: 'FASE 5: ALDEIA SAGRADA SATERÉ-MAWÉ',
    shortTitle: 'Fase 5 — Aldeia Sateré-Mawé',
    motto: 'Berço e sabedoria ancestral do guaraná! 🍃',
    bg: 'assets/backgrounds/cenario_5.png',
    targetGuarana: 40,
    totalTime: 60.0,
    minSpeed: 210,
    maxSpeed: 310,
    spawnDelayMin: 0.50,
    spawnDelayMax: 0.75,
    desc: 'Colheita sagrada guiada pelas tradições milenares do guaraná!'
  },
  {
    id: 6,
    name: 'FASE 6: FESTIVAL DO SOL AMAZÔNICO',
    shortTitle: 'Fase 6 — Festival do Sol',
    motto: 'Brilho e força da Amazônia! ☀️',
    bg: 'assets/backgrounds/cenario_6.png',
    targetGuarana: 45,
    totalTime: 60.0,
    minSpeed: 230,
    maxSpeed: 330,
    spawnDelayMin: 0.45,
    spawnDelayMax: 0.70,
    desc: 'Celebração da luz e calor que maturam os melhores cachos!'
  },
  {
    id: 7,
    name: 'FASE 7: ENCONTRO DAS ÁGUAS',
    shortTitle: 'Fase 7 — Encontro das Águas',
    motto: 'União que gera vida e prosperidade! 💧',
    bg: 'assets/backgrounds/cenario_7.png',
    targetGuarana: 50,
    totalTime: 60.0,
    minSpeed: 250,
    maxSpeed: 350,
    spawnDelayMin: 0.40,
    spawnDelayMax: 0.65,
    desc: 'Colheita mágica onde os grandes rios amazônicos se cruzam!'
  },
  {
    id: 8,
    name: 'FASE 8: CORAÇÃO DA SELVA ANCESTRAL',
    shortTitle: 'Fase 8 — Selva Ancestral',
    motto: 'A força indomável da floresta! 🌿',
    bg: 'assets/backgrounds/cenario_8.png',
    targetGuarana: 55,
    totalTime: 60.0,
    minSpeed: 270,
    maxSpeed: 370,
    spawnDelayMin: 0.35,
    spawnDelayMax: 0.60,
    desc: 'Desafio intenso nas profundezas intocadas da mata!'
  },
  {
    id: 9,
    name: 'FASE 9: GRANDE FESTIVAL DO GUARANÁ CETAM',
    shortTitle: 'Fase 9 — Festival CETAM',
    motto: 'Nossa Terra, Nossa Energia, Nosso Futuro! 🏆',
    bg: 'assets/backgrounds/cenario_9.png',
    targetGuarana: 60,
    totalTime: 60.0,
    minSpeed: 290,
    maxSpeed: 400,
    spawnDelayMin: 0.30,
    spawnDelayMax: 0.55,
    desc: 'O grande clímax final! Consagre-se o Lendário Mestre da Colheita CETAM!'
  }
];

/**
 * Cena Principal da Colheita do Guaraná (HarvestScene)
 * Gerencia as 9 fases temáticas com troca dinâmica de cenários,
 * contagem regressiva pré-jogo arcade, física de queda, bônus de tempo e efeitos climáticos.
 */
class HarvestScene {
  constructor(canvasWidth, canvasHeight, soundManager, particleSystem) {
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.sound = soundManager;
    this.particles = particleSystem;

    // Imagem fallback padrão
    this.fallbackBg = new Image();
    this.fallbackBg.src = 'assets/backgrounds/tela_do_jogo.png';

    // Pré-carrega os 9 cenários temáticos
    this.phaseBackgrounds = [];
    HARVEST_PHASES.forEach((phase, idx) => {
      const img = new Image();
      img.src = phase.bg;
      this.phaseBackgrounds[idx] = img;
    });

    // Ícones dos itens coletáveis
    this.itemIcons = {
      guarana: new Image(),
      moeda: new Image(),
      folha: new Image(),
      estrela: new Image(),
      cesta: new Image()
    };
    this.itemIcons.guarana.src = 'assets/ui/icons/guarana.png';
    this.itemIcons.moeda.src = 'assets/ui/icons/moeda.png';
    this.itemIcons.folha.src = 'assets/ui/icons/folha.png';
    this.itemIcons.estrela.src = 'assets/ui/icons/estrela_cheia.png';
    this.itemIcons.cesta.src = 'assets/ui/icons/cesta.png';

    // Sistema de Fases
    this.currentPhaseIndex = 0;
    this.score = 0;
    this.coinsCollected = 0;
    this.timeBonus = 0;

    this.onShake = null;

    // Estado da fase atual
    this.targetGuarana = 15;
    this.totalTime = 50.0;
    this.timeLeft = this.totalTime;
    this.guaranaCollected = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboGrace = 0;
    this.isVictory = false;
    this.isGameOver = false;
    this.spawnedAny = false;
    this.phaseElapsed = 0;

    // Contagem Regressiva Pré-Jogo (3.6s total: 3... 2... 1... COLHER!)
    this.countdown = 3.6;
    this.countdownStepBeep = 4;

    // Itens caindo no cenário
    this.fallingItems = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = 0.8;

    // Textos flutuantes de pontuação (+100, etc.)
    this.floatingTexts = [];

    // Partículas de chuva para a Fase 9 (Temporal)
    this.rainDrops = [];
    for (let i = 0; i < 45; i++) {
      this.rainDrops.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        len: 12 + Math.random() * 16,
        speed: 380 + Math.random() * 220
      });
    }

    // Coordenadas das árvores para spawn natural
    this.treeSpawnsX = [120, 220, 340, 480, 600, 720, 840];

    // Inicializa na Fase 1
    this.loadPhase(0, false);
  }

  getCurrentPhase() {
    return HARVEST_PHASES[this.currentPhaseIndex] || HARVEST_PHASES[0];
  }

  hasNextPhase() {
    return this.currentPhaseIndex < HARVEST_PHASES.length - 1;
  }

  loadPhase(phaseIndex, keepScore = false) {
    this.currentPhaseIndex = Math.max(0, Math.min(phaseIndex, HARVEST_PHASES.length - 1));
    const phase = this.getCurrentPhase();

    this.targetGuarana = phase.targetGuarana;
    this.totalTime = phase.totalTime;
    this.timeLeft = this.totalTime;
    this.guaranaCollected = 0;
    this.timeBonus = 0;

    if (!keepScore) {
      this.score = 0;
      this.coinsCollected = 0;
    }

    this.combo = 0;
    this.comboTimer = 0;
    this.comboGrace = 0;
    this.isVictory = false;
    this.isGameOver = false;
    this.spawnedAny = false;
    this.phaseElapsed = 0;

    this.fallingItems = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;
    this.nextSpawnDelay = phase.spawnDelayMin;

    // Reinicia contagem regressiva pré-jogo
    this.countdown = 3.6;
    this.countdownStepBeep = 4;
  }

  advancePhase() {
    if (this.hasNextPhase()) {
      this.loadPhase(this.currentPhaseIndex + 1, true);
      return true;
    }
    return false;
  }

  reset() {
    this.loadPhase(this.currentPhaseIndex, true);
  }

  resetAll() {
    this.loadPhase(0, false);
  }

  spawnItem(harvester) {
    const phase = this.getCurrentPhase();
    const rand = Math.random();

    let x;
    const chasePlayer = harvester && rand < 0.34;
    if (chasePlayer) {
      x = harvester.x + (Math.random() - 0.5) * 340;
    } else {
      const treeX = this.treeSpawnsX[Math.floor(Math.random() * this.treeSpawnsX.length)];
      x = treeX + (Math.random() - 0.5) * 60;
    }
    x = Math.max(70, Math.min(this.width - 70, x));

    const startY = 85 + Math.random() * 45;
    const baseSpeed = phase.minSpeed + Math.random() * (phase.maxSpeed - phase.minSpeed);
    let speed = baseSpeed;
    let radius = 22;
    let type = 'guarana';

    if (this.spawnedAny) {
      if (rand < 0.65) {
        type = 'guarana';
        radius = 24;
      } else if (rand < 0.82) {
        type = 'moeda';
        radius = 20;
        speed = baseSpeed * 1.15;
      } else if (rand < 0.94) {
        type = 'folha';
        radius = 18;
        speed = baseSpeed * 0.85;
      } else {
        type = 'estrela';
        radius = 24;
        speed = baseSpeed * 1.25;
      }
    }

    this.spawnedAny = true;
    this.fallingItems.push({
      type,
      x,
      y: startY,
      baseX: x,
      swayOffset: Math.random() * Math.PI * 2,
      swaySpeed: 2.0 + Math.random() * 2.0,
      swayAmount: 14 + Math.random() * 12,
      speed,
      radius,
      rotation: 0,
      rotSpeed: (Math.random() - 0.5) * 3,
      time: 0
    });
  }

  addFloatingText(text, x, y, color = '#FDE047', scale = 1) {
    if (this.floatingTexts.length > 10) {
      this.floatingTexts.shift();
    }
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      alpha: 1.0,
      life: 0.85,
      maxLife: 0.85,
      scale
    });
  }

  shake(amount) {
    if (this.onShake) this.onShake(amount);
  }

  update(dt, harvester) {
    if (this.isVictory || this.isGameOver) return;

    // Atualiza chuva se for fase de Temporal
    const phase = this.getCurrentPhase();
    if (phase.isRain) {
      for (const drop of this.rainDrops) {
        drop.y += drop.speed * dt;
        drop.x -= 40 * dt;
        if (drop.y > this.height) {
          drop.y = -10;
          drop.x = Math.random() * this.width;
        }
      }
    }

    // 1. Processamento da Contagem Regressiva Pré-Jogo (3, 2, 1, COLHER!)
    if (this.countdown > -0.6) {
      this.countdown -= dt;

      // Disparo de Bips de Áudio sincronizados
      if (this.countdown <= 3.0 && this.countdownStepBeep === 4) {
        if (this.sound) this.sound.playCountdownBeep(false);
        this.countdownStepBeep = 3;
      } else if (this.countdown <= 2.0 && this.countdownStepBeep === 3) {
        if (this.sound) this.sound.playCountdownBeep(false);
        this.countdownStepBeep = 2;
      } else if (this.countdown <= 1.0 && this.countdownStepBeep === 2) {
        if (this.sound) this.sound.playCountdownBeep(false);
        this.countdownStepBeep = 1;
      } else if (this.countdown <= 0.0 && this.countdownStepBeep === 1) {
        if (this.sound) this.sound.playCountdownBeep(true);
        this.countdownStepBeep = 0;
      }

      // Durante a contagem, movimentação é liberada, mas o tempo não corre e frutos não caem
      if (this.countdown > 0) {
        return;
      }
    }

    // 2. Cronômetro regressivo da fase
    this.phaseElapsed += dt;
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.isGameOver = true;
      this.shake(14);
      if (this.sound) this.sound.playCrash();
    }

    // 3. Combo: janela ativa + período de tolerância antes de zerar
    const ability = harvester.ability || { comboDurationMult: 1.0, leafImmunity: false };
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboTimer = 0;
        if (this.combo > 1) this.comboGrace = 1.25;
        else this.combo = 0;
      }
    } else if (this.comboGrace > 0) {
      this.comboGrace -= dt;
      if (this.comboGrace <= 0) this.combo = 0;
    }

    // 4. Spawner de itens (respeita cadência da fase atual)
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.nextSpawnDelay) {
      this.spawnTimer = 0;
      const ramp = this.phaseElapsed < 5 ? 1.55 : 1;
      this.nextSpawnDelay = (phase.spawnDelayMin + Math.random() * (phase.spawnDelayMax - phase.spawnDelayMin)) * ramp;
      this.spawnItem(harvester);
    }

    // 5. Atualiza Itens Caindo e Colisões
    const basket = harvester.getBasketCenter();
    const groundY = harvester.groundY;
    const magnetRange = basket.radius * 1.6;

    for (let i = this.fallingItems.length - 1; i >= 0; i--) {
      const item = this.fallingItems[i];
      item.time += dt;
      item.y += item.speed * dt;

      const sway = Math.sin(item.time * item.swaySpeed + item.swayOffset) * item.swayAmount;
      item.x = item.baseX + sway;
      item.rotation += item.rotSpeed * dt;

      // Assistência de mira: aproximação suave quando o item entra no campo de ação
      const preDx = basket.x - item.x;
      const preDy = basket.y - item.y;
      const preDist = Math.hypot(preDx, preDy);
      if (preDist < magnetRange && preDy < 90) {
        const pull = (1 - preDist / magnetRange) * 320 * dt;
        const target = item.baseX + sway + preDx;
        item.baseX += Math.max(-pull, Math.min(pull, target - item.baseX)) * 0.85;
        item.x = item.baseX + sway;
      }

      const dx = item.x - basket.x;
      const dy = item.y - basket.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < (item.radius + basket.radius)) {
        this.handleItemPickup(item, basket, harvester);
        this.fallingItems.splice(i, 1);
        continue;
      }

      if (item.y >= groundY) {
        if (item.type === 'guarana') {
          this.particles.emitSparks(item.x, groundY, 4);
          if (this.combo > 1) {
            this.addFloatingText('COMBO PERDIDO', item.x, groundY - 24, 'rgba(239,68,68,0.85)', 0.8);
            this.combo = 0;
            this.comboTimer = 0;
            this.comboGrace = 0;
          }
        }
        this.fallingItems.splice(i, 1);
      }
    }

    // 6. Atualiza textos flutuantes
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= dt * 45;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life / ft.maxLife);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 7. Condição de Vitória Imediata: Concluiu antes do tempo acabar!
    if (this.guaranaCollected >= this.targetGuarana && !this.isVictory) {
      this.isVictory = true;
      this.timeBonus = Math.max(0, Math.floor(this.timeLeft) * 50);
      this.score += this.timeBonus;
      this.addFloatingText(`+${this.timeBonus} ⏱️ BÔNUS TEMPO!`, this.width / 2, 210, '#34D399', 1.15);
      this.shake(6);
      this.particles.emitRing(this.width / 2, this.height / 2, '#34D399', 26, 6);
      if (this.sound) this.sound.playLap();
    }
  }

  handleItemPickup(item, basket, harvester) {
    harvester.triggerCollect();

    const ability = harvester.ability || {
      comboDurationMult: 1.0,
      leafImmunity: false
    };

    if (item.type === 'guarana') {
      this.guaranaCollected++;
      if (this.combo > 1 && this.comboTimer <= 0 && this.comboGrace > 0) {
        this.addFloatingText(`COMBO RETOMADO x${this.combo}`, item.x, item.y - 34, '#FBBF24', 0.85);
      }
      this.combo++;
      this.comboTimer = 2.5 * ability.comboDurationMult;
      this.comboGrace = 0;

      const comboBonus = Math.min(this.combo * 20, 200);
      const points = 100 + comboBonus;
      this.score += points;

      const comboTag = this.combo > 1 ? ` (x${this.combo})` : '';
      this.addFloatingText(`+${points} 🍒${comboTag}`, item.x, item.y - 10, '#34D399', 1 + Math.min(this.combo, 8) * 0.045);
      this.particles.emitCoinPickup(item.x, item.y);
      if (this.combo >= 5) this.particles.emitRing(item.x, item.y, '#F59E0B', 10, 3.4);
      this.shake(Math.min(5, 1.5 + this.combo * 0.35));
      if (this.sound) this.sound.playCoin();
      if (harvester.triggerCollectHappy) harvester.triggerCollectHappy();

    } else if (item.type === 'moeda') {
      this.coinsCollected++;
      const points = 250;
      this.score += points;
      this.turboChargeBonus(harvester, 0.22);

      this.addFloatingText(`+${points} 🪙`, item.x, item.y - 10, '#FBBF24', 1.1);
      this.particles.emitCoinPickup(item.x, item.y);
      this.shake(2.5);
      if (this.sound) this.sound.playCoin();

    } else if (item.type === 'estrela') {
      const points = 500;
      this.score += points;
      this.turboChargeBonus(harvester, 1);

      this.addFloatingText(`+${points} ⭐ TURBO CHEIO!`, item.x, item.y - 10, '#F59E0B', 1.2);
      this.particles.emitNitro(item.x, item.y, -Math.PI / 2, 14);
      this.particles.emitRing(item.x, item.y, '#FACC15', 16, 4.2);
      this.shake(5);
      if (this.sound) this.sound.playTurbo();
      if (harvester.triggerCollectHappy) harvester.triggerCollectHappy();

    } else if (item.type === 'folha') {
      this.turboChargeBonus(harvester, -0.15);
      if (ability.leafImmunity) {
        const penalty = 25;
        this.score = Math.max(0, this.score - penalty);
        this.addFloatingText(`🛡️ -${penalty} COMBO SALVO!`, item.x, item.y - 10, '#60A5FA', 0.95);
        this.particles.emitNitro(item.x, item.y, -Math.PI / 2, 5);
        this.shake(3);
      } else {
        const penalty = 50;
        this.score = Math.max(0, this.score - penalty);
        this.combo = 0;
        this.comboTimer = 0;
        this.comboGrace = 0;
        this.addFloatingText(`-${penalty} 🍂 CUIDADO!`, item.x, item.y - 10, '#EF4444', 1.1);
        this.particles.emitSparks(item.x, item.y, 8);
        this.shake(7);
        if (harvester.triggerHurt) harvester.triggerHurt();
      }
      if (this.sound) this.sound.playCrash();
    }
  }

  turboChargeBonus(harvester, amount) {
    if (!harvester) return;
    harvester.turboCharge = Math.max(0, Math.min(1, harvester.turboCharge + amount));
  }

  draw(ctx) {
    const phase = this.getCurrentPhase();
    const currentBg = this.phaseBackgrounds[this.currentPhaseIndex];

    // 1. Renderiza o Cenário Exclusivo da Fase
    if (currentBg && currentBg.complete && currentBg.naturalWidth > 0) {
      ctx.drawImage(currentBg, 0, 0, this.width, this.height);
    } else if (this.fallbackBg.complete && this.fallbackBg.naturalWidth > 0) {
      ctx.drawImage(this.fallbackBg, 0, 0, this.width, this.height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, this.height);
      grad.addColorStop(0, '#064E3B');
      grad.addColorStop(0.7, '#047857');
      grad.addColorStop(1, '#78350F');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.height);
    }

    // Efeito de Noite na Amazônia (Fase 6)
    if (phase.isNight) {
      ctx.save();
      ctx.fillStyle = 'rgba(10, 20, 50, 0.28)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    // Efeito de Chuva / Temporal (Fase 9)
    if (phase.isRain) {
      ctx.save();
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const drop of this.rainDrops) {
        ctx.moveTo(drop.x, drop.y);
        ctx.lineTo(drop.x - 4, drop.y + drop.len);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 2. Renderiza os Itens Caindo
    for (const item of this.fallingItems) {
      ctx.save();
      ctx.translate(item.x, item.y);
      ctx.rotate(item.rotation);

      const iconImg = this.itemIcons[item.type];
      const sz = item.radius * 2.2;

      if (iconImg && iconImg.complete && iconImg.naturalWidth > 0) {
        ctx.drawImage(iconImg, -sz / 2, -sz / 2, sz, sz);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
        ctx.fillStyle = item.type === 'guarana' ? '#DC2626' : (item.type === 'moeda' ? '#F59E0B' : '#10B981');
        ctx.fill();
      }

      ctx.restore();
    }

    // 3. Renderiza Textos Flutuantes
    for (const ft of this.floatingTexts) {
      const pop = 1 + Math.max(0, (ft.maxLife - ft.life) < 0.16 ? (1 - (ft.maxLife - ft.life) / 0.16) * 0.45 : 0);
      const scale = ft.scale * pop;
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(scale, scale);
      ctx.font = '800 18px "Orbitron", "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.strokeText(ft.text, 0, 0);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);
      ctx.restore();
    }

    // 4. In-Game HUD (Combos)
    this.drawInGameHUD(ctx);

    // 5. Contagem Regressiva Pré-Jogo Arcade (3, 2, 1, COLHER!)
    if (this.countdown > -0.6) {
      this.drawCountdownOverlay(ctx);
    }
  }

  drawInGameHUD(ctx) {
    if (this.combo > 1) {
      const dying = this.comboTimer <= 0;
      const blink = dying ? (0.45 + Math.abs(Math.sin(this.comboGrace * 12)) * 0.55) : 1;
      const scale = 1 + Math.min(0.35, (this.combo - 2) * 0.03);
      const label = `COMBO x${this.combo}! 🔥`;

      ctx.save();
      ctx.globalAlpha = blink;
      ctx.translate(this.width / 2, 85);
      ctx.scale(scale, scale);
      ctx.font = '900 20px "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000000';
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = dying ? '#EF4444' : '#F59E0B';
      ctx.fillText(label, 0, 0);

      if (dying) {
        const w = 96;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(-w / 2, 8, w, 5);
        ctx.fillStyle = '#EF4444';
        ctx.fillRect(-w / 2, 8, w * Math.max(0, this.comboGrace / 1.25), 5);
      }
      ctx.restore();
    }

    const progress = Math.min(1, this.guaranaCollected / this.targetGuarana);
    if (this.countdown <= 0 && !this.isVictory) {
      const w = 240;
      const x = this.width / 2 - w / 2;
      const y = 108;
      ctx.save();
      ctx.fillStyle = 'rgba(3, 12, 24, 0.7)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, 10, 5);
      else ctx.rect(x, y, w, 10);
      ctx.fill();

      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, '#22c55e');
      grad.addColorStop(1, '#facc15');
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, Math.max(6, w * progress), 10, 5);
      else ctx.rect(x, y, Math.max(6, w * progress), 10);
      ctx.fill();

      ctx.font = '700 9px "Inter", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(`META ${this.guaranaCollected} / ${this.targetGuarana}`, this.width / 2, y - 5);
      ctx.restore();
    }
  }

  drawCountdownOverlay(ctx) {
    ctx.save();
    const cx = this.width / 2;
    const cy = this.height / 2 - 20;
    const phase = this.getCurrentPhase();

    let text = '';
    let subText = phase.motto;
    let color = '#00F0FF';
    let scale = 1.0;

    if (this.countdown > 2.0) {
      text = '3';
      color = '#FF7A00';
      const t = this.countdown - 2.0;
      scale = 0.9 + Math.sin(t * Math.PI) * 0.35;
    } else if (this.countdown > 1.0) {
      text = '2';
      color = '#FBBF24';
      const t = this.countdown - 1.0;
      scale = 0.9 + Math.sin(t * Math.PI) * 0.35;
    } else if (this.countdown > 0.0) {
      text = '1';
      color = '#34D399';
      const t = this.countdown - 0.0;
      scale = 0.9 + Math.sin(t * Math.PI) * 0.35;
    } else {
      text = 'COLHER! 🍒';
      color = '#00F090';
      const t = (this.countdown + 0.6) / 0.6;
      scale = 1.0 + (1 - t) * 0.25;
    }

    // Caixa central em obsidian glass
    ctx.fillStyle = 'rgba(3, 12, 24, 0.72)';
    ctx.beginPath();
    ctx.roundRect(cx - 250, cy - 115, 500, 230, 20);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.stroke();

    // Nome e Lema da Fase
    ctx.font = '700 13px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#38BDF8';
    ctx.letterSpacing = '1px';
    ctx.fillText(phase.name, cx, cy - 75);

    // Texto Central (3, 2, 1 ou COLHER!)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.font = text.length > 2 ? '900 48px "Orbitron", sans-serif' : '900 84px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(text, 0, 0);

    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.restore();

    // Lema inspirador da fase
    ctx.font = '600 14px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(`"${subText}"`, cx, cy + 75);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`"${subText}"`, cx, cy + 75);

    ctx.restore();
  }
}

/**
 * Ponto de entrada do Frontend no Electron
 * Conecta Visão Computacional, Teclado, Áudio e Motor do Jogo
 */
window.addEventListener('DOMContentLoaded', () => {
  const gameCanvas = document.getElementById('gameCanvas');
  const webcamVideo = document.getElementById('webcam');
  const cameraCanvas = document.getElementById('cameraCanvas');

  const engine = new GameEngine(gameCanvas);
  const vision = new VisionDetector(webcamVideo, cameraCanvas);

  // Preferencia de voz do arara fica salva entre sessoes.
  if (engine.story && engine.story.voice) {
    try {
      if (localStorage.getItem('warana_voz') === '0') engine.story.voice.setEnabled(false);
    } catch (err) { /* modo privado */ }
  }

  // A fala so e liberada depois de um gesto do usuario: a intro comeca sozinha,
  // entao o primeiro toque destrava a sintese do arara.
  const destravarVoz = () => {
    if (engine.story && engine.story.voice) engine.story.voice.unlock();
    window.removeEventListener('pointerdown', destravarVoz);
    window.removeEventListener('keydown', destravarVoz);
  };
  window.addEventListener('pointerdown', destravarVoz);
  window.addEventListener('keydown', destravarVoz);

  // Inicia a câmera e permite reativar com clique
  vision.startCamera();
  const camViewport = document.querySelector('.camera-viewport');
  if (camViewport) {
    camViewport.addEventListener('click', () => {
      vision.startCamera();
    });
  }

  // Estado do teclado
  const keys = {};
  const GAME_KEYS = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'space'];

  // Controlador 3D. Nasce desligado: a abertura e o gameplay 2D continuam
  // rodando ate o usuario ligar, e qualquer falha aqui devolve o jogo para o
  // 2D em vez de deixar a tela preta.
  const canvas3d = document.getElementById('gameCanvas3d');
  const entrada = new EntradaJogo();
  // Pedido de pulo: marca no keydown, consome no quadro. Segurar espaco nao
  // pode virar pulo infinito, entao isto vive fora da leitura de teclas.
  let pularPedido = false;
  const colheita3d = new Colheita3D({
    canvas3d,
    canvas2d: gameCanvas,
    phases: typeof HARVEST_PHASES !== 'undefined' ? HARVEST_PHASES : [],
    dom: engine.dom,
    criarSim: (o) => new HarvestSim(o),
    criarCena: (o) => criarHarvest3D(THREE, o),
    criarMenino: (playerId) => buildMeninoGuarana(THREE, estiloDoPlayer(playerId)),
    onTerminar: (sim) => {
      // Reusa o overlay do 2D, mas com os numeros da simulacao 3D.
      engine.isFinished = true;
      engine._showVictoryScreen(sim);
    }
  });

  /**
   * Corpo 3D de cada personagem do roster. Cai no menino para qualquer id fora
   * da lista (rodadas antigas, testes), para a cena nunca abrir sem corpo.
   */
  function estiloDoPlayer(playerId) {
    if (playerId === 2) return MENINO_ESTILO;
    if (playerId === 3) return MENINO_ESTILO_LUCAS;
    if (playerId === 4) return MENINO_ESTILO_MAYARA;
    return MENINO_ESTILO;
  }

  /** Liga ou desliga a 3D. Chamado pelo atalho T e pela troca de personagem. */
  function alternar3D(ligar) {
    const querLigar = ligar === undefined ? !colheita3d.ativo : ligar;
    if (querLigar === colheita3d.ativo) return colheita3d.ativo;
    // Durante a abertura nao ha o que mostrar em 3D: o gameplay ainda nao
    // comecou, e ligar aqui cobriria a narrativa com uma cena parada.
    if (querLigar && engine.inStory) return false;
    // Um espaco apertado no 2D nao pode virar pulo no primeiro quadro do 3D.
    pularPedido = false;
    if (querLigar) {
      // Cada personagem tem o proprio corpo 3D; a cena nasce com o que estiver
      // selecionado (Lucas 3 ou Mayara 4), com habilidade e HUD alinhados.
      const ok = colheita3d.iniciar(engine.harvester.currentPlayer);
      if (!ok) console.warn('[3D] nao ligou, seguindo no 2D:', colheita3d.erro);
      return ok;
    }
    colheita3d.parar();
    return false;
  }

  /** Fecha a tela de resultado. O engine.restart() faz isso no 2D, mas na 3D a
   *  rodada e outra e precisamos limpar na mao. */
  function fecharVitoria() {
    engine.isFinished = false;
    const overlay = document.getElementById('victoryOverlay');
    if (overlay) overlay.classList.add('hidden');
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (GAME_KEYS.includes(key)) e.preventDefault();
    keys[key] = true;
    keys[e.code] = true;

    if (e.key === 'p' || e.key === 'P') {
      engine.togglePause();
    } else if (e.key === 'r' || e.key === 'R') {
      engine.restart();
      // A simulacao 3D e independente do cenario 2D; sem isto o "R" recomecaria
      // so o de baixo e o de cima continuaria com o relogio e os pontos antigos.
      if (colheita3d.ativo) colheita3d.reiniciar();
    } else if (e.key === 'n' || e.key === 'N') {
      if (colheita3d.ativo) {
        // O avanco de fase da 3D e da propria simulacao; nao passa pelo 2D.
        if (!colheita3d.proximaFase()) colheita3d.reiniciarTudo();
        fecharVitoria();
      } else if (engine.harvestScene.isVictory && engine.harvestScene.hasNextPhase()) {
        engine.nextPhase();
      } else if (!document.getElementById('victoryOverlay').classList.contains('hidden')) {
        engine.restart();
      }
    } else if (e.key === 'm' || e.key === 'M') {
      toggleSound();
    } else if (e.key === 'f' || e.key === 'F') {
      toggleVoice();
    } else if (e.key === 's' && engine.inStory) {
      engine.skipStory();
    } else if (e.key === ' ' || e.key === 'Enter') {
      if (engine.inStory) {
        engine.advanceStory();
      } else if (!document.getElementById('victoryOverlay').classList.contains('hidden')) {
        if (engine.harvestScene.isVictory && engine.harvestScene.hasNextPhase()) {
          engine.nextPhase();
        } else {
          engine.restart();
        }
      } else {
        // Fora da abertura e da vitoria, o espaco e pulo — nao mais "parar".
        // Fica como pedido de um quadro so: segurar o botao nao pode fazer o
        // menino pular sozinho, e a simulacao ja trata o pulo como impulso.
        pularPedido = true;
      }
    } else if (e.key === 't' || e.key === 'T') {
      alternar3D();
    } else if (['2', '3', '4'].includes(e.key)) {
      selectCharacter(parseInt(e.key));
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    keys[e.code] = false;
  });

  // Avanço da narrativa por clique/toque no canvas
  gameCanvas.addEventListener('pointerdown', (e) => {
    if (engine.inStory) {
      e.preventDefault();
      engine.advanceStory();
    }
  });

  // Seletor de Personagens
  const charPills = document.querySelectorAll('.char-pill');

  /** Marca a pilula do personagem escolhido. Separado da troca de personagem
   * para o HUD e a cena 3D poderem apontar para o mesmo personagem. */
  function atualizarPills(playerId) {
    charPills.forEach(pill => {
      if (parseInt(pill.dataset.player) === playerId) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  function selectCharacter(playerId) {
    engine.setPlayer(playerId);
    atualizarPills(playerId);
    // Se a 3D ja estiver na frente, ela precisa renascer com a nova
    // habilidade. Sem isso, escolher outro menino trocaria o HUD mas nao os
    // numeros de verdade (velocidade, cesta), porque a simulacao ja existia.
    if (colheita3d.ativo) {
      colheita3d.parar();
      alternar3D(true);
    }
  }

  charPills.forEach(pill => {
    pill.addEventListener('click', () => {
      const pId = parseInt(pill.dataset.player);
      selectCharacter(pId);
    });
  });

  // Botões de Ação na barra inferior
  document.getElementById('startBtn').addEventListener('click', () => {
    engine.startFromMenu();
  });

  document.getElementById('pauseBtn').addEventListener('click', () => {
    engine.togglePause();
  });

  document.getElementById('restartBtn').addEventListener('click', () => {
    if (colheita3d.ativo) {
      engine.isFinished = false;
      colheita3d.reiniciar();
    } else {
      engine.restart();
    }
  });

  document.getElementById('resumeBtn').addEventListener('click', () => {
    engine.isPaused = false;
    document.getElementById('pauseOverlay').classList.add('hidden');
  });

  document.getElementById('restartVictoryBtn').addEventListener('click', () => {
    if (colheita3d.ativo) {
      // engine.restart() esconde os dois overlays e zera isFinished; o
      // reiniciar() da 3D cuida da simulacao, que o 2D nao conhece.
      engine.restart();
      colheita3d.reiniciar();
    } else {
      engine.restart();
    }
  });

  const nextPhaseBtn = document.getElementById('nextPhaseBtn');
  if (nextPhaseBtn) {
    nextPhaseBtn.addEventListener('click', () => {
      if (colheita3d.ativo) {
        if (!colheita3d.proximaFase()) colheita3d.reiniciarTudo();
        fecharVitoria();
      } else {
        engine.nextPhase();
      }
    });
  }

  // Botão de Som no Header
  const soundBtn = document.getElementById('soundToggleBtn');
  const soundText = document.getElementById('soundStatusText');
  function toggleSound() {
    // Durante aintro o som nao pode ser bloqueado: e o unico jeito de cortar
    // a voz do arara sem sair da cena.
    const isEnabled = engine.sound.toggleMute();
    if (engine.story) engine.story.setVoiceMuted(!isEnabled);
    if (isEnabled) {
      soundText.textContent = 'SOM ATIVO [M]';
      soundBtn.classList.remove('muted');
      soundBtn.querySelector('.status-dot').className = 'status-dot green';
    } else {
      soundText.textContent = 'MUDO [M]';
      soundBtn.classList.add('muted');
      soundBtn.querySelector('.status-dot').className = 'status-dot';
    }
  }
  soundBtn.addEventListener('click', toggleSound);

  // Voz do arara: liga/desliga a fala e a animacao do papagaio [F]
  function toggleVoice() {
    if (!engine.story) return;
    const on = engine.story.toggleVoice();
    if (engine.story.voice) {
      try { localStorage.setItem('warana_voz', on ? '1' : '0'); } catch (err) { /* modo privado */ }
    }
    if (soundText) soundText.textContent = on ? 'VOZ ATIVA [F]' : 'VOZ DESLIGADA [F]';
  }

  // Botão Tela Cheia (F11)
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  // Botão Ver Ranking
  document.getElementById('rankingBtn').addEventListener('click', () => {
    const phase = engine.harvestScene.getCurrentPhase();
    alert(`🏆 Recordes da Colheita de Guaraná (CETAM):\n\n1º Lugar: Mayara — Fase 3 concluída (18.420 pts)\n2º Lugar: Lucas — Fase 3 concluída (16.200 pts)\n\nSua Sessão Atual:\n${phase.name}\nPontos Acumulados: ${engine.harvestScene.score}\nGuaranás Nesta Fase: ${engine.harvestScene.guaranaCollected} / ${phase.targetGuarana}`);
  });

  // Botão Capturar Tela
  document.getElementById('screenshotBtn').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = `colheita-guarana-cetam-${Date.now()}.png`;
    link.href = gameCanvas.toDataURL();
    link.click();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (engine.inStory) {
        engine.skipStory();
      }
    }
  });

  // Loop de Animação e Renderização a 60 FPS
  let lastTime = performance.now();
  let frameCount = 0;
  let fpsTimer = performance.now();

  const fpsEl = document.getElementById('fpsValue');
  const camFpsEl = document.getElementById('camFps');

  function gameLoop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 1. Determina Comando (Teclado tem prioridade se pressionado)
    let activeCommand = vision.command;
    let activeSteer = vision.smoothSteer;

    const kbAccelerate = keys['w'] || keys['arrowup'];
    const kbBrake = keys['s'] || keys['arrowdown'];
    const kbLeft = keys['a'] || keys['arrowleft'];
    const kbRight = keys['d'] || keys['arrowright'];
    const kbTurbo = keys['shift'] || keys['shiftleft'] || keys['shiftright'] || keys['e'];
    // No 2D o espaco continua sendo "parar". No 3D o mesmo botao vale pulo, e
    // por isso ele nao aparece nesta lista de comando: quem le `pularPedido` e
    // o outro caminho. Assim ninguem perde o freio no modo antigo.
    const kbStop = keys[' '] || keys['space'];

    if (kbTurbo) {
      activeCommand = 'TURBO';
    } else if (kbAccelerate) {
      activeCommand = 'ACELERAR';
    } else if (kbBrake || kbStop) {
      activeCommand = 'PARAR';
    }

    if (kbLeft) {
      activeSteer = -1.0;
      activeCommand = 'ESQUERDA';
    } else if (kbRight) {
      activeSteer = 1.0;
      activeCommand = 'DIREITA';
    }

    // 2. Caminho 3D: quando ligado, ele consome o quadro inteiro e o 2D nem
    // roda. A entrada vai como dois eixos, porque a simulacao 3D nao pensa em
    // "esquerda/direita relativas", e a cola converte para o espaco do mundo.
    if (colheita3d.ativo) {
      entrada.steerX = (kbRight ? 1 : 0) + (kbLeft ? -1 : 0);
      entrada.steerZ = (kbAccelerate ? 1 : 0) + (kbBrake ? -1 : 0);
      const semDirecao = !kbAccelerate && !kbBrake && !kbLeft && !kbRight;
      entrada.command = kbTurbo ? 'TURBO' : (semDirecao ? 'PARAR' : 'ACELERAR');
      entrada.pular = pularPedido;
      pularPedido = false;
      colheita3d.pausado = engine.isPaused;
      colheita3d.atualizar(dt, entrada);

      frameCount++;
      if (now - fpsTimer >= 1000) {
        const currentFps = Math.round((frameCount * 1000) / (now - fpsTimer));
        if (fpsEl) fpsEl.textContent = currentFps;
        if (camFpsEl) camFpsEl.textContent = Math.min(currentFps, 30);
        frameCount = 0;
        fpsTimer = now;
      }
      requestAnimationFrame(gameLoop);
      return;
    }

    // 3. Atualiza a física do jogo
    engine.update(activeCommand, activeSteer);

    // 4. Renderiza o circuito
    engine.draw();

    // 5. Sincroniza telemetria no DOM
    if (!engine.inStory) engine.syncTelemetry();

    // 6. Medição de FPS
    frameCount++;
    if (now - fpsTimer >= 1000) {
      const currentFps = Math.round((frameCount * 1000) / (now - fpsTimer));
      if (fpsEl) fpsEl.textContent = currentFps;
      if (camFpsEl) camFpsEl.textContent = Math.min(currentFps, 30);
      frameCount = 0;
      fpsTimer = now;
    }

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);

  window.__warana = { engine, vision, colheita3d, alternar3D };
});

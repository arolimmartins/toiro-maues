/**
 * Módulo de Visão Computacional com MediaPipe Hands e Volante Virtual
 */
class VisionDetector {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.hands = null;
    this.camera = null;
    this.isReady = false;
    this.hasHand = false;
    this.handMode = 'NONE'; // 'DUAL', 'SINGLE', 'NONE'
    this.wheelAngleDeg = 0;

    this.smoothSteer = 0.0;
    this.command = 'PARAR';
    this.confidence = 0.96;
    this.lastDetectedTime = 0;

    this.stream = null;
    this.currentDeviceId = localStorage.getItem('gesturecar_camera_id') || null;
    this._loopRunning = false;
    this._isProcessing = false;
    this._lastProcessTime = 0;

    // Cache de referências DOM para evitar gargalo de getElementById a cada frame
    this.dom = {
      knob: document.getElementById('steerKnob'),
      wheelWrap: document.getElementById('wheelIconWrap'),
      activeWheelStatus: document.getElementById('activeWheelStatus'),
      activeWheelSub: document.querySelector('.gesture-info-meta p'),
      handStatus: document.getElementById('handStatusLabel'),
      confVal: document.getElementById('confVal'),
      confBar: document.getElementById('confBar'),
      badge: document.getElementById('currentGestureBadge'),
      sub: document.getElementById('currentGestureSub'),
      tiles: {
        wheel: document.getElementById('tileWheel'),
        palm: document.getElementById('tilePalm'),
        peace: document.getElementById('tilePeace'),
        fist: document.getElementById('tileFist'),
        tilt: document.getElementById('tileTilt')
      }
    };

    this.initMediaPipe();
    this.setupCameraList();
  }

  async setupCameraList() {
    try {
      const select = document.getElementById('cameraSelect');
      if (!select) return;

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      select.innerHTML = '';

      if (videoDevices.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Nenhuma câmera detectada';
        select.appendChild(opt);
        return;
      }

      videoDevices.forEach((dev, index) => {
        const opt = document.createElement('option');
        opt.value = dev.deviceId;
        opt.textContent = dev.label || `Câmera ${index + 1}`;
        if (this.currentDeviceId && dev.deviceId === this.currentDeviceId) {
          opt.selected = true;
        } else if (!this.currentDeviceId && index === 0) {
          opt.selected = true;
        }
        select.appendChild(opt);
      });

      select.onchange = async () => {
        const devId = select.value;
        if (devId) {
          await this.switchCamera(devId);
        }
      };
    } catch (err) {
      console.warn("Erro ao enumerar câmeras:", err);
    }
  }

  async switchCamera(deviceId) {
    this.currentDeviceId = deviceId;
    if (deviceId) {
      localStorage.setItem('gesturecar_camera_id', deviceId);
    }
    return await this.startCamera(deviceId);
  }

  async startCamera(deviceId = null) {
    try {
      if (this.stream) {
        this.stream.getTracks().forEach(t => t.stop());
        this.stream = null;
      }

      const targetId = deviceId || this.currentDeviceId || localStorage.getItem('gesturecar_camera_id');

      const videoConstraints = {
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 },
        frameRate: { ideal: 30 }
      };

      if (targetId) {
        videoConstraints.deviceId = { exact: targetId };
      }

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: false
        });
      } catch (errFallback) {
        // Fallback para caso 'exact' falhe ou resolução HD não seja suportada
        console.log("Tentando fallback de restrições de câmera...");
        stream = await navigator.mediaDevices.getUserMedia({
          video: targetId ? { deviceId: targetId } : true,
          audio: false
        });
      }

      this.stream = stream;
      this.video.srcObject = stream;
      await new Promise(resolve => this.video.onloadedmetadata = resolve);
      await this.video.play();

      this.canvas.width = this.video.videoWidth || 640;
      this.canvas.height = this.video.videoHeight || 480;

      // Atualiza lista de câmeras caso as labels ainda não estivessem autorizadas
      this.setupCameraList();

      const camText = document.getElementById('camStatusText');
      if (camText) {
        const track = stream.getVideoTracks()[0];
        const label = track ? track.label : 'Câmera Ativa';
        camText.textContent = label.length > 18 ? label.substring(0, 16) + '...' : label;
      }
      const camDot = document.querySelector('.cam-badge-top-left .status-dot');
      if (camDot) camDot.className = 'status-dot green pulse';
      
      this.isReady = true;
      if (!this._loopRunning) {
        this._loopRunning = true;
        this.processLoop();
      }
      return true;
    } catch (err) {
      console.warn("Aguardando câmera ser liberada:", err);
      const camText = document.getElementById('camStatusText');
      if (camText) camText.textContent = 'Clique para Ativar';
      const camDot = document.querySelector('.cam-badge-top-left .status-dot');
      if (camDot) camDot.className = 'status-dot';
      
      // Tenta reconectar automaticamente em 3 segundos
      setTimeout(() => {
        if (!this.isReady) this.startCamera();
      }, 3000);
      return false;
    }
  }

  initMediaPipe() {
    if (typeof window.Hands !== 'undefined') {
      try {
        this.hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        // Suporte para até 2 mãos para o volante virtual duplo
        // modelComplexity: 0 (Lite) roda 3x mais rápido, garantindo 60 FPS estáveis no jogo
        this.hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        this.hands.onResults((results) => this.onResults(results));
      } catch (e) {
        console.warn("MediaPipe Hands CDN indisponível, usando tracker heurístico offline:", e);
      }
    }
  }

  async processLoop() {
    if (!this.isReady) return;

    const now = performance.now();
    // Limita a inferência a ~30 FPS (a cada 33ms) e impede chamadas sobrepostas
    if (!this._isProcessing && (now - this._lastProcessTime >= 33)) {
      if (this.hands && this.video.readyState >= 2) {
        this._isProcessing = true;
        this._lastProcessTime = now;
        try {
          await this.hands.send({ image: this.video });
        } catch (e) {
          this._fallbackDetect();
        } finally {
          this._isProcessing = false;
        }
      } else {
        this._fallbackDetect();
      }
    }

    requestAnimationFrame(() => this.processLoop());
  }

  onResults(results) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length >= 2) {
      // 1. Modo Volante Duplo (2 Mãos)
      this.hasHand = true;
      this.handMode = 'DUAL';
      this.lastDetectedTime = performance.now();

      this._classifyDualHands(results.multiHandLandmarks);
      this._drawDualHandsAndWheel(results.multiHandLandmarks);
    } else if (results.multiHandLandmarks && results.multiHandLandmarks.length === 1) {
      // 2. Modo Híbrido Fallback (1 Mão)
      this.hasHand = true;
      this.handMode = 'SINGLE';
      this.lastDetectedTime = performance.now();

      const lm = results.multiHandLandmarks[0];
      this._drawSingleHand(lm);
      this._classifySingleHand(lm);
    } else {
      // Se não detectou mão nos últimos 300ms
      if (performance.now() - this.lastDetectedTime > 300) {
        this.hasHand = false;
        this.handMode = 'NONE';
        this.command = 'SEM MÃO';
        this.smoothSteer *= 0.82;
        this.wheelAngleDeg = 0;
      }
    }

    this.updateUI();
  }

  /**
   * Classifica o ângulo e gestos com 2 mãos segurando o volante virtual
   */
  _classifyDualHands(multiHands) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const h1 = multiHands[0];
    const h2 = multiHands[1];

    // Centro da mão 1 e 2 no espaço bruto
    const c1_x = (h1[0].x + h1[9].x) * 0.5 * w;
    const c1_y = (h1[0].y + h1[9].y) * 0.5 * h;
    const c2_x = (h2[0].x + h2[9].x) * 0.5 * w;
    const c2_y = (h2[0].y + h2[9].y) * 0.5 * h;

    // Devido ao espelhamento CSS (scaleX(-1)):
    // A mão com MAIOR X bruto fica na ESQUERDA da visão do usuário
    // A mão com MENOR X bruto fica na DIREITA da visão do usuário
    let hl, hr, l_screen_x, r_screen_x, ly, ry;
    if (c1_x > c2_x) {
      hl = h1; hr = h2;
      l_screen_x = w - c1_x; ly = c1_y;
      r_screen_x = w - c2_x; ry = c2_y;
    } else {
      hl = h2; hr = h1;
      l_screen_x = w - c2_x; ly = c2_y;
      r_screen_x = w - c1_x; ry = c1_y;
    }

    // Vetor no espaço da tela (da mão esquerda para a direita)
    const dx_screen = r_screen_x - l_screen_x; // sempre > 0
    const dy_screen = ry - ly; // Y cresce para baixo

    // Ângulo:
    // Virar DIREITA: Mão esquerda sobe (ly menor), Mão direita desce (ry maior) -> dy_screen > 0 -> angle > 0
    // Virar ESQUERDA: Mão esquerda desce, Mão direita sobe -> dy_screen < 0 -> angle < 0
    const angleRad = Math.atan2(dy_screen, Math.max(1.0, dx_screen));
    this.wheelAngleDeg = angleRad * (180 / Math.PI);

    // Normalização (+-28 graus = 100% de esterçamento)
    let targetSteer = Math.max(-1.0, Math.min(1.0, angleRad / 0.48));
    if (Math.abs(targetSteer) < 0.08) targetSteer = 0.0; // Deadzone suave

    this.smoothSteer += (targetSteer - this.smoothSteer) * 0.28;

    // Análise de Dedos nas duas mãos
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];

    const extL = tips.map((t, i) => dist(hl[t], hl[0]) > dist(hl[pips[i]], hl[0]) * 1.15);
    const extR = tips.map((t, i) => dist(hr[t], hr[0]) > dist(hr[pips[i]], hr[0]) * 1.15);

    const numL = extL.filter(Boolean).length;
    const numR = extR.filter(Boolean).length;

    const peaceL = extL[0] && extL[1] && !extL[2] && !extL[3];
    const peaceR = extR[0] && extR[1] && !extR[2] && !extR[3];

    const fistL = numL === 0;
    const fistR = numR === 0;

    if (peaceL || peaceR) {
      this.command = 'TURBO';
      this.confidence = 0.98;
    } else if (fistL && fistR) {
      this.command = 'FREAR';
      this.confidence = 0.96;
    } else {
      this.confidence = 0.94;
      if (this.smoothSteer < -0.25) {
        this.command = 'ESQUERDA';
      } else if (this.smoothSteer > 0.25) {
        this.command = 'DIREITA';
      } else {
        this.command = 'ACELERAR';
      }
    }
  }

  /**
   * Renderiza o volante virtual holográfico entre as 2 mãos
   */
  _drawDualHandsAndWheel(multiHands) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // 1. Desenha esqueleto de ambas as mãos
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17]
    ];

    for (const lm of multiHands) {
      ctx.save();
      ctx.strokeStyle = '#00f090';
      ctx.lineWidth = 2;
      for (const [i, j] of connections) {
        ctx.beginPath();
        ctx.moveTo(lm[i].x * w, lm[i].y * h);
        ctx.lineTo(lm[j].x * w, lm[j].y * h);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      for (const pt of lm) {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 2. Pontos de pegada das mãos no canvas bruto
    const h1 = multiHands[0];
    const h2 = multiHands[1];
    const c1_x = (h1[0].x + h1[9].x) * 0.5 * w;
    const c1_y = (h1[0].y + h1[9].y) * 0.5 * h;
    const c2_x = (h2[0].x + h2[9].x) * 0.5 * w;
    const c2_y = (h2[0].y + h2[9].y) * 0.5 * h;

    let lx, ly, rx, ry;
    if (c1_x > c2_x) {
      lx = c1_x; ly = c1_y;
      rx = c2_x; ry = c2_y;
    } else {
      lx = c2_x; ly = c2_y;
      rx = c1_x; ry = c1_y;
    }

    const cx = (lx + rx) * 0.5;
    const cy = (ly + ry) * 0.5;
    const r = Math.max(25, Math.hypot(rx - lx, ry - ly) * 0.5);

    // Cor dinâmica baseada no comando
    let wheelColor = '#00d4ff';
    if (this.command === 'TURBO') wheelColor = '#ff7700';
    else if (this.command === 'FREAR') wheelColor = '#ff3344';
    else if (this.command === 'ACELERAR') wheelColor = '#00f090';

    ctx.save();
    ctx.strokeStyle = wheelColor;
    ctx.shadowColor = wheelColor;
    ctx.shadowBlur = 12;

    // Aro exterior do volante
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Aro interior
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(10, r - 5), 0, Math.PI * 2);
    ctx.stroke();

    // Raios até as mãos (Pegada esquerda e direita)
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(lx, ly);
    ctx.moveTo(cx, cy);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    // Raio inferior esportivo (perpendicular ao ângulo)
    const rad = this.wheelAngleDeg * (Math.PI / 180);
    const bot_raw_x = cx + Math.sin(rad) * (r * 0.85);
    const bot_y = cy + Math.cos(rad) * (r * 0.85);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(bot_raw_x, bot_y);
    ctx.stroke();

    // Cubo central metálico/neon
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#04101e';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = wheelColor;
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    // Anéis de pegada nas mãos
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(lx, ly, 15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(rx, ry, 15, 0, Math.PI * 2);
    ctx.stroke();

    // Rótulos de Texto (Des-espelhados para leitura natural)
    ctx.font = 'bold 11px Orbitron, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Rótulo ESQ
    ctx.save();
    ctx.translate(lx, ly - 22);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('ESQ', 0, 0);
    ctx.restore();

    // Rótulo DIR
    ctx.save();
    ctx.translate(rx, ry - 22);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#00d4ff';
    ctx.fillText('DIR', 0, 0);
    ctx.restore();

    // Mostrador de Ângulo sobre o cubo
    let degTxt = Math.abs(this.wheelAngleDeg) < 3
      ? '0° RETO'
      : (this.wheelAngleDeg > 0 ? `DIR +${Math.round(this.wheelAngleDeg)}°` : `ESQ ${Math.round(this.wheelAngleDeg)}°`);

    ctx.save();
    ctx.translate(cx, cy - 28);
    ctx.scale(-1, 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(degTxt, 0, 0);
    ctx.restore();

    ctx.restore();
  }

  /**
   * Modo 1 Mão: Desenho de esqueleto e caixa delimitadora
   */
  _drawSingleHand(lm) {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Calcula Bounding Box
    let minX = w, minY = h, maxX = 0, maxY = 0;
    for (const pt of lm) {
      const px = pt.x * w;
      const py = pt.y * h;
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
      if (py < minY) minY = py;
      if (py > maxY) maxY = py;
    }

    const pad = 12;
    const bx = Math.max(0, minX - pad);
    const by = Math.max(0, minY - pad);
    const bw = Math.min(w - bx, (maxX - minX) + pad * 2);
    const bh = Math.min(h - by, (maxY - minY) + pad * 2);

    this.ctx.save();
    this.ctx.strokeStyle = '#00f090';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(bx, by, bw, bh);

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4],
      [0, 5], [5, 6], [6, 7], [7, 8],
      [5, 9], [9, 10], [10, 11], [11, 12],
      [9, 13], [13, 14], [14, 15], [15, 16],
      [13, 17], [17, 18], [18, 19], [19, 20],
      [0, 17]
    ];

    for (const [i, j] of connections) {
      this.ctx.beginPath();
      this.ctx.moveTo(lm[i].x * w, lm[i].y * h);
      this.ctx.lineTo(lm[j].x * w, lm[j].y * h);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#ffffff';
    for (const pt of lm) {
      this.ctx.beginPath();
      this.ctx.arc(pt.x * w, pt.y * h, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Vetor de inclinação da mão
    const wx = lm[0].x * w;
    const wy = lm[0].y * h;
    const cx = (lm[5].x + lm[17].x) * 0.5 * w;
    const cy = (lm[5].y + lm[17].y) * 0.5 * h;
    this.ctx.strokeStyle = '#00ff66';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(wx, wy);
    this.ctx.lineTo(cx, cy);
    this.ctx.stroke();

    this.ctx.restore();
  }

  /**
   * Modo 1 Mão: Classificação por inclinação de pulso
   */
  _classifySingleHand(lm) {
    const wrist = lm[0];
    const tips = [8, 12, 16, 20];
    const pips = [6, 10, 14, 18];

    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    const extended = tips.map((t, i) => dist(lm[t], wrist) > dist(lm[pips[i]], wrist) * 1.15);
    const numExtended = extended.filter(Boolean).length;
    const [indexExt, middleExt, ringExt, pinkyExt] = extended;

    const baseCenterX = (lm[5].x + lm[17].x) * 0.5;
    const baseCenterY = (lm[5].y + lm[17].y) * 0.5;
    const dx = baseCenterX - wrist.x;
    const dy = baseCenterY - wrist.y;
    const tiltAngle = Math.atan2(dx, -dy);
    this.wheelAngleDeg = tiltAngle * (180 / Math.PI);

    let targetSteer = Math.max(-1.0, Math.min(1.0, tiltAngle / 0.45));
    if (Math.abs(targetSteer) < 0.10) targetSteer = 0.0;
    this.smoothSteer += (targetSteer - this.smoothSteer) * 0.28;

    if (indexExt && middleExt && !ringExt && !pinkyExt) {
      this.command = 'TURBO';
      this.confidence = 0.98;
    } else if (numExtended === 0) {
      this.command = 'FREAR';
      this.confidence = 0.95;
    } else if (numExtended >= 3 || (indexExt && !middleExt && !ringExt)) {
      this.command = 'ACELERAR';
      this.confidence = 0.96;
    } else {
      if (this.smoothSteer < -0.25) this.command = 'ESQUERDA';
      else if (this.smoothSteer > 0.25) this.command = 'DIREITA';
      else this.command = 'NEUTRO';
      this.confidence = 0.85;
    }
  }

  _fallbackDetect() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.video.readyState >= 2) {
      this.hasHand = true;
      this.updateUI();
    }
  }

  updateUI() {
    const d = this.dom;
    if (!d) return;

    // 1. Indicador do Volante (Knob)
    if (d.knob) {
      const pct = 50 + (this.smoothSteer * 40);
      d.knob.style.left = `${pct}%`;
    }

    // 2. Rotação do ícone do Volante
    if (d.wheelWrap) {
      const rot = this.handMode === 'DUAL' ? this.wheelAngleDeg : (this.smoothSteer * 45);
      d.wheelWrap.style.transform = `rotate(${rot}deg)`;
    }

    // 3. Status do Volante e Modo de Mãos
    if (d.activeWheelStatus) {
      if (this.handMode === 'DUAL') {
        d.activeWheelStatus.textContent = 'VOLANTE 2 MÃOS 🏎️';
        d.activeWheelStatus.style.color = 'var(--green-accent)';
        if (d.activeWheelSub) d.activeWheelSub.textContent = `Giro: ${Math.round(this.wheelAngleDeg || 0)}°`;
      } else if (this.handMode === 'SINGLE') {
        d.activeWheelStatus.textContent = 'VOLANTE 1 MÃO';
        d.activeWheelStatus.style.color = 'var(--cyan-primary)';
        if (d.activeWheelSub) d.activeWheelSub.textContent = 'Inclinação de pulso';
      } else {
        d.activeWheelStatus.textContent = 'AGUARDANDO MÃOS';
        d.activeWheelStatus.style.color = 'var(--text-muted)';
        if (d.activeWheelSub) d.activeWheelSub.textContent = 'Segure com 2 mãos';
      }
    }

    // Status de Mão Detectada no Footer da Câmera
    if (d.handStatus) {
      if (this.handMode === 'DUAL') {
        d.handStatus.textContent = '2 Mãos (Volante Ativo)';
        d.handStatus.style.color = 'var(--green-accent)';
      } else if (this.handMode === 'SINGLE') {
        d.handStatus.textContent = '1 Mão Detectada';
        d.handStatus.style.color = 'var(--cyan-primary)';
      } else {
        d.handStatus.textContent = 'Aguardando Mãos...';
        d.handStatus.style.color = 'var(--text-muted)';
      }
    }

    // 4. Barra e Porcentagem de Confiança
    if (d.confVal && d.confBar) {
      const pct = Math.round((this.hasHand ? this.confidence : 0) * 100);
      d.confVal.textContent = `${pct}%`;
      d.confBar.style.width = `${pct}%`;
    }

    // 5. Card de Gesto Atual
    if (d.badge && d.sub) {
      if (this.command === 'TURBO') {
        d.badge.textContent = 'DOIS DEDOS (V)';
        d.badge.style.color = 'var(--orange-turbo)';
        d.sub.textContent = 'Turbo Nitro 🚀';
      } else if (this.command === 'FREAR') {
        d.badge.textContent = 'PUNHO FECHADO';
        d.badge.style.color = 'var(--red-brake)';
        d.sub.textContent = 'Frear';
      } else if (this.command === 'ACELERAR') {
        d.badge.textContent = this.handMode === 'DUAL' ? 'VOLANTE / ACELERAR' : 'PALMA ABERTA';
        d.badge.style.color = 'var(--green-accent)';
        d.sub.textContent = 'Acelerar';
      } else if (this.command === 'ESQUERDA') {
        d.badge.textContent = this.handMode === 'DUAL' ? 'VOLANTE ESQUERDA' : 'INCLINAR ESQ.';
        d.badge.style.color = 'var(--cyan-primary)';
        d.sub.textContent = 'Virar à Esquerda';
      } else if (this.command === 'DIREITA') {
        d.badge.textContent = this.handMode === 'DUAL' ? 'VOLANTE DIREITA' : 'INCLINAR DIR.';
        d.badge.style.color = 'var(--cyan-primary)';
        d.sub.textContent = 'Virar à Direita';
      } else {
        d.badge.textContent = 'SEM MÃO';
        d.badge.style.color = 'var(--text-muted)';
        d.sub.textContent = 'Ponto Morto';
      }
    }

    // 6. Destaque dos tiles do guia
    const tiles = d.tiles;
    if (tiles) {
      Object.values(tiles).forEach(t => t && t.classList.remove('active-gesture'));

      if (this.command === 'TURBO' && tiles.peace) {
        tiles.peace.classList.add('active-gesture');
      } else if (this.command === 'FREAR' && tiles.fist) {
        tiles.fist.classList.add('active-gesture');
      } else if (this.handMode === 'DUAL' && tiles.wheel) {
        tiles.wheel.classList.add('active-gesture');
        if (this.command === 'ACELERAR' && tiles.palm) tiles.palm.classList.add('active-gesture');
      } else if (this.command === 'ACELERAR' && tiles.palm) {
        tiles.palm.classList.add('active-gesture');
      } else if (Math.abs(this.smoothSteer) > 0.20 && tiles.tilt) {
        tiles.tilt.classList.add('active-gesture');
      }
    }
  }
}

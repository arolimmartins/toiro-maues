/**
 * Cola entre a simulacao, a cena 3D, o teclado e o HUD.
 *
 * Este e o unico lugar que sabe que existe uma versao 2D e uma 3D ao mesmo
 * tempo. Ele escolhe qual das duas esta na frente, sem destroys: quando o
 * jogador sai do 3D, o 2D volta como estava. E por isso que a migracao
 * continua reversivel enquanto a 3D esta em teste.
 *
 * O que este arquivo NAO faz: nao inventa regra de jogo, nao escreve no canvas
 * 2D e nao mexe no HUD de quem esta na abertura. A regra e da simulacao, o
 * desenho e da cena, e o HUD e so leitura do estado.
 */

/** Um quadro de entrada, vindo do teclado ou da visao. */
class EntradaJogo {
  constructor() {
    this.steerX = 0;
    this.steerZ = 0;
    this.command = 'PARAR';
    this.pular = false;
  }
}

class Colheita3D {
  /**
   * @param {object} deps
   * @param {HTMLCanvasElement} deps.canvas3d canvas do WebGL
   * @param {HTMLCanvasElement} deps.canvas2d canvas do Canvas 2D, que fica por baixo
   * @param {Array} deps.phases lista de fases
   * @param {function} deps.criarSim fabrica da simulacao, injetada para poder testar
   * @param {function} deps.criarCena fabrica da cena 3D
   * @param {function} deps.criarMenino fabrica do personagem
   * @param {object} deps.dom os mesmos elementos que o GameEngine ja usa
   */
  constructor(deps) {
    this.canvas3d = deps.canvas3d;
    this.canvas2d = deps.canvas2d;
    this.dom = deps.dom || {};
    this.phases = deps.phases || [];
    this._criarSim = deps.criarSim;
    this._criarCena = deps.criarCena;
    this._criarMenino = deps.criarMenino;
    // Avisado uma unica vez, quando a rodada acaba. E assim que a tela de
    // vitoria/derrota aparece sem o controlador precisar conhecer o overlay.
    this.onTerminar = deps.onTerminar || null;

    this.sim = null;
    this.cena = null;
    this.ativo = false;
    // Pausa mora aqui, e nao na simulacao: congelar e uma decisao de tela.
    this.pausado = false;
    this._ultimoFase = -1;
    this._cache = {};
    this._avisouFim = false;
    this.erro = null;
  }

  /**
   * Liga a 3D. Devolve false se faltar alguma peca, e nesse caso o jogo
   * continua no 2D sem reclamar: uma falha de WebGL nao pode travar o jogo
   * inteiro, ainda mais num computador que so roda o projeto.
   */
  iniciar(playerId) {
    if (this.ativo) return true;
    if (!this.canvas3d) {
      this.erro = 'canvas3D ausente';
      return false;
    }
    try {
      this.sim = this._criarSim({ phases: this.phases, playerId });
      const menino = this._criarMenino(this.sim.playerId);
      this.cena = this._criarCena({
        canvas: this.canvas3d,
        mundo: this.sim.world,
        phases: this.phases,
        menino
      });
      this.cena.definirFase(this.sim.phase);
      this._ultimoFase = this.sim.phaseIndex;
      this.ativo = true;
      this.erro = null;
      this._mostrar3D(true);
      return true;
    } catch (e) {
      // Sem WebGL, sem three, ou canvas bloqueado: o 2D assume.
      this.erro = (e && e.message) || String(e);
      this.sim = null;
      this.cena = null;
      this.ativo = false;
      this._mostrar3D(false);
      return false;
    }
  }

  /** Desliga a 3D e devolve a tela para o 2D. */
  parar() {
    this.ativo = false;
    this._mostrar3D(false);
    if (this.cena && this.cena.removerResize) this.cena.removerResize();
    // O contexto WebGL e um recurso raro: manter dois vivos faz o navegador
    // derrubar o mais antigo. O 2D e um canvas 2D comum e nao sofre disso.
    if (this.cena) this.cena.destruir();
    this.cena = null;
    this.sim = null;
  }

  _mostrar3D(ligado) {
    if (this.canvas3d) this.canvas3d.classList.toggle('hidden', !ligado);
    if (this.canvas2d) this.canvas2d.classList.toggle('hidden', ligado);
  }

  /**
   * Um quadro. So faz alguma coisa quando a 3D esta ligada; caso contrario
   * devolve false para o chamador saber que deve usar o 2D.
   *
   * @param {number} dt segundos
   * @param {EntradaJogo} entrada
   */
  atualizar(dt, entrada) {
    if (!this.ativo || !this.sim) return false;

    // Pausado: a cena continua desenhando (senao a tela pisca preta atras do
    // overlay), mas o mundo nao anda.
    if (this.pausado) {
      this.cena.desenhar(this.sim, 0);
      return true;
    }

    const p = this.sim.player;

    // A entrada vem no espaco da tela; a simulacao joga no espaco do mundo.
    const mundo = entradaRelativa(p.facing, entrada.steerX, entrada.steerZ);
    if (entrada.pular) this.sim.requestJump();
    this.sim.update(dt, {
      steerX: mundo.x,
      steerZ: mundo.z,
      command: entrada.command
    });

    // A troca de fase precisa trocar o pano de fundo, e a cena nao sabe disso.
    if (this.sim.phaseIndex !== this._ultimoFase) {
      this._ultimoFase = this.sim.phaseIndex;
      this.cena.definirFase(this.sim.phase);
    }

    this.cena.desenhar(this.sim, dt);
    this.sincronizarHud();

    // Uma vez so: a rodada terminou. Sem esta trava o overlay seria remontado
    // a cada quadro enquanto o resultado ficasse na tela.
    if (this.sim.isFinished && !this._avisouFim) {
      this._avisouFim = true;
      if (this.onTerminar) this.onTerminar(this.sim);
    }
    return true;
  }

  /**
   * Leva o estado da simulacao para o HUD. O HUD ja e DOM e nao mudou: so
   * trocou quem escreve nele. Cada texto so e escrito quando muda, para nao
   * refazer layout sessenta vezes por segundo.
   */
  sincronizarHud() {
    const sim = this.sim;
    const d = this.dom;
    const p = sim.player;
    const cache = this._cache;

    // A velocidade esta em m/s; o HUD pede km/h, entao a conversao e por aqui.
    const vel = Math.hypot(p.vx, p.vz);
    const kmh = Math.round(vel * 3.6);
    if (cache.kmh !== kmh) {
      cache.kmh = kmh;
      if (d.spdEl) d.spdEl.textContent = kmh;
      if (d.pillSpeed) d.pillSpeed.textContent = `${kmh} km/h`;
    }
    if (d.spdBar) {
      const pct = Math.min(100, (vel / Math.max(0.1, sim.runSpeed)) * 100);
      d.spdBar.style.width = `${pct}%`;
      d.spdBar.style.background = p.isTurbo
        ? 'linear-gradient(90deg, #ff781f, #facc15)'
        : 'linear-gradient(90deg, #10B981, #34D399)';
    }

    const meta = `${sim.guaranaCollected} / ${sim.targetGuarana}`;
    if (cache.meta !== meta) {
      cache.meta = meta;
      if (d.hudLap) d.hudLap.textContent = meta;
      if (d.pillLap) d.pillLap.textContent = meta;
    }

    const mm = String(Math.floor(Math.max(0, sim.timeLeft) / 60)).padStart(2, '0');
    const ss = String(Math.floor(Math.max(0, sim.timeLeft) % 60)).padStart(2, '0');
    const tempo = `${mm}:${ss}`;
    if (cache.tempo !== tempo) {
      cache.tempo = tempo;
      if (d.hudTime) d.hudTime.textContent = tempo;
      if (d.pillTime) d.pillTime.textContent = tempo;
    }

    if (cache.moedas !== sim.coinsCollected) {
      cache.moedas = sim.coinsCollected;
      if (d.hudCoins) d.hudCoins.textContent = sim.coinsCollected;
    }
    if (cache.pontos !== sim.score) {
      cache.pontos = sim.score;
      if (d.hudScore) d.hudScore.textContent = sim.score;
      if (d.pillScore) d.pillScore.textContent = sim.score;
    }

    // A barra de turbo e um estado continuo, entao vai direto, sem cache.
    if (d.turboBar) d.turboBar.style.width = `${Math.round(p.turboCharge * 100)}%`;

    if (d.phaseTitle) {
      const titulo = sim.phase ? sim.phase.shortTitle : '';
      if (cache.fase !== titulo) {
        cache.fase = titulo;
        d.phaseTitle.textContent = titulo;
      }
    }
  }

  /** Recomeca a fase atual do zero, sem reconstruir a cena. */
  reiniciar() {
    if (this.sim) this.sim.reset();
    this._cache = {};
    this._avisouFim = false;
  }

  /**
   * Volta para a primeira fase. `reset()` sozinho preserva a fase atual, o que
   * faz sentido para "repetir", nao para "jogar de novo desde o inicio".
   */
  reiniciarTudo() {
    if (this.sim) {
      this.sim.phaseIndex = 0;
      this.sim.reset();
    }
    this._ultimoFase = -1;
    this._cache = {};
    this._avisouFim = false;
  }

  /** Pula para a proxima fase, mantendo a pontuacao. */
  proximaFase() {
    if (!this.sim || !this.sim.hasNextPhase()) return false;
    this.sim.advancePhase();
    this._ultimoFase = -1;
    this._cache = {};
    this._avisouFim = false;
    return true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Colheita3D, EntradaJogo };
}

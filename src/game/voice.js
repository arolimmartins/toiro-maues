/**
 * Voz do Arara
 *
 * A fala do papagaio tem tres camadas, na ordem de preferencia:
 *
 *   1. CLIPE GRAVADO  - audio neural pré-gerado em assets/voice (voz humana).
 *   2. SINTESE WEB    - speechSynthesis do proprio sistema, quando existir.
 *   3. ANIMACAO PURA  - sem audio nenhum: o bico continua se movendo no tempo
 *                       estimado da frase.
 *
 * O clipe e o que manda quando existe. Alem de soar humano, ele traz dois
 * dados que a sintese nao tem: a duracao exata e o instante de cada frase,
 * o que deixa o texto da caixa escrito no mesmo ritmo da fala. E o bico e
 * movido pela amplitude real do audio (AnalyserNode), nao por um tremor fixo.
 *
 * Os clipes sao versionados no projeto, entao o jogo roda offline: a geracao
 * (tools/gerar-voz.py) e uma etapa de desenvolvimento, nao uma dependencia.
 */
class ParrotVoice {
  constructor(options = {}) {
    const opts = options || {};
    this.basePath = opts.basePath || 'assets/voice/';
    this.lang = opts.lang || 'pt-BR';
    this.rate = opts.rate === undefined ? 1.06 : opts.rate;
    this.pitch = opts.pitch === undefined ? 1.5 : opts.pitch;
    this.volume = opts.volume === undefined ? 1 : opts.volume;
    this.charsPerSecond = opts.charsPerSecond || 15;

    this.enabled = opts.enabled !== false;
    this.muted = false;
    this.available = false;
    this.reason = '';

    this.voice = null;
    this.utterance = null;
    this.speaking = false;
    this.synthetic = false;
    this.source = 'nenhuma';

    this.text = '';
    this.time = 0;
    this.duration = 0;
    this.intensity = 0;
    this.phase = Math.random() * 100;
    this.syllable = 0;

    this.clips = [];
    this.manifestLoaded = false;
    this.voiceLabel = '';

    this._clip = null;
    this._el = null;
    this._actx = null;
    this._analyser = null;
    this._buf = null;
    this._graphReady = false;
    this._unlocked = false;
    this._level = 0;

    this._detectApi();
  }

  _detectApi() {
    const w = typeof window !== 'undefined' ? window : null;
    this.synth = w ? (w.speechSynthesis || w.webkitSpeechSynthesis || null) : null;
    if (!this.synth) {
      this.available = false;
      this.reason = 'sem API de sintese';
      return;
    }
    this.available = true;
    this.reason = 'sintese disponivel';
    this._pickVoice();
    if (!this.voice) {
      const bind = () => this._pickVoice();
      if (typeof this.synth.addEventListener === 'function') {
        this.synth.addEventListener('voiceschanged', bind);
      } else {
        this.synth.onvoiceschanged = bind;
      }
      this._retryVoices = 0;
    }
  }

  /** Executa sem travar a narrativa mesmo se a listagem de vozes falhar. */
  _pickVoice() {
    let voices = [];
    try {
      voices = this.synth.getVoices() || [];
    } catch (e) {
      voices = [];
    }
    if (!voices.length) return false;

    const score = (v) => {
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      let s = 0;
      if (lang.startsWith('pt-br')) s += 100;
      else if (lang.startsWith('pt')) s += 70;
      else if (lang.startsWith('es')) s += 20;
      if (v.localService) s += 10;
      if (v.default) s += 5;
      const name = (v.name || '').toLowerCase();
      if (/maria|luciana|daniel|felipe|google|paulina|antonio/.test(name)) s += 8;
      if (/female| feminine| woman/.test(name)) s += 3;
      return s;
    };

    let best = null;
    let bestScore = -1;
    for (const v of voices) {
      const s = score(v);
      if (s > bestScore) { bestScore = s; best = v; }
    }
    this.voice = best;
    this.reason = best ? `voz: ${best.name} (${best.lang})` : 'sintese sem voz';
    return true;
  }

  /**
   * Carrega os clipes gravados.
   *
   * Vem de voice-clips.js (JS global), e nao de fetch: o app e aberto por
   * file:// e o Chromium bloqueia fetch/XHR nesse esquema. Sem o arquivo, o
   * jogo so perde a voz humana e cai para sintese/animacao.
   */
  async loadManifest() {
    if (this.manifestLoaded) return false;
    this.manifestLoaded = true;
    const lista = typeof VOICE_CLIPS !== 'undefined' ? VOICE_CLIPS : null;
    if (!lista || !lista.length) {
      this.reason = 'sem clipes gravados';
      if (typeof console !== 'undefined') {
        console.warn('Voz do arara: src/game/voice-clips.js ausente, usando sintese.');
      }
      return false;
    }
    this.setClips(lista, typeof VOICE_META !== 'undefined' ? VOICE_META : null);
    return true;
  }

  setClips(clips, meta) {
    this.clips = (clips || []).map((c) => ({
      arquivo: c.arquivo,
      src: this.basePath + c.arquivo,
      indiceCena: c.indiceCena,
      duracao: Number(c.duracao) || 0,
      texto: c.texto || '',
      marcas: Array.isArray(c.marcas) ? c.marcas : []
    }));
    this.voiceLabel = meta && meta.voz ? meta.voz : this.voiceLabel;
  }

  clipFor(sceneIndex, text) {
    for (const c of this.clips) {
      if (c.indiceCena !== sceneIndex) continue;
      // So usa o clipe se for exatamente a frase que esta na tela.
      if (text && c.texto && c.texto !== text) continue;
      return c;
    }
    return null;
  }

  /** Monta o grafo Web Audio uma vez, para medir a amplitude da voz real. */
  _ensureGraph() {
    if (this._graphReady) return true;
    const w = typeof window !== 'undefined' ? window : null;
    const AC = w ? (w.AudioContext || w.webkitAudioContext) : null;
    if (!AC || !this._el) return false;
    try {
      this._actx = new AC();
      const srcNode = this._actx.createMediaElementSource(this._el);
      this._analyser = this._actx.createAnalyser();
      this._analyser.fftSize = 512;
      this._analyser.smoothingTimeConstant = 0.55;
      this._buf = new Uint8Array(this._analyser.fftSize);
      srcNode.connect(this._analyser);
      this._analyser.connect(this._actx.destination);
      this._graphReady = true;
      return true;
    } catch (e) {
      this._analyser = null;
      return false;
    }
  }

  _resumeAudio() {
    if (this._actx && this._actx.state === 'suspended' && this._actx.resume) {
      this._actx.resume();
    }
  }

  /** RMS do audio em curso, normalizado em 0..1. */
  _readLevel() {
    if (!this._analyser || !this._buf) return 0;
    try {
      this._analyser.getByteTimeDomainData(this._buf);
    } catch (e) {
      return 0;
    }
    let soma = 0;
    for (let i = 0; i < this._buf.length; i++) {
      const v = (this._buf[i] - 128) / 128;
      soma += v * v;
    }
    const rms = Math.sqrt(soma / this._buf.length);
    return Math.min(1, rms * 3.4);
  }

  _ensureElement() {
    if (this._el) return this._el;
    const w = typeof window !== 'undefined' ? window : null;
    if (!w || typeof w.Audio !== 'function') return null;
    try {
      this._el = new w.Audio();
      this._el.preload = 'auto';
      this._el.crossOrigin = 'anonymous';
    } catch (e) {
      this._el = null;
    }
    return this._el;
  }

  _playClip(clip) {
    const el = this._ensureElement();
    if (!el) return false;
    this._ensureGraph();
    return new Promise((resolve) => {
      let settled = false;
      const done = (ok) => {
        if (settled) return;
        settled = true;
        el.onended = null;
        el.onerror = null;
        resolve(ok);
      };
      el.onended = () => done(true);
      el.onerror = () => done(false);
      try {
        el.src = clip.src;
        el.currentTime = 0;
        this._resumeAudio();
        const p = el.play();
        if (p && typeof p.then === 'function') p.then(() => done(true), () => done(false));
        else done(true);
      } catch (e) {
        done(false);
      }
    });
  }

  _stopClip() {
    if (!this._el) return;
    this._el.onended = null;
    this._el.onerror = null;
    try {
      this._el.pause();
      this._el.currentTime = 0;
    } catch (e) { /* elemento ja liberado */ }
  }

  /** Duracao estimada, para a cena nao cortar a fala no meio. */
  estimateDuration(text) {
    if (!text) return 0;
    return Math.max(1.6, (String(text).length / (this.charsPerSecond * this.rate)) + 0.5);
  }

  setMuted(muted) {
    this.muted = !!muted;
    if (this._el) this._el.muted = this.muted;
    if (this.muted) this.stop();
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    if (!this.enabled) this.stop();
    return this.enabled;
  }

  toggle() {
    return this.setEnabled(!this.enabled);
  }

  get statusLabel() {
    if (!this.enabled) return 'VOZ DESLIGADA [F]';
    if (this.muted) return 'VOZ (MUDO) [M]';
    if (this.speaking) return 'ARARA FALANDO';
    if (this.clips.length) return 'VOZ DO ARARA [F]';
    return this.available ? 'VOZ SINTETICA [F]' : 'VOZ ANIMADA [F]';
  }

  /**
   * Fala o texto. Tenta o clipe gravado, cai para sintese e depois so animacao.
   * @param {string} text frase que esta na tela
   * @param {number} [sceneIndex] indice da cena, usado para achar o clipe
   * @returns {boolean} true se comecou a falar/animar
   */
  speak(text, sceneIndex) {
    if (!this.enabled || this.muted) return false;
    const clean = String(text || '').trim();
    if (!clean) return false;

    this.stop();
    this.text = clean;
    this.time = 0;

    const clip = this.clipFor(sceneIndex, clean);
    if (clip && this._ensureElement()) {
      this._clip = clip;
      this.duration = clip.duracao || this.estimateDuration(clean);
      this.speaking = true;
      this.synthetic = false;
      this.source = 'clipe';
      this._playClip(clip).then((ok) => {
        // O clipe falhou: assume a sintese sem deixar o bico parado.
        if (!ok && this.speaking && this._clip === clip) this._fallbackToSpeech(clean);
      });
      return true;
    }

    this._fallbackToSpeech(clean);
    return true;
  }

  _fallbackToSpeech(clean) {
    this._stopClip();
    this._clip = null;
    this.synthetic = true;
    this.speaking = true;
    this.time = 0;
    this.duration = this.estimateDuration(clean);

    if (this.available) {
      try {
        const utter = new SpeechSynthesisUtterance(clean);
        utter.lang = this.lang;
        utter.rate = this.rate;
        utter.pitch = this.pitch;
        utter.volume = this.volume;
        if (this.voice) utter.voice = this.voice;
        utter.onstart = () => { this.synthetic = false; this.source = 'sintese'; };
        utter.onend = () => { this._finish(); };
        // Se a fala nunca comecou (autoplay bloqueado, voz ausente no sistema),
        // mantem a animacao ate o fim em vez de calar o bico.
        utter.onerror = () => {
          if (this.synthetic) { this.utterance = null; return; }
          this._finish();
        };
        this.utterance = utter;
        this.synth.cancel();
        this.synth.speak(utter);
        return;
      } catch (e) {
        this.utterance = null;
      }
    } else if (this._retryVoices !== undefined && this._retryVoices < 3) {
      this._retryVoices++;
      this._pickVoice();
    }
    this.source = 'animacao';
  }

  /**
   * Quantos caracteres da frase ja foram falados no instante t.
   * Usa as marcas reais do clipe e interpola entre elas.
   */
  charsAt(t) {
    const m = this._clip && this._clip.marcas;
    if (!m || !m.length) return 0;
    if (t <= m[0].t) return 0;
    for (let i = 1; i < m.length; i++) {
      if (t <= m[i].t) {
        const a = m[i - 1];
        const b = m[i];
        const k = (t - a.t) / Math.max(0.001, b.t - a.t);
        return a.ate + (b.ate - a.ate) * k;
      }
    }
    return m[m.length - 1].ate;
  }

  get progress() {
    if (!this.duration) return 0;
    return Math.min(1, this.time / this.duration);
  }

  _finish() {
    this.speaking = false;
    this.utterance = null;
    this._clip = null;
    this._level = 0;
  }

  stop() {
    if (this.synth) {
      try { this.synth.cancel(); } catch (e) { /* ambiente sem suporte */ }
    }
    this._stopClip();
    this.utterance = null;
    this.speaking = false;
    this.synthetic = false;
    this.source = 'nenhuma';
    this.text = '';
    this.duration = 0;
    this.time = 0;
    this.intensity = 0;
    this._level = 0;
    this._clip = null;
  }

  /**
   * Destrava a sintese no primeiro gesto do usuario.
   * O Chromium/Electron bloqueia fala iniciada sem gesto; sem isso a primeira
   * fala seria descartada. O workaround padrao eprime o motor com um
   * utterance mudo e resume a fila. O clipe gravado ja nao sofre com isso.
   */
  unlock() {
    this._resumeAudio();
    if (!this.synth || this._unlocked) return false;
    this._unlocked = true;
    try {
      this.synth.cancel();
      if (typeof this.synth.resume === 'function') this.synth.resume();
      if (typeof SpeechSynthesisUtterance === 'function') {
        const warm = new SpeechSynthesisUtterance(' ');
        warm.volume = 0;
        warm.lang = this.lang;
        this.synth.speak(warm);
      }
    } catch (e) {
      return false;
    }
    return true;
  }

  update(dt) {
    if (!this.enabled || this.muted) {
      this.intensity = 0;
      return this.intensity;
    }

    if (this.speaking) {
      this.time += dt;
      if (this._clip) {
        this._level = this._readLevel();
        // Guarda contra metadados desatualizados no manifesto.
        if (this._el && isFinite(this._el.duration) && this._el.duration > 0) {
          this.duration = this._el.duration;
        }
        if (this.time >= this.duration + 0.35) this._finish();
      } else if (this.synthetic && this.time >= this.duration) {
        this._finish();
      }
    }

    let target;
    if (this.speaking && this._clip) {
      // Bico movido pela amplitude real da voz.
      target = this._level;
    } else if (this.speaking) {
      // Envelope de silabas: duas senoides defasadas dao o vaivem da fala.
      const wobble = Math.sin(this.time * 16.5 + this.phase) * 0.62 + Math.sin(this.time * 7.1 + this.phase * 1.7) * 0.38;
      target = 0.34 + 0.66 * Math.max(0, wobble);
    } else {
      target = 0;
    }

    // Sobe rapido e desce mais devagar: articulacao ePIF.
    const k = Math.min(1, dt * (target > this.intensity ? 26 : 12));
    this.intensity += (target - this.intensity) * k;
    if (this.intensity < 0.01) this.intensity = 0;
    this.syllable = Math.floor(this.time * 9);
    return this.intensity;
  }
}

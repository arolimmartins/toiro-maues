/**
 * Renderizador 3D da Colheita do Guarana.
 *
 * Este arquivo so DESENHA. Ele nao inventa regra de jogo: le o estado que a
 * simulacao pura (src/game/harvest_sim.js) ja decidiu e desenha aquele estado.
 * Isso mantem a migracao reversivel — se este arquivo for removido, o
 * simulador continua inteiro e testavel sem nenhuma dependencia de WebGL.
 *
 * Unidades: metros e segundos, igual a simulacao. O chao e y = 0.
 *
 * Por que a camera e de terceira pessoa orbital e nao isometrica como a 2D:
 * com o personagem andando nas duas direcoes do plano XZ, uma camera presa a um
 * angulo fixo esconde o que tem atras dele. A camera segue por tras do menino
 * e mantem o horizonte de referencia das fotos de cada fase.
 *
 * Three.js e a versao local (assets/libs/three.min.js, r128), entao:
 *   - nao existe CapsuleGeometry:capsula e cilindro mais duas esferas;
 *   - nao existe outputColorSpace: o equivalente antigo e outputEncoding.
 */

const HARVEST3D_PALETA = {
  ceu: 0x8fd0e8,
  chao: 0x3d7a37,
  chaoEscuro: 0x2c5a28,
  sombra: 0x1a3a1c,
  luzQuente: 0xfff3d6,
  luzAmbiente: 0x6fa8c8,
  chaoPorFase: [0x3d7a37, 0x4a7a4e, 0x2f6f5e, 0x5b8a3a, 0x4f6f45, 0x6a7a3a, 0x2f6f6e, 0x2a5f3a, 0x6a6a2f]
};

/**
 * Tabela de eventos da simulacao para efeitos visuais. Fica aqui, e nao no
 * renderizador, para que a simulacao nunca dependa de estilo.
 */
const HARVEST3D_EFEITOS = {
  jump: 'salto',
  land: 'pouso',
  pickup: 'brilho',
  hurt: 'folha',
  comboLost: 'faisca',
  miss: 'faisca',
  turboGain: 'brilho',
  leafSafe: 'brilho',
  phaseVictory: 'confete'
};

/** Fases semGuarana ganham cor de chao propria, para nao ficarem iguais. */
const HARVEST3D_FASE_CHAO = {
  3: 0x2f6f5e,
  6: 0x6a7a3a,
  7: 0x2f6f6e
};

/**
 * Converte a entrada do jogador, que vive no espaco da CAMERA, para o espaco do
 * mundo. Sem isso, apertar W andaria para o lado assim que o menino virasse.
 *
 * A camera fica atras do menino, entao "frente" e o rumo para onde ele esta
 * virado, e "direita" e esse rumo girado 90 graus. E por isso que isto precisa
 * do `facing`: e a unica forma de o botao continuar sendo "para a frente" para
 * quem esta olhando a tela.
 *
 * @param {number} facing rumo do menino, em radianos
 * @param {number} steerX -1 (esquerda) .. 1 (direita) na tela
 * @param {number} steerZ -1 (para tras) .. 1 (frente) na tela
 */
function entradaRelativa(facing, steerX, steerZ) {
  const fx = Math.sin(facing);
  const fz = Math.cos(facing);
  // Rotaciona o rumo 90 graus para a direita, no plano XZ.
  const rx = Math.cos(facing);
  const rz = -Math.sin(facing);
  return { x: steerZ * fx + steerX * rx, z: steerZ * fz + steerX * rz };
}

/**
 * @param {object} THREE o namespace global do three.min.js
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas canvas que recebe o WebGL
 * @param {Array} opts.phases lista de fases (HARVEST_PHASES)
 * @param {function} opts.onPickup avisado quando o HUD precisa de reagir
 */
function criarHarvest3D(THREE, opts = {}) {
  const canvas = opts.canvas;
  if (!canvas) throw new Error('harvest3d: falta o canvas');
  if (!THREE) throw new Error('harvest3d: three.min.js nao foi carregado antes');

  // --- Infraestrutura WebGL ------------------------------------------------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // r128 usa outputEncoding. Em Three novo isto virou outputColorSpace.
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(52, 2, 0.1, 400);

  // --- Luzes ---------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xd8f0ff, HARVEST3D_PALETA.chaoEscuro, 0.72);
  scene.add(hemi);

  const sol = new THREE.DirectionalLight(HARVEST3D_PALETA.luzQuente, 0.95);
  sol.position.set(9, 17, 11);
  sol.castShadow = true;
  sol.shadow.mapSize.width = 1024;
  sol.shadow.mapSize.height = 1024;
  sol.shadow.camera.near = 1;
  sol.shadow.camera.far = 70;
  sol.shadow.camera.left = -20;
  sol.shadow.camera.right = 20;
  sol.shadow.camera.top = 20;
  sol.shadow.camera.bottom = -20;
  scene.add(sol);
  scene.add(sol.target);

  // Luz de preenchimento vinda de tras, para o menino nao virar silhueta preta.
  const contraluz = new THREE.DirectionalLight(0x9fd8ff, 0.32);
  contraluz.position.set(-8, 9, -12);
  scene.add(contraluz);

  // --- Chao ----------------------------------------------------------------
  const chaoMat = new THREE.MeshLambertMaterial({ color: HARVEST3D_PALETA.chao });
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), chaoMat);
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  scene.add(chao);

  // Grades no chao: dao medida de distancia, que e exatamente o que faltava na
  // versao 2D para o jogador saber onde esta em relacao ao campo.
  const grade = new THREE.GridHelper(60, 30, 0xffffff, 0xffffff);
  grade.material.transparent = true;
  grade.material.opacity = 0.16;
  grade.position.y = 0.01;
  scene.add(grade);

  // --- Fondo da fase -------------------------------------------------------
  // Uma foto grande atras da acao, como pano de fundo de palco. E o que mantem
  // cada uma das nove fases reconhecivel sem sair do WebGL.
  const fundoMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const fundo = new THREE.Mesh(new THREE.PlaneGeometry(84, 47), fundoMat);
  fundo.position.set(0, 16, -34);
  scene.add(fundo);

  // Neblina leve, para o fundo nao brigar com a acao em primeiro plano.
  scene.fog = new THREE.Fog(0x9fd6e8, 42, 118);

  // --- Conteudo ---------------------------------------------------------
  const raiz = new THREE.Group();
  scene.add(raiz);

  /** Piscas reaproveitadas, porque criar malha a cada quadro vaza memoria. */
  const piscar = [];
  function piscando(cor, tam) {
    let i = piscar.findIndex((p) => p.restante <= 0);
    if (i < 0) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: cor }));
      m.visible = false;
      raiz.add(m);
      piscar.push({ malha: m, restante: 0 });
      i = piscar.length - 1;
    }
    const p = piscar[i];
    p.malha.material.color.set(cor);
    p.malha.scale.setScalar(tam / 0.2);
    p.malha.visible = true;
    p.restante = 0.55;
    return p;
  }

  function atualizarPiscar(dt) {
    for (const p of piscar) {
      if (p.restante <= 0) continue;
      p.restante -= dt;
      // Cresce e desvanece. Sem alfa, encolhe ate sumir, que e o truque mais barato.
      p.malha.scale.multiplyScalar(1 + dt * 2.2);
      if (p.restante <= 0) p.malha.visible = false;
    }
  }

  // --- Estado de camera ----------------------------------------------------
  const cam = { x: 0, z: 8.5, y: 6.4, dist: 9.4, ang: 0, alto: 4.6 };
  let pronto = false;
  let relogio = 0;

  // --- API -----------------------------------------------------------------
  const api = {
    scene,
    camera,
    renderer,

    /**
     * Deixa o mundo do tamanho da simulacao. O mundo e quem manda nos limites:
     * se a area visivel for maior que o campo, o jogador ve o vazio alem da
     * borda e pensa que dá para fugir.
     */
    configurarMundo(mundo) {
      const larg = mundo.maxX - mundo.minX;
      const prof = mundo.maxZ - mundo.minZ;
      const centroZ = (mundo.maxZ + mundo.minZ) / 2;
      chao.scale.setScalar(1);
      chaoMat.color.set(HARVEST3D_PALETA.chao);
      grade.scale.set(larg / 60, prof / 60, 1);
      grade.position.set(0, 0.01, centroZ);
      cam.dist = Math.max(8.5, Math.max(larg, prof) * 0.62);
      cam.alto = 4.4;
      api.mundo = mundo;
    },

    /**
     * Troca o pano de fundo da fase. O THREE.TextureLoader e o jeito certo:
     * deixa a imagem na GPU e o primeiro quadro pode chegar antes dela.
     */
    definirFase(fase) {
      if (!fase) return;
      const corChao = HARVEST3D_FASE_CHAO[fase.id] || HARVEST3D_PALETA.chaoPorFase[(fase.id - 1) % 9];
      chaoMat.color.set(corChao);
      if (fase.bg) {
        new THREE.TextureLoader().load(fase.bg, (tex) => {
          // A foto e mais larga que alta, entao o plano acompanha sem distorcer.
          tex.encoding = THREE.sRGBEncoding;
          fundoMat.map = tex;
          fundoMat.color.set(0xffffff);
          fundoMat.needsUpdate = true;
        });
      } else {
        fundoMat.map = null;
        fundoMat.color.set(0x9fd6e8);
        fundoMat.needsUpdate = true;
      }
    },

    /**
     * Desenha um quadro. `sim` e a simulacao pura; aqui so se le o estado.
     * @param {HarvestSim} sim
     * @param {number} dt segundos
     */
    desenhar(sim, dt) {
      relogio += dt;
      const p = sim.player;
      if (!p) return;

      // Personagem: posicao vira posicao, direcao vira rotacao em Y.
      if (api.menino) {
        api.menino.group.position.set(p.x, p.y, p.z);
        api.menino.group.rotation.y = p.facing;
        animarMenino(api.menino.parts, p.state, p.walkPhase, {
          tempo: relogio,
          turbo: p.isTurbo,
          hurtT: p.hurtTimer
        });
        // A cesta so existe depois do primeiro guarana, e enche com a proporcao.
        atualizarCesta(api.menino, p.basketFruit, sim.targetGuarana);
      }

      // Itens: um no por item, reaproveitado entre quadros.
      const n = sim.items.length;
      while (api.itens.length < n) {
        const g = new THREE.Group();
        const corpo = new THREE.Mesh(
          new THREE.SphereGeometry(0.34, 12, 10),
          new THREE.MeshLambertMaterial({ color: 0x8b1a2b })
        );
        corpo.castShadow = true;
        g.add(corpo);
        // O fruto do guarana tem listras escuras: e o que o diferencia de uma bola.
        const anel = new THREE.Mesh(
          new THREE.TorusGeometry(0.34, 0.05, 6, 14),
          new THREE.MeshLambertMaterial({ color: 0x2a0a0d })
        );
        anel.rotation.x = Math.PI / 2;
        g.add(anel);
        raiz.add(g);
        api.itens.push(g);
      }
      for (let i = 0; i < api.itens.length; i++) {
        const g = api.itens[i];
        const it = sim.items[i];
        g.visible = !!it;
        if (!it) continue;
        g.position.set(it.x, it.y, it.z);
        g.rotation.y = it.spin;
        g.rotation.x = it.spin * 0.6;
        g.scale.setScalar(it.radius / 0.47);
        // Cor por tipo, para o jogador distinguir guarana de moeda e folha.
        const cor = (ITEM_TYPES[it.type] || ITEM_TYPES.guarana).color;
        g.children[0].material.color.set(cor);
        g.children[1].visible = it.type === 'guarana';
      }

      // Efeitos da simulacao viram piscas no mundo.
      for (const ev of sim.drainEvents()) {
        if (ev.type === 'hurt') piscando(0x2f7a3a, 1.2);
        else if (ev.type === 'pickup' || ev.type === 'turboGain' || ev.type === 'leafSafe') piscando(0xffe27a, 0.9);
        else if (ev.type === 'comboLost' || ev.type === 'miss') piscando(0xff9a3c, 0.7);
        else if (ev.type === 'land' && ev.x !== undefined) piscando(0xffffff, 1.4);
      }
      atualizarPiscar(dt);

      // Camera orbital: fica atras do menino, olhando para frente dele. Como
      // ele anda em todas as direcoes, seguir o rumo e o unico jeito de a
      // camera nunca mostrar as costas dele como se fossem a frente.
      const fx = Math.sin(p.facing);
      const fz = Math.cos(p.facing);
      const desejadoX = p.x - fx * cam.dist;
      const desejadoZ = p.z - fz * cam.dist;
      if (!pronto) {
        cam.x = desejadoX;
        cam.z = desejadoZ;
        pronto = true;
      } else {
        // Suavizacao exponencial: independente da taxa de quadros.
        const k = 1 - Math.exp(-dt * 5.5);
        cam.x += (desejadoX - cam.x) * k;
        cam.z += (desejadoZ - cam.z) * k;
      }
      camera.position.set(cam.x, p.y + cam.alto, cam.z);
      camera.lookAt(p.x, p.y + 1.0, p.z);
      sol.target.position.set(p.x, 0, p.z);
      sol.position.set(p.x + 9, 17, p.z + 11);

      // Enquadra a area util quando a fase e mais larga que a janela.
      const aspecto = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      camera.aspect = aspecto;
      camera.fov = aspecto < 1.2 ? 62 : 52;
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);
    },

    /** Libera GPU. Chamar ao trocar de tela, senao o contexto se perde. */
    destruir() {
      renderer.dispose();
    }
  };

  api.itens = [];
  api.mundo = opts.mundo || null;
  api.menino = opts.menino || null;

  // O grupo do menino precisa entrar na cena. Ele ja vinha montado, com os
  // filhos e a cesta, e o teste com o Three falso nao pegava esta falta: o
  // `add` falso nao guardava nada, entao o menino podia estar posicionado,
  // animado e invisivel ao mesmo tempo.
  if (api.menino && api.menino.group) scene.add(api.menino.group);

  // Se o mundo ja veio pronto, ja deixa o chao do tamanho certo.
  if (api.mundo) api.configurarMundo(api.mundo);

  function redimensionar() {
    const l = canvas.clientWidth || canvas.width || 960;
    const a = canvas.clientHeight || canvas.height || 520;
    renderer.setSize(l, a, false);
  }
  api.redimensionar = redimensionar;
  api.redimensionar();

  // O guard e duplo de proposito: fora do navegador (worker, teste) nao ha quem
  // escutar o resize, e o canvas nunca muda de tamanho ali.
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('resize', redimensionar);
    api.removerResize = () => window.removeEventListener('resize', redimensionar);
  }

  return api;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { criarHarvest3D, entradaRelativa, HARVEST3D_PALETA, HARVEST3D_EFEITOS, HARVEST3D_FASE_CHAO };
}

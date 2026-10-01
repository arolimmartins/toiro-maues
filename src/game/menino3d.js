/**
 * O Menino Guaraná em 3D — malha e animacao, montados por codigo.
 *
 * Nao existe um modelo .glb do menino no projeto, entao o personagem e
 * montado com primitivas. O que guia a aparencia e a vestimenta e o proprio
 * jogo: as cores do guarana, o mesmo vocabulario que o papagaio e a
 * arara-caninde ja usam.
 *
 * O arquivo e escrito em duas camadas de proposito:
 *
 *   1. MENINO_RIG e MENINO_ESTILO sao DADOS puros. Nao dependem de Three.js,
 *      entao os testes consegue conferir a ossada, as cores e a cesta sem
 *      WebGL nem GPU.
 *   2. buildMeninoGuarana(THREE) transforma esses dados em geometria, e
 *      animarMenino(...) move as partes.
 *
 * A Three.js do projeto e a r128 (2021), que ainda nao tem CapsuleGeometry
 * (r140+) nem outputColorSpace (r152+). As capsulas daqui sao cilindro mais
 * duas esferas, e quem escolhe o encoding e o renderizador, nao este arquivo.
 */

/** Cores do guarana e da vestimenta, em hexadecimal. */
const MENINO_ESTILO = {
  pele: 0xc98a5e,
  peleSombra: 0xa96b43,
  cabelo: 0x2a1a12,
  camisa: 0xc6202b,        // vermelho do caroço do guarana
  camisaEscura: 0x8c121c,
  calcao: 0x1f6f3a,        // verde da folha
  detalhe: 0xf0b400,       // amarelo da faixa
  sapato: 0x3b2a1e,
  cesta: 0xb45309,
  cestaEscura: 0x7c3a06,
  fruto: 0x8b1a2b,
  folhaFruto: 0x2f7a3a,
  touca: true,
  faixa: true,
  cabeloComprido: false
};

/** Corpo 3D do Lucas (CETAM): camisa azul, calcao escuro, sem touca guarana. */
const MENINO_ESTILO_LUCAS = {
  pele: 0xc98a5e,
  peleSombra: 0xa96b43,
  cabelo: 0x241208,
  camisa: 0x2563eb,        // azul CETAM
  camisaEscura: 0x1e40af,
  calcao: 0x1f2937,
  detalhe: 0xfbbf24,       // amarelo do emblema
  sapato: 0x111827,
  cesta: 0xb45309,
  cestaEscura: 0x7c3a06,
  fruto: 0x8b1a2b,
  folhaFruto: 0x2f7a3a,
  touca: false,
  faixa: false,
  cabeloComprido: false
};

/** Corpo 3D da Mayara (Amazonia): blusa rosa e cabelo comprido. */
const MENINO_ESTILO_MAYARA = {
  pele: 0xd9a06b,
  peleSombra: 0xb87f4e,
  cabelo: 0x3b1f0e,
  camisa: 0xdb2777,        // rosa da Amazonia
  camisaEscura: 0x9d174d,
  calcao: 0x78350f,
  detalhe: 0xfde68a,
  sapato: 0x374151,
  cesta: 0xb45309,
  cestaEscura: 0x7c3a06,
  fruto: 0x8b1a2b,
  folhaFruto: 0x2f7a3a,
  touca: false,
  faixa: false,
  cabeloComprido: true
};

/**
 * Ossada do personagem, em metros, com a origem dos pes no zero do mundo.
 *
 * `pos` e o deslocamento local dentro do pai e `tam` o tamanho da primitiva:
 * cilindro [raioTopo, raioBase, altura], esfera [raio], caixa [larg, alt, prof].
 *
 * `desce: true` e a regra que segura a pose: o membro PENDURA a partir da
 * articulacao, entao a malha fica `altura / 2` abaixo do no. Sem isso o
 * cilindro fica centrado na junta, sobe metade para dentro do torso e o pe
 * nunca chega no chao.
 */
const MENINO_RIG = {
  altura: 1.68,
  quadrilY: 0.8,
  nos: [
    { nome: 'quadril', pai: null, pos: [0, 0.8, 0], geo: 'esfera', tam: [0.155], cor: 'calcao', papel: 'raiz' },

    // Tronco: duas pecas para dar volume ao peito e a cintura.
    { nome: 'torsoBaixo', pai: 'quadril', pos: [0, 0.12, 0], geo: 'cilindro', tam: [0.145, 0.165, 0.26], cor: 'camisa' },
    { nome: 'torsoCima', pai: 'quadril', pos: [0, 0.37, 0], geo: 'cilindro', tam: [0.175, 0.15, 0.26], cor: 'camisa' },
    { nome: 'gola', pai: 'quadril', pos: [0, 0.5, 0], geo: 'cilindro', tam: [0.095, 0.115, 0.06], cor: 'detalhe' },

    // Cabeca: cabeca, cabelo, touca e olhos. A testa e a faixa do guarana.
    { nome: 'cabeca', pai: 'quadril', pos: [0, 0.66, 0], geo: 'esfera', tam: [0.15], cor: 'pele', papel: 'cabeca' },
    { nome: 'cabelo', pai: 'cabeca', pos: [0, 0.035, -0.012], geo: 'esfera', tam: [0.158], cor: 'cabelo' },
    { nome: 'touca', pai: 'cabeca', pos: [0, 0.07, 0.005], geo: 'esfera', tam: [0.148], cor: 'camisa' },
    { nome: 'faixa', pai: 'cabeca', pos: [0, 0.05, 0.085], geo: 'caixa', tam: [0.2, 0.05, 0.1], cor: 'detalhe' },
    { nome: 'olhoE', pai: 'cabeca', pos: [-0.058, 0.0, 0.122], geo: 'esfera', tam: [0.026], cor: 'sapato' },
    { nome: 'olhoD', pai: 'cabeca', pos: [0.058, 0.0, 0.122], geo: 'esfera', tam: [0.026], cor: 'sapato' },

    // Bracos: ombro em 1.15 m, cotovelo e mao descendo em corrente.
    { nome: 'bracoE', pai: 'quadril', pos: [-0.2, 0.35, 0], geo: 'cilindro', tam: [0.05, 0.062, 0.28], cor: 'camisaEscura', desce: true, papel: 'bracoE' },
    { nome: 'antebracoE', pai: 'bracoE', pos: [0, -0.28, 0], geo: 'cilindro', tam: [0.042, 0.05, 0.26], cor: 'pele', desce: true },
    { nome: 'maoE', pai: 'antebracoE', pos: [0, -0.26, 0], geo: 'esfera', tam: [0.056], cor: 'pele' },
    { nome: 'bracoD', pai: 'quadril', pos: [0.2, 0.35, 0], geo: 'cilindro', tam: [0.05, 0.062, 0.28], cor: 'camisaEscura', desce: true, papel: 'bracoD' },
    { nome: 'antebracoD', pai: 'bracoD', pos: [0, -0.28, 0], geo: 'cilindro', tam: [0.042, 0.05, 0.26], cor: 'pele', desce: true },
    { nome: 'maoD', pai: 'antebracoD', pos: [0, -0.26, 0], geo: 'esfera', tam: [0.056], cor: 'pele' },

    // Pernas: quadril 0.80, joelho 0.46, tornozelo 0.08, pe no chao.
    { nome: 'pernaE', pai: 'quadril', pos: [-0.1, 0, 0], geo: 'cilindro', tam: [0.065, 0.078, 0.34], cor: 'calcao', desce: true, papel: 'pernaE' },
    { nome: 'canelaE', pai: 'pernaE', pos: [0, -0.34, 0], geo: 'cilindro', tam: [0.05, 0.062, 0.38], cor: 'pele', desce: true },
    { nome: 'peE', pai: 'canelaE', pos: [0, -0.38, 0], geo: 'caixa', tam: [0.1, 0.06, 0.17], cor: 'sapato', desce: true },
    { nome: 'pernaD', pai: 'quadril', pos: [0.1, 0, 0], geo: 'cilindro', tam: [0.065, 0.078, 0.34], cor: 'calcao', desce: true, papel: 'pernaD' },
    { nome: 'canelaD', pai: 'pernaD', pos: [0, -0.34, 0], geo: 'cilindro', tam: [0.05, 0.062, 0.38], cor: 'pele', desce: true },
    { nome: 'peD', pai: 'canelaD', pos: [0, -0.38, 0], geo: 'caixa', tam: [0.1, 0.06, 0.17], cor: 'sapato', desce: true }
  ],
  /** A cesta nasce nas costas, do lado esquerdo, como quem carrega a colheita. */
  cesta: { pos: [0.0, 0.3, -0.26], raio: 0.2, altura: 0.26, inclinar: 0.16, frutosMax: 12 }
};

/**
 * Parametros da animacao por estado. `braco`, `perna` e `corpo` sao os angulos
 * maximos de oscilacao, em radianos; a fase de caminhada vem da simulacao.
 */
const MENINO_ANIM = {
  idle: { braco: 0.06, perna: 0.0, corpo: 0.02 },
  walk: { braco: 0.62, perna: 0.55, corpo: 0.03 },
  run: { braco: 0.95, perna: 0.85, corpo: 0.09 },
  jump: { braco: 0.5, perna: 0.75, corpo: -0.05 },
  collect: { braco: 0.7, perna: 0.05, corpo: 0.11 },
  victory: { braco: 0.35, perna: 0.05, corpo: -0.03 },
  hurt: { braco: 0.3, perna: 0.1, corpo: 0.16 }
};

/** Escolhe a cor de um no pelo nome da chave no estilo ativo. */
function corDoNo(no, estilo) {
  return estilo[no.cor] !== undefined ? estilo[no.cor] : 0xff00ff;
}

/** Cria a geometria de uma primitiva conforme o `geo` declarado no rig. */
function geometriaDoNo(THREE, no) {
  const t = no.tam;
  if (no.geo === 'esfera') return new THREE.SphereGeometry(t[0], 16, 12);
  if (no.geo === 'caixa') return new THREE.BoxGeometry(t[0], t[1], t[2]);
  return new THREE.CylinderGeometry(t[0], t[1], t[2], 14, 1);
}

/**
 * Monta o personagem. Devolve o grupo pronto para a cena e as partes nomeadas,
 * para a animacao poder girar braco, perna, cabeca e cesta por nome.
 *
 * @param {object} THREE a biblioteca carregada na pagina
 * @param {object} estilo paleta do personagem (MENINO_ESTILO por padrao)
 * @returns {{group: object, parts: object, cesta: object, frutos: Array}}
 */
function buildMeninoGuarana(THREE, estilo = MENINO_ESTILO) {
  const group = new THREE.Group();
  group.name = 'meninoGuarana';
  const parts = {};

  for (const no of MENINO_RIG.nos) {
    const mat = new THREE.MeshLambertMaterial({ color: corDoNo(no, estilo) });
    const mesh = new THREE.Mesh(geometriaDoNo(THREE, no), mat);
    mesh.name = no.nome;
    // O no do pai e a articulacao. Num membro que desce, a malha fica metade da
    // altura abaixo dela, para o membro pender da junta em vez de atravessar o torso.
    const queda = no.desce ? no.tam[no.geo === 'caixa' ? 1 : 2] / 2 : 0;
    const pai = no.pai ? parts[no.pai] : null;
    // O `pos` do rig mede a distancia a partir da JUNTA do pai (o topo da peca),
    // mas o filho e pendurado no CENTRO da malha do pai, que esta `quedaPai`
    // abaixo da junta. Sem devolver essa queda, cada junta desce meia peca a
    // mais: os pes terminavam 0,34 m abaixo do chao e o menino parecia afundado.
    const quedaPai = pai ? (pai.userData.queda || 0) : 0;
    mesh.position.set(no.pos[0], no.pos[1] - queda + quedaPai, no.pos[2]);
    mesh.userData.queda = queda;
    mesh.castShadow = true;

    (pai || group).add(mesh);
    parts[no.nome] = mesh;
  }

  // Identidade de cada personagem: o menino usa a touca e a faixa do guarana;
  // Lucas e a Mayara mostram o proprio cabelo, e a Mayara com cabelo comprido.
  if (estilo.touca === false && parts.touca) parts.touca.visible = false;
  if (estilo.faixa === false && parts.faixa) parts.faixa.visible = false;
  if (estilo.cabeloComprido && parts.cabelo) {
    parts.cabelo.scale.set(1.03, 1.3, 1.1);
    parts.cabelo.position.set(0, 0.045, -0.02);
  }

  // --- A cesta, com os frutos que aparecem conforme a colheita --------------
  const c = MENINO_RIG.cesta;
  const cesta = new THREE.Group();
  cesta.name = 'cesta';
  cesta.position.set(c.pos[0], c.pos[1], c.pos[2]);
  cesta.rotation.x = -c.inclinar;

  const corpoCesta = new THREE.Mesh(
    new THREE.CylinderGeometry(c.raio, c.raio * 0.78, c.altura, 14, 1, true),
    new THREE.MeshPhongMaterial({ color: estilo.cesta, side: THREE.DoubleSide, shininess: 14 })
  );
  corpoCesta.position.y = c.altura / 2;
  corpoCesta.castShadow = true;
  cesta.add(corpoCesta);

  const fundoCesta = new THREE.Mesh(
    new THREE.CircleGeometry(c.raio * 0.78, 14),
    new THREE.MeshPhongMaterial({ color: estilo.cestaEscura, shininess: 8 })
  );
  fundoCesta.rotation.x = -Math.PI / 2;
  cesta.add(fundoCesta);

  // Tracos verticais: e o que faz a cesta parecer trancada, e nao um balde.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const tal = new THREE.Mesh(
      new THREE.BoxGeometry(0.022, c.altura, 0.022),
      new THREE.MeshLambertMaterial({ color: estilo.cestaEscura })
    );
    tal.position.set(Math.cos(a) * c.raio * 0.99, c.altura / 2, Math.sin(a) * c.raio * 0.99);
    cesta.add(tal);
  }

  const aro = new THREE.Mesh(
    new THREE.TorusGeometry(c.raio, 0.022, 8, 18),
    new THREE.MeshPhongMaterial({ color: estilo.cestaEscura, shininess: 22 })
  );
  aro.rotation.x = Math.PI / 2;
  aro.position.y = c.altura;
  cesta.add(aro);

  const frutos = [];
  for (let i = 0; i < c.frutosMax; i++) {
    const g = new THREE.Group();
    const fruto = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 10, 8),
      new THREE.MeshLambertMaterial({ color: estilo.fruto })
    );
    fruto.castShadow = true;
    g.add(fruto);
    // A casca do guarana e vermelha com listras escuras: cada fruto ganha uma.
    const listra = new THREE.Mesh(
      new THREE.TorusGeometry(0.042, 0.008, 6, 12),
      new THREE.MeshLambertMaterial({ color: 0x2a0a0d })
    );
    listra.rotation.x = Math.PI / 2;
    g.add(listra);
    const anel = i / c.frutosMax;
    g.position.set(
      Math.cos(anel * Math.PI * 3.1) * c.raio * 0.5,
      c.altura * 0.62 + (i % 3) * 0.045,
      Math.sin(anel * Math.PI * 3.1) * c.raio * 0.5
    );
    g.visible = false;
    cesta.add(g);
    frutos.push(g);
  }

  // A colheita de uma fase passa de 12, entao nao da para desenhar um fruto
  // por unidade: a cesta tem que mostrar a PROPORCAO. A massa de baixo e o
  // que cresce com o quanto falta, e os frutos so marcam as primeiras unidades
  // para o jogador ver que a cesta esta sendo usada.
  const enchimento = new THREE.Mesh(
    new THREE.CylinderGeometry(c.raio * 0.92, c.raio * 0.72, c.altura * 0.9, 14),
    new THREE.MeshLambertMaterial({ color: estilo.fruto })
  );
  enchimento.position.y = c.altura * 0.45;
  enchimento.visible = false;
  cesta.add(enchimento);

  // A cesta fica presa nas costas do quadril, e nao flutua solta na cena.
  parts.quadril.add(cesta);
  cesta.visible = false;
  group.userData.menino = { partes: parts, cesta, frutos, enchimento };

  return { group, parts, cesta, frutos, enchimento, raiz: parts.quadril };
}

/**
 * Move o personagem conforme o estado. Tudo e rotacao em torno do pivot, que e
 * por isso que os nos de braco e perna existem separados do pai.
 *
 * @param {object} partes partes devolvidas por buildMeninoGuarana
 * @param {string} estado idle | walk | run | jump | collect | victory | hurt
 * @param {number} fase radianos ja acumulados (use a fase de caminhada da simulacao)
 * @param {object} opts {tempo, turbo, hurtT}
 */
function animarMenino(partes, estado, fase, opts = {}) {
  const p = MENINO_ANIM[estado] || MENINO_ANIM.idle;
  const t = opts.tempo || 0;
  const turbo = opts.turbo === true;
  const hurtT = opts.hurtT || 0;
  const s = Math.sin(fase);
  const s2 = Math.sin(fase * 2);

  // Correndo, o corpo inclina a frente; andando, quase nao inclina.
  const inclinar = p.corpo * (turbo ? 1.5 : 1);

  partes.pernaE.rotation.x = s * p.perna;
  partes.pernaD.rotation.x = -s * p.perna;
  partes.bracoE.rotation.x = -s * p.braco;
  partes.bracoD.rotation.x = s * p.braco;
  // Os antebracos dobram um pouco, para o cotovelo nao virar um boneco rigido.
  partes.antebracoE.rotation.x = -Math.abs(s) * p.braco * 0.6 - 0.12;
  partes.antebracoD.rotation.x = -Math.abs(s) * p.braco * 0.6 - 0.12;

  // Respirar de pe: o peito sobe e desce devagar.
  const respirar = estado === 'idle' ? Math.sin(t * 1.6) * 0.012 : 0;
  partes.torsoCima.scale.setScalar(1 + respirar);
  partes.quadril.position.y = MENINO_RIG.quadrilY + respirar * 0.6 + (estado === 'jump' ? 0.02 : 0);
  partes.quadril.rotation.x = inclinar;
  partes.quadril.rotation.z = s2 * p.perna * 0.12;

  // Cabeca olha um pouco para a frente, e treme no dano.
  partes.cabeca.rotation.x = -inclinar * 0.6 + (hurtT > 0 ? Math.sin(t * 40) * 0.12 : 0);
  partes.cabeca.rotation.z = hurtT > 0 ? Math.sin(t * 33) * 0.1 : 0;

  if (estado === 'victory') {
    // Braco para cima, pulando de alegria.
    partes.bracoE.rotation.x = -2.5 + Math.sin(t * 8) * 0.2;
    partes.bracoE.rotation.z = 0.35;
    partes.bracoD.rotation.x = -2.4 + Math.sin(t * 8 + 1) * 0.2;
    partes.bracoD.rotation.z = -0.35;
  }
  if (estado === 'jump') {
    partes.bracoE.rotation.z = 0.5;
    partes.bracoD.rotation.z = -0.5;
  }
  if (estado === 'collect') {
    // Estica o braco para frente, como quem pega o fruto.
    partes.bracoD.rotation.x = -1.5;
    partes.bracoD.rotation.z = -0.3;
    partes.quadril.rotation.x = 0.16;
  }
}

/**
 * Mostra ou esconde a cesta e enche ela conforme a colheita. A cesta so entra
 * depois do primeiro guarana, que e o que o usuario pediu.
 *
 * Recebe o personagem inteiro, e nao so as partes: a cesta e a massa de
 * enchimento sao irmas das partes na montagem, nao filhas delas.
 *
 * `menino.frutos` sao os frutos soltos e `menino.enchimento` a massa que cresce.
 * Como a meta de uma fase passa da quantidade de frutos que cabem desenhados,
 * quem manda no tamanho da massa e a PROPORCAO, nao a contagem.
 */
function atualizarCesta(menino, qtdeFrutos, meta) {
  const c = MENINO_RIG.cesta;
  const total = Math.max(0, qtdeFrutos);
  const visivel = total > 0;
  menino.cesta.visible = visivel;
  if (!visivel) return false;

  const n = Math.min(c.frutosMax, total);
  for (let i = 0; i < menino.frutos.length; i++) menino.frutos[i].visible = i < n;

  // A massa sobe ate transbordar. Com meta zero ela nao enche nada.
  const fracao = meta > 0 ? Math.max(0, Math.min(1, total / meta)) : (total > 0 ? 1 : 0);
  if (menino.enchimento) {
    menino.enchimento.visible = fracao > 0;
    menino.enchimento.scale.set(0.35 + fracao * 0.65, Math.max(0.04, fracao), 0.35 + fracao * 0.65);
  }
  return visivel;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MENINO_ESTILO, MENINO_ESTILO_LUCAS, MENINO_ESTILO_MAYARA, MENINO_RIG, MENINO_ANIM, buildMeninoGuarana, animarMenino, atualizarCesta };
}

/**
 * Ferramenta de desenvolvimento: abre a cena 3D num Electron de verdade,
 * renderiza alguns estados e salva PNGs em tools/cenas3d/ para conferir o
 * visual na mao.
 *
 *     npx electron tools/ver-3d.js
 *
 * Por que capturePage() e nao toDataURL(): um canvas WebGL devolve imagem
 * vazia em toDataURL(), porque o buffer de desenho e descartado depois de cada
 * quadro. capturePage() le o que foi de fato para a tela.
 *
 * Nao faz parte do jogo nem do instalador.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const SAIDA = path.join(__dirname, 'cenas3d');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
// O HTML fica na RAIZ, e nao em tools/: caminhos como "assets/backgrounds/..."
// sao relativos a pagina, e um HTML em tools/ resolveria para tools/assets/...
const HTML = path.join(BASE, '__ver-3d.html');

fs.mkdirSync(SAIDA, { recursive: true });

// A mesma ordem do index.html, sem MediaPipe, sem historia e sem HUD. Se a cena
// falhar aqui, o problema e da cena; se falhar so no jogo completo, o problema
// esta na integracao.
const scripts = [
  'src/game/audio.js',
  'src/game/particles.js',
  'src/game/car.js',
  'src/game/track.js',
  'src/game/sprites.js',
  'src/game/harvester.js',
  'src/game/harvest_scene.js',
  'assets/libs/three.min.js',
  'src/game/harvest_sim.js',
  'src/game/menino3d.js',
  'src/game/harvest3d.js'
];

fs.writeFileSync(HTML, `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>3d</title>
<style>html,body{margin:0;background:#000;overflow:hidden}
canvas{display:block;width:960px;height:520px}</style>
</head><body>
<canvas id="c" width="960" height="520"></canvas>
${scripts.map((s) => `<script src="${s}"></script>`).join('\n')}
</body></html>`, 'utf8');

// Sem aceleração por software a peça pode nao ter WebGL. Manter o hardware
// ligado (nao chamamos disableHardwareAcceleration) e o caminho normal.
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 960, height: 520, show: false, frame: false,
    webPreferences: { backgroundThrottling: false }
  });

  const erros = [];
  win.webContents.on('console-message', (...a) => {
    const msg = typeof a[0] === 'object' && a[0] ? (a[0].message || JSON.stringify(a[0])) : a[1];
    erros.push(String(msg));
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => erros.push(`did-fail-load ${code} ${desc} ${url}`));

  await win.loadFile(HTML);
  // Da tempo das fotos de fundo chegarem pelo TextureLoader.
  await new Promise((r) => setTimeout(r, 700));

  const pre = await win.webContents.executeJavaScript(`
    (() => {
      const faltando = ['THREE','HarvestSim','HARVEST_PHASES','buildMeninoGuarana','criarHarvest3D']
        .filter((n) => eval('typeof ' + n) === 'undefined');
      const gl = (() => {
        const cv = document.createElement('canvas');
        const g = cv.getContext('webgl') || cv.getContext('experimental-webgl');
        if (!g) return 'SEM WEBGL';
        return g.getParameter(g.VERSION) + ' | ' + g.getParameter(g.RENDERER);
      })();
      const cv2 = document.getElementById('c');
      const med = { attrW: cv2.width, attrH: cv2.height, clientW: cv2.clientWidth, clientH: cv2.clientHeight, innerH: window.innerHeight, dpr: window.devicePixelRatio };
      return { faltando, gl, rev: typeof THREE !== 'undefined' ? THREE.REVISION : null, med };
    })()
  `);
  console.log('THREE r' + pre.rev, '| WebGL:', pre.gl);
  console.log('tela:', JSON.stringify(pre.med));
  if (pre.faltando.length) { console.log('FALTANDO:', pre.faltando.join(', ')); }
  if (pre.faltando.length || pre.gl === 'SEM WEBGL') {
    console.log('\nconsole do renderer:\n' + erros.join('\n'));
    win.destroy(); try { fs.unlinkSync(HTML); } catch (e) {} app.quit(); return;
  }

  // Monta o mundo uma vez e expoe no window para os quadros seguintes.
  const montagem = await win.webContents.executeJavaScript(`
    (() => {
      try {
        const cv = document.getElementById('c');
        const sim = new HarvestSim({ phases: HARVEST_PHASES, playerId: 5 });
        const menino = buildMeninoGuarana(THREE);
        const cena = criarHarvest3D(THREE, { canvas: cv, mundo: sim.world, phases: HARVEST_PHASES, menino });
        cena.definirFase(sim.phase);
        window.__t = { sim, menino, cena };
        return { ok: true, fases: HARVEST_PHASES.length };
      } catch (e) {
        return { erro: String((e && e.stack) || e), temThree: typeof THREE };
      }
    })()
  `);
  if (montagem.erro) {
    console.log('ERRO na montagem:', montagem.erro);
    console.log('\nconsole do renderer:\n' + erros.join('\n'));
    win.destroy(); try { fs.unlinkSync(HTML); } catch (e) {} app.quit(); return;
  }
  console.log('cena montada, ' + montagem.fases + ' fases');

  // Uma captura de aquecimento, jogada fora: a primeira capturaPage() pode
  // chegar antes de o compositor pintar e voltar quase uniforme (~2 KB no PNG,
  // contra ~550 KB de uma cena de verdade). Sem isso, a primeira foto sai em
  // branco e parece que a cena nao renderiza.
  await win.webContents.capturePage();
  await espera(250);

  /**
   * Avanca a simulacao, renderiza e captura. O `prep` roda antes do ultimo
   * desenho, para posar o boneco (facing, cesta, estado) sem eu precisar de
   * uma funcao por foto.
   */
  async function capturar(nome, passos, prep) {
    const info = await win.webContents.executeJavaScript(`
      (() => {
       try {
        const { sim, menino, cena } = window.__t;
        const cv = document.getElementById('c');
        // desenhar() a cada passo: e ele que move a camera, e a camera chega
        // suavemente. Chamar so no fim deixava as fotos pegando a camera no meio
        // do caminho -- o boneco aparecia minúsculo e ia "crescendo" entre as
        // fotos sem ter andado nada.
        for (let i = 0; i < ${passos}; i++) {
          sim.update(1/60, { steerX: 0, steerZ: 1, command: 'PARAR' });
          cena.desenhar(sim, 1/60);
        }
        ${prep || ''}
        // Assenta a camera no alvo antes de fotografar.
        for (let i = 0; i < 120; i++) cena.desenhar(sim, 1/60);
        const g = menino.group;
        // Projeta os 8 cantos do volume do menino na tela. E o que responde, sem
        // olhar, se ele esta do tamanho certo, enquadrado e com os pes no chao.
        const b3 = new THREE.Box3().setFromObject(g);
        const dim = b3.getSize(new THREE.Vector3());
        const cw = cv.width, ch = cv.height;
        let sx0 = Infinity, sy0 = Infinity, sx1 = -Infinity, sy1 = -Infinity, atras = 0;
        const v = new THREE.Vector3();
        for (const X of [b3.min.x, b3.max.x]) {
          for (const Y of [b3.min.y, b3.max.y]) {
            for (const Z of [b3.min.z, b3.max.z]) {
              v.set(X, Y, Z).project(cena.camera);
              if (v.z > 1) atras++;
              const px = (v.x * 0.5 + 0.5) * cw, py = (-v.y * 0.5 + 0.5) * ch;
              if (px < sx0) sx0 = px; if (px > sx1) sx1 = px;
              if (py < sy0) sy0 = py; if (py > sy1) sy1 = py;
            }
          }
        }
        return {
          pos: [sim.player.x, sim.player.y, sim.player.z].map((n) => +n.toFixed(2)),
          pesY: +b3.min.y.toFixed(3),
          alturaM: +dim.y.toFixed(3),
          larguraM: +dim.x.toFixed(3),
          telaPx: [Math.round(sx0), Math.round(sy0), Math.round(sx1), Math.round(sy1)],
          bufferPx: [cw, ch],
          fracTelaAltura: +((sy1 - sy0) / ch).toFixed(3),
          enquadrado: sx0 >= 0 && sy0 >= 0 && sx1 <= cw && sy1 <= ch && atras === 0,
          cestaVisivel: menino.cesta.visible,
          frutosNaCesta: menino.frutos.filter((f) => f.visible).length,
          enchimentoY: +menino.enchimento.scale.y.toFixed(2),
          itensNaCena: cena.itens.length,
          fase: sim.phase.id
        };
       } catch (e) { return { erro: String((e && e.stack) || e) }; }
      })()
    `);
    const img = await win.webContents.capturePage();
    await espera(120);
    const img2 = await win.webContents.capturePage();
    fs.writeFileSync(path.join(SAIDA, `${nome}.png`), img2.toPNG());
    console.log(`  ${nome}.png  ${JSON.stringify(info)}`);
    return info;
  }

  // 1) Como o jogo comeca: de costas para a camera, parado.
  await capturar('a-inicio-de-costas', 30, '');

  // 2) De frente: vira o menino e deixa a camera passar para o outro lado.
  await capturar('b-de-frente', 1, `
    sim.player.facing = Math.PI;
    sim.player.vx = 0; sim.player.vz = 0;
  `);

  // 3) Com a cesta cheia: e o unico jeito de ver a cesta e os frutos.
  await capturar('c-com-cesta', 1, `
    sim.player.carryingBasket = true;
    sim.player.basketFruit = 10;
    sim.player.facing = Math.PI;
  `);

  // 4) Andando de lado, para ver a animacao dos membros no meio do passo.
  await capturar('d-andando', 40, `
    sim.player.carryingBasket = true;
    sim.player.basketFruit = 10;
  `);

  // 5) No ar, no meio do pulo.
  await capturar('e-pulando', 1, `
    sim.requestJump();
    for (let i = 0; i < 18; i++) sim.update(1/60, { steerX: 1, steerZ: 1, command: 'ACELERAR' });
  `);

  // 6) Corpos novos: cada personagem monta com o proprio estilo, e o harness
  // fotografia o que o jogo de verdade mostraria para aquele slot.
  for (const [nome, estilo] of [['lucas', 'MENINO_ESTILO_LUCAS'], ['mayara', 'MENINO_ESTILO_MAYARA']]) {
    const rebuilt = await win.webContents.executeJavaScript(`
      (() => {
        const simN = new HarvestSim({ phases: HARVEST_PHASES, playerId: 5 });
        const meninoN = buildMeninoGuarana(THREE, ${estilo});
        const cenaN = criarHarvest3D(THREE, {
          canvas: document.getElementById('c'),
          mundo: simN.world, phases: HARVEST_PHASES, menino: meninoN
        });
        cenaN.definirFase(simN.phase);
        window.__t = { sim: simN, menino: meninoN, cena: cenaN };
        return { ok: true };
      })()
    `);
    if (rebuilt.erro) console.log('ERRO ao montar ' + nome + ':', rebuilt.erro);
    await capturar(`corpo-${nome}-frente`, 1, `
      sim.player.facing = Math.PI;
      sim.player.vx = 0; sim.player.vz = 0;
    `);
    await capturar(`corpo-${nome}-cesta`, 1, `
      sim.player.carryingBasket = true;
      sim.player.basketFruit = 10;
      sim.player.facing = Math.PI;
    `);
  }

  // Radiografia do corpo: qual peca passa abaixo do chao (y=0). O bbox do
  // conjunto deu -0.34 e a altura 2.02, mas o rig diz 1.68; so uma peca solta
  // explica a diferenca.
  const partes = await win.webContents.executeJavaScript(`
    (() => {
      const { sim, menino, cena } = window.__t;
      // Poe o boneco no chao: a foto anterior o deixou no ar, e no ar nada fica
      // abaixo de y=0, o que faria a radiografia passar como se estivesse tudo bem.
      sim.player.y = 0; sim.player.vy = 0;
      sim.player.carryingBasket = false; sim.player.basketFruit = 0;
      for (let i = 0; i < 120; i++) cena.desenhar(sim, 1/60);
      const caixas = (obj, rotulo) => {
        const b = new THREE.Box3().setFromObject(obj);
        return { rotulo, minY: +b.min.y.toFixed(3), maxY: +b.max.y.toFixed(3), altura: +(b.max.y - b.min.y).toFixed(3) };
      };
      const todas = [];
      const juntas = [];
      menino.group.traverse((o) => {
        // Local, nao mundo: o que eu quero saber e onde cada junta foi posta
        // DENTRO do rig, antes de qualquer transformacao de fora.
        if (o.name) juntas.push({
          nome: o.name,
          tipo: o.type,
          localY: +o.position.y.toFixed(3),
          pai: o.parent && o.parent.name ? o.parent.name : (o.parent === menino.group ? 'grupo' : o.parent && o.parent.type)
        });
        if (!o.isMesh && !o.isSprite && !o.isPoints) return;
        if (o.visible === false) return;
        todas.push(caixas(o, o.name || o.type));
      });
      return {
        yAtual: +sim.player.y.toFixed(3),
        conjunto: caixas(menino.group, 'menino'),
        raiz: caixas(menino.raiz, 'raiz'),
        maisBaixas: todas.sort((a, b) => a.minY - b.minY).slice(0, 6),
        juntas: juntas.filter((j) => /perna|canela|pe|quadril/.test(j.nome))
      };
    })()
  `);
  console.log('\nradiografia do corpo (no chao, y=' + partes.yAtual + '):');
  console.log('  conjunto:', JSON.stringify(partes.conjunto));
  console.log('  raiz    :', JSON.stringify(partes.raiz));
  console.log('  pecas mais baixas:');
  console.log('  peças mais baixas:');
  for (const p of partes.maisBaixas) console.log('   ', JSON.stringify(p));
  console.log('  juntas (posicao local):');
  for (const j of partes.juntas) console.log('   ', JSON.stringify(j));

  if (erros.length) console.log('\nconsole do renderer:\n' + erros.join('\n'));
  else console.log('\nnenhum erro no console do renderer');

  win.destroy();
  try { fs.unlinkSync(HTML); } catch (e) {}
  app.quit();
}).catch((e) => { console.error(e); app.quit(); });

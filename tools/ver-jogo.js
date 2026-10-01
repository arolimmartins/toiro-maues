/**
 * Ferramenta de desenvolvimento: abre o index.html de VERDADE no Electron,
 * pula a abertura, liga o 3D pelo mesmo caminho do teclado (window.__warana) e
 * salva PNGs em tools/cenas3d/, para conferir a integracao na mao.
 *
 *     npx electron tools/ver-jogo.js
 *
 * O ver-3d.js monta a cena isolada; este aqui testa a cola (app.js, canvas,
 * HUD, loop). Se a cena funciona isolada mas o jogo sai preto, o problema esta
 * na integracao, e nao no desenho.
 *
 * Nao faz parte do jogo nem do instalador.
 */
const { app, BrowserWindow, session } = require('electron');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const SAIDA = path.join(__dirname, 'cenas3d');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(SAIDA, { recursive: true });
app.commandLine.appendSwitch('enable-unsafe-swiftshader');

app.whenReady().then(async () => {
  // Sem camera de verdade: o app so precisa que a permissao nao barre a inicializacao.
  session.defaultSession.setPermissionRequestHandler((_w, _p, cb) => cb(true));
  session.defaultSession.setPermissionCheckHandler(() => true);

  const win = new BrowserWindow({
    width: 1280, height: 760, show: false, frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(BASE, 'preload.js'),
      backgroundThrottling: false
    }
  });

  const erros = [];
  win.webContents.on('console-message', (...a) => {
    // O formato mudou entre versoes do Electron: as vezes vem um objeto de
    // evento, as vezes argumentos soltos. JSON.stringify de um evento do
    // Electron da "{}", porque as propriedades sao getters nao-enumeraveis --
    // foi assim que o log saiu como uma lista de chaves vazias.
    const d = a[0];
    let nivel = '';
    let msg = null;
    if (d && typeof d === 'object' && typeof d.message === 'string') { msg = d.message; nivel = d.level || ''; }
    else if (typeof d === 'string') { nivel = String(a[1] || ''); msg = d; }
    else { nivel = String(a[1] || ''); msg = a[2]; }
    if (msg === undefined || msg === null) msg = JSON.stringify(a[0]);
    if (/error|warn/i.test(nivel) || /error|uncaught|failed/i.test(String(msg))) {
      erros.push(`[${nivel || 'log'}] ${msg}`);
    }
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => erros.push(`did-fail-load ${code} ${desc} ${url}`));

  await win.loadFile(path.join(BASE, 'index.html'));
  await espera(1200);
  await win.webContents.capturePage();
  await espera(300);

  async function foto(nome, nota) {
    await espera(400);
    const img = await win.webContents.capturePage();
    fs.writeFileSync(path.join(SAIDA, `${nome}.png`), img.toPNG());
    console.log(`  ${nome}.png  ${nota}`);
  }

  async function estado() {
    return win.webContents.executeJavaScript(`
      (() => {
        const w = window.__warana;
        if (!w) return { erro: 'window.__warana nao existe' };
        const c3 = w.colheita3d;
        return {
          temWarana: true,
          inStory: w.engine.inStory,
          estado: w.engine.state,
          playerId: w.engine.harvester.currentPlayer,
          ativo3d: !!(c3 && c3.ativo),
          erro3d: (c3 && c3.erro) ? String(c3.erro) : null,
          sinais: (c3 && c3.sim) ? {
            fase: c3.sim.phase ? c3.sim.phase.id : null,
            x: +c3.sim.player.x.toFixed(2),
            z: +c3.sim.player.z.toFixed(2),
            y: +c3.sim.player.y.toFixed(2),
            entregues: c3.sim.guaranaCollected
          } : null,
          canvas3d: (() => {
            const c = document.getElementById('gameCanvas3d');
            return c ? { escondido: c.classList.contains('hidden'), w: c.width, h: c.height } : null;
          })()
        };
      })()
    `);
  }

  console.log('1) menu/abertura:', JSON.stringify(await estado()));

  // Pula a abertura pelo mesmo caminho do botao "pular".
  const aposPular = await win.webContents.executeJavaScript(`
    (() => {
      try { window.__warana.engine.skipStory(); return { ok: true, inStory: window.__warana.engine.inStory }; }
      catch (e) { return { erro: String(e && e.message || e) }; }
    })()
  `);
  console.log('2) apos skipStory:', JSON.stringify(aposPular));
  await foto('jogo-1-2d', 'gameplay 2D (referencia)');

  // Liga o 3D pelo atalho T, de verdade: exercita o mesmo listener do usuario.
  const ligou = await win.webContents.executeJavaScript(`
    (() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
      return { eventoEnviado: true };
    })()
  `);
  await espera(900);
  const est3d = await estado();
  console.log('3) apos tecla T:', ligou.eventoEnviado ? '' : '?', JSON.stringify(est3d));
  await foto('jogo-2-3d', 'gameplay 3D pelo atalho T');

  // Andar para a direita e correr, para a animacao e a camera se mexerem.
  await win.webContents.executeJavaScript(`
    (() => {
      const tecla = (k, tipo) => window.dispatchEvent(new KeyboardEvent(tipo, { key: k, bubbles: true }));
      for (const k of ['w', 'd', 'Shift']) tecla(k, 'keydown');
      return true;
    })()
  `);
  await espera(1600);
  const estAndou = await estado();
  console.log('4) depois de andar:', JSON.stringify(estAndou.sinais));
  await foto('jogo-3-3d-andando', 'andando/correndo em 3D');

  // Pular: espaco so vira pulo no 3D. Amostra o `y` ao longo do tempo, porque
  // uma leitura so pode cair depois do pouso e nao provar nada.
  const pulo = await win.webContents.executeJavaScript(`
    (async () => {
      const c3 = window.__warana.colheita3d;
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      let maxY = 0;
      const amostras = [];
      for (let i = 0; i < 40; i++) {
        await new Promise((r) => setTimeout(r, 30));
        const y = c3.sim ? c3.sim.player.y : -1;
        if (y > maxY) maxY = y;
        if (i % 8 === 0) amostras.push(+y.toFixed(2));
      }
      return { maxY: +maxY.toFixed(3), amostras };
    })()
  `);
  const estPulo = await estado();
  await foto('jogo-4-3d-pulo', 'durante o pulo');

  // Troca para Ana com a tecla 2, com o 3D ligado: o corpo 3D renasce com o
  // estilo padrao do menino e o HUD com a habilidade de colheita veloz.
  await win.webContents.executeJavaScript(`
    (() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }));
      return true;
    })()
  `);
  await espera(700);
  const estAna = await estado();
  console.log('4a) apos tecla 2:', JSON.stringify({ playerId: estAna.playerId, sinais: estAna.sinais }));
  await foto('jogo-4a-ana-3d', 'Ana em 3D (tecla 2)');

  // Troca para Mayara com a tecla 4, com o 3D ligado: e o caminho real do
  // usuario, e o corpo 3D tem de renascer com o estilo proprio (rosa, cabelo
  // comprido) em vez de manter o de Lucas.
  await win.webContents.executeJavaScript(`
    (() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '4', bubbles: true }));
      return true;
    })()
  `);
  await espera(700);
  const estMayara = await estado();
  console.log('4b) apos tecla 4:', JSON.stringify({ playerId: estMayara.playerId, sinais: estMayara.sinais }));
  await foto('jogo-4b-mayara-3d', 'Mayara em 3D (tecla 4)');
  await win.webContents.executeJavaScript(`
    (() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '3', bubbles: true }));
      return true;
    })()
  `);
  await espera(700);
  const estVoltouLucas = await estado();
  console.log('4c) tecla 3:', JSON.stringify({ playerId: estVoltouLucas.playerId, sinais: estVoltouLucas.sinais }));
  await foto('jogo-4c-lucas-3d', 'Lucas de volta em 3D (tecla 3)');

  // Volta para o 2D com o mesmo atalho: a ida e a volta tem de funcionar.
  await win.webContents.executeJavaScript(`
    (() => {
      const soltar = (k) => window.dispatchEvent(new KeyboardEvent('keyup', { key: k, bubbles: true }));
      for (const k of ['w', 'd', 'Shift']) soltar(k);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
      return true;
    })()
  `);
  await espera(700);
  const estVoltou = await estado();
  console.log('5) de volta ao 2D:', JSON.stringify({ ativo3d: estVoltou.ativo3d, canvas3d: estVoltou.canvas3d }));
  await foto('jogo-5-voltou-2d', 'voltou para o 2D');

  console.log('6) pulo: maxY=' + pulo.maxY + ' amostras=' + JSON.stringify(pulo.amostras));

  console.log('\nsinais do pulo:', JSON.stringify(estPulo.sinais));
  if (erros.length) {
    console.log('\nconsole do renderer (' + erros.length + '):');
    for (const e of erros.slice(0, 25)) console.log('  ' + e);
  } else console.log('\nnenhum erro no console do renderer');

  win.destroy();
  app.quit();
}).catch((e) => { console.error(e); app.quit(); });

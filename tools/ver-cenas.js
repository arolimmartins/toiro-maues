/**
 * Ferramenta de desenvolvimento: renderiza cada cena da abertura em um
 * Electron de verdade e salva um PNG, para conferir o visual na mao.
 *
 *     npx electron tools/ver-cenas.js
 *
 * As imagens vao para tools/cenas/. Nao faz parte do jogo nem do instalador.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, '..');
const SAIDA = path.join(__dirname, 'cenas');
// O HTML fica na RAIZ do projeto, e nao em tools/. Caminhos como
// "assets/backgrounds/..." sao relativos a pagina, entao um HTML em tools/
// resolveria para tools/assets/... e nenhuma foto carregaria.
const HTML = path.join(BASE, '__ver-cenas.html');

fs.mkdirSync(SAIDA, { recursive: true });

// Pagina minima: so os scripts necessarios, sem o app completo.
const scripts = ['src/game/voice-clips.js', 'src/game/voice.js', 'src/game/audio.js', 'src/game/story.js'];
fs.writeFileSync(HTML, `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>cenas</title>
<style>html,body{margin:0;background:#000}canvas{display:block}</style>
</head><body><canvas id="c" width="960" height="540"></canvas>
${scripts.map((s) => `<script src="${s}"></script>`).join('\n')}
</body></html>`, 'utf8');

app.disableHardwareAcceleration();

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 960, height: 540, show: false,
    webPreferences: { offscreen: true, backgroundThrottling: false }
  });

  const erros = [];
  win.webContents.on('console-message', (...a) => {
    // Electron 33 passou a mandar um evento; antes, vinham argumentos soltos.
    const msg = typeof a[0] === 'object' && a[0] ? (a[0].message || JSON.stringify(a[0])) : a[1];
    erros.push(String(msg));
  });
  win.webContents.on('did-fail-load', (_e, code, desc, url) => erros.push(`did-fail-load ${code} ${desc} ${url}`));
  await win.loadFile(HTML);
  // O Audio so pode tocar depois de um gesto; nosso interesse e o desenho.
  await win.webContents.executeJavaScript(`
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  `);

  const cena = await win.webContents.executeJavaScript(`
    (() => {
      try {
        const cv = document.getElementById('c');
        const st = new StoryManager(cv.width, cv.height, new SoundManager());
        st.voice.setClips(VOICE_CLIPS || []);
        st.voice.setEnabled(true);
        return { total: STORY_SCENES.length, largura: cv.width, altura: cv.height };
      } catch (e) {
        return { erro: String(e && e.stack || e), temST: typeof StoryManager, temVC: typeof VOICE_CLIPS };
      }
    })()
  `);

  if (cena.erro) { console.log('erro:', cena.erro, JSON.stringify(cena)); app.quit(); return; }
  console.log(`${cena.total} cenas, ${cena.largura}x${cena.altura}`);

  // --fundos=1 preenche o mapa de fotos so para conferencia visual. O mapa real
  // mora em src/game/story.js e nao e alterado por esta ferramenta.
  const usarFundos = process.argv.includes('--fundos=1');
  if (usarFundos) {
    await win.webContents.executeJavaScript(`
      (() => {
        const arqs = ['cenario-1.jpeg','cenario-2.jpeg','cenario-3a.jpeg','cenario-3b.jpeg','cenario-4.jpeg','cenario-5.jpeg'];
        const stags = STORY_SCENES.filter(s => s.speaker === 'ARARA').map(s => s.stage);
        stags.forEach((s, i) => { STORY_FUNDOS[s] = { arquivo: arqs[i % arqs.length], focoX: 0.5 }; });
        return stags.length;
      })()
    `);
  }

  const semFoto = [];
  for (let i = 0; i < cena.total; i++) {
    // Async de proposito: o desenho so acontece depois que as fotos chegam. Sem
    // essa espera, img.complete ainda e falso e a cena sai com o desenho de
    // reserva -- foi assim que a primeira cena escapou da conferencia.
    const r = await win.webContents.executeJavaScript(`
      (async () => {
        const cv = document.getElementById('c');
        const st = new StoryManager(cv.width, cv.height, new SoundManager());
        st.voice.setClips(VOICE_CLIPS || []);
        await Promise.all(Object.values(st._fundos).map(img => img.complete && img.naturalWidth
          ? Promise.resolve()
          : new Promise(res => { img.onload = res; img.onerror = res; })));
        st.start();
        st.index = ${i};
        st._enterScene(${i});
        // Alguns quadros: o papagaio já entra voando e a cena assenta.
        for (let k = 0; k < 90; k++) st.update(1 / 60);
        st.draw(cv.getContext('2d'));
        const fundo = st._fundoDaCena(st.currentScene.stage);
        return {
          png: cv.toDataURL('image/png').split(',')[1],
          stage: st.currentScene.stage,
          foto: fundo ? fundo.src.split('/').pop() : null
        };
      })()
    `);
    if (!r.foto) semFoto.push(`${i + 1}=${r.stage}`);
    const png = r.png;
    const nome = String(i + 1).padStart(2, '0');
    fs.writeFileSync(path.join(SAIDA, `cena-${nome}.png`), Buffer.from(png, 'base64'));
    console.log(`  cena-${nome}.png  ${r.stage}  ${r.foto || 'SEM FOTO (fundo liso)'}`);
  }

  // Resumo do encaixe: e o que permite dizer, sem olhar, qual frase esta com a
  // foto errada. A `dica` e a unica que nao tem foto, por desenho.
  if (semFoto.length) console.log(`\ncenas sem foto: ${semFoto.join(', ')}`);
  else console.log('\ncenas com foto: todas as falas do papagaio');
  fs.writeFileSync(path.join(SAIDA, 'mapa.txt'), semFoto.length
    ? `SEM FOTO: ${semFoto.join(', ')}\n`
    : 'Todas as falas do papagaio receberam foto.\n');

  // Retrato ampliado do papagaio, parado, para ver a pintura de perto.
  // A janela de recorte e medida pelo proprio desenho: adivinhar onde o papagaio
  // cai perde o bico ou corta a cauda assim que o desenho muda de tamanho.
  const retrato = await win.webContents.executeJavaScript(`
    (() => {
      const st = new StoryManager(960, 540, new SoundManager());
      st.start();
      st._enterScene(0);
      for (let k = 0; k < 90; k++) st.update(1 / 60);
      st.sceneTime = 3;
      st.t = 0.6;
      st.talking = true;
      st.voice.intensity = 0.8;

      // O papagaio sozinho num canvas transparente, so para medir a caixa.
      const solto = document.createElement('canvas');
      solto.width = 960; solto.height = 540;
      const sc = solto.getContext('2d');
      st._drawParrot(sc, st.pal, 'praia');
      const d = sc.getImageData(0, 0, 960, 540).data;
      let x0 = 960, y0 = 540, x1 = 0, y1 = 0;
      for (let y = 0; y < 540; y++) {
        for (let x = 0; x < 960; x++) {
          if (d[(y * 960 + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x; if (x > x1) x1 = x;
            if (y < y0) y0 = y; if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < x0) return { erro: 'papagaio invisivel' };
      const m = 6;
      x0 = Math.max(0, x0 - m); y0 = Math.max(0, y0 - m);
      x1 = Math.min(959, x1 + m); y1 = Math.min(539, y1 + m);
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      const out = document.createElement('canvas');
      out.width = w * 4; out.height = h * 4;
      const o = out.getContext('2d');
      o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
      o.drawImage(solto, x0, y0, w, h, 0, 0, out.width, out.height);
      return { png: out.toDataURL('image/png').split(',')[1], caixa: { x0, y0, w, h } };
    })()
  `);
  if (retrato.erro) { console.log('erro no retrato:', retrato.erro); }
  else {
    fs.writeFileSync(path.join(SAIDA, 'papagaio-4x.png'), Buffer.from(retrato.png, 'base64'));
    console.log(`  papagaio-4x.png  (caixa ${retrato.caixa.w}x${retrato.caixa.h} em ${retrato.caixa.x0},${retrato.caixa.y0})`);
  }

  // A cabeca e onde a pintura se julga: bico, olho, testa verde e cara branca.
  const cabeca = await win.webContents.executeJavaScript(`
    (() => {
      const st = new StoryManager(960, 540, new SoundManager());
      st.start();
      st._enterScene(0);
      for (let k = 0; k < 90; k++) st.update(1 / 60);
      st.sceneTime = 3;
      st.t = 0.6;
      st.talking = true;
      st.voice.intensity = 0.8;
      const solto = document.createElement('canvas');
      solto.width = 960; solto.height = 540;
      const sc = solto.getContext('2d');
      st._drawParrot(sc, st.pal, 'praia');
      // Mede a caixa e recorta so a cabeca, na ponta direita de cima.
      const d = sc.getImageData(0, 0, 960, 540).data;
      let x0 = 960, y0 = 540, x1 = 0, y1 = 0;
      for (let y = 0; y < 540; y++) for (let x = 0; x < 960; x++) {
        if (d[(y * 960 + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      const w = Math.max(40, Math.round((x1 - x0) * 0.42));
      const h = Math.max(30, Math.round((y1 - y0) * 0.42));
      const cx = x1 - Math.round(w * 0.15);
      const cy = y0 + Math.round(h * 0.25);
      const out = document.createElement('canvas');
      out.width = w * 8; out.height = h * 8;
      const o = out.getContext('2d');
      o.imageSmoothingEnabled = true; o.imageSmoothingQuality = 'high';
      o.drawImage(solto, cx - w / 2, cy - h / 2, w, h, 0, 0, out.width, out.height);
      return { png: out.toDataURL('image/png').split(',')[1], janela: { w, h } };
    })()
  `);
  if (cabeca.erro) { console.log('erro na cabeca:', cabeca.erro); }
  else {
    fs.writeFileSync(path.join(SAIDA, 'papagaio-cabeca-8x.png'), Buffer.from(cabeca.png, 'base64'));
    console.log(`  papagaio-cabeca-8x.png  (janela ${cabeca.janela.w}x${cabeca.janela.h}, 8x)`);
  }

  if (erros.length) console.log('\nconsole do renderer:\n' + erros.join('\n'));
  win.destroy();
  // O HTML e um artefato temporario na raiz do projeto.
  try { fs.unlinkSync(HTML); } catch (e) { /* ja removido */ }
  app.quit();
}).catch((e) => { console.error(e); app.quit(); });

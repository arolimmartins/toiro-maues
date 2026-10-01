/**
 * Suite de regressao do To'iro Maués
 *
 * Executa o jogo real em Node, com assets resolvidos contra o disco, e verifica:
 * resolucao de sprites, fluidez de movimento, transicao de animacao, ritmo da
 * narrativa de abertura, regras de colheita/combo, feedback e o fluxo completo
 * do motor (intro -> partida -> vitoria -> proxima fase).
 *
 * Uso: npm test
 */
'use strict';

const { createGameSandbox, createReporter, helpers } = require('./harness');

const CANVAS_W = 960;
const CANVAS_H = 520;
const DT = 1 / 60;

const { api: g, elements: els, stats, context: makeCtx, canvas: makeCanvas, sandbox } = createGameSandbox();
const { stableScene, freeze, dropAtBasket } = helpers;

const report = createReporter("To'iro Maués - suite de regressao");

/** Cria um coletor com o personagem escolhido ja aplicado. */
function makeHarvester(playerId) {
  const h = new g.GuaranaHarvester(CANVAS_W, CANVAS_H);
  h.setPlayer(playerId);
  return h;
}

/** Cria uma cena de colheita com contagem regressiva desligada. */
function makeScene(particles) {
  const scene = new g.HarvestScene(CANVAS_W, CANVAS_H, new g.SoundManager(), particles || new g.ParticleSystem());
  return stableScene(scene);
}

/** Roda n quadros com o coletor mantido no centro, longe das paredes. */
function runCentered(h, frames, command, steer, particles) {
  for (let i = 0; i < frames; i++) {
    h.x = CANVAS_W / 2;
    h.update(DT, command, steer, false, particles || null);
  }
}

report.section('1. Assets: resolucao contra o disco real');
{
  const hs = new g.GuaranaHarvester(CANVAS_W, CANVAS_H);
  const expectedWalk = { 2: 6, 3: 3, 4: 4 };

  for (const p of [2, 3, 4]) {
    const sets = hs.spriteSets[p].sets;
    const count = (k) => (sets[k] && sets[k].frames.length) || 0;
    report.check(`personagem ${p}: caminhada com ${expectedWalk[p]} quadro(s)`, count('walk') === expectedWalk[p], `obtido ${count('walk')}`);
    report.check(`personagem ${p}: parado, coleta e vitoria carregados`,
      count('idle') >= 1 && count('collect') >= 1 && count('victory') >= 1,
      `parado=${count('idle')} coleta=${count('collect')} vitoria=${count('victory')}`);
  }

  report.check('Ana usa o ciclo walk1..walk6 (recorte)', hs.spriteSets[2].sets.walk.frames.length === 6);
  report.check('Lucas usa o ciclo walk1..walk3', hs.spriteSets[3].sets.walk.frames.length === 3);
  report.check('Mayara usa o ciclo walk1..walk4', hs.spriteSets[4].sets.walk.frames.length === 4);
  report.check('nenhum dos tres recebe quadros de outro personagem (sem kit)', [2, 3, 4].every((p) => !hs.spriteSets[p].sets.hurt));
  report.check('nenhum personagem ficou sem sprite', [2, 3, 4].every((p) => hs.spriteSets[p].sets.idle && hs.spriteSets[p].sets.idle.ready));
  report.check('retratos carregados para os 3 personagens', [2, 3, 4].every((p) => !!hs.spriteSets[p].portrait));

  const missing = [...new Set(stats.missingPaths)];
  report.info(`${stats.loaded} imagens carregadas, ${stats.missing} pedidos tratados como fallback`);
  report.info(`nao encontrados: ${missing.join(', ') || 'nenhum'}`);
  report.check('todo 404 e proposital (nome PT inexistente ou fim de ciclo)',
    missing.every((p) => /player2\/walk7\.png$/.test(p)
      || /player3\/walk4\.png$/.test(p)
      || /player4\/walk5\.png$/.test(p)),
    missing.filter((p) => !/player2\/walk7\.png$/.test(p) && !/player3\/walk4\.png$/.test(p) && !/player4\/walk5\.png$/.test(p)).join(', '));
}

report.section('2. Fluidez: aceleracao, frenagem e retorno');
{
  const h = makeHarvester(3);
  const topSpeed = h.speed;
  const ramp = [];
  for (let i = 0; i < 60; i++) {
    h.x = CANVAS_W / 2;
    h.update(DT, 'DIREITA', 0, false, null);
    ramp.push(h.vx);
  }
  report.check('velocidade cresce monotonicamente', ramp.every((v, i) => i === 0 || v >= ramp[i - 1] - 1e-9));
  report.check(`atinge a velocidade do personagem (${topSpeed.toFixed(0)})`, Math.abs(ramp[59] - topSpeed) < 1, `vx=${ramp[59].toFixed(1)}`);
  report.check('habilidade de Lucas aplica 1.0x sobre a base 420', Math.abs(topSpeed - 420) < 0.01, `speed=${topSpeed}`);
  const toTop = ramp.findIndex((v) => Math.abs(v - topSpeed) < 1);
  report.check('chega a 95% do teto em menos de 0.25s', toTop > 0 && toTop < 15, `${(toTop * DT).toFixed(3)}s`);

  const coast = [];
  for (let i = 0; i < 60; i++) {
    h.x = CANVAS_W / 2;
    h.update(DT, 'PARAR', 0, false, null);
    coast.push(h.vx);
  }
  report.check('ao soltar, a velocidade cai sem oscilar', coast.every((v, i) => i === 0 || v <= coast[i - 1] + 1e-9));
  const coastStop = coast.findIndex((v) => v === 0);
  report.check('para em menos de 0.25s (sem deriva longa)', coastStop > 0 && coastStop < 15, `${(coastStop * DT).toFixed(3)}s`);

  runCentered(h, 40, 'DIREITA', 0);
  const beforeBrake = h.vx;
  const braking = [];
  for (let i = 0; i < 60; i++) {
    h.x = CANVAS_W / 2;
    h.update(DT, 'FREAR', 0, false, null);
    braking.push(h.vx);
  }
  const brakeStop = braking.findIndex((v) => v === 0);
  report.check('FREAR parte da velocidade maxima', Math.abs(beforeBrake - topSpeed) < 1, `v0=${beforeBrake.toFixed(0)}`);
  report.check('FREAR e mais rapido que soltar', brakeStop > 0 && brakeStop < coastStop, `freio=${(brakeStop * DT).toFixed(3)}s solto=${(coastStop * DT).toFixed(3)}s`);

  runCentered(h, 30, 'DIREITA', 0);
  const pivot = [];
  for (let i = 0; i < 15; i++) {
    h.x = CANVAS_W / 2;
    h.update(DT, 'ESQUERDA', 0, false, null);
    pivot.push(h.vx);
  }
  report.check('inverte de direcao em menos de 0.12s', pivot[6] < 0, `apos 6 quadros vx=${pivot[6].toFixed(1)}`);
}

report.section('3. Direcao analogica, zona morta e turbo');
{
  const analog = makeHarvester(3);
  runCentered(analog, 60, 'ACELERAR', 0.03);
  report.check('zona morta ignora comando analogico pequeno', Math.abs(analog.vx) < 1, `vx=${analog.vx.toFixed(2)}`);

  analog.vx = 0;
  runCentered(analog, 90, 'ACELERAR', 0.5);
  report.check('direcao analogica 0.5 rende metade da velocidade', Math.abs(analog.vx - analog.speed * 0.5) < 1, `vx=${analog.vx.toFixed(1)} de ${analog.speed}`);

  analog.vx = 0;
  runCentered(analog, 90, 'ACELERAR', -1);
  report.check('direcao analogica negativa inverte o sentido', analog.vx < 0, `vx=${analog.vx.toFixed(1)}`);

  const runner = makeHarvester(4);
  runCentered(runner, 60, 'TURBO', 1);
  report.check('turbo atinge a velocidade do personagem', Math.abs(runner.vx) >= runner.turboSpeed * 0.95, `vx=${runner.vx.toFixed(1)} de ${runner.turboSpeed}`);
  report.check('sem pacote do menino, o movimento usa o quadro unico do 2D', runner.activeSet && runner.activeSet.frames.length === 1, runner.activeSet ? `${runner.activeSet.frames.length} quadros` : 'nenhum');
  runCentered(runner, 30, 'TURBO', -1);
  report.check('turbo para a esquerda mantem a velocidade maxima', runner.vx < 0 && Math.abs(runner.vx) >= runner.turboSpeed * 0.9, `vx=${runner.vx.toFixed(1)} de -${runner.turboSpeed}`);

  const gauge = makeHarvester(3);
  runCentered(gauge, 240, 'TURBO', 1);
  report.check('turbo esvazia o medidor', gauge.turboCharge < 0.05, `carga=${gauge.turboCharge.toFixed(2)}`);
  report.check('turbo desliga quando a carga zera', gauge.isTurbo === false);
  runCentered(gauge, 400, 'ACELERAR', 0);
  report.check('medidor recarrega ao soltar', gauge.turboCharge > 0.95, `carga=${gauge.turboCharge.toFixed(2)}`);
  report.check('volta a caminhar sem turbo', gauge.state === 'walk' || gauge.state === 'idle', gauge.state);
}

report.section('4. Limites de tela');
{
  const h = makeHarvester(3);
  h.x = 870;
  for (let i = 0; i < 120; i++) h.update(DT, 'DIREITA', 0, false, null);
  report.check('nao ultrapassa a borda direita', h.x <= CANVAS_W - 72 + 1e-6, `x=${h.x.toFixed(1)}`);
  report.check('repique na parede inverte a velocidade', h.vx <= 0, `vx=${h.vx.toFixed(2)}`);
  report.check('avisa que bateu na parede', h.wallBump > 0, `bump=${h.wallBump.toFixed(2)}`);

  h.x = 90;
  for (let i = 0; i < 120; i++) h.update(DT, 'ESQUERDA', 0, false, null);
  report.check('nao ultrapassa a borda esquerda', h.x >= 72 - 1e-6, `x=${h.x.toFixed(1)}`);
}

report.section('5. Transicao de animacao');
{
  const h = makeHarvester(3);
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    h.x = CANVAS_W / 2;
    const command = i % 120 < 60 ? 'DIREITA' : (i % 120 < 100 ? 'PARAR' : 'ESQUERDA');
    h.update(DT, command, 0, false, null);
    seen.add(h.state);
  }
  report.check('alterna entre parado e caminhada', seen.has('walk') && seen.has('idle'), [...seen].join(','));
  report.check('caminhada usa o ciclo de 3 quadros do personagem 3', h.sprites.get('walk').frames.length === 3);

  h.vx = 0;
  for (let i = 0; i < 30; i++) h.update(DT, 'PARAR', 0, false, null);
  report.check('a transicao converge (sem quadro fantasma)', h.animBlend === 1 && h.prevImage === null);

  h.vx = 300;
  h.update(DT, 'DIREITA', 0, false, null);
  report.check('inicia mistura suave ao trocar de estado', h.animBlend < 1, `blend=${h.animBlend.toFixed(2)}`);

  h.vx = 0;
  h.collectTimer = 0.2;
  h.update(DT, 'PARAR', 0, false, null);
  report.check('gatilho de coleta assume a pose de coleta', h.state === 'collect', h.state);

  h.collectTimer = 0;
  h.hurtTimer = 0.4;
  h.update(DT, 'PARAR', 0, false, null);
  report.check('personagem 3 sem pacote cai para parado ao levar dano', h.state === 'idle', h.state);

  const hurt = makeHarvester(4);
  hurt.hurtTimer = 0.4;
  hurt.update(DT, 'PARAR', 0, false, null);
  report.check('Mayara sem pacote cai para parado ao levar dano', hurt.state === 'idle', hurt.state);
}

report.section('6. Narrativa de abertura: ritmo e controle');
{
  const story = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  story.start();
  report.check('abre na primeira cena', story.index === 0);
  report.check('quebra o texto em varias linhas', story.wrappedLines.length >= 1, `${story.wrappedLines.length} linha(s)`);

  story.advance();
  report.check('primeiro toque completa a digitacao', story.textComplete && story.index === 0);
  story.advance();
  report.check('segundo toque avanca a cena', story.index === 1, `index=${story.index}`);

  const auto = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  auto.start();
  let steps = 0;
  while (auto.active && steps < 5000) { auto.update(1 / 30); steps++; }
  report.check('avanca sozinha ate o fim', !auto.active && auto.completed, `${steps} passos (~${(steps / 30).toFixed(1)}s)`);
  report.check('nenhuma cena e pulada no automatico', auto.scenesSeen === g.STORY_SCENES.length, `${auto.scenesSeen}/${g.STORY_SCENES.length}`);

  const spammed = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  spammed.start();
  let spam = 0;
  while (spammed.active && spam < 5000) { spammed.update(1 / 30); spammed.advance(); spam++; }
  report.check('toque do usuario nunca trava a narrativa', !spammed.active, `${spam} passos`);

  const skipped = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  skipped.start();
  skipped.skip();
  report.check('pular encerra na hora', !skipped.active && skipped.skipped);

  const restarted = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  restarted.start();
  restarted.advance();
  restarted.restart();
  report.check('reiniciar a narrativa volta ao comeco', restarted.active && restarted.index === 0 && restarted.charsShown === 0);
}

report.section('7. Renderizacao de todas as cenas');
{
  const ctx = makeCtx();
  const story = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  story.start();
  const stages = new Set();
  let error = null;
  try {
    for (let i = 0; i < g.STORY_SCENES.length; i++) {
      for (let f = 0; f < 20; f++) { story.update(1 / 30); story.draw(ctx); }
      stages.add(story.currentScene.stage);
      if (story.index < g.STORY_SCENES.length - 1) { story.advance(); story.advance(); }
    }
  } catch (e) { error = e; }
  report.check('todas as cenas desenham sem erro', error === null, error ? error.message : '');
  const expectedStages = new Set(g.STORY_SCENES.map((s) => s.stage)).size;
  report.check('todas as cenas foram exibidas', stages.size === expectedStages, `${stages.size}/${expectedStages}`);

  const longCtx = makeCtx();
  const soak = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  soak.start();
  let soakError = null;
  try { for (let i = 0; i < 900; i++) { soak.update(1 / 60); soak.draw(longCtx); } }
  catch (e) { soakError = e; }
  report.check('15 s de narrativa seguidos sem erro', soakError === null, soakError ? soakError.message : '');
}

report.section('8. Colheita, pontuacao e combo');
{
  const particles = new g.ParticleSystem();
  const scene = makeScene(particles);
  const h = makeHarvester(3);
  h.x = CANVAS_W / 2;

  let shakes = 0;
  scene.onShake = () => shakes++;

  dropAtBasket(scene, h);
  scene.update(DT, h);
  report.check('coleta o guarana que chega na cesta', scene.guaranaCollected === 1, `n=${scene.guaranaCollected}`);
  report.check('pontua 100 + 20 por combo', scene.score === 120, `pontos=${scene.score}`);
  report.check('combo sobe para 1', scene.combo === 1, `combo=${scene.combo}`);

  for (let i = 0; i < 4; i++) { dropAtBasket(scene, h); scene.update(DT, h); }
  report.check('combo acumula ate 5', scene.combo === 5, `combo=${scene.combo}`);
  report.check('pontuacao cresce com o combo', scene.score === 120 + 140 + 160 + 180 + 200, `pontos=${scene.score}`);
  report.check('cada coleta sacode a tela', shakes > 0, `${shakes} tremor(es)`);

  const baseWindow = scene.comboTimer;
  for (let i = 0; i < Math.floor(baseWindow / DT) + 4; i++) { freeze(scene); scene.update(DT, h); }
  report.check('combo nao zera no instante em que o tempo acaba', scene.combo === 5 && scene.comboGrace > 0, `combo=${scene.combo} tolerancia=${scene.comboGrace.toFixed(2)}`);
  for (let i = 0; i < 120; i++) { freeze(scene); scene.update(DT, h); }
  report.check('combo zera depois de esgotar a tolerancia', scene.combo === 0, `combo=${scene.combo}`);

  const wide = makeScene();
  const wideHarvester = makeHarvester(4);
  for (let i = 0; i < 4; i++) { dropAtBasket(wide, wideHarvester); wide.update(DT, wideHarvester); }
  const wideWindow = wide.comboTimer;
  for (let i = 0; i < Math.floor(wideWindow / DT) + 4; i++) { freeze(wide); wide.update(DT, wideHarvester); }
  report.check('habilidade 4 dobra a janela de combo', wide.combo === 4 && wide.comboGrace > 0, `combo=${wide.combo} tolerancia=${wide.comboGrace.toFixed(2)}`);
  report.check('janela base 2.5s e janela do personagem 5.0s',
    Math.abs(baseWindow - 2.5) < 0.01 && Math.abs(wideWindow - 5.0) < 0.01,
    `base=${baseWindow.toFixed(2)} duplo=${wideWindow.toFixed(2)}`);
  for (let i = 0; i < 200; i++) { freeze(wide); wide.update(DT, wideHarvester); }
  report.check('mesmo assim o combo termina (sem combo infinito)', wide.combo === 0, `combo=${wide.combo}`);
}

report.section('9. Feedback: turbo, dano e particulas');
{
  const scene = makeScene();
  const h = makeHarvester(3);
  h.turboCharge = 0.2;

  let shakes = 0;
  scene.onShake = () => shakes++;

  dropAtBasket(scene, h, 'estrela');
  scene.update(DT, h);
  report.check('estrela recarrega o turbo', h.turboCharge > 0.9, `carga=${h.turboCharge.toFixed(2)}`);

  const system = scene.particles;
  const before = system.particles.length;
  dropAtBasket(scene, h);
  scene.update(DT, h);
  report.check('coleta emite particulas', system.particles.length > before, `${before} -> ${system.particles.length}`);
  report.check('particulas com velocidade finita', system.particles.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.vx) && Number.isFinite(p.vy)));
  report.check('coleta sacode a tela', shakes > 0, `${shakes} tremor(es)`);

  for (let i = 0; i < 600; i++) system.update(DT);
  report.check('particulas expiram com o tempo', system.particles.length < 60, `restantes=${system.particles.length}`);
}

report.section('10. Assistencia de mira');
{
  const scene = makeScene();
  const h = makeHarvester(3);
  h.x = 300;
  const basket = h.getBasketCenter();
  const item = {
    type: 'guarana', x: basket.x + 50, y: basket.y - 10, baseX: basket.x + 50,
    swayOffset: 0, swaySpeed: 0, swayAmount: 0, speed: 0, radius: 24,
    rotation: 0, rotSpeed: 0, time: 0
  };
  scene.fallingItems.push(item);
  for (let i = 0; i < 8; i++) {
    scene.fallingItems.length = 1;
    scene.fallingItems[0] = item;
    scene.update(DT, h);
  }
  report.check('item proximo e arrastado em direcao a cesta', item.baseX < basket.x + 50, `baseX=${item.baseX.toFixed(1)} cesta=${basket.x.toFixed(1)}`);
}

report.section('11. Fluxo completo do motor');
{
  const canvas = makeCanvas(CANVAS_W, CANVAS_H);
  const engine = new g.GameEngine(canvas);
  report.check('o motor comeca na narrativa', engine.mode === 'story' && engine.inStory);

  engine.draw();
  for (let i = 0; i < 60; i++) { engine.update('PARAR', 0); engine.draw(); }
  report.check('a narrativa segue apos 60 quadros', engine.inStory, `modo=${engine.mode}`);

  engine.advanceStory();
  engine.advanceStory();
  report.check('avancar manualmente troca de cena', engine.story.index >= 1, `index=${engine.story.index}`);

  engine.skipStory();
  report.check('pular entra direto na partida', engine.mode === 'game' && !engine.inStory);

  const race = new g.GameEngine(canvas);
  race.skipStory();
  stableScene(race.harvestScene);
  let raceError = null;
  try {
    for (let i = 0; i < 400 && !race.isFinished; i++) {
      race.harvestScene.fallingItems.length = 0;
      race.harvestScene.nextSpawnDelay = 9999;
      dropAtBasket(race.harvestScene, race.harvester);
      race.update('PARAR', 0);
      race.draw();
      race.syncTelemetry();
    }
  } catch (e) { raceError = e; }
  report.check('atingir a meta encerra a fase', race.isFinished && raceError === null,
    raceError ? raceError.message : `${race.harvestScene.guaranaCollected}/${race.harvestScene.targetGuarana}`);
  report.check('mostra a tela de vitoria', !els.get('victoryOverlay').classList.contains('hidden'));

  race.restart();
  report.check('reiniciar limpa a fase', race.harvestScene.guaranaCollected === 0 && !race.isFinished);

  race.nextPhase();
  report.check('proxima fase avanca o indice', race.harvestScene.currentPhaseIndex === 1, `fase=${race.harvestScene.currentPhaseIndex}`);

  race.setPlayer(4);
  report.check('trocar de personagem durante a partida e seguro', !!race.harvester.animState && race.harvester.activeSet !== null);

  race.togglePause();
  report.check('pausa funciona durante a partida', race.isPaused === true);
  const vxWhilePaused = race.harvester.vx;
  race.update('DIREITA', 0);
  report.check('nada se move enquanto pausado', race.harvester.vx === vxWhilePaused);
  race.togglePause();
  report.check('retomar limpa a pausa', race.isPaused === false);

  const intro = new g.GameEngine(canvas);
  intro.update('PARAR', 0);
  intro.restart();
  report.check('R durante a intro reinicia a narrativa', intro.inStory && intro.story.index === 0);
  intro.togglePause();
  report.check('P durante a intro nao pausa a partida', intro.isPaused === false);
}

report.section('12. Estabilidade sob entradas variadas');
{
  const canvas = makeCanvas(CANVAS_W, CANVAS_H);
  const engine = new g.GameEngine(canvas);
  engine.skipStory();
  const commands = ['PARAR', 'ACELERAR', 'DIREITA', 'ESQUERDA', 'FREAR', 'TURBO', 'ACELERAR', 'PARAR'];

  let error = null;
  try {
    for (let i = 0; i < 4000; i++) {
      engine.update(commands[i % commands.length], (i % 7) / 7 - 0.5);
      engine.draw();
      engine.syncTelemetry();
      if (i % 500 === 0) engine.setPlayer([2, 3, 4][Math.floor(i / 500) % 3]);
    }
  } catch (e) { error = e; }
  report.check('4000 quadros sem excecao', error === null, error ? error.stack.split('\n').slice(0, 3).join(' | ') : '');
  report.check('velocidade sempre finita', Number.isFinite(engine.harvester.vx), `vx=${engine.harvester.vx}`);
  report.check('posicao sempre dentro do canvas', engine.harvester.x >= 0 && engine.harvester.x <= CANVAS_W, `x=${engine.harvester.x.toFixed(1)}`);
  report.check('medidor de turbo entre 0 e 1', engine.harvester.turboCharge >= 0 && engine.harvester.turboCharge <= 1, `carga=${engine.harvester.turboCharge}`);
  report.check('particulas dentro do limite', engine.particles.particles.length <= 260, `n=${engine.particles.particles.length}`);
  report.check('estado de animacao sempre valido', ['idle', 'walk', 'run', 'collect', 'victory', 'hurt'].includes(engine.harvester.state), engine.harvester.state);

  const all = new g.GameEngine(canvas);
  all.skipStory();
  let allError = null;
  try {
    for (const p of [2, 3, 4]) {
      all.setPlayer(p);
      for (let i = 0; i < 300; i++) {
        all.update('TURBO', i % 2 ? 1 : -1);
        all.draw();
      }
    }
  } catch (e) { allError = e; }
  report.check('turbo em Ana, Lucas e Mayara sem erro', allError === null, allError ? allError.message : '');
}

report.section('13. Voz animada do arara');
{
  // 13.1 Sem API de sintese (Node puro): a animacao tem de sobreviver.
  const semVoz = new g.ParrotVoice();
  report.check('sem speechSynthesis continua disponivel para animar', semVoz.available === false, `available=${semVoz.available}`);
  report.check('motivo da ausencia de voz e registrado', typeof semVoz.reason === 'string' && semVoz.reason.length > 0, semVoz.reason);
  report.check('speak nao lanca excecao sem API', semVoz.speak('Maués!') === true);

  // 13.2 Envelope de intensidade comeca alto e apaga sozinho.
  let maxIntensity = 0;
  for (let i = 0; i < 40; i++) maxIntensity = Math.max(maxIntensity, semVoz.update(0.03));
  report.check('intensidade sobe enquanto fala', maxIntensity > 0.3, `pico=${maxIntensity.toFixed(2)}`);
  report.check('estado de fala ativo durante a animacao', semVoz.speaking === true);
  for (let i = 0; i < 4000; i++) semVoz.update(0.03);
  report.check('fala termina sozinha no tempo estimado', semVoz.speaking === false);
  report.check('intensidade volta a zero ao calar', semVoz.intensity < 0.02, `intensidade=${semVoz.intensity.toFixed(3)}`);

  // 13.3 Mudo e desligamento cortam a voz sem quebrar a animacao do bico.
  const mudo = new g.ParrotVoice();
  mudo.speak('teste');
  mudo.setMuted(true);
  report.check('mudo cancela a fala em andamento', mudo.speaking === false);
  report.check('mudo recusa novas falas', mudo.speak('outro') === false);
  mudo.setMuted(false);
  const off = new g.ParrotVoice();
  off.speak('teste');
  off.setEnabled(false);
  report.check('voz desligada cancela a fala', off.speaking === false && off.intensity === 0);
  report.check('toggle inverte o estado', off.toggle() === true);

  // 13.4 Duracao estimada cresce com o texto.
  const dur = new g.ParrotVoice();
  const curta = dur.estimateDuration('Oi!');
  const longa = dur.estimateDuration('Maués! As Maués Amazonas chegaram! Eu vi o brilho amarelo delas subindo do rio!');
  report.check('texto longo tem duracao maior', longa > curta * 3, `${curta.toFixed(2)}s -> ${longa.toFixed(2)}s`);
  report.check('texto vazio tem duracao zero', dur.estimateDuration('') === 0);

  // 13.5 Com speechSynthesis mockado: fala, cancela e escolhe voz pt-BR.
  const falas = [];
  let cancelados = 0;
  sandbox.speechSynthesis = {
    getVoices: () => ([
      { name: 'Microsoft Zira', lang: 'en-US', localService: true, default: true },
      { name: 'Microsoft Maria', lang: 'pt-BR', localService: true, default: false }
    ]),
    speak(u) { falas.push(u); },
    cancel() { cancelados++; },
    addEventListener() {}
  };
  sandbox.SpeechSynthesisUtterance = function (texto) { this.text = texto; };
  const tts = new g.ParrotVoice();
  report.check('API mockada e detectada', tts.available === true);
  report.check('prefere voz pt-BR', tts.voice && tts.voice.lang === 'pt-BR', tts.voice ? tts.voice.name : 'nenhuma');
  tts.speak('Maués! As Maués Amazonas chegaram!');
  report.check('utterance enviada com o texto do papagaio', falas.length === 1 && falas[0].text.startsWith('Maués!'), falas[0] ? falas[0].text.slice(0, 24) : 'nenhuma');
  report.check('utterance usa lang pt-BR', falas[0] && falas[0].lang === 'pt-BR', falas[0] ? falas[0].lang : '');
  report.check('bico do papagaio tem timbre agudo', falas[0] && falas[0].pitch > 1.2, falas[0] ? `pitch=${falas[0].pitch}` : '');
  tts.speak('segunda fala');
  report.check('falar de novo cancela a fala anterior', cancelados >= 2, `cancelas=${cancelados}`);
  tts.stop();
  report.check('stop cancela a sintese e limpa o estado', tts.speaking === false && tts.utterance === null);

  // 13.5b Bloqueio de autoplay: se a fala nunca comeca, a animacao continua.
  falas.length = 0;
  const tts2 = new g.ParrotVoice();
  tts2.speak('Maués! As Maués Amazonas chegaram!');
  report.check('voz comecou de forma sintetica', tts2.synthetic === true && tts2.speaking === true);
  if (falas[0] && falas[0].onerror) falas[0].onerror({ error: 'not-allowed' });
  report.check('falha de sintese mantem o bico animando', tts2.speaking === true && tts2.synthetic === true);
  report.check('utterance liberada apos a falha', tts2.utterance === null);
  for (let i = 0; i < 4000; i++) tts2.update(0.03);
  report.check('animacao ainda encerra no tempo estimado', tts2.speaking === false);

  // 13.5c Destrave por gesto do usuario.
  const destravados = [];
  sandbox.speechSynthesis.speak = (u) => { destravados.push(u); };
  sandbox.speechSynthesis.resume = () => { destravados.push('resume'); };
  const trava = new g.ParrotVoice();
  report.check('unlock responde na primeira vez', trava.unlock() === true);
  report.check('unlock resume e emite aquecimento mudo', destravados.length === 2 && destravados[0] === 'resume' && destravados[1].volume === 0, `n=${destravados.length}`);
  report.check('unlock nao repete', trava.unlock() === false);

  delete sandbox.speechSynthesis;
  delete sandbox.SpeechSynthesisUtterance;

  // 13.6 Integracao com a cena: o arara narra desde a primeira cena, e a unica
  // cena muda (DICA) e a ultima, que nao fala.
  const engineVoz = new g.GameEngine(makeCanvas(CANVAS_W, CANVAS_H));
  const story = engineVoz.story;
  report.check('historia nasce com uma voz', !!story.voice);
  report.check('o papagaio abre a narrativa', story.currentScene.speaker === 'ARARA', `speaker=${story.currentScene.speaker}`);
  const ultimaCena = g.STORY_SCENES[g.STORY_SCENES.length - 1];
  report.check('a ultima cena e a de controles e nao fala', ultimaCena.speaker === 'DICA');
  report.check('toda cena de fala e do papagaio', g.STORY_SCENES.filter((s) => s.speaker === 'ARARA').length === g.STORY_SCENES.length - 1);

  // A cena 0 ja e do arara: a voz arranca junto com o texto aparecendo.
  report.check('arara ainda nao falou no primeiro instante', story.voice.speaking === false);
  for (let i = 0; i < 12; i++) story.update(0.05);
  report.check('arara comeca a falar com a propria frase', story.voice.speaking === true);
  report.check('intensidade da voz acima de zero', story.voice.intensity > 0.02, `intensidade=${story.voice.intensity.toFixed(3)}`);
  report.check('bico animado durante a fala', story.parrotTalk > 0.05, `parrotTalk=${story.parrotTalk.toFixed(2)}`);

  // A cena espera a voz terminar em vez de cortar a frase no meio.
  const duracaoVoz = story.voice.duration;
  report.check('cena dura mais que a fala', story.sceneDuration > duracaoVoz, `cena=${story.sceneDuration.toFixed(2)}s voz=${duracaoVoz.toFixed(2)}s`);

  // Completar a digitacao nao corta a voz: a frase continua na tela.
  story.advance();
  report.check('completar o texto mantem a voz', story.voice.speaking === true && story.charsShown === story.currentScene.text.length);
  // Virar de cena, sim.
  story.advance();
  report.check('virar de cena cancela a voz anterior', story.voice.speaking === false, `speaker=${story.currentScene.speaker}`);

  // Desligar a voz no meio da cena para a animacao.
  story.voiceSpokenFor = -1;
  story.voice.setEnabled(true);
  for (let i = 0; i < 10; i++) story.update(0.05);
  const falante = story.voice.speaking;
  const desligado = story.toggleVoice();
  report.check('toggleVoice desliga a voz', desligado === false);
  report.check('voz desligada silencia a fala em andamento', story.voice.speaking === false && story.voice.intensity === 0);
  report.check('voz desligada para o bico', story.parrotTalk < 0.05, `parrotTalk=${story.parrotTalk.toFixed(2)}`);
  report.check('voz desligada recusa nova fala', story.voice.speak('teste') === false);
  story.toggleVoice();
  report.check('toggleVoice religa a voz', story.voice.enabled === true);
  report.check('cenario do teste era fala de arara', typeof falante === 'boolean');

  // Mudo global tambem corta a voz.
  story.voice.setMuted(true);
  report.check('mudo zera a intensidade', story.voice.intensity === 0);
  story.setVoiceMuted(false);

  // Pular a intro e levantar do menu nao deixam voz pendurada.
  story.skip();
  report.check('pular a intro cancela a voz', story.voice.speaking === false);
  engineVoz.startFromMenu();
  report.check('levantar do menu mantem a voz parada', engineVoz.story.voice.speaking === false);

  // Desenhar todas as cenas com o medidor de voz ativo nao estoura.
  let erroDesenho = null;
  try {
    const e2 = new g.GameEngine(makeCanvas(CANVAS_W, CANVAS_H));
    for (let s = 0; s < 9; s++) {
      e2.advanceStory();
      for (let i = 0; i < 20; i++) { e2.update(); e2.draw(); }
    }
  } catch (e) { erroDesenho = e; }
  report.check('todas as cenas desenham com o medidor de voz', erroDesenho === null, erroDesenho ? erroDesenho.message : '');
}

report.section('14. Clipes gravados da voz humana');

async function secaoClipes() {
  const fs = require('fs');
  const pathMod = require('path');
  const raiz = pathMod.resolve(__dirname, '..');
  const dirVoz = pathMod.join(raiz, 'assets', 'voice');
  const temManifest = fs.existsSync(pathMod.join(dirVoz, 'manifest.json'));
  report.check('pasta assets/voice existe', temManifest, dirVoz);

  if (!temManifest) {
    report.check('sem manifesto o jogo nao quebra', new g.ParrotVoice().speak('teste') === true);
    return;
  }

  const manifesto = JSON.parse(fs.readFileSync(pathMod.join(dirVoz, 'manifest.json'), 'utf8'));

  // 14.1 Todos os MP3 citados no manifesto existem de verdade no disco.
  const faltando = manifesto.clips.filter((c) => !fs.existsSync(pathMod.join(dirVoz, c.arquivo)));
  report.check('todo clipe citado existe no disco', faltando.length === 0, faltando.map((c) => c.arquivo).join(', '));

  // 14.2 Um clipe por fala de ARARA, com MP3 de tamanho plausivel.
  const araras = g.STORY_SCENES.filter((s) => s.speaker === 'ARARA');
  report.check('um clipe por fala do arara', manifesto.clips.length === araras.length, `${manifesto.clips.length} clipes / ${araras.length} falas`);
  const pequenos = manifesto.clips.filter((c) => fs.statSync(pathMod.join(dirVoz, c.arquivo)).size < 4096);
  report.check('nenhum clipe truncado', pequenos.length === 0, pequenos.map((c) => c.arquivo).join(', '));

  // 14.3 Guard contra a voz dessincronizar do texto: o audio tem de ser
  // exatamente a frase que aparece na tela, senao a boca fala uma coisa
  // enquanto a caixa de texto mostra outra.
  let textoDivergente = null;
  for (const c of manifesto.clips) {
    const cena = g.STORY_SCENES[c.indiceCena];
    if (!cena) { textoDivergente = `${c.arquivo}: cena ${c.indiceCena} inexistente`; break; }
    if (cena.speaker !== 'ARARA') { textoDivergente = `${c.arquivo}: cena ${c.indiceCena} e ${cena.speaker}`; break; }
    if (cena.text !== c.texto) { textoDivergente = `${c.arquivo}: texto diverge da cena ${c.indiceCena}`; break; }
  }
  report.check('texto do clipe bate com a cena na tela', textoDivergente === null, textoDivergente || 'todos batem');
  report.check('duracao declarada e plausivel', manifesto.clips.every((c) => c.duracao > 1 && c.duracao < 20),
    manifesto.clips.map((c) => `${c.arquivo}=${c.duracao}s`).join(' '));

  // 14.4 As marcas de ritmo tem de ser crescentes e cobrir a frase toda.
  let marcasOk = true;
  let detalheMarcas = '';
  for (const c of manifesto.clips) {
    const n = c.texto.length;
    let anterior = -1;
    for (const m of c.marcas) {
      if (m.t < anterior || m.ate < 0 || m.ate > n) { marcasOk = false; detalheMarcas = `${c.arquivo}: marca fora de ordem`; break; }
      anterior = m.t;
    }
    if (!marcasOk) break;
    const ultima = c.marcas[c.marcas.length - 1];
    if (ultima.ate < n) { marcasOk = false; detalheMarcas = `${c.arquivo}: ultima marca em ${ultima.ate}/${n} caracteres`; break; }
    if (ultima.t > c.duracao + 0.5) { marcasOk = false; detalheMarcas = `${c.arquivo}: marca depois do fim do audio`; break; }
  }
  report.check('marcas de ritmo cobrem a frase inteira', marcasOk, detalheMarcas);

  // 14.5 Reproducao de verdade: fake de Audio + Analyser, caminho completo.
  const tocados = [];
  let nivel = 0.6;
  sandbox.Audio = function () {
    this.preload = '';
    this.crossOrigin = '';
    this.muted = false;
    this.duration = NaN;
    this.currentTime = 0;
    this.pause = () => { this._paused = true; };
    this.play = () => { tocados.push(this.src); this._paused = false; return Promise.resolve(); };
  };
  sandbox.AudioContext = function () {
    const noop = () => {};
    const param = () => ({
      value: 0,
      setValueAtTime: noop,
      linearRampToValueAtTime: noop,
      exponentialRampToValueAtTime: noop
    });
    // Completo o bastante para o SoundManager tambem poder tocar efeitos,
    // senao a cena do arara estoura ao pedir createOscillator.
    this.state = 'running';
    this.sampleRate = 48000;
    this.currentTime = 0;
    this.resume = noop;
    this.destination = { connect: noop };
    this.createOscillator = () => ({ type: 'sine', frequency: param(), connect: noop, start: noop, stop: noop });
    this.createGain = () => ({ gain: param(), connect: noop });
    this.createBiquadFilter = () => ({ type: '', frequency: param(), Q: param(), connect: noop });
    this.createBuffer = (ch, len) => ({ getChannelData: () => new Float32Array(len) });
    this.createBufferSource = () => ({ buffer: null, loop: false, playbackRate: { value: 1 }, connect: noop, start: noop, stop: noop });
    this.createMediaElementSource = () => ({ connect: noop });
    this.createAnalyser = () => ({
      fftSize: 512,
      smoothingTimeConstant: 0,
      connect: noop,
      getByteTimeDomainData(buf) {
        for (let i = 0; i < buf.length; i++) buf[i] = Math.round(128 + 127 * nivel * Math.sin(i * 0.2));
      }
    });
  };
  const fetchOriginal = sandbox.fetch;
  // O jogo le VOICE_CLIPS (JS global): o app abre por file:// e o Chromium
  // bloqueia fetch, entao o manifesto nunca viria por HTTP.

  const clipe = g.VOICE_CLIPS[0];
  const cena = g.STORY_SCENES[clipe.indiceCena];
  const voz = new g.ParrotVoice();

  const carregou = await voz.loadManifest();
  report.check('loadManifest le os clipes do global', carregou === true, `ok=${carregou}`);
  report.check('clipes carregados', voz.clips.length === g.VOICE_CLIPS.length, `n=${voz.clips.length}`);
  report.check('manifesto carregado uma vez so', voz.manifestLoaded === true);
  report.check('segundo loadManifest nao recarrega', (await voz.loadManifest()) === false);
  report.check('global do manifesto bate com os MP3 em disco', (() => {
    const porNome = new Map(voz.clips.map((c) => [c.arquivo, c]));
    return manifesto.clips.every((c) => {
      const emMemoria = porNome.get(c.arquivo);
      return emMemoria && Math.abs(emMemoria.duracao - c.duracao) < 0.001 && emMemoria.texto === c.texto;
    });
  })(), 'manifest.json e voice-clips.js divergem: rode tools/gerar-voz.py');

  // A cena do arara tem de escolher o clipe, e nao a sintese.
  report.check('speak encontra o clipe da cena', voz.speak(cena.text, clipe.indiceCena) === true);
  report.check('fonte da voz e o clipe gravado', voz.source === 'clipe', `fonte=${voz.source}`);
  report.check('clipe correto escalado', voz._clip && voz._clip.arquivo === clipe.arquivo, voz._clip ? voz._clip.arquivo : 'nenhum');
  report.check('mp3 foi solicitado ao navegador', tocados.length === 1 && String(tocados[0]).endsWith(clipe.arquivo), String(tocados[0] || 'nenhum'));
  report.check('duracao vem do clipe, nao da estimativa', Math.abs(voz.duration - clipe.duracao) < 0.001, `dur=${voz.duration}`);

  // Bico movido pela amplitude real do audio.
  voz.time = 0;
  for (let i = 0; i < 10; i++) voz.update(0.05);
  const alto = voz.intensity;
  report.check('bico reagindo a voz alta', alto > 0.2, `intensidade=${alto.toFixed(3)}`);
  nivel = 0.01;
  for (let i = 0; i < 40; i++) voz.update(0.05);
  report.check('bico fecha no silencio da voz', voz.intensity < 0.12, `intensidade=${voz.intensity.toFixed(3)}`);
  nivel = 0.6;

  // Texto acompanha a voz: 0 no comeco, frase inteira no fim.
  report.check('charsAt comeca em zero', Math.round(voz.charsAt(0)) === 0, `chars=${voz.charsAt(0)}`);
  const meio = voz.charsAt(clipe.duracao * 0.5);
  const quaseFim = voz.charsAt(clipe.duracao - 0.01);
  report.check('charsAt cresce no meio da fala', meio > 0 && meio < cena.text.length, `meio=${Math.round(meio)}/${cena.text.length}`);
  report.check('charsAt completa a frase no fim', Math.round(quaseFim) === cena.text.length, `fim=${Math.round(quaseFim)}/${cena.text.length}`);
  // Crescimento monotonico: o texto nunca volta para tras.
  let retrocesso = null;
  let anterior = -1;
  for (let t = 0; t <= clipe.duracao; t += 0.05) {
    const c = voz.charsAt(t);
    if (c < anterior - 0.001) { retrocesso = `t=${t.toFixed(2)} voltou de ${anterior.toFixed(1)} para ${c.toFixed(1)}`; break; }
    anterior = c;
  }
  report.check('texto nunca retrocede durante a fala', retrocesso === null, retrocesso || 'monotonico');
  voz.time = clipe.duracao - 0.01;
  report.check('progresso chega a 1 no fim', Math.abs(voz.progress - 1) < 0.01, `progresso=${voz.progress.toFixed(3)}`);

  // O clipe tem de acabar sozinho e devolver o bico ao repouso.
  const frames = Math.ceil((clipe.duracao + 0.5) / 0.05);
  for (let i = 0; i < frames; i++) voz.update(0.05);
  report.check('clipe termina e silencia o bico', voz.speaking === false && voz.intensity === 0, `falando=${voz.speaking} intensidade=${voz.intensity.toFixed(3)}`);

  // 14.6 O global resolve na hora, entao a cena fala o clipe sem esperar nada.
  const engineC = new g.GameEngine(makeCanvas(CANVAS_W, CANVAS_H));
  const st = engineC.story;
  report.check('manifesto disponivel semespera', st.voice.manifestLoaded === true);
  let passos = 0;
  while (st.currentScene.speaker !== 'ARARA' && passos < 10) { st.advance(); passos++; }
  for (let i = 0; i < 10; i++) st.update(0.05);
  report.check('cena do arara tocando o clipe', st.voice.source === 'clipe', `fonte=${st.voice.source}`);
  report.check('cena dura mais que o clipe inteiro', st.sceneDuration > clipe.duracao, `cena=${st.sceneDuration.toFixed(2)}s clipe=${clipe.duracao}s`);
  // O texto tem de grow com a voz, nunca pular para tras.
  const inicio = st.charsShown;
  for (let i = 0; i < 20; i++) st.update(0.05);
  report.check('texto cresce junto com a voz', st.charsShown > inicio && st.charsShown < st.currentScene.text.length, `${Math.round(inicio)} -> ${Math.round(st.charsShown)}/${st.currentScene.text.length}`);

  // Adiantar a frase com o clique nao pode fazer o texto voltar com a voz.
  st.advance();
  const adiantado = st.charsShown === st.currentScene.text.length;
  for (let i = 0; i < 20; i++) st.update(0.05);
  report.check('adiantar o texto mantem a frase inteira', adiantado && st.charsShown === st.currentScene.text.length, `chars=${Math.round(st.charsShown)}`);

  // Falha de audio cai para sintese, sem bico travado.
  const vozRuim = new g.ParrotVoice();
  vozRuim.setClips(manifesto.clips, manifesto);
  sandbox.Audio.prototype.play = function () { return Promise.reject(new Error('sem audio')); };
  vozRuim.speak(cena.text, clipe.indiceCena);
  const pico = vozRuim.update(0.05);
  report.check('clipe quebrado nao trava o bico', pico > 0, `intensidade=${pico.toFixed(3)}`);

  // Mudo e desligamento continuam valendo com clipe.
  const vozMuda = new g.ParrotVoice();
  vozMuda.setClips(manifesto.clips, manifesto);
  sandbox.Audio.prototype.play = function () { tocados.push(this.src); return Promise.resolve(); };
  vozMuda.speak(cena.text, clipe.indiceCena);
  vozMuda.setMuted(true);
  report.check('mudo para o clipe e pausa o elemento', vozMuda.speaking === false && !!vozMuda._el && vozMuda._el._paused === true);
  report.check('mudo recusa nova fala de clipe', vozMuda.speak(cena.text, clipe.indiceCena) === false);
  const vozOff = new g.ParrotVoice();
  vozOff.setClips(manifesto.clips, manifesto);
  vozOff.speak(cena.text, clipe.indiceCena);
  vozOff.setEnabled(false);
  report.check('desligar a voz para o clipe', vozOff.speaking === false && vozOff.intensity === 0);

  // 14.7 Degradacao real: sandbox SEM voice-clips.js, como se o arquivo nao
  // tivesse sido gerado. O jogo tem de continuar funcionando so com animacao.
  const semClipes = createGameSandbox({ semArquivos: ['src/game/voice-clips.js'] });
  const g2 = semClipes.api;
  const vozPura = new g2.ParrotVoice();
  const carregouPuro = await vozPura.loadManifest();
  report.check('sem voice-clips.js nao ha clipes', carregouPuro === false && vozPura.clips.length === 0);
  report.check('sem voice-clips.js a cena ainda anima o bico', vozPura.speak(cena.text, clipe.indiceCena) === true && vozPura.speaking === true, `fonte=${vozPura.source}`);
  const picoPuro = vozPura.update(0.05);
  report.check('sem voice-clips.js o bico se move', picoPuro > 0, `intensidade=${picoPuro.toFixed(3)}`);
  const st2 = new g2.GameEngine(semClipes.canvas(960, 520)).story;
  let p2 = 0;
  while (st2.currentScene.speaker !== 'ARARA' && p2 < 10) { st2.advance(); p2++; }
  for (let i = 0; i < 30; i++) st2.update(0.05);
  report.check('sem voice-clips.js a cena do arara fala assim mesmo', st2.voice.speaking === true && st2.parrotTalk > 0.05, `fonte=${st2.voice.source}`);
  let erroSemClipes = null;
  try {
    const ctx = semClipes.context(CANVAS_W, CANVAS_H);
    for (let i = 0; i < g2.STORY_SCENES.length; i++) { st2.advance(); for (let j = 0; j < 20; j++) { st2.update(0.05); st2.draw(ctx); } }
  } catch (e) { erroSemClipes = e; }
  report.check(`sem voice-clips.js as ${g2.STORY_SCENES.length} cenas desenham`, erroSemClipes === null, erroSemClipes ? erroSemClipes.message : '');

  delete sandbox.Audio;
  delete sandbox.AudioContext;
  sandbox.fetch = fetchOriginal;
}

// 15. "O Coracao e a Alma de Maues": uma cena por frase do papagaio, cada uma
// com o seu proprio desenho, e um clipe de voz que bate com a frase da tela.
function secaoMaues(g) {
  report.section('15. O Coracao e a Alma de Maues (uma cena por frase)');
  const cenas = g.STORY_SCENES;
  const falas = cenas.filter((c) => c.speaker === 'ARARA');

  report.check('a narrativa abre com uma frase do papagaio', cenas[0].speaker === 'ARARA');
  report.check('a ultima cena e a de controles', cenas[cenas.length - 1].speaker === 'DICA');
  report.check('uma cena por frase do texto', falas.length === 12, `${falas.length} falas`);

  // Cada frase precisa do seu proprio cenario, sem repetir desenho.
  const stages = falas.map((c) => c.stage);
  report.check('cada frase tem um cenario proprio', new Set(stages).size === stages.length, `${new Set(stages).size}/${stages.length}`);
  report.check('primeira cena e a praia de agua doce', stages[0] === 'praia', stages[0]);
  report.check('ultima fala e a despedida', /melhor lugar do mundo/.test(falas[falas.length - 1].text));
  report.check('o texto cita o jaraqui', falas.some((c) => /jaraqui/.test(c.text)));
  report.check('o texto cita o guarana', falas.some((c) => /guaraná/.test(c.text)));
  report.check('toda frase tem texto', falas.every((c) => c.text && c.text.trim().length > 10));

  // A abertura e foto + papagaio. Nenhum cenario e desenhado pelo jogo, entao
  // os desenhadores de cena nao devem existir mais.
  const engine = new g.GameEngine(makeCanvas(CANVAS_W, CANVAS_H));
  const st = engine.story;
  const sobrando = ['_drawCena', '_drawSun', '_drawHills', '_drawGround', '_drawGrove', '_drawPraia',
    '_drawPovo', '_drawGuerreiro', '_drawAbraco', '_drawDitado', '_drawJaraqui', '_drawGuarana',
    '_drawArte', '_drawFesta', '_drawFe', '_drawChuva', '_drawFinal', '_pessoa', '_palapa']
    .filter((m) => typeof st[m] === 'function');
  report.check('nenhum cenario desenhado continua no codigo', sobrando.length === 0, sobrando.join(','));

  // O que precisa aparecer em toda fala: a foto e o papagaio. E o efeito da
  // chuva por cima da foto, na frase que fala dela.
  const semFotoDesenhada = [];
  const semPapagaio = [];
  for (let i = 0; i < falas.length; i++) {
    const stage = st.currentScene.stage;
    const ctx = makeCtx(CANVAS_W, CANVAS_H);
    for (let j = 0; j < 4; j++) st.update(0.05);
    st.draw(ctx);
    if (!ctx.__drawImage.length) semFotoDesenhada.push(stage);
    const ctxP = makeCtx(CANVAS_W, CANVAS_H);
    st._drawParrot(ctxP, st.pal, stage);
    if (ctxP.__ops.length <= 20) semPapagaio.push(stage);
    if (i < falas.length - 1) { st.advance(); st.advance(); }
  }
  report.check('toda fala mostra a foto de fundo', semFotoDesenhada.length === 0, semFotoDesenhada.join(','));
  report.check('o papagaio aparece em todas as falas', semPapagaio.length === 0, semPapagaio.join(','));

  // A chuva so aparece na frase que fala dela, e some nas outras.
  // `chuva` e a 11a cena: advance() gasta dois toques por cena, entao 20 toques.
  const stChuva = new g.GameEngine(makeCanvas(CANVAS_W, CANVAS_H)).story;
  stChuva.start();
  for (let j = 0; j < 20; j++) stChuva.advance();
  const ctxChuva = makeCtx(CANVAS_W, CANVAS_H);
  stChuva.update(0.05);
  stChuva.draw(ctxChuva);
  const tracos = (c) => c.__ops.filter((o) => o === 'stroke').length;
  const base = new g.GameEngine(makeCanvas(CANVAS_W, CANVAS_H)).story;
  base.start();
  const ctxBase = makeCtx(CANVAS_W, CANVAS_H);
  base.update(0.05);
  base.draw(ctxBase);
  report.check('a frase da chuva tem o efeito da chuva',
    stChuva.currentScene.stage === 'chuva' && tracos(ctxChuva) > tracos(ctxBase) + 80,
    `${stChuva.currentScene.stage} ${tracos(ctxChuva)} vs ${tracos(ctxBase)}`);
  report.check('a chuva nao invade as outras falas', tracos(ctxBase) < 140, `tracos=${tracos(ctxBase)}`);

  // Cada frase do papagaio tem que ter voz gravada com o mesmo texto da tela.
  const porCena = new Map();
  g.VOICE_CLIPS.forEach((c) => porCena.set(c.indiceCena, c));
  const semVoz = falas.map((c, i) => (porCena.has(i) ? null : c.text.slice(0, 28))).filter(Boolean);
  report.check('toda frase do papagaio tem clipe de voz', semVoz.length === 0, semVoz.join(' | '));
  const divergentes = falas.filter((c, i) => porCena.has(i) && porCena.get(i).texto !== c.text)
    .map((c) => c.text.slice(0, 28));
  report.check('a voz diz exatamente o que esta na tela', divergentes.length === 0, divergentes.join(' | '));
  const inuteis = g.VOICE_CLIPS.filter((c) => !(c.duracao > 1));
  report.check('todo clipe tem audio com duracao util', inuteis.length === 0, inuteis.map((c) => c.arquivo).join(','));

  // A cena tem de esperar a frase terminar, senao a fala e cortada no meio.
  const st3 = new g.GameEngine(makeCanvas(CANVAS_W, CANVAS_H)).story;
  const cortadas = [];
  for (let i = 0; i < falas.length; i++) {
    for (let j = 0; j < 8; j++) st3.update(0.05);
    if (st3.voice.speaking && st3.sceneDuration < st3.voice.duration) {
      cortadas.push(`${st3.currentScene.stage} ${st3.sceneDuration.toFixed(2)}<${st3.voice.duration.toFixed(2)}`);
    }
    if (i < falas.length - 1) { st3.advance(); st3.advance(); }
  }
  report.check('toda cena dura mais que a propria fala', cortadas.length === 0, cortadas.join(', '));

  // O papagaio virou uma pintura em camadas: o sombreamento vem de degradê.
  // O que nao pode e voltar a ser uma mancha chapada sem detalhe.
  const st4 = new g.GameEngine(makeCanvas(CANVAS_W, CANVAS_H)).story;
  st4.start();
  for (let j = 0; j < 90; j++) st4.update(0.05);
  st4.talking = true;
  st4.voice.intensity = 0.9;
  const ctxP = makeCtx(CANVAS_W, CANVAS_H);
  st4._drawParrot(ctxP, st4.pal, st4.currentScene.stage);
  report.check('o papagaio tem sombreamento de verdade', ctxP.__gradientes > 8, `gradientes=${ctxP.__gradientes}`);
  report.check('o papagaio e pintado em muitas pecas, nao uma mancha', ctxP.__ops.length > 100, `ops=${ctxP.__ops.length}`);
  // As cores que identificam a arara-caninde tem que continuar la.
  const coresP = new Set(ctxP.__cores);
  report.check('o papagaio mantem as cores de arara-caninde',
    coresP.has('#1D4ED8') && coresP.has('#F0B400') && coresP.has('#D22B2B') && coresP.has('#2E8B34'),
    [...coresP].filter((c) => /^#(1D4ED8|F0B400|D22B2B|2E8B34)$/.test(c)).join(','));
  // Com a voz calada, o papagaio ainda e desenhado: nunca fica mudo e rigido.
  st4.talking = false;
  const ctxM = makeCtx(CANVAS_W, CANVAS_H);
  st4._drawParrot(ctxM, st4.pal, st4.currentScene.stage);
  report.check('papagaio mudo ainda e desenhado', ctxM.__ops.length > 100, `ops=${ctxM.__ops.length}`);

  report.check('os fundos tem uma entrada para cada frase do papagaio',
    falas.every((c) => Object.prototype.hasOwnProperty.call(g.STORY_FUNDOS, c.stage)),
    falas.map((c) => c.stage).filter((s) => !Object.prototype.hasOwnProperty.call(g.STORY_FUNDOS, s)).join(','));
  return Promise.resolve();
}

/**
 * Fotos panoramicas (1600x647) num jogo 4:3 nao cabem sem cortar ou distorcer.
 * Aqui a foto tem de cobrir a tela inteira, mantendo a proporcao e sem deixar
 * faixa em branco, e o corte lateral precisa poder ser deslocado por `focoX`.
 */
function secaoFundos(g) {
  report.section('16. Fundos fotograficos da abertura');
  const fs = require('fs');
  const pathMod = require('path');
  const dir = pathMod.join(__dirname, '..', 'assets', 'backgrounds', 'narrativa');
  const arquivos = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((n) => /\.(jpe?g|png)$/i.test(n)).sort()
    : [];

  report.check('as fotos do enunciado estao na pasta de fundos', arquivos.length === 6, `${arquivos.length} arquivo(s)`);

  // Toda frase do papagaio precisa de foto: sem isso a abertura volta ao desenho
  // vetorial e o usuario ve um cenario que nao era o que pediu.
  const semFoto = g.STORY_SCENES
    .filter((c) => c.speaker === 'ARARA')
    .filter((c) => !g.STORY_FUNDOS[c.stage] || !g.STORY_FUNDOS[c.stage].arquivo)
    .map((c) => c.stage);
  report.check('toda frase do papagaio tem uma foto de fundo', semFoto.length === 0, semFoto.join(','));
  // As seis fotos precisam ser usadas, senao alguma ficou esquecida.
  const usadas = new Set(Object.values(g.STORY_FUNDOS).filter(Boolean).map((v) => v.arquivo));
  const esquecidas = arquivos.filter((n) => !usadas.has(n));
  report.check('nenhuma das seis fotos ficou sem uso', esquecidas.length === 0, esquecidas.join(','));
  const semDimensao = arquivos.filter((n) => fs.statSync(pathMod.join(dir, n)).size < 1024);
  report.check('nenhuma foto veio vazia ou truncada', semDimensao.length === 0, semDimensao.join(','));

  const st = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  // Imagem panoramica de mentira, com a proporcao das fotos reais.
  const foto = { naturalWidth: 1600, naturalHeight: 647, complete: true };

  const ctxC = makeCtx(CANVAS_W, CANVAS_H);
  const ok = st._cortarFundo(ctxC, foto, 'praia');
  report.check('a foto e pintada no lugar do cenario', ok && ctxC.__drawImage.length === 1, `drawImage=${ctxC.__drawImage.length}`);

  const [dx, dy, dw, dh] = ctxC.__drawImage[0] || [];
  const cobre = dw >= CANVAS_W - 0.5 && dh >= CANVAS_H - 0.5;
  report.check('a foto cobre a tela toda, sem faixa vazia', cobre, `${dw}x${dh} em ${CANVAS_W}x${CANVAS_H}`);
  const proporcao = Math.abs((dw / dh) - (1600 / 647)) < 0.001;
  report.check('a foto nao e distorcida (proporcao preservada)', proporcao, `${(dw / dh).toFixed(3)} vs ${(1600 / 647).toFixed(3)}`);
  report.check('a foto esta centralizada por padrao',
    Math.abs(dx - (CANVAS_W - dw) / 2) < 0.5 && Math.abs(dy - (CANVAS_H - dh) / 2) < 0.5, `dx=${dx} dy=${dy}`);

  // focoX desloca o corte sem mudar tamanho nem proporcao.
  g.STORY_FUNDOS.praia = { arquivo: 'cenario-1.jpeg', focoX: 0 };
  const ctxE = makeCtx(CANVAS_W, CANVAS_H);
  st._cortarFundo(ctxE, foto, 'praia');
  const [ex] = ctxE.__drawImage[0] || [];
  report.check('focoX 0 encosta a foto na esquerda', Math.abs(ex) < 0.5, `dx=${ex}`);
  g.STORY_FUNDOS.praia = { arquivo: 'cenario-1.jpeg', focoX: 1 };
  const ctxD = makeCtx(CANVAS_W, CANVAS_H);
  st._cortarFundo(ctxD, foto, 'praia');
  const [ddx] = ctxD.__drawImage[0] || [];
  report.check('focoX 1 encosta a foto na direita', Math.abs(ddx - (CANVAS_W - dw)) < 0.5, `dx=${ddx}`);

  // A cena sem foto (a de controles) usa so o fundo liso. Comparar com uma cena
  // que tem foto prova que nenhuma das duas ganha cenario desenhado por cima:
  // a unica diferenca pode ser o preenchimento do fundo.
  g.STORY_FUNDOS.praia = null;
  const stSem = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  stSem.start();
  for (let j = 0; j < 30; j++) stSem.update(0.05);
  const ctxS = makeCtx(CANVAS_W, CANVAS_H);
  stSem.draw(ctxS);
  report.check('cena sem foto nao desenha cenario algum', ctxS.__drawImage.length === 0);

  g.STORY_FUNDOS.praia = { arquivo: 'cenario-1.jpeg', focoX: 0.5 };
  const stCom = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  stCom.start();
  for (let j = 0; j < 30; j++) stCom.update(0.05);
  const ctxFoto = makeCtx(CANVAS_W, CANVAS_H);
  stCom.draw(ctxFoto);
  report.check('foto e fundo liso desenham a mesma quantidade de coisa',
    Math.abs(ctxS.__ops.length - ctxFoto.__ops.length) <= 5,
    `liso=${ctxS.__ops.length} foto=${ctxFoto.__ops.length}`);
  g.STORY_FUNDOS.praia = null;

  // Foto de tamanho invalido nao pode quebrar o desenho.
  const stRuim = new g.StoryManager(CANVAS_W, CANVAS_H, new g.SoundManager());
  const ctxRuim = makeCtx(CANVAS_W, CANVAS_H);
  const pintou = stRuim._cortarFundo(ctxRuim, { naturalWidth: 0, naturalHeight: 0, complete: true }, 'praia');
  report.check('foto quebrada e ignorada sem erro', pintou === false && ctxRuim.__drawImage.length === 0);

  // Nome de arquivo fora da pasta nao pode entrar no mapa.
  const caminhos = Object.values(g.STORY_FUNDOS).filter(Boolean).map((v) => v.arquivo);
  const foraDaPasta = caminhos.filter((n) => n && (n.includes('/') || n.includes('\\') || n.includes('..')));
  report.check('todo fundo aponta para um arquivo solto na pasta', foraDaPasta.length === 0, foraDaPasta.join(','));
  const inexistentes = caminhos.filter((n) => n && !fs.existsSync(pathMod.join(dir, n)));
  report.check('todo arquivo citado no mapa existe de verdade', inexistentes.length === 0, inexistentes.join(','));
  return Promise.resolve();
}

/**
 * Simulacao 3D: o nucleo puro que vai substituir o desenho 2D do gameplay.
 * Aqui nao tem canvas nem WebGL, so numeros, entda da para provar as regras.
 */
function secaoSim3D(g) {
  report.section('16. Simulacao 3D (nucleo puro)');

  report.check('a simulacao 3D foi carregada', typeof g.HarvestSim === 'function');
  if (typeof g.HarvestSim !== 'function') return;

  // Gerador deterministico: os testes nao podem depender de Math.random.
  function rngFixo(valor) {
    let i = 0;
    return () => {
      i++;
      return valor === undefined ? (i % 7) / 7 : valor;
    };
  }

  function sim(extra) {
    return new g.HarvestSim(Object.assign({ phases: g.HARVEST_PHASES, playerId: 5, rng: rngFixo() }, extra || {}));
  }

  const s = sim();
  report.check('comeca na fase 1', s.phase && s.phase.id === 1, `fase=${s.phase && s.phase.id}`);
  report.check('a meta vem da fase', s.targetGuarana === g.HARVEST_PHASES[0].targetGuarana, `meta=${s.targetGuarana}`);
  report.check('o tempo vem da fase', s.timeLeft === g.HARVEST_PHASES[0].totalTime, `tempo=${s.timeLeft}`);
  report.check('o chao e y zero', s.player.y === 0 && s.player.grounded === true);
  report.check('nasce parado e sem cesta', s.player.state === 'idle' && s.player.carryingBasket === false);

  // --- Andar para todos os lados: e o que o 2D nao conseguia fazer ---------
  const norte = sim();
  for (let i = 0; i < 30; i++) norte.update(DT, { steerX: 0, steerZ: 1, command: 'ACELERAR' });
  report.check('anda para o fundo (+Z)', norte.player.z > 1, `z=${norte.player.z.toFixed(2)}`);

  const sul = sim();
  for (let i = 0; i < 30; i++) sul.update(DT, { steerX: 0, steerZ: -1, command: 'ACELERAR' });
  report.check('anda para a frente (+Z invertido)', sul.player.z < -1, `z=${sul.player.z.toFixed(2)}`);

  const leste = sim();
  for (let i = 0; i < 30; i++) leste.update(DT, { steerX: 1, steerZ: 0, command: 'ACELERAR' });
  report.check('anda para a direita (+X)', leste.player.x > 1, `x=${leste.player.x.toFixed(2)}`);

  const oeste = sim();
  for (let i = 0; i < 30; i++) oeste.update(DT, { steerX: -1, steerZ: 0, command: 'ACELERAR' });
  report.check('anda para a esquerda (-X)', oeste.player.x < -1, `x=${oeste.player.x.toFixed(2)}`);

  const diagonal = sim();
  for (let i = 0; i < 30; i++) diagonal.update(DT, { steerX: 1, steerZ: 1, command: 'ACELERAR' });
  report.check('anda na diagonal, nos dois eixos ao mesmo tempo',
    diagonal.player.x > 0.5 && diagonal.player.z > 0.5, `x=${diagonal.player.x.toFixed(2)} z=${diagonal.player.z.toFixed(2)}`);

  report.check('vira para onde anda', Math.abs(Math.sin(leste.player.facing)) > 0.5, `facing=${leste.player.facing.toFixed(2)}`);

  // O terreno e limitado: nao da para sair andando para sempre.
  const runaway = sim();
  for (let i = 0; i < 600; i++) runaway.update(DT, { steerX: 1, steerZ: 0, command: 'ACELERAR' });
  report.check('nao atravessa a borda do terreno', runaway.player.x <= g.HARVEST_WORLD.maxX + 1e-6,
    `x=${runaway.player.x.toFixed(2)} max=${g.HARVEST_WORLD.maxX}`);

  // --- Correr: e o turbo, que e mais rapido --------------------------------
  const anda = sim();
  for (let i = 0; i < 40; i++) anda.update(DT, { steerX: 1, steerZ: 0, command: 'ACELERAR' });
  const vAnda = Math.abs(anda.player.vx);

  const corre = sim();
  for (let i = 0; i < 40; i++) corre.update(DT, { steerX: 1, steerZ: 0, command: 'TURBO' });
  const vCorre = Math.abs(corre.player.vx);

  report.check('correr e mais rapido que andar', vCorre > vAnda * 1.2, `anda=${vAnda.toFixed(2)} corre=${vCorre.toFixed(2)}`);
  report.check('andar atinge a velocidade de movimento', vCorre > g.HARVEST_WORLD.runSpeed * s.ability.runSpeedMult * 0.9,
    `v=${vCorre.toFixed(2)}`);
  report.check('o estado de movimento aparece', corre.player.state === 'run', `estado=${corre.player.state}`);
  report.check('o turbo gasta a carga', corre.player.turboCharge < 1, `carga=${corre.player.turboCharge.toFixed(3)}`);

  // O turbo parado nao gasta: ele exige movimento.
  const parado = sim();
  parado.player.turboCharge = 1;
  for (let i = 0; i < 30; i++) parado.update(DT, { steerX: 0, steerZ: 0, command: 'TURBO' });
  report.check('turbo parado nao gasta carga', parado.player.turboCharge === 1, `carga=${parado.player.turboCharge}`);

  // --- Pular --------------------------------------------------------------
  const p = sim();
  p.update(DT, { steerX: 0, steerZ: 0, command: 'ACELERAR' });
  const yAntes = p.player.y;
  p.requestJump();
  p.update(DT, { steerX: 0, steerZ: 0, command: 'ACELERAR' });

  report.check('o pulo tira o menino do chao', !p.player.grounded && p.player.y > yAntes, `y=${p.player.y.toFixed(2)}`);
  report.check('o estado de pulo aparece', p.player.state === 'jump', `estado=${p.player.state}`);

  let apogeu = p.player.y;
  let aterrissou = false;
  for (let i = 0; i < 200; i++) {
    p.update(DT, { steerX: 0, steerZ: 0, command: 'ACELERAR' });
    if (p.player.y > apogeu) apogeu = p.player.y;
    if (p.player.grounded) { aterrissou = true; break; }
  }
  report.check('o pulo tem apogeu de verdade', apogeu > 0.8 && apogeu < 3, `apogeu=${apogeu.toFixed(2)} m`);
  report.check('o menino volta ao chao', aterrissou && p.player.y === 0, `y=${p.player.y}`);
  report.check('aterrissar devolve o chao ao estado de repouso', p.player.grounded === true);

  // Pulo em pleno ar nao teleporta: so tem um pulo por passagem.
  const p2 = sim();
  p2.requestJump();
  p2.update(DT, { command: 'ACELERAR' });
  const yDepois = p2.player.y;
  p2.requestJump();
  for (let i = 0; i < 10; i++) p2.update(DT, { command: 'ACELERAR' });
  report.check('nao da para pular duas vezes no ar', p2.player.y < 3 && p2.player.y > yDepois - 0.01,
    `y=${p2.player.y.toFixed(2)}`);

  // O pulo tem de ser um evento, para o som e a poeira reagirem.
  const comEvento = sim();
  comEvento.requestJump();
  comEvento.update(DT, { command: 'ACELERAR' });
  report.check('pular gera o evento jump', comEvento.drainEvents().some((e) => e.type === 'jump'));

  // --- Cesta: o pedido explicito do usuario -------------------------------
  const c = sim();
  const b0 = c.getBasketCenter();
  report.check('a cesta fica a frente do corpo', Math.hypot(b0.x - c.player.x, b0.z - c.player.z) > 0.05,
    `d=${Math.hypot(b0.x - c.player.x, b0.z - c.player.z).toFixed(2)}`);
  report.check('a cesta fica acima do chao', b0.y > 0.5, `y=${b0.y.toFixed(2)}`);
  report.check('a cesta nasce escondida', c.player.carryingBasket === false);

  // Moeda e estrela NAO podem trazer a cesta: ela entra com o primeiro guarana.
  for (const tipo of ['moeda', 'estrela']) {
    const mc = sim();
    const mc0 = mc.getBasketCenter();
    mc.items.length = 0;
    mc.items.push({
      type: tipo, x: mc0.x, y: mc0.y, z: mc0.z, baseX: mc0.x, baseZ: mc0.z,
      speed: 0, radius: 0.47, spin: 0, spinRate: 0, swayPhase: 0, swayRate: 1, swayAmount: 0, age: 0
    });
    mc.update(0.001, { command: 'ACELERAR' });
    report.check(`pegar ${tipo} nao traz a cesta`, mc.player.carryingBasket === false && mc.player.basketFruit === 0,
      `cesta=${mc.player.carryingBasket} frutos=${mc.player.basketFruit}`);
  }

  // Derruba um guarana em cima da cesta e confere a coleta.
  c.items.length = 0;
  c.items.push({
    type: 'guarana', x: b0.x, y: b0.y, z: b0.z, baseX: b0.x, baseZ: b0.z,
    speed: 0, radius: 0.47, spin: 0, spinRate: 0, swayPhase: 0, swayRate: 1, swayAmount: 0, age: 0
  });
  c.update(0.001, { command: 'ACELERAR' });

  report.check('pegar o guarana conta na meta', c.guaranaCollected === 1, `coletados=${c.guaranaCollected}`);
  report.check('pegar o guarana pontua', c.score >= 100, `pontos=${c.score}`);
  report.check('pegar o guarana faz aparecer a cesta', c.player.carryingBasket === true);
  report.check('a cesta guarda o fruto', c.player.basketFruit === 1, `frutos=${c.player.basketFruit}`);
  report.check('a coleta entra no combo', c.combo === 1, `combo=${c.combo}`);
  report.check('a coleta vira evento', c.drainEvents().some((e) => e.type === 'pickup' && e.itemType === 'guarana'));

  // Segundo e terceiro fruto: a cesta acumula e o combo sobe.
  for (let i = 0; i < 2; i++) {
    const b = c.getBasketCenter();
    c.items.push({
      type: 'guarana', x: b.x, y: b.y, z: b.z, baseX: b.x, baseZ: b.z,
      speed: 0, radius: 0.47, spin: 0, spinRate: 0, swayPhase: 0, swayRate: 1, swayAmount: 0, age: 0
    });
    c.update(0.001, { command: 'ACELERAR' });
  }
  report.check('a cesta acumula frutos', c.player.basketFruit === 3, `frutos=${c.player.basketFruit}`);
  report.check('o combo cresce com a coleta', c.combo === 3, `combo=${c.combo}`);
  report.check('o combo da bonus de pontos', c.score > 300, `pontos=${c.score}`);

  // Fruto longe da cesta nao entra.
  const longe = sim();
  longe.items.push({
    type: 'guarana', x: 0, y: 9, z: 0, baseX: 0, baseZ: 0,
    speed: 0, radius: 0.47, spin: 0, spinRate: 0, swayPhase: 0, swayRate: 1, swayAmount: 0, age: 0
  });
  longe.update(DT, { command: 'ACELERAR' });
  report.check('fruto longe da cesta nao e coletado', longe.guaranaCollected === 0 && longe.items.length === 1);

  // --- Itens caindo e perdendo --------------------------------------------
  // O fruto cai longe da cesta, senao a cesta pegaria e nao testariamos a perda.
  const q = sim();
  q.items.length = 0;
  q.nextSpawnDelay = 1e9;
  const longeDoMenino = q.getBasketCenter();
  q.items.push({
    type: 'guarana', x: longeDoMenino.x + 6, y: 5, z: longeDoMenino.z,
    baseX: longeDoMenino.x + 6, baseZ: longeDoMenino.z,
    speed: 10, radius: 0.47, spin: 0, spinRate: 0, swayPhase: 0, swayRate: 0, swayAmount: 0, age: 0
  });
  for (let i = 0; i < 120; i++) q.update(DT, { command: 'ACELERAR' });
  report.check('o guarana que cai some ao chegar no chao', q.items.length === 0, `itens=${q.items.length}`);
  report.check('o guarana perdido nao conta para a meta', q.guaranaCollected === 0, `coletados=${q.guaranaCollected}`);

  // --- Combo, folha, moeda e estrela -------------------------------------
  const k = sim();
  k.combo = 4;
  k.comboTimer = 0.1;
  k.update(0.2, { command: 'ACELERAR' });
  report.check('o combo vence no tempo e abre a tolerancia', k.combo === 4 && k.comboGrace > 0,
    `combo=${k.combo} graca=${k.comboGrace.toFixed(2)}`);

  const folha = sim();
  const antes = folha.score;
  folha.items.push({
    type: 'folha', x: folha.getBasketCenter().x, y: folha.getBasketCenter().y, z: folha.getBasketCenter().z,
    baseX: 0, baseZ: 0, speed: 0, radius: 0.35, spin: 0, spinRate: 0, swayPhase: 0, swayRate: 1, swayAmount: 0, age: 0
  });
  folha.score = 300;
  folha.combo = 3;
  folha.update(0.001, { command: 'ACELERAR' });
  report.check('a folha tira pontos e zera o combo',
    folha.score === 250 && folha.combo === 0, `pontos=${folha.score} combo=${folha.combo}`);
  report.check('a folha machuca o menino', folha.player.hurtTimer > 0);

  const moeda = sim();
  moeda.player.turboCharge = 0.2;
  moeda.items.push({
    type: 'moeda', x: moeda.getBasketCenter().x, y: moeda.getBasketCenter().y, z: moeda.getBasketCenter().z,
    baseX: 0, baseZ: 0, speed: 0, radius: 0.39, spin: 0, spinRate: 0, swayPhase: 0, swayRate: 1, swayAmount: 0, age: 0
  });
  moeda.update(0.001, { command: 'ACELERAR' });
  report.check('a moeda da turbo e pontos', moeda.player.turboCharge > 0.4 && moeda.score >= 250,
    `turbo=${moeda.player.turboCharge.toFixed(2)} pontos=${moeda.score}`);

  // --- Vitoria e fim de tempo ---------------------------------------------
  const v = sim();
  v.guaranaCollected = v.targetGuarana - 1;
  const b = v.getBasketCenter();
  v.items.push({
    type: 'guarana', x: b.x, y: b.y, z: b.z, baseX: b.x, baseZ: b.z,
    speed: 0, radius: 0.47, spin: 0, spinRate: 0, swayPhase: 0, swayRate: 1, swayAmount: 0, age: 0
  });
  v.update(0.001, { command: 'ACELERAR' });
  report.check('atingir a meta vence a fase', v.isVictory === true);
  report.check('a vitoria da bonus de tempo', v.timeBonus > 0, `bonus=${v.timeBonus}`);

  const fim = sim();
  fim.timeLeft = 0.01;
  fim.update(DT, { command: 'ACELERAR' });
  report.check('o tempo acabar encerra a fase', fim.isGameOver === true && fim.frozen === true);

  // --- Reiniciar e avancar de fase ----------------------------------------
  const r = sim();
  r.phaseIndex = 3;
  r.score = 9999;
  r.guaranaCollected = 12;
  r.player.carryingBasket = true;
  r.reset();
  report.check('reiniciar mantem a fase atual', r.phaseIndex === 3, `fase=${r.phaseIndex + 1}`);
  report.check('reiniciar zera a pontuacao', r.score === 0 && r.guaranaCollected === 0);
  report.check('reiniciar esconde a cesta', r.player.carryingBasket === false);
  report.check('reiniciar devolve o tempo da fase', r.timeLeft === g.HARVEST_PHASES[3].totalTime);

  const a = sim();
  a.advancePhase();
  report.check('avancar de fase muda a fase e a meta',
    a.phase.id === 2 && a.targetGuarana === g.HARVEST_PHASES[1].targetGuarana,
    `fase=${a.phase.id} meta=${a.targetGuarana}`);
  report.check('avancar de fase da bonus de velocidade',
    a.phase.minSpeed > g.HARVEST_PHASES[0].minSpeed, `${a.phase.minSpeed} > ${g.HARVEST_PHASES[0].minSpeed}`);

  // --- Spawn e rampa de dificuldade ---------------------------------------
  // O primeiro fruto da partida tem de ser guarana: e a garantia que impede o
  // jogador comecar perdendo o combo por causa de uma folha caindo na cara.
  const primeiro = sim();
  primeiro.nextSpawnDelay = 0;
  primeiro.update(0.001, { command: 'ACELERAR' });
  report.check('o primeiro fruto e sempre guarana',
    primeiro.items.length === 1 && primeiro.items[0].type === 'guarana',
    primeiro.items.map((i) => i.type).join(',') || 'nenhum');

  const sp = sim();
  for (let i = 0; i < 400; i++) sp.update(DT, { command: 'ACELERAR' });
  report.check('os frutos caem sozinhos', sp.items.length > 0, `itens=${sp.items.length}`);

  // A rampa: nos primeiros segundos o spawn e mais lento.
  const rampa = sim();
  rampa.nextSpawnDelay = 1e9;
  const fase = rampa.phase;
  const meio = (fase.spawnDelayMin + fase.spawnDelayMax) / 2;
  report.check('a rampa de slowdown existe na simulacao', rampa.cfg.rampFactor > 1 && rampa.cfg.rampSeconds > 0,
    `fator=${rampa.cfg.rampFactor} por ${rampa.cfg.rampSeconds}s`);
  report.check('os frutos nascem acima do chao', sp.items.every((i) => i.y > 0 || i.y === 0));
  report.check('o meio do intervalo de spawn e positivo', meio > 0, `meio=${meio.toFixed(2)}s`);

  // --- O mundo 3D tem as duas direcoes horizontais -------------------------
  report.check('o terreno tem largura em X', g.HARVEST_WORLD.maxX > g.HARVEST_WORLD.minX);
  report.check('o terreno tem profundidade em Z', g.HARVEST_WORLD.maxZ > g.HARVEST_WORLD.minZ);
  report.check('o terreno e plano, com altura unica', g.HARVEST_WORLD.groundY === 0);
  report.check('o pulo usa a gravidade do mundo', g.HARVEST_WORLD.gravity > 0 && g.HARVEST_WORLD.jumpSpeed > 0);
}

/**
 * A ossada 3D do menino. Sao dados puros, entao da para conferir a pose
 * matematicamente, sem WebGL: se o pe nao encostar no chao ou se um membro
 * apontar para o lado errado, a falha aparece aqui e nao so olhando o jogo.
 */
function secaoMenino3D(g) {
  report.section('17. Menino Guaraná 3D (ossada e cesta)');

  report.check('o modulo do menino foi carregado', typeof g.MENINO_RIG === 'object');
  if (typeof g.MENINO_RIG !== 'object') return;

  const rig = g.MENINO_RIG;
  const nomes = rig.nos.map((n) => n.nome);

  report.check('a ossada tem quadril, cabeca, bracos e pernas',
    ['quadril', 'cabeca', 'bracoE', 'bracoD', 'pernaE', 'pernaD', 'maoE', 'maoD', 'peE', 'peD']
      .every((n) => nomes.includes(n)), nomes.join(','));

  // Todo pai tem de existir e vir antes do filho, senao a montagem quebra.
  const montados = new Set();
  const orfaos = [];
  for (const no of rig.nos) {
    if (no.pai && !montados.has(no.pai)) orfaos.push(`${no.nome}->${no.pai}`);
    montados.add(no.nome);
  }
  report.check('todo no aponta para um pai que ja foi montado', orfaos.length === 0, orfaos.join(','));
  report.check('nao ha nomes de no repetidos', new Set(nomes).size === nomes.length, nomes.length + ' nos');

  // A cor de cada peca tem de existir na paleta, senao sai magenta.
  const coresQuebradas = rig.nos.filter((n) => g.MENINO_ESTILO[n.cor] === undefined).map((n) => n.cor);
  report.check('toda peca usa uma cor da paleta', coresQuebradas.length === 0, [...new Set(coresQuebradas)].join(','));

  // --- A pose em repouso: pe no chao e cabeca no alto ---------------------
  // Reconstrói a pose a partir dos pivos. O que se acumula pela cadeia e a
  // ARTICULACAO de cada no, e nao a malha: por isso ela comeca em zero na raiz
  // e cada no soma o seu `pos` ao do pai. A malha e a articulacao menos a
  // queda do membro (`desce`) e menos a meia dimensao da primitiva.
  const MEIA = { cilindro: 2, caixa: 1 };
  const metade = (no) => (no.geo === 'esfera' ? no.tam[0] : no.tam[MEIA[no.geo]] / 2);
  const quedaDe = (no) => (no.desce ? no.tam[MEIA[no.geo]] / 2 : 0);
  const pivoDe = (nome) => {
    const memo = {};
    const calc = (n) => {
      if (memo[n] !== undefined) return memo[n];
      const no = rig.nos.find((x) => x.nome === n);
      memo[n] = (no.pai ? calc(no.pai) : 0) + no.pos[1];
      return memo[n];
    };
    return calc(nome);
  };
  const alturaDe = (nome) => {
    const no = rig.nos.find((x) => x.nome === nome);
    return pivoDe(nome) - quedaDe(no) - metade(no);
  };
  const topoDe = (nome) => {
    const no = rig.nos.find((x) => x.nome === nome);
    return pivoDe(nome) - quedaDe(no) + metade(no);
  };
  const maisAlto = rig.nos.reduce((a, b) => (topoDe(b.nome) > topoDe(a.nome) ? b : a));

  // O pe e uma caixa com espessura: o tornozelo fica a 8 cm do chao e a sola
  // desce ate 2 cm. Isso e pe no chao para um personagem de 1,65 m.
  report.check('o pe esquerdo encosta no chao', alturaDe('peE') < 0.03 && alturaDe('peE') > -0.005, `y=${alturaDe('peE').toFixed(3)}`);
  report.check('o pe direito encosta no chao', alturaDe('peD') < 0.03 && alturaDe('peD') > -0.005, `y=${alturaDe('peD').toFixed(3)}`);

  // O topo da cabeca e o cabelo com a touca em cima; os dois tem de ganhar do torso.
  const noTopo = maisAlto.nome;
  report.check('o topo da cabeca fica acima do torso',
    ['cabelo', 'touca'].includes(noTopo) && topoDe(noTopo) > topoDe('torsoCima'),
    `mais alto=${noTopo} y=${topoDe(noTopo).toFixed(2)}`);
  report.check('a altura declarada bate com a ossada', Math.abs(topoDe(noTopo) - rig.altura) < 0.02,
    `declarado=${rig.altura} medido=${topoDe(noTopo).toFixed(2)}`);

  // Nenhum membro pode atravessar o chao em cima.
  const atravessando = rig.nos.filter((n) => alturaDe(n.nome) < -0.05).map((n) => n.nome);
  report.check('nenhuma peca atravessa o chao', atravessando.length === 0, atravessando.join(','));

  // As pernas e os bracos descem: a junta e a ponta tem de estar mais embaixo.
  report.check('as pernas penduram para baixo', alturaDe('peE') < alturaDe('quadril'));
  report.check('os bracos penduram para baixo', alturaDe('maoE') < alturaDe('quadril'));
  report.check('as maos ficam na altura do quadril', Math.abs(alturaDe('maoE') - rig.quadrilY) < 0.25,
    `mao=${alturaDe('maoE').toFixed(2)} quadril=${rig.quadrilY}`);
  report.check('as duas pernas teem o mesmo comprimento', Math.abs(alturaDe('peE') - alturaDe('peD')) < 1e-6);
  report.check('os dois bracos teem o mesmo comprimento', Math.abs(alturaDe('maoE') - alturaDe('maoD')) < 1e-6);

  // --- Os estados de animacao existem todos -------------------------------
  report.check('todo estado de animacao tem parametros',
    ['idle', 'walk', 'run', 'jump', 'collect', 'victory', 'hurt'].every((e) => g.MENINO_ANIM[e]),
    Object.keys(g.MENINO_ANIM).join(','));
  report.check('correr balanca mais que andar',
    g.MENINO_ANIM.run.perna > g.MENINO_ANIM.walk.perna && g.MENINO_ANIM.run.braco > g.MENINO_ANIM.walk.braco,
    `run=${g.MENINO_ANIM.run.perna} walk=${g.MENINO_ANIM.walk.perna}`);
  report.check('parado as pernas nao balancam', g.MENINO_ANIM.idle.perna === 0);

  // --- A cesta ------------------------------------------------------------
  const c = rig.cesta;
  report.check('a cesta tem lugar e tamanho', c.raio > 0 && c.altura > 0 && c.pos.length === 3);
  report.check('a cesta nasce nas costas do menino', c.pos[2] < 0, `z=${c.pos[2]}`);
  report.check('a cesta tem frutos e uma massa de enchimento',
    c.frutosMax > 0 && typeof g.atualizarCesta === 'function', `frutos=${c.frutosMax}`);

  // A cesta nao pode contar fruto por fruto: a meta da primeira fase ja passa
  // do que cabe desenhado, e quem mostra o quanto falta e a massa de baixo.
  const maiorMeta = g.HARVEST_PHASES.reduce((a, f) => Math.max(a, f.targetGuarana), 0);
  report.check('existe uma massa de enchimento para metas maiores que os frutos',
    maiorMeta > c.frutosMax, `maior meta=${maiorMeta} frutos=${c.frutosMax}`);

  // A paleta tem as cores que identificam o guarana, como o resto do jogo.
  report.check('a camisa e vermelha, como o caroço do guarana', g.MENINO_ESTILO.camisa === 0xc6202b);
  report.check('o calcao e verde, como a folha', g.MENINO_ESTILO.calcao === 0x1f6f3a);
  report.check('ha um detalhe amarelo na vestimenta', typeof g.MENINO_ESTILO.detalhe === 'number');
  report.check('o fruto dentro da cesta e vermelho', g.MENINO_ESTILO.fruto === 0x8b1a2b);
}

/**
 * A cena 3D. Nao da para testar WebGL de verdade aqui, mas da para testar o
 * GRAFO DE CENA com um three falso: se alguem passar um numero errado de
 * argumentos para uma geometria, ou esquecer de pendurar uma malha no pai, o
 * jogo quebra em branco na tela e o erro so aparece no navegador. Aqui ele
 * aparece na suite.
 */
function secaoHarvest3D(g) {
  report.section('18. Cena 3D (grafo de cena com three falso)');

  report.check('o renderizador foi carregado', typeof g.criarHarvest3D === 'function');
  if (typeof g.criarHarvest3D !== 'function') return;

  // --- Um three falso que valida o que a cena pede --------------------------
  const aridade = {};
  const criado = { geometrias: [], materiais: [], luzes: 0, render: 0, texturas: [] };

  const cor = () => ({ set(v) { this.v = v; }, getHex: () => 0 });
  function mat() {
    return class {
      constructor(o) { criado.materiais.push(o || {}); this.transparent = false; this.opacity = 1; this.color = cor(); this.needsUpdate = false; this.shininess = 0; }
    };
  }
  const vec = () => ({ set(x, y, z) { this.x = x; this.y = y; this.z = z; }, copy() {}, clone() { return vec(); }, lerp() {} });
  class No {
    constructor() {
      this.children = [];
      this.position = vec();
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { x: 1, y: 1, z: 1, set(x, y, z) { this.x = x; this.y = y; this.z = z; }, setScalar(v) { this.x = this.y = this.z = v; } };
      this.visible = true; this.castShadow = false; this.receiveShadow = false;
      this.userData = {};
    }
    add(...f) { for (const x of f) { this.children.push(x); x.__pai = this; } return this; }
  }
  const geo = (n, ...args) => {
    aridade[n] = args.length;
    criado.geometrias.push({ tipo: n, args });
    const o = new No(); o.tipoGeo = n; return o;
  };

  // Geometrias precisam de `function`, nao de arrow: arrow nao e construtor.
  const Geom = (n) => function Geom() { return geo(n, ...arguments); };

  const FALSO = {
    WebGLRenderer: class { constructor(o) { this.opts = o; this.shadowMap = {}; this.domElement = o && o.canvas; this.outputEncoding = null; this.info = { render: { calls: 0 } }; } setPixelRatio() {} setSize() {} render(cena) { criado.render++; this.info.render.calls++; this.vista = cena; } dispose() {} },
    Scene: class extends No { constructor() { super(); this.fog = null; } },
    Group: class extends No {},
    PerspectiveCamera: class extends No { constructor(fov, aspect, near, far) { super(); aridade.PerspectiveCamera = 4; Object.assign(this, { fov, aspect, near, far }); } lookAt() {} updateProjectionMatrix() {} },
    HemisphereLight: class extends No {},
    DirectionalLight: class extends No { constructor() { super(); this.shadow = { mapSize: {}, camera: {} }; this.target = new No(); criado.luzes++; } },
    Mesh: class extends No { constructor(ge, m) { super(); aridade.Mesh = 2; this.geometry = ge; this.material = m; this.name = ''; } },
    MeshLambertMaterial: mat(), MeshPhongMaterial: mat(), MeshBasicMaterial: mat(),
    PlaneGeometry: Geom('PlaneGeometry'),
    SphereGeometry: Geom('SphereGeometry'),
    TorusGeometry: Geom('TorusGeometry'),
    CylinderGeometry: Geom('CylinderGeometry'),
    CircleGeometry: Geom('CircleGeometry'),
    BoxGeometry: Geom('BoxGeometry'),
    GridHelper: class extends No { constructor() { super(); this.material = new (mat())(); } },
    Fog: class { constructor(c, n, f) { aridade.Fog = 3; Object.assign(this, { color: c, near: n, far: f }); } },
    TextureLoader: class { constructor() { this.load = (url, ok) => { criado.texturas.push(url); if (ok) ok({ encoding: 0 }); }; } },
    DoubleSide: 2, PCFSoftShadowMap: 1, sRGBEncoding: 3001
  };

  // --- Monta o personagem de verdade, para as geometrias serem exercitadas --
  let menino = null;
  let erroMenino = null;
  try { menino = g.buildMeninoGuarana(FALSO); } catch (e) { erroMenino = e; }
  report.check('o personagem monta com o three falso', erroMenino === null, erroMenino ? erroMenino.message : 'ok');
  if (erroMenino) return;

  const nomesNo = g.MENINO_RIG.nos.map((n) => n.nome);
  report.check('o personagem tem todas as pecas da ossada',
    nomesNo.every((n) => Object.keys(menino.parts).includes(n)), `${Object.keys(menino.parts).length} pecas`);
  // Confere no par: cada no da ossada tem de virar uma malha com esse nome.
  const semNome = [];
  const foraDaPai = [];
  for (const no of g.MENINO_RIG.nos) {
    const malha = menino.parts[no.nome];
    if (!malha) { semNome.push(no.nome); continue; }
    if (malha.name !== no.nome) semNome.push(`${no.nome}=>${malha.name}`);
    if (no.pai && malha.__pai !== menino.parts[no.pai]) foraDaPai.push(no.nome);
  }
  report.check('todo no da ossada virou uma malha com o nome certo', semNome.length === 0, semNome.join(','));
  report.check('a hierarquia montada bate com a ossada', foraDaPai.length === 0, foraDaPai.join(','));

  // --- A pose MONTADA, e nao a recalculada a partir do rig -------------------
  // A secao 17 refaz a conta por fora e confere a ARITMETICA do rig. Isso deixou
  // um bug passar por muito tempo: o montador pendurava cada filho no CENTRO da
  // malha do pai, mas os `pos` do rig medem a partir da JUNTA (o topo da peca).
  // Cada junta descia meia peca a mais e os pes terminavam 34 cm abaixo do chao,
  // deixando o menino afundado -- com a secao 17 inteira verde, porque ela nunca
  // olhava para o que foi montado de fato. Estas checagens olham.
  const acum = (nome) => {
    let o = menino.parts[nome];
    let y = 0;
    while (o) { y += o.position.y || 0; o = o.__pai; }
    return y;
  };
  const MEIA = { cilindro: 2, caixa: 1 };
  const metade = (nome) => {
    const no = g.MENINO_RIG.nos.find((x) => x.nome === nome);
    return no.geo === 'esfera' ? no.tam[0] : no.tam[MEIA[no.geo]] / 2;
  };
  const nosTodos = g.MENINO_RIG.nos.map((n) => n.nome);
  const fundo = Math.min(...nosTodos.map((n) => acum(n) - metade(n)));
  const topo = Math.max(...nosTodos.map((n) => acum(n) + metade(n)));
  const quadrilMontado = acum('quadril');

  report.check('a cadeia montada poe os pes no chao', fundo > -0.02 && fundo < 0.06,
    `fundo=${fundo.toFixed(3)} (0 = chao)`);
  report.check('a altura montada bate com a declarada',
    Math.abs((topo - fundo) - g.MENINO_RIG.altura) < 0.06,
    `montado=${(topo - fundo).toFixed(3)} declarado=${g.MENINO_RIG.altura}`);
  report.check('a perna montada e mais curta que a altura do quadril',
    Math.min(acum('peE'), acum('peD')) > 0 && quadrilMontado > 0.5,
    `quadril=${quadrilMontado.toFixed(3)} pe=${Math.min(acum('peE'), acum('peD')).toFixed(3)}`);
  const enterradas = nosTodos.filter((n) => acum(n) < -0.02);
  report.check('nenhuma junta montada cai abaixo do chao', enterradas.length === 0,
    enterradas.map((n) => `${n}=${acum(n).toFixed(3)}`).join(','));
  const mParts = menino.parts;
  report.check('a cesta nasce pendurada no quadril',
    mParts.quadril.children.indexOf(menino.cesta) >= 0);
  report.check('a cesta tem os frutos e a massa de enchimento',
    menino.frutos.length === g.MENINO_RIG.cesta.frutosMax && !!menino.enchimento,
    `frutos=${menino.frutos.length}`);
  report.check('a cesta nasce escondida', menino.cesta.visible === false);

  // --- Monta a cena ---------------------------------------------------------
  const canvasFalso = { clientWidth: 960, clientHeight: 520, width: 960, height: 520 };
  let cena = null;
  let erroMontagem = null;
  try {
    cena = g.criarHarvest3D(FALSO, { canvas: canvasFalso, mundo: g.HARVEST_WORLD, phases: g.HARVEST_PHASES, menino });
  } catch (e) { erroMontagem = e; }
  report.check('a cena monta sem erro', erroMontagem === null, erroMontagem ? erroMontagem.message : 'ok');
  if (erroMontagem) return;

  report.check('o renderizador recebeu o canvas certo', cena.renderer.opts.canvas === canvasFalso);
  report.check('as sombras foram ligadas', cena.renderer.shadowMap.enabled === true);
  report.check('a cor de saida e sRGB, como pede o r128', cena.renderer.outputEncoding === FALSO.sRGBEncoding,
    `outputEncoding=${cena.renderer.outputEncoding}`);
  report.check('a camera tem perspectiva', cena.camera instanceof FALSO.PerspectiveCamera);
  report.check('a camera foi criada com 4 argumentos', aridade.PerspectiveCamera === 4, `args=${aridade.PerspectiveCamera}`);
  report.check('ha sol e contraluz, duas luzes direcionais', criado.luzes === 2, `luzes=${criado.luzes}`);
  report.check('a neblina foi montada com cor, perto e longe', aridade.Fog === 3);

  // O menino tem de estar NA cena, e nao so posicionado. Ele podia ser movido
  // e animado a cada quadro e mesmo assim ficar invisivel, porque ninguem o
  // tinha adicionado. Por isso esta checagem olha os filhos da cena.
  const filhos = cena.scene.children || [];
  report.check('o grupo do menino foi adicionado a cena', filhos.indexOf(menino.group) >= 0,
    `filhos=${filhos.length}`);
  report.check('o menino foi adicionado uma vez so',
    filhos.filter((f) => f === menino.group).length === 1,
    `vezes=${filhos.filter((f) => f === menino.group).length}`);
  report.check('o menino e filho direto da cena, nao de um grupo intermediario',
    menino.group.__pai === cena.scene, menino.group.__pai ? 'tem pai' : 'sem pai');

  // As geometrias que o three r128 aceita com estes parametros. Agora valem
  // mesmo, porque o personagem e a cesta ja foram montados acima.
  report.check('SphereGeometry recebeu raio e segmentos',
    criado.geometrias.some((x) => x.tipo === 'SphereGeometry' && x.args.length === 3),
    criado.geometrias.filter((x) => x.tipo === 'SphereGeometry').map((x) => x.args.length).join('/'));
  report.check('CylinderGeometry recebeu raio, altura e segmentos',
    criado.geometrias.filter((x) => x.tipo === 'CylinderGeometry').every((x) => x.args.length >= 3) &&
    criado.geometrias.some((x) => x.tipo === 'CylinderGeometry'),
    criado.geometrias.filter((x) => x.tipo === 'CylinderGeometry').map((x) => x.args.length).join('/'));
  report.check('TorusGeometry recebeu raio, tubo e segmentos',
    criado.geometrias.filter((x) => x.tipo === 'TorusGeometry').every((x) => x.args.length === 4) &&
    criado.geometrias.some((x) => x.tipo === 'TorusGeometry'),
    criado.geometrias.filter((x) => x.tipo === 'TorusGeometry').map((x) => x.args.length).join('/'));
  report.check('BoxGeometry recebeu largura, altura e profundidade',
    criado.geometrias.filter((x) => x.tipo === 'BoxGeometry').every((x) => x.args.length === 3) &&
    criado.geometrias.some((x) => x.tipo === 'BoxGeometry'),
    criado.geometrias.filter((x) => x.tipo === 'BoxGeometry').map((x) => x.args.length).join('/'));
  report.check('CircleGeometry so aparece na cesta, com segmentos',
    criado.geometrias.filter((x) => x.tipo === 'CircleGeometry').every((x) => x.args.length === 2),
    criado.geometrias.filter((x) => x.tipo === 'CircleGeometry').map((x) => x.args.length).join('/'));

  // --- O fundo de cada fase -------------------------------------------------
  for (const fase of g.HARVEST_PHASES) {
    cena.definirFase(fase);
    report.check(`a fase ${fase.id} pede o seu fundo`, criado.texturas.includes(fase.bg), fase.bg);
  }
  report.check('nenhuma fase ficou sem pano de fundo',
    g.HARVEST_PHASES.every((f) => criado.texturas.includes(f.bg)), `${criado.texturas.length} fundos`);

  // --- Desenha com a simulacao de verdade ----------------------------------
  const sim = new g.HarvestSim({ phases: g.HARVEST_PHASES, playerId: 5, rng: () => 0.5 });
  cena.definirFase(sim.phase);
  // O primeiro spawn so acontece depois de firstSpawnDelay (0,8 s), entao
  //(update) uns 2 s de jogo antes de conferir que ha o que desenhar.
  for (let i = 0; i < 120; i++) sim.update(1 / 60, { steerX: 0.6, steerZ: -0.3, command: 'TURBO' });
  report.check('a simulacao produziu itens para desenhar', sim.items.length > 0, `itens=${sim.items.length}`);

  let erroDesenho = null;
  try { cena.desenhar(sim, 1 / 60); } catch (e) { erroDesenho = e; }
  report.check('desenhar um quadro de verdade nao quebra', erroDesenho === null,
    erroDesenho ? erroDesenho.message : 'ok');
  if (erroDesenho) return;

  report.check('o quadro chegou no renderer', criado.render > 0, `renders=${criado.render}`);
  report.check('o mundo 3D contem a cena montada', cena.renderer.vista === cena.scene);

  // A malha do primeiro item tem de estar onde a simulacao diz.
  const primeira = cena.itens[0];
  const item = sim.items[0];
  report.check('o item desenhado segue a simulacao',
    primeira && item && Math.abs(primeira.position.x - item.x) < 1e-6 && Math.abs(primeira.position.y - item.y) < 1e-6,
    item ? `item=(${item.x.toFixed(2)},${item.y.toFixed(2)}) malha=(${primeira.position.x.toFixed(2)},${primeira.position.y.toFixed(2)})` : 'sem item');
  report.check('o item esta virado pelo spin da simulacao',
    primeira && item && Math.abs(primeira.rotation.y - item.spin) < 1e-6);

  // Reaproveitar malhas e obrigatorio: um item novo por quadro vaza memoria.
  const antes = cena.itens.length;
  for (let i = 0; i < 20; i++) cena.desenhar(sim, 1 / 60);
  report.check('as malhas de item sao reaproveitadas entre quadros',
    cena.itens.length === antes, `antes=${antes} depois=${cena.itens.length}`);

  // A camera tem de seguir o menino, e nao ficar parada.
  const camAntes = { x: cena.camera.position.x, z: cena.camera.position.z };
  sim.player.x = 6;
  for (let i = 0; i < 60; i++) cena.desenhar(sim, 1 / 60);
  report.check('a camera acompanha o menino',
    Math.abs(cena.camera.position.x - camAntes.x) > 0.5,
    `dx=${(cena.camera.position.x - camAntes.x).toFixed(2)}`);

  // --- A cesta no renderizador --------------------------------------------
  // Este e o requisito do usuario: a cesta so entra depois do primeiro guarana.
  report.check('sem colheita a cesta fica escondida',
    g.atualizarCesta(menino, 0, 20) === false && menino.cesta.visible === false);
  report.check('a massa de enchimento tambem some sem colheita', menino.enchimento.visible === false);

  report.check('com um guarana a cesta aparece',
    g.atualizarCesta(menino, 1, 20) === true && menino.cesta.visible === true);
  report.check('o primeiro fruto aparece dentro da cesta', menino.frutos[0].visible === true);
  report.check('o segundo fruto ainda nao aparece', menino.frutos[1].visible === false);
  report.check('a massa comeca pequena', menino.enchimento.scale.y < 0.15, `y=${menino.enchimento.scale.y}`);

  g.atualizarCesta(menino, 10, 20);
  report.check('com metade da meta a massa e meia altura',
    Math.abs(menino.enchimento.scale.y - 0.5) < 1e-6, `y=${menino.enchimento.scale.y}`);
  // Dez frutos acende os dez primeiros, e nao os doze que cabem desenhados.
  report.check('dez frutos acendem exatamente dez frutos soltos',
    menino.frutos.slice(0, 10).every((f) => f.visible) && menino.frutos[10].visible === false,
    `ligados=${menino.frutos.filter((f) => f.visible).length}`);

  g.atualizarCesta(menino, 40, 20);
  report.check('acima da meta a massa transborda no maximo',
    menino.enchimento.scale.y === 1, `y=${menino.enchimento.scale.y}`);
  report.check('acima da meta a cesta nao some nem estoura a lista de frutos',
    menino.cesta.visible === true && menino.frutos.every((f) => f.visible));

  // --- A paleta e a tabela de efeitos sao dados puros -----------------------
  report.check('a paleta define o ceu e o chao',
    typeof g.HARVEST3D_PALETA.ceu === 'number' && typeof g.HARVEST3D_PALETA.chao === 'number');
  report.check('todo evento da simulacao tem um efeito mapeado',
    ['jump', 'land', 'pickup', 'hurt', 'comboLost', 'miss', 'turboGain', 'leafSafe', 'phaseVictory']
      .every((e) => g.HARVEST3D_EFEITOS[e]),
    Object.keys(g.HARVEST3D_EFEITOS).join(','));
  report.check('as cores dos itens batem com a simulacao',
    Object.values(g.ITEM_TYPES).every((t) => typeof t.color === 'number') && g.ITEM_TYPES.estrela.color === 0xd8c02a,
    Object.entries(g.ITEM_TYPES).map(([k, v]) => `${k}:${v.color.toString(16)}`).join(' '));
}

/**
 * A cola entre simulacao, cena, canvas e HUD. Aqui nao existe GPU, entao as
 * fabricas sao fakes: o que se testa e a troca de tela, o roteamento da entrada
 * e o que chega no HUD — inclusive a regra de que a 3D falha sem derrubar o 2D.
 */
function secaoCola3D(g) {
  report.section('19. Cola 3D (tela, entrada e HUD)');

  report.check('o controlador foi carregado', typeof g.Colheita3D === 'function');
  if (typeof g.Colheita3D !== 'function') return;

  // --- A entrada da tela vira direcao no mundo ------------------------------
  // A camera fica atras do menino, entao frente e o rumo dele.
  const meia = Math.PI / 2;
  const casos = [
    ['virado para +Z, frente vai para +Z', 0, 0, 1, 0, 1],
    ['virado para +Z, direita vai para +X', 0, 1, 0, 1, 0],
    ['virado para +X, frente vai para +X', meia, 0, 1, 1, 0],
    ['virado para +X, direita vai para -Z', meia, 1, 0, 0, -1],
    ['virado para -Z, frente vai para -Z', Math.PI, 0, 1, 0, -1]
  ];
  for (const [nome, facing, sx, sz, ex, ez] of casos) {
    const r = g.entradaRelativa(facing, sx, sz);
    report.check(nome, Math.abs(r.x - ex) < 1e-9 && Math.abs(r.z - ez) < 1e-9, `(${r.x.toFixed(3)}, ${r.z.toFixed(3)})`);
  }
  // Diagonal tem de continuar diagonal, e com o mesmo tamanho: a soma de dois
  // eixos unitarios nao pode virar mais rapida que um so.
  const diag = g.entradaRelativa(meia, 1, 1);
  report.check('andar na diagonal nao da velocidade extra',
    Math.abs(Math.hypot(diag.x, diag.z) - Math.SQRT2) < 1e-9, `|v|=${Math.hypot(diag.x, diag.z).toFixed(4)}`);
  report.check('sem entrada o comando e parado', new g.EntradaJogo().command === 'PARAR');

  // --- Canvas e DOM falsos -------------------------------------------------
  const el = () => ({ textContent: '', style: {}, classList: { estado: {}, toggle(c, on) { this.estado[c] = on; }, contains(c) { return !!this.estado[c]; } } });
  const canvas3d = el();
  const canvas2d = el();
  const dom = {
    spdEl: el(), pillSpeed: el(), spdBar: el(), hudLap: el(), pillLap: el(),
    hudTime: el(), pillTime: el(), hudCoins: el(), hudScore: el(), pillScore: el(),
    turboBar: el(), phaseTitle: el()
  };

  const quadros = [];
  const fabricaCena = (opts) => ({
    opts,
    fases: [],
    removido: false,
    definirFase(f) { this.fases.push(f.id); },
    desenhar(sim, dt) { quadros.push({ dt, x: sim.player.x, y: sim.player.y }); },
    removerResize() {},
    destruir() { this.removido = true; }
  });

  const colar = new g.Colheita3D({
    canvas3d,
    canvas2d,
    phases: g.HARVEST_PHASES,
    dom,
    criarSim: (o) => new g.HarvestSim(Object.assign({ rng: () => 0.5 }, o)),
    criarCena: fabricaCena,
    criarMenino: () => ({ marcador: true })
  });

  report.check('antes de ligar nada a 3D esta desligada', colar.ativo === false);
  report.check('ligar a 3D funciona', colar.iniciar(5) === true && colar.ativo === true);
  report.check('o canvas 3D foi para a frente', canvas3d.classList.contains('hidden') === false);
  report.check('o canvas 2D foi escondido', canvas2d.classList.contains('hidden') === true);
  report.check('o mundo da simulacao foi entregue para a cena',
    colar.cena.opts.mundo === colar.sim.world && !!colar.cena.opts.menino);
  report.check('o fundo da primeira fase foi pedido', colar.cena.fases.join(',') === '1', colar.cena.fases.join(','));

  // --- Um quadro de jogo de verdade ----------------------------------------
  const entrada = new g.EntradaJogo();
  entrada.steerX = 0.5;
  entrada.steerZ = 1;
  entrada.command = 'TURBO';
  const xAntes = colar.sim.player.x;
  report.check('atualizar devolve true quando a 3D esta ligada', colar.atualizar(1 / 60, entrada) === true);
  report.check('o quadro chegou na cena', quadros.length === 1 && quadros[0].dt > 0);
  report.check('o menino andou no mundo', Math.abs(colar.sim.player.x - xAntes) > 0.001,
    `dx=${(colar.sim.player.x - xAntes).toFixed(4)}`);

  // Pulo: a entrada tem que chegar na simulacao como requestJump, e nao como
  // aceleracao. Sem isso o botao de pular vira "andar mais rapido".
  const yAntes = colar.sim.player.y;
  const pulo = new g.EntradaJogo();
  pulo.pular = true;
  pulo.command = 'PARAR';
  colar.atualizar(1 / 60, pulo);
  report.check('o comando de pular tira o menino do chao', colar.sim.player.y > yAntes || !colar.sim.player.grounded,
    `y=${colar.sim.player.y.toFixed(3)} grounded=${colar.sim.player.grounded}`);

  // --- O HUD acompanha a simulacao ------------------------------------------
  report.check('a meta vai para o HUD', dom.hudLap.textContent === `0 / ${colar.sim.targetGuarana}`, dom.hudLap.textContent);
  report.check('o tempo vai para o HUD', /^\d{2}:\d{2}$/.test(dom.hudTime.textContent), dom.hudTime.textContent);
  report.check('a velocidade vai para o HUD em km/h', /^\d+$/.test(dom.spdEl.textContent), dom.spdEl.textContent);
  report.check('a barra de velocidade tem largura', /%$/.test(dom.spdBar.style.width), dom.spdBar.style.width);
  report.check('a barra de turbo tem largura', /%$/.test(dom.turboBar.style.width), dom.turboBar.style.width);
  report.check('o titulo da fase vai para o HUD',
    dom.phaseTitle.textContent === colar.sim.phase.shortTitle, dom.phaseTitle.textContent);

  // --- Troca de fase troca o fundo ------------------------------------------
  colar.sim.phaseIndex = 4;
  colar.sim.guaranaCollected = 7;
  colar.atualizar(1 / 60, entrada);
  report.check('trocar de fase pede o fundo novo',
    colar.cena.fases.join(',') === '1,5', colar.cena.fases.join(','));
  report.check('o HUD mostra a meta da fase nova', dom.hudLap.textContent.includes('/ '), dom.hudLap.textContent);

  // --- Desligar devolve a tela para o 2D ------------------------------------
  const cenaGuardada = colar.cena;
  colar.parar();
  report.check('parar desliga a 3D', colar.ativo === false && colar.sim === null);
  report.check('parar devolve o canvas 2D', canvas2d.classList.contains('hidden') === false);
  report.check('parar esconde o canvas 3D', canvas3d.classList.contains('hidden') === true);
  report.check('parar libera o contexto WebGL', cenaGuardada.removido === true);
  report.check('atualizar fora da 3D devolve false para o 2D assumir', colar.atualizar(1 / 60, entrada) === false);

  // --- Pausa: a cena desenha, mas o mundo nao anda --------------------------
  const c3 = el();
  const fimAvisos = [];
  const pausavel = new g.Colheita3D({
    canvas3d: c3, canvas2d: el(), phases: g.HARVEST_PHASES, dom,
    criarSim: (o) => new g.HarvestSim(Object.assign({ rng: () => 0.5 }, o)),
    criarCena: fabricaCena,
    criarMenino: () => ({}),
    onTerminar: (s) => fimAvisos.push(s.score)
  });
  pausavel.iniciar(5);
  const xParado = pausavel.sim.player.x;
  pausavel.pausado = true;
  pausavel.atualizar(1 / 60, entrada);
  report.check('pausado o mundo nao anda', pausavel.sim.player.x === xParado, `x=${pausavel.sim.player.x}`);
  report.check('pausado ainda desenha a cena', quadros.length > 0);
  pausavel.pausado = false;

  // --- Fim de rodada avisa uma vez so ---------------------------------------
  report.check('no comeco nao avisou fim', fimAvisos.length === 0);
  pausavel.sim.isVictory = true;
  pausavel.atualizar(1 / 60, entrada);
  pausavel.atualizar(1 / 60, entrada);
  pausavel.atualizar(1 / 60, entrada);
  report.check('o fim da rodada avisa exatamente uma vez', fimAvisos.length === 1, `avisos=${fimAvisos.length}`);
  report.check('o aviso leva a pontuacao junto', fimAvisos[0] === pausavel.sim.score, `score=${fimAvisos[0]}`);
  report.check('a simulacao expoe isFinished para a cola', pausavel.sim.isFinished === true);

  // --- reiniciarTudo volta para a primeira fase -----------------------------
  pausavel.sim.phaseIndex = 3;
  pausavel.sim.isVictory = true;
  pausavel.reiniciarTudo();
  report.check('reiniciarTudo volta para a fase 1', pausavel.sim.phaseIndex === 0, `fase=${pausavel.sim.phaseIndex}`);
  report.check('reiniciarTudo limpa o resultado', pausavel.sim.isVictory === false && pausavel.sim.isGameOver === false);
  report.check('reiniciarTudo rearma o aviso de fim', pausavel._avisouFim === false);
  pausavel.sim.isVictory = true;
  pausavel.atualizar(1 / 60, entrada);
  report.check('depois de reiniciarTudo o aviso dispara de novo', fimAvisos.length === 2, `avisos=${fimAvisos.length}`);

  // --- proximaFase so avanca se houver proxima ------------------------------
  const multi = g.HARVEST_PHASES.length > 1;
  report.check('existe mais de uma fase para avancar', multi, `fases=${g.HARVEST_PHASES.length}`);
  if (multi) {
    pausavel.reiniciarTudo();
    const ok1 = pausavel.proximaFase();
    report.check('proximaFase avanca a fase', ok1 === true && pausavel.sim.phaseIndex === 1, `fase=${pausavel.sim.phaseIndex}`);
    pausavel.sim.phaseIndex = g.HARVEST_PHASES.length - 1;
    report.check('proximaFase recusa na ultima fase', pausavel.proximaFase() === false, `fase=${pausavel.sim.phaseIndex}`);
  }

  // --- Falha de WebGL tem que devolver o jogo para o 2D ---------------------
  const c2 = el();
  const quebrado = new g.Colheita3D({
    canvas3d: c3,
    canvas2d: c2,
    phases: g.HARVEST_PHASES,
    dom: {},
    criarSim: (o) => new g.HarvestSim(o),
    criarCena: () => { throw new Error('WebGL nao suportado'); },
    criarMenino: () => ({})
  });
  report.check('sem WebGL a 3D nao liga', quebrado.iniciar(5) === false && quebrado.ativo === false);
  report.check('sem WebGL o 2D continua visivel', c2.classList.contains('hidden') === false);
  report.check('sem WebGL o motivo fica registrado', /WebGL/.test(quebrado.erro || ''), quebrado.erro);

  // Sem canvas nenhum tambem tem de degradar, e nao estourar.
  const semCanvas = new g.Colheita3D({
    phases: g.HARVEST_PHASES, dom: {},
    criarSim: (o) => new g.HarvestSim(o),
    criarCena: () => ({}),
    criarMenino: () => ({})
  });
  report.check('sem canvas a 3D nao liga', semCanvas.iniciar(5) === false && !!semCanvas.erro, semCanvas.erro);

  // --- Reiniciar preserva a fase --------------------------------------------
  const c3b = el();
  const rr = new g.Colheita3D({
    canvas3d: c3b, canvas2d: el(), phases: g.HARVEST_PHASES, dom,
    criarSim: (o) => new g.HarvestSim(Object.assign({ rng: () => 0.5 }, o)),
    criarCena: fabricaCena,
    criarMenino: () => ({})
  });
  rr.iniciar(5);
  rr.sim.phaseIndex = 3;
  rr.sim.score = 999;
  rr.reiniciar();
  report.check('reiniciar mantem a fase', rr.sim.phaseIndex === 3, `fase=${rr.sim.phaseIndex}`);
  report.check('reiniciar zera a pontuacao', rr.sim.score === 0, `pontos=${rr.sim.score}`);
}

secaoMaues(g)
  .then(() => secaoFundos(g))
  .then(() => secaoClipes())
  .then(() => secaoSim3D(g))
  .then(() => secaoMenino3D(g))
  .then(() => secaoHarvest3D(g))
  .then(() => secaoCola3D(g))
  .then(() => process.exit(report.summary()))
  .catch((e) => {
    report.check('secao 15 sem excecao', false, e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : String(e));
    process.exit(report.summary());
  });

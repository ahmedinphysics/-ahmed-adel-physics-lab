(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const defaults = { mode: 'voltage', emf: 12, targetCurrent: 0.8, internalR: 1, lampRs: [6, 6], switchClosed: true, batteryConnected: true, animationSpeed: 1 };
  const state = { ...defaults, lampRs: [...defaults.lampRs] };
  let lastTime = performance.now();
  let phase = 0;
  let announceTimer = 0;
  let enteringLamp = -1;

  const $ = id => document.getElementById(id);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const fmt = (n, digits = 2) => Number.isFinite(n) ? n.toFixed(digits) : '—';

  const els = {
    scene: $('circuitScene'), wireUnder: $('wireUnder'), wireMain: $('wireMain'), wireShine: $('wireShine'), nodeLayer: $('nodeLayer'), lampLayer: $('lampLayer'), chargeLayer: $('chargeLayer'),
    batterySvg: $('batterySvg'), mainSwitchSvg: $('mainSwitchSvg'), switchArm: $('switchArm'), svgSwitchState: $('svgSwitchState'), svgEmf: $('svgEmf'), svgInternalR: $('svgInternalR'), svgCircuitSummary: $('svgCircuitSummary'),
    voltageMode: $('voltageMode'), currentMode: $('currentMode'), emfControl: $('emfControl'), currentControl: $('currentControl'), modeNote: $('modeNote'),
    emf: $('emf'), emfOut: $('emfOut'), targetCurrent: $('targetCurrent'), currentOut: $('currentOut'), internalResistance: $('internalResistance'), internalResistanceOut: $('internalResistanceOut'),
    lampControls: $('lampControls'), lampReadings: $('lampReadings'), addLamp: $('addLamp'), removeLamp: $('removeLamp'), animationSpeed: $('animationSpeed'), animationSpeedOut: $('animationSpeedOut'),
    switchButton: $('switchButton'), batteryButton: $('batteryButton'), resetButton: $('resetButton'), teacherMode: $('teacherMode'), menuButton: $('menuButton'), sidebar: $('sidebar'),
    statusDot: $('statusDot'), headerState: $('headerState'), headerDetail: $('headerDetail'), measuredCurrent: $('measuredCurrent'), externalResistance: $('externalResistance'), totalResistance: $('totalResistance'), sourceValueLabel: $('sourceValueLabel'), sourceValue: $('sourceValue'), terminalVoltage: $('terminalVoltage'), internalDrop: $('internalDrop'), loadPower: $('loadPower'), internalPower: $('internalPower'),
    effectIcon: $('effectIcon'), effectTitle: $('effectTitle'), effectText: $('effectText')
  };

  function physics() {
    const externalR = state.lampRs.reduce((sum, r) => sum + r, 0);
    const totalR = externalR + state.internalR;
    const sourceEmf = state.mode === 'current' ? state.targetCurrent * totalR : state.emf;
    const energized = state.switchClosed && state.batteryConnected && sourceEmf > 0 && totalR > 0;
    const current = energized ? (state.mode === 'current' ? state.targetCurrent : sourceEmf / totalR) : 0;
    const terminalV = state.batteryConnected ? sourceEmf - current * state.internalR : 0;
    const internalDrop = current * state.internalR;
    const lamps = state.lampRs.map(r => ({ r, v: current * r, p: current * current * r }));
    return { externalR, totalR, sourceEmf, energized, current, terminalV, internalDrop, lamps, loadPower: current * current * externalR, internalPower: current * current * state.internalR };
  }

  function lampPositions(count) {
    if (count === 1) return [550];
    const start = count === 4 ? 245 : count === 3 ? 310 : 405;
    const end = 1100 - start;
    return Array.from({ length: count }, (_, i) => start + (end - start) * i / (count - 1));
  }

  function circuitWirePath() {
    const positions = lampPositions(state.lampRs.length);
    let d = 'M327 472H100V188';
    let cursor = 100;
    positions.forEach(x => { d += `M${cursor} 188H${x - 42}`; cursor = x + 42; });
    d += `M${cursor} 188H1000V472H856M744 472H613`;
    return d;
  }

  function flowPath() { return 'M327 472H100V188H1000V472H613'; }

  function lampMarkup(x, index, reading, entering) {
    const energy = reading.p > 0 ? clamp(Math.sqrt(reading.p / 12), .06, 1) : 0;
    const on = reading.p > .0001;
    return `<g class="lamp-svg ${on ? 'on' : ''} ${entering ? 'entering' : ''}" data-lamp="${index}" style="--energy:${energy.toFixed(3)}" transform="translate(${x} 188)" role="img" aria-label="Lamp ${index + 1}, ${reading.r.toFixed(1)} ohms, ${reading.p.toFixed(2)} watts">
      <ellipse class="lamp-spill" cx="0" cy="-22" rx="68" ry="105"/><path class="lamp-aura" d="M-64-35C-55-112 55-112 64-35 70 28 35 68 0 78-35 68-70 28-64-35Z"/>
      <path class="glass" d="M-38-6C-66-30-69-74-47-105-25-138 25-138 47-105 69-74 66-30 38-6 26 5 22 16 21 25H-21C-22 16-26 5-38-6Z"/>
      <path class="glass-edge" d="M-38-6C-66-30-69-74-47-105-25-138 25-138 47-105 69-74 66-30 38-6"/><path class="glass-highlight" d="M-35-96C-51-76-52-48-42-30"/>
      <path class="support" d="M-15 24-12-35M15 24 12-35"/><path class="filament" d="M-12-35-6-42 0-35 6-42 12-35"/>
      <rect class="base" x="-26" y="20" width="52" height="49" rx="7"/><path class="base-ribs" d="M-23 31H23M-24 41H24M-23 51H23M-20 61H20"/><rect class="contact" x="-10" y="68" width="20" height="8" rx="4"/>
      <circle class="circuit-node" cx="-42" cy="0" r="9"/><circle class="circuit-node" cx="42" cy="0" r="9"/>
      <text class="lamp-label" x="0" y="98">L${index + 1}</text><text class="lamp-reading" x="0" y="115">${reading.r.toFixed(1)} Ω · ${reading.p.toFixed(2)} W</text>
    </g>`;
  }

  function renderCircuit(p) {
    const d = circuitWirePath();
    els.wireUnder.setAttribute('d', d); els.wireMain.setAttribute('d', d); els.wireShine.setAttribute('d', d);
    els.nodeLayer.innerHTML = '<circle class="circuit-node" cx="100" cy="188" r="10"/><circle class="circuit-node" cx="1000" cy="188" r="10"/><circle class="circuit-node" cx="100" cy="472" r="10"/><circle class="circuit-node" cx="1000" cy="472" r="10"/>';
    const positions = lampPositions(state.lampRs.length);
    els.lampLayer.innerHTML = positions.map((x, i) => lampMarkup(x, i, p.lamps[i], i === enteringLamp)).join('');
    els.svgCircuitSummary.textContent = `${state.lampRs.length} lamp${state.lampRs.length === 1 ? '' : 's'} in series`;
    els.svgEmf.textContent = `${fmt(p.sourceEmf, 1)} V`;
    els.svgInternalR.textContent = `${fmt(state.internalR, 1)} Ω`;
    els.mainSwitchSvg.classList.toggle('off', !state.switchClosed);
    els.svgSwitchState.textContent = state.switchClosed ? 'ON' : 'OFF';
    els.mainSwitchSvg.setAttribute('aria-pressed', String(state.switchClosed));
    els.batterySvg.classList.toggle('disconnected', !state.batteryConnected);
    els.batterySvg.setAttribute('aria-pressed', String(state.batteryConnected));
    els.scene.classList.toggle('circuit-off', !p.energized);
    enteringLamp = -1;
  }

  function renderLampControls() {
    els.lampControls.innerHTML = state.lampRs.map((r, i) => `<div class="lamp-control"><label for="lampR${i}"><span>Lamp ${i + 1} resistance R<sub>${i + 1}</sub></span><output id="lampR${i}Out">${r.toFixed(1)} Ω</output></label><input id="lampR${i}" data-index="${i}" type="range" min="1" max="30" step="0.5" value="${r}"></div>`).join('');
    els.lampControls.querySelectorAll('input').forEach(input => input.addEventListener('input', event => {
      const i = Number(event.currentTarget.dataset.index);
      state.lampRs[i] = Number(event.currentTarget.value);
      $(`lampR${i}Out`).textContent = `${state.lampRs[i].toFixed(1)} Ω`;
      update();
    }));
  }

  function renderReadings(p) {
    els.lampReadings.innerHTML = p.lamps.map((lamp, i) => {
      const energy = p.energized ? clamp(Math.sqrt(lamp.p / 12) * 100, 2, 100) : 0;
      return `<div class="lamp-reading-row"><b>L${i + 1}</b><span>${fmt(lamp.v, 2)} V</span><span>${fmt(lamp.p, 2)} W</span><span class="mini-brightness" title="Relative brightness"><i style="width:${energy.toFixed(0)}%"></i></span></div>`;
    }).join('');
  }

  function renderControls(p) {
    const currentMode = state.mode === 'current';
    els.voltageMode.classList.toggle('active', !currentMode); els.currentMode.classList.toggle('active', currentMode);
    els.emfControl.classList.toggle('hidden', currentMode); els.currentControl.classList.toggle('hidden', !currentMode);
    els.modeNote.textContent = currentMode ? 'Control I and resistance; the required EMF is calculated automatically.' : 'Control ℰ and resistance; the simulation calculates current.';
    els.emfOut.textContent = `${fmt(state.emf, 1)} V`; els.currentOut.textContent = `${fmt(state.targetCurrent, 2)} A`; els.internalResistanceOut.textContent = `${fmt(state.internalR, 1)} Ω`; els.animationSpeedOut.textContent = `${fmt(state.animationSpeed, 1)}×`;
    els.addLamp.disabled = state.lampRs.length >= 4; els.removeLamp.disabled = state.lampRs.length <= 1;
    els.switchButton.classList.toggle('on', state.switchClosed); els.switchButton.setAttribute('aria-pressed', String(state.switchClosed)); els.switchButton.innerHTML = `Main switch <span>${state.switchClosed ? 'ON' : 'OFF'}</span>`;
    els.batteryButton.classList.toggle('on', state.batteryConnected); els.batteryButton.setAttribute('aria-pressed', String(state.batteryConnected)); els.batteryButton.innerHTML = `Battery <span>${state.batteryConnected ? 'connected' : 'disconnected'}</span>`;
    els.measuredCurrent.textContent = `${fmt(p.current, 3)} A`; els.externalResistance.textContent = `${fmt(p.externalR, 1)} Ω`; els.totalResistance.textContent = `${fmt(p.totalR, 1)} Ω`;
    els.sourceValueLabel.textContent = currentMode ? 'Required EMF ℰ' : 'Battery EMF ℰ'; els.sourceValue.textContent = `${fmt(p.sourceEmf, 2)} V`; els.terminalVoltage.textContent = `${fmt(p.terminalV, 2)} V`; els.internalDrop.textContent = `${fmt(p.internalDrop, 2)} V`; els.loadPower.textContent = `${fmt(p.loadPower, 2)} W`; els.internalPower.textContent = `${fmt(p.internalPower, 2)} W`;
    els.headerState.textContent = p.energized ? 'Circuit energized' : (!state.batteryConnected ? 'Battery disconnected' : 'Series path open');
    els.headerDetail.textContent = currentMode ? 'Current source mode · ℰ calculated' : 'Voltage source mode · I calculated';
    const activeColor = p.energized ? '#2be18f' : '#ff6b69'; els.statusDot.style.background = activeColor; els.statusDot.style.boxShadow = `0 0 10px ${activeColor}`;
  }

  function update() {
    const p = physics();
    renderCircuit(p); renderControls(p); renderReadings(p);
    document.documentElement.style.setProperty('--flow-strength', clamp(p.current / 2, 0, 1).toFixed(3));
  }

  function announceChange(kind, before, after) {
    clearTimeout(announceTimer);
    const added = kind === 'add';
    els.effectIcon.textContent = added ? '＋' : '−';
    els.effectTitle.textContent = added ? `Lamp ${state.lampRs.length} added in series` : 'Last lamp removed';
    if (state.mode === 'voltage') {
      const direction = after.current < before.current ? 'fell' : 'rose';
      els.effectText.textContent = `Rtotal changed from ${fmt(before.totalR, 1)} Ω to ${fmt(after.totalR, 1)} Ω. Current ${direction} from ${fmt(before.current, 3)} A to ${fmt(after.current, 3)} A, changing every lamp together.`;
    } else {
      els.effectText.textContent = `Current stays at ${fmt(state.targetCurrent, 2)} A. Required EMF changed from ${fmt(before.sourceEmf, 2)} V to ${fmt(after.sourceEmf, 2)} V to satisfy ℰ = I(R + r).`;
    }
    announceTimer = setTimeout(() => { els.effectTitle.textContent = 'Add a lamp and observe'; els.effectText.textContent = state.mode === 'voltage' ? 'At fixed EMF: total resistance rises, current falls, and every lamp becomes dimmer.' : 'At fixed current: adding resistance makes the required source EMF rise.'; }, 8500);
  }

  function toggleSwitch() { state.switchClosed = !state.switchClosed; update(); }
  function toggleBattery() { state.batteryConnected = !state.batteryConnected; update(); }
  function keyboardActivate(element, action) { element.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } }); }

  els.voltageMode.addEventListener('click', () => { state.mode = 'voltage'; update(); });
  els.currentMode.addEventListener('click', () => { state.mode = 'current'; update(); });
  els.emf.addEventListener('input', e => { state.emf = Number(e.target.value); update(); });
  els.targetCurrent.addEventListener('input', e => { state.targetCurrent = Number(e.target.value); update(); });
  els.internalResistance.addEventListener('input', e => { state.internalR = Number(e.target.value); update(); });
  els.animationSpeed.addEventListener('input', e => { state.animationSpeed = Number(e.target.value); update(); });
  els.addLamp.addEventListener('click', () => { if (state.lampRs.length >= 4) return; const before = physics(); state.lampRs.push(6); enteringLamp = state.lampRs.length - 1; renderLampControls(); update(); announceChange('add', before, physics()); });
  els.removeLamp.addEventListener('click', () => { if (state.lampRs.length <= 1) return; const before = physics(); state.lampRs.pop(); renderLampControls(); update(); announceChange('remove', before, physics()); });
  els.switchButton.addEventListener('click', toggleSwitch); els.mainSwitchSvg.addEventListener('click', toggleSwitch); keyboardActivate(els.mainSwitchSvg, toggleSwitch);
  els.batteryButton.addEventListener('click', toggleBattery); els.batterySvg.addEventListener('click', toggleBattery); keyboardActivate(els.batterySvg, toggleBattery);
  els.resetButton.addEventListener('click', () => { Object.assign(state, defaults, { lampRs: [...defaults.lampRs] }); els.emf.value = state.emf; els.targetCurrent.value = state.targetCurrent; els.internalResistance.value = state.internalR; els.animationSpeed.value = state.animationSpeed; renderLampControls(); update(); });
  els.teacherMode.addEventListener('change', e => document.body.classList.toggle('teacher-active', e.target.checked));
  els.menuButton.addEventListener('click', () => els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click', e => { if (innerWidth <= 880 && els.sidebar.classList.contains('open-mobile') && !els.sidebar.contains(e.target) && e.target !== els.menuButton) els.sidebar.classList.remove('open-mobile'); });

  const flowGuide = document.createElementNS(SVG_NS, 'path'); flowGuide.setAttribute('d', flowPath()); flowGuide.setAttribute('fill', 'none'); flowGuide.setAttribute('stroke', 'none'); els.scene.appendChild(flowGuide);
  const markers = Array.from({ length: 22 }, (_, i) => {
    const g = document.createElementNS(SVG_NS, 'g'); g.setAttribute('class', 'charge-marker'); g.innerHTML = '<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>'; els.chargeLayer.appendChild(g); return { el: g, offset: i / 22 };
  });

  function animate(now) {
    const dt = Math.min(40, now - lastTime); lastTime = now;
    const p = physics();
    if (p.energized) phase = (phase + dt * (.000035 + Math.min(p.current, 2.5) * .000085) * state.animationSpeed) % 1;
    const length = flowGuide.getTotalLength();
    markers.forEach(marker => {
      marker.el.style.display = p.energized ? '' : 'none';
      if (!p.energized) return;
      const point = flowGuide.getPointAtLength(((phase + marker.offset) % 1) * length); marker.el.setAttribute('transform', `translate(${point.x} ${point.y})`);
    });
    requestAnimationFrame(animate);
  }

  renderLampControls(); update(); requestAnimationFrame(animate);
})();

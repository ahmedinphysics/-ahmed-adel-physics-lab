(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const defaults = { voltage: 12, r1: 8, r2: 12, main: true, battery: true, animationSpeed: 1 };
  const state = { ...defaults };
  const $ = id => document.getElementById(id);
  const fmt = (n, digits = 2) => Number.isFinite(n) ? n.toFixed(digits) : '—';
  let flows = [];
  let lastTime = performance.now();

  const els = {
    scene: $('kirchhoffScene'), chargeLayer: $('chargeLayer'), batterySvg: $('batterySvg'), mainSwitchSvg: $('mainSwitchSvg'), svgSwitchState: $('svgSwitchState'),
    svgVoltage: $('svgVoltage'), svgR1: $('svgR1'), svgR2: $('svgR2'), svgDrop1: $('svgDrop1'), svgDrop2: $('svgDrop2'), drop1Badge: $('drop1Badge'), drop2Badge: $('drop2Badge'),
    svgKvlEquation: $('svgKvlEquation'), svgKvlBalance: $('svgKvlBalance'),
    nodeAText: $('nodeAText'), nodeBText: $('nodeBText'), nodeCText: $('nodeCText'), nodeDText: $('nodeDText'), nodeEText: $('nodeEText'),
    voltage: $('voltage'), voltageOut: $('voltageOut'), r1: $('r1'), r1Out: $('r1Out'), r2: $('r2'), r2Out: $('r2Out'), r1DropMini: $('r1DropMini'), r2DropMini: $('r2DropMini'), animationSpeed: $('animationSpeed'), animationSpeedOut: $('animationSpeedOut'),
    switchButton: $('switchButton'), batteryButton: $('batteryButton'), resetButton: $('resetButton'), teacherMode: $('teacherMode'), menuButton: $('menuButton'), sidebar: $('sidebar'),
    statusDot: $('statusDot'), headerState: $('headerState'), headerDetail: $('headerDetail'), effectTitle: $('effectTitle'), effectText: $('effectText'),
    loopCurrent: $('loopCurrent'), sourceRise: $('sourceRise'), drop1: $('drop1'), drop2: $('drop2'), switchDrop: $('switchDrop'), kvlResidual: $('kvlResidual'), equivalentResistance: $('equivalentResistance'), sourcePower: $('sourcePower'),
    riseAccount: $('riseAccount'), dropAccount: $('dropAccount'), netAccount: $('netAccount')
  };

  function physics() {
    const connected = state.battery;
    const closed = connected && state.main;
    const req = state.r1 + state.r2;
    const current = closed ? state.voltage / req : 0;
    const v1 = current * state.r1;
    const v2 = current * state.r2;
    const vSwitch = connected && !state.main ? state.voltage : 0;
    const sourceRise = connected ? state.voltage : 0;
    const drops = v1 + v2 + vSwitch;
    const residual = sourceRise - drops;
    const power = sourceRise * current;

    let nodeA = 0, nodeB = 0, nodeC = 0, nodeD = 0, nodeE = 0;
    if (connected) {
      nodeA = state.voltage;
      nodeB = state.voltage - v1;
      nodeC = state.voltage - v1 - v2;
      nodeD = nodeC;
      nodeE = 0;
    }
    return { connected, closed, req, current, v1, v2, vSwitch, sourceRise, drops, residual, power, nodeA, nodeB, nodeC, nodeD, nodeE };
  }

  function signed(n, digits = 2) {
    const safe = Math.abs(n) < 0.5 * 10 ** (-digits) ? 0 : n;
    return `${safe >= 0 ? '+' : '−'}${Math.abs(safe).toFixed(digits)}`;
  }

  function renderCircuit(p) {
    els.svgVoltage.textContent = `${signed(p.sourceRise, 1)} V`;
    els.svgR1.textContent = `${state.r1.toFixed(1)} Ω`;
    els.svgR2.textContent = `${state.r2.toFixed(1)} Ω`;
    els.svgDrop1.textContent = `${signed(-p.v1, 2)} V`;
    els.svgDrop2.textContent = `${signed(-p.v2, 2)} V`;
    els.drop1Badge.classList.toggle('inactive', !p.closed);
    els.drop2Badge.classList.toggle('inactive', !p.closed);

    els.nodeAText.textContent = `${fmt(p.nodeA, 2)} V`;
    els.nodeBText.textContent = `${fmt(p.nodeB, 2)} V`;
    els.nodeCText.textContent = `${fmt(p.nodeC, 2)} V`;
    els.nodeDText.textContent = `${fmt(p.nodeD, 2)} V`;
    els.nodeEText.textContent = `${fmt(p.nodeE, 2)} V`;

    els.mainSwitchSvg.classList.toggle('off', !state.main);
    els.mainSwitchSvg.setAttribute('aria-pressed', String(state.main));
    els.svgSwitchState.textContent = state.main ? 'ON' : 'OFF';
    els.batterySvg.classList.toggle('disconnected', !state.battery);
    els.batterySvg.setAttribute('aria-pressed', String(state.battery));
    els.scene.classList.toggle('circuit-off', !p.closed);

    const terms = [`${signed(p.sourceRise, 2)}`, `${signed(-p.v1, 2)}`, `${signed(-p.v2, 2)}`];
    if (p.vSwitch > 1e-9) terms.push(`${signed(-p.vSwitch, 2)}`);
    els.svgKvlEquation.textContent = `${terms.join(' ')} = ${fmt(p.residual, 2)} V`;
    if (!p.connected) {
      els.svgKvlBalance.textContent = 'source disconnected · no energized loop';
    } else if (!state.main) {
      els.svgKvlBalance.textContent = 'I = 0 · full source voltage appears across the open switch';
    } else {
      els.svgKvlBalance.textContent = 'ΣΔV = 0 · energy per charge returns to its starting value';
    }
    els.svgKvlBalance.closest('.kvl-badge').classList.toggle('off', !p.connected);
    rebuildFlows(p);
  }

  function markerMarkup() {
    return '<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>';
  }

  function addFlow(d, current, markerCount) {
    if (!(current > 0)) return;
    const guide = document.createElementNS(NS, 'path');
    guide.setAttribute('d', d); guide.setAttribute('fill', 'none'); guide.setAttribute('stroke', 'none');
    els.chargeLayer.appendChild(guide);
    const markers = Array.from({ length: markerCount }, (_, i) => {
      const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'charge-marker'); g.innerHTML = markerMarkup(); els.chargeLayer.appendChild(g);
      return { el: g, offset: i / markerCount };
    });
    flows.push({ guide, markers, current, phase: 0 });
  }

  function rebuildFlows(p) {
    els.chargeLayer.innerHTML = ''; flows = [];
    if (!p.closed || !(p.current > 0)) return;
    addFlow('M430 555H150V220H950V555H430', p.current, 20);
  }

  function renderControls(p) {
    els.voltageOut.textContent = `${state.voltage.toFixed(1)} V`;
    els.r1Out.textContent = `${state.r1.toFixed(1)} Ω`;
    els.r2Out.textContent = `${state.r2.toFixed(1)} Ω`;
    els.r1DropMini.textContent = `ΔV₁ = ${fmt(p.v1, 2)} V`;
    els.r2DropMini.textContent = `ΔV₂ = ${fmt(p.v2, 2)} V`;
    els.animationSpeedOut.textContent = `${state.animationSpeed.toFixed(1)}×`;
    setStateButton(els.switchButton, state.main, 'Main switch', 'ON', 'OFF');
    setStateButton(els.batteryButton, state.battery, 'Battery', 'connected', 'disconnected');
  }

  function setStateButton(el, on, label, yes, no) {
    el.classList.toggle('on', on); el.setAttribute('aria-pressed', String(on)); el.innerHTML = `${label} <span>${on ? yes : no}</span>`;
  }

  function renderMeasurements(p) {
    els.loopCurrent.textContent = `${fmt(p.current, 3)} A`;
    els.sourceRise.textContent = `${signed(p.sourceRise, 2)} V`;
    els.drop1.textContent = `${signed(-p.v1, 2)} V`;
    els.drop2.textContent = `${signed(-p.v2, 2)} V`;
    els.switchDrop.textContent = `${signed(-p.vSwitch, 2)} V`;
    els.kvlResidual.textContent = `${fmt(p.residual, 3)} V`;
    els.equivalentResistance.textContent = `${fmt(p.req, 2)} Ω`;
    els.sourcePower.textContent = `${fmt(p.power, 2)} W`;
    els.riseAccount.textContent = `${signed(p.sourceRise, 2)} V`;
    els.dropAccount.textContent = `${signed(-p.drops, 2)} V`;
    els.netAccount.textContent = `${fmt(p.residual, 2)} V`;
  }

  function renderStatus(p) {
    let stateText = 'KVL satisfied';
    let detail = 'Voltage rise equals the sum of voltage drops';
    if (!state.battery) { stateText = 'Battery disconnected'; detail = 'No active source in the loop'; }
    else if (!state.main) { stateText = 'Loop open · KVL still balances'; detail = 'I = 0 and the source voltage is across the open switch'; }

    els.headerState.textContent = stateText; els.headerDetail.textContent = detail;
    const c = p.connected ? '#2be18f' : '#ff6b69';
    els.statusDot.style.background = c; els.statusDot.style.boxShadow = `0 0 10px ${c}`;

    if (p.closed) {
      els.effectTitle.textContent = 'Energy per charge is conserved around the loop';
      els.effectText.textContent = `The battery gives each coulomb ${fmt(p.sourceRise, 2)} J of energy. R₁ removes ${fmt(p.v1, 2)} J/C and R₂ removes ${fmt(p.v2, 2)} J/C. The net change after one complete loop is ${fmt(p.residual, 2)} J/C.`;
    } else if (p.connected) {
      els.effectTitle.textContent = 'Open switch: current stops, but KVL does not disappear';
      els.effectText.textContent = `With I = 0, both resistor drops are 0 V. The full ${fmt(p.sourceRise, 2)} V appears across the open switch, so the algebraic loop sum remains zero.`;
    } else {
      els.effectTitle.textContent = 'Source disconnected';
      els.effectText.textContent = 'Reconnect the battery to energize the model, then close the switch to watch the same current pass through both resistors and the voltage split between them.';
    }
  }

  function update() {
    const p = physics(); renderCircuit(p); renderControls(p); renderMeasurements(p); renderStatus(p);
  }

  function keyActivate(el, fn) {
    el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });
  }

  const toggleMain = () => { state.main = !state.main; update(); };
  const toggleBattery = () => { state.battery = !state.battery; update(); };

  els.voltage.addEventListener('input', e => { state.voltage = Number(e.target.value); update(); });
  els.r1.addEventListener('input', e => { state.r1 = Number(e.target.value); update(); });
  els.r2.addEventListener('input', e => { state.r2 = Number(e.target.value); update(); });
  els.animationSpeed.addEventListener('input', e => { state.animationSpeed = Number(e.target.value); update(); });
  els.switchButton.addEventListener('click', toggleMain); els.mainSwitchSvg.addEventListener('click', toggleMain); keyActivate(els.mainSwitchSvg, toggleMain);
  els.batteryButton.addEventListener('click', toggleBattery); els.batterySvg.addEventListener('click', toggleBattery); keyActivate(els.batterySvg, toggleBattery);
  els.resetButton.addEventListener('click', () => {
    Object.assign(state, defaults); els.voltage.value = state.voltage; els.r1.value = state.r1; els.r2.value = state.r2; els.animationSpeed.value = state.animationSpeed; update();
  });
  els.teacherMode.addEventListener('change', e => document.body.classList.toggle('teacher-active', e.target.checked));
  els.menuButton.addEventListener('click', () => els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click', e => { if (innerWidth <= 880 && els.sidebar.classList.contains('open-mobile') && !els.sidebar.contains(e.target) && e.target !== els.menuButton) els.sidebar.classList.remove('open-mobile'); });

  function animate(now) {
    const dt = Math.min(40, now - lastTime); lastTime = now;
    flows.forEach(flow => {
      flow.phase = (flow.phase + dt * (.00005 + Math.min(flow.current, 5) * .00009) * state.animationSpeed) % 1;
      const len = flow.guide.getTotalLength();
      flow.markers.forEach(m => {
        const p = ((flow.phase + m.offset) % 1) * len;
        const pt = flow.guide.getPointAtLength(p);
        const pt2 = flow.guide.getPointAtLength(Math.min(len, p + 2));
        const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
        m.el.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${angle})`);
      });
    });
    requestAnimationFrame(animate);
  }

  update(); requestAnimationFrame(animate);
})();

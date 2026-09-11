(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const defaults = { voltage: 12, r1: 8, r2: 12, branch1: true, branch2: true, main: true, battery: true, animationSpeed: 1 };
  const state = { ...defaults };
  const $ = id => document.getElementById(id);
  const fmt = (n, digits = 3) => Number.isFinite(n) ? n.toFixed(digits) : '—';
  let flows = [];
  let lastTime = performance.now();

  const els = {
    scene: $('kirchhoffScene'), branchLayer: $('branchLayer'), chargeLayer: $('chargeLayer'),
    batterySvg: $('batterySvg'), mainSwitchSvg: $('mainSwitchSvg'), svgSwitchState: $('svgSwitchState'), svgVoltage: $('svgVoltage'), svgKclEquation: $('svgKclEquation'), svgKclBalance: $('svgKclBalance'),
    voltage: $('voltage'), voltageOut: $('voltageOut'), r1: $('r1'), r1Out: $('r1Out'), r2: $('r2'), r2Out: $('r2Out'), animationSpeed: $('animationSpeed'), animationSpeedOut: $('animationSpeedOut'),
    branch1Button: $('branch1Button'), branch2Button: $('branch2Button'), switchButton: $('switchButton'), batteryButton: $('batteryButton'), resetButton: $('resetButton'), teacherMode: $('teacherMode'), menuButton: $('menuButton'), sidebar: $('sidebar'),
    statusDot: $('statusDot'), headerState: $('headerState'), headerDetail: $('headerDetail'), totalCurrent: $('totalCurrent'), current1: $('current1'), current2: $('current2'), currentSum: $('currentSum'), kclResidual: $('kclResidual'), equivalentResistance: $('equivalentResistance'), measuredVoltage: $('measuredVoltage'), splitRatio: $('splitRatio'),
    j1In: $('j1In'), j1Out: $('j1Out'), j2In: $('j2In'), j2Out: $('j2Out'), effectTitle: $('effectTitle'), effectText: $('effectText')
  };

  function physics() {
    const circuitReady = state.battery && state.main && state.voltage > 0;
    const g1 = state.branch1 ? 1 / state.r1 : 0;
    const g2 = state.branch2 ? 1 / state.r2 : 0;
    const conductance = g1 + g2;
    const energized = circuitReady && conductance > 0;
    const i1 = energized && state.branch1 ? state.voltage / state.r1 : 0;
    const i2 = energized && state.branch2 ? state.voltage / state.r2 : 0;
    const total = i1 + i2;
    const out = i1 + i2;
    const residual = total - out;
    const req = conductance > 0 ? 1 / conductance : Infinity;
    const p1 = i1 * i1 * state.r1;
    const p2 = i2 * i2 * state.r2;
    return { energized, i1, i2, total, out, residual, req, p1, p2 };
  }

  function branchMarkup(index, y, r, current, closed) {
    const switchX1 = 345, switchX2 = 425, resistorX = 592;
    const cls = closed ? '' : 'off';
    const currentClass = current > 0 ? '' : 'zero';
    return `<g class="branch ${cls}" data-branch="${index}">
      <path class="branch-under" d="M260 265V${y}H${switchX1}M${switchX2} ${y}H520M664 ${y}H880V265"/>
      <path class="branch-wire" d="M260 265V${y}H${switchX1}M${switchX2} ${y}H520M664 ${y}H880V265"/>
      <path class="branch-shine" d="M264 265V${y - 3}H${switchX1}M${switchX2} ${y - 3}H520M664 ${y - 3}H876V265"/>
      <g class="branch-switch ${cls}" data-switch="${index}" role="button" tabindex="0" aria-label="Open or close branch ${index}" aria-pressed="${closed}">
        <circle cx="${switchX1}" cy="${y}" r="12"/><circle cx="${switchX2}" cy="${y}" r="12"/>
        <line class="switch-arm-shadow" x1="${switchX1}" y1="${y}" x2="${switchX2}" y2="${y}" style="transform-origin:${switchX1}px ${y}px"/>
        <line class="switch-arm-body" x1="${switchX1}" y1="${y}" x2="${switchX2}" y2="${y}" style="transform-origin:${switchX1}px ${y}px"/>
        <line class="switch-arm-shine" x1="${switchX1 + 6}" y1="${y - 4}" x2="${switchX2 - 6}" y2="${y - 4}" style="transform-origin:${switchX1}px ${y}px"/>
        <circle class="switch-pin" cx="${switchX1}" cy="${y}" r="4"/>
        <text x="${(switchX1 + switchX2) / 2}" y="${y - 24}">S${index}</text><text class="switch-state" x="${(switchX1 + switchX2) / 2}" y="${y + 31}">${closed ? 'ON' : 'OFF'}</text>
        <rect class="hit" x="${switchX1 - 22}" y="${y - 45}" width="124" height="90"/>
      </g>
      <g class="resistor" transform="translate(${resistorX} ${y})">
        <path class="resistor-lead" d="M-72 0H-57M57 0H72"/>
        <rect class="resistor-body" x="-57" y="-24" width="114" height="48" rx="22"/>
        <line class="resistor-band b1" x1="-31" y1="-20" x2="-31" y2="20"/><line class="resistor-band b2" x1="-12" y1="-22" x2="-12" y2="22"/><line class="resistor-band b3" x1="10" y1="-22" x2="10" y2="22"/><line class="resistor-band b4" x1="34" y1="-20" x2="34" y2="20"/>
        <path class="resistor-highlight" d="M-40-15H32c10 0 16 4 20 10H-48c2-5 4-8 8-10Z"/>
        <text class="resistor-label" x="0" y="-38">R${index}</text><text class="resistor-value" x="0" y="43">${r.toFixed(1)} Ω</text>
      </g>
      <text class="branch-current-label ${currentClass}" x="760" y="${y - 22}">I${index} = ${fmt(current, 3)} A</text>
      <text class="branch-name" x="485" y="${y - 25}">${index === 1 ? 'UPPER PATH' : 'LOWER PATH'}</text>
    </g>`;
  }

  function renderCircuit(p) {
    els.branchLayer.innerHTML = branchMarkup(1, 170, state.r1, p.i1, state.branch1) + branchMarkup(2, 360, state.r2, p.i2, state.branch2);
    els.branchLayer.querySelectorAll('[data-switch]').forEach(sw => {
      const action = () => { const i = Number(sw.dataset.switch); if (i === 1) state.branch1 = !state.branch1; else state.branch2 = !state.branch2; update(); };
      sw.addEventListener('click', action);
      sw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } });
    });
    els.svgVoltage.textContent = `${state.voltage.toFixed(1)} V`;
    els.mainSwitchSvg.classList.toggle('off', !state.main); els.mainSwitchSvg.setAttribute('aria-pressed', String(state.main)); els.svgSwitchState.textContent = state.main ? 'ON' : 'OFF';
    els.batterySvg.classList.toggle('disconnected', !state.battery); els.batterySvg.setAttribute('aria-pressed', String(state.battery));
    els.scene.classList.toggle('circuit-off', !p.energized);
    els.svgKclEquation.textContent = `${fmt(p.total, 3)} A = ${fmt(p.i1, 3)} A + ${fmt(p.i2, 3)} A`;
    els.svgKclBalance.textContent = p.energized ? 'charge balance at each junction = 0' : 'no closed conducting path';
    els.svgKclBalance.closest('.kcl-badge').classList.toggle('off', !p.energized);
    rebuildFlows(p);
  }

  function markerMarkup() { return '<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>'; }
  function addFlow(d, current, markerCount) {
    if (!(current > 0)) return;
    const guide = document.createElementNS(NS, 'path'); guide.setAttribute('d', d); guide.setAttribute('fill', 'none'); guide.setAttribute('stroke', 'none'); els.chargeLayer.appendChild(guide);
    const markers = Array.from({ length: markerCount }, (_, i) => { const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'charge-marker'); g.innerHTML = markerMarkup(); els.chargeLayer.appendChild(g); return { el: g, offset: i / markerCount }; });
    flows.push({ guide, markers, current, phase: 0 });
  }
  function rebuildFlows(p) {
    els.chargeLayer.innerHTML = ''; flows = [];
    if (!p.energized) return;
    addFlow('M430 555H150V265H260', p.total, 7);
    if (p.i1 > 0) addFlow('M260 265V170H880V265', p.i1, 10);
    if (p.i2 > 0) addFlow('M260 265V360H880V265', p.i2, 10);
    addFlow('M880 265H950V555H650', p.total, 7);
  }

  function renderControls() {
    els.voltageOut.textContent = `${state.voltage.toFixed(1)} V`; els.r1Out.textContent = `${state.r1.toFixed(1)} Ω`; els.r2Out.textContent = `${state.r2.toFixed(1)} Ω`; els.animationSpeedOut.textContent = `${state.animationSpeed.toFixed(1)}×`;
    setButton(els.branch1Button, state.branch1, 'ON', 'OFF'); setButton(els.branch2Button, state.branch2, 'ON', 'OFF');
    setStateButton(els.switchButton, state.main, 'Main switch', 'ON', 'OFF'); setStateButton(els.batteryButton, state.battery, 'Battery', 'connected', 'disconnected');
  }
  function setButton(el, on, yes, no) { el.classList.toggle('on', on); el.classList.toggle('off', !on); el.setAttribute('aria-pressed', String(on)); el.textContent = on ? yes : no; }
  function setStateButton(el, on, label, yes, no) { el.classList.toggle('on', on); el.setAttribute('aria-pressed', String(on)); el.innerHTML = `${label} <span>${on ? yes : no}</span>`; }

  function renderMeasurements(p) {
    els.totalCurrent.textContent = `${fmt(p.total, 3)} A`; els.current1.textContent = `${fmt(p.i1, 3)} A`; els.current2.textContent = `${fmt(p.i2, 3)} A`; els.currentSum.textContent = `${fmt(p.out, 3)} A`; els.kclResidual.textContent = `${fmt(p.residual, 3)} A`;
    els.equivalentResistance.textContent = Number.isFinite(p.req) ? `${fmt(p.req, 2)} Ω` : 'Open circuit'; els.measuredVoltage.textContent = `${state.voltage.toFixed(2)} V`;
    if (p.i1 > 0 && p.i2 > 0) els.splitRatio.textContent = `${(p.i1 / p.i2).toFixed(2)} : 1`; else if (p.i1 > 0) els.splitRatio.textContent = 'all through I₁'; else if (p.i2 > 0) els.splitRatio.textContent = 'all through I₂'; else els.splitRatio.textContent = 'no current';
    els.j1In.textContent = `${fmt(p.total, 3)} A`; els.j1Out.textContent = `${fmt(p.out, 3)} A`; els.j2In.textContent = `${fmt(p.out, 3)} A`; els.j2Out.textContent = `${fmt(p.total, 3)} A`;
  }

  function renderStatus(p) {
    let stateText = 'KCL satisfied', detail = 'Current splits at J₁ and recombines at J₂';
    if (!state.battery) { stateText = 'Battery disconnected'; detail = 'No source connected'; }
    else if (!state.main) { stateText = 'Main path open'; detail = 'Current is zero everywhere'; }
    else if (!state.branch1 && !state.branch2) { stateText = 'Both branches open'; detail = 'No closed conducting path'; }
    else if (!p.energized) { stateText = 'Circuit inactive'; detail = 'No current flow'; }
    els.headerState.textContent = stateText; els.headerDetail.textContent = detail;
    const c = p.energized ? '#2be18f' : '#ff6b69'; els.statusDot.style.background = c; els.statusDot.style.boxShadow = `0 0 10px ${c}`;
    if (p.energized) {
      els.effectTitle.textContent = 'Charge is conserved at both junctions';
      els.effectText.textContent = `At J₁: ${fmt(p.total, 3)} A enters and ${fmt(p.i1, 3)} A + ${fmt(p.i2, 3)} A leaves. At J₂ the same two currents recombine into ${fmt(p.total, 3)} A.`;
    } else {
      els.effectTitle.textContent = 'No steady current path';
      els.effectText.textContent = 'Close the main path and at least one branch to watch current conservation in real time.';
    }
  }

  function update() { const p = physics(); renderCircuit(p); renderControls(); renderMeasurements(p); renderStatus(p); }
  function keyActivate(el, fn) { el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); }
  const toggleMain = () => { state.main = !state.main; update(); };
  const toggleBattery = () => { state.battery = !state.battery; update(); };

  els.voltage.addEventListener('input', e => { state.voltage = Number(e.target.value); update(); });
  els.r1.addEventListener('input', e => { state.r1 = Number(e.target.value); update(); });
  els.r2.addEventListener('input', e => { state.r2 = Number(e.target.value); update(); });
  els.animationSpeed.addEventListener('input', e => { state.animationSpeed = Number(e.target.value); update(); });
  els.branch1Button.addEventListener('click', () => { state.branch1 = !state.branch1; update(); });
  els.branch2Button.addEventListener('click', () => { state.branch2 = !state.branch2; update(); });
  els.switchButton.addEventListener('click', toggleMain); els.mainSwitchSvg.addEventListener('click', toggleMain); keyActivate(els.mainSwitchSvg, toggleMain);
  els.batteryButton.addEventListener('click', toggleBattery); els.batterySvg.addEventListener('click', toggleBattery); keyActivate(els.batterySvg, toggleBattery);
  els.resetButton.addEventListener('click', () => { Object.assign(state, defaults); els.voltage.value = state.voltage; els.r1.value = state.r1; els.r2.value = state.r2; els.animationSpeed.value = state.animationSpeed; update(); });
  els.teacherMode.addEventListener('change', e => document.body.classList.toggle('teacher-active', e.target.checked));
  els.menuButton.addEventListener('click', () => els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click', e => { if (innerWidth <= 880 && els.sidebar.classList.contains('open-mobile') && !els.sidebar.contains(e.target) && e.target !== els.menuButton) els.sidebar.classList.remove('open-mobile'); });

  function animate(now) {
    const dt = Math.min(40, now - lastTime); lastTime = now;
    flows.forEach(flow => {
      flow.phase = (flow.phase + dt * (.000045 + Math.min(flow.current, 5) * .000065) * state.animationSpeed) % 1;
      const len = flow.guide.getTotalLength();
      flow.markers.forEach(m => { const pt = flow.guide.getPointAtLength(((flow.phase + m.offset) % 1) * len); m.el.setAttribute('transform', `translate(${pt.x} ${pt.y})`); });
    });
    requestAnimationFrame(animate);
  }

  update(); requestAnimationFrame(animate);
})();

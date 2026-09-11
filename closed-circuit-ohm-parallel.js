(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const defaults = { mode: 'voltage', emf: 12, targetCurrent: 1.5, internalR: 1, branches: [{ r: 6, closed: true }, { r: 6, closed: true }], switchClosed: true, batteryConnected: true, animationSpeed: 1 };
  const state = { ...defaults, branches: defaults.branches.map(x => ({ ...x })) };
  let enteringBranch = -1;
  let lastTime = performance.now();
  let announceTimer = 0;
  let flows = [];
  const $ = id => document.getElementById(id);
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const fmt = (n, d = 2) => Number.isFinite(n) ? n.toFixed(d) : '∞';
  const els = {
    scene: $('parallelScene'), railLayer: $('railLayer'), branchLayer: $('branchLayer'), chargeLayer: $('chargeLayer'), batterySvg: $('batterySvg'), mainSwitchSvg: $('mainSwitchSvg'), svgSwitchState: $('svgSwitchState'), svgEmf: $('svgEmf'), svgInternalR: $('svgInternalR'), svgCircuitSummary: $('svgCircuitSummary'),
    voltageMode: $('voltageMode'), currentMode: $('currentMode'), emfControl: $('emfControl'), currentControl: $('currentControl'), modeNote: $('modeNote'), emf: $('emf'), emfOut: $('emfOut'), targetCurrent: $('targetCurrent'), currentOut: $('currentOut'), internalResistance: $('internalResistance'), internalResistanceOut: $('internalResistanceOut'), animationSpeed: $('animationSpeed'), animationSpeedOut: $('animationSpeedOut'),
    branchControls: $('branchControls'), branchReadings: $('branchReadings'), addLamp: $('addLamp'), removeLamp: $('removeLamp'), switchButton: $('switchButton'), batteryButton: $('batteryButton'), resetButton: $('resetButton'), teacherMode: $('teacherMode'), menuButton: $('menuButton'), sidebar: $('sidebar'),
    statusDot: $('statusDot'), headerState: $('headerState'), headerDetail: $('headerDetail'), measuredCurrent: $('measuredCurrent'), equivalentResistance: $('equivalentResistance'), totalResistance: $('totalResistance'), sourceValueLabel: $('sourceValueLabel'), sourceValue: $('sourceValue'), terminalVoltage: $('terminalVoltage'), internalDrop: $('internalDrop'), loadPower: $('loadPower'), internalPower: $('internalPower'), effectIcon: $('effectIcon'), effectTitle: $('effectTitle'), effectText: $('effectText')
  };

  function physics() {
    const conductance = state.branches.reduce((sum, b) => sum + (b.closed ? 1 / b.r : 0), 0);
    const req = conductance > 0 ? 1 / conductance : Infinity;
    const totalR = Number.isFinite(req) ? req + state.internalR : Infinity;
    const sourceEmf = state.mode === 'current' ? (Number.isFinite(totalR) ? state.targetCurrent * totalR : Infinity) : state.emf;
    const pathReady = state.switchClosed && state.batteryConnected && conductance > 0 && Number.isFinite(sourceEmf);
    const totalCurrent = pathReady ? (state.mode === 'current' ? state.targetCurrent : sourceEmf / totalR) : 0;
    const terminalV = state.batteryConnected && Number.isFinite(sourceEmf) ? sourceEmf - totalCurrent * state.internalR : 0;
    const branches = state.branches.map(b => {
      const current = pathReady && b.closed ? terminalV / b.r : 0;
      return { ...b, current, voltage: current * b.r, power: current * current * b.r };
    });
    return { conductance, req, totalR, sourceEmf, pathReady, totalCurrent, terminalV, internalDrop: totalCurrent * state.internalR, branches, loadPower: branches.reduce((s, b) => s + b.power, 0), internalPower: totalCurrent * totalCurrent * state.internalR };
  }

  function branchYs(n) {
    return ({ 1: [270], 2: [205, 365], 3: [150, 280, 410], 4: [130, 235, 340, 445] })[n];
  }

  function lampMarkup(y, i, b) {
    const energy = b.power > 0 ? clamp(Math.sqrt(b.power / 16), .06, 1) : 0;
    const on = b.power > .0001;
    return `<g class="parallel-lamp ${on ? 'on' : ''}" style="--energy:${energy.toFixed(3)}" transform="translate(620 ${y})" role="img" aria-label="Lamp ${i + 1}, ${b.r.toFixed(1)} ohms, ${b.power.toFixed(2)} watts">
      <ellipse class="lamp-spill" cx="0" cy="-42" rx="58" ry="78"/><path class="lamp-aura" d="M-52-48C-47-111 47-111 52-48 56-4 29 21 0 25-29 21-56-4-52-48Z"/>
      <path class="glass" d="M-33-29C-56-48-58-79-39-102-21-125 21-125 39-102 58-79 56-48 33-29 24-21 21-13 20-7H-20C-21-13-24-21-33-29Z"/>
      <path class="glass-edge" d="M-33-29C-56-48-58-79-39-102-21-125 21-125 39-102 58-79 56-48 33-29"/><path class="glass-highlight" d="M-29-96C-42-80-44-61-36-47"/>
      <path class="support" d="M-13-8-10-48M13-8 10-48"/><path class="filament" d="M-10-48-5-54 0-48 5-54 10-48"/>
      <rect class="base" x="-24" y="-10" width="48" height="38" rx="6"/><path class="base-ribs" d="M-21-1H21M-22 8H22M-20 17H20"/><rect class="contact" x="-9" y="27" width="18" height="7" rx="4"/>
      <circle class="parallel-node" cx="-42" cy="0" r="9"/><circle class="parallel-node" cx="42" cy="0" r="9"/>
      <text class="lamp-label" x="0" y="49">L${i + 1}</text><text class="lamp-reading" x="0" y="65">${b.r.toFixed(1)} Ω · ${b.power.toFixed(2)} W</text>
    </g>`;
  }

  function branchMarkup(y, i, b) {
    const off = !state.branches[i].closed;
    return `<g class="branch ${off ? 'branch-off' : ''} ${i === enteringBranch ? 'branch-entering' : ''}" data-branch="${i}">
      <path class="branch-under" d="M150 ${y}H258M350 ${y}H578M662 ${y}H950"/><path class="branch-wire" d="M150 ${y}H258M350 ${y}H578M662 ${y}H950"/><path class="branch-shine" d="M150 ${y - 2}H258M350 ${y - 2}H578M662 ${y - 2}H950"/>
      <circle class="parallel-node" cx="150" cy="${y}" r="10"/><circle class="parallel-node" cx="950" cy="${y}" r="10"/>
      <g class="branch-switch ${off ? 'off' : ''}" data-switch="${i}" role="button" tabindex="0" aria-label="Open or close branch ${i + 1}" aria-pressed="${!off}">
        <circle cx="258" cy="${y}" r="12"/><circle cx="350" cy="${y}" r="12"/>
        <line class="switch-arm-shadow" x1="258" y1="${y}" x2="350" y2="${y}" style="transform-origin:258px ${y}px"/><line class="switch-arm-body" x1="258" y1="${y}" x2="350" y2="${y}" style="transform-origin:258px ${y}px"/><line class="switch-arm-shine" x1="264" y1="${y - 4}" x2="344" y2="${y - 4}" style="transform-origin:258px ${y}px"/>
        <circle class="switch-pin" cx="258" cy="${y}" r="4"/><text x="304" y="${y - 24}">S${i + 1}</text><text class="switch-state" x="304" y="${y + 31}">${off ? 'OFF' : 'ON'}</text><rect class="hit" x="238" y="${y - 42}" width="132" height="84"/>
      </g>
      ${lampMarkup(y, i, b)}
      <text class="branch-current-label" x="474" y="${y - 14}">I${i + 1} = ${fmt(b.current, 3)} A</text>
    </g>`;
  }

  function renderCircuit(p) {
    const ys = branchYs(state.branches.length), top = ys[0], low = ys[ys.length - 1];
    const railD = `M370 545H150V${top}M150 ${low}V545M950 ${top}V545H842M722 545H630`;
    els.railLayer.innerHTML = `<path class="rail-under" d="${railD}"/><path class="rail-main" d="${railD}"/><path class="rail-shine" d="${railD}"/><circle class="parallel-node" cx="150" cy="545" r="10"/><circle class="parallel-node" cx="950" cy="545" r="10"/>`;
    els.branchLayer.innerHTML = ys.map((y, i) => branchMarkup(y, i, p.branches[i])).join('');
    els.branchLayer.querySelectorAll('[data-switch]').forEach(sw => {
      const action = () => { const i = Number(sw.dataset.switch); state.branches[i].closed = !state.branches[i].closed; renderBranchControls(); update(); };
      sw.addEventListener('click', action); sw.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } });
    });
    const activeCount = state.branches.filter(b => b.closed).length;
    els.svgCircuitSummary.textContent = `${activeCount} active branch${activeCount === 1 ? '' : 'es'} · ${state.branches.length} installed`;
    els.svgEmf.textContent = Number.isFinite(p.sourceEmf) ? `${fmt(p.sourceEmf, 1)} V` : 'open circuit';
    els.svgInternalR.textContent = `${fmt(state.internalR, 1)} Ω`;
    els.mainSwitchSvg.classList.toggle('off', !state.switchClosed); els.mainSwitchSvg.setAttribute('aria-pressed', String(state.switchClosed)); els.svgSwitchState.textContent = state.switchClosed ? 'ON' : 'OFF';
    els.batterySvg.classList.toggle('disconnected', !state.batteryConnected); els.batterySvg.setAttribute('aria-pressed', String(state.batteryConnected)); els.scene.classList.toggle('circuit-off', !p.pathReady);
    rebuildFlows(p, ys); enteringBranch = -1;
  }

  function markerMarkup() { return '<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>'; }
  function addFlow(d, current, markerCount) {
    const guide = document.createElementNS(NS, 'path'); guide.setAttribute('d', d); guide.setAttribute('fill', 'none'); guide.setAttribute('stroke', 'none'); els.chargeLayer.appendChild(guide);
    const markers = Array.from({ length: markerCount }, (_, i) => { const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'charge-marker'); g.innerHTML = markerMarkup(); els.chargeLayer.appendChild(g); return { el: g, offset: i / markerCount }; });
    flows.push({ guide, markers, current, phase: 0 });
  }
  function rebuildFlows(p, ys) {
    els.chargeLayer.innerHTML = ''; flows = [];
    if (!p.pathReady) return;
    const low = ys[ys.length - 1];
    addFlow(`M370 545H150V${low}`, p.totalCurrent, 7); addFlow(`M950 ${low}V545H630`, p.totalCurrent, 7);
    p.branches.forEach((b, i) => { if (b.current > 0) addFlow(`M150 ${ys[i]}H950`, b.current, 7); });
    for (let i = 0; i < ys.length - 1; i++) {
      const cumulative = p.branches.slice(0, i + 1).reduce((s, b) => s + b.current, 0);
      if (cumulative > 0) { addFlow(`M150 ${ys[i + 1]}V${ys[i]}`, cumulative, 3); addFlow(`M950 ${ys[i]}V${ys[i + 1]}`, cumulative, 3); }
    }
  }

  function renderBranchControls() {
    els.branchControls.innerHTML = state.branches.map((b, i) => `<div class="branch-control"><div class="branch-control-top"><label for="branchR${i}">Branch ${i + 1} · R<sub>${i + 1}</sub></label><output id="branchR${i}Out">${b.r.toFixed(1)} Ω</output><button class="branch-toggle ${b.closed ? '' : 'off'}" data-toggle="${i}" type="button">${b.closed ? 'ON' : 'OFF'}</button></div><input id="branchR${i}" data-index="${i}" type="range" min="1" max="30" step="0.5" value="${b.r}"></div>`).join('');
    els.branchControls.querySelectorAll('input').forEach(input => input.addEventListener('input', e => { const i = Number(e.currentTarget.dataset.index); state.branches[i].r = Number(e.currentTarget.value); $(`branchR${i}Out`).textContent = `${state.branches[i].r.toFixed(1)} Ω`; update(); }));
    els.branchControls.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', () => { const i = Number(btn.dataset.toggle); state.branches[i].closed = !state.branches[i].closed; renderBranchControls(); update(); }));
  }

  function renderMeasurements(p) {
    els.measuredCurrent.textContent = `${fmt(p.totalCurrent, 3)} A`; els.equivalentResistance.textContent = Number.isFinite(p.req) ? `${fmt(p.req, 2)} Ω` : 'Open circuit'; els.totalResistance.textContent = Number.isFinite(p.totalR) ? `${fmt(p.totalR, 2)} Ω` : 'Open circuit';
    els.sourceValueLabel.textContent = state.mode === 'current' ? 'Required EMF ℰ' : 'Battery EMF ℰ'; els.sourceValue.textContent = Number.isFinite(p.sourceEmf) ? `${fmt(p.sourceEmf, 2)} V` : 'Not finite'; els.terminalVoltage.textContent = `${fmt(p.terminalV, 2)} V`; els.internalDrop.textContent = `${fmt(p.internalDrop, 2)} V`; els.loadPower.textContent = `${fmt(p.loadPower, 2)} W`; els.internalPower.textContent = `${fmt(p.internalPower, 2)} W`;
    els.branchReadings.innerHTML = p.branches.map((b, i) => { const energy = p.pathReady && b.closed ? clamp(Math.sqrt(b.power / 16) * 100, 2, 100) : 0; return `<div class="branch-reading-row ${b.closed ? '' : 'off'}"><b>B${i + 1}</b><span>${fmt(b.current, 3)} A</span><span>${fmt(b.voltage, 2)} V</span><span>${fmt(b.power, 2)} W</span><span class="mini-brightness"><i style="width:${energy.toFixed(0)}%"></i></span></div>`; }).join('');
  }

  function renderControls(p) {
    const cm = state.mode === 'current'; els.voltageMode.classList.toggle('active', !cm); els.currentMode.classList.toggle('active', cm); els.emfControl.classList.toggle('hidden', cm); els.currentControl.classList.toggle('hidden', !cm);
    els.modeNote.textContent = cm ? 'Control total current and branch resistances; the required EMF is calculated automatically.' : 'Control ℰ and branch resistances; the simulation calculates every current.';
    els.emfOut.textContent = `${fmt(state.emf, 1)} V`; els.currentOut.textContent = `${fmt(state.targetCurrent, 2)} A`; els.internalResistanceOut.textContent = `${fmt(state.internalR, 1)} Ω`; els.animationSpeedOut.textContent = `${fmt(state.animationSpeed, 1)}×`;
    els.addLamp.disabled = state.branches.length >= 4; els.removeLamp.disabled = state.branches.length <= 1;
    els.switchButton.classList.toggle('on', state.switchClosed); els.switchButton.setAttribute('aria-pressed', String(state.switchClosed)); els.switchButton.innerHTML = `Main switch <span>${state.switchClosed ? 'ON' : 'OFF'}</span>`;
    els.batteryButton.classList.toggle('on', state.batteryConnected); els.batteryButton.setAttribute('aria-pressed', String(state.batteryConnected)); els.batteryButton.innerHTML = `Battery <span>${state.batteryConnected ? 'connected' : 'disconnected'}</span>`;
    const noBranch = !state.branches.some(b => b.closed); els.headerState.textContent = p.pathReady ? 'Circuit energized' : (!state.batteryConnected ? 'Battery disconnected' : !state.switchClosed ? 'Main path open' : noBranch ? 'All branches open' : 'Circuit inactive');
    els.headerDetail.textContent = cm ? 'Current source mode · ℰ calculated' : 'Voltage source mode · branch currents calculated'; const c = p.pathReady ? '#2be18f' : '#ff6b69'; els.statusDot.style.background = c; els.statusDot.style.boxShadow = `0 0 10px ${c}`;
  }

  function update() { const p = physics(); renderCircuit(p); renderControls(p); renderMeasurements(p); }
  function announce(kind, before, after) {
    clearTimeout(announceTimer); const add = kind === 'add'; els.effectIcon.textContent = add ? '＋' : '−'; els.effectTitle.textContent = add ? `Parallel branch ${state.branches.length} added` : 'Parallel branch removed';
    if (state.mode === 'voltage') els.effectText.textContent = `R_eq changed from ${fmt(before.req, 2)} Ω to ${fmt(after.req, 2)} Ω. Total current changed from ${fmt(before.totalCurrent, 3)} A to ${fmt(after.totalCurrent, 3)} A; terminal voltage is now ${fmt(after.terminalV, 2)} V.`;
    else els.effectText.textContent = `Total current stays at ${fmt(state.targetCurrent, 2)} A. Required EMF changed from ${fmt(before.sourceEmf, 2)} V to ${fmt(after.sourceEmf, 2)} V as R_eq changed.`;
    announceTimer = setTimeout(() => { els.effectTitle.textContent = 'Add a parallel lamp and observe'; els.effectText.textContent = state.mode === 'voltage' ? 'At fixed EMF: equivalent resistance falls and total current rises. Internal resistance makes terminal voltage fall slightly under the heavier load.' : 'At fixed total current: adding a branch lowers the required source EMF and redistributes current.'; }, 8500);
  }

  function toggleMain() { state.switchClosed = !state.switchClosed; update(); }
  function toggleBattery() { state.batteryConnected = !state.batteryConnected; update(); }
  function keyActivate(el, fn) { el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } }); }
  els.voltageMode.addEventListener('click', () => { state.mode = 'voltage'; update(); }); els.currentMode.addEventListener('click', () => { state.mode = 'current'; update(); }); els.emf.addEventListener('input', e => { state.emf = Number(e.target.value); update(); }); els.targetCurrent.addEventListener('input', e => { state.targetCurrent = Number(e.target.value); update(); }); els.internalResistance.addEventListener('input', e => { state.internalR = Number(e.target.value); update(); }); els.animationSpeed.addEventListener('input', e => { state.animationSpeed = Number(e.target.value); update(); });
  els.addLamp.addEventListener('click', () => { if (state.branches.length >= 4) return; const before = physics(); state.branches.push({ r: 6, closed: true }); enteringBranch = state.branches.length - 1; renderBranchControls(); update(); announce('add', before, physics()); });
  els.removeLamp.addEventListener('click', () => { if (state.branches.length <= 1) return; const before = physics(); state.branches.pop(); renderBranchControls(); update(); announce('remove', before, physics()); });
  els.switchButton.addEventListener('click', toggleMain); els.mainSwitchSvg.addEventListener('click', toggleMain); keyActivate(els.mainSwitchSvg, toggleMain); els.batteryButton.addEventListener('click', toggleBattery); els.batterySvg.addEventListener('click', toggleBattery); keyActivate(els.batterySvg, toggleBattery);
  els.resetButton.addEventListener('click', () => { Object.assign(state, defaults, { branches: defaults.branches.map(x => ({ ...x })) }); els.emf.value = state.emf; els.targetCurrent.value = state.targetCurrent; els.internalResistance.value = state.internalR; els.animationSpeed.value = state.animationSpeed; renderBranchControls(); update(); });
  els.teacherMode.addEventListener('change', e => document.body.classList.toggle('teacher-active', e.target.checked)); els.menuButton.addEventListener('click', () => els.sidebar.classList.toggle('open-mobile')); document.addEventListener('click', e => { if (innerWidth <= 880 && els.sidebar.classList.contains('open-mobile') && !els.sidebar.contains(e.target) && e.target !== els.menuButton) els.sidebar.classList.remove('open-mobile'); });

  function animate(now) {
    const dt = Math.min(40, now - lastTime); lastTime = now;
    flows.forEach(flow => { flow.phase = (flow.phase + dt * (.00004 + Math.min(flow.current, 4) * .000065) * state.animationSpeed) % 1; const len = flow.guide.getTotalLength(); flow.markers.forEach(m => { const pt = flow.guide.getPointAtLength(((flow.phase + m.offset) % 1) * len); m.el.setAttribute('transform', `translate(${pt.x} ${pt.y})`); }); }); requestAnimationFrame(animate);
  }
  renderBranchControls(); update(); requestAnimationFrame(animate);
})();

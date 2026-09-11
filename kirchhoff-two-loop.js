(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const defaults = { e1: 18, e2: 12, r1: 8, r2: 10, r3: 6, animationSpeed: 1 };
  const state = { ...defaults };
  const $ = id => document.getElementById(id);
  const fmt = (n, digits = 2) => Number.isFinite(n) ? n.toFixed(digits) : '—';
  const EPS = 1e-10;
  let flows = [];
  let lastTime = performance.now();

  const els = {
    scene: $('twoLoopScene'), chargeLayer: $('chargeLayer'),
    svgE1: $('svgE1'), svgE2: $('svgE2'), svgR1: $('svgR1'), svgR2: $('svgR2'), svgR3: $('svgR3'), svgV1: $('svgV1'), svgV2: $('svgV2'),
    nodeAText: $('nodeAText'), nodeBText: $('nodeBText'), nodeCText: $('nodeCText'),
    i1Arrow: $('i1Arrow'), i2Arrow: $('i2Arrow'), i3Arrow: $('i3Arrow'), i1Vector: $('i1Vector'), i2Vector: $('i2Vector'), i3Vector: $('i3Vector'), i1Label: $('i1Label'), i2Label: $('i2Label'), i3Label: $('i3Label'),
    svgKclEquation: $('svgKclEquation'), svgKclBalance: $('svgKclBalance'), svgLeftEquation: $('svgLeftEquation'), svgRightEquation: $('svgRightEquation'),
    e1: $('e1'), e1Out: $('e1Out'), e2: $('e2'), e2Out: $('e2Out'), r1: $('r1'), r1Out: $('r1Out'), r2: $('r2'), r2Out: $('r2Out'), r3: $('r3'), r3Out: $('r3Out'),
    i1Mini: $('i1Mini'), i2Mini: $('i2Mini'), i3Mini: $('i3Mini'), animationSpeed: $('animationSpeed'), animationSpeedOut: $('animationSpeedOut'),
    resetButton: $('resetButton'), presets: Array.from(document.querySelectorAll('.preset')), teacherMode: $('teacherMode'), menuButton: $('menuButton'), sidebar: $('sidebar'),
    statusDot: $('statusDot'), headerState: $('headerState'), headerDetail: $('headerDetail'), effectTitle: $('effectTitle'), effectText: $('effectText'),
    junctionVoltage: $('junctionVoltage'), current1: $('current1'), current2: $('current2'), current3: $('current3'), kclResidual: $('kclResidual'), leftResidual: $('leftResidual'), rightResidual: $('rightResidual'), sourcePower: $('sourcePower'), resistorPower: $('resistorPower'),
    kclAccount: $('kclAccount'), leftAccount: $('leftAccount'), rightAccount: $('rightAccount')
  };

  function clean(n) { return Math.abs(n) < EPS ? 0 : n; }
  function signed(n, digits = 3, unit = '') {
    const v = clean(n);
    return `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)}${unit ? ` ${unit}` : ''}`;
  }

  function physics() {
    const g1 = 1 / state.r1, g2 = 1 / state.r2, g3 = 1 / state.r3;
    const vb = (state.e1 * g1 + state.e2 * g2) / (g1 + g2 + g3);
    const i1 = (state.e1 - vb) / state.r1;
    const i2 = (state.e2 - vb) / state.r2;
    const i3 = vb / state.r3;
    const v1 = state.e1 - vb;
    const v2 = state.e2 - vb;
    const v3 = vb;
    const kcl = i1 + i2 - i3;
    const leftKvl = state.e1 - i1 * state.r1 - i3 * state.r3;
    const rightKvl = state.e2 - i2 * state.r2 - i3 * state.r3;
    const sourcePower = state.e1 * i1 + state.e2 * i2;
    const resistorPower = i1 * i1 * state.r1 + i2 * i2 * state.r2 + i3 * i3 * state.r3;
    const powerResidual = sourcePower - resistorPower;
    return { vb, i1, i2, i3, v1, v2, v3, kcl, leftKvl, rightKvl, sourcePower, resistorPower, powerResidual };
  }

  function directionText(current, positiveText, negativeText) {
    if (Math.abs(current) < 0.0005) return '≈ 0 · no net flow';
    return current > 0 ? positiveText : negativeText;
  }

  function setArrow(vector, path, label, current, positiveD, negativeD, positiveText, negativeText, labelPrefix) {
    const reversed = current < -0.0005;
    const nearZero = Math.abs(current) < 0.0005;
    vector.classList.toggle('reversed', reversed);
    vector.classList.toggle('near-zero', nearZero);
    path.setAttribute('d', reversed ? negativeD : positiveD);
    label.textContent = `${labelPrefix} = ${signed(current, 3, 'A')} · ${directionText(current, positiveText, negativeText)}`;
  }

  function renderCircuit(p) {
    els.svgE1.textContent = `${state.e1.toFixed(1)} V`;
    els.svgE2.textContent = `${state.e2.toFixed(1)} V`;
    els.svgR1.textContent = `${state.r1.toFixed(1)} Ω`;
    els.svgR2.textContent = `${state.r2.toFixed(1)} Ω`;
    els.svgR3.textContent = `${state.r3.toFixed(1)} Ω`;
    els.nodeAText.textContent = `${fmt(state.e1, 2)} V`;
    els.nodeBText.textContent = `${fmt(p.vb, 2)} V`;
    els.nodeCText.textContent = `${fmt(state.e2, 2)} V`;
    els.svgV1.textContent = `${signed(p.v1, 2, 'V')}`;
    els.svgV2.textContent = `${signed(p.v2, 2, 'V')}`;

    setArrow(els.i1Vector, els.i1Arrow, els.i1Label, p.i1, 'M205 126H490', 'M490 126H205', 'A → B', 'B → A', 'I₁');
    setArrow(els.i2Vector, els.i2Arrow, els.i2Label, p.i2, 'M895 126H610', 'M610 126H895', 'C → B', 'B → C', 'I₂');
    setArrow(els.i3Vector, els.i3Arrow, els.i3Label, p.i3, 'M593 245V475', 'M593 475V245', 'B → D', 'D → B', 'I₃');

    els.svgKclEquation.textContent = `${signed(p.i1, 3)} ${p.i2 >= 0 ? '+' : '−'} ${Math.abs(p.i2).toFixed(3)} − ${signed(p.i3, 3).replace('+','')} = ${fmt(p.kcl, 3)} A`;
    els.svgKclBalance.textContent = Math.abs(p.kcl) < 1e-8 ? 'ΣI = 0 · charge conservation at junction B' : 'check numerical balance';
    els.svgLeftEquation.textContent = `${signed(state.e1, 2)} ${signed(-p.i1 * state.r1, 2)} ${signed(-p.i3 * state.r3, 2)} = ${fmt(p.leftKvl, 2)} V`;
    els.svgRightEquation.textContent = `${signed(state.e2, 2)} ${signed(-p.i2 * state.r2, 2)} ${signed(-p.i3 * state.r3, 2)} = ${fmt(p.rightKvl, 2)} V`;
    rebuildFlows(p);
  }

  function markerMarkup(reverse) {
    return `<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>`;
  }

  function reversePathData(d) {
    return d;
  }

  function addFlow(dPositive, dNegative, current, markerCount) {
    const magnitude = Math.abs(current);
    if (magnitude < 0.0005) return;
    const reversed = current < 0;
    const guide = document.createElementNS(NS, 'path');
    guide.setAttribute('d', reversed ? dNegative : dPositive);
    guide.setAttribute('fill', 'none'); guide.setAttribute('stroke', 'none');
    els.chargeLayer.appendChild(guide);
    const markers = Array.from({ length: markerCount }, (_, i) => {
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('class', `charge-marker${reversed ? ' reverse' : ''}`);
      g.innerHTML = markerMarkup(reversed);
      els.chargeLayer.appendChild(g);
      return { el: g, offset: i / markerCount };
    });
    flows.push({ guide, markers, current: magnitude, phase: 0 });
  }

  function rebuildFlows(p) {
    els.chargeLayer.innerHTML = ''; flows = [];
    addFlow('M550 535H130V170H550', 'M550 170H130V535H550', p.i1, 14);
    addFlow('M550 535H970V170H550', 'M550 170H970V535H550', p.i2, 14);
    addFlow('M550 170V535', 'M550 535V170', p.i3, 9);
  }

  function renderControls(p) {
    els.e1Out.textContent = `${state.e1.toFixed(1)} V`; els.e2Out.textContent = `${state.e2.toFixed(1)} V`;
    els.r1Out.textContent = `${state.r1.toFixed(1)} Ω`; els.r2Out.textContent = `${state.r2.toFixed(1)} Ω`; els.r3Out.textContent = `${state.r3.toFixed(1)} Ω`;
    els.i1Mini.textContent = `I₁ = ${signed(p.i1, 3, 'A')}`; els.i2Mini.textContent = `I₂ = ${signed(p.i2, 3, 'A')}`; els.i3Mini.textContent = `I₃ = ${signed(p.i3, 3, 'A')}`;
    els.animationSpeedOut.textContent = `${state.animationSpeed.toFixed(1)}×`;
  }

  function renderMeasurements(p) {
    els.junctionVoltage.textContent = `${fmt(p.vb, 3)} V`;
    els.current1.textContent = signed(p.i1, 3, 'A'); els.current2.textContent = signed(p.i2, 3, 'A'); els.current3.textContent = signed(p.i3, 3, 'A');
    els.kclResidual.textContent = `${fmt(p.kcl, 6)} A`; els.leftResidual.textContent = `${fmt(p.leftKvl, 6)} V`; els.rightResidual.textContent = `${fmt(p.rightKvl, 6)} V`;
    els.sourcePower.textContent = `${fmt(p.sourcePower, 2)} W`; els.resistorPower.textContent = `${fmt(p.resistorPower, 2)} W`;
    els.kclAccount.textContent = `${signed(p.i1, 3)} ${p.i2 >= 0 ? '+' : '−'} ${Math.abs(p.i2).toFixed(3)} = ${signed(p.i3, 3).replace('+','')} A`;
    els.leftAccount.textContent = `${fmt(p.leftKvl, 6)} V`; els.rightAccount.textContent = `${fmt(p.rightKvl, 6)} V`;
  }

  function renderStatus(p) {
    const lawsGood = Math.abs(p.kcl) < 1e-8 && Math.abs(p.leftKvl) < 1e-8 && Math.abs(p.rightKvl) < 1e-8;
    els.headerState.textContent = lawsGood ? 'KCL + KVL satisfied' : 'Numerical balance warning';
    els.headerDetail.textContent = 'Two loops coupled through one shared branch';
    const c = lawsGood ? '#2be18f' : '#ff6b69';
    els.statusDot.style.background = c; els.statusDot.style.boxShadow = `0 0 10px ${c}`;

    if (p.i1 > 0.0005 && p.i2 > 0.0005) {
      els.effectTitle.textContent = 'Both sources are feeding the shared branch';
      els.effectText.textContent = `At B, ${fmt(p.i1,3)} A from the left and ${fmt(p.i2,3)} A from the right combine to form ${fmt(p.i3,3)} A through R₃.`;
    } else if (p.i1 < -0.0005) {
      els.effectTitle.textContent = 'The left branch current has reversed';
      els.effectText.textContent = `I₁ is negative relative to A → B, so the actual current flows B → A. Kirchhoff's laws still balance exactly; the sign tells you the real direction.`;
    } else if (p.i2 < -0.0005) {
      els.effectTitle.textContent = 'The right branch current has reversed';
      els.effectText.textContent = `I₂ is negative relative to C → B, so the actual current flows B → C. The stronger network side is now driving current back through the right source branch.`;
    } else {
      els.effectTitle.textContent = 'One branch is at the reversal boundary';
      els.effectText.textContent = 'A branch current is approximately zero because its source node and junction B are at nearly the same potential.';
    }
  }

  function setState(values, presetName = null) {
    Object.assign(state, values);
    els.e1.value = state.e1; els.e2.value = state.e2; els.r1.value = state.r1; els.r2.value = state.r2; els.r3.value = state.r3; els.animationSpeed.value = state.animationSpeed;
    els.presets.forEach(btn => btn.classList.toggle('active', btn.dataset.preset === presetName));
    update();
  }

  function update() {
    const p = physics();
    renderCircuit(p); renderControls(p); renderMeasurements(p); renderStatus(p);
  }

  const handlers = [
    [els.e1, 'e1'], [els.e2, 'e2'], [els.r1, 'r1'], [els.r2, 'r2'], [els.r3, 'r3'], [els.animationSpeed, 'animationSpeed']
  ];
  handlers.forEach(([el, key]) => el.addEventListener('input', e => {
    state[key] = Number(e.target.value);
    els.presets.forEach(btn => btn.classList.remove('active'));
    update();
  }));

  els.presets.forEach(btn => btn.addEventListener('click', () => {
    const p = btn.dataset.preset;
    if (p === 'both') setState({ e1:18, e2:12, r1:8, r2:10, r3:6, animationSpeed:state.animationSpeed }, 'both');
    if (p === 'reverse') setState({ e1:24, e2:4, r1:5, r2:7, r3:8, animationSpeed:state.animationSpeed }, 'reverse');
    if (p === 'balanced') setState({ e1:15, e2:15, r1:10, r2:10, r3:10, animationSpeed:state.animationSpeed }, 'balanced');
  }));
  els.resetButton.addEventListener('click', () => setState(defaults, 'both'));
  els.teacherMode.addEventListener('change', e => document.body.classList.toggle('teacher-active', e.target.checked));
  els.menuButton.addEventListener('click', () => els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click', e => { if (innerWidth <= 880 && els.sidebar.classList.contains('open-mobile') && !els.sidebar.contains(e.target) && e.target !== els.menuButton) els.sidebar.classList.remove('open-mobile'); });

  function animate(now) {
    const dt = Math.min(40, now - lastTime); lastTime = now;
    flows.forEach(flow => {
      flow.phase = (flow.phase + dt * (.000045 + Math.min(flow.current, 5) * .00010) * state.animationSpeed) % 1;
      const len = flow.guide.getTotalLength();
      flow.markers.forEach(m => {
        const pos = ((flow.phase + m.offset) % 1) * len;
        const pt = flow.guide.getPointAtLength(pos);
        const pt2 = flow.guide.getPointAtLength(Math.min(len, pos + 2));
        const angle = Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI;
        m.el.setAttribute('transform', `translate(${pt.x} ${pt.y}) rotate(${angle})`);
      });
    });
    requestAnimationFrame(animate);
  }

  setState(defaults, 'both');
  requestAnimationFrame(animate);
})();

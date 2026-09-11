(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const defaults = { vs:18, r1:6, r2:18, r3:18, r4:6, r5:8, animationSpeed:1 };
  const state = { ...defaults };
  let flows = [], lastTime = performance.now();

  const els = {
    sidebar:$('sidebar'), menuButton:$('menuButton'), teacherMode:$('teacherMode'), resetButton:$('resetButton'), statusDot:$('statusDot'), headerState:$('headerState'), headerDetail:$('headerDetail'),
    vs:$('vs'), r1:$('r1'), r2:$('r2'), r3:$('r3'), r4:$('r4'), r5:$('r5'), animationSpeed:$('animationSpeed'),
    vsOut:$('vsOut'), r1Out:$('r1Out'), r2Out:$('r2Out'), r3Out:$('r3Out'), r4Out:$('r4Out'), r5Out:$('r5Out'), animationSpeedOut:$('animationSpeedOut'),
    i1Mini:$('i1Mini'), i2Mini:$('i2Mini'), i3Mini:$('i3Mini'), i4Mini:$('i4Mini'), i5Mini:$('i5Mini'), presets:[...document.querySelectorAll('.preset')],
    svgVs:$('svgVs'), svgR1:$('svgR1'), svgR2:$('svgR2'), svgR3:$('svgR3'), svgR4:$('svgR4'), svgR5:$('svgR5'),
    nodeAText:$('nodeAText'), nodeBText:$('nodeBText'), nodeCText:$('nodeCText'), chargeLayer:$('chargeLayer'),
    isVector:$('isVector'), isArrow:$('isArrow'), isLabel:$('isLabel'), i1Vector:$('i1Vector'), i1Arrow:$('i1Arrow'), i1Label:$('i1Label'), i2Vector:$('i2Vector'), i2Arrow:$('i2Arrow'), i2Label:$('i2Label'), i3Vector:$('i3Vector'), i3Arrow:$('i3Arrow'), i3Label:$('i3Label'), i4Vector:$('i4Vector'), i4Arrow:$('i4Arrow'), i4Label:$('i4Label'), i5Vector:$('i5Vector'), i5Arrow:$('i5Arrow'), i5Label:$('i5Label'),
    svgKclB:$('svgKclB'), svgKclC:$('svgKclC'), svgBalanceEquation:$('svgBalanceEquation'), svgBalanceDetail:$('svgBalanceDetail'), balanceBadge:document.querySelector('.balance-badge'),
    effectTitle:$('effectTitle'), effectText:$('effectText'), bridgeVoltage:$('bridgeVoltage'), nodeBValue:$('nodeBValue'), nodeCValue:$('nodeCValue'), sourceCurrent:$('sourceCurrent'), bridgeCurrent:$('bridgeCurrent'),
    kclBResidual:$('kclBResidual'), kclCResidual:$('kclCResidual'), leftResidual:$('leftResidual'), rightResidual:$('rightResidual'), bridgeResidual:$('bridgeResidual'), sourcePower:$('sourcePower'), resistorPower:$('resistorPower'), ratioAccount:$('ratioAccount'), kclAccount:$('kclAccount'), kvlAccount:$('kvlAccount')
  };

  const fmt = (n, d=3) => (Math.abs(n) < 0.5 * 10 ** (-d) ? 0 : n).toFixed(d);
  const signed = (n, d=3, unit='') => `${n >= -0.5 * 10 ** (-d) ? '+' : '−'}${Math.abs(Math.abs(n) < 0.5 * 10 ** (-d) ? 0 : n).toFixed(d)}${unit ? ` ${unit}` : ''}`;

  function physics() {
    const {vs,r1,r2,r3,r4,r5} = state;
    const a = 1/r1 + 1/r3 + 1/r5;
    const b = -1/r5;
    const c = -1/r5;
    const d = 1/r2 + 1/r4 + 1/r5;
    const q1 = vs/r1, q2 = vs/r2;
    const det = a*d - b*c;
    const vb = (q1*d - b*q2) / det;
    const vc = (a*q2 - c*q1) / det;
    const i1 = (vs-vb)/r1;
    const i2 = (vs-vc)/r2;
    const i3 = vb/r3;
    const i4 = vc/r4;
    const i5 = (vb-vc)/r5;
    const is = i1+i2;
    const kclB = i1-i3-i5;
    const kclC = i2+i5-i4;
    const leftKvl = vs-i1*r1-i3*r3;
    const rightKvl = vs-i2*r2-i4*r4;
    const bridgeKvl = -i1*r1-i5*r5+i2*r2;
    const sourcePower = vs*is;
    const resistorPower = i1*i1*r1+i2*i2*r2+i3*i3*r3+i4*i4*r4+i5*i5*r5;
    const ratioLeft = r1/r3, ratioRight = r2/r4;
    return {vb,vc,i1,i2,i3,i4,i5,is,kclB,kclC,leftKvl,rightKvl,bridgeKvl,sourcePower,resistorPower,powerResidual:sourcePower-resistorPower,ratioLeft,ratioRight,bridgeVoltage:vb-vc};
  }

  function setVector(vector,path,label,current,positiveD,negativeD,positiveText,negativeText,prefix) {
    const reversed = current < -0.0005, nearZero = Math.abs(current) < 0.0005;
    vector.classList.toggle('reversed',reversed); vector.classList.toggle('near-zero',nearZero);
    path.setAttribute('d', reversed ? negativeD : positiveD);
    label.textContent = `${prefix} = ${signed(current,3,'A')} · ${nearZero ? '≈ 0' : reversed ? negativeText : positiveText}`;
  }

  function renderCircuit(p) {
    els.svgVs.textContent = `${state.vs.toFixed(1)} V`;
    ['r1','r2','r3','r4','r5'].forEach(k => els[`svg${k.toUpperCase()}`].textContent = `${state[k].toFixed(1)} Ω`);
    els.nodeAText.textContent = `${fmt(state.vs,2)} V`; els.nodeBText.textContent = `${fmt(p.vb,2)} V`; els.nodeCText.textContent = `${fmt(p.vc,2)} V`;
    setVector(els.isVector,els.isArrow,els.isLabel,p.is,'M105 450V200','M105 200V450','D → A','A → D','Iₛ');
    setVector(els.i1Vector,els.i1Arrow,els.i1Label,p.i1,'M507 151L368 282','M368 282L507 151','A → B','B → A','I₁');
    setVector(els.i2Vector,els.i2Arrow,els.i2Label,p.i2,'M593 151L732 282','M732 282L593 151','A → C','C → A','I₂');
    setVector(els.i3Vector,els.i3Arrow,els.i3Label,p.i3,'M368 368L507 498','M507 498L368 368','B → D','D → B','I₃');
    setVector(els.i4Vector,els.i4Arrow,els.i4Label,p.i4,'M732 368L593 498','M593 498L732 368','C → D','D → C','I₄');
    setVector(els.i5Vector,els.i5Arrow,els.i5Label,p.i5,'M390 282H710','M710 282H390','B → C','C → B','I₅');
    els.svgKclB.textContent = `I₁ − I₃ − I₅ = ${signed(p.kclB,3,'A')}`;
    els.svgKclC.textContent = `I₂ + I₅ − I₄ = ${signed(p.kclC,3,'A')}`;
    els.svgBalanceEquation.textContent = `R₁/R₃ = ${fmt(p.ratioLeft,3)} · R₂/R₄ = ${fmt(p.ratioRight,3)}`;
    const balanced = Math.abs(p.i5) < 0.0005;
    els.balanceBadge.classList.toggle('balanced',balanced);
    els.svgBalanceDetail.textContent = balanced ? `Vᴮ = Vᶜ = ${fmt(p.vb,3)} V · I₅ = 0 A` : `Vᴮ − Vᶜ = ${signed(p.bridgeVoltage,3,'V')} · bridge current ${p.i5>0?'B → C':'C → B'}`;
    rebuildFlows(p);
  }

  function markerMarkup(){ return `<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>`; }
  function addFlow(dPositive,dNegative,current,count){
    const mag=Math.abs(current); if(mag<0.0005)return;
    const reversed=current<0, guide=document.createElementNS(NS,'path'); guide.setAttribute('d',reversed?dNegative:dPositive); guide.setAttribute('fill','none'); guide.setAttribute('stroke','none'); els.chargeLayer.appendChild(guide);
    const markers=Array.from({length:count},(_,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('class',`charge-marker${reversed?' reverse':''}`);g.innerHTML=markerMarkup();els.chargeLayer.appendChild(g);return{el:g,offset:i/count};});
    flows.push({guide,markers,current:mag,phase:0});
  }
  function rebuildFlows(p){
    els.chargeLayer.innerHTML=''; flows=[];
    addFlow('M550 530H150V118H550','M550 118H150V530H550',p.is,15);
    addFlow('M550 118L330 325','M330 325L550 118',p.i1,7);
    addFlow('M550 118L770 325','M770 325L550 118',p.i2,7);
    addFlow('M330 325L550 530','M550 530L330 325',p.i3,7);
    addFlow('M770 325L550 530','M550 530L770 325',p.i4,7);
    addFlow('M330 325H770','M770 325H330',p.i5,9);
  }

  function renderControls(p){
    els.vsOut.textContent=`${state.vs.toFixed(1)} V`; ['r1','r2','r3','r4','r5'].forEach(k=>els[`${k}Out`].textContent=`${state[k].toFixed(1)} Ω`); els.animationSpeedOut.textContent=`${state.animationSpeed.toFixed(1)}×`;
    els.i1Mini.textContent=`I₁ = ${signed(p.i1,3,'A')}`; els.i2Mini.textContent=`I₂ = ${signed(p.i2,3,'A')}`; els.i3Mini.textContent=`I₃ = ${signed(p.i3,3,'A')}`; els.i4Mini.textContent=`I₄ = ${signed(p.i4,3,'A')}`; els.i5Mini.textContent=`I₅ = ${signed(p.i5,3,'A')}`;
  }

  function renderMeasurements(p){
    els.bridgeVoltage.textContent=signed(p.bridgeVoltage,3,'V'); els.nodeBValue.textContent=`${fmt(p.vb,3)} V`; els.nodeCValue.textContent=`${fmt(p.vc,3)} V`; els.sourceCurrent.textContent=`${fmt(p.is,3)} A`; els.bridgeCurrent.textContent=signed(p.i5,3,'A');
    els.kclBResidual.textContent=`${fmt(p.kclB,6)} A`; els.kclCResidual.textContent=`${fmt(p.kclC,6)} A`; els.leftResidual.textContent=`${fmt(p.leftKvl,6)} V`; els.rightResidual.textContent=`${fmt(p.rightKvl,6)} V`; els.bridgeResidual.textContent=`${fmt(p.bridgeKvl,6)} V`;
    els.sourcePower.textContent=`${fmt(p.sourcePower,2)} W`; els.resistorPower.textContent=`${fmt(p.resistorPower,2)} W`; els.ratioAccount.textContent=`${fmt(p.ratioLeft,3)} vs ${fmt(p.ratioRight,3)}`; els.kclAccount.textContent=`${fmt(p.kclB,6)} A / ${fmt(p.kclC,6)} A`; els.kvlAccount.textContent=`${fmt(Math.max(Math.abs(p.leftKvl),Math.abs(p.rightKvl),Math.abs(p.bridgeKvl)),6)} V max`;
  }

  function renderStatus(p){
    const lawsGood=Math.abs(p.kclB)<1e-8&&Math.abs(p.kclC)<1e-8&&Math.abs(p.leftKvl)<1e-8&&Math.abs(p.rightKvl)<1e-8&&Math.abs(p.bridgeKvl)<1e-8;
    const balanced=Math.abs(p.i5)<0.0005;
    els.headerState.textContent=balanced?'Balanced Wheatstone bridge':lawsGood?'Kirchhoff bridge solved':'Numerical balance warning';
    els.headerDetail.textContent=balanced?'Vᴮ = Vᶜ · no current through R₅':'KCL at B & C · KVL around independent loops';
    const c=lawsGood?'#2be18f':'#ff6b69'; els.statusDot.style.background=c; els.statusDot.style.boxShadow=`0 0 10px ${c}`;
    if(balanced){els.effectTitle.textContent='Balanced bridge — I₅ = 0';els.effectText.textContent=`The midpoint potentials are equal at ${fmt(p.vb,3)} V. R₅ is connected, but it has zero voltage across it, so no bridge current flows.`;}
    else if(p.i5>0){els.effectTitle.textContent='Bridge current flows B → C';els.effectText.textContent=`Node B is ${fmt(Math.abs(p.bridgeVoltage),3)} V above node C, so ${fmt(Math.abs(p.i5),3)} A flows through R₅ from B to C. Move toward equal resistance ratios to reach balance.`;}
    else{els.effectTitle.textContent='Bridge current has reversed C → B';els.effectText.textContent=`Node C is ${fmt(Math.abs(p.bridgeVoltage),3)} V above node B, so ${fmt(Math.abs(p.i5),3)} A flows through R₅ from C to B. The negative sign is a direction result, not an error.`;}
  }

  function setState(values,presetName=null){Object.assign(state,values);['vs','r1','r2','r3','r4','r5','animationSpeed'].forEach(k=>els[k].value=state[k]);els.presets.forEach(b=>b.classList.toggle('active',b.dataset.preset===presetName));update();}
  function update(){const p=physics();renderCircuit(p);renderControls(p);renderMeasurements(p);renderStatus(p);}

  [['vs','vs'],['r1','r1'],['r2','r2'],['r3','r3'],['r4','r4'],['r5','r5'],['animationSpeed','animationSpeed']].forEach(([id,key])=>els[id].addEventListener('input',e=>{state[key]=Number(e.target.value);els.presets.forEach(b=>b.classList.remove('active'));update();}));
  els.presets.forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;if(p==='b-to-c')setState({vs:18,r1:6,r2:18,r3:18,r4:6,r5:8,animationSpeed:state.animationSpeed},p);if(p==='balanced')setState({vs:18,r1:10,r2:15,r3:20,r4:30,r5:8,animationSpeed:state.animationSpeed},p);if(p==='c-to-b')setState({vs:18,r1:18,r2:6,r3:6,r4:18,r5:8,animationSpeed:state.animationSpeed},p);}));
  els.resetButton.addEventListener('click',()=>setState(defaults,'b-to-c')); els.teacherMode.addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked)); els.menuButton.addEventListener('click',()=>els.sidebar.classList.toggle('open-mobile')); document.addEventListener('click',e=>{if(innerWidth<=880&&els.sidebar.classList.contains('open-mobile')&&!els.sidebar.contains(e.target)&&e.target!==els.menuButton)els.sidebar.classList.remove('open-mobile');});

  function animate(now){const dt=Math.min(40,now-lastTime);lastTime=now;flows.forEach(flow=>{flow.phase=(flow.phase+dt*(.000045+Math.min(flow.current,5)*.00010)*state.animationSpeed)%1;const len=flow.guide.getTotalLength();flow.markers.forEach(m=>{const pos=((flow.phase+m.offset)%1)*len,pt=flow.guide.getPointAtLength(pos),pt2=flow.guide.getPointAtLength(Math.min(len,pos+2)),angle=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI;m.el.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${angle})`);});});requestAnimationFrame(animate);}

  setState(defaults,'b-to-c'); requestAnimationFrame(animate);
})();

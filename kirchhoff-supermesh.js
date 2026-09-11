(() => {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const defaults = { e1:18, e2:6, is:2, r1:8, r2:10, animationSpeed:1 };
  const state = { ...defaults };
  let flows = [], lastTime = performance.now();

  const els = {
    sidebar:$('sidebar'), menuButton:$('menuButton'), teacherMode:$('teacherMode'), resetButton:$('resetButton'), statusDot:$('statusDot'), headerState:$('headerState'), headerDetail:$('headerDetail'),
    e1:$('e1'), e2:$('e2'), is:$('is'), r1:$('r1'), r2:$('r2'), animationSpeed:$('animationSpeed'),
    e1Out:$('e1Out'), e2Out:$('e2Out'), isOut:$('isOut'), r1Out:$('r1Out'), r2Out:$('r2Out'), animationSpeedOut:$('animationSpeedOut'),
    j1Mini:$('j1Mini'), j2Mini:$('j2Mini'), isMini:$('isMini'), presets:[...document.querySelectorAll('.preset')],
    svgE1:$('svgE1'), svgE2:$('svgE2'), svgIs:$('svgIs'), svgR1:$('svgR1'), svgR2:$('svgR2'), svgVA:$('svgVA'), svgVB:$('svgVB'), svgVC:$('svgVC'), svgVcs:$('svgVcs'),
    batteryE1:$('batteryE1'), batteryE2:$('batteryE2'), redE1:$('redE1'), redE2:$('redE2'), e1TopSign:$('e1TopSign'), e1BottomSign:$('e1BottomSign'), e2TopSign:$('e2TopSign'), e2BottomSign:$('e2BottomSign'),
    currentSource:$('currentSource'), sourceArrow:$('sourceArrow'), mesh1Ref:$('mesh1Ref'), mesh2Ref:$('mesh2Ref'), mesh1Arrow:$('mesh1Arrow'), mesh2Arrow:$('mesh2Arrow'), mesh1Label:$('mesh1Label'), mesh2Label:$('mesh2Label'),
    i1Vector:$('i1Vector'), i1Arrow:$('i1Arrow'), i1Label:$('i1Label'), i2Vector:$('i2Vector'), i2Arrow:$('i2Arrow'), i2Label:$('i2Label'), isVector:$('isVector'), isArrow:$('isArrow'), isLabel:$('isLabel'), chargeLayer:$('chargeLayer'),
    svgConstraint:$('svgConstraint'), svgConstraintValue:$('svgConstraintValue'), svgSupermesh:$('svgSupermesh'), effectTitle:$('effectTitle'), effectText:$('effectText'),
    j1Value:$('j1Value'), j2Value:$('j2Value'), constraintValue:$('constraintValue'), vbValue:$('vbValue'), vcsValue:$('vcsValue'), constraintResidual:$('constraintResidual'), supermeshResidual:$('supermeshResidual'), currentSourcePower:$('currentSourcePower'), sourcePower:$('sourcePower'), resistorPower:$('resistorPower'), equationAccount:$('equationAccount'), constraintAccount:$('constraintAccount'), powerAccount:$('powerAccount')
  };

  const clean = (n, d=3) => Math.abs(n) < 0.5 * 10 ** (-d) ? 0 : n;
  const fmt = (n, d=3) => clean(n,d).toFixed(d);
  const signed = (n, d=3, unit='') => `${clean(n,d) >= 0 ? '+' : '−'}${Math.abs(clean(n,d)).toFixed(d)}${unit ? ` ${unit}` : ''}`;

  function physics() {
    const {e1,e2,is,r1,r2} = state;
    const denom = r1 + r2;
    const j1 = (e1 - e2 + is*r2) / denom;
    const j2 = (e1 - e2 - is*r1) / denom;
    const vbLeft = e1 - j1*r1;
    const vbRight = e2 + j2*r2;
    const vb = (vbLeft + vbRight) / 2;
    const constraintResidual = j1 - j2 - is;
    const supermeshResidual = e1 - j1*r1 - j2*r2 - e2;
    const leftDrop = j1*r1, rightDrop = j2*r2;
    const currentSourceAbsorbed = vb * is;
    const e1Delivered = e1 * j1;
    const e2Delivered = -e2 * j2;
    const currentSourceDelivered = -currentSourceAbsorbed;
    const sourcePower = e1Delivered + e2Delivered + currentSourceDelivered;
    const resistorPower = j1*j1*r1 + j2*j2*r2;
    return {j1,j2,vb,vbLeft,vbRight,leftDrop,rightDrop,constraintResidual,supermeshResidual,currentSourceAbsorbed,e1Delivered,e2Delivered,currentSourceDelivered,sourcePower,resistorPower,powerResidual:sourcePower-resistorPower};
  }

  function setBattery(index,value){
    const neg=value<0, battery=els[`batteryE${index}`], red=els[`redE${index}`], top=els[`e${index}TopSign`], bottom=els[`e${index}BottomSign`];
    battery.classList.toggle('negative-source',neg); top.textContent=neg?'−':'+'; bottom.textContent=neg?'+':'−';
    red.setAttribute('d',neg?'M-34 0H34V80H-34Z':'M-34-80H34V0H-34Z');
  }

  function setMesh(ref,path,label,current,x1,x2,index){
    const reversed=current<-.0005, nearZero=Math.abs(current)<.0005;
    ref.classList.toggle('reversed',reversed); ref.classList.toggle('near-zero',nearZero);
    path.setAttribute('d',reversed?`M${x2} 325C${x2} 255 ${x1} 255 ${x1} 325`:`M${x1} 325C${x1} 255 ${x2} 255 ${x2} 325`);
    label.textContent=`J${index===1?'₁':'₂'} = ${signed(current,3,'A')} · ${nearZero?'≈ 0':reversed?'counterclockwise':'clockwise'}`;
  }

  function setVector(vector,path,label,current,positiveD,negativeD,positiveText,negativeText,prefix){
    const reversed=current<-.0005, nearZero=Math.abs(current)<.0005;
    vector.classList.toggle('reversed',reversed); vector.classList.toggle('near-zero',nearZero);
    path.setAttribute('d',reversed?negativeD:positiveD);
    label.textContent=`${prefix} = ${signed(current,3,'A')} · ${nearZero?'≈ 0':reversed?negativeText:positiveText}`;
  }

  function renderCircuit(p){
    els.svgE1.textContent=signed(state.e1,1,'V'); els.svgE2.textContent=signed(state.e2,1,'V'); els.svgIs.textContent=`Iₛ = ${signed(state.is,2,'A')}`;
    els.svgR1.textContent=`${state.r1.toFixed(1)} Ω`; els.svgR2.textContent=`${state.r2.toFixed(1)} Ω`; els.svgVA.textContent=`${fmt(state.e1,2)} V`; els.svgVB.textContent=`${fmt(p.vb,2)} V`; els.svgVC.textContent=`${fmt(state.e2,2)} V`; els.svgVcs.textContent=`VBD = ${signed(p.vb,2,'V')}`;
    setBattery(1,state.e1); setBattery(2,state.e2);
    const sourceReversed=state.is<-.0005; els.currentSource.classList.toggle('reversed',sourceReversed); els.sourceArrow.setAttribute('d',sourceReversed?'M0 27V-27':'M0-27V27');
    setMesh(els.mesh1Ref,els.mesh1Arrow,els.mesh1Label,p.j1,260,470,1); setMesh(els.mesh2Ref,els.mesh2Arrow,els.mesh2Label,p.j2,730,940,2);
    setVector(els.i1Vector,els.i1Arrow,els.i1Label,p.j1,'M235 128H520','M520 128H235','A → B','B → A','I₁ = J₁');
    setVector(els.i2Vector,els.i2Arrow,els.i2Label,p.j2,'M680 128H965','M965 128H680','B → C','C → B','I₂ = J₂');
    setVector(els.isVector,els.isArrow,els.isLabel,state.is,'M650 245V455','M650 455V245','B → D','D → B','Iₛ');
    els.svgConstraint.textContent=`J₁ − J₂ = Iₛ · residual ${fmt(p.constraintResidual,6)} A`;
    els.svgConstraintValue.textContent=`${signed(p.j1,3)} − (${signed(p.j2,3)}) = ${signed(state.is,3,'A')}`;
    els.svgSupermesh.textContent=`${signed(state.e1,2)} − (${signed(p.leftDrop,2)}) − (${signed(p.rightDrop,2)}) − (${signed(state.e2,2)}) = ${fmt(p.supermeshResidual,6)} V`;
    rebuildFlows(p);
  }

  function markerMarkup(){return `<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>`;}
  function addFlow(dPositive,dNegative,current,count){
    const mag=Math.abs(current); if(mag<.0005)return;
    const reversed=current<0, guide=document.createElementNS(NS,'path'); guide.setAttribute('d',reversed?dNegative:dPositive); guide.setAttribute('fill','none'); guide.setAttribute('stroke','none'); els.chargeLayer.appendChild(guide);
    const markers=Array.from({length:count},(_,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('class',`charge-marker${reversed?' reverse':''}`);g.innerHTML=markerMarkup();els.chargeLayer.appendChild(g);return{el:g,offset:i/count};});
    flows.push({guide,markers,current:mag,phase:Math.random()});
  }
  function rebuildFlows(p){
    els.chargeLayer.innerHTML=''; flows=[];
    addFlow('M600 540H155V170H600','M600 170H155V540H600',p.j1,16);
    addFlow('M600 170H1045V540H600','M600 540H1045V170H600',p.j2,16);
    addFlow('M600 170V540','M600 540V170',state.is,10);
  }

  function renderControls(p){
    els.e1Out.textContent=signed(state.e1,1,'V'); els.e2Out.textContent=signed(state.e2,1,'V'); els.isOut.textContent=signed(state.is,1,'A'); els.r1Out.textContent=`${state.r1.toFixed(1)} Ω`; els.r2Out.textContent=`${state.r2.toFixed(1)} Ω`; els.animationSpeedOut.textContent=`${state.animationSpeed.toFixed(1)}×`;
    els.j1Mini.textContent=`J₁ = ${signed(p.j1,3,'A')}`; els.j2Mini.textContent=`J₂ = ${signed(p.j2,3,'A')}`; els.isMini.textContent=`${state.is>=0?'B → D':'D → B'} = ${signed(state.is,3,'A')}`;
  }

  function renderMeasurements(p){
    els.j1Value.textContent=signed(p.j1,3,'A'); els.j2Value.textContent=signed(p.j2,3,'A'); els.constraintValue.textContent=signed(p.j1-p.j2,3,'A'); els.vbValue.textContent=signed(p.vb,3,'V'); els.vcsValue.textContent=signed(p.vb,3,'V'); els.constraintResidual.textContent=`${fmt(p.constraintResidual,6)} A`; els.supermeshResidual.textContent=`${fmt(p.supermeshResidual,6)} V`; els.currentSourcePower.textContent=signed(p.currentSourceAbsorbed,2,'W'); els.sourcePower.textContent=`${fmt(p.sourcePower,2)} W`; els.resistorPower.textContent=`${fmt(p.resistorPower,2)} W`; els.equationAccount.textContent=`${fmt(p.j1*state.r1,2)} + ${fmt(p.j2*state.r2,2)} = ${fmt(state.e1-state.e2,2)} V`; els.constraintAccount.textContent=`${fmt(p.j1,3)} − (${fmt(p.j2,3)}) = ${fmt(state.is,3)} A`; els.powerAccount.textContent=`${fmt(p.powerResidual,6)} W`;
  }

  function renderStatus(p){
    const lawsGood=Math.max(Math.abs(p.constraintResidual),Math.abs(p.supermeshResidual),Math.abs(p.powerResidual),Math.abs(p.vbLeft-p.vbRight))<1e-8;
    const meshReversed=[p.j1<-.0005?'J₁':null,p.j2<-.0005?'J₂':null].filter(Boolean);
    const sourceDelivering=p.currentSourceAbsorbed<-.005, sourceAbsorbing=p.currentSourceAbsorbed>.005;
    els.headerState.textContent=lawsGood?'Supermesh + constraint solved':'Numerical balance warning'; els.headerDetail.textContent=`outer-loop KVL · ${state.is>=0?'B → D':'D → B'} current source · J₁ − J₂ = Iₛ`;
    const c=lawsGood?'#2be18f':'#ff6b69'; els.statusDot.style.background=c; els.statusDot.style.boxShadow=`0 0 10px ${c}`;
    if(meshReversed.length){els.effectTitle.textContent=`${meshReversed.join(' & ')} ${meshReversed.length>1?'have':'has'} reversed`;els.effectText.textContent=`The current source can force a mesh current opposite to its clockwise reference. Negative current is a direction result, not a failed solution. The moving charge markers follow the actual direction.`;}
    else if(sourceDelivering){els.effectTitle.textContent='The ideal current source is delivering power';els.effectText.textContent=`VBD = ${fmt(p.vb,2)} V while Iₛ = ${signed(state.is,2,'A')}. Their passive-sign product is ${signed(p.currentSourceAbsorbed,2,'W')}, so the source is supplying energy to the rest of the circuit.`;}
    else if(sourceAbsorbing){els.effectTitle.textContent='The ideal current source is absorbing power';els.effectText.textContent=`The network has established VBD = ${fmt(p.vb,2)} V. With the present current direction, current enters the source's positive-voltage terminal, so the current source absorbs ${fmt(p.currentSourceAbsorbed,2)} W.`;}
    else{els.effectTitle.textContent='The current-source branch has zero power at this operating point';els.effectText.textContent='The source still constrains J₁ − J₂, but either its current or its terminal voltage is approximately zero, so its instantaneous DC power is approximately zero.';}
  }

  function setState(values,presetName=null){
    Object.assign(state,values); ['e1','e2','is','r1','r2','animationSpeed'].forEach(k=>els[k].value=state[k]); els.presets.forEach(b=>b.classList.toggle('active',b.dataset.preset===presetName)); update();
  }
  function update(){const p=physics();renderCircuit(p);renderControls(p);renderMeasurements(p);renderStatus(p);}

  ['e1','e2','is','r1','r2','animationSpeed'].forEach(key=>els[key].addEventListener('input',e=>{state[key]=Number(e.target.value);els.presets.forEach(b=>b.classList.remove('active'));update();}));
  els.presets.forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;
    if(p==='mesh-reversal')setState({e1:18,e2:6,is:2,r1:8,r2:10,animationSpeed:state.animationSpeed},p);
    if(p==='symmetric')setState({e1:12,e2:12,is:1.5,r1:6,r2:6,animationSpeed:state.animationSpeed},p);
    if(p==='source-delivers')setState({e1:24,e2:4,is:-1,r1:8,r2:10,animationSpeed:state.animationSpeed},p);
  }));
  els.resetButton.addEventListener('click',()=>setState(defaults,'mesh-reversal'));
  els.teacherMode.addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked));
  els.menuButton.addEventListener('click',()=>els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click',e=>{if(innerWidth<=880&&els.sidebar.classList.contains('open-mobile')&&!els.sidebar.contains(e.target)&&e.target!==els.menuButton)els.sidebar.classList.remove('open-mobile');});

  function animate(now){
    const dt=Math.min(40,now-lastTime); lastTime=now;
    flows.forEach(flow=>{flow.phase=(flow.phase+dt*(.000045+Math.min(flow.current,5)*.00010)*state.animationSpeed)%1;const len=flow.guide.getTotalLength();flow.markers.forEach(m=>{const pos=((flow.phase+m.offset)%1)*len,pt=flow.guide.getPointAtLength(pos),pt2=flow.guide.getPointAtLength(Math.min(len,pos+2)),angle=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI;m.el.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${angle})`);});}); requestAnimationFrame(animate);
  }

  setState(defaults,'mesh-reversal'); requestAnimationFrame(animate);
})();

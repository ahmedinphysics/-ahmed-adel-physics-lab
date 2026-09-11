(()=>{
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const defaults={e1:18,gm:60,r1:8,r2:12,r3:10,r4:15,animationSpeed:1};
  const state={...defaults};
  let flows=[],lastTime=performance.now();
  const $=id=>document.getElementById(id);
  const ids=['sidebar','menuButton','teacherMode','resetButton','statusDot','headerState','headerDetail','chargeLayer','batteryE1','redE1','e1TopSign','e1BottomSign','dependentSource','svgE1','svgGm','svgVA','svgVB','svgVC','svgR1','svgR2','svgR3','svgR4','vxSense','i1Vector','i1Arrow','i1Label','i2Vector','i2Arrow','i2Label','i3Vector','i3Arrow','i3Label','i4Vector','i4Arrow','i4Label','idVector','idArrow','idLabel','svgKclB','svgKclC','svgConstraint','effectTitle','effectText','e1','gm','r1','r2','r3','r4','animationSpeed','e1Out','gmOut','r1Out','r2Out','r3Out','r4Out','animationSpeedOut','i1Mini','idMini','vbValue','vcValue','vxValue','idValue','i1Value','i2Value','i3Value','i4Value','kclBResidual','kclCResidual','controlResidual','dependentPower','sourcePower','resistorPower','kclBAccount','kclCAccount','controlAccount','leftKvlAccount','rightKvlAccount','powerAccount'];
  const els=Object.fromEntries(ids.map(id=>[id,$(id)]));
  els.presets=[...document.querySelectorAll('.preset')];
  const fmt=(x,d=3)=>Math.abs(x)<.5*10**(-d)?(0).toFixed(d):x.toFixed(d);
  const signed=(x,d=3,unit='')=>`${x>=0?'+':'−'}${Math.abs(Math.abs(x)<.5*10**(-d)?0:x).toFixed(d)}${unit?` ${unit}`:''}`;

  function physics(){
    const {e1,gm,r1,r2,r3,r4}=state,g=gm/1000;
    const a=1/r1+1/r2+1/r3,b=-1/r3,c=-1/r3+g,d=1/r3+1/r4;
    const det=a*d-b*c;
    const vb=(e1/r1*d)/det;
    const vc=(-c*e1/r1)/det;
    const vx=vb;
    const i1=(e1-vb)/r1;
    const i2=vb/r2;
    const i3=(vb-vc)/r3;
    const i4=vc/r4;
    const id=g*vx;
    const kclB=i1-i2-i3;
    const kclC=i3-i4-id;
    const controlResidual=id-g*vx;
    const leftKvl=e1-i1*r1-i2*r2;
    const rightKvl=i2*r2-i3*r3-i4*r4;
    const dependentAbsorbed=vc*id;
    const independentDelivered=e1*i1;
    const dependentDelivered=-dependentAbsorbed;
    const sourcePower=independentDelivered+dependentDelivered;
    const resistorPower=i1*i1*r1+i2*i2*r2+i3*i3*r3+i4*i4*r4;
    const powerResidual=sourcePower-resistorPower;
    return {g,vb,vc,vx,i1,i2,i3,i4,id,kclB,kclC,controlResidual,leftKvl,rightKvl,dependentAbsorbed,independentDelivered,dependentDelivered,sourcePower,resistorPower,powerResidual,det};
  }

  function setBattery(value){
    const neg=value<0;els.batteryE1.classList.toggle('negative-source',neg);els.e1TopSign.textContent=neg?'−':'+';els.e1BottomSign.textContent=neg?'+':'−';els.redE1.setAttribute('d',neg?'M-34 0H34V80H-34Z':'M-34-80H34V0H-34Z');
  }

  function setVector(vector,path,label,current,positiveD,negativeD,positiveText,negativeText,prefix,labelX,labelY){
    const reversed=current<-.0005,nearZero=Math.abs(current)<.0005;
    vector.classList.toggle('reversed',reversed);vector.classList.toggle('near-zero',nearZero);
    path.setAttribute('d',reversed?negativeD:positiveD);
    if(labelX!==undefined)label.setAttribute('x',labelX);if(labelY!==undefined)label.setAttribute('y',labelY);
    label.textContent=`${prefix} = ${signed(current,3,'A')} · ${nearZero?'≈ 0':reversed?negativeText:positiveText}`;
  }

  function renderCircuit(p){
    els.svgE1.textContent=signed(state.e1,1,'V');els.svgGm.textContent=`g = ${state.gm.toFixed(0)} mS`;els.svgVA.textContent=`${fmt(state.e1,2)} V`;els.svgVB.textContent=`${fmt(p.vb,2)} V`;els.svgVC.textContent=`${fmt(p.vc,2)} V`;els.svgR1.textContent=`${state.r1.toFixed(1)} Ω`;els.svgR2.textContent=`${state.r2.toFixed(1)} Ω`;els.svgR3.textContent=`${state.r3.toFixed(1)} Ω`;els.svgR4.textContent=`${state.r4.toFixed(1)} Ω`;els.vxSense.textContent=`Vₓ = Vᴮ = ${signed(p.vx,2,'V')}`;
    setBattery(state.e1);els.dependentSource.classList.toggle('reverse-control',p.id<-.0005);
    setVector(els.i1Vector,els.i1Arrow,els.i1Label,p.i1,'M210 126H405','M405 126H210','A → B','B → A','I₁',310,94);
    setVector(els.i3Vector,els.i3Arrow,els.i3Label,p.i3,'M505 126H695','M695 126H505','B → C','C → B','I₃',600,94);
    setVector(els.i2Vector,els.i2Arrow,els.i2Label,p.i2,'M420 240V505','M420 505V240','B → G','G → B','I₂',360,525);
    setVector(els.i4Vector,els.i4Arrow,els.i4Label,p.i4,'M710 240V505','M710 505V240','C → G','G → C','I₄',770,525);
    setVector(els.idVector,els.idArrow,els.idLabel,p.id,'M980 245V505','M980 505V245','C → G','G → C','Iᴅ',1030,525);
    els.svgKclB.textContent=`Node B · I₁ − I₂ − I₃ = ${fmt(p.kclB,6)} A`;
    els.svgKclC.textContent=`Node C · I₃ − I₄ − Iᴅ = ${fmt(p.kclC,6)} A`;
    els.svgConstraint.textContent=`Iᴅ = gVₓ · ${signed(p.id,3,'A')} = ${(state.gm/1000).toFixed(3)} S × ${signed(p.vx,3,'V')}`;
    rebuildFlows(p);
  }

  function markerMarkup(){return `<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>`;}
  function addFlow(dPositive,dNegative,current,count){
    const mag=Math.abs(current);if(mag<.0005)return;
    const reversed=current<0,guide=document.createElementNS(NS,'path');guide.setAttribute('d',reversed?dNegative:dPositive);guide.setAttribute('fill','none');guide.setAttribute('stroke','none');els.chargeLayer.appendChild(guide);
    const markers=Array.from({length:count},(_,i)=>{const el=document.createElementNS(NS,'g');el.setAttribute('class',`charge-marker${reversed?' reverse':''}`);el.innerHTML=markerMarkup();els.chargeLayer.appendChild(el);return{el,offset:i/count};});
    flows.push({guide,markers,current:mag,phase:Math.random()});
  }
  function rebuildFlows(p){
    els.chargeLayer.innerHTML='';flows=[];
    addFlow('M455 570H140V170H455','M455 170H140V570H455',p.i1,18);
    addFlow('M455 170V570','M455 570V170',p.i2,11);
    addFlow('M455 170H745','M745 170H455',p.i3,12);
    addFlow('M745 170V570','M745 570V170',p.i4,11);
    addFlow('M745 170H980V570H745','M745 570H980V170H745',p.id,17);
    // bottom return segments carry the algebraic sums required by KCL
    addFlow('M745 570H455','M455 570H745',p.i3,10);
  }

  function renderControls(p){
    els.e1Out.textContent=signed(state.e1,1,'V');els.gmOut.textContent=`${state.gm.toFixed(0)} mS`;els.r1Out.textContent=`${state.r1.toFixed(1)} Ω`;els.r2Out.textContent=`${state.r2.toFixed(1)} Ω`;els.r3Out.textContent=`${state.r3.toFixed(1)} Ω`;els.r4Out.textContent=`${state.r4.toFixed(1)} Ω`;els.animationSpeedOut.textContent=`${state.animationSpeed.toFixed(1)}×`;els.i1Mini.textContent=`I₁ = ${signed(p.i1,3,'A')}`;els.idMini.textContent=`Iᴅ = ${signed(p.id,3,'A')}`;
  }

  function renderMeasurements(p){
    els.vbValue.textContent=signed(p.vb,3,'V');els.vcValue.textContent=signed(p.vc,3,'V');els.vxValue.textContent=signed(p.vx,3,'V');els.idValue.textContent=signed(p.id,3,'A');els.i1Value.textContent=signed(p.i1,3,'A');els.i2Value.textContent=signed(p.i2,3,'A');els.i3Value.textContent=signed(p.i3,3,'A');els.i4Value.textContent=signed(p.i4,3,'A');els.kclBResidual.textContent=`${fmt(p.kclB,6)} A`;els.kclCResidual.textContent=`${fmt(p.kclC,6)} A`;els.controlResidual.textContent=`${fmt(p.controlResidual,6)} A`;els.dependentPower.textContent=signed(p.dependentAbsorbed,2,'W');els.sourcePower.textContent=`${fmt(p.sourcePower,2)} W`;els.resistorPower.textContent=`${fmt(p.resistorPower,2)} W`;
    els.kclBAccount.textContent=`${fmt(p.i1,3)} − ${fmt(p.i2,3)} − (${fmt(p.i3,3)}) = ${fmt(p.kclB,6)} A`;
    els.kclCAccount.textContent=`${fmt(p.i3,3)} − ${fmt(p.i4,3)} − (${fmt(p.id,3)}) = ${fmt(p.kclC,6)} A`;
    els.controlAccount.textContent=`${fmt(p.id,3)} = ${(state.gm/1000).toFixed(3)} × ${fmt(p.vx,3)} A`;
    els.leftKvlAccount.textContent=`E₁ − I₁R₁ − I₂R₂ = ${fmt(p.leftKvl,6)} V`;
    els.rightKvlAccount.textContent=`I₂R₂ − I₃R₃ − I₄R₄ = ${fmt(p.rightKvl,6)} V`;
    els.powerAccount.textContent=`${fmt(p.powerResidual,6)} W`;
  }

  function renderStatus(p){
    const worst=Math.max(Math.abs(p.kclB),Math.abs(p.kclC),Math.abs(p.controlResidual),Math.abs(p.leftKvl),Math.abs(p.rightKvl),Math.abs(p.powerResidual));
    const good=worst<1e-8,c=good?'#2be18f':'#ff6b69';els.statusDot.style.background=c;els.statusDot.style.boxShadow=`0 0 10px ${c}`;els.headerState.textContent=good?'Dependent-source equations satisfied':'Numerical balance warning';els.headerDetail.textContent=`VCCS law · Iᴅ = ${(state.gm/1000).toFixed(3)} S × Vₓ`;
    if(Math.abs(p.vc)<.005){els.effectTitle.textContent='Node C has reached 0 V while current still flows';els.effectText.textContent=`At this operating point, the dependent source pulls exactly enough current that Vᶜ ≈ 0. R₄ therefore carries almost no current, while Iᴅ ≈ I₃. This is a direct KCL result, not a disconnected branch.`;}
    else if(p.dependentAbsorbed<-.005){els.effectTitle.textContent='The dependent source is delivering power';els.effectText.textContent=`The controlled current is ${signed(p.id,3,'A')} while Vᶜ = ${signed(p.vc,3,'V')}. Their passive-sign product is ${signed(p.dependentAbsorbed,2,'W')}, so the negative value means the dependent source supplies ${fmt(-p.dependentAbsorbed,2)} W to the network.`;}
    else if(p.dependentAbsorbed>.005){els.effectTitle.textContent='The dependent source is absorbing power';els.effectText.textContent=`Iᴅ is set by gVₓ, not by Ohm's law. Here current enters the positive-voltage terminal of the controlled source, so it absorbs ${fmt(p.dependentAbsorbed,2)} W while Kirchhoff balance remains exact.`;}
    else if(Math.abs(p.id)<.0005){els.effectTitle.textContent='The control law has turned the dependent source off';els.effectText.textContent='When Vₓ = 0 or g = 0, the VCCS current is zero. The diamond source remains part of the circuit model, but it contributes no branch current at that operating point.';}
    else{els.effectTitle.textContent='One circuit variable controls another branch';els.effectText.textContent='The diamond source is dependent: its current is not an independent knob. Kirchhoff equations solve Vₓ first, then the source enforces Iᴅ = gVₓ and changes the rest of the network.';}
  }

  function setState(values,presetName=null){Object.assign(state,values);['e1','gm','r1','r2','r3','r4','animationSpeed'].forEach(k=>els[k].value=state[k]);els.presets.forEach(b=>b.classList.toggle('active',b.dataset.preset===presetName));update();}
  function update(){const p=physics();renderCircuit(p);renderControls(p);renderMeasurements(p);renderStatus(p);}

  ['e1','gm','r1','r2','r3','r4','animationSpeed'].forEach(key=>els[key].addEventListener('input',e=>{state[key]=Number(e.target.value);els.presets.forEach(b=>b.classList.remove('active'));update();}));
  els.presets.forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;
    if(p==='absorbs')setState({e1:18,gm:60,r1:8,r2:12,r3:10,r4:15,animationSpeed:state.animationSpeed},p);
    if(p==='vc-zero')setState({e1:18,gm:100,r1:8,r2:12,r3:10,r4:15,animationSpeed:state.animationSpeed},p);
    if(p==='delivers')setState({e1:18,gm:150,r1:8,r2:12,r3:10,r4:15,animationSpeed:state.animationSpeed},p);
  }));
  els.resetButton.addEventListener('click',()=>setState(defaults,'absorbs'));
  els.teacherMode.addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked));
  els.menuButton.addEventListener('click',()=>els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click',e=>{if(innerWidth<=880&&els.sidebar.classList.contains('open-mobile')&&!els.sidebar.contains(e.target)&&e.target!==els.menuButton)els.sidebar.classList.remove('open-mobile');});

  function animate(now){
    const dt=Math.min(40,now-lastTime);lastTime=now;
    flows.forEach(flow=>{flow.phase=(flow.phase+dt*(.000045+Math.min(flow.current,5)*.00010)*state.animationSpeed)%1;const len=flow.guide.getTotalLength();flow.markers.forEach(m=>{const pos=((flow.phase+m.offset)%1)*len,pt=flow.guide.getPointAtLength(pos),pt2=flow.guide.getPointAtLength(Math.min(len,pos+2)),angle=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI;m.el.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${angle})`);});});requestAnimationFrame(animate);
  }

  setState(defaults,'absorbs');requestAnimationFrame(animate);
})();

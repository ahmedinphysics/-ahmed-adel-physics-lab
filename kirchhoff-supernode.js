(()=>{
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const defaults={e1:18,e2:8,es:10,r1:8,r2:10,r3:12,r4:15,animationSpeed:1};
  const state={...defaults};
  let flows=[],lastTime=performance.now();
  const $=id=>document.getElementById(id);
  const ids=['sidebar','menuButton','teacherMode','resetButton','statusDot','headerState','headerDetail','chargeLayer','batteryE1','batteryE2','redE1','redE2','e1TopSign','e1BottomSign','e2TopSign','e2BottomSign','voltageSource','svgE1','svgE2','svgEs','svgVA','svgVB','svgVC','svgVD','svgR1','svgR2','svgR3','svgR4','i1Vector','i1Arrow','i1Label','i2Vector','i2Arrow','i2Label','i3Vector','i3Arrow','i3Label','i4Vector','i4Arrow','i4Label','isVector','isArrow','isLabel','svgSupernodeKcl','svgSupernodeBalance','svgConstraint','effectTitle','effectText','e1','e2','es','r1','r2','r3','r4','animationSpeed','e1Out','e2Out','esOut','r1Out','r2Out','r3Out','r4Out','animationSpeedOut','i1Mini','i2Mini','isMini','vbValue','vcValue','isValue','i1Value','i2Value','i3Value','i4Value','supernodeResidual','constraintResidual','floatingPower','sourcePower','resistorPower','kclAccount','constraintAccount','nodeBAccount','nodeCAccount','powerAccount'];
  const els=Object.fromEntries(ids.map(id=>[id,$(id)]));
  els.presets=[...document.querySelectorAll('.preset')];
  const fmt=(x,d=3)=>Math.abs(x)<.5*10**(-d)?(0).toFixed(d):x.toFixed(d);
  const signed=(x,d=3,unit='')=>`${x>=0?'+':'−'}${Math.abs(Math.abs(x)<.5*10**(-d)?0:x).toFixed(d)}${unit?` ${unit}`:''}`;

  function physics(){
    const {e1,e2,es,r1,r2,r3,r4}=state;
    const g=1/r1+1/r2+1/r3+1/r4;
    const vb=(e1/r1+(es+e2)/r2+es/r4)/g;
    const vc=vb-es;
    const i1=(e1-vb)/r1;
    const i2=(e2-vc)/r2;
    const i3=vb/r3;
    const i4=vc/r4;
    const is=i1-i3;
    const supernodeResidual=i1+i2-i3-i4;
    const constraintResidual=vb-vc-es;
    const nodeBResidual=i1-i3-is;
    const nodeCResidual=i2+is-i4;
    const leftKvl=e1-i1*r1-vb;
    const rightKvl=e2-i2*r2-vc;
    const floatingAbsorbed=es*is;
    const e1Delivered=e1*i1;
    const e2Delivered=e2*i2;
    const floatingDelivered=-floatingAbsorbed;
    const sourcePower=e1Delivered+e2Delivered+floatingDelivered;
    const resistorPower=i1*i1*r1+i2*i2*r2+i3*i3*r3+i4*i4*r4;
    const powerResidual=sourcePower-resistorPower;
    return {vb,vc,i1,i2,i3,i4,is,supernodeResidual,constraintResidual,nodeBResidual,nodeCResidual,leftKvl,rightKvl,floatingAbsorbed,e1Delivered,e2Delivered,floatingDelivered,sourcePower,resistorPower,powerResidual};
  }

  function setBattery(index,value){
    const neg=value<0,battery=els[`batteryE${index}`],red=els[`redE${index}`],top=els[`e${index}TopSign`],bottom=els[`e${index}BottomSign`];
    battery.classList.toggle('negative-source',neg);top.textContent=neg?'−':'+';bottom.textContent=neg?'+':'−';red.setAttribute('d',neg?'M-34 0H34V80H-34Z':'M-34-80H34V0H-34Z');
  }

  function setFloatingSource(value){
    const neg=value<0;els.voltageSource.classList.toggle('negative-source',neg);
    const left=els.voltageSource.querySelector('.source-polarity.left'),right=els.voltageSource.querySelector('.source-polarity.right');
    left.textContent=neg?'−':'+';right.textContent=neg?'+':'−';
  }

  function setVector(vector,path,label,current,positiveD,negativeD,positiveText,negativeText,prefix,labelX,labelY){
    const reversed=current<-.0005,nearZero=Math.abs(current)<.0005;
    vector.classList.toggle('reversed',reversed);vector.classList.toggle('near-zero',nearZero);
    path.setAttribute('d',reversed?negativeD:positiveD);
    if(labelX!==undefined)label.setAttribute('x',labelX);if(labelY!==undefined)label.setAttribute('y',labelY);
    label.textContent=`${prefix} = ${signed(current,3,'A')} · ${nearZero?'≈ 0':reversed?negativeText:positiveText}`;
  }

  function renderCircuit(p){
    els.svgE1.textContent=signed(state.e1,1,'V');els.svgE2.textContent=signed(state.e2,1,'V');els.svgEs.textContent=`Eₛ = ${signed(state.es,1,'V')}`;
    els.svgVA.textContent=`${fmt(state.e1,2)} V`;els.svgVB.textContent=`${fmt(p.vb,2)} V`;els.svgVC.textContent=`${fmt(p.vc,2)} V`;els.svgVD.textContent=`${fmt(state.e2,2)} V`;
    els.svgR1.textContent=`${state.r1.toFixed(1)} Ω`;els.svgR2.textContent=`${state.r2.toFixed(1)} Ω`;els.svgR3.textContent=`${state.r3.toFixed(1)} Ω`;els.svgR4.textContent=`${state.r4.toFixed(1)} Ω`;
    setBattery(1,state.e1);setBattery(2,state.e2);setFloatingSource(state.es);
    setVector(els.i1Vector,els.i1Arrow,els.i1Label,p.i1,'M195 128H405','M405 128H195','A → B','B → A','I₁',300,92);
    setVector(els.i2Vector,els.i2Arrow,els.i2Label,p.i2,'M1005 128H795','M795 128H1005','D → C','C → D','I₂',900,92);
    setVector(els.i3Vector,els.i3Arrow,els.i3Label,p.i3,'M415 245V505','M415 505V245','B → G','G → B','I₃',365,525);
    setVector(els.i4Vector,els.i4Arrow,els.i4Label,p.i4,'M785 245V505','M785 505V245','C → G','G → C','I₄',835,525);
    setVector(els.isVector,els.isArrow,els.isLabel,p.is,'M500 230H700','M700 230H500','B → C','C → B','Iₛ',600,257);
    els.svgSupernodeKcl.textContent=`I₁ + I₂ − I₃ − I₄ = ${fmt(p.supernodeResidual,6)} A`;
    els.svgSupernodeBalance.textContent=`${signed(p.i1,3)} + (${signed(p.i2,3)}) − (${signed(p.i3,3)}) − (${signed(p.i4,3)}) = ${fmt(p.supernodeResidual,6)} A`;
    els.svgConstraint.textContent=`Vᴮ − Vᶜ = Eₛ · ${signed(p.vb,3)} − (${signed(p.vc,3)}) = ${signed(state.es,3,'V')}`;
    rebuildFlows(p);
  }

  function markerMarkup(){return `<circle class="halo" r="10"/><circle class="core" r="5"/><path d="M-2-2 2 0-2 2"/>`;}
  function addFlow(dPositive,dNegative,current,count){
    const mag=Math.abs(current);if(mag<.0005)return;
    const reversed=current<0,guide=document.createElementNS(NS,'path');guide.setAttribute('d',reversed?dNegative:dPositive);guide.setAttribute('fill','none');guide.setAttribute('stroke','none');els.chargeLayer.appendChild(guide);
    const markers=Array.from({length:count},(_,i)=>{const g=document.createElementNS(NS,'g');g.setAttribute('class',`charge-marker${reversed?' reverse':''}`);g.innerHTML=markerMarkup();els.chargeLayer.appendChild(g);return{el:g,offset:i/count};});
    flows.push({guide,markers,current:mag,phase:Math.random()});
  }
  function rebuildFlows(p){
    els.chargeLayer.innerHTML='';flows=[];
    // Each solved branch gets its own physically consistent current path.
    // Positive I₁ and I₂ rise through their voltage sources and feed nodes B/C.
    addFlow('M455 570H140V170H455','M455 170H140V570H455',p.i1,18);
    addFlow('M745 570H1060V170H745','M745 170H1060V570H745',p.i2,18);
    addFlow('M455 170V570','M455 570V170',p.i3,12);
    addFlow('M745 170V570','M745 570V170',p.i4,12);
    addFlow('M455 170H745','M745 170H455',p.is,9);
    // The central ground segment carries the balancing return current.
    addFlow('M455 570H745','M745 570H455',-p.is,9);
  }

  function renderControls(p){
    els.e1Out.textContent=signed(state.e1,1,'V');els.e2Out.textContent=signed(state.e2,1,'V');els.esOut.textContent=signed(state.es,1,'V');els.r1Out.textContent=`${state.r1.toFixed(1)} Ω`;els.r2Out.textContent=`${state.r2.toFixed(1)} Ω`;els.r3Out.textContent=`${state.r3.toFixed(1)} Ω`;els.r4Out.textContent=`${state.r4.toFixed(1)} Ω`;els.animationSpeedOut.textContent=`${state.animationSpeed.toFixed(1)}×`;
    els.i1Mini.textContent=`I₁ = ${signed(p.i1,3,'A')}`;els.i2Mini.textContent=`I₂ = ${signed(p.i2,3,'A')}`;els.isMini.textContent=`Iₛ = ${signed(p.is,3,'A')}`;
  }

  function renderMeasurements(p){
    els.vbValue.textContent=signed(p.vb,3,'V');els.vcValue.textContent=signed(p.vc,3,'V');els.isValue.textContent=signed(p.is,3,'A');els.i1Value.textContent=signed(p.i1,3,'A');els.i2Value.textContent=signed(p.i2,3,'A');els.i3Value.textContent=signed(p.i3,3,'A');els.i4Value.textContent=signed(p.i4,3,'A');
    els.supernodeResidual.textContent=`${fmt(p.supernodeResidual,6)} A`;els.constraintResidual.textContent=`${fmt(p.constraintResidual,6)} V`;els.floatingPower.textContent=signed(p.floatingAbsorbed,2,'W');els.sourcePower.textContent=`${fmt(p.sourcePower,2)} W`;els.resistorPower.textContent=`${fmt(p.resistorPower,2)} W`;
    els.kclAccount.textContent=`${fmt(p.i1,3)} + ${fmt(p.i2,3)} = ${fmt(p.i3,3)} + ${fmt(p.i4,3)} A`;
    els.constraintAccount.textContent=`${fmt(p.vb,3)} − (${fmt(p.vc,3)}) = ${fmt(state.es,3)} V`;
    els.nodeBAccount.textContent=`${fmt(p.i1,3)} − ${fmt(p.i3,3)} − (${fmt(p.is,3)}) = ${fmt(p.nodeBResidual,6)} A`;
    els.nodeCAccount.textContent=`${fmt(p.i2,3)} + (${fmt(p.is,3)}) − ${fmt(p.i4,3)} = ${fmt(p.nodeCResidual,6)} A`;
    els.powerAccount.textContent=`${fmt(p.powerResidual,6)} W`;
  }

  function renderStatus(p){
    const worst=Math.max(Math.abs(p.supernodeResidual),Math.abs(p.constraintResidual),Math.abs(p.nodeBResidual),Math.abs(p.nodeCResidual),Math.abs(p.leftKvl),Math.abs(p.rightKvl),Math.abs(p.powerResidual));
    const good=worst<1e-8;const c=good?'#2be18f':'#ff6b69';els.statusDot.style.background=c;els.statusDot.style.boxShadow=`0 0 10px ${c}`;
    els.headerState.textContent=good?'Supernode equations satisfied':'Numerical balance warning';els.headerDetail.textContent=`KCL around B + C · Vᴮ − Vᶜ = ${signed(state.es,2,'V')}`;
    const reversed=[];if(p.i1<-.0005)reversed.push('I₁');if(p.i2<-.0005)reversed.push('I₂');if(p.i3<-.0005)reversed.push('I₃');if(p.i4<-.0005)reversed.push('I₄');
    if(Math.abs(p.is)<.0005&&Math.abs(state.es)>.0005){els.effectTitle.textContent='The voltage source has a finite voltage but zero current';els.effectText.textContent=`Eₛ = ${signed(state.es,2,'V')} still enforces Vᴮ − Vᶜ, yet the surrounding network already satisfies KCL at B and C without current through the source. An ideal voltage source can maintain voltage while transferring zero power.`;}
    else if(p.is<-.0005){els.effectTitle.textContent='The floating-source current has reversed';els.effectText.textContent=`Iₛ was defined positive from B → C, but the solution is ${signed(p.is,3,'A')}. The physical current therefore flows C → B. The moving markers show the solved direction, not the assumed reference.`;}
    else if(reversed.length){els.effectTitle.textContent=`${reversed.join(' & ')} ${reversed.length>1?'have':'has'} reversed`;els.effectText.textContent='A negative branch current means the surrounding sources and node voltages drive charge opposite to that branch’s chosen reference arrow. Kirchhoff’s equations remain satisfied.';}
    else if(p.floatingAbsorbed>.005){els.effectTitle.textContent='The floating voltage source is absorbing power';els.effectText.textContent=`Current enters the positive-voltage terminal of Eₛ, so P = EₛIₛ = ${signed(p.floatingAbsorbed,2,'W')}. The source is being charged or otherwise receiving energy in the ideal-circuit model.`;}
    else if(p.floatingAbsorbed<-.005){els.effectTitle.textContent='The floating voltage source is delivering power';els.effectText.textContent=`P = EₛIₛ = ${signed(p.floatingAbsorbed,2,'W')} using the passive sign convention, so the negative result means the floating source supplies ${fmt(-p.floatingAbsorbed,2)} W to the network.`;}
    else{els.effectTitle.textContent='The floating source sets node separation';els.effectText.textContent='Treat B and C as one supernode for KCL, then use Vᴮ − Vᶜ = Eₛ as the independent constraint that separates the two node voltages.';}
  }

  function setState(values,presetName=null){Object.assign(state,values);['e1','e2','es','r1','r2','r3','r4','animationSpeed'].forEach(k=>els[k].value=state[k]);els.presets.forEach(b=>b.classList.toggle('active',b.dataset.preset===presetName));update();}
  function update(){const p=physics();renderCircuit(p);renderControls(p);renderMeasurements(p);renderStatus(p);}

  ['e1','e2','es','r1','r2','r3','r4','animationSpeed'].forEach(key=>els[key].addEventListener('input',e=>{state[key]=Number(e.target.value);els.presets.forEach(b=>b.classList.remove('active'));update();}));
  els.presets.forEach(btn=>btn.addEventListener('click',()=>{const p=btn.dataset.preset;
    if(p==='source-reversal')setState({e1:18,e2:8,es:10,r1:8,r2:10,r3:12,r4:15,animationSpeed:state.animationSpeed},p);
    if(p==='zero-source-current')setState({e1:18,e2:10,es:4,r1:6,r2:5,r3:6,r4:5,animationSpeed:state.animationSpeed},p);
    if(p==='source-absorbs')setState({e1:24,e2:4,es:6,r1:8,r2:10,r3:12,r4:15,animationSpeed:state.animationSpeed},p);
  }));
  els.resetButton.addEventListener('click',()=>setState(defaults,'source-reversal'));
  els.teacherMode.addEventListener('change',e=>document.body.classList.toggle('teacher-active',e.target.checked));
  els.menuButton.addEventListener('click',()=>els.sidebar.classList.toggle('open-mobile'));
  document.addEventListener('click',e=>{if(innerWidth<=880&&els.sidebar.classList.contains('open-mobile')&&!els.sidebar.contains(e.target)&&e.target!==els.menuButton)els.sidebar.classList.remove('open-mobile');});

  function animate(now){
    const dt=Math.min(40,now-lastTime);lastTime=now;
    flows.forEach(flow=>{flow.phase=(flow.phase+dt*(.000045+Math.min(flow.current,5)*.00010)*state.animationSpeed)%1;const len=flow.guide.getTotalLength();flow.markers.forEach(m=>{const pos=((flow.phase+m.offset)%1)*len,pt=flow.guide.getPointAtLength(pos),pt2=flow.guide.getPointAtLength(Math.min(len,pos+2)),angle=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI;m.el.setAttribute('transform',`translate(${pt.x} ${pt.y}) rotate(${angle})`);});});requestAnimationFrame(animate);
  }

  setState(defaults,'source-reversal');requestAnimationFrame(animate);
})();

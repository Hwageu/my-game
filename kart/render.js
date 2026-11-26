import {DRIFT_FIRST, DRIFT_SECOND, LENGTH, ROAD, SEGMENT, TOP_SPEED, roadHeight, track} from './track.js?v=12';
import {coursePose, roadPosition} from './course.js?v=3';
import {spectators,structures} from './circuit-art.js?v=3';

const zones = {
  pit:   {land:['#5e8261','#557859'], road:['#465368','#424e63'], curb:'#e3674c'},
  hill:  {land:['#6e935d','#638858'], road:['#4c5469','#485066'], curb:'#d65c4b'},
  woods: {land:['#4f7659','#466e52'], road:['#51546a','#4d5066'], curb:'#e37456'},
};
function rect(ctx, color, x, y, w, h) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));
}
function polygon(ctx, color, points) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x,y],i) => {
    if (i === 0) ctx.moveTo(Math.round(x),Math.round(y));
    else ctx.lineTo(Math.round(x),Math.round(y));
  });
  ctx.closePath();
  ctx.fill();
}
const course=track.map(segment=>({segment,point:{...coursePose(segment.i*SEGMENT),y:segment.y}}));
const nearPlane=90;
const farPlane=6100;
const reduceMotion=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
const views=new WeakMap();
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

function viewFor(ctx,race,time) {
  const {width:w,height:h}=ctx.canvas, player=race.player;
  const elevation=roadHeight(player.distance),previous=views.get(race);
  const jumped=previous&&Math.hypot(previous.x-player.worldX,previous.z-player.worldZ)>340;
  const delta=previous?Math.max(0,time-previous.time):0;
  const ground=previous&&!jumped?previous.ground+(elevation-previous.ground)*(1-Math.exp(-delta*10)):elevation;
  const position={x:player.worldX,z:player.worldZ,y:ground};
  const blend=player.driftSide?.68:.92;
  const heading=player.motionHeading+angleDelta(player.heading,player.motionHeading)*blend;
  const smoothing=previous&&!jumped?1-Math.exp(-delta*15):1;
  const yaw=previous?previous.yaw+angleDelta(heading,previous.yaw)*smoothing:heading;
  views.set(race,{yaw,time,ground,x:position.x,z:position.z});
  const forwardX=Math.cos(yaw),forwardZ=Math.sin(yaw);
  const rightX=-forwardZ,rightZ=forwardX;
  const pace=reduceMotion?0:Math.min(1,player.speed/TOP_SPEED);
  const surge=reduceMotion?0:Math.min(1,Math.max(0,player.speed/TOP_SPEED-1)*3);
  const focal=w*(.52-.076*pace-.025*surge), horizon=h*(.36-.020*pace);
  const follow=410+58*pace+27*surge;
  const slide=Math.max(-.82,Math.min(.82,player.x))*90+player.slide*52;
  return {
    w,h,yaw,horizon,focal,forwardX,forwardZ,rightX,rightZ,
    x:position.x-forwardX*follow-rightX*slide,
    z:position.z-forwardZ*follow-rightZ*slide,
    y:position.y+(h*.82-horizon)*follow/focal,
  };
}

function local(point,view) {
  const dx=point.x-view.x,dz=point.z-view.z;
  return {x:dx*view.rightX+dz*view.rightZ,depth:dx*view.forwardX+dz*view.forwardZ,y:view.y-point.y};
}

function screen(point,view) {
  const scale=view.focal/point.depth;
  return {x:view.w/2+point.x*scale,y:view.horizon+point.y*scale,scale,width:ROAD*scale,depth:point.depth};
}

function crossSection(point,view) {
  const origin=local(point,view);
  const lateral=(point.rightX*view.rightX+point.rightZ*view.rightZ)*ROAD;
  const depth=(point.rightX*view.forwardX+point.rightZ*view.forwardZ)*ROAD;
  return lane=>({x:origin.x+lateral*lane,y:origin.y,depth:origin.depth+depth*lane});
}

function strip(ctx, color, near, far, view, left, right, nextLeft=left, nextRight=right, seal=false) {
  paintPolygon(ctx,color,[near(left),near(right),far(nextRight),far(nextLeft)],view,seal);
}

function paintPolygon(ctx,color,vertices,view,seal=false) {
  const clipped=[];
  for(let i=0;i<vertices.length;i++){
    const a=vertices[i],b=vertices[(i+1)%vertices.length];
    if(a.depth>=nearPlane) clipped.push(a);
    if((a.depth>=nearPlane)!==(b.depth>=nearPlane)){
      const t=(nearPlane-a.depth)/(b.depth-a.depth);
      clipped.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,depth:nearPlane});
    }
  }
  if(clipped.length<3) return;
  const xy=clipped.map(p=>screen(p,view));
  if(xy.every(p=>p.x<0)||xy.every(p=>p.x>view.w)||xy.every(p=>p.y>view.h)) return;
  polygon(ctx,color,xy.map(p=>[p.x,p.y]));
  if(seal) {ctx.strokeStyle=color;ctx.lineWidth=.8;ctx.stroke();}
}

function roadBand(ctx,view,entry,exit,terrain) {
  const {segment}=entry, near=crossSection(entry.point,view),far=crossSection(exit.point,view);
  const palette=zones[segment.zone], group=Math.floor(segment.i/3)%2;
  const w=segment.width, e=exit.segment.width;
  const band=(color,left,right,nextLeft=left,nextRight=right,seal=false)=>
    strip(ctx,color,near,far,view,left,right,nextLeft,nextRight,seal);
  if(terrain) {
    const land=palette.land[group];
    band(land,-1.53,-w,-1.53,-e);
    band(land,w,1.53,e,1.53);
    if(segment.pitLane) {
      band('#71838a',1.25,1.96);
      band('#dfd9ba',1.24,1.265);
      band('#c6c8b0',1.94,1.97);
      if(segment.i%4===0) band('#b0b5a6',1.60,1.65);
      band('#777f78',1.12,1.21);
    }
    if(Math.abs(segment.curve)>5.5&&!segment.pitLane) {
      const side=-Math.sign(segment.curve);
      band(group?'#a48c68':'#b59b75',(w+.12)*side,1.40*side,(e+.12)*side,1.40*side);
    }
    return;
  }
  band(palette.road[group],-w,w,-e,e,true);
  const corner=segment.chicane||segment.hairpin||Math.abs(segment.curve)>4;
  const edgeColor=corner?(group?'#efe3c9':palette.curb):'#d4d9bf';
  const edge=corner?.085:.021;
  band(edgeColor,-w-edge,-w+edge*.25,-e-edge,-e+edge*.25);
  band(edgeColor,w-edge*.25,w+edge,e-edge*.25,e+edge);
  if(!corner&&segment.i%5===1) {
    band('#a4b0ad',-w+.095,-w+.145,-e+.095,-e+.145);
    band('#a4b0ad',w-.145,w-.095,e-.145,e-.095);
  }

  if(segment.boost!==undefined) {
    const lane=segment.boost;
    band(group?'#dd853e':'#f2ac52',lane-.20,lane+.20);
    if(segment.i%2===0) band('#fbe1a0',lane-.15,lane+.15);
  }
  if(segment.i<2) for(let i=0;i<12;i++) {
    band((i+segment.i)%2?'#d6d9bc':'#303d4b',-1+i/6,-1+(i+1)/6);
  }
}

const skyline=[
  [-2.86,.20,.32],[-2.28,.29,.44],[-1.61,.25,.22],[-.83,.22,.34],
  [-.3,.25,.49],[.35,.24,.29],[.91,.30,.46],[1.61,.33,.37],[2.46,.26,.50],
];
function sky(ctx,view) {
  const {w,h,horizon,yaw,focal}=view;
  rect(ctx,'#93c9ce',0,0,w,horizon);
  rect(ctx,'#a7d7d4',0,horizon*.49,w,horizon*.51);
  rect(ctx,'#badfd4',0,horizon*.77,w,horizon*.23);
  const sun=angleDelta(-2.15,yaw);
  if(Math.abs(sun)<1.35) {
    const x=w/2+Math.tan(sun)*focal, y=horizon*.40;
    rect(ctx,'#fbe6ac',x-11,y-15,22,30);
    rect(ctx,'#fbe6ac',x-15,y-10,30,20);
  }
  skyline.forEach(([bearing,width,elevation],index)=>{
    const angle=angleDelta(bearing,yaw);
    if(Math.abs(angle)>1.39) return;
    const x=w/2+Math.tan(angle)*focal, spread=width*w;
    polygon(ctx,index%2?'#679fa9':'#7eb6b5',[[x-spread,horizon+6],[x-spread*.5,horizon*(1-elevation*.47)],[x,horizon*(1-elevation)],
      [x+spread*.40,horizon*(1-elevation*.45)],[x+spread,horizon+6]]);
    if(index%2===0) rect(ctx,'#d8e8d9',x+16,horizon*(.22+elevation*.4),w*.09,4);
  });
  rect(ctx,'#638858',0,horizon,w,h-horizon);
}

function scenery(ctx,segment,point,side) {
  const x = point.x+point.width*side, y = point.y;
  const size = Math.min(42,point.width*.19);
  if (size < 2 || y < 0 || y > ctx.canvas.height+size) return;
  const draw=(color,dx,dy,w,h)=>rect(ctx,color,x+dx*size,y+dy*size,w*size,h*size);
  if (segment.zone === 'woods') {
    draw('#625949',-.09,-.73,.16,.75);
    draw('#294e49',-.48,-.82,.96,.40);
    draw('#365e51',-.38,-1.09,.76,.37);
    draw('#527d61',-.24,-1.26,.48,.27);
    draw('#779367',-.22,-1.19,.36,.07);
  } else if (segment.zone === 'hill') {
    draw('#806b53',-.53,-.25,1.06,.26);
    draw('#c5ac6f',-.45,-.47,.87,.28);
    draw('#dfc888',-.38,-.51,.73,.08);
  } else {
    draw('#586677',-.12,-1.13,.24,1.15);
    draw('#344354',-.52,-1.4,1.04,.48);
    draw('#e1ab6f',-.47,-1.35,.94,.36);
    draw('#b66c52',-.33,-1.26,.65,.16);
  }
}
function turnSign(ctx, point, direction) {
  const size = Math.min(33,point.width*.19);
  if (size<3) return;
  const x=point.x, y=point.y-size*.75;
  rect(ctx,'#4b5152',x-size*.05,y,size*.10,size*.76);
  rect(ctx,'#333f48',x-size*.50,y-size*.48,size,size*.49);
  if(direction===2) {
    ctx.save();
    ctx.strokeStyle='#ffd48b';
    ctx.lineWidth=Math.max(1,size*.085);
    ctx.beginPath();
    ctx.moveTo(x-size*.23,y-size*.10);
    ctx.lineTo(x-size*.23,y-size*.28);
    ctx.quadraticCurveTo(x,y-size*.54,x+size*.22,y-size*.28);
    ctx.lineTo(x+size*.22,y-size*.10);
    ctx.stroke();
    polygon(ctx,'#ffd48b',[[x+size*.10,y-size*.19],[x+size*.34,y-size*.19],[x+size*.22,y-size*.04]]);
    ctx.restore();
    return;
  }
  polygon(ctx,'#ffdb90',[
    [x-size*.33*direction,y-size*.28],[x+size*.10*direction,y-size*.28],
    [x+size*.10*direction,y-size*.40],[x+size*.33*direction,y-size*.23],
    [x+size*.10*direction,y-size*.08],[x+size*.10*direction,y-size*.19],
    [x-size*.33*direction,y-size*.19],
  ]);
}
function itemBox(ctx,x,y,size,time) {
  const bob=Math.round(Math.sin(time*5)*size*.08);
  rect(ctx,'#333949',x-size*.48,y-2,size*.96,3);
  y-=size*.28+bob;
  polygon(ctx,'#47437b',[[x-size*.49,y],[x+size*.34,y],[x+size*.49,y-size*.20],[x+size*.49,y-size],[x-size*.49,y-size]]);
  rect(ctx,'#8c78c2',x-size*.49,y-size,size*.80,size*.86);
  rect(ctx,'#d9c8f6',x-size*.49,y-size,size*.80,size*.11);
  rect(ctx,'#605599',x-size*.42,y-size*.82,size*.65,size*.62);
  polygon(ctx,'#ffe7a7',[[x-size*.03,y-size*.77],[x-size*.28,y-size*.45],[x-size*.08,y-size*.45],[x-size*.17,y-size*.25],[x+size*.14,y-size*.56],[x-size*.02,y-size*.56]]);
}
function slipPad(ctx,x,y,size) {
  polygon(ctx,'#593c65',[[x-size*.63,y],[x+size*.64,y],[x+size*.41,y-size*.21],[x-size*.43,y-size*.21]]);
  rect(ctx,'#e9b8f0',x-size*.32,y-size*.19,size*.64,Math.max(1,size*.08));
}
function skidMarks(ctx,x,y,size,mark,time) {
  if(size<2) return;
  const age=time-mark.time;
  ctx.save();
  ctx.globalAlpha=.76*Math.max(0,1-age/1.4);
  ctx.strokeStyle='#222d39';
  ctx.lineWidth=Math.max(1,size*.067);
  ctx.beginPath();
  for(const side of [-1,1]) {
    const wheel=x+size*.29*side;
    ctx.moveTo(wheel,y);
    ctx.lineTo(wheel-size*.17*mark.side,y+size*.23);
  }
  ctx.stroke();
  ctx.restore();
}

const itemColors={boost:'#ffba57',shield:'#a1efe1',slip:'#deb1f2',grip:'#adf0a0',pulse:'#8bd8ff',disc:'#a1f0ed',chase:'#abf6df'};
function itemFlash(ctx,x,y,size,event,time) {
  const elapsed=time-event.time;
  if(elapsed<0||elapsed>.62||size<2) return;
  const age=elapsed/.62, color=itemColors[event.item];
  ctx.save();
  ctx.fillStyle=ctx.strokeStyle=color;
  ctx.globalAlpha=(1-age)*.95;
  ctx.lineWidth=Math.max(1,size*.058*(1-age));
  const pickup=event.type==='picked';
  if(event.item==='pulse'&&event.type==='used') {
    for(const phase of [0,.16]){
      const spread=Math.max(.1,age-phase);
      ctx.beginPath();
      ctx.ellipse(x,y-size*.06,size*(.47+spread*3.4),size*(.12+spread*.58),0,0,Math.PI*2);
      ctx.stroke();
    }
  } else if(event.item==='shield'&&!pickup) {
    ctx.beginPath();
    ctx.ellipse(x,y-size*.44,size*(.54+age),size*(.43+age*.48),0,0,Math.PI*2);
    ctx.stroke();
  } else {
    const count=pickup?7:5;
    for(let i=0;i<count;i++) {
      const angle=i*Math.PI*2/count+(pickup?.28:1.1);
      const spread=size*(.35+age*.82);
      const px=x+Math.cos(angle)*spread, py=y-size*(.35+age*.44)+Math.sin(angle)*spread*.62;
      ctx.fillRect(Math.round(px),Math.round(py),Math.max(1,size*.08),Math.max(1,size*(pickup?.08:.16)));
    }
  }
  ctx.restore();
}

function kart(ctx, x, y, size, driver, time) {
  const slip=angleDelta(driver.heading,driver.motionHeading);
  const tilt=Math.round((driver.steering*.11+slip*.51)*size);
  if(driver.driftHop>0){
    rect(ctx,'#26343a',x-size*.45,y-size*.022,size*.90,Math.max(1,size*.055));
    y-=size*.17*Math.sin(Math.PI*(1-driver.driftHop/.18));
  }
  const bounce = driver.speed>230 ? Math.floor(time*16)%2 : 0;
  const draw=(color,dx,dy,w,h,shift=0)=>rect(ctx,color,x+dx*size+shift,y+dy*size-bounce,w*size,h*size);
  if (driver.driftSide) {
    const side=driver.driftSide, phase=time*10;
    for(let i=0;i<6;i++){
      const age=(phase+i/6)%1;
      const dx=(-.35-age*.62)*side+(i%2?.20:-.20);
      const dy=-.10+age*.44;
      const puff=.10+age*.17;
      ctx.save();
      ctx.globalAlpha=(1-age)*.72;
      draw(i%2?'#e2e3c8':'#a7b6b0',dx,dy,puff*1.35,puff);
      ctx.restore();
    }
    const charge=driver.driftCharge;
    const spark=charge>=DRIFT_SECOND?'#ffc45c':charge>=DRIFT_FIRST?'#76ddff':'#e0dbc8';
    const tip=charge>=DRIFT_SECOND?'#fff4b0':'#f4fbff';
    for(let i=0;i<5;i++){
      const age=(time*14+i/5)%1;
      const dx=(-.36-age*.67)*side+(i%2?.20:-.20);
      draw(spark,dx,-.055+age*.30,.145+age*.07,.048);
      if(charge>=DRIFT_FIRST) draw(tip,dx+.02,-.079+age*.30,.069,.036);
    }
  }
  if (driver.launchBoost>0 || driver.chaseBoost>0 || driver.itemBoost>0 || driver.boost>0 || driver.turbo>0) {
    const ripple = Math.floor(time*23)%3;
    const flame=driver.launchBoost>0?'#ffdc7e':driver.chaseBoost>0?'#acf0d6':driver.itemBoost>0||driver.boost>0||driver.turboLevel===2?'#f4a449':'#6ecbff';
    draw(flame,-.26,-.03,.14,.17+ripple*.05);
    draw('#f9de9a',.12,-.03,.14,.22-ripple*.035);
  }
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(-driver.slide*.13-slip*.26);
  ctx.translate(-x,-y);
  draw('#293446',-.52,-.10,1.04,.14);
  draw('#242930',-.52,-.45,.21,.42);
  draw('#242930',.31,-.45,.21,.42);
  draw('#464b52',-.51,-.36,.15,.14);
  draw('#464b52',.36,-.36,.15,.14);
  draw(driver.shade,-.39,-.42,.78,.34);
  draw(driver.color,-.45,-.55,.90,.22);
  draw(driver.light,-.40,-.55,.8,.07);
  draw('#3d3a41',-.29,-.34,.58,.12);
  draw('#efbe70',-.30,-.39,.13,.09);
  draw('#efbe70',.17,-.39,.13,.09);
  draw('#424453',-.24,-.64,.48,.14,tilt);
  draw(driver.shade,-.21,-.82,.42,.23,tilt);
  draw(driver.color,-.18,-.94,.36,.15,tilt);
  draw(driver.light,-.14,-.97,.28,.07,tilt);
  draw('#ede2c4',-.21,-.78,.42,.075,tilt);
  draw('#28343e',-.14,-.70,.28,.09,tilt);
  if (driver.hit>.22) draw('#efc97a',.4,-.76,.16,.09);
  ctx.restore();
  if(driver.shield>0){
    ctx.save();
    ctx.strokeStyle='#a1efe1';
    ctx.lineWidth=Math.max(1,size*.047);
    ctx.beginPath();
    ctx.ellipse(x,y-size*.48,size*.63,size*.55,0,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }
  if(driver.slow>0) draw('#dfb0ea',-.45,-.06,.88,.09);
  if(driver.grip>0){
    draw('#adf0a0',-.48,-.15,.17,.09);
    draw('#adf0a0',.31,-.15,.17,.09);
  }
  const contactAge=(time-driver.contactAt)/.35;
  if(contactAge>=0&&contactAge<1){
    const xOffset=driver.contactSide*size*.48;
    ctx.save();
    ctx.globalAlpha=1-contactAge;
    for(let i=0;i<7;i++){
      const angle=(i/7)*Math.PI*2;
      const radius=size*(.10+contactAge*.76);
      const xx=x+xOffset+Math.cos(angle)*radius;
      const yy=y-size*.23+Math.sin(angle)*radius*.72;
      rect(ctx,i%2?'#f7bd62':'#fff0b0',xx,yy,Math.max(1,size*.08),Math.max(1,size*.075));
    }
    ctx.restore();
  }
  for(const effect of driver.effects) itemFlash(ctx,x,y,size,effect,time);
}

function tower(ctx,p) {
  const size=Math.min(110,p.scale*435);
  if(size<3) return;
  const {x,y}=p;
  rect(ctx,'#334e50',x-size*.20,y-size*.82,size*.40,size*.82);
  rect(ctx,'#6e8a74',x-size*.13,y-size*.76,size*.26,size*.66);
  rect(ctx,'#2f434b',x-size*.32,y-size*1.06,size*.64,size*.31);
  rect(ctx,'#f1c979',x-size*.27,y-size*1.02,size*.54,size*.10);
  for(const column of [-.18,.03]) rect(ctx,'#709a99',x+size*column,y-size*.88,size*.13,size*.09);
  rect(ctx,'#465f56',x-size*.43,y-size*.050,size*.86,size*.075);
}

function coilDisc(ctx,x,y,size,time) {
  const flash=Math.floor(time*22)%2?'#a4e8f0':'#e3f2bb';
  rect(ctx,'#293c49',x-size*.28,y-size*.07,size*.56,size*.12);
  rect(ctx,'#65a9a5',x-size*.22,y-size*.32,size*.44,size*.21);
  rect(ctx,flash,x-size*.13,y-size*.28,size*.26,size*.10);
}

function speedStreaks(ctx,view,time,player) {
  if(reduceMotion) return;
  const {w,h}=view;
  const ratio=player.speed/TOP_SPEED;
  const strength=Math.min(1,Math.max(0,(ratio-.72)/.48));
  if(strength===0) return;
  const powered=player.chaseBoost>0||player.itemBoost>0||player.turbo>0;
  const color=player.chaseBoost>0?'#c6ffe9':powered?'#ffe0aa':'#deeee3';
  ctx.save();
  ctx.strokeStyle=color;
  for(let i=0;i<6;i++){
    const side=i%2?-1:1, flow=(time*3.8+i/6)%1;
    const x=w*(.5+side*(.28+flow*.22));
    const y=h*(.53+.39*flow);
    ctx.globalAlpha=strength*flow*(powered?.48:.23);
    ctx.lineWidth=powered?2:1;
    ctx.beginPath();
    ctx.moveTo(x,y);
    ctx.lineTo(x-w*side*(.019+flow*.04),y-h*(.022+flow*.05));
    ctx.stroke();
  }
  ctx.restore();
}

export function drawRace(ctx,race,time) {
  const view=viewFor(ctx,race,time), {w,h}=view, {player,racers}=race;
  sky(ctx,view);
  const scene=[],roadLayers=[];
  const centers=course.map(({point})=>local(point,view));
  for(let i=0;i<course.length;i++) {
    const j=(i+1)%course.length, a=centers[i], b=centers[j];
    const maxDepth=Math.max(a.depth,b.depth), verge=ROAD*1.85;
    const sideLimit=Math.max(nearPlane,maxDepth)*w/(view.focal*2)+verge;
    if(maxDepth<=nearPlane-verge||Math.min(a.depth,b.depth)>=farPlane||
       (a.x<-sideLimit&&b.x<-sideLimit)||(a.x>sideLimit&&b.x>sideLimit)) continue;
    const depth=(a.depth+b.depth)/2,entry=course[i],exit=course[j];
    roadLayers.push({depth,entry,exit});
  }
  function objectAt(point,paint) {
    const at=local(point,view);
    if(at.depth<nearPlane||at.depth>farPlane) return;
    const p=screen(at,view);
    if(p.x<-p.width*2||p.x>w+p.width*2||p.y>h+p.width||p.y<-p.width) return;
    scene.push({depth:at.depth,paint:()=>paint(p)});
  }
  function moving(distance,lane,paint) {
    objectAt({...coursePose(distance,lane),y:roadHeight(distance)},p=>paint(p.x,p.y,Math.min(w*.23,p.scale*105)));
  }

  for(const {segment,point} of course) {
    if(segment.zone==='woods'&&segment.i%11===4) objectAt(roadPosition(point,-2.05),p=>scenery(ctx,segment,p,0));
    if(segment.zone==='woods'&&segment.i%13===8) objectAt(roadPosition(point,1.93),p=>scenery(ctx,segment,p,0));
    if(segment.zone==='pit'&&!segment.pitLane&&segment.i%15===5) objectAt(roadPosition(point,1.70),p=>scenery(ctx,segment,p,0));
    if(segment.sign) objectAt(roadPosition(point,-1.36*Math.sign(segment.sign)),p=>turnSign(ctx,p,segment.sign));
    if(segment.i===95||segment.i===184) objectAt(roadPosition(point,2.3),p=>tower(ctx,p));
  }
  for(const {color,points} of structures) {
    const vertices=points.map(point=>local(point,view));
    if(vertices.every(v=>v.depth<nearPlane)||vertices.every(v=>v.depth>4300)) continue;
    const depth=vertices.reduce((sum,p)=>sum+p.depth,0)/vertices.length;
    scene.push({depth,paint:()=>paintPolygon(ctx,color,vertices,view)});
  }
  for(const spectator of spectators) objectAt(spectator,p=>{
    const size=p.scale*29;
    if(size<1.1) return;
    rect(ctx,spectator.color,p.x-size*.42,p.y-size*1.22,size*.91,size*1.03);
    rect(ctx,'#e9d1a4',p.x-size*.23,p.y-size*1.61,size*.57,size*.45);
  });
  for(const driver of racers) {
    const distance=driver.finished===null||driver===player?driver.distance:driver.distance+60+driver.id*42;
    if(driver.finished===null||driver===player) {
      objectAt({x:driver.worldX,z:driver.worldZ,y:roadHeight(driver.distance)},p=>kart(ctx,p.x,p.y,Math.min(w*.23,p.scale*105),driver,time));
    } else moving(distance,driver.x,(x,y,size)=>kart(ctx,x,y,size,driver,time));
  }
  for(const mark of race.skids) objectAt(mark,p=>skidMarks(ctx,p.x,p.y,Math.min(w*.23,p.scale*105),mark,time));
  const ahead=distance=>((distance-player.distance)%LENGTH+LENGTH)%LENGTH;
  for(const box of race.boxes) {
    if(box.readyAt<=time&&ahead(box.distance)<3700) moving(box.distance,box.x,(x,y,size)=>{if(size>=2)itemBox(ctx,x,y,size*.78,time);});
  }
  for(const trap of race.traps) {
    if(trap.armedAt<=time&&ahead(trap.distance)<3100) moving(trap.distance,trap.x,(x,y,size)=>{if(size>=2)slipPad(ctx,x,y,size);});
  }
  for(const disc of race.discs) moving(disc.distance,disc.x,(x,y,size)=>{if(size>=2)coilDisc(ctx,x,y,size,time);});
  roadLayers.sort((a,b)=>b.depth-a.depth);
  ctx.save();
  for(const terrain of [true,false]) for(const {entry,exit,depth} of roadLayers) {
    ctx.globalAlpha=Math.max(.16,Math.min(1,(farPlane-depth)/3300));
    roadBand(ctx,view,entry,exit,terrain);
  }
  ctx.restore();
  scene.sort((a,b)=>b.depth-a.depth);
  for(const {paint} of scene) paint();

  speedStreaks(ctx,view,time,player);
}

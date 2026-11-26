import {DRIFT_FIRST, DRIFT_SECOND, LENGTH, ROAD, SEGMENT, TOP_SPEED, roadHeight, segmentAt} from './track.js?v=4';

const fog = '#a8ddd4';
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
function strip(ctx, color, near, far, inner, outer) {
  polygon(ctx,color,[
    [near.x+near.width*inner,near.y],[near.x+near.width*outer,near.y],
    [far.x+far.width*outer,far.y],[far.x+far.width*inner,far.y],
  ]);
}

function sky(ctx,w,h,horizon,turn) {
  rect(ctx,'#93c9ce',0,0,w,horizon);
  rect(ctx,'#a7d7d4',0,horizon*.49,w,horizon*.51);
  rect(ctx,'#badfd4',0,horizon*.77,w,horizon*.23);
  const sunX = w*.79 - turn*.55, sunY = horizon*.42;
  rect(ctx,'#fbe6ac',sunX-10,sunY-15,20,30);
  rect(ctx,'#fbe6ac',sunX-14,sunY-10,28,20);
  for (const [x,y,size] of [[.12,.34,36],[.43,.56,42],[.93,.25,21]]) {
    rect(ctx,'#d8e8d9',w*x+turn*.62,y*horizon,size,5);
    rect(ctx,'#d8e8d9',w*x+turn*.62+8,y*horizon-4,size*.58,4);
  }
  for (let i=-1;i<4;i++) {
    const x = i*w*.49 + turn;
    polygon(ctx,'#7eb6b5',[[x-25,horizon+3],[x+w*.12,horizon*.77],[x+w*.23,horizon*.59],[x+w*.31,horizon*.76],[x+w*.53,horizon+3]]);
    polygon(ctx,'#679fa9',[[x+4,horizon+3],[x+w*.14,horizon*.87],[x+w*.21,horizon*.71],[x+w*.33,horizon*.88],[x+w*.46,horizon+3]]);
  }
  rect(ctx,'#638858',0,horizon,w,h-horizon);
}

function roadBand(ctx,w,near,far,segment) {
  if (Math.round(near.y) <= Math.round(far.y) || far.y >= ctx.canvas.height) return;
  const palette = zones[segment.zone];
  const group = Math.floor(segment.i/3) % 2;
  rect(ctx,palette.land[group],0,far.y,w,near.y-far.y+1);
  if (segment.zone === 'pit') strip(ctx,group?'#667b7a':'#718482',near,far,-1.46,-1.10);
  if (Math.abs(segment.curve)>5.5) {
    const outside=-Math.sign(segment.curve);
    strip(ctx,group?'#bb9e70':'#cdb082',near,far,1.10*outside,1.82*outside);
  }
  strip(ctx,group?'#f1d8aa':palette.curb,near,far,-1.10,-1);
  strip(ctx,group?'#f1d8aa':palette.curb,near,far,1,1.10);
  strip(ctx,palette.road[group],near,far,-1,1);
  strip(ctx,'#aba9a3',near,far,-.98,-.953);
  strip(ctx,'#aba9a3',near,far,.953,.98);
  if (segment.i%8<3) strip(ctx,'#b9b0a2',near,far,-.012,.012);
  if (segment.boost !== undefined) {
    const lane = segment.boost;
    strip(ctx,group?'#dd853e':'#f2ac52',near,far,lane-.205,lane+.205);
    if (segment.i%2===0) strip(ctx,'#fbe1a0',near,far,lane-.15,lane+.15);
  }
  if (segment.i<2) {
    for (let n=0;n<12;n++) {
      strip(ctx,(n+segment.i)%2?'#d6d9bc':'#303d4b',near,far,-1+n/6,-1+(n+1)/6);
    }
  }
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
  const x=point.x-point.width*1.32*direction, y=point.y-size*.75;
  rect(ctx,'#4b5152',x-size*.05,y,size*.10,size*.76);
  rect(ctx,'#333f48',x-size*.50,y-size*.48,size,size*.49);
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
function kart(ctx, x, y, size, driver, time) {
  const tilt = Math.round((driver.steering*.14+driver.driftSide*.095)*size);
  const bounce = driver.speed>230 ? Math.floor(time*16)%2 : 0;
  const draw=(color,dx,dy,w,h,shift=0)=>rect(ctx,color,x+dx*size+shift,y+dy*size-bounce,w*size,h*size);
  if (driver.driftSide) {
    const side=driver.driftSide, pulse=Math.floor(time*24)%4;
    draw('#c2c4ad',(-.58-pulse*.026)*side,-.14+pulse*.024,.20,.08);
    draw('#9da99d',(-.70-pulse*.030)*side,-.03+pulse*.032,.14,.059);
    if (driver.driftCharge>=DRIFT_FIRST) {
      const sparks=driver.driftCharge>=DRIFT_SECOND?'#ffd078':'#9be8ff';
      draw(sparks,-.49,-.11,.105,.07);
      draw(sparks,.41,-.11,.102,.08);
      draw(sparks,(-.60-pulse*.044)*side,.05+pulse*.03,.066,.05);
    }
  }
  if (driver.itemBoost>0 || driver.boost>0 || driver.turbo>0) {
    const ripple = Math.floor(time*23)%3;
    const flame=driver.itemBoost>0||driver.boost>0||driver.turboLevel===2?'#f4a449':'#6ecbff';
    draw(flame,-.26,-.03,.14,.17+ripple*.05);
    draw('#f9de9a',.12,-.03,.14,.22-ripple*.035);
  }
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
}

export function drawRace(ctx,race,time) {
  const {width:w,height:h}=ctx.canvas;
  const {player,racers}=race;
  const horizon = h*.35;
  const scale = w*.39;
  const follow = 456 + Math.min(1,Math.max(0,player.speed/TOP_SPEED-1)*4)*32;
  const eye = (h*.83-horizon)*follow/scale;
  const cameraZ = player.distance-follow;
  const cameraY = roadHeight(player.distance) + eye;
  const base = Math.floor(cameraZ/SEGMENT)*SEGMENT;
  const progress = (player.distance-base)/SEGMENT;
  const points = [];
  let center=0, angle=0;
  for (let i=0;i<=100;i++) {
    const segment = segmentAt(base+i*SEGMENT);
    points.push({segment, center, depth:base+i*SEGMENT-cameraZ});
    center += angle;
    angle += segment.curve * 1.22;
  }
  const ahead = Math.floor(progress);
  const centerAtPlayer = points[ahead].center+(points[ahead+1].center-points[ahead].center)*(progress-ahead);
  const cameraX = centerAtPlayer + player.x*ROAD*.74;
  for (const point of points) {
    const depth = Math.max(20,point.depth);
    point.scale=scale/depth;
    point.x=w/2+(point.center-cameraX)*point.scale;
    point.y=horizon+(cameraY-point.segment.y)*point.scale;
    point.width=ROAD*point.scale;
  }

  sky(ctx,w,h,horizon,-player.x*13-segmentAt(player.distance+650).curve*1.5);
  const buckets = new Map();
  function place(object,distance) {
    const depth=((distance-cameraZ)%LENGTH+LENGTH)%LENGTH;
    if(depth<55||depth>=99*SEGMENT) return;
    const i=Math.floor((depth+cameraZ-base)/SEGMENT);
    const list=buckets.get(i)||[];
    list.push({...object,depth});
    buckets.set(i,list);
  }
  for (const driver of racers) {
    const distance=driver.finished===null||driver===player?driver.distance:driver.distance+60+driver.id*42;
    place({kind:'kart',x:driver.x,driver},distance);
  }
  for(const box of race.boxes) {
    if(box.readyAt<=time) place({kind:'box',x:box.x},box.distance);
  }
  for(const trap of race.traps) {
    if(trap.armedAt<=time) place({kind:'trap',x:trap.x},trap.distance);
  }

  for (let i=points.length-2;i>=0;i--) {
    const near = points[i],far = points[i+1],segment=near.segment;
    roadBand(ctx,w,near,far,segment);
    if (near.depth > 90 && segment.i%7===3) scenery(ctx,segment,near,segment.zone==='woods'?-1.57:1.50);
    if (near.depth>90 && segment.i%13===7) scenery(ctx,segment,near,-1.65);
    if (near.depth>90 && segment.sign) turnSign(ctx,near,segment.sign);
    if (near.depth>390 && segment.i===1) {
      const height=near.width*.47;
      rect(ctx,'#364755',near.x-near.width*1.12,near.y-height,near.width*.065,height);
      rect(ctx,'#364755',near.x+near.width*1.055,near.y-height,near.width*.065,height);
      rect(ctx,'#45586a',near.x-near.width*1.12,near.y-height,near.width*2.24,height*.29);
      for(let n=0;n<12;n++) rect(ctx,n%2?fog:'#a6524b',near.x-near.width*1.05+near.width*.175*n,near.y-height*.95,near.width*.15,height*.16);
    }
    const list=buckets.get(i);
    if (!list) continue;
    for (const {kind,x,driver,depth} of list.sort((a,b)=>b.depth-a.depth)) {
      const amount=(depth-near.depth)/SEGMENT;
      const relativeX=near.center+(far.center-near.center)*amount-cameraX;
      const ground=near.segment.y+(far.segment.y-near.segment.y)*amount;
      const s=scale/depth;
      const screenX=w/2+(relativeX+x*ROAD)*s;
      const screenY=horizon+(cameraY-ground)*s;
      const size=Math.min(w*.22,s*105);
      if(kind==='kart') kart(ctx,screenX,screenY,size,driver,time);
      if(kind==='box'&&size>=2) itemBox(ctx,screenX,screenY,size*.78,time);
      if(kind==='trap'&&size>=2) slipPad(ctx,screenX,screenY,size);
    }
  }
  if(player.speed>TOP_SPEED*1.04){
    const flicker = Math.floor(time*30)%4;
    const color=player.itemBoost>0||player.boost>0||player.turboLevel===2?'#f5d49b':'#a7dcf2';
    polygon(ctx,color,[[w*.13,h*.77+flicker*4],[w*.15,h*.74+flicker*4],[w*.17,h*.715+flicker*4]]);
    polygon(ctx,color,[[w*.90,h*.73+flicker*4],[w*.875,h*.695+flicker*4],[w*.86,h*.69+flicker*4]]);
    rect(ctx,color,w*.07,h*.88+flicker*3,2,7);
  }
}

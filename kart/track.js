import {LENGTH, ROAD, SEGMENT, coursePose, distanceFor, keepInField, projectOnCourse, rawProgress, turnAt} from './course.js?v=3';
export {LENGTH,ROAD,SEGMENT};
export const LAPS = 3;
export const TOP_SPEED = 1450;
export const COUNTDOWN = 3;
export const DRIFT_FIRST = .48;
export const DRIFT_SECOND = 1.25;
const brakeDeceleration=1340;
const driftSteeringBias=.33;
const driftSteeringInput=1-driftSteeringBias;
const driftSlip=ratio=>.085+Math.min(1,ratio)*.10;

export const ITEMS = {
  boost: '터보 캔',
  shield: '범퍼 실드',
  slip: '슬립 패드',
  grip: '그립 타이어',
  pulse: '펄스 링',
  disc: '코일 디스크',
  chase: '추격 부스터',
};
export const ITEM_HINTS = {
  boost:'직선에서 짧게 가속',
  shield:'충돌·공격 한 번 방어',
  slip:'뒤차 길에 함정 설치',
  grip:'코너·잔디에서 접지력 증가',
  pulse:'가까운 카트를 밀어내며 감속',
  disc:'앞 카트를 추적해 감속',
  chase:'직선에서 길게 가속',
};
export const ITEM_CAPACITY = 2;
const discSpeed=2210;
export const HAIRPIN_START = distanceFor(82);
export const HAIRPIN_END = distanceFor(117);
const CHICANE_FIRST=169, CHICANE_LAST=197;
const itemTypes = Object.keys(ITEMS);
const boxRows = [21,73,156,233];
const boxLanes = [-.75,-.45,-.15,.15,.45,.75];
const boxRespawn = 4;

// The road, collision width, minimap, and camera all use the same surveyed distance.
const zonesAt=[
  [0,'pit',0],[35,'hill',2],[64,'hill',-20],[82,'woods',19],
  [117,'woods',19],[135,'hill',-1],[162,'hill',-23],
  [197,'hill',-14],[223,'woods',17],[260,'hill',15],[290,'pit',2],[311,'pit',0],
];
const boosts=[{segment:indexFor(163),lane:-.44},{segment:indexFor(263),lane:.49}];
const signs=new Map([[29,1],[74,2],[125,-1],[160,-1],[213,1]].map(([raw,sign])=>[indexFor(raw),sign]));
function indexFor(raw) {return Math.floor(distanceFor(raw)/SEGMENT);}
const limit=(value,low,high)=>Math.max(low,Math.min(high,value));
const mod=(value,size)=>(value%size+size)%size;
const smooth=value=>value*value*(3-2*value);
const gradeEase=value=>value**3*(value*(value*6-15)+10);
function narrow(raw,start,end,ramp) {
  return smooth(limit(Math.min((raw-start)/ramp,(end-raw)/ramp),0,1));
}

export const track=Array.from({length:LENGTH/SEGMENT},(_,i)=>{
  const distance=i*SEGMENT,raw=rawProgress(distance);
  const zoneIndex=zonesAt.findIndex(([end])=>end>raw)-1;
  const [from,zone,y]=zonesAt[zoneIndex], [to,,nextY]=zonesAt[zoneIndex+1];
  const hairpin=raw>=82&&raw<117,chicane=raw>=CHICANE_FIRST&&raw<CHICANE_LAST;
  const width=1-.15*narrow(raw,82,117,9)-.23*narrow(raw,CHICANE_FIRST,CHICANE_LAST,7);
  return {i,zone,hairpin,chicane,width,pitLane:raw>=298||raw<25,curve:limit(turnAt(distance),-16,16),
    y:y+(nextY-y)*gradeEase((distance-distanceFor(from))/(distanceFor(to)-distanceFor(from))),
    boost:boosts.find(pad=>i>=pad.segment&&i<pad.segment+3)?.lane,sign:signs.get(i)};
});

export function approachingHairpin(distance) {
  const lapDistance=mod(distance,LENGTH);
  return lapDistance>=HAIRPIN_START-1850&&lapDistance<HAIRPIN_END;
}

export function segmentAt(distance) {
  return track[mod(Math.floor(distance / SEGMENT), track.length)];
}

export function roadHeight(distance) {
  const here = segmentAt(distance), next = track[(here.i + 1) % track.length];
  return here.y + (next.y - here.y) * (mod(distance, SEGMENT) / SEGMENT);
}

const drivers = [
  ['YOU', '#e95435', '#ffb149', '#963838'],
  ['MIKA', '#68b66f', '#bfdf82', '#2d6754'],
  ['RIO', '#449ad4', '#9cdcf0', '#245d9c'],
  ['SOL', '#e6b534', '#ffe488', '#a36736'],
  ['NAMI', '#b677ca', '#f0b5e4', '#673f8d'],
  ['MOSS', '#ee8965', '#ffd1a0', '#a05564'],
];
const styles = [
  { brake:.007, line:.095, apex:.078, passing:1.01, drift:5.3 },
  { brake:.006, line:-.035, apex:.082, passing:1.13, drift:5.0 },
  { brake:.009, line:.039, apex:.076, passing:.85, drift:5.8 },
  { brake:.008, line:.095, apex:.075, passing:1.26, drift:5.2 },
  { brake:.008, line:.065, apex:.079, passing:.98, drift:5.6 },
];
const grid = [[-.45,-320],[.45,-70],[-.45,-70],[-.45,-195],[.45,-195],[.45,-320]];

export function createRace(random=Math.random) {
  const racers = drivers.map(([name, color, light, shade], id) => ({
    id, name, color, light, shade, x: grid[id][0], distance: grid[id][1],
    speed:0, steering:0, launchBoost:0, boost:0, turbo:0, turboLevel:0, driftSide:0, driftCharge:0,
    hit:0, lane:grid[id][0], finished:null,
    items:[], lastBox:null, effects:[], itemBoost:0, chaseBoost:0, shield:0, slow:0, grip:0,
    slide:0, driftHop:0, nextSkid:0, contactAt:-Infinity, contactSide:0,
  }));
  for(const racer of racers){
    placeKart(racer,racer.distance,racer.x);
    racer.safe={distance:racer.distance,lane:racer.x};
  }
  const boxes=boxRows.flatMap(segment=>boxLanes.map(x=>({x,distance:distanceFor(segment+.5),readyAt:0})));
  return {time:0,racers,player:racers[0],lastLap:1,finishPlace:null,random,boxes,traps:[],discs:[],skids:[],itemEvent:null,contact:null};
}

export function lapAt(distance) {
  return Math.min(LAPS, Math.floor(Math.max(0, distance) / LENGTH) + 1);
}

export function order(racers) {
  return [...racers].sort((a,b) =>
    (a.finished ?? Infinity) - (b.finished ?? Infinity) || b.distance - a.distance || a.id - b.id
  );
}

const angleBetween=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const launchMin=.12, launchMax=1;

export function applyStartBoost(racer,secondsHeld) {
  if(secondsHeld<launchMin||secondsHeld>launchMax||!Number.isFinite(secondsHeld)) return false;
  racer.launchBoost=.88;
  racer.speed=Math.max(racer.speed,625);
  return true;
}

export function launchRace(race,heldFor) {
  const timings=[.71,.25,.48,.87,.94];
  race.racers.slice(1).forEach((racer,i)=>applyStartBoost(racer,timings[i]));
  return applyStartBoost(race.player,heldFor);
}

export function placeKart(racer,distance,lane) {
  const point=coursePose(distance,lane);
  Object.assign(racer,{distance,x:lane,worldX:point.x,worldZ:point.z,heading:point.angle,motionHeading:point.angle});
}

export function recoverKart(race) {
  const racer=race.player, stored=racer.safe;
  const lanes=[limit(stored.lane,-.42,.42),0,-.47,.47];
  // Try the last safe part of the course first, leaving room for traffic.
  let found=false;
  for(let step=1;step<=7;step++){
    const distance=stored.distance-step*SEGMENT;
    const lane=lanes.find(lane=>{
      const point=coursePose(distance,lane);
      return !race.racers.some(other=>other!==racer&&other.finished===null&&
        Math.hypot(point.x-other.worldX,point.z-other.worldZ)<116);
    });
    if(lane===undefined) continue;
    placeKart(racer,distance,lane);
    found=true;
    break;
  }
  if(!found) placeKart(racer,stored.distance-8*SEGMENT,0);
  racer.speed=0;
  racer.steering=0;
  racer.slide=0;
  racer.hit=.58;
  racer.launchBoost=0;
  racer.itemBoost=0;
  racer.chaseBoost=0;
  racer.turbo=0;
  racer.boost=0;
  cancelDrift(racer);
  race.lastLap=lapAt(racer.distance);
}

function moveKart(racer,dt) {
  const forwardX=Math.cos(racer.motionHeading),forwardZ=Math.sin(racer.motionHeading);
  const travel=racer.speed*dt;
  const next=keepInField({x:racer.worldX+forwardX*travel,z:racer.worldZ+forwardZ*travel});
  const dx=next.x-racer.worldX,dz=next.z-racer.worldZ;
  const center=coursePose(racer.distance);
  const along=dx*center.rightZ-dz*center.rightX;
  const cross=projectOnCourse(next.x,next.z,racer.distance);
  const cap=Math.max(0,Math.hypot(dx,dz)*1.75);
  const advance=limit(cross-racer.distance,Math.min(0,along*2.10),Math.max(0,along*2.10));
  racer.distance+=limit(advance,-cap,cap);
  racer.worldX=next.x;
  racer.worldZ=next.z;
  const foot=coursePose(racer.distance);
  racer.x=((next.x-foot.x)*foot.rightX+(next.z-foot.z)*foot.rightZ)/ROAD;
  const here=segmentAt(racer.distance);
  if(Math.abs(racer.x)<here.width-.24&&along>0&&Math.abs(angleBetween(racer.heading,foot.angle))<.68) {
    racer.safe={distance:racer.distance,lane:racer.x};
  }
}

function raceGap(from, to) {
  return mod(to - from + LENGTH / 2, LENGTH) - LENGTH / 2;
}

function itemEvent(race,racer,type,item,details={}) {
  const event={type,item,...details,time:race.time,until:race.time+1.85};
  if(racer.effects.length===4) racer.effects.shift();
  racer.effects.push(event);
  if(racer===race.player) race.itemEvent=event;
}

function nearby(race,racer) {
  return race.racers.filter(other=>other!==racer&&other.finished===null&&
    Math.hypot(raceGap(racer.distance,other.distance)/310,(racer.x-other.x)/.92)<=1);
}

// The same position-based draw applies to every racer.
const itemWeights=[
  [1,3,4,2,1,2,0],
  [2,2,2,2,2,4,1],
  [3,1,1,2,1,4,5],
];
function rollItem(race,racer) {
  const place=order(race.racers).indexOf(racer);
  const weights=itemWeights[Math.floor(place/2)];
  let roll=race.random()*weights.reduce((sum,weight)=>sum+weight,0);
  for(const [index,weight] of weights.entries()) {
    roll-=weight;
    if(roll<0) return itemTypes[index];
  }
  return itemTypes.at(-1);
}

function frontTarget(race,distance,x,owner,range) {
  let target=null,closest=range;
  for(const other of race.racers) {
    if(other.id===owner||other.finished!==null||Math.abs(other.x-x)>.92) continue;
    const gap=raceGap(distance,other.distance);
    if(gap>0&&gap<closest) {closest=gap;target=other;}
  }
  return target;
}

export function incomingDisc(race,racer) {
  return race.discs.some(disc=>{
    const gap=raceGap(disc.distance,racer.distance);
    const closing=discSpeed-racer.speed;
    return disc.owner!==racer.id&&gap>0&&gap<closing*1.05&&
      frontTarget(race,disc.distance,disc.x,disc.owner,1200)===racer;
  });
}

function stepDiscs(race,dt,moves) {
  const travel=discSpeed*dt;
  race.discs=race.discs.filter(disc=>{
    if(disc.expiresAt<=race.time) return false;
    const target=frontTarget(race,disc.distance,disc.x,disc.owner,1200);
    const previousX=disc.x;
    if(target) disc.x+=limit(target.x-disc.x,-.74*dt,.74*dt);
    let hit=null, first=Infinity;
    for(const {racer,from,to,startX} of moves) {
      if(racer.id===disc.owner) continue;
      const gap=raceGap(disc.distance,from);
      const closing=travel-(to-from);
      if(closing<=0||gap<-18||gap-closing>18) continue;
      const t=limit(gap/closing,0,1);
      const x=previousX+(disc.x-previousX)*t, otherX=startX+(racer.x-startX)*t;
      if(t<first&&Math.abs(x-otherX)<.24){first=t;hit=racer;}
    }
    if(hit) {
      const owner=race.racers[disc.owner];
      if(!preventHit(race,hit,owner)) {
        slowKart(race,hit,'disc',owner);
        if(owner===race.player) itemEvent(race,owner,'landed','disc',{target:hit.name});
      }
      return false;
    }
    disc.distance+=travel;
    return true;
  });
}

function slowKart(race,racer,item,source) {
  const [factor,seconds]=item==='pulse'?[.83,.72]:item==='disc'?[.71,1.13]:[.78,1];
  racer.speed*=factor;
  racer.slow=Math.max(racer.slow,seconds);
  cancelDrift(racer);
  itemEvent(race,racer,'slipped',item,{source:source.name});
}

function useItem(race,racer) {
  const item=racer.items.shift()?.type;
  if(!item) return;
  if(item==='boost'||item==='chase') {
    const chase=item==='chase';
    if(chase) racer.chaseBoost=1.85;
    else racer.itemBoost=1.10;
    racer.speed=Math.max(racer.speed,Math.min(boostedSpeed(racer),racer.speed+(chase?410:310)));
  }
  if(item==='disc') race.discs.push({owner:racer.id,x:racer.x,distance:racer.distance+94,expiresAt:race.time+2.35});
  if(item==='shield') racer.shield=4.5;
  if(item==='grip') racer.grip=2.4;
  if(item==='slip') race.traps.push({owner:racer.id,x:racer.x,distance:racer.distance-78,armedAt:race.time+.22,expiresAt:race.time+16});
  let affected=0;
  if(item==='pulse') for(const other of nearby(race,racer)) {
    if(preventHit(race,other,racer))continue;
    other.heading+=limit((other.x-racer.x)*.20,-.13,.13);
    slowKart(race,other,'pulse',racer);
    affected++;
  }
  itemEvent(race,racer,'used',item,{affected});
}

function aiItem(race,racer,curve,traffic) {
  const held=racer.items[0];
  if(!held||race.time-held.time<.45) return false;
  const longHold=race.time-held.time>(racer.items.length===ITEM_CAPACITY?3.4:5);
  if(held.type==='boost') return Math.abs(racer.x)<.82&&racer.speed>550&&
    (longHold||(!racer.boost&&!racer.turbo&&curve<5));
  if(held.type==='chase') return racer.speed>450&&(longHold||curve<6);
  if(held.type==='disc') return longHold||frontTarget(race,racer.distance,racer.x,racer.id,1150)!==null;
  if(held.type==='shield') return longHold||incomingDisc(race,racer)||traffic.some(({gap})=>Math.abs(gap)<155);
  if(held.type==='grip') return longHold||curve>7.5||Math.abs(racer.x)>.92;
  if(held.type==='pulse') return longHold||nearby(race,racer).length>0;
  return longHold||race.racers.some(other=>{
    const gap=raceGap(other.distance,racer.distance);
    return other!==racer&&other.finished===null&&gap>95&&gap<900&&Math.abs(other.x-racer.x)<.33;
  });
}

function preventHit(race,racer,source) {
  if(racer.shield<=0) return false;
  racer.shield=0;
  itemEvent(race,racer,'blocked','shield',{source:source?.name});
  return true;
}

// Resolve everyone in crossing order within the fixed timestep.
function resolveItems(race,moves) {
  const arrivals=[];
  for(const {racer,from,to,startX} of moves) {
    if(to<=from) continue;
    const check=(object,kind,radius)=>{
      const gap=mod(object.distance-from,LENGTH);
      if(gap>to-from) return;
      const fraction=gap/(to-from);
      const x=startX+(racer.x-startX)*fraction;
      const offset=Math.abs(x-object.x);
      if(offset<=radius) arrivals.push({racer,object,kind,fraction,offset,crossing:Math.round(from+gap)});
    };
    if(racer.items.length<ITEM_CAPACITY) for(const box of race.boxes) {
      if(box.readyAt<=race.time) check(box,'box',.18);
    }
    for(const trap of race.traps) {
      if(trap.owner!==racer.id&&trap.armedAt<=race.time) check(trap,'trap',.23);
    }
  }
  arrivals.sort((a,b)=>a.fraction-b.fraction||a.offset-b.offset||a.racer.id-b.racer.id);
  for(const {racer,object,kind,crossing} of arrivals) {
    if(kind==='box') {
      if(racer.items.length>=ITEM_CAPACITY||racer.lastBox===crossing||object.readyAt>race.time) continue;
      object.readyAt=race.time+boxRespawn;
      const item=rollItem(race,racer);
      racer.lastBox=crossing;
      racer.items.push({type:item,time:race.time});
      itemEvent(race,racer,'picked',item);
    } else if(object.expiresAt>race.time) {
      object.expiresAt=race.time;
      const owner=race.racers[object.owner];
      if(preventHit(race,racer,owner)) continue;
      slowKart(race,racer,'slip',owner);
      if(owner===race.player) itemEvent(race,owner,'landed','slip',{target:racer.name});
    }
  }
}

function planAI(racer,race) {
  const {racers,boxes,traps,time}=race;
  const style=styles[racer.id-1];
  const here=segmentAt(racer.distance);
  const atEntry=segmentAt(racer.distance+360);
  const setup=Math.abs(here.curve)>1.6?here.curve*style.apex:-atEntry.curve*.026;
  const edge=here.width-.14;
  const line=limit(setup+style.line,-edge,edge);
  let lane=line;
  let best=-Infinity;
  const ceiling=boostedSpeed(racer);
  let target=ceiling, curve=Math.abs(here.curve);
  // Plan a braking point from the same deceleration that the driver controls use.
  for(let ahead=0;ahead<=880;ahead+=176) {
    const bend=Math.abs(segmentAt(racer.distance+ahead).curve);
    curve=Math.max(curve,bend);
    const cornerSpeed=ceiling*(1-bend*style.brake);
    const brakingRoom=2*brakeDeceleration*.83*ahead;
    target=Math.min(target,Math.sqrt(cornerSpeed**2+brakingRoom));
  }
  const traffic = racers.filter(other => other !== racer && other.finished === null)
    .map(other => ({other, gap: raceGap(racer.distance,other.distance)}))
    .filter(({gap}) => gap > -140 && gap < 650);
  const upcomingBoxes=racer.items.length>=ITEM_CAPACITY?[]:boxes.filter(box=>{
    const gap=raceGap(racer.distance,box.distance);
    return gap>100&&gap<680&&box.readyAt<=time+gap/Math.max(400,racer.speed);
  });
  const upcomingTraps=traps.filter(trap=>{
    const gap=raceGap(racer.distance,trap.distance);
    return trap.owner!==racer.id&&gap>0&&gap<380&&trap.armedAt<=time;
  });
  const safeLane=edge;
  const itemLanes=upcomingBoxes.map(box=>box.x).filter(x=>Math.abs(x)<=safeLane);
  const pad=boosts.find(surface=>{
    const gap=raceGap(racer.distance,surface.segment*SEGMENT);
    return gap>=-SEGMENT*2&&gap<650;
  });
  const padLanes=pad?[pad.lane]:[];
  for (const candidate of [line,-.59,0,.59,...new Set([...itemLanes,...padLanes])]) {
    let value = -Math.abs(candidate - line) * 1.65 - Math.abs(candidate - racer.lane) * .58;
    for (const {other, gap} of traffic) {
      const lateral=Math.abs(other.x-candidate);
      const overlap=limit((.40-lateral)/.40,0,1);
      const closing=limit((target-other.speed+150)/365,.30,1.7);
      const spacing=gap>0?(1-gap/650)*closing*3.25:(1+gap/140)*2.15;
      value-=overlap*spacing*style.passing;
    }
    if(upcomingBoxes.some(box=>Math.abs(box.x-candidate)<.18)) value+=racer.driftSide?.18:.58;
    if(pad&&Math.abs(candidate-pad.lane)<.16) value+=racer.driftSide?.42:1.15;
    if(upcomingTraps.some(trap=>Math.abs(trap.x-candidate)<.24)) value-=racer.shield?0:1.75;
    if (value > best) { best = value; lane = candidate; }
  }
  for(const {other,gap} of traffic) {
    if(gap>0&&gap<235&&Math.abs(other.x-racer.x)<.23) {
      // Keep room until the front wheels have actually moved clear of the other kart.
      const followingSpeed=other.speed+Math.max(0,gap-94)*2.6;
      target=Math.min(target,followingSpeed);
    }
  }
  racer.lane = lane;
  const brake=racer.speed>target+33;
  const ratio=racer.speed/TOP_SPEED;
  const steeringLook=145+ratio*150;
  const aimPoint=coursePose(racer.distance+steeringLook,lane);
  const aimDirection=Math.atan2(aimPoint.z-racer.worldZ,aimPoint.x-racer.worldX);
  const aim=angleBetween(aimDirection,racer.heading);
  const side=Math.sign(here.curve);
  const after=segmentAt(racer.distance+260);
  const driftSide=racer.driftSide;
  const canDrift=ratio>.65&&Math.abs(racer.x)<here.width-.12;
  const entering=canDrift&&Math.abs(here.curve)>=style.drift&&
    after.curve*side>style.drift*.75&&aim*side>.10;
  const holding=canDrift&&here.curve*driftSide>2.25&&after.curve*driftSide>2&&
    Math.abs(aim)<.55;
  const drift=!brake&&(driftSide?holding:entering);
  let steer=aim*3.8;
  if(drift) {
    const turnSide=driftSide||side;
    const slip=turnSide*driftSlip(ratio);
    const correction=angleBetween(aimDirection+slip,racer.heading)*3.8;
    steer=(correction-driftSteeringBias*turnSide)/driftSteeringInput;
    if(!driftSide) steer=turnSide*Math.max(.3,steer*turnSide);
  }
  return {brake,drift,throttle:racer.speed<=target,steer:limit(steer,-1,1),useItem:aiItem(race,racer,curve,traffic)};
}

function steerRate(ratio,brake,drifting,grip) {
  return (1.72+Math.min(1.35,ratio)*.48+(brake?.80:0)+(drifting?.90:0)+(grip?.27:0))*
    Math.min(1,.55+ratio*.70);
}

function boostedSpeed(racer) {
  if(racer.chaseBoost>0) return 1940;
  if(racer.itemBoost>0) return 1790;
  if(racer.launchBoost>0) return 1650;
  if(racer.boost>0) return 1760;
  if(racer.turbo>0) return racer.turboLevel===2?1740:1605;
  return TOP_SPEED;
}

export function cancelDrift(racer) {
  racer.driftSide=0;
  racer.driftCharge=0;
  racer.driftHop=0;
}

function updateDrift(racer,input,here,offRoad,dt) {
  if(offRoad||input.brake||racer.speed<390) {
    cancelDrift(racer);
    return;
  }
  if(!input.drift) {
    if(racer.driftCharge>=DRIFT_FIRST) {
      const strong=racer.driftCharge>=DRIFT_SECOND;
      racer.turboLevel=strong?2:1;
      racer.turbo=strong?1.08:.68;
      const cap=strong?1740:1605;
      racer.speed=Math.max(racer.speed,Math.min(cap,racer.speed+(strong?190:105)));
    }
    cancelDrift(racer);
    return;
  }
  if(!racer.driftSide&&Math.abs(input.steer)>.22) {
    racer.driftSide=Math.sign(input.steer);
    racer.driftHop=.18;
  }
  if(racer.driftSide) {
    const slip=Math.abs(angleBetween(racer.heading,racer.motionHeading));
    const charging=here.curve*racer.driftSide>2.25&&slip>.10;
    const rate=charging?Math.min(1.23,.91+slip*.75):-.5;
    racer.driftCharge=limit(racer.driftCharge+rate*dt,0,DRIFT_SECOND+.15);
  }
}

function drive(racer, dt, input) {
  const here = segmentAt(racer.distance);
  racer.hit = Math.max(0,racer.hit - dt);
  racer.driftHop=Math.max(0,racer.driftHop-dt);
  racer.launchBoost=Math.max(0,racer.launchBoost-dt);
  racer.itemBoost=Math.max(0,racer.itemBoost-dt);
  racer.chaseBoost=Math.max(0,racer.chaseBoost-dt);
  racer.shield=Math.max(0,racer.shield-dt);
  racer.slow=Math.max(0,racer.slow-dt);
  racer.grip=Math.max(0,racer.grip-dt);
  racer.boost = Math.max(0,racer.boost - dt);
  racer.turbo = Math.max(0,racer.turbo - dt);
  if (here.boost !== undefined && Math.abs(racer.x - here.boost) < .24 && racer.speed > 420) racer.boost = .76;

  const ratio = racer.speed / TOP_SPEED;
  const offRoad=Math.abs(racer.x)>here.width+.035;
  const grippy=racer.grip>0;
  updateDrift(racer,input,here,offRoad&&!grippy,dt);
  racer.slide+=(racer.driftSide-racer.slide)*Math.min(1,dt*8);
  const drifting=racer.driftSide!==0;
  const direction=drifting?driftSteeringInput*input.steer+driftSteeringBias*racer.driftSide:input.steer;
  racer.steering=direction;
  if(racer.speed>25) racer.heading=angleBetween(racer.heading+direction*steerRate(ratio,input.brake,drifting,grippy)*dt,0);
  const slip=drifting?racer.driftSide*driftSlip(ratio):0;
  const gripRate=drifting?10:racer.turbo>0?27:23;
  racer.motionHeading+=angleBetween(racer.heading-slip,racer.motionHeading)*(1-Math.exp(-dt*gripRate));

  const ceiling=boostedSpeed(racer);
  const surfaceLimit=offRoad?(grippy?1020:490):ceiling;
  const target=racer.slow>0?Math.min(surfaceLimit,840):surfaceLimit;
  const accelerating=input.throttle||ceiling>TOP_SPEED;
  const acceleration=input.brake?-brakeDeceleration:ceiling>TOP_SPEED?1480:accelerating?815:-430;
  racer.speed = limit(racer.speed + acceleration * dt, 0, Math.max(racer.speed,target));
  if (racer.speed > target) racer.speed = Math.max(target,racer.speed - (offRoad ? 1460 : 550) * dt);
}

function resolveContacts(race) {
  const {racers}=race;
  for(let a=0;a<racers.length;a++) for(let b=a+1;b<racers.length;b++){
    const first=racers[a],second=racers[b];
    if(first.finished!==null||second.finished!==null||first.hit||second.hit) continue;
    const dx=second.worldX-first.worldX,dz=second.worldZ-first.worldZ;
    const gap=Math.hypot(dx,dz);
    if(gap>=88) continue;
    const normal=coursePose(first.distance);
    const nx=gap>1?dx/gap:normal.rightX,nz=gap>1?dz/gap:normal.rightZ;
    race.contact={x:(first.worldX+second.worldX)/2,z:(first.worldZ+second.worldZ)/2,time:race.time};
    for(const [racer,side] of [[first,-1],[second,1]]){
      const push=(94-gap)/2;
      const position=keepInField({x:racer.worldX+nx*push*side,z:racer.worldZ+nz*push*side});
      racer.worldX=position.x;
      racer.worldZ=position.z;
      racer.hit=.40;
      racer.contactAt=race.time;
      racer.contactSide=Math.sign((-Math.sin(racer.heading)*nx+Math.cos(racer.heading)*nz)*-side)||1;
      if(!preventHit(race,racer)){
        racer.speed*=.83;
        racer.heading+=racer.contactSide*-.09;
        cancelDrift(racer);
      }
    }
  }
}

export function stepRace(race, dt, input) {
  const {racers, player} = race;
  const finishLine = LENGTH * LAPS;
  const plans=racers.slice(1).map(racer=>racer.finished===null?planAI(racer,race):null);
  race.time += dt;
  race.traps=race.traps.filter(trap=>trap.expiresAt>race.time);
  const skidCutoff=race.time-1.4;
  while(race.skids.length&&race.skids[0].time<skidCutoff) race.skids.shift();
  for(const racer of racers) {
    if(racer.finished===null&&(racer===player?input:plans[racer.id-1]).useItem) useItem(race,racer);
  }
  const moves=[];
  for (const racer of racers) {
    if (racer.finished !== null) continue;
    const controls=racer===player?input:plans[racer.id-1];
    const from=racer.distance, startX=racer.x;
    drive(racer,dt,controls);
    moveKart(racer,dt);
    const reached=racer.distance;
    racer.distance=Math.min(finishLine,reached);
    if(racer.driftSide&&racer.driftHop<=.055&&race.time>=racer.nextSkid) {
      race.skids.push({x:racer.worldX-Math.cos(racer.motionHeading)*45,z:racer.worldZ-Math.sin(racer.motionHeading)*45,
        y:roadHeight(racer.distance),side:racer.driftSide,time:race.time});
      racer.nextSkid=race.time+.075;
    }
    moves.push({racer,from,to:racer.distance,startX,reached});
  }
  resolveItems(race,moves);
  stepDiscs(race,dt,moves);
  for(const {racer,from,reached} of moves) {
    if (racer.distance >= finishLine) {
      racer.finished = race.time-dt+dt*limit((finishLine-from)/Math.max(.001,reached-from),0,1);
      racer.distance = finishLine;
    }
  }
  resolveContacts(race);
  race.lastLap = lapAt(player.distance);
  if (player.finished !== null && race.finishPlace === null) race.finishPlace = order(racers).indexOf(player) + 1;
}

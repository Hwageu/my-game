import {LENGTH, ROAD, SEGMENT, coursePose, distanceFor, keepInField, projectOnCourse, rawProgress, turnAt} from './course.js?v=3';
export {LENGTH,ROAD,SEGMENT};
export const LAPS = 3;
export const TOP_SPEED = 1450;
export const COUNTDOWN = 3;
export const DRIFT_FIRST = .48;
export const DRIFT_SECOND = 1.25;

export const ITEMS = {
  boost: '터보 캔',
  shield: '범퍼 실드',
  slip: '슬립 패드',
  grip: '그립 타이어',
  pulse: '펄스 링',
  disc: '코일 디스크',
  chase: '추격 부스터',
};
export const ITEM_CAPACITY = 2;
export const HAIRPIN_START = distanceFor(82);
export const HAIRPIN_END = distanceFor(117);
const CHICANE_FIRST=169, CHICANE_LAST=197;
const itemTypes = Object.keys(ITEMS);
const boxRows = [21,73,156,233];
const boxLanes = [-.75,-.45,-.15,.15,.45,.75];
const boxRespawn = 4;

// The road, collision width, minimap, and camera all use the same surveyed distance.
const zonesAt=[
  [0,'pit',54],[35,'hill',76],[64,'hill',-87],[82,'woods',102],
  [117,'woods',86],[135,'hill',-50],[162,'hill',-82],
  [197,'hill',-37],[223,'woods',62],[260,'hill',44],[290,'pit',69],[311,'pit',54],
];
const boosts=[{segment:indexFor(163),lane:-.44},{segment:indexFor(263),lane:.49}];
const signs=new Map([[29,1],[74,2],[125,-1],[160,-1],[213,1]].map(([raw,sign])=>[indexFor(raw),sign]));
function indexFor(raw) {return Math.floor(distanceFor(raw)/SEGMENT);}
const limit=(value,low,high)=>Math.max(low,Math.min(high,value));
const mod=(value,size)=>(value%size+size)%size;
const smooth=value=>value*value*(3-2*value);
function narrow(raw,start,end,ramp) {
  return smooth(limit(Math.min((raw-start)/ramp,(end-raw)/ramp),0,1));
}

export const track=Array.from({length:LENGTH/SEGMENT},(_,i)=>{
  const distance=i*SEGMENT,raw=rawProgress(distance);
  const zoneIndex=zonesAt.findIndex(([end])=>end>raw)-1;
  const [from,zone,y]=zonesAt[zoneIndex], [to,,nextY]=zonesAt[zoneIndex+1];
  const hairpin=raw>=82&&raw<117,chicane=raw>=CHICANE_FIRST&&raw<CHICANE_LAST;
  const width=1-.13*narrow(raw,82,117,7)-.19*narrow(raw,CHICANE_FIRST,CHICANE_LAST,5);
  return {i,zone,hairpin,chicane,width,curve:limit(turnAt(distance),-16,16),
    y:y+(nextY-y)*smooth((raw-from)/(to-from)),
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
  { look:990, brake:.024, line:.16, passing:1.24, drift:9.5 },
  { look:620, brake:.015, line:-.13, passing:1.03, drift:6.8 },
  { look:1080,brake:.028, line:-.22, passing:.81, drift:13 },
  { look:820, brake:.019, line:.18, passing:1.36, drift:8.5 },
  { look:930, brake:.022, line:-.06, passing:.93, drift:10.6 },
];
const grid = [[-.45,-320],[.45,-70],[-.45,-70],[-.45,-195],[.45,-195],[.45,-320]];

export function createRace(random=Math.random) {
  const racers = drivers.map(([name, color, light, shade], id) => ({
    id, name, color, light, shade, x: grid[id][0], distance: grid[id][1],
    speed:0, steering:0, launchBoost:0, boost:0, turbo:0, turboLevel:0, driftSide:0, driftCharge:0,
    hit:0, lane:grid[id][0], finished:null,
    items:[], lastBox:null, effects:[], itemBoost:0, chaseBoost:0, shield:0, slow:0, grip:0,
    slide:0, nextSkid:0, contactAt:-Infinity, contactSide:0,
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
  const timings=[.71,.25,1.14,.87,.05];
  race.racers.slice(1).forEach((racer,i)=>applyStartBoost(racer,timings[i]));
  return applyStartBoost(race.player,heldFor);
}

export function placeKart(racer,distance,lane) {
  const point=coursePose(distance,lane);
  Object.assign(racer,{distance,x:lane,worldX:point.x,worldZ:point.z,heading:point.angle});
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
  const forwardX=Math.cos(racer.heading),forwardZ=Math.sin(racer.heading);
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

function itemEvent(race,racer,type,item) {
  const event={type,item,time:race.time,until:race.time+1.4};
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

function stepDiscs(race,dt,moves) {
  const travel=2210*dt;
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
      if(!preventHit(race,hit)) slowKart(race,hit,'disc');
      return false;
    }
    disc.distance+=travel;
    return true;
  });
}

function slowKart(race,racer,item) {
  const [factor,seconds]=item==='pulse'?[.83,.72]:item==='disc'?[.71,1.13]:[.78,1];
  racer.speed*=factor;
  racer.slow=Math.max(racer.slow,seconds);
  cancelDrift(racer);
  itemEvent(race,racer,'slipped',item);
}

function useItem(race,racer) {
  const item=racer.items.shift()?.type;
  if(!item) return;
  if(item==='boost') racer.itemBoost=1.10;
  if(item==='chase') racer.chaseBoost=1.85;
  if(item==='disc') race.discs.push({owner:racer.id,x:racer.x,distance:racer.distance+94,expiresAt:race.time+2.35});
  if(item==='shield') racer.shield=4.5;
  if(item==='grip') racer.grip=2.4;
  if(item==='slip') race.traps.push({owner:racer.id,x:racer.x,distance:racer.distance-78,armedAt:race.time+.22,expiresAt:race.time+16});
  if(item==='pulse') for(const other of nearby(race,racer)) {
    if(!preventHit(race,other)) slowKart(race,other,item);
  }
  itemEvent(race,racer,'used',item);
}

function aiItem(race,racer,curve,traffic) {
  const held=racer.items[0];
  if(!held||race.time-held.time<.45) return false;
  const longHold=race.time-held.time>(racer.items.length===ITEM_CAPACITY?3.4:5);
  if(held.type==='boost') return Math.abs(racer.x)<.82&&racer.speed>550&&
    (longHold||(!racer.boost&&!racer.turbo&&curve<5));
  if(held.type==='chase') return racer.speed>450&&(longHold||curve<6);
  if(held.type==='disc') return longHold||frontTarget(race,racer.distance,racer.x,racer.id,1150)!==null;
  if(held.type==='shield') return longHold||traffic.some(({gap})=>Math.abs(gap)<155);
  if(held.type==='grip') return longHold||curve>7.5||Math.abs(racer.x)>.92;
  if(held.type==='pulse') return longHold||nearby(race,racer).length>0;
  return longHold||race.racers.some(other=>{
    const gap=raceGap(other.distance,racer.distance);
    return other!==racer&&other.finished===null&&gap>95&&gap<900&&Math.abs(other.x-racer.x)<.33;
  });
}

function preventHit(race,racer) {
  if(racer.shield<=0) return false;
  racer.shield=0;
  itemEvent(race,racer,'blocked','shield');
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
      if(preventHit(race,racer)) continue;
      slowKart(race,racer,'slip');
    }
  }
}

function planAI(racer,race) {
  const {racers,boxes,traps,time}=race;
  const style = styles[racer.id-1];
  const here = segmentAt(racer.distance);
  const ahead = segmentAt(racer.distance + style.look*.5);
  const nextTurn = segmentAt(racer.distance + style.look);
  const curve = Math.max(Math.abs(here.curve), Math.abs(ahead.curve), Math.abs(nextTurn.curve));
  const setup = Math.abs(here.curve)>2 ? here.curve*.042 : -ahead.curve*.047;
  const line = limit(setup + style.line,-.57,.57);
  let lane = line;
  let best = -Infinity;
  const ceiling = boostedSpeed(racer);
  let target = ceiling * (1 - curve * style.brake);
  const traffic = racers.filter(other => other !== racer && other.finished === null)
    .map(other => ({other, gap: raceGap(racer.distance,other.distance)}))
    .filter(({gap}) => gap > -115 && gap < 510);
  const upcomingBoxes=racer.items.length>=ITEM_CAPACITY?[]:boxes.filter(box=>{
    const gap=raceGap(racer.distance,box.distance);
    return gap>0&&gap<730&&box.readyAt<=time+gap/Math.max(400,racer.speed);
  });
  const upcomingTraps=traps.filter(trap=>{
    const gap=raceGap(racer.distance,trap.distance);
    return trap.owner!==racer.id&&gap>0&&gap<380&&trap.armedAt<=time;
  });
  for (const candidate of [line,-.64,.02,.64,...new Set(upcomingBoxes.map(box=>box.x))]) {
    let value = -Math.abs(candidate - line) * 1.2 - Math.abs(candidate - racer.lane) * .43;
    for (const {other, gap} of traffic) {
      if (Math.abs(other.x - candidate) < .32) {
        const closing = limit((target - other.speed + 130) / 330, .22, 2);
        value -= (1 - Math.abs(gap) / 525) * closing * (gap > 0 ? 3.0 : 1.15) * style.passing;
      }
    }
    if(upcomingBoxes.some(box=>Math.abs(box.x-candidate)<.18)) value+=.88;
    if(upcomingTraps.some(trap=>Math.abs(trap.x-candidate)<.24)) value-=racer.shield?0:1.75;
    if (value > best) { best = value; lane = candidate; }
  }
  if (Math.abs(lane - racer.x) > .23) {
    for (const {other, gap} of traffic) {
      if (gap > 0 && gap < 140 && Math.abs(other.x - racer.x) < .26) {
        target = Math.min(target, other.speed + 75);
      }
    }
  }
  racer.lane = lane;
  const brake=racer.speed>target+33;
  const ratio=racer.speed/TOP_SPEED;
  const aimPoint=coursePose(racer.distance+155+ratio*160,lane);
  const aim=angleBetween(Math.atan2(aimPoint.z-racer.worldZ,aimPoint.x-racer.worldX),racer.heading);
  const drift=!brake&&ratio>.57&&Math.abs(here.curve)>=style.drift&&
    Math.abs(aim)>.18&&Math.sign(aim)===Math.sign(here.curve)&&Math.abs(racer.x)<here.width-.09;
  const steer=limit(aim*3.4,-1,1);
  return {brake,drift,throttle:racer.speed<=target,steer,useItem:aiItem(race,racer,curve,traffic)};
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
}

function updateDrift(racer,input,here,offRoad,dt) {
  if(offRoad || input.brake || racer.speed<390) {
    cancelDrift(racer);
    return;
  }
  if(!input.drift) {
    if(racer.driftCharge>=DRIFT_FIRST) {
      racer.turboLevel=racer.driftCharge>=DRIFT_SECOND?2:1;
      racer.turbo=racer.turboLevel===2?1.02:.64;
    }
    cancelDrift(racer);
    return;
  }
  if(!racer.driftSide && Math.abs(input.steer)>.22) racer.driftSide=Math.sign(input.steer);
  if(racer.driftSide) {
    const inTurn=here.curve*racer.driftSide>2.25;
    racer.driftCharge=limit(racer.driftCharge+(inTurn?1:-.65)*dt,0,DRIFT_SECOND+.15);
  }
}

function drive(racer, dt, input) {
  const here = segmentAt(racer.distance);
  racer.hit = Math.max(0,racer.hit - dt);
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
  const direction=drifting?limit(input.steer*.90+racer.driftSide*.28,-1.06,1.06):input.steer;
  racer.steering=direction;
  if(racer.speed>25) racer.heading=angleBetween(racer.heading+direction*steerRate(ratio,input.brake,drifting,grippy)*dt,0);

  const ceiling=boostedSpeed(racer);
  const surfaceLimit=offRoad?(grippy?1020:490):ceiling;
  const target=racer.slow>0?Math.min(surfaceLimit,840):surfaceLimit;
  const accelerating=input.throttle||ceiling>TOP_SPEED;
  const acceleration=input.brake?-1340:ceiling>TOP_SPEED?1480:accelerating?815:-430;
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
    if(racer.driftSide&&race.time>=racer.nextSkid) {
      race.skids.push({x:racer.x,distance:racer.distance-62,side:racer.driftSide,time:race.time});
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

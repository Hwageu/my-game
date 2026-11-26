export const SEGMENT = 88;
export const ROAD = 460;
export const LAPS = 2;
export const TOP_SPEED = 1270;
export const COUNTDOWN = 3;
export const DRIFT_FIRST = .48;
export const DRIFT_SECOND = 1.25;

export const ITEMS = {
  boost: '터보 캔',
  shield: '범퍼 실드',
  slip: '슬립 패드',
  grip: '그립 타이어',
  pulse: '펄스 링',
};
export const ITEM_CAPACITY = 2;
export const HAIRPIN_START = 82 * SEGMENT;
export const HAIRPIN_END = 117 * SEGMENT;
const itemTypes = Object.keys(ITEMS);
const boxRows = [21,167,244];
const boxLanes = [-.75,-.45,-.15,.15,.45,.75];
const boxRespawn = 4;

// The corner order follows the Brands Hatch Indy layout. Length, grade and
// curvature are tuned for short kart races.
const sections = [
  // Segments, curvature, scenery, exit elevation.
  [35,  0,    'pit',    78], // Brabham Straight
  [29,  8.9,  'hill', -118], // Paddock Hill Bend
  [18,  0,    'hill',  118], // Climb to Druids
  [35, 13.4,  'woods',  95], // Druids Hairpin
  [18,  0,    'woods', -72], // Descent to Graham Hill
  [27, -8.2,  'hill',  -94], // Graham Hill Bend
  [35,  0,    'hill',  -50], // Cooper Straight
  [21, -7.0,  'woods',  40], // Surtees
  [18,  8.1,  'woods',  68], // McLaren
  [25,  2.6,  'hill',   48], // Clearways
  [29,  7.0,  'pit',    75], // Clark Curve
  [21,  0,    'pit',    54], // Approach to start/finish
];
const segmentCount = sections.reduce((sum, [length]) => sum + length, 0);
export const LENGTH = segmentCount * SEGMENT;
const boosts = [{segment:176, lane:-.41}, {segment:251, lane:.52}];
const signs = new Map([[27,1],[72,2],[78,2],[128,-1],[189,-1],[211,1],[253,1]]);
const limit = (value, low, high) => Math.max(low, Math.min(high, value));
const mod = (value, size) => (value % size + size) % size;
const smooth = value => value * value * (3 - 2 * value);

export const track = [];
let entryHeight = sections.at(-1)[3];
for (const [length, turn, zone, exitHeight] of sections) {
  for (let n = 0; n < length; n++) {
    const i = track.length;
    const edge = smooth(Math.min(1, n / 5, (length - n) / 5));
    track.push({
      i, curve: turn * edge, zone, y: entryHeight+(exitHeight-entryHeight)*smooth(n/length),
      boost: boosts.find(pad => i >= pad.segment && i < pad.segment + 3)?.lane,
      sign: signs.get(i), hairpin:i*SEGMENT>=HAIRPIN_START&&i*SEGMENT<HAIRPIN_END,
    });
  }
  entryHeight=exitHeight;
}

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
const grid = [[-.45,-210],[.45,-90],[-.45,-90],[-.45,-150],[.45,-150],[.45,-210]];

export function createRace(random=Math.random) {
  const racers = drivers.map(([name, color, light, shade], id) => ({
    id, name, color, light, shade, x: grid[id][0], distance: grid[id][1],
    speed:0, steering:0, boost:0, turbo:0, turboLevel:0, driftSide:0, driftCharge:0,
    hit:0, lane:grid[id][0], finished:null,
    items:[], lastBox:null, effects:[], itemBoost:0, shield:0, slow:0, grip:0,
    slide:0, nextSkid:0,
  }));
  const boxes=boxRows.flatMap(segment=>boxLanes.map(x=>({x,distance:segment*SEGMENT+SEGMENT/2,readyAt:0})));
  return {time:0,racers,player:racers[0],lastLap:1,finishPlace:null,random,boxes,traps:[],skids:[],itemEvent:null};
}

export function lapAt(distance) {
  return Math.min(LAPS, Math.floor(Math.max(0, distance) / LENGTH) + 1);
}

export function order(racers) {
  return [...racers].sort((a,b) =>
    (a.finished ?? Infinity) - (b.finished ?? Infinity) || b.distance - a.distance || a.id - b.id
  );
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

function slowKart(race,racer,item) {
  racer.speed*=item==='pulse'?.83:.78;
  racer.slow=Math.max(racer.slow,item==='pulse'?.72:1);
  cancelDrift(racer);
  itemEvent(race,racer,'slipped',item);
}

function useItem(race,racer) {
  const item=racer.items.shift()?.type;
  if(!item) return;
  if(item==='boost') racer.itemBoost=1.10;
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
      const item=itemTypes[Math.floor(race.random()*itemTypes.length)];
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
  const brake = racer.speed > target + 37;
  const ratio = racer.speed / TOP_SPEED;
  const side = Math.sign(here.curve);
  const drift = !brake && ratio>.55 && Math.abs(here.curve)>=style.drift &&
    (racer.driftSide===side || Math.abs(racer.x-lane)<.38);
  const adjust = (lane-racer.x)*3.1 + cornerSlip(here,ratio,drift,racer.grip>0);
  let steer = adjust / steerRate(ratio,brake,drift);
  if(drift) {
    steer=(steer-side*.28)/.90;
    if(!racer.driftSide) steer=side*Math.max(.28,steer*side);
  }
  return {brake,drift,throttle:racer.speed<=target,steer:limit(steer,-1,1),useItem:aiItem(race,racer,curve,traffic)};
}

function cornerSlip(segment,ratio,drifting,grip) {
  return segment.curve*.174*ratio**2*(drifting?1.12:1)*(grip?.76:1);
}

function steerRate(ratio,brake,drifting) {
  return .58+ratio*1.14+(brake?.55:0)+(drifting?.69:0);
}

function boostedSpeed(racer) {
  if(racer.itemBoost>0) return 1610;
  if(racer.boost>0) return 1580;
  if(racer.turbo>0) return racer.turboLevel===2?1560:1450;
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
  racer.itemBoost=Math.max(0,racer.itemBoost-dt);
  racer.shield=Math.max(0,racer.shield-dt);
  racer.slow=Math.max(0,racer.slow-dt);
  racer.grip=Math.max(0,racer.grip-dt);
  racer.boost = Math.max(0,racer.boost - dt);
  racer.turbo = Math.max(0,racer.turbo - dt);
  if (here.boost !== undefined && Math.abs(racer.x - here.boost) < .24 && racer.speed > 420) racer.boost = .76;

  const ratio = racer.speed / TOP_SPEED;
  const offRoad = Math.abs(racer.x) > 1.04;
  const grippy=racer.grip>0;
  updateDrift(racer,input,here,offRoad&&!grippy,dt);
  racer.slide+=(racer.driftSide-racer.slide)*Math.min(1,dt*8);
  const drifting=racer.driftSide!==0;
  const direction=drifting?limit(input.steer*.90+racer.driftSide*.28,-1.06,1.06):input.steer;
  racer.steering=direction;
  const steer=racer.speed>30?direction*steerRate(ratio,input.brake,drifting):0;
  racer.x=limit(racer.x+(steer-cornerSlip(here,ratio,drifting,grippy))*dt,-1.48,1.48);

  const ceiling=boostedSpeed(racer);
  const surfaceLimit=offRoad?(grippy?1020:490):ceiling;
  const target=racer.slow>0?Math.min(surfaceLimit,840):surfaceLimit;
  const accelerating=input.throttle||ceiling>TOP_SPEED;
  const acceleration=input.brake?-1110:ceiling>TOP_SPEED?1240:accelerating?625:-370;
  racer.speed = limit(racer.speed + acceleration * dt, 0, Math.max(racer.speed,target));
  if (racer.speed > target) racer.speed = Math.max(target,racer.speed - (offRoad ? 1460 : 550) * dt);
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
    racer.distance=Math.min(finishLine,from+racer.speed*dt);
    if(racer.driftSide&&race.time>=racer.nextSkid) {
      race.skids.push({x:racer.x,distance:racer.distance-62,side:racer.driftSide,time:race.time});
      racer.nextSkid=race.time+.075;
    }
    moves.push({racer,from,to:racer.distance,startX,speed:racer.speed});
  }
  resolveItems(race,moves);
  for(const {racer,from,speed} of moves) {
    if (racer.distance >= finishLine) {
      racer.finished = race.time - dt + (finishLine-from)/Math.max(1,speed);
      racer.distance = finishLine;
    }
  }
  for (let a = 0; a < racers.length; a++) {
    for (let b = a + 1; b < racers.length; b++) {
      const first = racers[a], second = racers[b];
      if (first.finished !== null || second.finished !== null || first.hit || second.hit) continue;
      if (Math.abs(raceGap(first.distance,second.distance)) < 48 && Math.abs(first.x - second.x) < .29) {
        const side = first.x <= second.x ? -1 : 1;
        first.x = limit(first.x + side * .11, -1.48, 1.48);
        second.x = limit(second.x - side * .11, -1.48, 1.48);
        for(const racer of [first,second]){
          if(!preventHit(race,racer)){
            racer.speed*=.85;
            cancelDrift(racer);
          }
        }
        first.hit = second.hit = .42;
      }
    }
  }
  race.lastLap = lapAt(player.distance);
  if (player.finished !== null && race.finishPlace === null) race.finishPlace = order(racers).indexOf(player) + 1;
}

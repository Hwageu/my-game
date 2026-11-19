export const SEGMENT = 88;
export const ROAD = 460;
export const LAPS = 2;
export const TOP_SPEED = 1270;
export const COUNTDOWN = 3;
export const DRIFT_FIRST = .48;
export const DRIFT_SECOND = 1.25;

// The corner order follows the Brands Hatch Indy layout. Length, grade and
// curvature are tuned for short kart races.
const sections = [
  // Segments, curvature, scenery, exit elevation.
  [35,  0,    'pit',    78], // Brabham Straight
  [29,  8.4,  'hill', -118], // Paddock Hill Bend
  [18,  0,    'hill',  118], // Climb to Druids
  [35, 11.6,  'woods',  95], // Druids Hairpin
  [18,  0,    'woods', -72], // Descent to Graham Hill
  [27, -7.4,  'hill',  -94], // Graham Hill Bend
  [35,  0,    'hill',  -50], // Cooper Straight
  [21, -5.8,  'woods',  40], // Surtees
  [18,  6.9,  'woods',  68], // McLaren
  [25,  2.6,  'hill',   48], // Clearways
  [29,  7.0,  'pit',    75], // Clark Curve
  [21,  0,    'pit',    54], // Approach to start/finish
];
const segmentCount = sections.reduce((sum, [length]) => sum + length, 0);
export const LENGTH = segmentCount * SEGMENT;
const boosts = [{segment:176, lane:-.41}, {segment:251, lane:.52}];
const signs = new Map([[27,1],[73,1],[128,-1],[189,-1],[211,1],[253,1]]);
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
      sign: signs.get(i),
    });
  }
  entryHeight=exitHeight;
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

export function createRace() {
  const racers = drivers.map(([name, color, light, shade], id) => ({
    id, name, color, light, shade, x: grid[id][0], distance: grid[id][1],
    speed:0, steering:0, boost:0, turbo:0, turboLevel:0, driftSide:0, driftCharge:0,
    hit:0, lane:grid[id][0], finished:null,
  }));
  return {time:0, racers, player:racers[0], lastLap:1, finishPlace:null};
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

function planAI(racer, racers) {
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
  for (const candidate of [line, -.64, .02, .64]) {
    let value = -Math.abs(candidate - line) * 1.2 - Math.abs(candidate - racer.lane) * .43;
    for (const {other, gap} of traffic) {
      if (Math.abs(other.x - candidate) < .32) {
        const closing = limit((target - other.speed + 130) / 330, .22, 2);
        value -= (1 - Math.abs(gap) / 525) * closing * (gap > 0 ? 3.0 : 1.15) * style.passing;
      }
    }
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
  const adjust = (lane-racer.x)*3.1 + cornerSlip(here,ratio,drift);
  let steer = adjust / steerRate(ratio,brake,drift);
  if(drift) {
    steer=(steer-side*.28)/.90;
    if(!racer.driftSide) steer=side*Math.max(.28,steer*side);
  }
  return {brake, drift, throttle:racer.speed<=target, steer:limit(steer,-1,1)};
}

function cornerSlip(segment,ratio,drifting) {
  return segment.curve*.174*ratio**2*(drifting?1.12:1);
}

function steerRate(ratio,brake,drifting) {
  return .58+ratio*1.14+(brake?.55:0)+(drifting?.69:0);
}

function boostedSpeed(racer) {
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
  racer.boost = Math.max(0,racer.boost - dt);
  racer.turbo = Math.max(0,racer.turbo - dt);
  if (here.boost !== undefined && Math.abs(racer.x - here.boost) < .24 && racer.speed > 420) racer.boost = .76;

  const ratio = racer.speed / TOP_SPEED;
  const offRoad = Math.abs(racer.x) > 1.04;
  updateDrift(racer,input,here,offRoad,dt);
  const drifting=racer.driftSide!==0;
  const direction=drifting?limit(input.steer*.90+racer.driftSide*.28,-1.06,1.06):input.steer;
  racer.steering=direction;
  const steer=racer.speed>30?direction*steerRate(ratio,input.brake,drifting):0;
  racer.x=limit(racer.x+(steer-cornerSlip(here,ratio,drifting))*dt,-1.48,1.48);

  const ceiling=boostedSpeed(racer);
  const target=offRoad?490:ceiling;
  const accelerating=input.throttle||ceiling>TOP_SPEED;
  const acceleration=input.brake?-1110:ceiling>TOP_SPEED?1240:accelerating?625:-370;
  racer.speed = limit(racer.speed + acceleration * dt, 0, Math.max(racer.speed,target));
  if (racer.speed > target) racer.speed = Math.max(target,racer.speed - (offRoad ? 1460 : 550) * dt);
}

export function stepRace(race, dt, input) {
  const {racers, player} = race;
  const finishLine = LENGTH * LAPS;
  const plans = racers.slice(1).map(racer => planAI(racer, racers));
  race.time += dt;
  for (const racer of racers) {
    if (racer.finished !== null) continue;
    drive(racer,dt,racer===player ? input : plans[racer.id - 1]);
    const previous = racer.distance;
    racer.distance += racer.speed * dt;
    if (racer.distance >= finishLine) {
      racer.finished = race.time - dt + (finishLine - previous) / Math.max(1,racer.speed);
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
        first.speed *= .85;
        second.speed *= .85;
        cancelDrift(first);
        cancelDrift(second);
        first.hit = second.hit = .42;
      }
    }
  }
  race.lastLap = lapAt(player.distance);
  if (player.finished !== null && race.finishPlace === null) race.finishPlace = order(racers).indexOf(player) + 1;
}

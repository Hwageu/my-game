import {COUNTDOWN, DRIFT_FIRST, DRIFT_SECOND, ITEMS, ITEM_CAPACITY, LAPS, TOP_SPEED, approachingHairpin, cancelDrift, createRace, launchRace, order, recoverKart, segmentAt, stepRace} from './track.js?v=9';
import {drawRace} from './render.js?v=9';
import {drawMinimap} from './minimap.js?v=5';
import {createRaceAudio} from './audio.js?v=4';

const $ = id => document.getElementById(id);
const canvas = $('road'), context = canvas.getContext('2d');
const itemButton = $('useItem');
const sound=createRaceAudio();
const tone=sound.tone;
const courseMap = $('courseMap'), mapContext = $('minimap').getContext('2d');
let itemQueued = false;
const controls = [...document.querySelectorAll('[data-drive]')];
const embedded = parent !== window;
let touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
let muted = false, active = !embedded, mode = 'title', race = createRace();
let deadline = 0, goUntil = 0, previous = performance.now(), accumulator = 0, lastSignal = '';
let best = 0, launchPress=null, launchedUntil=0, recoveredUntil=0;
const bestKey='tidelineBestTime:'+LAPS;
try {
  best = Number(localStorage.getItem(bestKey)) || 0;
  muted = localStorage.getItem('neonArcadeMuted') === 'true';
} catch {}

const keyMap = new Map([
  ['ArrowLeft','left'],['KeyA','left'],['ArrowRight','right'],['KeyD','right'],
  ['ArrowDown','brake'],['KeyS','brake'],['ArrowUp','throttle'],['KeyW','throttle'],
  ['ShiftLeft','drift'],['ShiftRight','drift'],
]);
const keys = new Set();
const pointers = new Map();

function resize() {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scale = Math.min(1,520/rect.width,440/rect.height);
  const width = Math.max(1,Math.round(rect.width*scale));
  const height = Math.max(1,Math.round(rect.height*scale));
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
  context.imageSmoothingEnabled = false;
}
new ResizeObserver(resize).observe(canvas);

function clearInput() {
  keys.clear();
  itemQueued=false;
  launchPress=null;
  cancelDrift(race.player);
  for (const [pointer,button] of pointers) {
    if (button.hasPointerCapture(pointer)) button.releasePointerCapture(pointer);
  }
  pointers.clear();
  for (const button of controls) button.dataset.held = 'false';
}

function readInput() {
  const held = action => [...keys].some(code => keyMap.get(code) === action) ||
    [...pointers.values()].some(button => button.dataset.drive === action);
  return {steer:Number(held('right'))-Number(held('left')), brake:held('brake'), drift:held('drift'), throttle:touch||held('throttle'), useItem:itemQueued};
}
function report() {
  if (embedded) parent.postMessage({type:'void-state',mode:mode==='finished'?'won':mode,lastStage:true},location.origin);
}
function setOverlay() {
  const show = ['title','paused','finished'].includes(mode);
  $('overlay').hidden = !show;
  courseMap.hidden=show;
  if(!show) drawMinimap(mapContext,race);
  $('pause').disabled = !['playing','countdown'].includes(mode);
  $('touchControls').hidden = !touch || show;
  $('countdown').hidden = mode !== 'countdown';
  $('recover').hidden=mode!=='paused';
  const title = $('title');
  if (show) {
    const onTitle = mode === 'title';
    title.replaceChildren();
    if (onTitle) {
      const gp = document.createElement('span');
      gp.textContent='GP';
      title.append('TIDELINE ',gp);
    } else title.textContent=mode==='paused'?'일시정지':'경주 종료';
    $('course').textContent=mode==='finished'
      ? race.finishPlace + '위 / 6대 · ' + formatTime(race.player.finished)
      : '인디 힐 서킷 · '+race.racers.length+'대 · '+LAPS+'바퀴';
    $('help').hidden = !onTitle;
    $('help').textContent = touch
      ? '자동 가속 · 코너에서 드리프트를 놓으면 미니터보\n아이템 2개 보관 · 일시정지에서 트랙 복귀'
      : '↑ 가속 · ↓ 브레이크 · ← → 조향\nShift + 조향으로 드리프트 · 놓으면 미니터보\n아이템 E · 트랙 복귀 R';
    $('best').hidden = best<=0;
    $('best').textContent = '최고 기록 ' + formatTime(best);
    $('start').textContent = onTitle?'경주 시작':mode==='paused'?'경주 재개':'다시 달리기';
  }
  report();
  resize();
}
function setTouch(value) {
  if (touch!==value) clearInput();
  touch=!!value;
  setOverlay();
}

function ensureAudio(){sound.unlock(muted);}
function updateEngine(){sound.update(race.player,mode==='playing'&&active,muted);}
function formatTime(seconds) {
  const centis=Math.floor(seconds*100);
  const pad=value=>String(value).padStart(2,'0');
  return pad(Math.floor(centis/6000))+':'+pad(Math.floor(centis/100)%60)+'.'+pad(centis%100);
}
function startOrResume() {
  if (mode !== 'paused') race=createRace();
  clearInput();
  ensureAudio();
  mode='countdown';
  deadline=performance.now()+COUNTDOWN*1000;
  $('countdown').textContent=String(COUNTDOWN);
  lastSignal='';
  goUntil=0;
  launchedUntil=0;
  accumulator=0;
  setOverlay();
  canvas.focus({preventScroll:true});
}
function pause() {
  clearInput();
  if (!['playing','countdown'].includes(mode)) return;
  mode='paused';
  goUntil=0;
  setOverlay();
  updateEngine();
  if (active) $('start').focus({preventScroll:true});
}
function toggle() {
  if (mode==='playing'||mode==='countdown') pause();
  else startOrResume();
}
function finish() {
  mode='finished';
  clearInput();
  if (!best || race.player.finished<best) {
    best=race.player.finished;
    try {localStorage.setItem(bestKey,String(best));} catch {}
  }
  setOverlay();
  $('start').focus({preventScroll:true});
  tone(850,.25);
}

function noteLaunchPress() {
  if(mode==='countdown'&&race.time===0&&!readInput().drift) launchPress=performance.now();
}
function clearLaunchIfReleased() {
  if(launchPress!==null&&!readInput().drift) launchPress=null;
}
function recover() {
  if(mode!=='playing'&&mode!=='paused') return;
  clearInput();
  recoverKart(race);
  recoveredUntil=performance.now()+1200;
  sound.effect('recover');
  if(mode==='paused') startOrResume();
  else canvas.focus({preventScroll:true});
}
function updateLaunchHint(now) {
  const hint=$('launchHint');
  const charging=mode==='countdown'&&race.time===0;
  const key=touch?'드리프트':'Shift';
  const launchReady=charging&&deadline-now<=1000;
  const text=charging
    ? launchReady?key+'를 누르고 GO까지 유지':'숫자 1에 '+key+' 누르기'
    : mode==='playing'&&now<launchedUntil?'출발 부스트!'
      : mode==='playing'&&now<recoveredUntil?'트랙에 복귀했습니다':'';
  hint.hidden=!text;
  hint.dataset.ready=String(launchReady||mode==='playing'&&now<launchedUntil);
  if(hint.textContent!==text) hint.textContent=text;
}

for (const button of controls) {
  button.addEventListener('pointerdown',event=>{
    if (event.button!==0 || !['playing','countdown'].includes(mode) || [...pointers.values()].includes(button)) return;
    event.preventDefault();
    if(button.dataset.drive==='drift') noteLaunchPress();
    pointers.set(event.pointerId,button);
    button.dataset.held='true';
    button.setPointerCapture(event.pointerId);
    ensureAudio();
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    button.addEventListener(type,event=>{
      if (pointers.get(event.pointerId)!==button) return;
      pointers.delete(event.pointerId);
      if(button.dataset.drive==='drift') clearLaunchIfReleased();
      button.dataset.held='false';
      if(type!=='pointerup' && button.dataset.drive==='drift') cancelDrift(race.player);
    });
  }
}
function queueItem() {
  if(mode==='playing'&&race.player.items.length) {
    itemQueued=true;
    ensureAudio();
  }
}
itemButton.onclick=queueItem;
document.addEventListener('keydown',event=>{
  if (event.ctrlKey||event.metaKey||event.altKey) return;
  if(event.code==='KeyE') {
    event.preventDefault();
    if(!event.repeat) queueItem();
  }
  if(event.code==='KeyR'&&!event.repeat) {event.preventDefault();recover();}
  if (keyMap.has(event.code)) {
    event.preventDefault();
    if (mode==='playing'||mode==='countdown') {
      if(!event.repeat&&keyMap.get(event.code)==='drift') noteLaunchPress();
      keys.add(event.code);
    }
  }
  if (!event.repeat && ['KeyP','Escape'].includes(event.code)) {
    event.preventDefault();
    if (mode==='paused'||mode==='playing'||mode==='countdown') toggle();
  }
});
document.addEventListener('keyup',event=>{
  keys.delete(event.code);
  if(keyMap.get(event.code)==='drift') clearLaunchIfReleased();
});
window.addEventListener('blur',()=>{
  clearInput();
  if (!embedded || !parent.document.hasFocus()) pause();
});
document.addEventListener('visibilitychange',()=>{
  if (document.hidden) pause();
});
matchMedia('(orientation: portrait)').addEventListener?.('change',clearInput);
$('start').onclick=startOrResume;
$('pause').onclick=pause;
$('recover').onclick=recover;
$('back').onclick=()=>{
  pause();
  if (embedded) parent.postMessage({type:'void-exit'},location.origin);
  else location.href='../';
};
window.addEventListener('message',event=>{
  if (!embedded || event.origin!==location.origin || event.source!==parent) return;
  const data=event.data;
  if (data?.type==='arcade-preferences') {
    if (typeof data.active==='boolean') active=data.active;
    muted=!!data.muted;
    if (!active) pause();
    if (typeof data.touch==='boolean' && data.touch!==touch) setTouch(data.touch);
    report();
    updateEngine();
  }
  if (data?.type==='void-cover') {active=false;pause();updateEngine();}
  if (data?.type==='void-pause') pause();
  if (data?.type==='void-toggle-pause') toggle();
  if (data?.type==='void-pause-shortcut' && ['playing','paused','countdown'].includes(mode)) toggle();
});

function updateHUD() {
  const place=race.finishPlace??order(race.racers).indexOf(race.player)+1;
  for (const [id,value] of [
    ['place',String(place)],['lap',race.lastLap+' / '+LAPS],
    ['time',formatTime(race.player.finished??race.time)],['speed',String(Math.round(race.player.speed/TOP_SPEED*124))],
  ]) if ($(id).textContent!==value) $(id).textContent=value;
  updateItemHUD();
  const distance=race.player.distance;
  const turn=Math.abs(race.player.x)>segmentAt(distance).width+.36?'트랙 이탈':approachingHairpin(distance)?'U자 우회전':segmentAt(distance).chicane||segmentAt(distance+1000).chicane?'S자 급커브':'';
  const turnHint=$('turnHint');
  turnHint.hidden=mode!=='playing'||!turn;
  if(turnHint.textContent!==turn) turnHint.textContent=turn;
  const {boost,turbo,itemBoost,chaseBoost,launchBoost,driftSide,driftCharge}=race.player;
  $('boost').hidden=launchBoost<=0&&chaseBoost<=0&&itemBoost<=0&&boost<=0&&turbo<=0;
  const boostLabel=launchBoost>0?'출발 부스트':chaseBoost>0?'추격 부스터':itemBoost>0?'터보 캔':boost>0?'BOOST':'미니터보';
  if($('boost').textContent!==boostLabel) $('boost').textContent=boostLabel;
  const tier=driftCharge>=DRIFT_SECOND?2:driftCharge>=DRIFT_FIRST?1:0;
  const driftLabel=tier===2?'강한 미니터보':tier===1?'미니터보 준비':'드리프트';
  $('driftStatus').hidden=!driftSide;
  $('driftStatus').dataset.tier=String(tier);
  if($('driftLabel').textContent!==driftLabel) $('driftLabel').textContent=driftLabel;
  $('driftFill').style.width=Math.min(1,driftCharge/DRIFT_SECOND)*100+'%';
}

function updateItemHUD() {
  const dock=$('itemDock'), items=race.player.items;
  dock.hidden=mode==='title';
  for(const [index,id] of ['heldItem','reserveItem'].entries()) {
    const field=$(id), type=items[index]?.type??'', name=ITEMS[type]??'비어 있음';
    if(field.textContent!==name) field.textContent=name;
    if(field.parentElement.dataset.item!==type) field.parentElement.dataset.item=type;
  }
  const count=items.length+' / '+ITEM_CAPACITY;
  if($('itemCount').textContent!==count) $('itemCount').textContent=count;
  itemButton.disabled=!items.length||mode!=='playing';
  const label=items.length?ITEMS[items[0].type]+' 사용, '+items.length+'개 보유':'아이템 없음';
  if(itemButton.getAttribute('aria-label')!==label) itemButton.setAttribute('aria-label',label);
  const notice=$('itemNotice'), event=race.itemEvent;
  notice.hidden=!event||event.until<=race.time||mode!=='playing';
  if(!notice.hidden) {
    const name=ITEMS[event.item];
    const messages={picked:name+' 획득',used:name+' 사용',blocked:'실드로 충격 방어',slipped:event.item==='pulse'?'펄스에 밀림':event.item==='disc'?'코일 디스크 피격':'슬립 패드에 미끄러짐'};
    if(notice.textContent!==messages[event.type]) notice.textContent=messages[event.type];
  }
}

const fixedStep=1/120;
let paintedRace, paintedTime=-1, paintedWidth=0, paintedHeight=0;
function frame(now) {
  requestAnimationFrame(frame);
  let elapsed=Math.min(.075,(now-previous)/1000);
  previous=now;
  if (!active || document.hidden) return;
  if (mode==='countdown') {
    const signal=String(Math.max(1,Math.ceil((deadline-now)/1000)));
    if (now>=deadline) {
      elapsed=Math.min(elapsed,(now-deadline)/1000);
      const heldFor=launchPress!==null&&readInput().drift?(deadline-launchPress)/1000:0;
      const launched=race.time===0&&launchRace(race,heldFor);
      launchPress=null;
      mode='playing';
      goUntil=now+600;
      setOverlay();
      if(launched){launchedUntil=now+1150;sound.effect('launch');}
      else tone(730,.18);
    } else if (lastSignal!==signal) {
      lastSignal=signal;
      $('countdown').textContent=signal;
      tone(420);
    }
  }
  if (mode==='playing') {
    accumulator+=elapsed;
    const input=readInput();
    const lap=race.lastLap;
    const boost=race.player.boost, turbo=race.player.turbo;
    const charge=race.player.driftCharge, itemEvent=race.itemEvent, contact=race.contact;
    while (accumulator>=fixedStep && race.player.finished===null) {
      stepRace(race,fixedStep,input);
      if(input.useItem){itemQueued=false;input.useItem=false;}
      accumulator-=fixedStep;
    }
    if(race.contact && race.contact!==contact && Math.hypot(race.contact.x-race.player.worldX,race.contact.z-race.player.worldZ)<820) sound.effect('contact');
    if(race.itemEvent && race.itemEvent!==itemEvent) {
      const {type,item}=race.itemEvent;
      sound.effect(type==='used'?item:type);
    }
    if (race.lastLap!==lap) tone(640,.22);
    if ((race.player.boost>0 && boost===0) || (race.player.turbo>0 && turbo===0)) sound.effect('turbo');
    if (charge<DRIFT_FIRST && race.player.driftCharge>=DRIFT_FIRST) tone(520,.08);
    if (charge<DRIFT_SECOND && race.player.driftCharge>=DRIFT_SECOND) tone(690,.10);
    if (race.player.finished!==null) finish();
  }
  if (mode==='playing') {
    const starting=now<goUntil;
    $('countdown').hidden=!starting;
    if (starting) $('countdown').textContent='GO!';
  }
  updateLaunchHint(now);
  updateHUD();
  updateEngine();
  if (paintedRace!==race || paintedTime!==race.time || paintedWidth!==canvas.width || paintedHeight!==canvas.height) {
    drawRace(context,race,race.time);
    if(!courseMap.hidden) drawMinimap(mapContext,race);
    paintedRace=race;
    paintedTime=race.time;
    paintedWidth=canvas.width;
    paintedHeight=canvas.height;
  }
}
resize();
setOverlay();
drawRace(context,race,0);
requestAnimationFrame(frame);

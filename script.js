// 생성한 배경·투명 스프라이트와 Canvas 조명을 조합한 게임 루프 화면입니다.
const canvas = document.getElementById("game");
const screenCtx = canvas.getContext("2d");
const worldCanvas = document.createElement("canvas");
worldCanvas.width = 400; worldCanvas.height = 300;
const worldCtx = worldCanvas.getContext("2d");
let ctx = worldCtx;
const player = { x: 377, y: 292, size: 46, color: "#31ffa6", spriteWidth: 90, spriteHeight: 90, direction: 0, moving: false };
// 직접 튜닝할 값: 한 프레임의 기준 이동량입니다. 1, 3, 5 등을 비교해 보세요.
let droneSpeed = 1;
// 직접 튜닝할 플레이어 속도입니다. 드론 속도와 별개입니다.
let playerSpeed = 2;
const keys = {};
// camera는 월드에서 화면 왼쪽 위가 가리키는 위치입니다.
const camera = { x: 0, y: 0 };
let walkFrame = 0;
let sideGaitPhase = 0;
// 균등 분할 대신 실제 그림 경계를 사용해 다음 행의 머리가 섞이지 않게 합니다.
const idleFrames = [
  { x: 91, y: 18, w: 211, h: 293 },
  { x: 130, y: 367, w: 155, h: 316 },
  { x: 102, y: 714, w: 157, h: 315 },
  { x: 89, y: 1061, w: 216, h: 324 }
];
const walkingFrames = [
  [{ x:159,y:64,w:209,h:315 }, { x:655,y:64,w:210,h:315 }],
  [{ x:151,y:425,w:231,h:309 }, { x:651,y:424,w:222,h:311,flip:true }],
  [{ x:160,y:779,w:240,h:307 }, { x:627,y:780,w:240,h:303,flip:true }],
  [{ x:162,y:1137,w:205,h:332 }, { x:661,y:1136,w:198,h:332 }]
];
const enemies = [
  { x: 210, y: 220, vx: 0.8, vy: 0.55, radius: 20 },
  { x: 610, y: 245, vx: -0.65, vy: 0.8, radius: 20 },
  { x: 565, y: 435, vx: 0.55, vy: -0.65, radius: 20 }
];
let motionFrame = 0;
let floorPattern = null;
const droneSize = { width: 82, height: 52 };
const mapChunkSize = 640;
const itemChunks = new Map();
let visibleCores = [];
// 드론 수는 3대로 유지하고 첫 등장 시점을 조금씩 나눕니다.
for (let i = 0; i < enemies.length; i++) {
  enemies[i].active = false;
  enemies[i].spawnDelay = i * 100;
}

// 같은 모양과 조명을 반복해서 그릴 수 있도록 작은 함수로 나눕니다.
function polygon(points, fill, stroke) {
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function circle(x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
}
function line(x, y, x2, y2, color, width = 1) {
  ctx.strokeStyle = color; ctx.lineWidth = width;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.lineWidth = 1;
}
function label(text, x, y, size = 12, color = "#9cabb6", weight = "normal") {
  ctx.fillStyle = color; ctx.font = `${weight} ${size}px monospace`; ctx.fillText(text, x, y);
}
function glow(x, y, radius, color) {
  const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, color); light.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = light; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

// 모든 이미지 로딩을 마치면 게임 루프를 한 번만 시작합니다.
const floorImage = new Image();
const survivorImage = new Image();
const survivorWalkImage = new Image();
const droneImage = new Image();
const energyImage = new Image();
let pendingImages = 5;
function finishImageLoad() {
  pendingImages -= 1;
  if (pendingImages === 0) requestAnimationFrame(gameLoop);
}
for (const [image, path] of [
  [floorImage, "assets/floor-tile.jpg"],
  [survivorImage, "assets/survivor-directions.png"],
  [survivorWalkImage, "assets/survivor-walk.png"],
  [droneImage, "assets/drone-directions.png"],
  [energyImage, "assets/energy-core.png"]
]) {
  image.onload = finishImageLoad;
  image.onerror = finishImageLoad;
  image.src = path;
}

// 측면 보행은 두 다리를 반대 주기로 계산해 한 발이 고정되는 현상을 막습니다.
function sideLegPose(phase) {
  return { stride: Math.sin(phase) * 10, lift: Math.max(0, Math.cos(phase)) * 5 };
}
function drawSideLeg(px, footY, phase, facing, near) {
  const pose = sideLegPose(phase);
  const hipX = px + (near ? 2 : -2);
  const kneeX = hipX + facing * pose.stride * 0.45;
  const kneeY = footY - 16 - pose.lift * 0.3;
  const ankleX = hipX + facing * pose.stride;
  const ankleY = footY - 2 - pose.lift;
  // 바깥 윤곽, 장갑판, 하이라이트를 겹쳐 기존 상체의 금속색과 맞춥니다.
  ctx.save();
  ctx.lineCap = "round";
  line(hipX, footY - 30, kneeX, kneeY, "#121a1d", 9);
  line(hipX, footY - 29, kneeX, kneeY, near ? "#667267" : "#3b4944", 6);
  circle(kneeX, kneeY, 4, near ? "#7c8877" : "#48584f", "#1b2726");
  line(kneeX, kneeY + 2, ankleX, ankleY, "#172023", 8);
  line(kneeX, kneeY + 2, ankleX, ankleY, near ? "#53655b" : "#34463e", 5);
  line(kneeX, kneeY + 4, ankleX, ankleY - 1, "#8b96813b", 1);
  polygon([[ankleX-4,ankleY-3],[ankleX+4,ankleY-3],
    [ankleX+4+facing*5,ankleY+2],[ankleX-4+facing*5,ankleY+3]],
    near ? "#647367" : "#394a40", "#14201e");
  ctx.restore();
}
function drawSideWalk(px, py) {
  const frame = idleFrames[player.direction];
  const scale = 76 / frame.h;
  const facing = player.direction === 1 ? -1 : 1;
  const footY = py + 38;
  drawSideLeg(px, footY, sideGaitPhase + Math.PI, facing, false);
  drawSideLeg(px, footY, sideGaitPhase, facing, true);
  // 원래 상체만 사용합니다. 하체는 별도 계산하므로 기존 발이 겹치지 않습니다.
  const upperHeight = Math.floor(frame.h * 0.61);
  ctx.drawImage(survivorImage, frame.x, frame.y, frame.w, upperHeight,
    px - frame.w * scale / 2, footY - 76, frame.w * scale, upperHeight * scale);
}

function drawScene() {
ctx = worldCtx;
ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
ctx.imageSmoothingEnabled = false;

ctx.fillStyle = "#17232b"; ctx.fillRect(0, 0, 800, 600);
ctx.save();
ctx.beginPath(); ctx.rect(0, 99, 800, 428); ctx.clip();
// 바깥은 화면 좌표로 자르고, 안쪽 장면은 월드 좌표로 그립니다.
ctx.translate(-camera.x, -camera.y);
if (floorImage.complete && floorImage.naturalWidth > 0) {
  // 패턴은 첫 프레임에 한 번만 만들어 재사용합니다.
  if (!floorPattern) {
  // 반사 타일은 맞닿는 가장자리의 픽셀을 연결합니다.
  const tileSize = 400;
  const tile = document.createElement("canvas");
  tile.width = tileSize * 2; tile.height = tileSize * 2;
  const tileCtx = tile.getContext("2d");
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      tileCtx.save();
      tileCtx.translate(col ? tileSize * 2 : 0, row ? tileSize * 2 : 0);
      tileCtx.scale(col ? -1 : 1, row ? -1 : 1);
      tileCtx.drawImage(floorImage, 0, 0, tileSize, tileSize);
      tileCtx.restore();
    }
  }
  // repeat 패턴으로 가로·세로 모두 반복합니다. 월드 좌표 원점을 기준으로 반복합니다.
  floorPattern = ctx.createPattern(tile, "repeat");
  }
  ctx.fillStyle = floorPattern;
  ctx.fillRect(camera.x, camera.y + 99, 800, 428);
  ctx.fillStyle = "rgba(5,17,24,0.28)"; ctx.fillRect(camera.x, camera.y + 99, 800, 428);
} else {
  label("배경 이미지를 불러오지 못했습니다", 24, 130, 12);
}
glow(camera.x + 400,camera.y + 310,270,"rgba(31,128,129,0.12)");
// 생존자: 투명 이미지의 바깥 여백을 제외하고 몸체를 그립니다.
const px = player.x + player.size / 2, py = player.y + player.size / 2;
glow(px, py + 10, 65, "rgba(38,255,174,0.12)");
ctx.fillStyle = "#00000065";
ctx.beginPath(); ctx.ellipse(px + 4, py + 30, 25, 10, -0.15, 0, Math.PI * 2); ctx.fill();
if (survivorImage.naturalWidth > 0) {
  if (player.moving && (player.direction === 1 || player.direction === 2)) {
    drawSideWalk(px, py);
  } else {
  const walking = player.moving && survivorWalkImage.naturalWidth > 0;
  const frame = walking ? walkingFrames[player.direction][walkFrame] : idleFrames[player.direction];
  const image = walking ? survivorWalkImage : survivorImage;
  const height = 76;
  const width = frame.w * height / frame.h;
  // 모든 프레임의 발 기준점을 맞춰 걷는 동안 몸이 위아래로 튀지 않게 합니다.
  ctx.save();
  ctx.translate(px, py + 38);
  if (frame.flip) ctx.scale(-1, 1);
  ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h, -width / 2, -height, width, height);
  ctx.restore();
  }
} else label("생존자 이미지 로딩 실패", px - 65, py, 11, "#ffb8b8");

// 드론: 진행 방향에 해당하는 행과 추진기 모션 프레임을 그립니다.
for (const enemy of enemies) {
  if (!enemy.active) continue;
  glow(enemy.x, enemy.y + 7, 55, "rgba(255,45,100,0.10)");
  ctx.fillStyle = "#00000055";
  ctx.beginPath(); ctx.ellipse(enemy.x + 4, enemy.y + 23, 32, 11, 0, 0, Math.PI * 2); ctx.fill();
  if (droneImage.naturalWidth > 0) {
    const row = Math.abs(enemy.vx) >= Math.abs(enemy.vy)
      ? (enemy.vx < 0 ? 1 : 2) : (enemy.vy < 0 ? 3 : 0);
    const cellWidth = droneImage.naturalWidth / 3;
    const cellHeight = droneImage.naturalHeight / 4;
    ctx.drawImage(droneImage, motionFrame * cellWidth, row * cellHeight, cellWidth, cellHeight,
      enemy.x - droneSize.width / 2, enemy.y - droneSize.width / 2,
      droneSize.width, droneSize.width);
  } else {
    label("드론 이미지 로딩 실패", enemy.x - 60, enemy.y, 11, "#ffb8b8");
  }
}

// 현재 구역과 인접 구역에 생성된 코어만 그립니다. 획득 기능은 아직 없습니다.
for (const core of visibleCores) {
  const ex = core.x, ey = core.y;
  if (ex < camera.x - 40 || ex > camera.x + 840 || ey < camera.y + 59 || ey > camera.y + 567) continue;
  glow(ex, ey, 40, "rgba(166,255,86,0.13)");
  ctx.strokeStyle = "#b4ec7455";
  ctx.beginPath(); ctx.ellipse(ex, ey + 19, 17, 5, 0, 0, Math.PI * 2); ctx.stroke();
  if (energyImage.naturalWidth > 0) {
    ctx.drawImage(energyImage, 0, 0, energyImage.naturalWidth / 2, energyImage.naturalHeight / 2,
      ex - 27, ey - 27, 54, 54);
  } else circle(ex, ey, 8, "#baff75");
}
// 먼지와 빛 입자를 고정 좌표에 그립니다.
for(let i=0;i<32;i++) {
  const x=camera.x+60+(i*137)%680,y=camera.y+170+(i*71)%300;
  ctx.fillStyle=i%3===0?"#b8e3d750":"#b6c7ce18";ctx.fillRect(x,y,1,i%4===0?3:1);
}
// 주변을 약하게 어둡게 해 중앙을 강조합니다.
const vignette=ctx.createRadialGradient(camera.x+400,camera.y+310,140,camera.x+400,camera.y+310,440);
vignette.addColorStop(0,"#00000000");vignette.addColorStop(1,"#00000035");
ctx.fillStyle=vignette;ctx.fillRect(camera.x,camera.y+99,800,428);

// 저해상도 월드를 두 배로 확대합니다. HUD는 화면에 고정합니다.
ctx.restore();
screenCtx.imageSmoothingEnabled = false;

screenCtx.drawImage(worldCanvas, 0, 0, 800, 600);
ctx = screenCtx;
ctx.fillStyle="rgba(6,12,18,0.94)";ctx.fillRect(0,0,800,99);ctx.fillRect(0,527,800,73);
line(24,98,776,98,"#36434b");line(24,527,776,527,"#36434b");
label("N / S",24,29,13,"#9fddb9","bold");
label("SURVIVAL SYSTEM     /     SECTOR 07",80,28,9,"#849695");
label("NEON SURVIVOR",24,61,30,"#e5ebe6","bold");
label("끝없이 이어지는 구역을 탐색하며 살아남으세요",26,82,11,"#8a9d9f");
line(414,22,414,77,"#303a43");
label("SCORE",438,30,9);label("0000",437,59,25,"#e9efea","bold");
label("SURVIVAL",546,30,9);label("00:00",545,59,25,"#e9efea","bold");
label("VITALS",667,30,9);label("3 / 3",739,30,9,"#94c9a4");
for(let i=0;i<3;i++) {
  polygon([[667+i*34,42],[693+i*34,42],[689+i*34,58],[663+i*34,58]],"#83c6a0");
}
label("FIELD STATUS",25,550,9,"#60777e");
label("DRONE " + enemies.filter(e => e.active).length,130,550,11,"#f49aaf");label("에너지 +10",205,550,11,"#bddc8e");
label("체력 3 · 피격 후 1초 무적",310,550,11,"#9bafae");
ctx.textAlign="right";label("OPEN WORLD / INPUT DEMO",775,550,9,"#738a91");ctx.textAlign="left";
label("방향키로 탐색 · 충돌·점수·체력 기능은 아직 구현하지 않았습니다",25,581,11,"#778b94");
ctx.textAlign="right";label("VIEW 800 × 600",775,581,9,"#778b94");ctx.textAlign="left";

}

// 드론은 완전히 보이지 않는 바깥쪽에서 생성하고 플레이어 주변을 향해 진입합니다.
function spawnDrone(enemy) {
  const margin = 75;
  const side = Math.floor(Math.random() * 4);
  if (side === 0 || side === 1) {
    enemy.x = camera.x + (side === 0 ? -margin : canvas.width + margin);
    enemy.y = camera.y + 99 + Math.random() * 428;
  } else {
    enemy.x = camera.x + Math.random() * canvas.width;
    enemy.y = camera.y + (side === 2 ? 99 - margin : 527 + margin);
  }
  const targetX = player.x + player.size / 2 + (Math.random() - 0.5) * 200;
  const targetY = player.y + player.size / 2 + (Math.random() - 0.5) * 140;
  const dx = targetX - enemy.x, dy = targetY - enemy.y;
  const distance = Math.hypot(dx, dy) || 1;
  const speed = 0.8 + Math.random() * 0.25;
  enemy.vx = dx / distance * speed;
  enemy.vy = dy / distance * speed;
  enemy.active = true;
}
function updateDrones() {
  for (const enemy of enemies) {
    if (!enemy.active) {
      if (enemy.spawnDelay > 0) { enemy.spawnDelay--; continue; }
      spawnDrone(enemy);
    }
    enemy.x += enemy.vx * droneSpeed;
    enemy.y += enemy.vy * droneSpeed;
    // 충분히 멀어진 적은 즉시 순간이동시키지 않고 잠시 뒤 새로 진입시킵니다.
    if (enemy.x < camera.x - 180 || enemy.x > camera.x + 980 ||
        enemy.y < camera.y - 81 || enemy.y > camera.y + 707) {
      enemy.active = false;
      enemy.spawnDelay = 45 + Math.floor(Math.random() * 90);
    }
  }
}

// 구역 첫 방문 때 난수로 생성합니다. 유지 중인 구역에서는 위치가 흔들리지 않습니다.
function updateMapItems() {
  const minX = Math.floor(camera.x / mapChunkSize) - 1;
  const maxX = Math.floor((camera.x + 800) / mapChunkSize) + 1;
  const minY = Math.floor((camera.y + 99) / mapChunkSize) - 1;
  const maxY = Math.floor((camera.y + 527) / mapChunkSize) + 1;
  const activeKeys = new Set();
  visibleCores = [];
  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      const key = cx + ":" + cy;
      activeKeys.add(key);
      if (!itemChunks.has(key)) {
        const cores = [];
        for (let i = 0; i < 2; i++) {
          // 두 코어는 구역의 서로 다른 절반에서 무작위 위치를 고릅니다.
          cores.push({ x: cx * mapChunkSize + 50 + i * 320 + Math.random() * 220,
            y: cy * mapChunkSize + 60 + Math.random() * 520 });
        }
        itemChunks.set(key, cores);
      }
      visibleCores.push(...itemChunks.get(key));
    }
  }
  // 장시간 탐색해도 메모리가 계속 늘지 않도록 먼 구역의 기록을 정리합니다.
  for (const key of itemChunks.keys()) {
    if (itemChunks.size <= 128) break;
    if (!activeKeys.has(key)) itemChunks.delete(key);
  }
}

function gameLoop(timestamp) {
  // ① 지우기: 화면과 저해상도 월드의 지난 프레임을 없앱니다.
  worldCtx.setTransform(1, 0, 0, 1, 0, 0);
  worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
  screenCtx.clearRect(0, 0, canvas.width, canvas.height);

  // ② 계산: 드론 위치와 표시할 모션 프레임을 갱신합니다.
  updatePlayer();
  updateCamera();
  updateMapItems();
  updateDrones();
  if (player.moving) sideGaitPhase += playerSpeed * 0.1;
  walkFrame = player.moving ? Math.floor(timestamp / 180) % 2 : 0;
  motionFrame = Math.floor(timestamp / 160) % 3;

  // ③ 그리기: 배경, 캐릭터, 아이템, HUD를 다시 그립니다.
  drawScene();

  // ④ 다음 프레임 예약: 루프는 이 한 곳에서만 반복합니다.
  requestAnimationFrame(gameLoop);
}


// 방식 B: 이벤트에서는 키 상태만 기록하고, 위치 계산은 루프에서 합니다.
const controlKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
document.addEventListener("keydown", function (e) {
  if (controlKeys.includes(e.key)) {
    e.preventDefault();
    keys[e.key] = true;
  }
});
document.addEventListener("keyup", function (e) {
  if (controlKeys.includes(e.key)) {
    e.preventDefault();
    keys[e.key] = false;
  }
});
function releaseKeys() {
  for (const key of Object.keys(keys)) keys[key] = false;
}
// 탭을 바꾸거나 창 밖에서 손을 뗐을 때 계속 이동하는 현상을 막습니다.
window.addEventListener("blur", releaseKeys);
document.addEventListener("visibilitychange", function () {
  if (document.hidden) releaseKeys();
});

function updatePlayer() {
  let moveX = 0;
  let moveY = 0;
  // 각 if를 따로 검사하므로 두 키를 누르면 대각선으로 이동합니다.
  if (keys["ArrowLeft"]) moveX = moveX - 1;
  if (keys["ArrowRight"]) moveX = moveX + 1;
  if (keys["ArrowUp"]) moveY = moveY - 1;
  if (keys["ArrowDown"]) moveY = moveY + 1;
  const length = Math.hypot(moveX, moveY);
  if (length > 0) {
    // 대각선에서도 직선과 같은 속도를 유지합니다.
    player.x = player.x + moveX / length * playerSpeed;
    player.y = player.y + moveY / length * playerSpeed;
  }
  player.moving = length > 0;
  // 마지막 방향을 유지하므로 손을 떼어도 대기 자세가 같은 방향을 바라봅니다.
  if (moveY < 0) player.direction = 3;
  else if (moveY > 0) player.direction = 0;
  else if (moveX < 0) player.direction = 1;
  else if (moveX > 0) player.direction = 2;
  // 월드 이동에는 화면 크기를 기준으로 한 벽이나 제한을 두지 않습니다.
}

function updateCamera() {
  // 플레이어를 HUD 아래의 게임 영역 중앙에 유지합니다.
  camera.x = Math.round(player.x + player.size / 2 - canvas.width / 2);
  camera.y = Math.round(player.y + player.size / 2 - (99 + 428 / 2));
}

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
const enemies = [
  { x: 210, y: 220, vx: 0.8, vy: 0.55, radius: 20 },
  { x: 610, y: 245, vx: -0.65, vy: 0.8, radius: 20 },
  { x: 565, y: 435, vx: 0.55, vy: -0.65, radius: 20 }
];
let motionFrame = 0;
let floorPattern = null;
const droneSize = { width: 82, height: 52 };
const energy = { x: 285, y: 410, size: 16 };

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
const droneImage = new Image();
const energyImage = new Image();
let pendingImages = 4;
function finishImageLoad() {
  pendingImages -= 1;
  if (pendingImages === 0) requestAnimationFrame(gameLoop);
}
for (const [image, path] of [
  [floorImage, "assets/floor-tile.jpg"],
  [survivorImage, "assets/survivor-directions.png"],
  [droneImage, "assets/drone-directions.png"],
  [energyImage, "assets/energy-core.png"]
]) {
  image.onload = finishImageLoad;
  image.onerror = finishImageLoad;
  image.src = path;
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
  ctx.fillStyle = "rgba(5,17,24,0.28)"; ctx.fillRect(0, 99, 800, 428);
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
  // 행은 아래·왼쪽·오른쪽·위, 열은 대기·걷기 A·걷기 B입니다.
  const cellWidth = survivorImage.naturalWidth / 3;
  const cellHeight = survivorImage.naturalHeight / 4;
  ctx.drawImage(survivorImage, walkFrame * cellWidth, player.direction * cellHeight, cellWidth, cellHeight,
    px - player.spriteWidth / 2, py - player.spriteHeight / 2,
    player.spriteWidth, player.spriteHeight);
} else {
  label("생존자 이미지 로딩 실패", px - 65, py, 11, "#ffb8b8");
}

// 드론: 진행 방향에 해당하는 행과 추진기 모션 프레임을 그립니다.
for (const enemy of enemies) {
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

// 코어 시트의 첫 칸만 정적으로 표시합니다. 회전·부유 재생은 이후 단계입니다.
const ex = energy.x + energy.size / 2, ey = energy.y + energy.size / 2;
glow(ex, ey, 40, "rgba(166,255,86,0.13)");
ctx.strokeStyle = "#b4ec7455";
ctx.beginPath(); ctx.ellipse(ex, ey + 19, 17, 5, 0, 0, Math.PI * 2); ctx.stroke();
if (energyImage.naturalWidth > 0) {
  ctx.drawImage(energyImage, 0, 0, energyImage.naturalWidth / 2, energyImage.naturalHeight / 2,
    ex - 27, ey - 27, 54, 54);
} else {
  circle(ex, ey, 8, "#baff75");
}
// 먼지와 빛 입자를 고정 좌표에 그립니다.
for(let i=0;i<32;i++) {
  const x=camera.x+60+(i*137)%680,y=camera.y+170+(i*71)%300;
  ctx.fillStyle=i%3===0?"#b8e3d750":"#b6c7ce18";ctx.fillRect(x,y,1,i%4===0?3:1);
}
// 주변을 약하게 어둡게 해 중앙을 강조합니다.
const vignette=ctx.createRadialGradient(camera.x+400,camera.y+310,140,camera.x+400,camera.y+310,440);
vignette.addColorStop(0,"#00000000");vignette.addColorStop(1,"#00000035");
ctx.fillStyle=vignette;ctx.fillRect(camera.x,camera.y+100,800,425);

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
label("적 03",130,550,11,"#f49aaf");label("에너지 +10",205,550,11,"#bddc8e");
label("체력 3 · 피격 후 1초 무적",310,550,11,"#9bafae");
ctx.textAlign="right";label("OPEN WORLD / INPUT DEMO",775,550,9,"#738a91");ctx.textAlign="left";
label("방향키로 탐색 · 충돌·점수·체력 기능은 아직 구현하지 않았습니다",25,581,11,"#778b94");
ctx.textAlign="right";label("VIEW 800 × 600",775,581,9,"#778b94");ctx.textAlign="left";

}

// 드론도 월드 좌표로 이동합니다. 카메라 밖으로 완전히 나가면 반대편 바깥에 재배치합니다.
function updateDrones() {
  const half = droneSize.width / 2;
  const minX = camera.x - half;
  const maxX = camera.x + canvas.width + half;
  const minY = camera.y + 99 - half;
  const maxY = camera.y + 527 + half;
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  for (const enemy of enemies) {
    enemy.x = enemy.x + enemy.vx * droneSpeed;
    enemy.y = enemy.y + enemy.vy * droneSpeed;
    if (enemy.x > maxX || enemy.x < minX) {
      enemy.x = ((enemy.x - minX) % spanX + spanX) % spanX + minX;
    }
    if (enemy.y > maxY || enemy.y < minY) {
      enemy.y = ((enemy.y - minY) % spanY + spanY) % spanY + minY;
    }
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
  updateDrones();
  walkFrame = player.moving ? 1 + Math.floor(timestamp / 140) % 2 : 0;
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

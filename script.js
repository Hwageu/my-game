// ===== ①. 준비 — Canvas와 그리기 도구 =====


// 생성한 배경·투명 스프라이트와 Canvas 조명을 조합한 게임 루프 화면입니다.
const canvas = document.getElementById("game");
const screenCtx = canvas.getContext("2d");
const worldCanvas = document.createElement("canvas");
worldCanvas.width = 400; worldCanvas.height = 300;
const worldCtx = worldCanvas.getContext("2d");
let ctx = worldCtx;

// ===== ②. 상태 변수와 설정 =====


const player = { x: 377, y: 292, size: 46, color: "#31ffa6", spriteWidth: 90, spriteHeight: 90, direction: 0, moving: false };
// 직접 튜닝할 값: 한 프레임의 기준 이동량입니다. 1, 3, 5 등을 비교해 보세요.
let droneSpeed = 1.15;
const droneSpeedInterval = 20; // 이 시간(초)마다 속도를 올립니다.
const droneSpeedStep = 0.1;
const maxDroneSpeedMultiplier = 1.8;
// 난이도 설정: 드론 4대, 이전 기준보다 이동 속도 15% 증가.
const initialEnemyCount = 4;
const enemyCountInterval = 10; // 10초마다 드론 한 대를 추가합니다.
const maxEnemyCount = 12;
const hunterStartTime = 12; // 조작을 익힌 뒤 추적 드론이 진입합니다.
const hunterSpeed = 0.65;
const hunterNearSpeed = 0.95;
const hunterDetectionRange = 220;
let endMessages = { low: ["다음 구역에 다시 도전!"], mid: ["코어 수집이 익숙해졌어요"], high: ["멋진 탐색이었어요!"] };
let gameOverMessage = "";
let previousMessage = "";
const droneSize = { width: 82, height: 52 };
// 충돌 실습 중에는 true, 최종 제출 때는 false로 바꿉니다.
let showDebug = false; // D키로 켜서 확인하고, 제출 상태에서는 꺼 둡니다.
let showHitbox = showDebug;
// 직접 튜닝할 플레이어 속도입니다. 드론 속도와 별개입니다.
let playerSpeed = 2;
const keys = {};
const joystickKeys = {};
let fpsActive = false;
const joystick = document.querySelector(".joystick");
// camera는 월드에서 화면 왼쪽 위가 가리키는 위치입니다.
const camera = { x: 0, y: 0 };
let walkFrame = 0;
let sideWalkFrame = 0;
const sideWalkFrameMs = 320; // 좌우 보행은 한 자세를 더 오래 표시합니다.
const sideWalkFrames = [{"x":224,"y":64,"w":512,"h":747},{"x":1016,"y":81,"w":545,"h":723}];
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
const enemies = [];
let motionFrame = 0;
let floorPattern = null;
const mapChunkSize = 640;
const itemChunks = new Map();
let visibleCores = [];
// 코어 한 개당 10점입니다.
let score = 0;
const highScoreKey = "neon-survivor-high-score";
let highScore = loadHighScore();
let isNewRecord = false;
let gameState = "start";
let pauseStartedAt = 0;
let pausedDuration = 0;
let resumeDeadline = 0;
function gameNow() { return (pauseStartedAt || Date.now()) - pausedDuration; }
function pauseGame() {
  if (gameState === "countdown") { gameState = "paused"; resumeDeadline = 0; releaseKeys(); return; }
  if (gameState !== "playing") return;
  pauseStartedAt = Date.now(); gameState = "paused"; releaseKeys();
  if (backgroundMusic) backgroundMusic.pause();
}
function resumeGame() {
  if (gameState !== "paused") return;
  resumeDeadline = Date.now() + 3000; gameState = "countdown";
}

const maxHealth = 3;
let health = maxHealth;
let collectedCoreCount = 0;
let invincibleUntil = 0;
let lastHitTime = null;
let startTime = null;
let elapsedSeconds = 0;
// 공개용 키 — 비밀 키를 넣지 말 것. 서버 권한 검증 후에만 enabled를 true로 바꿉니다.
const rankingConfig = { enabled: true, url: "https://lyqamxabwefmuyxyfplz.supabase.co", publishableKey: "sb_publishable_CoNYFetz1_k5Ull-oFiR0w_7Q69Unnp" };
let rankingRows = [];
let rankingStatus = "";
let showLeaderboard = false;
let rankSubmitted = false;
let rankSubmitting = false;
let runId = 0;
let isMuted = false;
const soundEffects = {
  point: makeSound("assets/point.wav", 0.45),
  hit: makeSound("assets/hit.wav", 0.5),
  gameover: makeSound("assets/gameover.wav", 0.45)
};
const backgroundMusic = makeSound("assets/ambience.wav", 0.65);
if (backgroundMusic) backgroundMusic.loop = true;

// 개수만 바꾸면 이동·그리기 반복문을 고치지 않아도 됩니다.
for (let i = 0; i < initialEnemyCount; i++) {
  enemies.push({
    x: 0, y: 0, vx: 0, vy: 0,
    speed: 0.8 + (i % 3) * 0.125,
    isHunter: i === 0, active: false, spawnDelay: i * 100
  });
}

// 모든 이미지 로딩을 마치면 게임 루프를 한 번만 시작합니다.
const floorImage = new Image();
const survivorImage = new Image();
const survivorWalkImage = new Image();
const survivorSideImage = new Image();
const droneImage = new Image();
const energyImage = new Image();
let pendingImages = 6;

// ===== ③. 이벤트 — 키 입력과 해제 =====


// 방식 B: 이벤트에서는 키 상태만 기록하고, 위치 계산은 루프에서 합니다.
const controlKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "];
document.addEventListener("keydown", function (e) {
  if (fpsActive) return;
  if (e.key.startsWith("Arrow") && !["INPUT", "TEXTAREA"].includes(e.target?.tagName) &&
      !e.ctrlKey && !e.metaKey && !e.altKey) {
    joystickKeys[e.key] = true;
    updateJoystick();
  }
  if (!document.getElementById("arcadeMenu").hidden) {
    if (["ArrowUp", "ArrowDown", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      if (e.key === "ArrowUp") selectMenuGame(-1);
      else if (e.key === "ArrowDown") selectMenuGame(1);
      else if (!e.repeat) launchMenuGame();
    }
    return;
  }
  if (["INPUT", "TEXTAREA", "BUTTON"].includes(e.target?.tagName)) return;
  if ((e.key === "Escape" || e.key.toLowerCase() === "p") && !e.repeat) {
    e.preventDefault();
    if (gameState === "playing") pauseGame(); else if (gameState === "paused") resumeGame();
    return;
  }
  if (gameState === "paused" || gameState === "countdown") {
    if (e.key.toLowerCase() !== "m") return;
  }
  if (!e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && gameState !== "playing") {
    if (e.key === "l" || e.key === "L") {
      e.preventDefault(); showLeaderboard = !showLeaderboard;
      if (showLeaderboard) loadLeaderboard();
      return;
    }
    if ((e.key === "n" || e.key === "N") && gameState === "gameover") {
      e.preventDefault(); submitRanking(); return;
    }
  }
  if ((e.key === "m" || e.key === "M") && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    isMuted = !isMuted;
    for (const sound of [...Object.values(soundEffects), backgroundMusic]) {
      if (!sound) continue;
      sound.muted = isMuted;
      if (isMuted) {
        try { sound.pause(); sound.currentTime = 0; } catch {}
      }
    }
    if (!isMuted) startBackgroundMusic();
    return;
  }
  if (gameState === "start") {
    // 운영체제 단축키와 보조 키만 누른 경우는 시작 입력에서 제외합니다.
    if (e.ctrlKey || e.metaKey || e.altKey || e.repeat ||
        ["Shift", "Control", "Alt", "Meta", "Tab", "Escape"].includes(e.key)) return;
    e.preventDefault();
    resetGame();
    return;
  }
  if ((e.key === "d" || e.key === "D") && !e.repeat) {
    e.preventDefault();
    showDebug = !showDebug;
    showHitbox = showDebug;
    return;
  }
  if ((e.key === "r" || e.key === "R") && gameState === "gameover" && !e.repeat) {
    e.preventDefault();
    resetGame();
    return;
  }
  if (controlKeys.includes(e.key)) {
    e.preventDefault();
    keys[e.key] = true;
  }
});
canvas.addEventListener("pointerdown", function () {
  if (gameState === "start") resetGame();
});

document.addEventListener("keyup", function (e) {
  if (e.key.startsWith("Arrow")) {
    joystickKeys[e.key] = false;
    updateJoystick();
  }
  if (controlKeys.includes(e.key)) {
    e.preventDefault();
    keys[e.key] = false;
  }
});

// 탭을 바꾸거나 창 밖에서 손을 뗐을 때 계속 이동하는 현상을 막습니다.
window.addEventListener("blur", function () { releaseKeys(); pauseGame(); });
document.addEventListener("visibilitychange", function () {
  if (document.hidden) { releaseKeys(); pauseGame(); }
});

const rankForm = document.getElementById("rankForm");
if (rankForm) {
  rankForm.addEventListener("submit", function (e) {
    e.preventDefault(); submitRanking(document.getElementById("nickname").value);
  });
  document.getElementById("cancelRank").addEventListener("click", function () { showNicknameForm(false); });
}

// ===== ④. 함수들 — 계산과 화면 표시 =====


// 소리는 한 번만 만들고 재사용합니다. 실패해도 게임은 계속 실행합니다.
// 저장된 값은 글자이므로 숫자로 바꾼 뒤 비교합니다.
function loadHighScore() {
  try {
    const value = Number(localStorage.getItem(highScoreKey));
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
  } catch { return 0; }
}
function updateHighScore() {
  // 다른 탭에서 더 높은 기록을 저장했어도 낮추지 않습니다.
  highScore = Math.max(highScore, loadHighScore());
  isNewRecord = score > highScore;
  if (!isNewRecord) return;
  highScore = score;
  try { localStorage.setItem(highScoreKey, String(highScore)); }
  catch { /* 저장이 막혀도 현재 화면의 기록은 유지합니다. */ }
}

async function loadEndMessages() {
  try {
    const response = await fetch("messages.json");
    if (!response.ok) throw new Error("messages unavailable");
    const data = await response.json();
    for (const tier of ["low", "mid", "high"]) {
      if (!Array.isArray(data[tier])) continue;
      const valid = data[tier].filter(text => typeof text === "string" &&
        Array.from(text).length <= 20 && text.trim()).slice(0, 10);
      if (valid.length) endMessages[tier] = valid;
    }
  } catch { /* 로컬 파일 직접 열기와 오프라인에서도 기본 문구를 씁니다. */ }
}
function pickEndMessage() {
  const tier = score <= 30 ? "low" : score <= 80 ? "mid" : "high";
  const choices = endMessages[tier];
  const pool = choices.length > 1 ? choices.filter(text => text !== previousMessage) : choices;
  const result = pool[Math.floor(Math.random() * pool.length)] || choices[0];
  previousMessage = result;
  return result;
}

function rankingReady() {
  try {
    const url = new URL(rankingConfig.url);
    return rankingConfig.enabled && url.protocol === "https:" &&
      /^[a-z0-9-]+[.]supabase[.]co$/.test(url.hostname) && url.origin === rankingConfig.url &&
      /^sb_publishable_[A-Za-z0-9_-]+$/.test(rankingConfig.publishableKey);
  } catch { return false; }
}
async function rankRequest(query, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(rankingConfig.url + "/rest/v1/scores" + query, {
      ...options, signal: controller.signal,
      headers: { apikey: rankingConfig.publishableKey, "Content-Type": "application/json",
        Prefer: "return=minimal", ...options.headers }
    });
    if (!response.ok) throw new Error("ranking request failed");
    return options.method === "POST" ? null : await response.json();
  } finally { clearTimeout(timer); }
}
async function loadLeaderboard() {
  if (!rankingReady()) { rankingStatus = "온라인 랭킹 연결 준비 중"; return; }
  rankingStatus = "랭킹 불러오는 중...";
  try {
    const rows = await rankRequest("?select=name,score&order=score.desc,created_at.asc&limit=10");
    if (!Array.isArray(rows)) throw new Error("invalid ranking");
    rankingRows = rows.filter(row => typeof row.name === "string" &&
      Number.isSafeInteger(row.score) && row.score >= 0 && row.score <= 1000000)
      .map(row => ({name: Array.from(row.name).slice(0, 8).join(""), score: row.score}));
    rankingStatus = rankingRows.length ? "" : "첫 기록을 등록해 보세요";
  } catch { rankingStatus = "랭킹을 불러올 수 없습니다"; }
}
function showNicknameForm(show) {
  const form = document.getElementById("rankForm");
  if (!form) return;
  form.hidden = !show;
  if (show) document.getElementById("nickname").focus();
}
async function submitRanking(input) {
  if (gameState !== "gameover" || rankSubmitting || rankSubmitted) return;
  if (!rankingReady()) { rankingStatus = "온라인 랭킹 연결 준비 중"; showLeaderboard = true; return; }
  if (!Number.isSafeInteger(score) || score < 0 || score > 1000000) return;
  if (typeof input !== "string") { showNicknameForm(true); return; }
  const name = input.trim() || "익명";
  if (!/^[\p{L}\p{N}_ -]{1,8}$/u.test(name)) {
    rankingStatus = "닉네임은 글자·숫자·공백·_- 1~8자"; showLeaderboard = true; return;
  }
  showNicknameForm(false);
  const submittedRun = runId;
  rankSubmitting = true; showLeaderboard = true; rankingStatus = "등록 중...";
  try {
    await rankRequest("", {method: "POST", body: JSON.stringify({name, score})});
    if (runId !== submittedRun) return;
    rankSubmitted = true;
    await loadLeaderboard();
    if (runId === submittedRun && !rankingStatus) rankingStatus = "등록 완료";
  } catch { if (runId === submittedRun) rankingStatus = "등록 실패 — 네트워크를 확인해 주세요"; }
  finally { if (runId === submittedRun) rankSubmitting = false; }
}
function drawLeaderboard() {
  if (!showLeaderboard || gameState === "playing") return;
  ctx = screenCtx; ctx.save();
  ctx.fillStyle = "rgba(3,10,16,0.98)"; ctx.fillRect(155,110,490,405);
  ctx.strokeStyle = "#83c6a0"; ctx.strokeRect(155,110,490,405);
  ctx.textAlign = "center";
  label("ONLINE TOP 10",400,145,23,"#bddc8e","bold");
  for (let i = 0; i < rankingRows.length; i++) {
    const row = rankingRows[i];
    label((i + 1) + ". " + row.name + " — " + row.score,400,177+i*25,14,"#e5ebe6");
  }
  label(rankingStatus,400,455,12,"#9bafae");
  label(gameState === "gameover" ? "L 닫기 · N 닉네임 등록 · R 재시작" : "L 닫기",400,487,12,"#9bafae");
  ctx.restore();
}

function makeSound(source, volume) {
  try {
    const sound = new Audio(source);
    sound.preload = "auto";
    sound.volume = volume;
    sound.addEventListener("error", function () { sound.unavailable = true; });
    return sound;
  } catch { return null; }
}
function startBackgroundMusic() {
  if (isMuted || gameState !== "playing" || !backgroundMusic || backgroundMusic.unavailable) return;
  try {
    const playback = backgroundMusic.play();
    if (playback && typeof playback.catch === "function") playback.catch(() => {});
  } catch { /* 음원 오류가 게임 진행을 막지 않습니다. */ }
}
function stopBackgroundMusic() {
  if (!backgroundMusic) return;
  try { backgroundMusic.pause(); backgroundMusic.currentTime = 0; } catch {}
}
function playSound(name) {
  const sound = soundEffects[name];
  if (isMuted || !sound || sound.unavailable) return;
  try {
    sound.currentTime = 0;
    const playback = sound.play();
    if (playback && typeof playback.catch === "function") playback.catch(() => {});
  } catch { /* 소리 재생 실패로 게임을 멈추지 않습니다. */ }
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

function finishImageLoad() {
  pendingImages -= 1;
  if (pendingImages === 0) {
    updateCamera();
    updateMapItems();
    requestAnimationFrame(gameLoop);
  }
}

// 좌우 보행은 양발이 교차하는 전신 스프라이트만 사용합니다.
function drawSideWalk(px, py) {
  const frame = sideWalkFrames[sideWalkFrame];
  const height = 76;
  const width = frame.w * height / frame.h;
  ctx.save();
  ctx.translate(px, py + 38);
  // 두 원본 모두 왼쪽을 봅니다. 오른쪽은 전신을 함께 반사합니다.
  if (player.direction === 2) ctx.scale(-1, 1);
  ctx.drawImage(survivorSideImage, frame.x, frame.y, frame.w, frame.h,
    -width / 2, -height, width, height);
  ctx.restore();
}

// 그림의 투명 여백을 제외한 몸통을 판정합니다. 좌표는 그림과 같은 월드 좌표입니다.
function playerHitbox() {
  return { x: player.x + player.size / 2 - 14,
    y: player.y + player.size / 2 - 25, width: 28, height: 58 };
}
function enemyHitbox(enemy) {
  return { x: enemy.x - 24, y: enemy.y - 14, width: 48, height: 28 };
}
// 가로와 세로가 모두 겹쳐야 충돌입니다. 테두리만 맞닿은 상태는 제외합니다.
function checkCollision(a, b) {
  return a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;
}
// 무적 시간이 끝난 뒤 닿으면 한 번만 체력을 줄입니다.
function checkEnemyCollisions(now) {
  if (gameState !== "playing" || now < invincibleUntil) return;
  const body = playerHitbox();
  for (const enemy of enemies) {
    if (enemy.active && checkCollision(body, enemyHitbox(enemy))) {
      health -= 1;
      playSound(health === 0 ? "gameover" : "hit");
      invincibleUntil = now + 1000;
      lastHitTime = now;
      if (health === 0) {
        gameState = "gameover";
        stopBackgroundMusic();
        updateHighScore();
        gameOverMessage = pickEndMessage();
        if (rankingReady()) loadLeaderboard();
        player.moving = false;
        releaseKeys();
      }
      break; // 같은 순간 여러 적에게 닿아도 체력은 한 칸만 줄어듭니다.
    }
  }
}
// 코어의 빛과 투명 여백을 제외한 가운데 부분으로 획득을 판정합니다.
function coreHitbox(core) {
  return { x: core.x - 14, y: core.y - 18, width: 28, height: 36 };
}
function collectCores() {
  if (gameState !== "playing") return;
  const body = playerHitbox();
  for (const core of visibleCores) {
    if (!core.collected && checkCollision(body, coreHitbox(core))) {
      core.collected = true; // 다음 프레임에 같은 코어로 점수가 또 오르지 않게 합니다.
      score += 10;
      playSound("point");
      collectedCoreCount += 1;
      if (collectedCoreCount % 5 === 0) health = Math.min(maxHealth, health + 1);
    }
  }
  // 구역에 저장된 원본에도 획득 표시가 남아 다시 와도 되살아나지 않습니다.
  visibleCores = visibleCores.filter(core => !core.collected);
}

function drawHitboxes() {
  if (!showHitbox) return;
  ctx.save();
  ctx.strokeStyle = "#ff5050";
  ctx.lineWidth = 2;
  const boxes = [playerHitbox()];
  for (const enemy of enemies) {
    if (enemy.active) boxes.push(enemyHitbox(enemy));
  }
  for (const core of visibleCores) boxes.push(coreHitbox(core));
  for (const box of boxes) ctx.strokeRect(box.x, box.y, box.width, box.height);
  ctx.restore();
}

// 피격 효과는 캐릭터와 같은 월드 좌표로 그립니다.
function drawHitFeedback(now) {
  if (lastHitTime === null) return;
  const age = now - lastHitTime;
  if (age < 0 || age >= 1000) return;
  const x = player.x + player.size / 2;
  const y = player.y + player.size / 2;
  ctx.save();
  // 반복 점멸 없이 한 번 퍼지는 피격 테두리입니다.
  if (age < 350) {
    ctx.globalAlpha = 1 - age / 350;
    ctx.strokeStyle = "#ff8395";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 30 + age / 14, 0, Math.PI * 2); ctx.stroke();
    label("HIT -1", x - 25, y - 50 - age / 35, 14, "#ffb2bd", "bold");
  }
  if (gameState === "playing") {
    ctx.globalAlpha = 0.7 * (1 - age / 1000);
    ctx.strokeStyle = "#8cead4";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y, 31, 44, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawDebugInfo() {
  if (!showDebug) return;
  ctx = screenCtx;
  ctx.save();
  ctx.fillStyle = "rgba(3,10,16,0.92)";
  ctx.fillRect(12,110,340,105);
  label("DEBUG / D키로 끄기",24,132,12,"#baff75","bold");
  label("위치 x: " + player.x.toFixed(1) + " / y: " + player.y.toFixed(1),24,155,12,"#e5ebe6");
  label("드론: " + enemies.filter(e => e.active).length + " / 전체: " + enemies.length,24,178,12,"#e5ebe6");
  label("상태: " + gameState + " / 점수: " + score,24,201,12,"#e5ebe6");
  ctx.restore();
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
  if (player.moving && (player.direction === 1 || player.direction === 2) && survivorSideImage.naturalWidth > 0) {
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
  if (enemy.isHunter) label("HUNTER",enemy.x - 23,enemy.y - 34,10,"#e8d389","bold");
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

// 현재 구역과 인접 구역의 아직 획득하지 않은 코어만 그립니다.
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

// 그림과 같은 카메라 변환 안에서 판정 영역을 그립니다.
drawHitFeedback(gameNow());
drawHitboxes();

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
label("SCORE",438,30,9);label(String(score).padStart(4, "0"),437,59,25,"#e9efea","bold");
label("BEST " + highScore,546,82,10,"#bddc8e");
label("SURVIVAL",546,30,9);label(formatTime(elapsedSeconds),545,59,25,"#e9efea","bold");
const recentlyHit = lastHitTime !== null && gameNow() - lastHitTime < 700;
label(recentlyHit ? "DAMAGE -1" : "VITALS",667,30,9,recentlyHit ? "#ff8395" : "#9cabb6");label(health + " / " + maxHealth,739,30,9,recentlyHit ? "#ff8395" : "#94c9a4");
for(let i=0;i<3;i++) {
  polygon([[667+i*34,42],[693+i*34,42],[689+i*34,58],[663+i*34,58]],i < health ? "#83c6a0" : "#293a36");
}
label(gameState === "playing" && gameNow() < invincibleUntil ? "SHIELD ACTIVE" : "FIELD STATUS",25,550,9,"#83c6a0");
label("DRONE " + enemies.filter(e => e.active).length,130,550,11,"#f49aaf");label("에너지 +10",205,550,11,"#bddc8e");
label("회복 코어 " + (collectedCoreCount % 5) + "/5 · 피격 후 1초 무적",310,550,11,"#9bafae");
ctx.textAlign="right";label("OPEN WORLD / SURVIVAL",775,550,9,"#738a91");ctx.textAlign="left";
label("방향키 이동 · 코어 +10점 · 5개마다 체력 회복 · 종료 후 R 재시작",25,581,11,"#778b94");
ctx.textAlign="right";label(isMuted ? "SOUND OFF [M]" : "SOUND ON [M]",775,581,9,isMuted ? "#f49aaf" : "#bddc8e");ctx.textAlign="left";

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
  const speed = enemy.speed;
  enemy.vx = dx / distance * speed;
  enemy.vy = dy / distance * speed;
  enemy.active = true;
}
// 이전 속도에 곱하지 않고 초기 속도를 기준으로 10%씩 더합니다.
function getDroneSpeedMultiplier() {
  return Math.min(maxDroneSpeedMultiplier,
    1 + Math.floor(elapsedSeconds / droneSpeedInterval) * droneSpeedStep);
}
function updateEnemyCount() {
  if (gameState !== "playing") return;
  const targetCount = Math.min(maxEnemyCount,
    initialEnemyCount + Math.floor(elapsedSeconds / enemyCountInterval));
  // 시간이 여러 구간 지났어도 현재 목표 수까지만 보충합니다.
  while (enemies.length < targetCount) {
    const index = enemies.length;
    enemies.push({ x: 0, y: 0, vx: 0, vy: 0,
      speed: 0.8 + (index % 3) * 0.125, active: false, spawnDelay: 0 });
  }
}
function updateDrones() {
  const currentDroneSpeed = droneSpeed * getDroneSpeedMultiplier();
  for (const enemy of enemies) {
    if (enemy.isHunter && elapsedSeconds < hunterStartTime) continue;
    if (!enemy.active) {
      if (enemy.spawnDelay > 0) { enemy.spawnDelay--; continue; }
      spawnDrone(enemy);
    }
    if (enemy.isHunter) {
      const dx = player.x + player.size / 2 - enemy.x;
      const dy = player.y + player.size / 2 - enemy.y;
      const distance = Math.hypot(dx, dy);
      const speed = distance < hunterDetectionRange ? hunterNearSpeed : hunterSpeed;
      // 최대 속도는 0.95×1.8=1.71로 플레이어 속도 2보다 느립니다.
      enemy.vx = distance > 8 ? dx / distance * speed / droneSpeed : 0;
      enemy.vy = distance > 8 ? dy / distance * speed / droneSpeed : 0;
    }
    enemy.x += enemy.vx * currentDroneSpeed;
    enemy.y += enemy.vy * currentDroneSpeed;
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
      visibleCores.push(...itemChunks.get(key).filter(core => !core.collected));
    }
  }
  // 장시간 탐색해도 메모리가 계속 늘지 않도록 먼 구역의 기록을 정리합니다.
  for (const key of itemChunks.keys()) {
    if (itemChunks.size <= 128) break;
    if (!activeKeys.has(key)) itemChunks.delete(key);
  }
}

function formatTime(seconds) {
  return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0");
}
// 새 루프를 만들지 않고, 이번 판의 값만 처음 상태로 되돌립니다.
function resetGame() {
  stopBackgroundMusic();
  pauseStartedAt = 0; pausedDuration = 0; resumeDeadline = 0;
  showNicknameForm(false);
  runId += 1; rankSubmitted = false; rankSubmitting = false; showLeaderboard = false;
  isNewRecord = false;
  gameOverMessage = "";
  for (const sound of Object.values(soundEffects)) {
    if (!sound) continue;
    try { sound.pause(); sound.currentTime = 0; } catch {}
  }
  score = 0;
  health = maxHealth;
  collectedCoreCount = 0;
  invincibleUntil = 0;
  lastHitTime = null;
  startTime = null;
  elapsedSeconds = 0;
  player.x = 377; player.y = 292;
  player.direction = 0; player.moving = false;
  walkFrame = 0; sideWalkFrame = 0; motionFrame = 0;
  releaseKeys();
  enemies.length = 0;
  for (let i = 0; i < initialEnemyCount; i++) {
    enemies.push({x: 0, y: 0, vx: 0, vy: 0, speed: 0.8 + (i % 3) * 0.125,
      isHunter: i === 0, active: false, spawnDelay: i * 100});
  }
  itemChunks.clear();
  visibleCores = [];
  updateCamera();
  updateMapItems();
  gameState = "playing";
  startBackgroundMusic();
}
function drawStartScreen() {
  ctx = screenCtx;
  ctx.save();
  ctx.fillStyle = "rgba(3,10,16,0.88)";
  ctx.fillRect(0,99,800,428);
  ctx.strokeStyle = "#83c6a0"; ctx.lineWidth = 2;
  ctx.strokeRect(90,150,620,325);
  ctx.textAlign = "center";
  label("NEON SURVIVOR",400,220,40,"#e5ebe6","bold");
  label("드론을 피하고 코어를 모으며 오래 살아남으세요",400,270,17,"#bddc8e");
  label("방향키 이동 · 코어 +10점 · 5개마다 체력 회복",400,315,14,"#9bafae");
  label("체력 3 · 피격 후 1초 무적 · 게임 오버 후 R 재시작",400,345,13,"#9bafae");
  label("M 음소거 · L 온라인 TOP 10",400,377,13,"#9bafae");
  label("최고 점수: " + highScore,400,400,13,"#bddc8e");
  label("PC에서 방향키로 플레이해 주세요 · 터치 이동 미지원",400,463,11,"#9bafae");
  label("아무 키나 누르거나 화면을 클릭해 시작",400,440,17,"#e5ebe6","bold");
  ctx.restore();
}

function drawGameOver() {
  ctx = screenCtx;
  ctx.save();
  ctx.fillStyle = "rgba(3,10,16,0.86)";
  ctx.fillRect(0,99,800,428);
  ctx.strokeStyle = "#83c6a0"; ctx.lineWidth = 2;
  ctx.strokeRect(170,175,460,275);
  ctx.textAlign = "center";
  label("GAME OVER",400,235,42,"#e5ebe6","bold");
  label("최종 점수: " + score,400,280,22,"#bddc8e");
  label("최고 점수: " + highScore,400,315,18,"#bddc8e");
  label("생존 시간: " + formatTime(elapsedSeconds),400,348,16,"#9bafae");
  if (isNewRecord) label("신기록!",400,380,19,"#e8d389","bold");
  label(gameOverMessage,400,402,13,"#9bafae");
  label("R 다시 시작 · L 온라인 랭킹 · N 기록 등록",400,430,12,"#e5ebe6");
  ctx.restore();
}

function updateJoystick() {
  if (!joystick) return;
  const x = Number(!!joystickKeys.ArrowRight) - Number(!!joystickKeys.ArrowLeft);
  const y = Number(!!joystickKeys.ArrowDown) - Number(!!joystickKeys.ArrowUp);
  const length = Math.max(1, Math.hypot(x, y));
  joystick.style.setProperty("--stick-x", (x / length * 8) + "px");
  joystick.style.setProperty("--stick-y", (y / length * 8) + "px");
}
function releaseKeys() {
  for (const key of Object.keys(keys)) keys[key] = false;
  for (const key of Object.keys(joystickKeys)) joystickKeys[key] = false;
  updateJoystick();
}

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

// ===== ⑤. 게임 루프 — 지우기 / 계산 / 그리기 =====


// 그리는 순서를 한곳에서 확인합니다. 상태별 동작은 그대로입니다.
function drawPauseScreen() {
  ctx = screenCtx; ctx.save(); ctx.fillStyle = "rgba(3,10,16,.86)"; ctx.fillRect(0,99,800,428);
  ctx.textAlign = "center";
  label(gameState === "paused" ? "PAUSED" : String(Math.max(1, Math.ceil((resumeDeadline - Date.now()) / 1000))),400,285,56,"#e8d389","bold");
  label(gameState === "paused" ? "P / ESC 또는 재개 버튼" : "준비하세요",400,345,18,"#e5ebe6");
  ctx.restore();
}
function draw() {
  drawScene();
  if (gameState === "start") drawStartScreen();
  if (gameState === "gameover") drawGameOver();
  if (gameState === "paused" || gameState === "countdown") drawPauseScreen();
  const pauseButton = document.getElementById("pauseButton");
  pauseButton.disabled = !["playing", "paused"].includes(gameState);
  pauseButton.textContent = gameState === "paused" ? "▶ 재개" : "Ⅱ 일시정지";
  drawDebugInfo();
  drawLeaderboard();
}

function gameLoop(timestamp) {
  // 메뉴에서는 보이지 않는 게임 화면을 반복해서 그리지 않습니다.
  if (fpsActive || !document.getElementById("arcadeMenu").hidden) {
    requestAnimationFrame(gameLoop);
    return;
  }
  if (gameState === "countdown" && Date.now() >= resumeDeadline) {
    pausedDuration += Date.now() - pauseStartedAt; pauseStartedAt = 0;
    gameState = "playing"; releaseKeys(); startBackgroundMusic();
  }
  // ① 지우기: 화면과 저해상도 월드의 지난 프레임을 없앱니다.
  worldCtx.setTransform(1, 0, 0, 1, 0, 0);
  worldCtx.clearRect(0, 0, worldCanvas.width, worldCanvas.height);
  screenCtx.clearRect(0, 0, canvas.width, canvas.height);

  // ② 계산: 드론 위치와 표시할 모션 프레임을 갱신합니다.
  if (gameState === "playing") {
    const now = gameNow();
    if (startTime === null) startTime = now;
    elapsedSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
    updatePlayer();
    updateCamera();
    updateMapItems();
    updateEnemyCount();
    updateDrones();
    checkEnemyCollisions(now);
    collectCores();
    walkFrame = player.moving ? Math.floor(timestamp / 180) % 2 : 0;
    sideWalkFrame = player.moving ? Math.floor(timestamp / sideWalkFrameMs) % 2 : 0;
    if (gameState === "playing") motionFrame = Math.floor(timestamp / 160) % 3;
  }

  // ③ 그리기: 배경, 캐릭터, 아이템, HUD를 다시 그립니다.
  draw();

  // ④ 다음 프레임 예약: 루프는 이 한 곳에서만 반복합니다.
  requestAnimationFrame(gameLoop);
}

// ===== ⑥. 시동 — 이미지 준비 후 루프 한 번 시작 =====


loadEndMessages();

for (const [image, path] of [
  [floorImage, "assets/floor-tile.jpg"],
  [survivorImage, "assets/survivor-directions.png"],
  [survivorWalkImage, "assets/survivor-walk.png"],
  [survivorSideImage, "assets/survivor-sidewalk.png"],
  [droneImage, "assets/drone-directions.png"],
  [energyImage, "assets/energy-core.png"]
]) {
  image.onload = finishImageLoad;
  image.onerror = finishImageLoad;
  image.src = path;
}

// 오락기 메뉴: 방향키로 선택하고 START / Enter로 실행합니다.
let selectedMenuGame = 0;
const menuGames = [
  {id:"selectNeon", title:"NEON SURVIVOR", description:"드론을 피해 코어를 모으세요", ready:true},
  {id:"selectVoid", title:"VOID BREACH", description:"3D FPS · 봉쇄 시설 탈출", ready:true},
  {id:"selectCyber", title:"CYBER ESCAPE", description:"사이버 탈출 게임 · 준비 중", ready:false}
];
function selectMenuGame(step) {
  selectedMenuGame = (selectedMenuGame + step + menuGames.length) % menuGames.length;
  menuGames.forEach((game, i) => {
    const button = document.getElementById(game.id);
    button.classList.toggle("selected", i === selectedMenuGame);
    button.setAttribute("aria-pressed", String(i === selectedMenuGame));
  });
  const game = menuGames[selectedMenuGame];
  const preview = document.getElementById("menuPreview");
  preview.querySelector("span").textContent = game.title;
  preview.classList.toggle("pending", !game.ready);
  document.getElementById("menuDescription").textContent = game.description;
  document.getElementById("menuAvailability").textContent = game.ready ? (selectedMenuGame === 1 ? "3D FPS · 1 PLAYER" : "SURVIVAL · 1 PLAYER") : "COMING SOON";
  document.getElementById("menuStatus").textContent = "↑ ↓ SELECT　 ENTER START";
}
function launchMenuGame() {
  if (selectedMenuGame === 1) {
    pauseGame(); stopBackgroundMusic(); releaseKeys(); fpsActive = true;
    document.getElementById("arcadeMenu").hidden = true;
    document.getElementById("gameConsole").hidden = true;
    document.getElementById("fpsConsole").hidden = false;
    const frame = document.getElementById("fpsFrame");
    if (!frame.getAttribute("src")) frame.src = "fps/index.html";
    document.getElementById("menuButton").disabled = false;
    document.getElementById("pauseButton").disabled = false;
    document.getElementById("menuUp").disabled = true;
    document.getElementById("menuDown").disabled = true;
    return;
  }
  if (!menuGames[selectedMenuGame].ready) {
    document.getElementById("menuStatus").textContent = "준비 중입니다 · 다른 게임을 선택해 주세요";
    return;
  }
  document.getElementById("arcadeMenu").hidden = true;
  document.getElementById("gameConsole").hidden = false;
  document.getElementById("menuButton").disabled = false;
  document.getElementById("menuUp").disabled = true;
  document.getElementById("menuDown").disabled = true;
  if (gameState === "paused") resumeGame();
  else if (gameState === "start" || gameState === "gameover") resetGame();
  canvas.focus({ preventScroll: true });
}
menuGames.forEach((game, i) => document.getElementById(game.id).addEventListener("click", function () {
  selectMenuGame(i - selectedMenuGame);
}));
document.getElementById("menuUp").addEventListener("click", () => selectMenuGame(-1));
document.getElementById("menuDown").addEventListener("click", () => selectMenuGame(1));
document.getElementById("arcadeStart").addEventListener("click", function () {
  if (fpsActive) { document.getElementById("fpsFrame").contentWindow.postMessage({type:"void-pause"},location.origin); return; }
  if (!document.getElementById("arcadeMenu").hidden) launchMenuGame();
  else if (gameState === "playing") pauseGame();
  else if (gameState === "paused") resumeGame();
  else if (gameState === "gameover") resetGame();
  canvas.focus({ preventScroll: true });
});
document.getElementById("pauseButton").addEventListener("click", function () {
  if (fpsActive) { document.getElementById("fpsFrame").contentWindow.postMessage({type:"void-pause"},location.origin); return; }
  if (gameState === "playing") pauseGame(); else resumeGame();
  canvas.focus({ preventScroll: true });
});
document.getElementById("menuButton").addEventListener("click", function () {
  if (fpsActive) { document.getElementById("fpsFrame").contentWindow.postMessage({type:"void-pause"},location.origin); fpsActive = false; document.getElementById("fpsConsole").hidden = true; }
  pauseGame(); showNicknameForm(false);
  document.getElementById("arcadeMenu").hidden = false;
  document.getElementById("gameConsole").hidden = true;
  document.getElementById("menuButton").disabled = true;
  document.getElementById("pauseButton").disabled = true;
  document.getElementById("menuUp").disabled = false;
  document.getElementById("menuDown").disabled = false;
  selectMenuGame(-selectedMenuGame);
  document.getElementById("menuStatus").textContent = gameState === "paused" ? "START를 눌러 이전 게임으로 돌아가기" : "↑ ↓ SELECT　 ENTER START";
  document.getElementById("arcadeStart").focus();
});

window.addEventListener("message", function(e) { if(e.origin === location.origin && e.source === document.getElementById("fpsFrame").contentWindow && e.data?.type === "void-exit") document.getElementById("menuButton").click(); });

document.getElementById("cabinetFullscreen").addEventListener("click", async function(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.getElementById("arcadeCabinet").requestFullscreen();if(!fpsActive&&!document.getElementById("gameConsole").hidden)canvas.focus({preventScroll:true});}catch{this.textContent="전체화면 사용 불가";}});
document.addEventListener("fullscreenchange",function(){document.getElementById("cabinetFullscreen").textContent=document.fullscreenElement?"화면 줄이기":"전체화면";});

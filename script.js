// 도화지를 찾고, 2D 그림을 그릴 붓을 가져옵니다.
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 위치와 크기: 사각형은 왼쪽 위, 원은 중심 좌표입니다.
const player = { x: 384, y: 284, size: 32, color: "#31e8ff" };
const enemies = [
  { x: 180, y: 180, radius: 20 },
  { x: 640, y: 200, radius: 20 },
  { x: 550, y: 450, radius: 20 }
];
const energy = { x: 240, y: 400, size: 16 };

// 어두운 남색에서 보라색으로 이어지는 네온 경기장 배경입니다.
const background = ctx.createLinearGradient(0, 0, 800, 600);
background.addColorStop(0, "#071626");
background.addColorStop(1, "#21102e");
ctx.fillStyle = background;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 반투명 격자를 겹쳐 가상 공간의 분위기를 만듭니다.
ctx.strokeStyle = "rgba(49, 232, 255, 0.12)";
ctx.lineWidth = 1;
for (let x = 0; x <= 800; x += 40) {
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, 600);
  ctx.stroke();
}
for (let y = 0; y <= 600; y += 40) {
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(800, y);
  ctx.stroke();
}

// 플레이어: 중앙의 청록색 사각형입니다.
ctx.fillStyle = player.color;
ctx.fillRect(player.x, player.y, player.size, player.size);

// 적: 서로 떨어진 위치의 분홍색 원 세 개입니다.
ctx.fillStyle = "#ff4b88";
for (const enemy of enemies) {
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();
}

// 에너지 아이템: 초록색 사각형입니다. 획득 기능은 이후 구현합니다.
ctx.fillStyle = "#9dff65";
ctx.fillRect(energy.x, energy.y, energy.size, energy.size);

// 제목과 상태를 표시합니다. 현재는 움직이지 않는 첫 화면입니다.
ctx.fillStyle = "white";
ctx.font = "bold 26px sans-serif";
ctx.fillText("NEON SURVIVOR", 24, 42);
ctx.font = "18px sans-serif";
ctx.fillText("생존 시간: 0초   점수: 0", 24, 76);
ctx.fillText("체력: 3 / 3", 650, 42);
ctx.font = "16px sans-serif";
ctx.fillText("첫 화면 미리보기 · 이동과 충돌은 아직 구현하지 않았습니다", 24, 570);

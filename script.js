// 도화지와 붓: 이번 장에서는 움직임 없이 첫 화면 한 장만 그립니다.
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 경기장 전체의 균형과 물체 간 여백을 고려한 위치, 크기와 색입니다.
const player = { x: 377, y: 292, size: 46, color: "#31ffa6" };
const enemies = [
  { x: 210, y: 220, radius: 20 },
  { x: 610, y: 245, radius: 20 },
  { x: 565, y: 435, radius: 20 }
];
const energy = { x: 285, y: 410, size: 16 };

// 배경: 어두운 경기장 위에 중앙 조명을 겹칩니다.
const background = ctx.createRadialGradient(400, 300, 20, 400, 300, 480);
background.addColorStop(0, "#102c35");
background.addColorStop(0.65, "#0a1628");
background.addColorStop(1, "#050914");
ctx.fillStyle = background;
ctx.fillRect(0, 0, canvas.width, canvas.height);

// 얇은 격자와 경기장 경계입니다.
ctx.strokeStyle = "rgba(92, 182, 198, 0.09)";
ctx.lineWidth = 1;
for (let x = 24; x <= 776; x += 32) {
  ctx.beginPath(); ctx.moveTo(x, 110); ctx.lineTo(x, 520); ctx.stroke();
}
for (let y = 110; y <= 520; y += 32) {
  ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(776, y); ctx.stroke();
}
ctx.strokeStyle = "#254453";
ctx.strokeRect(24, 110, 752, 410);
// 네 모서리의 짧은 발광 선으로 경기장을 강조합니다.
ctx.strokeStyle = "#46e4d4";
ctx.lineWidth = 3;
for (const corner of [{x:24,y:110,dx:1,dy:1},{x:776,y:110,dx:-1,dy:1},{x:24,y:520,dx:1,dy:-1},{x:776,y:520,dx:-1,dy:-1}]) {
  ctx.beginPath();
  ctx.moveTo(corner.x + corner.dx * 22, corner.y);
  ctx.lineTo(corner.x, corner.y);
  ctx.lineTo(corner.x, corner.y + corner.dy * 22);
  ctx.stroke();
}

// 플레이어 주변의 원과 빛입니다. 저장과 복원으로 다른 그림에 빛이 남지 않게 합니다.
ctx.save();
ctx.strokeStyle = "rgba(49, 255, 166, 0.25)";
ctx.lineWidth = 1;
ctx.beginPath();
ctx.arc(player.x + player.size / 2, player.y + player.size / 2, player.size * 0.8, 0, Math.PI * 2);
ctx.stroke();
ctx.shadowColor = player.color;
ctx.shadowBlur = 22;
ctx.fillStyle = player.color;
ctx.fillRect(player.x, player.y, player.size, player.size);
ctx.restore();
// 사각형 몸체 안에 헬멧과 바이저를 겹쳐 생존자처럼 보이게 합니다.
ctx.fillStyle = "#0c3430";
ctx.fillRect(player.x + player.size * 0.12, player.y + player.size * 0.12, player.size * 0.76, player.size * 0.76);
ctx.fillStyle = "#c8ffeb";
ctx.fillRect(player.x + player.size * 0.2, player.y + player.size * 0.28, player.size * 0.6, player.size * 0.16);
ctx.fillStyle = player.color;
ctx.fillRect(player.x + player.size * 0.35, player.y + player.size * 0.68, player.size * 0.3, player.size * 0.07);

// 적: 빛나는 외곽 원과 어두운 중심, 눈을 가진 감시 드론입니다.
for (const enemy of enemies) {
  ctx.save();
  ctx.shadowColor = "#ff4b88";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ff4b88";
  ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#3c142e";
  ctx.beginPath(); ctx.arc(enemy.x, enemy.y, enemy.radius * 0.7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#ffbbd7";
  ctx.fillRect(enemy.x - 9, enemy.y - 3, 18, 6);
}

// 에너지 코어: 기존 16×16 영역 안의 마름모와 빛나는 테두리입니다.
ctx.save();
ctx.translate(energy.x + energy.size / 2, energy.y + energy.size / 2);
ctx.shadowColor = "#baff64"; ctx.shadowBlur = 20;
ctx.fillStyle = "#baff64";
ctx.beginPath();
ctx.moveTo(0, -energy.size / 2); ctx.lineTo(energy.size / 2, 0);
ctx.lineTo(0, energy.size / 2); ctx.lineTo(-energy.size / 2, 0);
ctx.closePath(); ctx.fill();
ctx.restore();
ctx.strokeStyle = "rgba(186,255,100,0.35)";
ctx.strokeRect(energy.x - 6, energy.y - 6, energy.size + 12, energy.size + 12);

// HUD: 실제 점수 계산 없이 시작 시의 값을 표시합니다.
ctx.fillStyle = "#0a111e";
ctx.fillRect(0, 0, 800, 94);
ctx.fillStyle = "#38edb0";
ctx.font = "bold 11px sans-serif";
ctx.fillText("SURVIVAL PROTOCOL / 01", 26, 24);
ctx.fillStyle = "#effffb";
ctx.font = "bold 27px sans-serif";
ctx.fillText("NEON SURVIVOR", 24, 57);
ctx.fillStyle = "#8da8b8";
ctx.font = "12px sans-serif";
ctx.fillText("적을 피하고 에너지 코어를 모아 살아남으세요", 26, 79);
ctx.fillText("SCORE", 450, 27);
ctx.fillText("TIME", 562, 27);
ctx.fillText("HP  3 / 3", 668, 27);
ctx.fillStyle = "#effffb";
ctx.font = "bold 25px monospace";
ctx.fillText("0000", 450, 57);
ctx.fillText("00:00", 562, 57);
for (let i = 0; i < 3; i++) {
  ctx.fillStyle = "#31ffa6";
  ctx.fillRect(668 + i * 33, 40, 25, 15);
}

// 아래쪽 범례와 상태 안내. 작동하지 않는 시작 버튼은 만들지 않습니다.
ctx.font = "12px sans-serif";
ctx.fillStyle = "#31ffa6"; ctx.fillText("■ 생존자", 26, 548);
ctx.fillStyle = "#ff73a2"; ctx.fillText("● 적 3마리", 135, 548);
ctx.fillStyle = "#baff64"; ctx.fillText("◆ 에너지 +10", 255, 548);
ctx.fillStyle = "#8da8b8";
ctx.textAlign = "right";
ctx.fillText("800 × 600 / ARENA 01", 774, 548);
ctx.textAlign = "left";
ctx.fillStyle = "#0e1e2a"; ctx.fillRect(24, 562, 752, 25);
ctx.fillStyle = "#a8c2cc";
ctx.fillText("첫 화면 미리보기 · 이동, 충돌, 점수 계산은 이후 단계에서 구현합니다", 35, 579);

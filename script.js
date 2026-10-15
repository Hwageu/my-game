// 도화지와 2D 붓을 가져옵니다.
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// 상태: 위치와 속도입니다. 속도의 단위는 한 프레임에 이동하는 픽셀입니다.
let ballX = 400;
let ballY = 300;
let speedX = 3;
const radius = 20;

function gameLoop() {
  // ① 지우기: 이전 프레임의 그림을 없앱니다.
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // ② 계산: 현재 위치에 속도를 더해 다음 위치를 구합니다.
  ballX = ballX + speedX;

  // 공의 중심이 아니라 가장자리가 벽에 닿을 때 방향을 바꿉니다.
  // 위치도 보정해 벽에 끼어 떨리지 않게 합니다.
  if (ballX + radius > canvas.width) {
    ballX = canvas.width - radius;
    speedX = -Math.abs(speedX);
  } else if (ballX - radius < 0) {
    ballX = radius;
    speedX = Math.abs(speedX);
  }

  // ③ 그리기: 계산한 새 위치에 흰 공을 그립니다.
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(ballX, ballY, radius, 0, Math.PI * 2);
  ctx.fill();

  // ④ 다음 프레임 예약: 브라우저가 다음 그림을 그릴 때 다시 실행합니다.
  requestAnimationFrame(gameLoop);
}

// 첫 시동: 이 호출이 있어야 루프가 시작됩니다.
gameLoop();

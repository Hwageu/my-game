// HTML에서 id가 game인 도화지를 찾습니다.
const canvas = document.getElementById("game");
// 도화지에 평면 그림을 그릴 붓을 가져옵니다.
const ctx = canvas.getContext("2d");

// 붓의 색을 빨간색으로 정합니다.
ctx.fillStyle = "red";
// 왼쪽 위 (0, 0)에 가로 50, 세로 50 사각형을 그립니다.
ctx.fillRect(0, 0, 50, 50);
// 붓의 색을 노란색으로 정합니다.
ctx.fillStyle = "yellow";
// 오른쪽 위 (750, 0)에 가로 50, 세로 50 사각형을 그립니다.
ctx.fillRect(750, 0, 50, 50);
// 붓의 색을 초록색으로 정합니다.
ctx.fillStyle = "green";
// 왼쪽 아래 (0, 550)에 가로 50, 세로 50 사각형을 그립니다.
ctx.fillRect(0, 550, 50, 50);
// 붓의 색을 흰색으로 정합니다.
ctx.fillStyle = "white";
// 직접 수정할 줄: 순서는 x, y, 가로, 세로입니다.
ctx.fillRect(500, 100, 90, 50);

// 좌표 설명을 흰색 글자와 16px 크기로 씁니다.
ctx.fillStyle = "white";
ctx.font = "16px sans-serif";
// 각 사각형 옆의 도화지 안쪽에 좌표를 표시합니다.
ctx.fillText("(0, 0)", 60, 30);
ctx.fillText("(750, 0)", 650, 30);
ctx.fillText("(0, 550)", 60, 580);
ctx.fillText("(400, 300)", 430, 315);

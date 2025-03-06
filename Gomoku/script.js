const boardSize = 15;
const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
// 添加棋盘边距（像素）
const boardMargin = 30;
// 线条宽度设为偶数，避免模糊
const gridThickness = 2;
let cellSize;
let board = [];
let gameOver = false;
let waitingForComputer = false;
let moveHistory = [];
let lastMove = null;
let hoverPos = null;
let pulseAngle = 0;
let winLine = [];
let playerScore = 0, computerScore = 0;
let soundEnabled = true;
let animationEnabled = true;
let timerEnabled = true;
// 默认设置
let boardBgColor = "#F3D5B5";
let boardLineColor = "#7F5539";
let blackPieceColor = "#0A0A0A";
let whitePieceColor = "#F0F0F0";
let pieceRadiusRatio = 0.38;
let lastMoveTime = Date.now();
let totalMoveTime = 0;
let maxMoveTime = 0;
const gameLog = document.getElementById("gameLog");
// 修复tooltip持续显示问题 - 添加一个全局变量来追踪当前的tooltip
let activeTooltip = null;
// 设备像素比
const dpr = window.devicePixelRatio || 1;
// 修复多次点击重新开始的问题
let computerMoveTimer = null;
// 添加棋子颜色变量（五子棋规则：先手黑棋后手白棋）
let playerPiece = 1;  // 默认玩家使用黑棋
let computerPiece = 2;  // 默认电脑使用白棋

// 解决Canvas模糊问题
// 解决Canvas模糊问题
function fixCanvasBlur() {
  // 获取 canvas 的 CSS 尺寸
  const rect = canvas.getBoundingClientRect();
  
  // 计算合适的设备像素比 - 在低端设备上降低以提高性能
  const useDevicePixelRatio = Math.min(2, dpr); // 限制最大像素比为2
  
  // 设置 canvas 的物理像素尺寸
  canvas.width = rect.width * useDevicePixelRatio;
  canvas.height = rect.height * useDevicePixelRatio;
  
  // 缩放 context 以匹配计算的像素比
  ctx.scale(useDevicePixelRatio, useDevicePixelRatio);
  
  // 设置 CSS 尺寸（不变）
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  
  // 为不同尺寸的屏幕设置不同的边距
  let effectiveMargin;
  
  if (window.innerWidth <= 360) {
    // 超小屏幕
    effectiveMargin = 10;
  } else if (window.innerWidth <= 500) {
    // 小屏幕
    effectiveMargin = 15;
  } else {
    // 正常屏幕
    effectiveMargin = boardMargin;
  }
  
  // 重新计算格子大小，使用调整后的边距
  cellSize = (rect.width - 2 * effectiveMargin) / (boardSize - 1);
}

// 设置棋盘初始尺寸
function setCanvasSize() {
  const container = document.querySelector('.board-container');
  const containerWidth = container.clientWidth;
  
  // 保持正方形比例
  canvas.style.width = containerWidth + 'px';
  canvas.style.height = containerWidth + 'px';
  
  // 修复模糊问题
  fixCanvasBlur();
}

function resizeCanvas() {
  setCanvasSize();
  drawBoard();
}

function loadScore() {
  const storedPlayer = localStorage.getItem("gomoku_playerScore");
  const storedComputer = localStorage.getItem("gomoku_computerScore");
  if (storedPlayer !== null) playerScore = parseInt(storedPlayer);
  if (storedComputer !== null) computerScore = parseInt(storedComputer);
}

function saveScore() {
  localStorage.setItem("gomoku_playerScore", playerScore);
  localStorage.setItem("gomoku_computerScore", computerScore);
}

function saveGameState() {
  const state = { board, moveHistory, playerScore, computerScore, lastMove, totalMoveTime, maxMoveTime };
  localStorage.setItem("gomoku_gameState", JSON.stringify(state));
  addLogEntry("游戏状态已保存");
}

function loadGameState() {
  const stateStr = localStorage.getItem("gomoku_gameState");
  if (!stateStr) {
    addLogEntry("没有保存的游戏状态");
    return;
  }
  const state = JSON.parse(stateStr);
  board = state.board;
  moveHistory = state.moveHistory;
  playerScore = state.playerScore;
  computerScore = state.computerScore;
  lastMove = state.lastMove;
  totalMoveTime = state.totalMoveTime;
  maxMoveTime = state.maxMoveTime;
  gameOver = false;
  waitingForComputer = false;
  updateScoreboard();
  addLogEntry("游戏状态已载入");
  drawBoard();
  updateStats();
}

function updateStatus(message) {
  document.getElementById("statusText").innerText = message;
  document.getElementById("spinner").style.display = waitingForComputer ? "inline" : "none";
}

function updateScoreboard() {
  document.getElementById("playerScore").innerText = playerScore;
  document.getElementById("computerScore").innerText = computerScore;
  saveScore();
}

function addLogEntry(entry) {
  const p = document.createElement("p");
  p.className = "log-entry";
  p.innerHTML = `[${new Date().toLocaleTimeString()}] ${entry}`;
  p.style.animation = "fadeIn 0.3s ease-out forwards";
  gameLog.appendChild(p);
  gameLog.scrollTop = gameLog.scrollHeight;
}

function clearLog() {
  gameLog.innerHTML = "<h2>游戏日志</h2>";
}

function updateStats() {
  const totalMoves = moveHistory.length;
  document.getElementById("totalMoves").innerText = totalMoves;
  const avgTime = totalMoves ? (totalMoveTime / totalMoves).toFixed(1) : 0;
  document.getElementById("avgMoveTime").innerText = avgTime;
  document.getElementById("maxMoveTime").innerText = maxMoveTime.toFixed(1);
}

function updateMoveTimer() {
  if (!timerEnabled) return;
  const now = Date.now();
  const elapsed = ((now - lastMoveTime) / 1000).toFixed(1);
  document.getElementById("moveTimer").innerText = "上一步耗时：" + elapsed + "秒";
}

function initBoard() {
  // 清除现有的计时器
  if (computerMoveTimer) {
    clearTimeout(computerMoveTimer);
    computerMoveTimer = null;
  }
  
  board = [];
  for (let i = 0; i < boardSize; i++) {
    board[i] = [];
    for (let j = 0; j < boardSize; j++) {
      board[i][j] = 0;
    }
  }
  gameOver = false;
  waitingForComputer = false;
  moveHistory = [];
  lastMove = null;
  winLine = [];
  hoverPos = null;
  lastMoveTime = Date.now();
  totalMoveTime = 0;
  maxMoveTime = 0;
  updateStatus("请玩家落子");
  clearLog();
  updateStats();

  // Check turn order setting and set the colors
  const turnOrder = document.getElementById("turnOrder").value;
  if(turnOrder === "computer") {
    // Computer plays first, so it should use black pieces (1)
    playerPiece = 2;  // Player uses white pieces
    computerPiece = 1;  // Computer uses black pieces
    waitingForComputer = true;
    updateStatus("电脑正在思考...");
    lastMoveTime = Date.now();
    computerMoveTimer = setTimeout(computerMove, 800);
  } else {
    // Player plays first, so they should use black pieces (1)
    playerPiece = 1;  // Player uses black pieces
    computerPiece = 2;  // Computer uses white pieces
    waitingForComputer = false;
    updateStatus("请玩家落子");
  }
}

function drawGrid() {
  // 为不同尺寸的屏幕设置不同的边距
  let effectiveMargin;
  
  if (window.innerWidth <= 360) {
    // 超小屏幕
    effectiveMargin = 10;
  } else if (window.innerWidth <= 500) {
    // 小屏幕
    effectiveMargin = 15;
  } else {
    // 正常屏幕
    effectiveMargin = boardMargin;
  }
  
  // 清晰的线条设置
  ctx.strokeStyle = boardLineColor;
  ctx.lineWidth = Math.max(1, gridThickness);
  
  // 计算可绘制区域的宽度/高度
  const drawableWidth = (canvas.width / (window.devicePixelRatio || 1)) - (effectiveMargin * 2);
  const drawableHeight = (canvas.height / (window.devicePixelRatio || 1)) - (effectiveMargin * 2);
  
  // 每个格子的准确尺寸
  const exactCellSize = drawableWidth / (boardSize - 1);
  
  // 绘制水平线 - 使用一致的方法避免中断
  for (let i = 0; i < boardSize; i++) {
    const y = Math.floor(effectiveMargin + i * exactCellSize) + 0.5;
    
    ctx.beginPath();
    ctx.moveTo(effectiveMargin, y);
    ctx.lineTo(effectiveMargin + drawableWidth, y);
    ctx.stroke();
  }
  
  // 绘制垂直线 - 使用一致的方法避免中断
  for (let i = 0; i < boardSize; i++) {
    const x = Math.floor(effectiveMargin + i * exactCellSize) + 0.5;
    
    ctx.beginPath();
    ctx.moveTo(x, effectiveMargin);
    ctx.lineTo(x, effectiveMargin + drawableHeight);
    ctx.stroke();
  }
  
  // 绘制星位点（传统交叉点）
  const starPoints = [ {x: 3, y: 3}, {x: 11, y: 3}, {x: 3, y: 11}, {x: 11, y: 11}, {x: 7, y: 7} ];
  ctx.fillStyle = "#5a3e2b";
  
  for (const point of starPoints) {
    // 确保星位点在正确的整数位置
    const x = Math.floor(effectiveMargin + point.x * exactCellSize) + 0.5;
    const y = Math.floor(effectiveMargin + point.y * exactCellSize) + 0.5;
    
    // 在小屏幕上减小星位点尺寸
    const starSize = window.innerWidth < 500 ? 
                      Math.max(2, Math.floor(exactCellSize * 0.08)) : 
                      Math.floor(exactCellSize * 0.12);
    
    ctx.beginPath();
    ctx.arc(x, y, starSize, 0, 2 * Math.PI);
    ctx.fill();
  }
  
  // 更新全局cellSize以保持一致性
  cellSize = exactCellSize;
}

function drawPieces() {
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (board[i][j] !== 0) {
        drawPiece(i, j, board[i][j]);
      }
    }
  }
}

function drawPiece(i, j, color) {
  // 为不同尺寸的屏幕设置不同的边距
  let effectiveMargin;
  
  if (window.innerWidth <= 360) {
    // 超小屏幕
    effectiveMargin = 10;
  } else if (window.innerWidth <= 500) {
    // 小屏幕
    effectiveMargin = 15;
  } else {
    // 正常屏幕
    effectiveMargin = boardMargin;
  }
  
  // 确保坐标是整数
  const x = Math.floor(effectiveMargin + i * cellSize) + 0.5;
  const y = Math.floor(effectiveMargin + j * cellSize) + 0.5;
  
  // 根据屏幕大小调整棋子半径比例
  let effectiveRadiusRatio;
  
  if (window.innerWidth <= 360) {
    // 超小屏幕
    effectiveRadiusRatio = 0.35;
  } else if (window.innerWidth <= 500) {
    // 小屏幕
    effectiveRadiusRatio = 0.38;
  } else {
    // 正常屏幕
    effectiveRadiusRatio = pieceRadiusRatio;
  }
  
  const radius = Math.max(4, Math.floor(cellSize * effectiveRadiusRatio));
  
  // 棋子阴影 - 在小屏幕上减小阴影偏移以避免重叠
  const shadowOffset = window.innerWidth < 500 ? 1 : 2;
  ctx.beginPath();
  ctx.arc(x + shadowOffset, y + shadowOffset, radius, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fill();
  
  // 棋子主体
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  
  // 在小屏幕上使用简单的填充颜色而不是渐变以提高性能
  if (window.innerWidth <= 360) {
    ctx.fillStyle = color === 1 ? blackPieceColor : whitePieceColor;
  } else {
    let gradient = ctx.createRadialGradient(x - radius/3, y - radius/3, radius * 0.1, x, y, radius);
    if (color === 1) {
      gradient.addColorStop(0, "#444");
      gradient.addColorStop(1, blackPieceColor);
    } else {
      gradient.addColorStop(0, whitePieceColor);
      gradient.addColorStop(1, "#ccc");
    }
    ctx.fillStyle = gradient;
  }
  
  ctx.fill();
  
  // 棋子高光 - 在小屏幕上减小或禁用
  if (window.innerWidth > 360) {
    const highlightSize = window.innerWidth <= 500 ? radius * 0.12 : radius * 0.15;
    ctx.beginPath();
    ctx.arc(x - radius*0.2, y - radius*0.2, highlightSize, 0, 2 * Math.PI);
    ctx.fillStyle = color === 1 ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.8)";
    ctx.fill();
  }
  
  // 最后一步标记
  if (animationEnabled && lastMove && lastMove.x === i && lastMove.y === j) {
    // 小屏幕上减小脉冲效果
    const pulseScale = window.innerWidth < 500 ? 0.5 : 1;
    const pulse = (3 + Math.sin(pulseAngle) * 2) * pulseScale;
    ctx.strokeStyle = "rgba(255,0,0,0.7)";
    ctx.lineWidth = window.innerWidth < 500 ? 1 : 2;
    ctx.beginPath();
    ctx.arc(x, y, radius + pulse, 0, 2 * Math.PI);
    ctx.stroke();
  }
  
  // 胜利线标记 - 在小屏幕上简化
  if (winLine.some(pt => pt.x === i && pt.y === j)) {
    ctx.strokeStyle = "rgba(255,215,0,0.8)";
    ctx.lineWidth = window.innerWidth < 500 ? 1.5 : 2.5;
    const winRadius = window.innerWidth <= 360 ? radius * 1.1 : radius * 1.2; 
    ctx.beginPath();
    ctx.arc(x, y, winRadius, 0, 2 * Math.PI);
    ctx.stroke();
    
    if (window.innerWidth > 360) {
      const flashIntensity = 0.5 + Math.sin(pulseAngle * 2) * 0.3;
      ctx.fillStyle = `rgba(255,215,0,${flashIntensity})`;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 绘制棋盘背景
  ctx.fillStyle = boardBgColor;
  ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
  
  // 绘制网格和棋子
  drawGrid();
  drawPieces();
  
  // 为不同尺寸的屏幕设置不同的边距
  let effectiveMargin;
  
  if (window.innerWidth <= 360) {
    // 超小屏幕
    effectiveMargin = 10;
  } else if (window.innerWidth <= 500) {
    // 小屏幕
    effectiveMargin = 15;
  } else {
    // 正常屏幕
    effectiveMargin = boardMargin;
  }
  
  // 在超小屏幕上禁用悬浮效果以提高性能
  if (!gameOver && !waitingForComputer && hoverPos && window.innerWidth > 360) {
    const hx = Math.floor(effectiveMargin + hoverPos.x * cellSize) + 0.5;
    const hy = Math.floor(effectiveMargin + hoverPos.y * cellSize) + 0.5;
    ctx.beginPath();
    ctx.arc(hx, hy, Math.max(3, Math.floor(cellSize * 0.35)), 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function getWinningLine(x, y, color) {
  const directions = [
    { dx: 1, dy: 0 },  // horizontal
    { dx: 0, dy: 1 },  // vertical
    { dx: 1, dy: 1 },  // diagonal down-right
    { dx: 1, dy: -1 }  // diagonal up-right
  ];
  for (const { dx, dy } of directions) {
    let line = [{ x, y }];
    // Check forward direction
    for (let i = 1;; i++) {
      const nx = x + dx * i, ny = y + dy * i;
      if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || board[nx][ny] !== color) break;
      line.push({ x: nx, y: ny });
    }
    // Check backward direction
    for (let i = 1;; i++) {
      const nx = x - dx * i, ny = y - dy * i;
      if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || board[nx][ny] !== color) break;
      line.unshift({ x: nx, y: ny });
    }
    if (line.length >= 5) return line;
  }
  return null;
}

function checkDraw() {
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (board[i][j] === 0) return false;
    }
  }
  return true;
}

function getCandidateMoves() {
  const candidates = [];
  const searchRange = 2;
  const visited = Array(boardSize).fill().map(() => Array(boardSize).fill(false));
  
  // Check if board is empty
  let hasStone = false;
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (board[i][j] !== 0) { hasStone = true; break; }
    }
    if (hasStone) break;
  }
  
  // If board is empty, play in the center
  if (!hasStone) {
    return [{ x: Math.floor(boardSize / 2), y: Math.floor(boardSize / 2) }];
  }
  
  // Otherwise find empty positions near existing pieces
  for (let i = 0; i < boardSize; i++) {
    for (let j = 0; j < boardSize; j++) {
      if (board[i][j] !== 0) {
        for (let dx = -searchRange; dx <= searchRange; dx++) {
          for (let dy = -searchRange; dy <= searchRange; dy++) {
            const nx = i + dx, ny = j + dy;
            if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize || visited[nx][ny]) continue;
            if (board[nx][ny] === 0) {
              candidates.push({ x: nx, y: ny });
              visited[nx][ny] = true;
            }
          }
        }
      }
    }
  }
  
  // Fallback to center if no candidates found
  if (candidates.length === 0) {
    return [{ x: Math.floor(boardSize / 2), y: Math.floor(boardSize / 2) }];
  }
  return candidates;
}

function evaluatePoint(x, y, color) {
  let score = 0;
  const directions = [
    { dx: 1, dy: 0 },  // horizontal
    { dx: 0, dy: 1 },  // vertical
    { dx: 1, dy: 1 },  // diagonal down-right
    { dx: 1, dy: -1 }  // diagonal up-right
  ];
  
  // Temporarily place the piece
  board[x][y] = color;
  
  // Check in all directions
  for (const { dx, dy } of directions) {
    let count = 1, openEnds = 0;
    let blocked = false;
    
    // Check forward direction
    for (let i = 1; i < 5; i++) {
      const nx = x + dx * i, ny = y + dy * i;
      if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) { blocked = true; break; }
      if (board[nx][ny] === color) { count++; }
      else if (board[nx][ny] === 0) { openEnds++; break; }
      else { blocked = true; break; }
    }
    
    // Check backward direction
    let blocked2 = false;
    for (let i = 1; i < 5; i++) {
      const nx = x - dx * i, ny = y - dy * i;
      if (nx < 0 || nx >= boardSize || ny < 0 || ny >= boardSize) { blocked2 = true; break; }
      if (board[nx][ny] === color) { count++; }
      else if (board[nx][ny] === 0) { openEnds++; break; }
      else { blocked2 = true; break; }
    }
    
    score += getLineScore(count, openEnds, blocked && blocked2);
  }
  
  // Remove the temporarily placed piece
  board[x][y] = 0;
  return score;
}

function getLineScore(count, openEnds, fullyBlocked) {
  if (count >= 5) return 100000;  // Win
  if (fullyBlocked) return count;  // Blocked on both sides is less valuable
  
  switch (count) {
    case 4: return openEnds === 2 ? 20000 : (openEnds === 1 ? 5000 : 0);  // Four in a row
    case 3: return openEnds === 2 ? 5000 : (openEnds === 1 ? 800 : 0);    // Three in a row
    case 2: return openEnds === 2 ? 650 : (openEnds === 1 ? 150 : 0);     // Two in a row
    case 1: return openEnds === 2 ? 10 : 0;                              // One with space
  }
  return 0;
}

function getMoveScore(x, y) {
  const scoreAI = evaluatePoint(x, y, computerPiece);      // 使用computerPiece而不是硬编码的2
  const scoreHuman = evaluatePoint(x, y, playerPiece);   // 使用playerPiece而不是硬编码的1
  
  // Difficulty weights
  const offenseWeight = 1.1;  // Weight for AI's own moves
  const defenseWeight = 1.2;  // Weight for blocking human moves
  
  // Add position bonus (center is preferred)
  const centerX = boardSize / 2;
  const centerY = boardSize / 2;
  const distanceFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
  const positionBonus = Math.max(0, 30 - distanceFromCenter * 2);
  
  return (scoreAI * offenseWeight) + (scoreHuman * defenseWeight) + positionBonus;
}

function getAIMove() {
  const candidates = getCandidateMoves();
  let bestMove = null, bestScore = -Infinity;
  
  for (const m of candidates) {
    const currentScore = getMoveScore(m.x, m.y);
    
    // If winning move found, return immediately
    if (currentScore >= 90000) return m;
    
    // Simulate this move and check opponent's response
    board[m.x][m.y] = computerPiece;  // 使用computerPiece而不是硬编码的2
    const oppCandidates = getCandidateMoves();
    let oppBestScore = 0;
    
    for (const om of oppCandidates) {
      if (board[om.x][om.y] !== 0) continue;
      const oppScore = evaluatePoint(om.x, om.y, playerPiece);  // 使用playerPiece而不是硬编码的1
      if (oppScore > oppBestScore) oppBestScore = oppScore;
    }
    
    // Undo the simulation
    board[m.x][m.y] = 0;
    
    // Calculate net score (offensive value minus defensive risk)
    const netScore = currentScore - (oppBestScore * 0.8);
    if (netScore > bestScore) { 
      bestScore = netScore; 
      bestMove = m; 
    }
  }
  
  return bestMove;
}

function playSound() {
  if (!soundEnabled) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(500, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.error("无法播放音效:", e);
  }
}

function handlePlayerMove(e) {
  if (gameOver || waitingForComputer) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const useDevicePixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const x = (e.clientX - rect.left) * scaleX / useDevicePixelRatio;
  const y = (e.clientY - rect.top) * scaleY / useDevicePixelRatio;
  
  // 调用通用的落子处理函数
  processPlayerMove(x, y);
}

// 处理触摸事件
function handlePlayerTouch(touch) {
  if (gameOver || waitingForComputer) return;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const useDevicePixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const x = (touch.clientX - rect.left) * scaleX / useDevicePixelRatio;
  const y = (touch.clientY - rect.top) * scaleY / useDevicePixelRatio;
  
  // 调用通用的落子处理函数
  processPlayerMove(x, y);
}

// 通用的落子处理函数
function processPlayerMove(x, y) {
  // 为不同尺寸的屏幕设置不同的边距
  let effectiveMargin;
  
  if (window.innerWidth <= 360) {
    // 超小屏幕
    effectiveMargin = 10;
  } else if (window.innerWidth <= 500) {
    // 小屏幕
    effectiveMargin = 15;
  } else {
    // 正常屏幕
    effectiveMargin = boardMargin;
  }
  
  const useDevicePixelRatio = Math.min(2, window.devicePixelRatio || 1);
  
  // Don't process clicks outside the board grid
  if(x < effectiveMargin || x > canvas.width / useDevicePixelRatio - effectiveMargin || 
     y < effectiveMargin || y > canvas.height / useDevicePixelRatio - effectiveMargin) return;
     
  const i = Math.round((x - effectiveMargin) / cellSize);
  const j = Math.round((y - effectiveMargin) / cellSize);
  
  if (i < 0 || i >= boardSize || j < 0 || j >= boardSize) return;
  if (board[i][j] !== 0) return;  // Space already occupied
  
  // Player's move - 使用playerPiece而不是硬编码的1
  board[i][j] = playerPiece;
  const moveTime = (Date.now() - lastMoveTime) / 1000;
  totalMoveTime += moveTime;
  if (moveTime > maxMoveTime) maxMoveTime = moveTime;
  
  moveHistory.push({ x: i, y: j, color: playerPiece, time: moveTime });
  lastMove = { x: i, y: j };
  playSound();
  addLogEntry(`玩家落子：(${i}, ${j}) 耗时：${moveTime.toFixed(1)}秒`);
  updateStats();
  drawBoard();
  
  // Check for win
  const line = getWinningLine(i, j, playerPiece);
  if (line) {
    winLine = line;
    gameOver = true;
    playerScore++;
    updateScoreboard();
    updateStatus("🎉 玩家获胜！");
    addLogEntry("结果：玩家获胜！");
    return;
  }
  
  // Check for draw
  if (checkDraw()) {
    gameOver = true;
    updateStatus("⚖️ 平局！");
    addLogEntry("结果：平局");
    return;
  }
  
  // Computer's turn
  updateStatus("电脑正在思考...");
  waitingForComputer = true;
  lastMoveTime = Date.now();
  computerMoveTimer = setTimeout(computerMove, 800);
}

function computerMove() {
  if (gameOver) return;
  
  const move = getAIMove();
  if (!move) return;
  
  // Computer makes its move - 使用computerPiece而不是硬编码的2
  board[move.x][move.y] = computerPiece;
  const moveTime = (Date.now() - lastMoveTime) / 1000;
  totalMoveTime += moveTime;
  if (moveTime > maxMoveTime) maxMoveTime = moveTime;
  
  moveHistory.push({ x: move.x, y: move.y, color: computerPiece, time: moveTime });
  lastMove = { x: move.x, y: move.y };
  playSound();
  addLogEntry(`电脑落子：(${move.x}, ${move.y}) 耗时：${moveTime.toFixed(1)}秒`);
  updateStats();
  drawBoard();
  
  // Check for win
  const line = getWinningLine(move.x, move.y, computerPiece);
  if (line) {
    winLine = line;
    gameOver = true;
    computerScore++;
    updateScoreboard();
    updateStatus("💻 电脑获胜！");
    addLogEntry("结果：电脑获胜！");
    waitingForComputer = false;
    return;
  }
  
  // Check for draw
  if (checkDraw()) {
    gameOver = true;
    updateStatus("⚖️ 平局！");
    addLogEntry("结果：平局");
    waitingForComputer = false;
    return;
  }
  
  // Player's turn
  waitingForComputer = false;
  updateStatus("请玩家落子");
  lastMoveTime = Date.now();
}

function undoMove() {
  if (moveHistory.length === 0) return;
  
  gameOver = false;
  winLine = [];
  
  // Undo computer move first (if it exists)
  if (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].color === computerPiece) {
    const move = moveHistory.pop();
    board[move.x][move.y] = 0;
    addLogEntry(`悔棋：撤销电脑落子 (${move.x}, ${move.y})`);
  }
  
  // Then undo player move
  if (moveHistory.length > 0 && moveHistory[moveHistory.length - 1].color === playerPiece) {
    const move = moveHistory.pop();
    board[move.x][move.y] = 0;
    addLogEntry(`悔棋：撤销玩家落子 (${move.x}, ${move.y})`);
  }
  
  // Update last move
  lastMove = moveHistory.length > 0 ? 
    { x: moveHistory[moveHistory.length - 1].x, y: moveHistory[moveHistory.length - 1].y } : null;
  
  waitingForComputer = false;
  updateStatus("请玩家落子");
  updateStats();
  drawBoard();
}

function replayGame() {
  if (moveHistory.length === 0) {
    addLogEntry("没有可重放的记录");
    return;
  }
  
  updateStatus("🎬 正在重放游戏...");
  let replayIndex = 0;
  const savedHistory = JSON.parse(JSON.stringify(moveHistory));
  const savedPlayerPiece = playerPiece;  // 保存当前的棋子颜色设置
  const savedComputerPiece = computerPiece;
  
  initBoard();
  
  const replayInterval = setInterval(() => {
    if (replayIndex >= savedHistory.length) {
      clearInterval(replayInterval);
      updateStatus("重放结束，等待玩家落子");
      return;
    }
    
    const move = savedHistory[replayIndex];
    board[move.x][move.y] = move.color;
    lastMove = { x: move.x, y: move.y };
    addLogEntry(`重放：${move.color === savedPlayerPiece ? "玩家" : "电脑"} (${move.x}, ${move.y})`);
    replayIndex++;
    drawBoard();
    
    if (soundEnabled) playSound();
  }, 500);
}

function render() {
  pulseAngle += 0.05;
  drawBoard();
  if (timerEnabled) updateMoveTimer();
  requestAnimationFrame(render);
}

function handleKeyDown(e) {
  if (e.key.toLowerCase() === 'u') {
    undoMove();
  } else if (e.key.toLowerCase() === 'r') {
    initBoard();
    updateStatus("请玩家落子");
    addLogEntry("游戏重新开始");
    drawBoard();
  }
}

function coordToString(i, j) {
  const row = String.fromCharCode(65 + i);
  return row + (j + 1);
}

// 通用的鼠标/触摸移动处理函数
function handlePointerMove(clientX, clientY) {
  if (gameOver || waitingForComputer) {
    hoverPos = null;
    document.getElementById("coordDisplay").innerText = "";
    return;
  }
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const useDevicePixelRatio = Math.min(2, window.devicePixelRatio || 1);
  const x = (clientX - rect.left) * scaleX / useDevicePixelRatio;
  const y = (clientY - rect.top) * scaleY / useDevicePixelRatio;
  
  // 为不同尺寸的屏幕设置不同的边距
  let effectiveMargin;
  
  if (window.innerWidth <= 360) {
    // 超小屏幕
    effectiveMargin = 10;
  } else if (window.innerWidth <= 500) {
    // 小屏幕
    effectiveMargin = 15;
  } else {
    // 正常屏幕
    effectiveMargin = boardMargin;
  }
  
  if(x < effectiveMargin || x > canvas.width / useDevicePixelRatio - effectiveMargin || 
     y < effectiveMargin || y > canvas.height / useDevicePixelRatio - effectiveMargin) {
    hoverPos = null;
    document.getElementById("coordDisplay").innerText = "";
    return;
  }
  
  const i = Math.round((x - effectiveMargin) / cellSize);
  const j = Math.round((y - effectiveMargin) / cellSize);
  
  if (i < 0 || i >= boardSize || j < 0 || j >= boardSize || board[i][j] !== 0) {
    hoverPos = null;
    document.getElementById("coordDisplay").innerText = "";
  } else {
    hoverPos = { x: i, y: j };
    // 在小屏幕上不显示坐标文本以节省空间
    if (window.innerWidth <= 360) {
      document.getElementById("coordDisplay").innerText = "";
    } else {
      document.getElementById("coordDisplay").innerText = "坐标：" + coordToString(i, j);
    }
  }
}

// 鼠标移动事件
canvas.addEventListener("mousemove", function(e) {
  handlePointerMove(e.clientX, e.clientY);
});

// 触摸移动事件
canvas.addEventListener("touchmove", function(e) {
  e.preventDefault(); // 防止页面滚动
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    handlePointerMove(touch.clientX, touch.clientY);
  }
});

canvas.addEventListener("mouseout", function() {
  hoverPos = null;
  document.getElementById("coordDisplay").innerText = "";
});

// 修复了tooltip函数，确保只有一个tooltip显示并正确移除
function addTooltip(element, text) {
  element.addEventListener("mouseenter", function(e) {
    // 先移除任何已存在的tooltip
    if (activeTooltip) {
      activeTooltip.remove();
      activeTooltip = null;
    }
    
    const tooltip = document.createElement("div");
    tooltip.className = "tooltip";
    tooltip.textContent = text;
    tooltip.style.left = e.clientX + "px";
    tooltip.style.top = (e.clientY + 20) + "px";
    document.body.appendChild(tooltip);
    activeTooltip = tooltip;
    setTimeout(() => {
      if (activeTooltip === tooltip) {
        tooltip.style.opacity = "1";
      }
    }, 10);
  });
  
  element.addEventListener("mousemove", function(e) {
    if (activeTooltip) {
      activeTooltip.style.left = e.clientX + "px";
      activeTooltip.style.top = (e.clientY + 20) + "px";
    }
  });
  
  element.addEventListener("mouseleave", function() {
    if (activeTooltip) {
      activeTooltip.style.opacity = "0";
      const tooltipToRemove = activeTooltip;
      activeTooltip = null;
      setTimeout(() => {
        if (tooltipToRemove && tooltipToRemove.parentNode) {
          tooltipToRemove.remove();
        }
      }, 300);
    }
  });
}

// 添加一个全局鼠标移动事件来处理tooltip的边缘情况
document.addEventListener("mousemove", function(e) {
  // 检查鼠标是否离开了任何可能有tooltip的元素
  const elementsUnderCursor = document.elementsFromPoint(e.clientX, e.clientY);
  const hasTooltipParent = elementsUnderCursor.some(el => {
    return el.tagName === "BUTTON" || el.tagName === "SELECT";
  });
  
  // 如果鼠标不在任何相关元素上但仍有tooltip，则移除它
  if (!hasTooltipParent && activeTooltip) {
    activeTooltip.style.opacity = "0";
    const tooltipToRemove = activeTooltip;
    activeTooltip = null;
    setTimeout(() => {
      if (tooltipToRemove && tooltipToRemove.parentNode) {
        tooltipToRemove.remove();
      }
    }, 300);
  }
});

function initGame() {
  setCanvasSize();
  window.addEventListener("resize", resizeCanvas);
  loadScore();
  updateScoreboard();
  initBoard();
  drawBoard();
  render();
  
  // 添加鼠标点击事件
canvas.addEventListener("click", handlePlayerMove);

// 添加触摸事件支持
canvas.addEventListener("touchstart", function(e) {
  e.preventDefault(); // 防止触摸事件触发鼠标事件
  if (e.touches.length === 1) {
    const touch = e.touches[0];
    handlePlayerTouch(touch);
  }
});
  
  // Main control buttons
  document.getElementById("restart").addEventListener("click", function() {
    initBoard();
    updateStatus("请玩家落子");
    addLogEntry("游戏重新开始");
  });
  
  document.getElementById("resetScore").addEventListener("click", function() {
    playerScore = 0;
    computerScore = 0;
    updateScoreboard();
    initBoard();
    addLogEntry("记分已重置");
  });
  
  document.getElementById("undo").addEventListener("click", function() {
    undoMove();
  });
  
  document.getElementById("toggleSound").addEventListener("click", function() {
    soundEnabled = !soundEnabled;
    this.innerHTML = soundEnabled ? 
      '<span class="btn-icon">🔊</span>声音' : 
      '<span class="btn-icon">🔇</span>静音';
    addLogEntry("声音设置：" + (soundEnabled ? "开" : "关"));
  });
  
  // Game state buttons
  document.getElementById("saveGame").addEventListener("click", saveGameState);
  document.getElementById("loadGame").addEventListener("click", loadGameState);
  document.getElementById("replayGame").addEventListener("click", replayGame);
  
  // Fullscreen button
  document.getElementById("fullScreenButton").addEventListener("click", function() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      this.textContent = "退出全屏";
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        this.textContent = "全屏模式";
      }
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyDown);
  
  // Add tooltips
  addTooltip(document.getElementById("restart"), "重新开始游戏 (快捷键: R)");
  addTooltip(document.getElementById("undo"), "撤销上一步操作 (快捷键: U)");
  addTooltip(document.getElementById("saveGame"), "保存当前游戏状态");
  addTooltip(document.getElementById("loadGame"), "加载保存的游戏状态");
  addTooltip(document.getElementById("fullScreenButton"), "切换全屏模式");
  
  const turnOrder = document.getElementById("turnOrder").value;
  addLogEntry("游戏初始化完成，先后手：" + (turnOrder === "computer" ? "机器人先手" : "玩家先手"));
}

// Initialize game when page loads
window.addEventListener("load", initGame);
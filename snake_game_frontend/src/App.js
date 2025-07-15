import React, { useEffect, useRef, useState, useCallback } from "react";
import "./App.css";

// --- Theme Colors ---
const THEME_COLORS = {
  primary: "#4CAF50",    // Snake/head, button bg
  secondary: "#388E3C",  // Snake body, panel backgrounds
  accent: "#FFC107",     // Food
  canvasBorder: "#e9ecef", // border for light, can be adjusted
  bg: "#FFFFFF",         // canvas bg (light)
  text: "#222",
};

// --- Game Constants ---
const BOARD_SIZE = 20;             // 20x20 grid
const CELL_SIZE = 22;              // px
const MOVE_INTERVAL = 110;         // ms, controls snake speed
const INITIAL_SNAKE = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
];
const INITIAL_DIRECTION = { x: 1, y: 0 }; // right

// --- Direction helpers ---
const DIRECTIONS = {
  ArrowUp:    { x: 0, y: -1 },
  ArrowDown:  { x: 0, y: 1 },
  ArrowLeft:  { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
};

const isOpposite = (dir1, dir2) =>
  dir1.x === -dir2.x && dir1.y === -dir2.y;

// PUBLIC_INTERFACE
function App() {
  // Game State hooks
  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [direction, setDirection] = useState(INITIAL_DIRECTION);
  const [pendingDirection, setPendingDirection] = useState(INITIAL_DIRECTION);
  const [food, setFood] = useState(spawnFood(INITIAL_SNAKE));
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [justAte, setJustAte] = useState(false);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const moveRef = useRef();
  moveRef.current = { direction, isRunning, snake, food, isGameOver, justAte, pendingDirection };

  // Handle responsive for mobile (for canvas sizing)
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // PUBLIC_INTERFACE
  // ---- Main Game Loop ----
  useEffect(() => {
    if (!isRunning || isGameOver) return;

    const interval = setInterval(() => {
      // Get the direction from latest key press, not one stored at setInterval creation
      moveSnake(moveRef.current);
    }, MOVE_INTERVAL);
    return () => clearInterval(interval);
  }, [isRunning, isGameOver]); // Only restart interval when playing or not game over

  // Keyboard controls
  useEffect(() => {
    // PUBLIC_INTERFACE
    const handleKeyDown = (e) => {
      if (!DIRECTIONS[e.key]) return;

      setPendingDirection((lastDir) => {
        // Prevent direct reversal
        if (isOpposite(DIRECTIONS[e.key], direction)) {
          return lastDir;
        }
        return DIRECTIONS[e.key];
      });

      // Allow quick restart with Enter or Space after game over
      if (isGameOver && (e.key === "Enter" || e.key === " ")) {
        handleReset();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () =>
      window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line
  }, [direction, isGameOver]);

  // Moves the snake and updates game state
  const moveSnake = (refState) => {
    let { snake, food, isRunning, isGameOver, justAte, pendingDirection } = refState;
    if (!isRunning || isGameOver) return;

    let newDir = pendingDirection;
    let newHead = {
      x: snake[0].x + newDir.x,
      y: snake[0].y + newDir.y
    };

    // --- Collision detection ---
    // Wall
    if (
      newHead.x < 0 ||
      newHead.x >= BOARD_SIZE ||
      newHead.y < 0 ||
      newHead.y >= BOARD_SIZE
    ) {
      setIsGameOver(true);
      setIsRunning(false);
      return;
    }
    // Self
    if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      setIsGameOver(true);
      setIsRunning(false);
      return;
    }

    // --- Eating food ---
    let newSnake, grow = false;
    if (newHead.x === food.x && newHead.y === food.y) {
      grow = true;
      setScore((s) => s + 1);
      setFood(spawnFood([{ ...newHead }, ...snake]));
      setJustAte(true);
    } else {
      setJustAte(false);
    }

    newSnake = [{ ...newHead }, ...snake];
    if (!grow) {
      newSnake.pop();
    }
    setSnake(newSnake);
    setDirection(newDir); // update direction for next tick
  };

  // PUBLIC_INTERFACE
  // ---- Start / Pause / Reset ----
  const handleStart = () => {
    if (isGameOver) {
      handleReset();
    }
    setIsRunning(true);
  };
  // PUBLIC_INTERFACE
  const handlePause = () => setIsRunning(false);
  // PUBLIC_INTERFACE
  const handleReset = useCallback(() => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setPendingDirection(INITIAL_DIRECTION);
    setFood(spawnFood(INITIAL_SNAKE));
    setScore(0);
    setIsRunning(false);
    setIsGameOver(false);
    setJustAte(false);
  }, []);

  // --- Canvas Drawing ---
  const canvasRef = useRef();

  useEffect(() => {
    drawGame(
      canvasRef.current,
      snake,
      food,
      isGameOver,
      score,
      justAte
    );
  }, [snake, food, isGameOver, justAte]);

  // Responsive canvas size, always a square fitting screen
  const getCanvasSize = () => {
    // On large screens, fixed size, mobile: scale down
    const minMargin = 32;
    const boardPx = BOARD_SIZE * CELL_SIZE;
    if (windowWidth < boardPx + 2 * minMargin) {
      return Math.max(windowWidth - minMargin * 2, BOARD_SIZE * 12); // Minimum reasonable
    }
    return boardPx;
  };
  const canvasSize = getCanvasSize();
  const cellPx = canvasSize / BOARD_SIZE;

  // --- UI: Render ---
  return (
    <div
      className="snakegame-outer"
      style={{
        minHeight: "100vh",
        background: THEME_COLORS.bg,
        color: THEME_COLORS.text,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        fontFamily: "'IBM Plex Mono',Consolas, 'Fira Mono', monospace"
      }}
    >
      {/* Minimal header */}
      <h1
        style={{
          margin: "28px 0 8px 0",
          fontSize: "2.2rem",
          fontWeight: 700,
          letterSpacing: 1.5,
          color: THEME_COLORS.primary,
          fontFamily: "'IBM Plex Mono',Consolas, 'Fira Mono', monospace",
          textShadow: "0 1px 0 #fff,0 2px 0 #e0ffe0"
        }}
      >
        SNAKE
      </h1>
      {/* Score Bar */}
      <div
        className="score-bar"
        style={{
          background: THEME_COLORS.secondary,
          borderRadius: 16,
          padding: "0.7em 2em",
          marginBottom: 12,
          color: "white",
          fontWeight: 900,
          fontSize: "1rem",
          display: "inline-block",
          letterSpacing: 1,
          boxShadow: "0 1.5px 5px 0 rgba(0,0,0,0.06)"
        }}
      >
        <span>Score:&nbsp;{score}</span>
      </div>
      {/* Game Area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}
      >
        {/* Retro Border */}
        <div
          style={{
            boxShadow: "0 0 0 3.5px " + THEME_COLORS.secondary + ",0 0 0 7px " + THEME_COLORS.accent + ",0 10px 46px #0002",
            background: THEME_COLORS.bg,
            borderRadius: 17,
            padding: 6,
            margin: "0 0 20px 0",
            zIndex: 2
          }}
        >
          {/* Canvas */}
          <canvas
            ref={canvasRef}
            width={canvasSize}
            height={canvasSize}
            tabIndex={-1}
            style={{
              outline: "none",
              display: "block",
              background: "#fafbfc",
              borderRadius: 13,
              imageRendering: "pixelated",
              border: `2px solid ${THEME_COLORS.canvasBorder}`,
              boxSizing: "border-box"
            }}
            aria-label="Snake game canvas area"
            data-testid="snake-canvas"
          />
          {/* Overlay Game Over */}
          {isGameOver && (
            <div
              style={{
                position: "absolute",
                top: "35%",
                left: "50%",
                transform: "translate(-50%,-60%)",
                background: "rgba(255,255,255,0.97)",
                borderRadius: 13,
                boxShadow: "0 2px 10px #3333",
                padding: "30px 44px 24px 44px",
                zIndex: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}
            >
              <div
                style={{
                  fontSize: "2.2rem",
                  fontWeight: 900,
                  color: THEME_COLORS.primary,
                  marginBottom: 10,
                  letterSpacing: 2,
                }}
              >
                GAME OVER
              </div>
              <div
                style={{
                  fontSize: "1.1rem",
                  color: "#333",
                  marginBottom: 24,
                  fontWeight: 500
                }}
              >
                Final score: <span style={{ color: THEME_COLORS.secondary, fontWeight: 700 }}>{score}</span>
              </div>
              <button
                onClick={handleReset}
                style={buttonStyle({ primary: true })}
                aria-label="Restart snake game"
              >
                Restart
              </button>
              <div style={{ marginTop: 10, fontSize: 13, color: "#888" }}>
                Press <kbd>Enter</kbd> or <kbd>Space</kbd> to restart
              </div>
            </div>
          )}
        </div>
        {/* Controls */}
        <div
          className="controls-bar"
          style={{
            margin: "0.5em 0 1.2em 0",
            display: "flex",
            gap: 11,
          }}
        >
          <button
            onClick={isRunning ? handlePause : handleStart}
            style={buttonStyle({ primary: true, retro: true })}
            disabled={isGameOver}
            aria-label={isRunning ? "Pause" : "Start"}
          >
            {isRunning ? "Pause" : "Start"}
          </button>
          <button
            onClick={handleReset}
            disabled={isRunning && !isGameOver}
            style={buttonStyle({ accent: true })}
            aria-label="Reset"
          >
            Reset
          </button>
        </div>
        {/* Keyboard Instructions */}
        <div
          style={{
            fontSize: 14,
            color: "#595",
            margin: "0 0 18px 0",
            background: "rgba(204,255,204,0.18)",
            borderRadius: 10,
            padding: "4px 18px"
          }}
        >
          Use <kbd>↑</kbd> <kbd>↓</kbd> <kbd>→</kbd> <kbd>←</kbd> to play
        </div>
      </div>
      {/* Footer: Small, minimalistic */}
      <footer style={{
        fontSize: 13,
        color: "#aaa",
        marginTop: "auto",
        padding: "14px 0 4px 0",
        letterSpacing: 1.1
      }}>
        <span style={{
          color: THEME_COLORS.secondary,
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: 1
        }}>RETRO&nbsp;SNAKE</span> &nbsp;|&nbsp;{" "}
        <span style={{ color: THEME_COLORS.accent, fontWeight: 600 }}>by Kavia</span>
      </footer>
    </div>
  );

  // --- Helper functions ---

  // Draws the snake, food, and optionally overlays onto the canvas
  function drawGame(canvas, snake, food, isOver, score, justAte) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Grid BG ---
    ctx.fillStyle = "#fafbfc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Minor board grid lines for retro look ---
    for (let x = 0; x <= BOARD_SIZE; ++x) {
      ctx.beginPath();
      ctx.strokeStyle = "#e6eded";
      ctx.lineWidth = 1;
      ctx.moveTo(x * cellPx, 0);
      ctx.lineTo(x * cellPx, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= BOARD_SIZE; ++y) {
      ctx.beginPath();
      ctx.strokeStyle = "#e6eded";
      ctx.lineWidth = 1;
      ctx.moveTo(0, y * cellPx);
      ctx.lineTo(canvas.width, y * cellPx);
      ctx.stroke();
    }

    // --- Draw Food ---
    if (food) {
      ctx.save();
      ctx.fillStyle = THEME_COLORS.accent;
      ctx.strokeStyle = "#d8b300";
      ctx.beginPath();
      ctx.arc(
        (food.x + 0.5) * cellPx,
        (food.y + 0.5) * cellPx,
        cellPx * 0.34 + (justAte ? Math.sin(Date.now() / 70) * 1.4 : 0),
        0,
        2 * Math.PI
      );
      ctx.fill();
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // --- Draw snake body ---
    // Head is at index 0
    for (let i = snake.length - 1; i >= 0; --i) {
      let seg = snake[i];
      ctx.save();
      ctx.beginPath();
      if (i === 0) {
        // Snake head
        ctx.fillStyle = THEME_COLORS.primary;
      } else {
        ctx.fillStyle = THEME_COLORS.secondary;
      }

      ctx.roundRect(
        seg.x * cellPx + 1.2,
        seg.y * cellPx + 1.2,
        cellPx - 2.4,
        cellPx - 2.4,
        i === 0 ? 3.9 : 2.6
      );
      ctx.fill();

      ctx.restore();

      // Eyes on head for retro effect
      if (i === 0) {
        ctx.save();
        ctx.fillStyle = "#fff";
        const isHorz = direction.x !== 0;
        let eye1, eye2;
        if (isHorz) {
          // Left/Right
          eye1 = {
            x: seg.x * cellPx + cellPx * (direction.x === 1 ? 0.71 : 0.23),
            y: seg.y * cellPx + cellPx * 0.33
          };
          eye2 = {
            x: seg.x * cellPx + cellPx * (direction.x === 1 ? 0.71 : 0.23),
            y: seg.y * cellPx + cellPx * 0.68
          };
        } else {
          // Up/Down
          eye1 = {
            x: seg.x * cellPx + cellPx * 0.32,
            y: seg.y * cellPx + cellPx * (direction.y === 1 ? 0.74 : 0.22)
          };
          eye2 = {
            x: seg.x * cellPx + cellPx * 0.69,
            y: seg.y * cellPx + cellPx * (direction.y === 1 ? 0.74 : 0.22)
          };
        }
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, cellPx * 0.08, 0, 2 * Math.PI);
        ctx.arc(eye2.x, eye2.y, cellPx * 0.08, 0, 2 * Math.PI);
        ctx.fill();
        // retro black pupils
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.arc(eye1.x, eye1.y, cellPx * 0.032, 0, 2 * Math.PI);
        ctx.arc(eye2.x, eye2.y, cellPx * 0.032, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }

    // --- Game Over Red Overlay ---
    if (isOver) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#f40";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  // PUBLIC_INTERFACE
  // Spawns food randomly, not overlapping snake
  function spawnFood(currentSnake) {
    let open = [];
    for (let y = 0; y < BOARD_SIZE; ++y) {
      for (let x = 0; x < BOARD_SIZE; ++x) {
        if (!currentSnake.some((seg) => seg.x === x && seg.y === y)) {
          open.push({ x, y });
        }
      }
    }
    if (open.length === 0) return { x: 1, y: 1 };
    return open[Math.floor(Math.random() * open.length)];
  }
}

// --- Button style helper for retro/minimal look ---
function buttonStyle({ primary, accent, retro }) {
  let bg, color, border, shadow;
  if (primary) {
    bg = THEME_COLORS.primary;
    color = "white";
    border = `2.5px solid ${THEME_COLORS.secondary}`;
    shadow = "0 1px 0 #5fe58877";
  } else if (accent) {
    bg = THEME_COLORS.accent;
    color = "#322";
    border = "2.5px solid #e0b200";
    shadow = "0 1px 0 #f6e9a5";
  } else {
    bg = "#fff";
    color = "#222";
    border = `1.5px solid ${THEME_COLORS.secondary}`;
    shadow = "0 1px 0 #ddd";
  }
  return {
    fontFamily: "'IBM Plex Mono', 'Fira Mono', Consolas, monospace",
    fontWeight: 700,
    borderRadius: 9,
    background: bg,
    color,
    border,
    padding: "11px 27px",
    fontSize: 18,
    outline: "none",
    margin: 0,
    transition: "background 0.16s, color 0.14s",
    cursor: "pointer",
    boxShadow: shadow,
    letterSpacing: 1.1,
    ...(retro
      ? {
          textTransform: "uppercase",
          letterSpacing: 2.7,
          fontSize: 17,
        }
      : {}),
  };
}

export default App;

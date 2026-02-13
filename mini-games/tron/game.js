// Tron / Light Cycles mini-game
// Exports initMiniGame() for your miniGameLoader.

export function initMiniGame(rootEl /*, options */) {
    const stage = rootEl.querySelector("#tronStage");
    const canvas = rootEl.querySelector("#tronCanvas");
    const statusEl = rootEl.querySelector("#tronStatusText");
    const restartBtn = rootEl.querySelector("#tronRestartBtn");

    if (!stage || !canvas) throw new Error("Tron: Missing #tronStage or #tronCanvas");

    const ctx = canvas.getContext("2d", { alpha: true });

    // --- Tunables ---
    const CELL = 8;            // grid cell size in pixels (lower = bigger grid)
    const TICK_MS = 60;        // speed (lower = faster)
    const SAFE_MARGIN = 2;     // keep players away from walls
    const WALL_THICKNESS = 1;  // wall thickness in grid cells (usually 1)

    // Colors (kept simple; not styling the whole page)
    const COLORS = {
        bg: "rgba(255,255,255,0.0)",
        gridBg: "rgba(255,255,255,0.85)",
        wall: "rgba(0,0,0,0.20)",
        p1: "#00A3FF",
        p2: "#FF6A00",
        p1Head: "#007AD6",
        p2Head: "#D95400",
        text: "rgba(0,0,0,0.85)"
    };

    // Input state
    const keysDown = new Set();

    // Game state
    let gridW = 0, gridH = 0;
    let grid = null; // Uint8Array: 0 empty, 1 p1 trail, 2 p2 trail, 3 wall
    let timer = null;
    let running = false;
    let paused = false;
    let started = false;

    const DIR = {
        UP: { x: 0, y: -1 },
        DOWN: { x: 0, y: 1 },
        LEFT: { x: -1, y: 0 },
        RIGHT: { x: 1, y: 0 }
    };

    const player1 = {
        id: 1,
        x: 0, y: 0,
        dir: DIR.RIGHT,
        nextDir: DIR.RIGHT,
        alive: true
    };

    const player2 = {
        id: 2,
        x: 0, y: 0,
        dir: DIR.LEFT,
        nextDir: DIR.LEFT,
        alive: true
    };

    function setStatus(msg) {
        statusEl.textContent = msg;
    }

    function clamp(n, a, b) {
        return Math.max(a, Math.min(b, n));
    }

    function idx(x, y) {
        return y * gridW + x;
    }

    function isOpposite(a, b) {
        return a.x === -b.x && a.y === -b.y;
    }

    function resizeCanvasToStage() {
        const r = stage.getBoundingClientRect();
        const w = Math.max(200, Math.floor(r.width));
        const h = Math.max(200, Math.floor(r.height));

        // Set actual canvas pixels
        canvas.width = w;
        canvas.height = h;

        // Compute grid based on CELL
        gridW = Math.max(30, Math.floor(w / CELL));
        gridH = Math.max(20, Math.floor(h / CELL));

        // Center the grid in the canvas by computing offsets
        // (We draw with offsets so it looks clean if canvas not divisible by CELL)
    }

    function drawCell(x, y, fillStyle) {
        const ox = Math.floor((canvas.width - gridW * CELL) / 2);
        const oy = Math.floor((canvas.height - gridH * CELL) / 2);
        ctx.fillStyle = fillStyle;
        ctx.fillRect(ox + x * CELL, oy + y * CELL, CELL, CELL);
    }

    function drawWallsFull() {
        // Fill grid background area
        const ox = Math.floor((canvas.width - gridW * CELL) / 2);
        const oy = Math.floor((canvas.height - gridH * CELL) / 2);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = COLORS.gridBg;
        ctx.fillRect(ox, oy, gridW * CELL, gridH * CELL);

        // Draw walls (border)
        ctx.fillStyle = COLORS.wall;

        // Top/bottom
        ctx.fillRect(ox, oy, gridW * CELL, WALL_THICKNESS * CELL);
        ctx.fillRect(ox, oy + (gridH - WALL_THICKNESS) * CELL, gridW * CELL, WALL_THICKNESS * CELL);

        // Left/right
        ctx.fillRect(ox, oy, WALL_THICKNESS * CELL, gridH * CELL);
        ctx.fillRect(ox + (gridW - WALL_THICKNESS) * CELL, oy, WALL_THICKNESS * CELL, gridH * CELL);
    }

    function initGrid() {
        grid = new Uint8Array(gridW * gridH);

        // Build walls
        for (let y = 0; y < gridH; y++) {
            for (let x = 0; x < gridW; x++) {
                const wall =
                    x < WALL_THICKNESS ||
                    y < WALL_THICKNESS ||
                    x >= gridW - WALL_THICKNESS ||
                    y >= gridH - WALL_THICKNESS;
                if (wall) grid[idx(x, y)] = 3;
            }
        }
    }

    function placePlayers() {
        // Start positions (left/right), centered vertically
        const midY = Math.floor(gridH / 2);

        player1.x = clamp(SAFE_MARGIN + 2, 1, gridW - 2);
        player1.y = clamp(midY, 1, gridH - 2);
        player1.dir = DIR.RIGHT;
        player1.nextDir = DIR.RIGHT;
        player1.alive = true;

        player2.x = clamp(gridW - SAFE_MARGIN - 3, 1, gridW - 2);
        player2.y = clamp(midY, 1, gridH - 2);
        player2.dir = DIR.LEFT;
        player2.nextDir = DIR.LEFT;
        player2.alive = true;

        // Mark starting cells as trails
        grid[idx(player1.x, player1.y)] = 1;
        grid[idx(player2.x, player2.y)] = 2;
    }

    function drawInitial() {
        drawWallsFull();

        // Draw initial trails & heads
        drawCell(player1.x, player1.y, COLORS.p1Head);
        drawCell(player2.x, player2.y, COLORS.p2Head);
    }

    function resetGame() {
        started = false;
        paused = false;
        running = false;

        resizeCanvasToStage();
        initGrid();
        placePlayers();
        drawInitial();
        setStatus("Press any move key to start");
    }

    function stopLoop() {
        if (timer) {
            clearInterval(timer);
            timer = null;
        }
        running = false;
    }

    function startLoop() {
        if (timer) return;
        timer = setInterval(tick, TICK_MS);
        running = true;
    }

    function setNextDirFromInput() {
        // Player 1: WASD
        if (keysDown.has("KeyW")) player1.nextDir = DIR.UP;
        else if (keysDown.has("KeyS")) player1.nextDir = DIR.DOWN;
        else if (keysDown.has("KeyA")) player1.nextDir = DIR.LEFT;
        else if (keysDown.has("KeyD")) player1.nextDir = DIR.RIGHT;

        // Player 2: Arrows
        if (keysDown.has("ArrowUp")) player2.nextDir = DIR.UP;
        else if (keysDown.has("ArrowDown")) player2.nextDir = DIR.DOWN;
        else if (keysDown.has("ArrowLeft")) player2.nextDir = DIR.LEFT;
        else if (keysDown.has("ArrowRight")) player2.nextDir = DIR.RIGHT;

        // Prevent reversing into yourself instantly
        if (isOpposite(player1.dir, player1.nextDir)) player1.nextDir = player1.dir;
        if (isOpposite(player2.dir, player2.nextDir)) player2.nextDir = player2.dir;
    }

    function collide(x, y) {
        // Outside grid => collision
        if (x < 0 || y < 0 || x >= gridW || y >= gridH) return true;
        const v = grid[idx(x, y)];
        return v !== 0; // anything non-empty is a collision (including walls & trails)
    }

    function tick() {
        if (!started || paused) return;

        setNextDirFromInput();

        // Update direction
        player1.dir = player1.nextDir;
        player2.dir = player2.nextDir;

        // Compute next positions
        const n1 = { x: player1.x + player1.dir.x, y: player1.y + player1.dir.y };
        const n2 = { x: player2.x + player2.dir.x, y: player2.y + player2.dir.y };

        // Determine collisions (handle simultaneous moves)
        const p1Crash = collide(n1.x, n1.y);
        const p2Crash = collide(n2.x, n2.y);

        // Special case: head-on into same empty cell (both move into same square)
        const sameCell = (n1.x === n2.x && n1.y === n2.y);
        const sameCellEmpty = sameCell && !collide(n1.x, n1.y);

        if (sameCellEmpty) {
            endGame("Draw! Head-on collision");
            return;
        }

        if (p1Crash && p2Crash) {
            endGame("Draw! Double crash");
            return;
        } else if (p1Crash) {
            endGame("Player 2 wins!");
            return;
        } else if (p2Crash) {
            endGame("Player 1 wins!");
            return;
        }

        // Move & draw trails incrementally
        // First, draw previous heads as trail color
        drawCell(player1.x, player1.y, COLORS.p1);
        drawCell(player2.x, player2.y, COLORS.p2);

        // Apply moves
        player1.x = n1.x; player1.y = n1.y;
        player2.x = n2.x; player2.y = n2.y;

        // Mark trails
        grid[idx(player1.x, player1.y)] = 1;
        grid[idx(player2.x, player2.y)] = 2;

        // Draw new heads
        drawCell(player1.x, player1.y, COLORS.p1Head);
        drawCell(player2.x, player2.y, COLORS.p2Head);
    }

    function endGame(message) {
        stopLoop();
        setStatus(message + "  (R to restart)");

        // Small overlay text (optional, lightweight)
        ctx.save();
        ctx.font = "bold 18px system-ui, -apple-system, Segoe UI, Roboto, Arial";
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(message, canvas.width / 2, 24);
        ctx.restore();
    }

    // --- Events ---
    function onKeyDown(e) {
        keysDown.add(e.code);

        if (e.code === "Space") {
            if (!started) return;
            paused = !paused;
            setStatus(paused ? "Paused (Space to resume)" : "Running...");
            return;
        }

        if (e.code === "KeyR") {
            resetGame();
            return;
        }

        // Start on first movement key
        const isMoveKey =
            ["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowLeft","ArrowDown","ArrowRight"].includes(e.code);

        if (isMoveKey && !started) {
            started = true;
            setStatus("Running...");
            startLoop();
        }
    }

    function onKeyUp(e) {
        keysDown.delete(e.code);
    }

    function onResize() {
        // On resize, restart to fit new grid
        resetGame();
    }

    // Hook up button
    restartBtn.addEventListener("click", () => resetGame());

    // Attach listeners (to window so it works even if canvas not focused)
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    // Initial setup
    resetGame();

    // Return cleanup so your loader can call it when switching games (prevents “stuck” keys / timers)
    return function destroy() {
        stopLoop();
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("resize", onResize);
        restartBtn.removeEventListener("click", () => resetGame());
    };
}

// Optional default export (some loaders accept default)
export default { initMiniGame };

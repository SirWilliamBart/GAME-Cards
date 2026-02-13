/* Maze Race - 2 players
 * Exports: initMiniGame(hostEl)
 * Uses: ./mazeGenerator.js
 */

import { generateMaze } from "./mazeGenerator.js";

let cleanupFn = null;

// Auto-init if opened directly (game.html loads this module)
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initMiniGame(document.getElementById("mazeRoot") || document.body);
    });
} else {
    initMiniGame(document.getElementById("mazeRoot") || document.body);
}

export function initMiniGame(hostEl) {
    if (cleanupFn) cleanupFn();

    const root = hostEl.querySelector?.("#mazeRoot") || hostEl;
    const canvas = root.querySelector("#mazeCanvas");
    const ctx = canvas.getContext("2d");

    const sizeSlider = root.querySelector("#mazeSize");
    const sizeVal = root.querySelector("#mazeSizeVal");
    const newMazeBtn = root.querySelector("#newMazeBtn");
    const resetBtn = root.querySelector("#resetBtn");

    const p1TimeEl = root.querySelector("#p1Time");
    const p2TimeEl = root.querySelector("#p2Time");

    const overlay = root.querySelector("#mazeOverlay");
    const overlayTitle = root.querySelector("#overlayTitle");
    const overlayBody = root.querySelector("#overlayBody");
    const playAgainBtn = root.querySelector("#playAgainBtn");
    const closeOverlayBtn = root.querySelector("#closeOverlayBtn");

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    function setOverlayVisible(v) {
        overlay.classList.toggle("hidden", !v);
    }

    const keys = Object.create(null);

    const state = {
        maze: null,
        p1: { x: 0.5, y: 0.5, r: 0.18, speed: 3.2, startedAt: null, finishedAt: null },
        p2: { x: 0.5, y: 0.5, r: 0.18, speed: 3.2, startedAt: null, finishedAt: null },
        finished: false,
        lastTs: 0,
    };

    function resetPlayers() {
        state.p1.x = 0.5; state.p1.y = 0.5;
        state.p2.x = 0.5; state.p2.y = 0.5;
        state.p1.startedAt = null; state.p2.startedAt = null;
        state.p1.finishedAt = null; state.p2.finishedAt = null;
        state.finished = false;
        setOverlayVisible(false);
        p1TimeEl.textContent = "0.000";
        p2TimeEl.textContent = "0.000";
    }

    function newMaze() {
        const n = clamp(parseInt(sizeSlider.value, 10) || 28, 6, 200);
        sizeVal.textContent = String(n);

        state.maze = generateMaze(n, n, {
            branchiness: 0.01,
            braidDeadEnds: 0.01,
            loopChance: 0.01,
        });;

        // Scale players a bit for larger mazes
        const r = clamp(0.20 - (n - 12) * 0.0012, 0.10, 0.20);
        state.p1.r = r;
        state.p2.r = r;
        const sp = clamp(3.4 - (n - 12) * 0.01, 2.2, 3.4);
        state.p1.speed = sp;
        state.p2.speed = sp;

        resetPlayers();
    }

    function getCell(ix, iy) {
        const m = state.maze;
        if (!m) return null;
        if (iy < 0 || iy >= m.rows || ix < 0 || ix >= m.cols) return null;
        return m.cells[iy][ix];
    }

    function tryStartTimer(p, now) {
        if (p.startedAt == null && !state.finished) p.startedAt = now;
    }

    function movePlayer(p, dx, dy, dt) {
        if (!state.maze) return;
        if (state.finished) return;
        if (p.finishedAt != null) return;

        const len = Math.hypot(dx, dy);
        if (len > 0) { dx /= len; dy /= len; }

        const step = p.speed * dt;
        let nx = p.x + dx * step;
        let ny = p.y + dy * step;

        const cols = state.maze.cols;
        const rows = state.maze.rows;
        nx = clamp(nx, p.r, cols - p.r);
        ny = clamp(ny, p.r, rows - p.r);

        const cx = Math.floor(p.x);
        const cy = Math.floor(p.y);
        const cell = getCell(cx, cy);
        if (!cell) { p.x = nx; p.y = ny; return; }

        const left = cx, right = cx + 1, top = cy, bottom = cy + 1;

        if (cell.wLeft && nx - p.r < left) nx = left + p.r;
        if (cell.wRight && nx + p.r > right) nx = right - p.r;
        if (cell.wTop && ny - p.r < top) ny = top + p.r;
        if (cell.wBottom && ny + p.r > bottom) ny = bottom - p.r;

        const ncx = Math.floor(nx);
        const ncy = Math.floor(ny);
        const ncell = getCell(ncx, ncy);
        if (ncell) {
            const nleft = ncx, nright = ncx + 1, ntop = ncy, nbottom = ncy + 1;
            if (ncell.wLeft && nx - p.r < nleft) nx = nleft + p.r;
            if (ncell.wRight && nx + p.r > nright) nx = nright - p.r;
            if (ncell.wTop && ny - p.r < ntop) ny = ntop + p.r;
            if (ncell.wBottom && ny + p.r > nbottom) ny = nbottom - p.r;
        }

        p.x = nx; p.y = ny;
    }

    function checkFinish(now) {
        if (!state.maze) return;

        const exitX = state.maze.cols - 0.5;
        const exitY = state.maze.rows - 0.5;
        const exitR = 0.28;

        function maybeFinish(p) {
            if (p.finishedAt != null) return;
            if (p.startedAt == null) return;
            if (Math.hypot(p.x - exitX, p.y - exitY) <= exitR) {
                p.finishedAt = now;
            }
        }

        maybeFinish(state.p1);
        maybeFinish(state.p2);

        const p1Done = state.p1.finishedAt != null;
        const p2Done = state.p2.finishedAt != null;

        if (!state.finished && (p1Done || p2Done)) {
            state.finished = true;

            const p1Time = p1Done ? (state.p1.finishedAt - state.p1.startedAt) / 1000 : Infinity;
            const p2Time = p2Done ? (state.p2.finishedAt - state.p2.startedAt) / 1000 : Infinity;

            let winner = "P1";
            if (p2Time < p1Time) winner = "P2";

            overlayTitle.textContent = `${winner} wins!`;
            overlayBody.textContent =
                `P1: ${Number.isFinite(p1Time) ? p1Time.toFixed(3) : "DNF"}s  •  ` +
                `P2: ${Number.isFinite(p2Time) ? p2Time.toFixed(3) : "DNF"}s`;

            setOverlayVisible(true);
        }
    }

    function resizeCanvasToDisplaySize() {
        const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        const rect = canvas.getBoundingClientRect();
        const w = Math.max(1, Math.floor(rect.width * dpr));
        const h = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
        }
        return { w, h, dpr };
    }

    function draw(now) {
        if (!state.maze) return;

        const { w, h, dpr } = resizeCanvasToDisplaySize();
        const cols = state.maze.cols;
        const rows = state.maze.rows;

        const pad = 10 * dpr;
        const scale = Math.min((w - pad * 2) / cols, (h - pad * 2) / rows);
        const ox = (w - cols * scale) / 2;
        const oy = (h - rows * scale) / 2;

        ctx.clearRect(0, 0, w, h);

        ctx.lineWidth = Math.max(1, 1.2 * dpr);
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.beginPath();

        const cells = state.maze.cells;
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const c = cells[y][x];
                const x0 = ox + x * scale;
                const y0 = oy + y * scale;
                const x1 = x0 + scale;
                const y1 = y0 + scale;

                if (c.wTop)    { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
                if (c.wRight)  { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
                if (c.wBottom) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
                if (c.wLeft)   { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
            }
        }
        ctx.stroke();

        const exitX = ox + (cols - 0.5) * scale;
        const exitY = oy + (rows - 0.5) * scale;

        ctx.fillStyle = "rgba(0, 160, 70, 0.25)";
        ctx.beginPath();
        ctx.arc(exitX, exitY, 0.34 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0, 160, 70, 0.85)";
        ctx.beginPath();
        ctx.arc(exitX, exitY, 0.34 * scale, 0, Math.PI * 2);
        ctx.stroke();

        function drawPlayer(p, fill, stroke) {
            const px = ox + p.x * scale;
            const py = oy + p.y * scale;
            ctx.fillStyle = fill;
            ctx.strokeStyle = stroke;
            ctx.lineWidth = Math.max(1, 1.5 * dpr);
            ctx.beginPath();
            ctx.arc(px, py, p.r * scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        drawPlayer(state.p1, "rgba(43,108,255,0.85)", "rgba(43,108,255,1)");
        drawPlayer(state.p2, "rgba(255,59,59,0.85)", "rgba(255,59,59,1)");

        // Start marker
        ctx.fillStyle = "rgba(0,0,0,0.06)";
        ctx.beginPath();
        ctx.arc(ox + 0.5 * scale, oy + 0.5 * scale, 0.35 * scale, 0, Math.PI * 2);
        ctx.fill();

        // Timers
        if (state.p1.startedAt != null && state.p1.finishedAt == null && !state.finished) {
            p1TimeEl.textContent = ((now - state.p1.startedAt) / 1000).toFixed(3);
        } else if (state.p1.startedAt != null && state.p1.finishedAt != null) {
            p1TimeEl.textContent = ((state.p1.finishedAt - state.p1.startedAt) / 1000).toFixed(3);
        }

        if (state.p2.startedAt != null && state.p2.finishedAt == null && !state.finished) {
            p2TimeEl.textContent = ((now - state.p2.startedAt) / 1000).toFixed(3);
        } else if (state.p2.startedAt != null && state.p2.finishedAt != null) {
            p2TimeEl.textContent = ((state.p2.finishedAt - state.p2.startedAt) / 1000).toFixed(3);
        }
    }

    let rafId = 0;

    function gameLoop(ts) {
        if (!state.lastTs) state.lastTs = ts;
        const dt = Math.min(0.05, (ts - state.lastTs) / 1000);
        state.lastTs = ts;

        let p1dx = 0, p1dy = 0;
        if (keys["KeyA"]) p1dx -= 1;
        if (keys["KeyD"]) p1dx += 1;
        if (keys["KeyW"]) p1dy -= 1;
        if (keys["KeyS"]) p1dy += 1;

        let p2dx = 0, p2dy = 0;
        if (keys["ArrowLeft"]) p2dx -= 1;
        if (keys["ArrowRight"]) p2dx += 1;
        if (keys["ArrowUp"]) p2dy -= 1;
        if (keys["ArrowDown"]) p2dy += 1;

        if (p1dx || p1dy) tryStartTimer(state.p1, ts);
        if (p2dx || p2dy) tryStartTimer(state.p2, ts);

        movePlayer(state.p1, p1dx, p1dy, dt);
        movePlayer(state.p2, p2dx, p2dy, dt);

        checkFinish(ts);
        draw(ts);

        rafId = requestAnimationFrame(gameLoop);
    }

    function onKeyDown(e) {
        if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key)) e.preventDefault();
        keys[e.code] = true;
    }
    function onKeyUp(e) {
        keys[e.code] = false;
    }
    function onVisibility() {
        if (document.hidden) for (const k of Object.keys(keys)) keys[k] = false;
    }

    function onNewMaze() { newMaze(); }
    function onReset() { resetPlayers(); }
    function onPlayAgain() { newMaze(); }
    function onCloseOverlay() { setOverlayVisible(false); }

    sizeSlider.addEventListener("input", () => {
        sizeVal.textContent = String(sizeSlider.value);
    });
    sizeSlider.addEventListener("change", onNewMaze);

    newMazeBtn.addEventListener("click", onNewMaze);
    resetBtn.addEventListener("click", onReset);
    playAgainBtn.addEventListener("click", onPlayAgain);
    closeOverlayBtn.addEventListener("click", onCloseOverlay);

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) setOverlayVisible(false);
    });

    newMaze();
    rafId = requestAnimationFrame(gameLoop);

    cleanupFn = () => {
        cancelAnimationFrame(rafId);
        cleanupFn = null;

        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        document.removeEventListener("visibilitychange", onVisibility);

        sizeSlider.removeEventListener("change", onNewMaze);
        newMazeBtn.removeEventListener("click", onNewMaze);
        resetBtn.removeEventListener("click", onReset);
        playAgainBtn.removeEventListener("click", onPlayAgain);
        closeOverlayBtn.removeEventListener("click", onCloseOverlay);

        for (const k of Object.keys(keys)) delete keys[k];
    };

    return cleanupFn;
}

export function destroyMiniGame() {
    if (cleanupFn) cleanupFn();
}

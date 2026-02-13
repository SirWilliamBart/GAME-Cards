// GAME/mini-games/tanks/game.js
// Tanks Duel - responsive, host-friendly (no overflow), crisp canvas (DPR aware).
// Exports initMiniGame() + default for your miniGameLoader.

let api = null;

export function initMiniGame(container, options = {}) {
    const root = container || document;
    const canvas = root.querySelector ? root.querySelector("#game") : document.querySelector("#game");
    if (!canvas) throw new Error("Tanks: Canvas #game not found.");

    const ctx = canvas.getContext("2d", { alpha: false });

    const s1El = root.querySelector ? root.querySelector("#s1") : document.querySelector("#s1");
    const s2El = root.querySelector ? root.querySelector("#s2") : document.querySelector("#s2");
    const statusEl = root.querySelector ? root.querySelector("#status") : document.querySelector("#status");

    // ---- Game constants (tuned for responsive canvas; positions scale with canvas size)
    const WIN_SCORE = 5;

    const TANK_RADIUS = 18;     // px in canvas units (these are "real" pixels after DPR scaling)
    const TANK_SPEED = 2.3;
    const ROT_SPEED = 0.055;
    const FRICTION = 0.92;

    const BULLET_SPEED = 10;
    const BULLET_RADIUS = 10;
    const BULLET_TTL = 160;     // frames
    const FIRE_COOLDOWN = 280;  // ms

    // ---- State
    const keys = new Set();
    const bullets = [];

    let running = true;
    let rafId = 0;

    // Canvas size (updated each frame via resizeCanvasToDisplaySize)
    let W = canvas.width || 1;
    let H = canvas.height || 1;

    // ---- Helpers
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const wrapAngle = (a) => {
        while (a < -Math.PI) a += Math.PI * 2;
        while (a > Math.PI) a -= Math.PI * 2;
        return a;
    };
    const dist2 = (ax, ay, bx, by) => {
        const dx = ax - bx, dy = ay - by;
        return dx * dx + dy * dy;
    };
    const circleCollide = (ax, ay, ar, bx, by, br) => dist2(ax, ay, bx, by) <= (ar + br) * (ar + br);

    function setStatus(txt) {
        if (statusEl) statusEl.textContent = txt;
    }
    function updateScores() {
        if (s1El) s1El.textContent = String(p1.score);
        if (s2El) s2El.textContent = String(p2.score);
    }

    // ---- DPR-aware canvas sizing (prevents overflow mismatch + keeps crisp rendering)
    function resizeCanvasToDisplaySize() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const rect = canvas.getBoundingClientRect();

        // If the host is temporarily hidden (0x0), avoid collapsing to 0
        const cssW = Math.max(1, rect.width);
        const cssH = Math.max(1, rect.height);

        const targetW = Math.max(1, Math.floor(cssW * dpr));
        const targetH = Math.max(1, Math.floor(cssH * dpr));

        if (canvas.width !== targetW || canvas.height !== targetH) {
            canvas.width = targetW;
            canvas.height = targetH;
        }

        W = canvas.width;
        H = canvas.height;
    }

    function onResize() {
        resizeCanvasToDisplaySize();
        // Keep tanks in bounds after resize
        keepInBounds(p1);
        keepInBounds(p2);
    }

    // ---- Players
    const p1 = {
        x: 110,
        y: 260,
        vx: 0,
        vy: 0,
        a: 0,
        color: "#7fd7ff",
        score: 0,
        lastFire: 0,
    };

    const p2 = {
        x: 790,
        y: 260,
        vx: 0,
        vy: 0,
        a: Math.PI,
        color: "#ff9aa7",
        score: 0,
        lastFire: 0,
    };

    function resetRound(whoScored = null) {
        bullets.length = 0;

        // spawn based on current canvas size
        const pad = Math.max(90, Math.min(140, W * 0.12));
        p1.x = pad;
        p1.y = H / 2;
        p1.vx = 0;
        p1.vy = 0;
        p1.a = 0;

        p2.x = W - pad;
        p2.y = H / 2;
        p2.vx = 0;
        p2.vy = 0;
        p2.a = Math.PI;

        if (whoScored === 1) setStatus("P1 scored!");
        else if (whoScored === 2) setStatus("P2 scored!");
        else setStatus("First to 5 wins");
    }

    function restartGame() {
        p1.score = 0;
        p2.score = 0;
        running = true;
        updateScores();
        resetRound(null);
    }

    function endGame(winner) {
        running = false;
        setStatus(`${winner} wins! Press R to restart.`);
    }

    function keepInBounds(t) {
        t.x = clamp(t.x, TANK_RADIUS, W - TANK_RADIUS);
        t.y = clamp(t.y, TANK_RADIUS, H - TANK_RADIUS);
    }

    function tryFire(tank, now) {
        if (!running) return;
        if (now - tank.lastFire < FIRE_COOLDOWN) return;
        tank.lastFire = now;

        const bx = tank.x + Math.cos(tank.a) * 26;
        const by = tank.y + Math.sin(tank.a) * 26;

        bullets.push({
            x: bx,
            y: by,
            vx: Math.cos(tank.a) * BULLET_SPEED,
            vy: Math.sin(tank.a) * BULLET_SPEED,
            ttl: BULLET_TTL,
            owner: tank === p1 ? 1 : 2,
            color: tank.color,
        });
    }

    // ---- Rendering
    function drawTank(t) {
        const SCALE = TANK_RADIUS / 10; // 10 = original radius baseline

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.a);
        ctx.scale(SCALE, SCALE);

        // body
        ctx.fillStyle = t.color;
        ctx.beginPath();
        ctx.roundRect(-16, -12, 32, 24, 8);
        ctx.fill();

        // turret base
        ctx.fillStyle = "#2a2a2a";
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        // barrel
        ctx.fillStyle = "#222";
        ctx.beginPath();
        ctx.roundRect(4, -3, 20, 6, 3);
        ctx.fill();

        // outline
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-16, -12, 32, 24, 8);
        ctx.stroke();

        ctx.restore();
    }


    function drawBullet(b) {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
    }

    function render() {
        // white playfield
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);

        // center line
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(W / 2, 14);
        ctx.lineTo(W / 2, H - 14);
        ctx.stroke();
        ctx.setLineDash([]);

        // bullets
        for (const b of bullets) drawBullet(b);

        // tanks
        drawTank(p1);
        drawTank(p2);

        // aim dots
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        const ax1 = p1.x + Math.cos(p1.a) * 40;
        const ay1 = p1.y + Math.sin(p1.a) * 40;
        ctx.beginPath();
        ctx.arc(ax1, ay1, 2, 0, Math.PI * 2);
        ctx.fill();

        const ax2 = p2.x + Math.cos(p2.a) * 40;
        const ay2 = p2.y + Math.sin(p2.a) * 40;
        ctx.beginPath();
        ctx.arc(ax2, ay2, 2, 0, Math.PI * 2);
        ctx.fill();

        if (!running) {
            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(0, 0, W, H);

            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.font = "bold 44px system-ui, sans-serif";
            ctx.fillText("Game Over", W / 2, H / 2 - 10);
            ctx.font = "18px system-ui, sans-serif";
            ctx.fillText("Press R to restart", W / 2, H / 2 + 26);
        }
    }

    // ---- Input
    function normalizeKey(e) {
        const k = e.key;
        if (k.length === 1) return k.toLowerCase();
        return k;
    }

    function onKeyDown(e) {
        const k = normalizeKey(e);
        keys.add(k);

        // Prevent scrolling / accidental browser actions
        if (k.startsWith("Arrow") || k === " " || k === "Enter") e.preventDefault();
    }

    function onKeyUp(e) {
        keys.delete(normalizeKey(e));
    }

    function handleInput(now) {
        // P1: WASD move, Q/E rotate, F shoot
        if (keys.has("q")) p1.a = wrapAngle(p1.a - ROT_SPEED);
        if (keys.has("e")) p1.a = wrapAngle(p1.a + ROT_SPEED);

        let p1ax = 0, p1ay = 0;
        if (keys.has("w")) p1ay -= 1;
        if (keys.has("s")) p1ay += 1;
        if (keys.has("a")) p1ax -= 1;
        if (keys.has("d")) p1ax += 1;

        if (p1ax || p1ay) {
            const len = Math.hypot(p1ax, p1ay) || 1;
            p1.vx += (p1ax / len) * TANK_SPEED * 0.12;
            p1.vy += (p1ay / len) * TANK_SPEED * 0.12;
        }

        if (keys.has("f")) tryFire(p1, now);

        // P2: Arrows move, / and . rotate, Enter shoot
        if (keys.has("/")) p2.a = wrapAngle(p2.a - ROT_SPEED);
        if (keys.has(".")) p2.a = wrapAngle(p2.a + ROT_SPEED);

        let p2ax = 0, p2ay = 0;
        if (keys.has("ArrowUp")) p2ay -= 1;
        if (keys.has("ArrowDown")) p2ay += 1;
        if (keys.has("ArrowLeft")) p2ax -= 1;
        if (keys.has("ArrowRight")) p2ax += 1;

        if (p2ax || p2ay) {
            const len = Math.hypot(p2ax, p2ay) || 1;
            p2.vx += (p2ax / len) * TANK_SPEED * 0.12;
            p2.vy += (p2ay / len) * TANK_SPEED * 0.12;
        }

        if (keys.has("Enter")) tryFire(p2, now);

        // Global keys
        if (keys.has("r")) {
            keys.delete("r"); // avoid repeating while held
            restartGame();
        }
        if (keys.has("Escape")) {
            keys.delete("Escape");
            destroy();
        }
    }

    // ---- Physics
    function updatePhysics() {
        // friction
        p1.vx *= FRICTION;
        p1.vy *= FRICTION;
        p2.vx *= FRICTION;
        p2.vy *= FRICTION;

        // limit max speed
        const maxV = 3.2;
        const v1 = Math.hypot(p1.vx, p1.vy);
        if (v1 > maxV) {
            p1.vx *= maxV / v1;
            p1.vy *= maxV / v1;
        }
        const v2 = Math.hypot(p2.vx, p2.vy);
        if (v2 > maxV) {
            p2.vx *= maxV / v2;
            p2.vy *= maxV / v2;
        }

        // move
        p1.x += p1.vx;
        p1.y += p1.vy;
        p2.x += p2.vx;
        p2.y += p2.vy;

        keepInBounds(p1);
        keepInBounds(p2);

        // prevent tanks overlapping (push apart)
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const d = Math.hypot(dx, dy);
        const minD = TANK_RADIUS * 2;
        if (d > 0 && d < minD) {
            const push = (minD - d) / 2;
            const nx = dx / d;
            const ny = dy / d;
            p1.x -= nx * push;
            p1.y -= ny * push;
            p2.x += nx * push;
            p2.y += ny * push;
            keepInBounds(p1);
            keepInBounds(p2);
        }

        // bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            b.x += b.vx;
            b.y += b.vy;
            b.ttl--;

            // wall bounce
            if (b.x <= BULLET_RADIUS || b.x >= W - BULLET_RADIUS) b.vx *= -1;
            if (b.y <= BULLET_RADIUS || b.y >= H - BULLET_RADIUS) b.vy *= -1;

            // hit tanks (not owner)
            if (b.owner !== 1 && circleCollide(b.x, b.y, BULLET_RADIUS, p1.x, p1.y, TANK_RADIUS)) {
                bullets.splice(i, 1);
                p2.score++;
                updateScores();
                if (p2.score >= WIN_SCORE) endGame("P2");
                else resetRound(2);
                continue;
            }

            if (b.owner !== 2 && circleCollide(b.x, b.y, BULLET_RADIUS, p2.x, p2.y, TANK_RADIUS)) {
                bullets.splice(i, 1);
                p1.score++;
                updateScores();
                if (p1.score >= WIN_SCORE) endGame("P1");
                else resetRound(1);
                continue;
            }

            if (b.ttl <= 0) bullets.splice(i, 1);
        }
    }

    // ---- Main loop
    function loop() {
        if (!api) return; // destroyed

        resizeCanvasToDisplaySize();

        const now = performance.now();
        handleInput(now);
        updatePhysics();
        render();

        rafId = requestAnimationFrame(loop);
    }

    // ---- Cleanup API (for your loader)
    function destroy() {
        if (!api) return;

        cancelAnimationFrame(rafId);

        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        window.removeEventListener("resize", onResize);

        keys.clear();
        bullets.length = 0;

        api = null;

        // Optional: notify parent app if it listens
        try {
            window.dispatchEvent(new CustomEvent("minigame:close", { detail: { id: "tanks" } }));
        } catch {}
    }

    // ---- Init
    api = { destroy };

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    resizeCanvasToDisplaySize();
    resetRound(null);
    updateScores();

    rafId = requestAnimationFrame(loop);

    return api;
}

export default initMiniGame;

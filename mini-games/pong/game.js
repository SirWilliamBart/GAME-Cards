// mini-games/pong/game.js
export function initPong(rootEl) {
    const canvas = rootEl.querySelector("#pongCanvas");
    const scoreEl = rootEl.querySelector("#pongScore");
    const hintEl  = rootEl.querySelector("#pongHint");

    if (!canvas) throw new Error("Pong: #pongCanvas not found in injected HTML.");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Pong: could not get 2D context.");

    const W = canvas.width;
    const H = canvas.height;

    // --- Config ---
    const paddle = { w: 10, h: 70, speed: 320, inset: 16 };
    const PADDLE_H_START = 70;

    const ballCfg = { r: 6, speed: 260, speedUp: 1.04, maxSpeed: 1000 };

    // Paddle shrinking difficulty
    const SHRINK_PER_HIT = 0.97; // 3% smaller each paddle hit
    const MIN_PADDLE_H = 22;     // never shrink below this

    // --- State ---
    let left  = { x: paddle.inset, y: (H - paddle.h) / 2, vy: 0, score: 0 };
    let right = { x: W - paddle.inset - paddle.w, y: (H - paddle.h) / 2, vy: 0, score: 0 };

    let ball = null;
    let paused = false;

    // IMPORTANT: attach key events to canvas (works inside card apps)
    const keys = new Set();

    const onKeyDown = (e) => {
        const controlKeys = ["ArrowUp", "ArrowDown", " ", "w", "W", "s", "S", "r", "R"];
        if (controlKeys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
        }
        keys.add(e.key);

        if (e.key === " ") paused = !paused;
        if (e.key.toLowerCase() === "r") resetGame();
    };

    const onKeyUp = (e) => {
        const controlKeys = ["ArrowUp", "ArrowDown", " ", "w", "W", "s", "S"];
        if (controlKeys.includes(e.key)) {
            e.preventDefault();
            e.stopPropagation();
        }
        keys.delete(e.key);
    };

    function focusCanvas() {
        canvas.focus({ preventScroll: true });
        hintEl?.classList.add("hidden");
    }

    canvas.addEventListener("click", focusCanvas);
    canvas.addEventListener("keydown", onKeyDown, { passive: false });
    canvas.addEventListener("keyup", onKeyUp, { passive: false });

    function clamp(v, min, max) {
        return Math.max(min, Math.min(max, v));
    }

    function rectIntersect(ax, ay, aw, ah, bx, by, bw, bh) {
        return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
    }

    function updateScore() {
        if (scoreEl) scoreEl.textContent = `${left.score} : ${right.score}`;
    }

    function shrinkPaddles() {
        paddle.h = Math.max(MIN_PADDLE_H, Math.round(paddle.h * SHRINK_PER_HIT));
        // keep paddles inside screen after shrinking
        left.y = clamp(left.y, 0, H - paddle.h);
        right.y = clamp(right.y, 0, H - paddle.h);
    }

    function resetBall(toward = 1) {
        const angle = (Math.random() * 0.6 - 0.3);
        const speed = ballCfg.speed;
        ball = {
            x: W / 2,
            y: H / 2,
            vx: Math.cos(angle) * speed * toward,
            vy: Math.sin(angle) * speed,
        };
    }

    function resetGame() {
        left.score = 0;
        right.score = 0;

        paddle.h = PADDLE_H_START;
        left.y = (H - paddle.h) / 2;
        right.y = (H - paddle.h) / 2;

        paused = false;
        resetBall(Math.random() < 0.5 ? -1 : 1);
        updateScore();
        focusCanvas();
    }

    function reflectFromPaddle(p, dirX) {
        const hit = (ball.y - (p.y + paddle.h / 2)) / (paddle.h / 2); // -1..1
        const maxAngle = 0.9;
        const angle = hit * maxAngle;

        const speedNow = Math.min(
            ballCfg.maxSpeed,
            Math.hypot(ball.vx, ball.vy) * ballCfg.speedUp
        );

        ball.vx = Math.cos(angle) * speedNow * dirX;
        ball.vy = Math.sin(angle) * speedNow;
    }

    function step(dt) {
        // paddle input
        left.vy = 0;
        right.vy = 0;

        if (keys.has("w") || keys.has("W")) left.vy = -paddle.speed;
        if (keys.has("s") || keys.has("S")) left.vy = paddle.speed;

        if (keys.has("ArrowUp")) right.vy = -paddle.speed;
        if (keys.has("ArrowDown")) right.vy = paddle.speed;

        // move paddles
        left.y = clamp(left.y + left.vy * dt, 0, H - paddle.h);
        right.y = clamp(right.y + right.vy * dt, 0, H - paddle.h);

        if (paused) return;

        // move ball
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // bounce top/bottom
        if (ball.y - ballCfg.r <= 0) {
            ball.y = ballCfg.r;
            ball.vy *= -1;
        }
        if (ball.y + ballCfg.r >= H) {
            ball.y = H - ballCfg.r;
            ball.vy *= -1;
        }

        // collisions
        const ballRect = {
            x: ball.x - ballCfg.r,
            y: ball.y - ballCfg.r,
            w: ballCfg.r * 2,
            h: ballCfg.r * 2,
        };

        const leftRect = { x: left.x, y: left.y, w: paddle.w, h: paddle.h };
        const rightRect = { x: right.x, y: right.y, w: paddle.w, h: paddle.h };

        // hit left paddle
        if (
            ball.vx < 0 &&
            rectIntersect(
                ballRect.x,
                ballRect.y,
                ballRect.w,
                ballRect.h,
                leftRect.x,
                leftRect.y,
                leftRect.w,
                leftRect.h
            )
        ) {
            ball.x = leftRect.x + leftRect.w + ballCfg.r;
            reflectFromPaddle(left, +1);
            shrinkPaddles(); // NEW: shrink after each paddle hit
        }

        // hit right paddle
        if (
            ball.vx > 0 &&
            rectIntersect(
                ballRect.x,
                ballRect.y,
                ballRect.w,
                ballRect.h,
                rightRect.x,
                rightRect.y,
                rightRect.w,
                rightRect.h
            )
        ) {
            ball.x = rightRect.x - ballCfg.r;
            reflectFromPaddle(right, -1);
            shrinkPaddles(); // NEW: shrink after each paddle hit
        }

        // scoring
        if (ball.x + ballCfg.r < 0) {
            right.score++;
            updateScore();
            resetBall(-1);
        } else if (ball.x - ballCfg.r > W) {
            left.score++;
            updateScore();
            resetBall(+1);
        }
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);

        // background
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, W, H);

        // center dashed line
        ctx.fillStyle = "rgba(255,255,255,0.25)";
        for (let y = 0; y < H; y += 18) ctx.fillRect(W / 2 - 1, y, 2, 10);

        // paddles
        ctx.fillStyle = "#fff";
        ctx.fillRect(left.x, left.y, paddle.w, paddle.h);
        ctx.fillRect(right.x, right.y, paddle.w, paddle.h);

        // ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballCfg.r, 0, Math.PI * 2);
        ctx.fill();

        // pause overlay
        if (paused) {
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = "#fff";
            ctx.font = "bold 20px system-ui, sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("Paused (Space to resume)", W / 2, H / 2);
        }
    }

    // loop
    let last = performance.now();
    let rafId = 0;

    function loop(now) {
        const dt = Math.min(0.033, (now - last) / 1000);
        last = now;
        step(dt);
        draw();
        rafId = requestAnimationFrame(loop);
    }

    resetGame();
    rafId = requestAnimationFrame(loop);

    // cleanup for loader
    return () => {
        cancelAnimationFrame(rafId);
        canvas.removeEventListener("click", focusCanvas);
        canvas.removeEventListener("keydown", onKeyDown);
        canvas.removeEventListener("keyup", onKeyUp);
        keys.clear();
    };
}

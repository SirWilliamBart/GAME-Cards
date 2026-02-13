let cleanupFn = null;

function cycle(v) {
    if (!v) return "O";
    if (v === "O") return "X";
    return "";
}

export function initMiniGame(host = null) {
    let hostEl = host;
    if (typeof host === "string") hostEl = document.getElementById(host);
    if (!hostEl) hostEl = document.getElementById("miniGameHost");
    if (!hostEl) throw new Error("tic: host not found");

    if (cleanupFn) cleanupFn();

    const root = document.createElement("div");
    root.className = "tic-root";

    const top = document.createElement("div");
    top.className = "tic-topbar";

    const title = document.createElement("div");
    title.textContent = "100×100 Toggle Grid";

    const resetBtn = document.createElement("button");
    resetBtn.className = "tic-btn";
    resetBtn.textContent = "Reset";

    top.append(title, resetBtn);

    const wrap = document.createElement("div");
    wrap.className = "tic-boardWrap";

    const board = document.createElement("div");
    board.className = "tic-board";
    wrap.appendChild(board);

    const cells = [];

    for (let i = 0; i < 100 * 100; i++) {
        const c = document.createElement("div");
        c.className = "tic-cell";
        c.dataset.v = "";
        c.addEventListener("click", () => {
            const next = cycle(c.dataset.v);
            c.dataset.v = next;
            c.textContent = next;
        });
        board.appendChild(c);
        cells.push(c);
    }

    resetBtn.onclick = () => {
        for (const c of cells) {
            c.dataset.v = "";
            c.textContent = "";
        }
    };

    root.append(top, wrap);
    hostEl.innerHTML = "";
    hostEl.appendChild(root);

    cleanupFn = () => {
        hostEl.innerHTML = "";
    };

    return cleanupFn;
}

export default initMiniGame;

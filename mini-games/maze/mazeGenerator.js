// Harder maze generator (Growing Tree + optional braiding)
// Returns { cols, rows, cells } where each cell has wall booleans:
// wTop, wRight, wBottom, wLeft

export function generateMaze(cols, rows, opts = {}) {
    cols = Math.max(2, cols | 0);
    rows = Math.max(2, rows | 0);

    // Tuning knobs (good defaults)
    const {
        // 0..1 : higher = more "Prim-like" (more branches/junctions), lower = more "DFS-like" (long corridors)
        branchiness = 0.75,

        // 0..1 : small chance to add loops after maze is built (makes navigation harder)
        loopChance = 0.06,

        // 0..1 : if a cell is a dead end, chance we "braid" it by opening one more wall (reduces dead ends, increases loops)
        // Keep small so you still have dead ends, but also more alternative routes.
        braidDeadEnds = 0.20,

        // If true, add a few extra random openings everywhere (more loops)
        extraLoops = true,
    } = opts;

    const cells = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
            visited: false,
            wTop: true,
            wRight: true,
            wBottom: true,
            wLeft: true,
        }))
    );

    const randInt = (n) => (Math.random() * n) | 0;

    function unvisitedNeighbors(x, y) {
        const out = [];
        if (y > 0 && !cells[y - 1][x].visited) out.push([x, y - 1, "top"]);
        if (x < cols - 1 && !cells[y][x + 1].visited) out.push([x + 1, y, "right"]);
        if (y < rows - 1 && !cells[y + 1][x].visited) out.push([x, y + 1, "bottom"]);
        if (x > 0 && !cells[y][x - 1].visited) out.push([x - 1, y, "left"]);
        return out;
    }

    function allNeighbors(x, y) {
        const out = [];
        if (y > 0) out.push([x, y - 1, "top"]);
        if (x < cols - 1) out.push([x + 1, y, "right"]);
        if (y < rows - 1) out.push([x, y + 1, "bottom"]);
        if (x > 0) out.push([x - 1, y, "left"]);
        return out;
    }

    function removeWall(ax, ay, bx, by, dir) {
        const a = cells[ay][ax];
        const b = cells[by][bx];
        if (dir === "top")    { a.wTop = false;    b.wBottom = false; }
        if (dir === "right")  { a.wRight = false;  b.wLeft = false; }
        if (dir === "bottom") { a.wBottom = false; b.wTop = false; }
        if (dir === "left")   { a.wLeft = false;   b.wRight = false; }
    }

    function countOpenings(x, y) {
        const c = cells[y][x];
        let open = 0;
        if (!c.wTop) open++;
        if (!c.wRight) open++;
        if (!c.wBottom) open++;
        if (!c.wLeft) open++;
        return open;
    }

    // --- Growing Tree algorithm ---
    // Choose next active cell either:
    //  - newest (DFS) OR
    //  - random (Prim)
    // branchiness controls the mix (higher -> more random -> more branches)
    const active = [];

    // start anywhere (random start makes structure less predictable)
    let sx = randInt(cols);
    let sy = randInt(rows);
    cells[sy][sx].visited = true;
    active.push([sx, sy]);

    while (active.length > 0) {
        const pickRandom = Math.random() < branchiness;
        const idx = pickRandom ? randInt(active.length) : (active.length - 1);
        const [cx, cy] = active[idx];

        const opts2 = unvisitedNeighbors(cx, cy);
        if (opts2.length === 0) {
            active.splice(idx, 1);
            continue;
        }

        // Small trick: prefer neighbors that will *increase junctions* by expanding into cells
        // that have more unvisited neighbors (creates more branch points later).
        // This tends to reduce super-long corridors.
        let best = opts2[0];
        let bestScore = -1;

        for (const cand of opts2) {
            const [nx, ny] = cand;
            const score = unvisitedNeighbors(nx, ny).length + Math.random() * 0.25;
            if (score > bestScore) {
                bestScore = score;
                best = cand;
            }
        }

        const [nx, ny, dir] = best;
        removeWall(cx, cy, nx, ny, dir);
        cells[ny][nx].visited = true;
        active.push([nx, ny]);
    }

    // --- Add difficulty: braid some dead ends (creates loops) ---
    // This makes it harder because there are multiple routes + more decision points.
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (countOpenings(x, y) === 1 && Math.random() < braidDeadEnds) {
                // Open one additional wall to a neighbor (prefer opening to a neighbor that already has 2+ openings)
                const nbs = allNeighbors(x, y);

                // filter neighbors that are currently separated by a wall
                const closed = nbs.filter(([nx, ny, dir]) => {
                    const c = cells[y][x];
                    if (dir === "top") return c.wTop;
                    if (dir === "right") return c.wRight;
                    if (dir === "bottom") return c.wBottom;
                    return c.wLeft;
                });

                if (closed.length > 0) {
                    // prefer neighbor with more openings -> creates junction feel
                    closed.sort((a, b) => countOpenings(b[0], b[1]) - countOpenings(a[0], a[1]));
                    const take = closed[0];
                    removeWall(x, y, take[0], take[1], take[2]);
                }
            }
        }
    }

    // --- Extra loops sprinkled across the maze (small probability) ---
    if (extraLoops && loopChance > 0) {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (Math.random() < loopChance) {
                    const nbs = allNeighbors(x, y);
                    const closed = nbs.filter(([nx, ny, dir]) => {
                        const c = cells[y][x];
                        if (dir === "top") return c.wTop;
                        if (dir === "right") return c.wRight;
                        if (dir === "bottom") return c.wBottom;
                        return c.wLeft;
                    });
                    if (closed.length > 0) {
                        const pick = closed[randInt(closed.length)];
                        removeWall(x, y, pick[0], pick[1], pick[2]);
                    }
                }
            }
        }
    }

    // Clear visited flags (keep format like your original)
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            cells[y][x].visited = false;
        }
    }

    return { cols, rows, cells };
}

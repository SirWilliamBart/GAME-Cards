
// scoreboard.js
// Independent player scoreboard.
// Saves players and scores using localStorage.

const SCOREBOARD_STORAGE_KEY = "gameCards.scoreboard.v1";

export function setupScoreboard() {
    // Prevent duplicate initialization.
    if (document.getElementById("scoreboard-panel")) return;

    let players = loadPlayers();
    let isOpen = false;

    // ---------- Storage ----------

    function loadPlayers() {
        try {
            const saved = localStorage.getItem(SCOREBOARD_STORAGE_KEY);
            if (!saved) return [];

            const parsed = JSON.parse(saved);
            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter(p => p && typeof p === "object")
                .map(p => ({
                    name: String(p.name ?? ""),
                    score: String(p.score ?? "0")
                }));
        } catch (err) {
            console.warn("Failed to load scoreboard:", err);
            return [];
        }
    }

    function savePlayers() {
        try {
            localStorage.setItem(
                SCOREBOARD_STORAGE_KEY,
                JSON.stringify(players)
            );
        } catch (err) {
            console.warn("Failed to save scoreboard:", err);
        }
    }

    // ---------- Create HTML ----------

    const panel = document.createElement("aside");
    panel.id = "scoreboard-panel";
    panel.className = "scoreboard-panel";
    panel.setAttribute("aria-label", "Player scoreboard");

    panel.innerHTML = `
        <button
            id="scoreboard-toggle"
            class="scoreboard-toggle"
            type="button"
            aria-label="Show scoreboard"
            aria-expanded="false"
            aria-controls="scoreboard-content"
        >&gt;</button>

        <div id="scoreboard-content" class="scoreboard-content">

            <div class="scoreboard-header">
                <h2>Players</h2>
                <button id="scoreboard-add" type="button">
                    + Add
                </button>
            </div>

            <div class="scoreboard-columns">
                <span>Name</span>
                <span>Score</span>
                <span></span>
            </div>

            <div id="scoreboard-list" class="scoreboard-list"></div>

        </div>
    `;

    document.body.appendChild(panel);

    const toggleBtn = document.getElementById("scoreboard-toggle");
    const addBtn = document.getElementById("scoreboard-add");
    const listEl = document.getElementById("scoreboard-list");
    const contentEl = document.getElementById("scoreboard-content");

    // ---------- Render players ----------

    function renderPlayers() {
        listEl.innerHTML = "";

        if (!players.length) {
            const empty = document.createElement("div");
            empty.className = "scoreboard-empty";
            empty.textContent = "No players yet.";
            listEl.appendChild(empty);
            return;
        }

        players.forEach((player) => {
            const row = document.createElement("div");
            row.className = "scoreboard-player";

            // Name
            const nameInput = document.createElement("input");
            nameInput.type = "text";
            nameInput.className = "scoreboard-name";
            nameInput.placeholder = "Player name";
            nameInput.value = player.name;
            nameInput.maxLength = 80;
            nameInput.setAttribute("aria-label", "Player name");

            nameInput.addEventListener("input", () => {
                player.name = nameInput.value;
                savePlayers();
            });

            // Score
            const scoreInput = document.createElement("input");
            scoreInput.type = "number";
            scoreInput.className = "scoreboard-score";
            scoreInput.value = player.score;
            scoreInput.step = "any";
            scoreInput.setAttribute("aria-label", "Player score");

            scoreInput.addEventListener("input", () => {
                player.score = scoreInput.value;
                savePlayers();
            });

            // Remove player
            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "scoreboard-remove";
            removeBtn.textContent = "×";
            removeBtn.title = "Remove player";
            removeBtn.setAttribute(
                "aria-label",
                `Remove ${player.name || "player"}`
            );

            removeBtn.addEventListener("click", () => {
                players = players.filter(p => p !== player);
                savePlayers();
                renderPlayers();
            });

            row.appendChild(nameInput);
            row.appendChild(scoreInput);
            row.appendChild(removeBtn);

            listEl.appendChild(row);
        });
    }

    // ---------- Add player ----------

    function addPlayer() {
        const player = {
            name: `Player ${players.length + 1}`,
            score: "0"
        };

        players.push(player);
        savePlayers();
        renderPlayers();

        // Scroll to the newly added player.
        listEl.scrollTop = listEl.scrollHeight;

        // Focus the new player's name.
        const lastRow = listEl.lastElementChild;
        const input = lastRow?.querySelector(".scoreboard-name");
        input?.focus({ preventScroll: true });
        input?.select();
    }

    addBtn.addEventListener("click", addPlayer);

    // ---------- Open / Close ----------

    function toggleScoreboard() {
        isOpen = !isOpen;

        document.body.classList.toggle("scoreboard-open", isOpen);

        toggleBtn.textContent = isOpen ? "<" : ">";
        toggleBtn.setAttribute("aria-expanded", String(isOpen));
        toggleBtn.setAttribute(
            "aria-label",
            isOpen ? "Hide scoreboard" : "Show scoreboard"
        );

        // Hidden inputs should not receive keyboard focus.
        contentEl.inert = !isOpen;

        // On mobile, keep the active deck visible above the drawer.
        if (isOpen && window.matchMedia("(max-width: 850px)").matches) {
            requestAnimationFrame(() => {
                const deck = document.querySelector(
                    "#game-screen:not(.hidden) .deck"
                );

                if (!deck) return;

                const availableBottom =
                    window.innerHeight - panel.offsetHeight - 12;

                const cardBottom = deck.getBoundingClientRect().bottom;

                if (cardBottom > availableBottom) {
                    window.scrollBy({
                        top: cardBottom - availableBottom,
                        behavior: "smooth"
                    });
                }
            });
        }
    }

    toggleBtn.addEventListener("click", toggleScoreboard);

    // ---------- Initialize ----------

    contentEl.inert = true;
    renderPlayers();
}
